import * as THREE from "three";
import Gun from "gun/gun";
import "./style.css";

type Shot = { x: number; y: number; hit: boolean };
type Match = {
  id: string;
  status: "playing" | "finished";
  player: number;
  turn: number;
  winner: number | null;
  revision: number;
  lastShot: {
    by: number;
    x: number;
    y: number;
    hit: boolean;
    sunk: boolean;
  } | null;
  ownShips: number[][][];
  shotsFired: Shot[];
  incoming: Shot[];
};
type State =
  | { status: "waiting"; token: string; position: number }
  | { status: "matched"; token: string; match: Match };
const app = document.querySelector<HTMLDivElement>("#app")!;
const tokenKey = "broadside-session";
let token = sessionStorage.getItem(tokenKey) ?? "";
let state: State | null = null,
  gunSubscription: any = null,
  refreshInFlight = false,
  selected: { x: number; y: number } | null = null;
const GUN_ENDPOINT =
  location.port === "5173"
    ? `${location.protocol}//${location.hostname}:8787/gun`
    : `${location.origin}/gun`;
const gun: any = Gun({
  peers: [GUN_ENDPOINT],
  localStorage: false,
  radisk: false,
});
const api = async (path: string, body?: object) => {
  const response = await fetch(
    "/api/" + path,
    body
      ? {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }
      : undefined,
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Request failed");
  return data;
};

app.innerHTML = `<div id="scene"></div><div class="grain"></div><header><div class="brand"><span class="insignia">✦</span><div><strong>BROADSIDE</strong><small>FLEET COMMAND / ONLINE</small></div></div><div class="status"><span id="netdot"></span><span id="net">CONNECTING</span></div></header><main id="panel"><section id="intro"><div class="eyebrow">TACTICAL NAVAL ENGAGEMENT // 001</div><h1>THE OCEAN<br><em>IS YOURS.</em></h1><p>Two captains. Two fleets. One sea. Deploy automatically and engage in turn-based naval combat.</p><button id="deploy">FIND OPPONENT <span>→</span></button><div class="minor">LIVE MULTIPLAYER · 10×10 GRID · NO ACCOUNT REQUIRED</div></section></main><footer><span>PROJECT BROADSIDE // SDD DEMONSTRATOR</span><span id="footerRight">AWAITING ORDERS</span></footer>`;
const panel = document.querySelector<HTMLElement>("#panel")!;
const sceneRoot = document.querySelector<HTMLElement>("#scene")!;
const scene = new THREE.Scene();
scene.background = new THREE.Color("#071725");
scene.fog = new THREE.FogExp2("#071725", 0.015);
const camera = new THREE.PerspectiveCamera(
  58,
  innerWidth / innerHeight,
  0.1,
  300,
);
camera.position.set(0, 21, 34);
camera.lookAt(0, 0, -12);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
sceneRoot.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight("#7abdd1", "#05121c", 2.4));
const sun = new THREE.DirectionalLight("#92b0bf", 2.8);
sun.position.set(-18, 36, -20);
scene.add(sun);
const water = new THREE.Mesh(
  new THREE.PlaneGeometry(350, 350, 48, 48),
  new THREE.MeshStandardMaterial({
    color: "#0c3c50",
    metalness: 0.54,
    roughness: 0.38,
    transparent: true,
    opacity: 0.93,
  }),
);
water.rotation.x = -Math.PI / 2;
water.position.y = -0.22;
scene.add(water);
const grid = new THREE.Group();
scene.add(grid);
const tileMeshes: THREE.Mesh[] = [];
const geometries = new THREE.BoxGeometry(2.12, 0.055, 2.12);
for (let y = 0; y < 10; y++)
  for (let x = 0; x < 10; x++) {
    const mesh = new THREE.Mesh(
      geometries,
      new THREE.MeshStandardMaterial({
        color: (x + y) % 2 ? "#103d50" : "#18475a",
        transparent: true,
        opacity: 0.78,
        metalness: 0.3,
        roughness: 0.55,
      }),
    );
    mesh.position.set((x - 4.5) * 2.3, 0.08, (y - 4.5) * 2.3 - 12);
    mesh.userData = { x, y };
    grid.add(mesh);
    tileMeshes.push(mesh);
  }
const guide = new THREE.GridHelper(23, 10, "#4d8b99", "#265565");
guide.position.set(0, 0.14, -12);
scene.add(guide);
const stars = new THREE.Group();
scene.add(stars);
const white = new THREE.MeshBasicMaterial({ color: "#a1d8d8" });
for (let i = 0; i < 60; i++) {
  const sp = new THREE.Mesh(new THREE.SphereGeometry(0.022, 4, 4), white);
  sp.position.set(
    Math.random() * 160 - 80,
    20 + Math.random() * 35,
    -45 - Math.random() * 80,
  );
  stars.add(sp);
}
function ship(x: number, z: number, scale = 1) {
  const group = new THREE.Group();
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.85, 5),
    new THREE.MeshStandardMaterial({
      color: "#677c81",
      metalness: 0.65,
      roughness: 0.4,
    }),
  );
  hull.position.y = 0.7;
  group.add(hull);
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.6, 1.7),
    new THREE.MeshStandardMaterial({
      color: "#9bada8",
      metalness: 0.6,
      roughness: 0.35,
    }),
  );
  deck.position.set(0, 1.25, -0.4);
  group.add(deck);
  const turret = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.5, 0.28, 8),
    new THREE.MeshStandardMaterial({ color: "#bfcbbe" }),
  );
  turret.position.set(0, 1.1, 1.65);
  group.add(turret);
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  scene.add(group);
  return group;
}
const heroShip = ship(-21, -24, 2.4);
heroShip.rotation.y = -0.27;
const raycaster = new THREE.Raycaster(),
  pointer = new THREE.Vector2();
renderer.domElement.addEventListener("click", (event) => {
  if (
    state?.status !== "matched" ||
    state.match.status !== "playing" ||
    state.match.turn !== state.match.player
  )
    return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    (-(event.clientY - rect.top) / rect.height) * 2 + 1,
  );
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(tileMeshes)[0];
  if (hit) {
    selected = { x: hit.object.userData.x, y: hit.object.userData.y };
    renderPanel();
  }
});
function repaint() {
  const shots = state?.status === "matched" ? state.match.shotsFired : [];
  for (const mesh of tileMeshes) {
    const { x, y } = mesh.userData;
    const s = shots.find((s) => s.x === x && s.y === y);
    const picked = selected?.x === x && selected?.y === y;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.color.set(
      s
        ? s.hit
          ? "#ff745e"
          : "#35687a"
        : picked
          ? "#c9aa72"
          : (x + y) % 2
            ? "#103d50"
            : "#18475a",
    );
    mat.emissive.set(s?.hit ? "#6c190f" : picked ? "#433012" : "#000000");
  }
}
const label = (x: number, y: number) => `${"ABCDEFGHIJ"[x]}${y + 1}`;
const mini = (ships: number[][][], incoming: Shot[]) => {
  const owned = new Set(
    ships.flatMap((cells) => cells.map((c) => c.join(","))),
  );
  return `<div class="mini-grid">${Array.from({ length: 100 }, (_, i) => {
    const x = i % 10,
      y = Math.floor(i / 10),
      hit = incoming.find((s) => s.x === x && s.y === y);
    return `<span class="mini-cell ${owned.has(`${x},${y}`) ? "ship" : ""} ${hit ? (hit.hit ? "damage" : "miss") : ""}" title="${label(x, y)}"></span>`;
  }).join("")}</div>`;
};
function renderPanel() {
  repaint();
  if (!state) return;
  if (state.status === "waiting") {
    panel.innerHTML = `<section class="gamebox waiting"><div class="eyebrow">MATCHMAKING // LIVE QUEUE</div><div class="radar"><div class="radar-beam"></div><span>⌖</span></div><h2>SCANNING THE HORIZON</h2><p>You're on deck. The next captain to join will be paired with you automatically.</p><div class="pulse"><i></i> WAITING FOR ANOTHER PLAYER</div><button id="leave">CANCEL SEARCH</button></section>`;
  } else {
    const m = state.match,
      ended = m.status === "finished",
      mine = m.turn === m.player;
    const message = ended
      ? m.winner === m.player
        ? "VICTORY — ENEMY FLEET DESTROYED"
        : "DEFEAT — FLEET LOST"
      : mine
        ? "YOUR TURN — SELECT TARGET"
        : "ENEMY TURN — STAND BY";
    const fired = new Set(m.shotsFired.map((s) => `${s.x},${s.y}`));
    const canFire =
      mine && !ended && selected && !fired.has(`${selected.x},${selected.y}`);
    panel.innerHTML = `<section class="gamebox playing"><div class="eyebrow">ENGAGEMENT // ${m.id.slice(0, 8).toUpperCase()}</div><h2>${message}</h2><p>${ended ? "Mission complete. Rematch when ready." : mine ? "Choose a grid square by clicking the sea, then fire." : "The opposing captain is taking aim."}</p><div class="scoreboard"><div><strong>${m.shotsFired.filter((s) => s.hit).length}</strong><span>YOUR HITS</span></div><div><strong>${m.incoming.filter((s) => s.hit).length}</strong><span>ENEMY HITS</span></div><div><strong>${m.shotsFired.length}</strong><span>SHOTS FIRED</span></div></div><div class="fleet-heading">YOUR FLEET <span>BLUE = SHIPS · RED = HITS</span></div>${mini(m.ownShips, m.incoming)}<div class="targetline">${selected ? `TARGET LOCK // ${label(selected.x, selected.y)}` : "TARGET // NONE SELECTED"}</div>${ended ? '<button id="again">NEW MATCH →</button>' : `<button id="fire" ${canFire ? "" : "disabled"}>FIRE AT ${selected ? label(selected.x, selected.y) : "TARGET"} →</button>`}<div class="minor">${m.lastShot ? `LAST SHOT ${label(m.lastShot.x, m.lastShot.y)} · ${m.lastShot.hit ? "HIT" : "MISS"}${m.lastShot.sunk ? " · SUNK" : ""}` : "AWAITING FIRST SALVO"}</div></section>`;
  }
  document
    .querySelector<HTMLButtonElement>("#leave")
    ?.addEventListener("click", () => void leave());
  document
    .querySelector<HTMLButtonElement>("#again")
    ?.addEventListener("click", () => void leave(true));
  document
    .querySelector<HTMLButtonElement>("#fire")
    ?.addEventListener("click", () => void shoot());
  document.querySelector("#net")!.textContent =
    state.status === "waiting" ? "SEARCHING" : "LINK ACTIVE";
  document.querySelector("#netdot")!.classList.add("connected");
  document.querySelector("#footerRight")!.textContent =
    state.status === "waiting"
      ? "AWAITING OPPONENT"
      : state.match.status === "finished"
        ? "MISSION ENDED"
        : "MULTIPLAYER SESSION ACTIVE";
}
async function refresh() {
  if (!token || refreshInFlight) return;
  refreshInFlight = true;
  try {
    state = await api("state/" + encodeURIComponent(token));
    if (state.status === "matched") subscribe(state.match.id);
    renderPanel();
  } catch (e) {
    token = "";
    sessionStorage.removeItem(tokenKey);
    unsubscribe();
    state = null;
    showStart((e as Error).message);
  } finally {
    refreshInFlight = false;
  }
}
function unsubscribe() {
  if (gunSubscription) {
    gunSubscription.off();
    gunSubscription = null;
  }
  subscribedMatch = "";
}
let subscribedMatch = "";
function subscribe(id: string) {
  if (subscribedMatch === id) return;
  unsubscribe();
  subscribedMatch = id;
  gunSubscription = gun.get("broadside-v1").get("matches").get(id);
  gunSubscription.on((event: any) => {
    if (
      event?.revision &&
      state?.status === "matched" &&
      Number(event.revision) > state.match.revision
    )
      void refresh();
  });
}
async function join() {
  try {
    const s: State = await api("join", { token: token || undefined });
    token = s.token;
    sessionStorage.setItem(tokenKey, token);
    state = s;
    if (s.status === "matched") subscribe(s.match.id);
    renderPanel();
  } catch (e) {
    showStart((e as Error).message);
  }
}
async function shoot() {
  if (state?.status !== "matched" || !selected) return;
  try {
    await api("shoot", { token, x: selected.x, y: selected.y });
    selected = null;
    await refresh();
  } catch (e) {
    alert((e as Error).message);
    await refresh();
  }
}
async function leave(rejoin = false) {
  if (token) await api("leave", { token }).catch(() => {});
  token = "";
  sessionStorage.removeItem(tokenKey);
  unsubscribe();
  state = null;
  selected = null;
  if (rejoin) void join();
  else showStart();
}
function showStart(message = "") {
  panel.innerHTML = `<section id="intro"><div class="eyebrow">TACTICAL NAVAL ENGAGEMENT // 001</div><h1>THE OCEAN<br><em>IS YOURS.</em></h1><p>Two captains. Two fleets. One sea. Deploy automatically and engage in turn-based naval combat.</p>${message ? `<p class="error">${message.replace(/[<>]/g, "")}</p>` : ""}<button id="deploy">FIND OPPONENT <span>→</span></button><div class="minor">LIVE MULTIPLAYER · 10×10 GRID · NO ACCOUNT REQUIRED</div></section>`;
  document
    .querySelector("#deploy")
    ?.addEventListener("click", () => void join());
}
document.querySelector("#deploy")?.addEventListener("click", () => void join());
if (token) void refresh();
setInterval(() => {
  if (token) void refresh();
}, 2500);
let frame = 0;
function animate() {
  requestAnimationFrame(animate);
  frame += 0.008;
  heroShip.position.y = Math.sin(frame) * 0.13;
  water.position.y = -0.22 + Math.sin(frame * 0.8) * 0.05;
  renderer.render(scene, camera);
}
animate();
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SHIPS, SIZE, cellKey, cells, inBounds } from '../shared/protocol.ts';
import type { Cell, Placement, Shot } from '../shared/protocol.ts';
import { Vessels } from './vessels.ts';

export type Board = { fleet: Placement[]; shots: Shot[]; selected: Cell | null; invalid: boolean; phase: string };
type Particle = { velocity: T.Vector3; duration: number };

const waterVertex = `
  varying vec3 sea;
  uniform float time;
  void main() {
    vec3 p = position;
    p.z += 0.055 * sin(p.x * 2.4 + p.y * 1.6 + time * 1.4);
    p.z += 0.025 * cos(p.y * 5.1 - p.x * 2.1 - time);
    sea = p;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const waterFragment = `
  varying vec3 sea;
  uniform float time;
  void main() {
    vec2 p = sea.xy;
    p += vec2(sin(p.y * 0.7 - time * 0.28), cos(p.x * 0.52 + time * 0.38)) * 0.65;
    float a = sin(p.x * 2.2 + p.y * 1.3 + time * 1.3);
    float b = sin(p.x * 4.1 - p.y * 2.7 - time * 1.1);
    float c = cos(p.x * 8.5 + p.y * 6.0 + time * 1.7);
    float crest = smoothstep(0.53, 1.49, a + b * 0.34 + c * 0.16);
    float bands = 0.5 + 0.5 * sin(p.x * 0.29 - p.y * 0.46 + a * 0.12);
    vec3 base = mix(vec3(0.021, 0.077, 0.106), vec3(0.047, 0.20, 0.24), bands * 0.8);
    float light = exp(-abs(p.x * 0.5 + p.y * 0.34 + 3.0) * 0.24);
    vec3 color = base + crest * vec3(0.055, 0.13, 0.14) * (0.23 + light);
    color *= 0.72 + 0.28 * exp(-length(p) * 0.035);
    gl_FragColor = vec4(color, 1.0);
  }
`;

const center = (coordinate: number) => coordinate - (SIZE - 1) / 2;
const matrixObject = new T.Object3D();
const color = new T.Color();
const cursor = new T.Vector2();
const world = new T.Vector3();
const plane = new T.Plane(new T.Vector3(0, 1, 0), 0);
const viewGoal = new T.Vector3();
const positionGoal = new T.Vector3();

export class Battlefield {
  private readonly renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  private readonly scene = new T.Scene();
  private readonly camera = new T.OrthographicCamera(-8, 8, 8, -8, 0.1, 140);
  private readonly controls = new OrbitControls(this.camera, this.renderer.domElement);
  private readonly ray = new T.Raycaster();
  private readonly sizeObserver: ResizeObserver;
  private readonly motion = matchMedia('(prefers-reduced-motion: reduce)');
  private readonly resources: { dispose(): void }[] = [];
  private readonly vessels = new Vessels();
  private readonly fleetGroup = new T.Group();
  private readonly fleetMeshes = new Map<string, T.Group>();
  private readonly shipKeys = new Set<string>();
  private readonly water = new T.ShaderMaterial({
    vertexShader: waterVertex, fragmentShader: waterFragment, uniforms: { time: { value: 0 } },
  });
  private readonly tiles = this.batch(new T.PlaneGeometry(0.96, 0.96), 100, 0.5);
  private readonly marks = this.batch(new T.RingGeometry(0.13, 0.21, 16), 100);
  private readonly effects = this.batch(new T.IcosahedronGeometry(1, 0), 48);
  private readonly shell = new T.Mesh(new T.SphereGeometry(0.075, 8, 6), new T.MeshBasicMaterial({ color: 0xffdc9a }));
  private readonly particles: Particle[] = Array.from({ length: 48 }, (_, index) => {
    const theta = index * 2.39996;
    const speed = 0.4 + (index % 13) / 8;
    return { velocity: new T.Vector3(Math.cos(theta) * speed, 0.8 + speed, Math.sin(theta) * speed),
      duration: 0.7 + (index % 11) * 0.075 };
  });
  private frame = 0;
  private since = 0;
  private last = 0;
  private low = false;
  private slowWindows = 0;
  private fastWindows = 0;
  private intervals: number[] = [];
  private windowStart = 0;
  private attack: { shot: Shot; start: number } | null = null;
  private hover: Cell | null = null;
  private board: Board = { fleet: [], shots: [], selected: null, invalid: false, phase: 'intro' };
  private animationTarget: string | null = null;
  private cameraMoving = false;
  private lastPhase = '';
  private readonly down = new T.Vector2();
  private readonly performanceProbe = new URLSearchParams(location.search).has('metrics');
  private readonly metrics = { frames: [] as number[], peakCalls: 0, peakTriangles: 0, quality: [] as string[] };

  constructor(private readonly host: HTMLElement, private readonly choose: (cell: Cell) => void,
    private readonly onHover: (cell: Cell | null) => void) {
    const canvas = this.renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    this.renderer.setClearColor(0x0a222a);
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.scene.add(new T.HemisphereLight(0xe9f9ff, 0x193b46, 2.5));
    const sun = new T.DirectionalLight(0xffddaa, 2.15);
    sun.position.set(-9, 14, -8);
    this.scene.add(sun);
    const ocean = new T.Mesh(new T.PlaneGeometry(78, 78, 86, 86), this.water);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -0.14;
    this.resources.push(ocean.geometry, this.water, this.shell.geometry, this.shell.material, this.vessels);
    this.scene.add(ocean, this.fleetGroup, this.shell);
    const grid = new T.GridHelper(10, 10, 0x72b4b0, 0x508d8e);
    grid.position.y = 0.015;
    this.scene.add(grid);
    this.resources.push(grid.geometry, grid.material);
    this.shell.visible = false;
    const flagship = this.vessels.create(5.6, 'carrier');
    flagship.position.set(-6.1, 0, -2.8);
    flagship.rotation.y = 0.42;
    this.scene.add(flagship);
    flagship.userData.decorative = true;

    this.camera.position.set(8.5, 15, 13);
    this.controls.enableDamping = true;
    this.controls.minPolarAngle = 0.2;
    this.controls.maxPolarAngle = 0.89;
    this.controls.minAzimuthAngle = -1.1;
    this.controls.maxAzimuthAngle = 1.1;
    this.controls.minZoom = 0.78;
    this.controls.maxZoom = 2.15;
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    this.host.append(canvas);
    this.sizeObserver = new ResizeObserver(this.resize);
    this.sizeObserver.observe(host);
    canvas.addEventListener('pointermove', this.pointerMove);
    canvas.addEventListener('pointerdown', this.pointerDown);
    canvas.addEventListener('pointerup', this.pointerUp);
    canvas.addEventListener('pointerleave', this.pointerLeave);
    canvas.addEventListener('webglcontextlost', this.contextLost);
    canvas.addEventListener('webglcontextrestored', this.contextRestored);
    this.resize();
    this.paint();
    this.frame = requestAnimationFrame(this.tick);
  }
  private batch(geometry: T.BufferGeometry, capacity: number, opacity = 1) {
    const material = new T.MeshBasicMaterial({ transparent: opacity !== 1, opacity, depthWrite: opacity === 1 });
    const batch = new T.InstancedMesh(geometry, material, capacity);
    batch.instanceMatrix.setUsage(T.DynamicDrawUsage);
    batch.frustumCulled = false;
    batch.count = 0;
    this.scene.add(batch);
    this.resources.push(geometry, material, batch);
    return batch;
  }
  private resize = () => {
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    if (!width || !height) return;
    const ratio = width / height;
    const halfHeight = Math.max(6.9, 6.9 / ratio);
    this.camera.left = -halfHeight * ratio;
    this.camera.right = halfHeight * ratio;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.low ? 1 : 1.5));
    this.renderer.setSize(width, height, false);
  };
  private pick(event: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    cursor.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
    this.ray.setFromCamera(cursor, this.camera);
    if (!this.ray.ray.intersectPlane(plane, world)) return null;
    const cell = { x: Math.floor(world.x + SIZE / 2), y: Math.floor(world.z + SIZE / 2) };
    return inBounds(cell) ? cell : null;
  }
  private pointerMove = (event: PointerEvent) => {
    const next = this.pick(event);
    if (next?.x === this.hover?.x && next?.y === this.hover?.y) return;
    this.hover = next;
    this.onHover(next);
    this.paint();
  };
  private pointerLeave = () => {
    this.hover = null;
    this.onHover(null);
    this.paint();
  };
  private pointerDown = (event: PointerEvent) => { this.down.set(event.clientX, event.clientY); };
  private pointerUp = (event: PointerEvent) => {
    if (event.button !== 0 || Math.hypot(event.clientX - this.down.x, event.clientY - this.down.y) > 5) return;
    const cell = this.pick(event);
    if (cell) this.choose(cell);
  };
  private contextLost = (event: Event) => {
    event.preventDefault();
    cancelAnimationFrame(this.frame);
    this.host.dataset.rendering = 'lost';
  };
  private contextRestored = () => {
    this.host.dataset.rendering = 'active';
    this.last = 0;
    this.frame = requestAnimationFrame(this.tick);
  };
  setBoard(board: Board) {
    this.board = board;
    if (this.lastPhase !== board.phase) {
      this.lastPhase = board.phase;
      this.cameraMoving = !this.motion.matches;
    }
    this.syncFleet();
    this.paint();
  }
  private syncFleet() {
    this.shipKeys.clear();
    for (const ship of this.board.fleet) {
      const key = ship.id;
      this.shipKeys.add(key);
      let mesh = this.fleetMeshes.get(key);
      const length = SHIPS.find(({ id }) => id === key)!.length;
      if (!mesh) {
        mesh = this.vessels.create(length - 0.22, key === 'carrier' ? 'carrier' : key === 'submarine' ? 'submarine' : 'gunship');
        this.fleetGroup.add(mesh);
        this.fleetMeshes.set(key, mesh);
      }
      mesh.visible = true;
      mesh.position.set(center(ship.x) + (ship.vertical ? 0 : (length - 1) / 2), 0,
        center(ship.y) + (ship.vertical ? (length - 1) / 2 : 0));
      mesh.rotation.set(0, ship.vertical ? -Math.PI / 2 : 0, 0);
      const final = this.board.shots.some((shot) => shot.sunk?.id === key);
      if (final && this.animationTarget !== key) {
        mesh.position.y = -0.52;
        mesh.rotation.z = 0.12;
      }
    }
    for (const [key, mesh] of this.fleetMeshes) if (!this.shipKeys.has(key)) mesh.visible = false;
  }
  private paint() {
    const shots = new Map(this.board.shots.map((shot) => [cellKey(shot), shot]));
    const fleet = new Set(this.board.fleet.flatMap(cells).map(cellKey));
    const selected = this.board.selected ? cellKey(this.board.selected) : -1;
    const hover = this.hover ? cellKey(this.hover) : -1;
    this.tiles.count = 100;
    this.marks.count = 0;
    for (let index = 0; index < 100; index++) {
      const x = index % 10;
      const y = Math.floor(index / 10);
      const shot = shots.get(index);
      const fill = index === selected ? this.board.invalid ? 0xa43c37 : 0xd9b273
        : index === hover ? 0x71ada6 : shot?.hit ? 0x842a22 : shot ? 0x31677a
        : fleet.has(index) ? 0x477f72 : (x + y) % 2 ? 0x163b46 : 0x22515b;
      matrixObject.position.set(center(x), 0.005, center(y));
      matrixObject.rotation.set(-Math.PI / 2, 0, 0);
      matrixObject.scale.setScalar(1);
      matrixObject.updateMatrix();
      this.tiles.setMatrixAt(index, matrixObject.matrix);
      this.tiles.setColorAt(index, color.setHex(fill));
      if (shot) {
        matrixObject.position.y = 0.06;
        matrixObject.updateMatrix();
        this.marks.setMatrixAt(this.marks.count, matrixObject.matrix);
        this.marks.setColorAt(this.marks.count++, color.setHex(shot.hit ? 0xfca26a : 0x9ad8e5));
      }
    }
    for (const batch of [this.tiles, this.marks]) {
      batch.instanceMatrix.needsUpdate = true;
      if (batch.instanceColor) batch.instanceColor.needsUpdate = true;
    }
  }
  play(shot: Shot) {
    if (this.motion.matches) return;
    this.attack = { shot, start: performance.now() };
    this.animationTarget = shot.sunk?.id ?? null;
  }
  private animateShot(now: number) {
    this.shell.visible = false;
    this.effects.count = 0;
    const attack = this.attack;
    if (!attack) return;
    if (this.motion.matches) {
      this.attack = null;
      this.animationTarget = null;
      this.syncFleet();
      return;
    }
    const elapsed = (now - attack.start) / 1000;
    const x = center(attack.shot.x), z = center(attack.shot.y);
    if (elapsed < 0.45) {
      const t = elapsed / 0.45;
      this.shell.visible = true;
      this.shell.position.set(x - (1 - t) * 10, 0.13 + Math.sin(Math.PI * t) * 3, z + (1 - t) * 5);
      return;
    }
    const time = elapsed - 0.45;
    if (time > 1.8) {
      this.attack = null;
      this.animationTarget = null;
      this.syncFleet();
      return;
    }
    const ship = this.animationTarget ? this.fleetMeshes.get(this.animationTarget) : null;
    if (ship) {
      ship.position.y = -Math.min(1, time) * 0.52;
      ship.rotation.z = Math.min(1, time) * 0.27;
    }
    const count = this.low ? 24 : 48;
    for (let index = 0; index < count; index++) {
      const particle = this.particles[index];
      if (time >= particle.duration) continue;
      const t = time / particle.duration;
      matrixObject.position.set(x + particle.velocity.x * time, Math.max(0.01, particle.velocity.y * time - time * time * 2), z + particle.velocity.z * time);
      matrixObject.rotation.set(time + index, time, 0);
      matrixObject.scale.setScalar((1 - t) * (0.045 + (index % 5) * 0.024));
      matrixObject.updateMatrix();
      const tint = attack.shot.hit ? index % 4 === 0 ? 0x513e37 : index % 3 ? 0xe97939 : 0xffd083 : 0xa0e3ec;
      this.effects.setColorAt(this.effects.count, color.setHex(tint));
      this.effects.setMatrixAt(this.effects.count++, matrixObject.matrix);
    }
    this.effects.instanceMatrix.needsUpdate = true;
    if (this.effects.instanceColor) this.effects.instanceColor.needsUpdate = true;
  }
  private tick = (now: number) => {
    this.frame = requestAnimationFrame(this.tick);
    if (document.hidden) { this.last = 0; return; }
    this.since ||= now;
    this.windowStart ||= now;
    if (this.last) {
      const interval = now - this.last;
      this.intervals.push(interval);
      if (this.performanceProbe && this.metrics.frames.length < 9000) this.metrics.frames.push(interval);
    }
    this.last = now;
    if (now - this.windowStart >= 5000) {
      const sorted = this.intervals.sort((a, b) => a - b);
      const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
      this.slowWindows = p95 > 25 ? this.slowWindows + 1 : 0;
      this.fastWindows = p95 > 0 && p95 < 20 ? this.fastWindows + 1 : 0;
      if ((!this.low && this.slowWindows >= 2) || (this.low && this.fastWindows >= 6)) {
        this.low = !this.low;
        this.metrics.quality.push(this.low ? 'low' : 'high');
        this.resize();
      }
      this.intervals = [];
      this.windowStart = now;
    }
    if (this.cameraMoving) {
      const placement = this.board.phase === 'placement';
      viewGoal.set(0, 0, 0);
      positionGoal.set(placement ? 5 : 8.5, placement ? 17 : 15, placement ? 10 : 13);
      this.controls.target.lerp(viewGoal, 0.055);
      this.camera.position.lerp(positionGoal, 0.055);
      if (this.camera.position.distanceTo(positionGoal) < 0.05) this.cameraMoving = false;
    }
    this.water.uniforms.time.value = this.motion.matches ? 0 : (now - this.since) / 1000;
    this.controls.target.x = T.MathUtils.clamp(this.controls.target.x, -4, 4);
    this.controls.target.z = T.MathUtils.clamp(this.controls.target.z, -4, 4);
    this.controls.target.y = 0;
    this.controls.update();
    this.animateShot(now);
    this.renderer.render(this.scene, this.camera);
    if (this.performanceProbe) {
      this.metrics.peakCalls = Math.max(this.metrics.peakCalls, this.renderer.info.render.calls);
      this.metrics.peakTriangles = Math.max(this.metrics.peakTriangles, this.renderer.info.render.triangles);
      Object.assign(window, { broadsideMetrics: this.metrics, broadsideResources: this.renderer.info.memory });
    }
  };
  dispose() {
    cancelAnimationFrame(this.frame);
    this.sizeObserver.disconnect();
    this.controls.dispose();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointermove', this.pointerMove);
    canvas.removeEventListener('pointerdown', this.pointerDown);
    canvas.removeEventListener('pointerup', this.pointerUp);
    canvas.removeEventListener('pointerleave', this.pointerLeave);
    canvas.removeEventListener('webglcontextlost', this.contextLost);
    canvas.removeEventListener('webglcontextrestored', this.contextRestored);
    for (const resource of this.resources) resource.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    canvas.remove();
  }
}

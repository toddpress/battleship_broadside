import './style.css';
import { Battlefield } from './battlefield.ts';
import { SHIPS, cellKey, cells, inBounds, label, randomFleet, validFleet } from '../shared/protocol.ts';
import type { Cell, Command, Placement, Snapshot } from '../shared/protocol.ts';
import { ApiError, Session } from './session.ts';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="topbar">
    <a class="brand" href="/" aria-label="Broadside home"><span class="emblem" aria-hidden="true">✦</span><span>BROADSIDE</span></a>
    <span class="top-title">TACTICAL NAVAL COMBAT</span>
    <span class="network"><i></i><span id="link" role="status" aria-live="polite">STANDBY</span></span>
  </header>
  <main class="layout">
    <section class="visual" aria-label="Tactical battlefield">
      <div id="scene"></div>
      <div class="scene-heading"><span class="eyebrow">NORTH ATLANTIC</span><span id="view-label">FLEET COMMAND</span></div>
      <div class="compass" aria-hidden="true"><span>N</span><b>◇</b></div>
      <div class="scene-footer"><span id="coordinate">GRID 10 × 10</span><span>DRAG TO ORBIT · SCROLL TO ZOOM</span></div>
    </section>
    <aside class="sidebar">
      <div class="brief" id="brief">
        <p class="eyebrow" id="phase">FLEET COMMAND</p>
        <h1 id="headline">Command<br>the fleet.</h1>
        <p id="description">Two captains, one sea. Deploy your ships and outmaneuver your opponent in a turn-based naval duel.</p>
        <div class="radar" id="radar" hidden aria-hidden="true"><div></div><span></span></div>
        <button id="join" class="primary">Find opponent <span>↗</span></button>
      </div>
      <section id="tactics" hidden aria-label="Board controls">
        <div id="placement" hidden>
          <div class="row"><span class="eyebrow">DEPLOYMENT</span><button id="random" class="quiet">Randomize</button></div>
          <div class="fleet-list" id="fleet-list"></div>
          <button id="rotate" class="quiet">↻ Rotate selected ship</button>
        </div>
        <div id="views" class="segmented" hidden>
          <button id="enemy" aria-pressed="true">Enemy waters</button>
          <button id="friendly" aria-pressed="false">Your fleet</button>
        </div>
        <div class="board-layout" id="board-layout">
          <div class="column-labels" aria-hidden="true">A B C D E F G H I J</div>
          <div class="row-labels" aria-hidden="true">1 2 3 4 5 6 7 8 9 10</div>
          <div id="board" role="group" aria-label="Tactical grid"></div>
        </div>
        <div class="action-row">
          <button id="action" class="primary">Lock fleet</button>
          <button id="rematch" class="primary" hidden>Request rematch</button>
        </div>
      </section>
      <p id="notice" class="notice" role="status"></p>
      <section id="communications" hidden aria-label="Room chat">
        <div class="row"><span class="eyebrow">ROOM CHAT</span><span id="opponent" class="minor"></span></div>
        <div id="messages" role="log" aria-label="Messages"></div>
        <form id="chat"><label class="sr-only" for="message">Message</label><input id="message" placeholder="Message opponent" autocomplete="off" maxlength="480"><button aria-label="Send message">↑</button></form>
      </section>
      <button id="leave" class="quiet leave" hidden>Leave room</button>
    </aside>
  </main>
  <footer class="bottom"><span>PROJECT BROADSIDE</span><span id="room-id">OPEN WATERS</span></footer>
`;

function get<E extends HTMLElement = HTMLElement>(id: string) { return document.getElementById(id) as E; }
function button(id: string) { return get<HTMLButtonElement>(id); }
const board = get('board');
const shipButtons = new Map<string, HTMLButtonElement>();
const squares: HTMLButtonElement[] = [];
const input = get<HTMLInputElement>('message');
let state: Snapshot | null = null;
let link = 'idle';
let draft: Placement[] = [];
let selectedShip: Placement['id'] = 'carrier';
let target: Cell | null = null;
let hover: Cell | null = null;
let view: 'friendly' | 'enemy' = 'enemy';
let pending = false;
let draftInvalid = false;
let renderedChatSequence = 0;
let focusedCell = 0;
let battlefield: Battlefield | null = null;

for (const ship of SHIPS) {
  const control = document.createElement('button');
  control.type = 'button';
  control.draggable = true;
  control.textContent = ship.name;
  control.dataset.length = String(ship.length);
  control.addEventListener('click', () => { selectedShip = ship.id; render(); });
  control.addEventListener('dragstart', (event) => {
    selectedShip = ship.id;
    event.dataTransfer?.setData('text/plain', ship.id);
    render();
  });
  shipButtons.set(ship.id, control);
  get('fleet-list').append(control);
}
for (let index = 0; index < 100; index++) {
  const cell = { x: index % 10, y: Math.floor(index / 10) };
  const square = document.createElement('button');
  square.type = 'button';
  square.className = 'square';
  square.dataset.cell = label(cell);
  square.addEventListener('click', () => choose(cell));
  square.addEventListener('focus', () => {
    focusedCell = index;
    squares.forEach((item, i) => { item.tabIndex = i === index ? 0 : -1; });
  });
  square.addEventListener('dragover', (event) => {
    if (canPlace()) event.preventDefault();
  });
  square.addEventListener('drop', (event) => {
    event.preventDefault();
    const id = event.dataTransfer?.getData('text/plain');
    if (SHIPS.some((ship) => ship.id === id)) {
      selectedShip = id as Placement['id'];
      choose(cell);
    }
  });
  squares.push(square);
  board.append(square);
}
for (const [id, axis] of [['board-layout .column-labels', 'columns'], ['board-layout .row-labels', 'rows']] as const) {
  const container = document.querySelector('#' + id)!;
  container.replaceChildren(...Array.from({ length: 10 }, (_, index) => {
    const label = document.createElement('span');
    label.textContent = axis === 'columns' ? String.fromCharCode(65 + index) : String(index + 1);
    return label;
  }));
}
board.addEventListener('keydown', (event) => {
  const delta: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (event.key.toLowerCase() === 'r' && canPlace()) { rotate(); return; }
  const move = delta[event.key];
  if (!move) return;
  event.preventDefault();
  const next = { x: focusedCell % 10 + move[0], y: Math.floor(focusedCell / 10) + move[1] };
  if (inBounds(next)) squares[cellKey(next)].focus();
});

const canPlace = () => state?.phase === 'placement' && !state.ready[state.seat] && !pending && link === 'online';
const canFire = () => state?.phase === 'playing' && state.turn === state.seat && state.present[1 - state.seat]
  && !pending && link === 'online' && view === 'enemy';
const tell = (text: string) => { get('notice').textContent = text; };
function applyDraft(candidate: Placement[], cell: Cell) {
  draftInvalid = !validFleet(candidate);
  target = cell;
  if (!draftInvalid) draft = candidate;
  tell(draftInvalid ? 'Ships must fit on the board without overlapping.' : '');
  render();
}
function choose(cell: Cell) {
  if (canPlace()) {
    applyDraft(draft.map((ship) => ship.id === selectedShip ? { ...ship, ...cell } : ship), cell);
  } else if (canFire() && !state!.shots.some((shot) => shot.by === state!.seat && cellKey(shot) === cellKey(cell))) {
    target = cell;
    render();
  }
}
function rotate() {
  if (!canPlace()) return;
  const ship = draft.find(({ id }) => id === selectedShip);
  if (ship) applyDraft(draft.map((item) => item.id === selectedShip ? { ...item, vertical: !item.vertical } : item), ship);
}
try {
  battlefield = new Battlefield(get('scene'), choose, (cell) => { hover = cell; coordinate(); });
} catch {
  get('scene').dataset.rendering = 'unavailable';
  tell('3D rendering is unavailable. You can play using the tactical grid.');
}

function coordinate() {
  get('coordinate').textContent = hover || target ? 'COORDINATE ' + label((hover ?? target)!) : 'GRID 10 × 10';
}
function setText(id: string, value: string) { get(id).textContent = value; }
function render() {
  const phase = state?.phase ?? 'intro';
  const paired = Boolean(state?.matchId && phase !== 'closed');
  const placement = phase === 'placement';
  const finished = phase === 'finished';
  const seat = state?.seat ?? 0;
  const opponentPresent = Boolean(state?.present[1 - seat]);
  const ready = Boolean(state?.ready[seat]);
  const playing = phase === 'playing';
  get('scene').dataset.phase = phase;
  const linkLabel = link === 'online' ? 'LINK ACTIVE' : link === 'retrying' ? 'RECONNECTING' : 'STANDBY';
  if (get('link').textContent !== linkLabel) setText('link', linkLabel);
  get('link').parentElement!.dataset.link = link;
  get('join').hidden = Boolean(state && phase !== 'closed') || link === 'retrying';
  button('join').disabled = pending;
  get('radar').hidden = phase !== 'waiting';
  get('tactics').hidden = !paired;
  get('placement').hidden = !placement;
  get('views').hidden = placement;
  get('communications').hidden = !paired;
  get('leave').hidden = !state || phase === 'closed';
  button('leave').disabled = pending || link !== 'online';
  get('action').hidden = finished;
  get('rematch').hidden = !finished;
  button('rematch').disabled = pending || !opponentPresent || link !== 'online' || Boolean(state?.votes[seat]);
  setText('rematch', state?.votes[seat] ? 'Rematch requested' : 'Request rematch');
  button('rotate').disabled = !canPlace();
  button('random').disabled = !canPlace();
  setText('opponent', opponentPresent ? 'OPPONENT ONLINE' : 'OPPONENT AWAY');
  setText('room-id', state ? 'ROOM ' + state.roomId.slice(0, 8).toUpperCase() : 'OPEN WATERS');
  setText('phase', placement ? 'DEPLOYMENT' : playing ? 'ENGAGEMENT' : finished ? 'AFTER ACTION' : 'FLEET COMMAND');
  if (phase === 'intro') {
    get('headline').innerHTML = 'Command<br>the fleet.';
    setText('description', link === 'expired' ? 'Your previous session ended. Find an opponent to deploy again.'
      : link === 'retrying' ? 'Restoring your room connection…'
      : 'Two captains, one sea. Deploy your ships and outmaneuver your opponent in a turn-based naval duel.');
  } else if (phase === 'waiting') {
    setText('headline', 'Scanning the horizon.');
    setText('description', 'Waiting for another captain to join.');
  } else if (placement) {
    setText('headline', ready ? 'Fleet locked.' : 'Deploy your fleet.');
    setText('description', ready ? 'Waiting for your opponent to lock their fleet.' : 'Choose a ship, then click or drag it to a grid square. Rotate with R.');
  } else if (playing) {
    setText('headline', state!.turn === seat ? 'Your turn.' : 'Enemy turn.');
    const last = state!.shots.at(-1);
    setText('description', !opponentPresent ? 'Combat paused while your opponent reconnects.'
      : last ? label(last) + ' · ' + (last.sunk ? 'Ship sunk' : last.hit ? 'Hit' : 'Miss')
      : 'Select an enemy coordinate and confirm to fire.');
  } else if (finished) {
    setText('headline', state!.winner === seat ? 'Victory.' : 'Defeat.');
    setText('description', state!.reason === 'forfeit' ? 'The match ended by forfeit.' : 'The final ship has fallen.');
  } else {
    setText('headline', 'Room closed.');
    setText('description', 'The engagement ended before combat.');
  }

  const own = placement || view === 'friendly';
  const shots = state?.shots.filter((shot) => own ? shot.by !== seat : shot.by === seat) ?? [];
  const fleet = placement && !ready ? draft : own ? state?.fleet ?? [] : shots.flatMap((shot) => shot.sunk ? [shot.sunk] : []);
  const action = button('action');
  action.textContent = placement ? ready ? 'Fleet locked' : 'Lock fleet' : target ? 'Fire at ' + label(target) : 'Select a target';
  action.disabled = placement ? !canPlace() || !opponentPresent || draftInvalid || !validFleet(draft) : !canFire() || !target;
  button('enemy').setAttribute('aria-pressed', String(view === 'enemy'));
  button('friendly').setAttribute('aria-pressed', String(view === 'friendly'));
  setText('view-label', paired ? own ? 'FRIENDLY WATERS' : 'ENEMY WATERS' : 'FLEET COMMAND');
  for (const [id, control] of shipButtons) {
    control.setAttribute('aria-pressed', String(id === selectedShip));
    control.disabled = !canPlace();
    control.draggable = canPlace();
  }
  const occupied = new Set(fleet.flatMap(cells).map(cellKey));
  const marked = new Map(shots.map((shot) => [cellKey(shot), shot]));
  squares.forEach((square, index) => {
    const shot = marked.get(index);
    const selected = Boolean(target && cellKey(target) === index);
    const status = shot ? shot.hit ? 'hit' : 'miss' : occupied.has(index) ? 'ship' : 'clear';
    square.dataset.status = status;
    square.dataset.selected = String(selected);
    square.setAttribute('aria-label', square.dataset.cell + ', ' + status);
    square.setAttribute('aria-pressed', String(selected));
    square.tabIndex = focusedCell === index ? 0 : -1;
  });
  battlefield?.setBoard({ fleet, shots, selected: target, invalid: draftInvalid, phase });
  coordinate();
  const messages = get('messages');
  const latest = state?.chat.at(-1)?.sequence ?? 0;
  if (latest !== renderedChatSequence) {
    messages.replaceChildren(...(state?.chat ?? []).map((message) => {
      const item = document.createElement('p');
      const name = document.createElement('b');
      name.textContent = message.from === seat ? 'You ' : 'Opponent ';
      item.append(name, document.createTextNode(message.text));
      return item;
    }));
    messages.scrollTop = messages.scrollHeight;
    renderedChatSequence = latest;
  }
  input.disabled = link !== 'online';
}

const session = new Session((next, status, fresh) => {
  const previous = state;
  link = status;
  state = next;
  if (next?.matchId !== previous?.matchId || next?.roomId !== previous?.roomId) {
    target = null;
    draftInvalid = false;
    draft = next?.phase === 'placement' ? randomFleet() : [];
    view = next?.phase === 'placement' ? 'friendly' : 'enemy';
    tell('');
  }
  if (next?.phase === 'playing' && previous?.phase !== 'playing') { view = 'enemy'; target = null; }
  if (fresh && next && previous && next.shots.length > previous.shots.length) {
    const shot = next.shots.at(-1)!;
    view = shot.by === next.seat ? 'enemy' : 'friendly';
    target = null;
    battlefield?.play(shot);
  }
  render();
});

const errorMessages: Record<string, string> = {
  STALE_REVISION: 'The board changed. Check the latest state and try again.',
  OPPONENT_AWAY: 'Your opponent is reconnecting.',
  SESSION_EXPIRED: 'Your session has expired.',
  INVALID_MESSAGE: 'Enter a message of 1–240 characters.',
  CHAT_RATE_LIMIT: 'You’re sending messages too quickly. Try again shortly.',
  JOIN_RATE_LIMIT: 'Too many searches. Try again in a minute.',
  INVALID_FLEET: 'Move or rotate the ships to fit the board.',
};
function errorMessage(error: unknown) {
  return error instanceof ApiError ? errorMessages[error.message] ?? 'That action is unavailable in the current room state.'
    : 'Connection interrupted. Try again when the link returns.';
}
async function perform(operation: () => Promise<void>) {
  if (pending) return;
  pending = true;
  render();
  tell('');
  try { await operation(); }
  catch (error) { tell(errorMessage(error)); }
  finally { pending = false; render(); }
}
type Action = Command extends infer Item ? Item extends Command ? Omit<Item, 'id' | 'roomId'> : never : never;
function send(action: Action) {
  if (!state) return Promise.resolve();
  return session.send({ ...action, id: crypto.randomUUID(), roomId: state.roomId });
}
button('join').onclick = () => void perform(() => session.join());
button('leave').onclick = () => void perform(() => send({ kind: 'leave' }));
button('random').onclick = () => { draft = randomFleet(); draftInvalid = false; target = null; tell(''); render(); };
button('rotate').onclick = rotate;
button('friendly').onclick = () => { view = 'friendly'; target = null; render(); };
button('enemy').onclick = () => { view = 'enemy'; target = null; render(); };
button('action').onclick = () => {
  if (!state?.matchId) return;
  const { matchId, matchRevision } = state;
  if (canPlace()) {
    const fleet = draft;
    void perform(async () => {
      try { await send({ kind: 'ready', matchId, revision: matchRevision, fleet }); }
      catch (error) {
        const current = state;
        if (!(error instanceof ApiError && error.message === 'STALE_REVISION') ||
          current?.phase !== 'placement' || current.matchId !== matchId || current.ready[current.seat] ||
          !current.present[1 - current.seat] || draft !== fleet) throw error;
        await send({ kind: 'ready', matchId, revision: current.matchRevision, fleet });
      }
    });
  } else if (canFire() && target) {
    const cell = target;
    void perform(() => send({ kind: 'fire', matchId, revision: matchRevision, ...cell }));
  }
};
button('rematch').onclick = () => {
  const matchId = state?.matchId;
  if (matchId) void perform(() => send({ kind: 'rematch', matchId }));
};
get<HTMLFormElement>('chat').onsubmit = (event) => {
  event.preventDefault();
  const text = input.value;
  if (!text.trim()) return;
  if ([...text.trim()].length > 240) { tell(errorMessages.INVALID_MESSAGE); return; }
  void perform(async () => {
    await send({ kind: 'chat', text });
    if (input.value === text) input.value = '';
  });
};

render();
session.start();
function dispose() {
  session.dispose();
  battlefield?.dispose();
  battlefield = null;
  window.removeEventListener('pagehide', onPageHide);
}
function onPageHide(event: PageTransitionEvent) {
  if (!event.persisted) dispose();
}
window.addEventListener('pagehide', onPageHide);
if (import.meta.hot) import.meta.hot.dispose(dispose);

import test from "node:test";
import assert from "node:assert/strict";
import { makeFleet, FLEET, fire, view } from "../server/engine.js";
import { Matchmaker } from "../server/matchmaker.js";
test("fleets have valid, disjoint cells", () => {
  for (let i = 0; i < 30; i++) {
    const f = makeFleet();
    assert.deepEqual(
      f.map((s) => s.cells.length),
      FLEET,
    );
    const c = f.flatMap((s) => s.cells);
    assert.equal(new Set(c).size, c.length);
  }
});
test("odd player waits; next joins; next odd player waits", () => {
  const m = new Matchmaker();
  const a = m.join();
  assert.equal(a.status, "waiting");
  const b = m.join();
  assert.equal(b.status, "matched");
  assert.equal(m.state(a.token).status, "matched");
  assert.equal(m.join().status, "waiting");
});
test("turns enforced and repeat shots denied", () => {
  const m = new Matchmaker(),
    a = m.join(),
    b = m.join();
  const match = m.matches.get(b.match.id);
  const first = m.shoot(a.token, 0, 0);
  assert.equal(typeof first.hit, "boolean");
  assert.equal(m.shoot(a.token, 1, 0).status, 409);
  assert.equal(m.shoot(b.token, 0, 0).status, undefined);
  assert.equal(m.shoot(a.token, 0, 0).status, 409);
  assert.equal(view(match, 0).opponentShips, null);
});
test("stale waiting sessions removed", () => {
  let now = 0;
  const m = new Matchmaker({ now: () => now, ttl: 100 });
  const a = m.join();
  now = 101;
  m.sweep();
  assert.equal(m.state(a.token), null);
  assert.equal(m.join().status, "waiting");
});
test("abandonment declares opponent winner", () => {
  const m = new Matchmaker();
  const a = m.join(),
    b = m.join();
  m.leave(a.token);
  assert.equal(m.state(b.token).match.winner, 1);
});

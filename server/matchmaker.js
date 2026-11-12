import { randomUUID } from "node:crypto";
import { makeFleet, fire, view } from "./engine.js";
export class Matchmaker {
  constructor({
    publish = () => {},
    now = () => Date.now(),
    ttl = 45000,
  } = {}) {
    this.publish = publish;
    this.now = now;
    this.ttl = ttl;
    this.players = new Map();
    this.matches = new Map();
    this.queue = [];
  }
  join(token = randomUUID()) {
    this.sweep();
    let player = this.players.get(token);
    if (player) {
      player.seen = this.now();
      return this.state(token);
    }
    player = { token, seen: this.now(), matchId: null, index: null };
    this.players.set(token, player);
    const opponent = this.queue.find(
      (t) => t !== token && this.players.has(t) && !this.players.get(t).matchId,
    );
    if (!opponent) {
      this.queue.push(token);
      return this.state(token);
    }
    this.queue = this.queue.filter((t) => t !== opponent);
    const id = randomUUID(),
      match = {
        id,
        tokens: [opponent, token],
        fleets: [makeFleet(), makeFleet()],
        shots: [[], []],
        turn: 0,
        status: "playing",
        revision: 1,
      };
    this.matches.set(id, match);
    this.players.get(opponent).matchId = id;
    this.players.get(opponent).index = 0;
    player.matchId = id;
    player.index = 1;
    this.publish(match);
    return this.state(token);
  }
  state(token) {
    const player = this.players.get(token);
    if (!player) return null;
    player.seen = this.now();
    if (!player.matchId)
      return {
        status: "waiting",
        token,
        position: this.queue.indexOf(token) + 1,
      };
    const match = this.matches.get(player.matchId);
    if (!match) return null;
    return { status: "matched", token, match: view(match, player.index) };
  }
  shoot(token, x, y) {
    const p = this.players.get(token);
    if (!p || !p.matchId) return { error: "Unknown player", status: 404 };
    p.seen = this.now();
    const match = this.matches.get(p.matchId);
    if (!match) return { error: "Match missing", status: 404 };
    const result = fire(match, p.index, x, y);
    if (!result.error) this.publish(match);
    return result.error ? result : { ...result, match: view(match, p.index) };
  }
  heartbeat(token) {
    const p = this.players.get(token);
    if (!p) return null;
    p.seen = this.now();
    return this.state(token);
  }
  leave(token) {
    const p = this.players.get(token);
    if (!p) return;
    this.players.delete(token);
    this.queue = this.queue.filter((t) => t !== token);
    if (p.matchId) {
      const match = this.matches.get(p.matchId);
      if (match && match.status === "playing") {
        match.status = "finished";
        match.winner = 1 - p.index;
        match.revision++;
        match.lastShot = null;
        this.publish(match);
      }
    }
  }
  sweep() {
    const now = this.now();
    for (const [token, p] of this.players)
      if (now - p.seen > this.ttl) this.leave(token);
    for (const [id, match] of this.matches)
      if (match.tokens.every((t) => !this.players.has(t)))
        this.matches.delete(id);
  }
}

#!/usr/bin/env node

// Minimal BrowserQuest-style server for bridge development.
// Goals:
// - Tiny, dependency-light.
// - WebSocket protocol we fully control.
// - Enough to support: join, welcome, move.
//
// Protocol (JSON, intentionally simple):
// - Client -> Server:
//   { "op": "hello", "name": string }
//   { "op": "move", "x": number, "y": number }
//
// - Server -> Client:
//   { "op": "welcome", "id": string, "name": string, "x": number, "y": number, "hp": number, "maxHp": number }
//   { "op": "move", "id": string, "x": number, "y": number }
//
// Multiple clients see each other move; positions are tracked in-memory.

import http from 'http';
import { WebSocketServer } from 'ws';

const PORT = process.env.MIN_BQ_PORT || 8000;

const server = http.createServer();
const wss = new WebSocketServer({ server });

const players = new Map(); // id -> { id, name, x, y, hp, maxHp, ws }

function broadcast(obj) {
  const msg = JSON.stringify(obj);
  for (const p of players.values()) {
    if (p.ws.readyState === p.ws.OPEN) {
      p.ws.send(msg);
    }
  }
}

function makeId() {
  return 'p' + Math.random().toString(36).slice(2, 8);
}

wss.on('connection', (ws) => {
  let player = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (!msg || typeof msg.op !== 'string') return;

    if (msg.op === 'hello' && !player) {
      const name = (msg.name || 'opencode').toString().slice(0, 16);
      const id = makeId();
      player = { id, name, x: 10, y: 10, hp: 100, maxHp: 100, ws };
      players.set(id, player);

      const welcome = {
        op: 'welcome',
        id,
        name,
        x: player.x,
        y: player.y,
        hp: player.hp,
        maxHp: player.maxHp,
      };
      ws.send(JSON.stringify(welcome));

      // Inform others
      broadcast({ op: 'spawn', id, name, x: player.x, y: player.y });
      return;
    }

    if (!player) return;

    if (msg.op === 'move') {
      const x = Number(msg.x);
      const y = Number(msg.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      player.x = x;
      player.y = y;

      const update = { op: 'move', id: player.id, x: player.x, y: player.y };
      broadcast(update);
      return;
    }
  });

  ws.on('close', () => {
    if (player) {
      players.delete(player.id);
      broadcast({ op: 'despawn', id: player.id });
    }
  });
});

server.listen(PORT, () => {
  console.log(`[min-bq] server listening on ws://localhost:${PORT}`);
});

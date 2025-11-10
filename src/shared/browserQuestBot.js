// BrowserQuestBot: minimal client for BrowserQuest's WebSocket protocol.
// This implementation is intentionally small:
// - Connects directly to a single BrowserQuest world server (no dispatcher).
// - Performs the basic handshake (sendHello) with a chosen name.
// - Supports simple grid movement commands.
//
// It is NOT a full reimplementation of the browser client. It only
// implements what the bridge needs to let CLIs/agents join and move.

import WebSocket from 'ws';

// BrowserQuest opcodes (subset), inferred from public sources and client code.
// If your fork differs, adjust here.
const OPCODES = {
  HELLO: 0,
  WELCOME: 1,
  MOVE: 2,
};

export class BrowserQuestBot {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
    this.ws = null;
    this.connected = false;
    this.playerId = null;
    this.name = null;

    this.state = {
      pos: { x: 0, y: 0 },
      hp: null,
      maxHp: null,
    };
  }

  async connectAndLogin({ name }) {
    this.name = name || 'opencode';
    await this._connect();
    await this._handshake();
    return this.playerId;
  }

  _connect() {
    if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.serverUrl);
      this.ws = ws;

      ws.on('open', () => {
        this.connected = true;
        resolve();
      });

      ws.on('message', (data) => {
        this._onMessage(data);
      });

      ws.on('close', () => {
        this.connected = false;
      });

      ws.on('error', (err) => {
        if (!this.connected) {
          reject(err);
        }
      });
    });
  }

  _handshake() {
    // Send HELLO packet with chosen name.
    // Minimal framing: [OPCODE, name]
    // Adjust if your BrowserQuest fork expects a different structure.
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Handshake timeout'));
      }, 5000);

      const onWelcome = () => {
        clearTimeout(timeout);
        this._off('welcome', onWelcome);
        resolve();
      };

      this._on('welcome', onWelcome);

      const payload = JSON.stringify({ op: OPCODES.HELLO, name: this.name });
      this.ws.send(payload);
    });
  }

  async executeCommand(command) {
    const [verb, ...rest] = command.trim().split(/\s+/);
    const v = (verb || '').toLowerCase();

    if (v === 'look' || v === 'where') {
      const { x, y } = this.state.pos;
      return `You are at (${x}, ${y}).`;
    }

    if (v === 'move' || v === 'm') {
      const dir = (rest[0] || '').toLowerCase();
      const moved = this._sendMove(dir);
      return moved ? `Moving ${dir}...` : `Unknown direction: ${dir}`;
    }

    return `Unknown command: ${command}`;
  }

  _sendMove(dir) {
    if (!this.connected || !this.ws) return false;

    const delta = {
      n: { x: 0, y: -1 },
      s: { x: 0, y: 1 },
      e: { x: 1, y: 0 },
      w: { x: -1, y: 0 },
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    }[dir];

    if (!delta) return false;

    const target = {
      x: this.state.pos.x + delta.x,
      y: this.state.pos.y + delta.y,
    };

    const payload = JSON.stringify({
      op: OPCODES.MOVE,
      x: target.x,
      y: target.y,
    });

    this.ws.send(payload);
    // We optimistically update; real position will be corrected by server events.
    this.state.pos = target;
    return true;
  }

  _onMessage(raw) {
    // Expect JSON for now.
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.op === OPCODES.WELCOME) {
      this.playerId = msg.id;
      if (typeof msg.x === 'number' && typeof msg.y === 'number') {
        this.state.pos = { x: msg.x, y: msg.y };
      }
      if (typeof msg.hp === 'number') {
        this.state.hp = msg.hp;
      }
      if (typeof msg.maxHp === 'number') {
        this.state.maxHp = msg.maxHp;
      }
      this._emit('welcome');
      return;
    }

    // TODO: handle MOVE, HP updates, etc., when we align with real protocol.
  }

  // Minimal event helper (internal)
  _on(type, handler) {
    this._listeners = this._listeners || {};
    if (!this._listeners[type]) this._listeners[type] = new Set();
    this._listeners[type].add(handler);
  }

  _off(type, handler) {
    if (!this._listeners || !this._listeners[type]) return;
    this._listeners[type].delete(handler);
  }

  _emit(type, ...args) {
    if (!this._listeners || !this._listeners[type]) return;
    for (const fn of this._listeners[type]) {
      try {
        fn(...args);
      } catch (e) {
        // swallow
      }
    }
  }

  getPublicState() {
    return {
      playerId: this.playerId,
      name: this.name,
      pos: this.state.pos,
      hp: this.state.hp,
      maxHp: this.state.maxHp,
    };
  }
}

// BrowserQuestBot: minimal client stub for BrowserQuest's WebSocket protocol.
// For now, this is a placeholder that we will flesh out once we wire to a running server.

import WebSocket from 'ws';

export class BrowserQuestBot {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
    this.ws = null;
    this.connected = false;
    this.playerId = null;
    this.state = {
      pos: { x: 0, y: 0 },
      hp: null,
      maxHp: null,
      entities: [],
      inventory: []
    };
  }

  async connectAndLogin({ name }) {
    // TODO: implement actual BrowserQuest handshake.
    // For now: establish WS connection and fake a playerId.
    await this._connect();
    this.playerId = `bq-${Math.random().toString(36).slice(2, 8)}`;
    return this.playerId;
  }

  _connect() {
    if (this.connected) return Promise.resolve();
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.serverUrl);
      this.ws.on('open', () => {
        this.connected = true;
        resolve();
      });
      this.ws.on('error', (err) => {
        reject(err);
      });
      // TODO: wire onmessage to update state based on BQ protocol
    });
  }

  async executeCommand(command) {
    // Very small command parser for now; real implementation will
    // translate to BrowserQuest protocol messages.

    const [verb, ...rest] = command.trim().split(/\s+/);

    switch ((verb || '').toLowerCase()) {
      case 'move':
      case 'm': {
        const dir = (rest[0] || '').toLowerCase();
        // TODO: send proper movement packets
        return `move ${dir} (stub)`;
      }
      case 'look':
      case 'where':
        return `You are at (${this.state.pos.x}, ${this.state.pos.y}).`;
      default:
        return `Unknown command: ${command}`;
    }
  }

  getPublicState() {
    return {
      playerId: this.playerId,
      pos: this.state.pos,
      hp: this.state.hp,
      maxHp: this.state.maxHp,
      // Keep initial state minimal; we can expand later
    };
  }
}

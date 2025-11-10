// BotManager: manages sessions that connect to BrowserQuest as players.
// NOTE: Minimal placeholder implementation for now.

import { BrowserQuestBot } from './browserQuestBot.js';

export class BotManager {
  constructor(bqServerUrl) {
    this.bqServerUrl = bqServerUrl;
    this.sessions = new Map(); // token -> { playerId, bot }
  }

  _makeToken() {
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  }

  async createSession({ name }) {
    const bot = new BrowserQuestBot(this.bqServerUrl);
    const playerId = await bot.connectAndLogin({ name });
    const token = this._makeToken();
    this.sessions.set(token, { playerId, bot });
    return { playerId, token };
  }

  _getSession({ playerId, token }) {
    const session = this.sessions.get(token);
    if (!session || session.playerId !== playerId) {
      throw new Error('invalid_session');
    }
    return session;
  }

  async handleCommand({ playerId, token, command }) {
    const session = this._getSession({ playerId, token });
    const output = await session.bot.executeCommand(command);
    const state = session.bot.getPublicState();
    return { ok: true, output, state };
  }

  async getState({ playerId, token }) {
    const session = this._getSession({ playerId, token });
    return session.bot.getPublicState();
  }
}

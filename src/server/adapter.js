#!/usr/bin/env node

// Minimal BrowserQuest bridge adapter (skeleton)
// - Exposes HTTP endpoints for join/command/state
// - Manages per-player connections to a BrowserQuest server
// - Talks to BrowserQuest over WebSocket via a thin client (to be implemented)

import http from 'http';
import url from 'url';
import { BotManager } from '../shared/botManager.js';

const PORT = process.env.BQ_BRIDGE_PORT || 4000;
const BQ_SERVER_URL = process.env.BQ_SERVER_URL || 'ws://localhost:8000';

const botManager = new BotManager(BQ_SERVER_URL);

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  });
  res.end(data);
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);

  if (req.method === 'POST' && parsed.pathname === '/join') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { name } = body ? JSON.parse(body) : {};
        const session = await botManager.createSession({ name });
        sendJson(res, 200, {
          playerId: session.playerId,
          token: session.token
        });
      } catch (err) {
        console.error('join error', err);
        sendJson(res, 500, { error: 'join_failed' });
      }
    });
    return;
  }

  if (req.method === 'POST' && parsed.pathname === '/command') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { playerId, token, command } = body ? JSON.parse(body) : {};
        if (!playerId || !token || !command) {
          return sendJson(res, 400, { error: 'missing_fields' });
        }
        const result = await botManager.handleCommand({ playerId, token, command });
        sendJson(res, 200, result);
      } catch (err) {
        console.error('command error', err);
        sendJson(res, 500, { error: 'command_failed' });
      }
    });
    return;
  }

  if (req.method === 'GET' && parsed.pathname === '/state') {
    const { playerId, token } = parsed.query;
    if (!playerId || !token) {
      return sendJson(res, 400, { error: 'missing_fields' });
    }
    try {
      const state = await botManager.getState({ playerId, token });
      sendJson(res, 200, state);
    } catch (err) {
      console.error('state error', err);
      sendJson(res, 500, { error: 'state_failed' });
    }
    return;
  }

  if (req.method === 'GET' && parsed.pathname === '/health') {
    return sendJson(res, 200, { ok: true });
  }

  res.statusCode = 404;
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`[bridge] adapter listening on http://localhost:${PORT}`);
  console.log(`[bridge] targeting BrowserQuest at ${BQ_SERVER_URL}`);
});

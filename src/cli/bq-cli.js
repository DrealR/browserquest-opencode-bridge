#!/usr/bin/env node

// Minimal MUD-style CLI client for the bridge adapter.
// Usage:
//   node src/cli/bq-cli.js

import readline from 'readline';
import axios from 'axios';

const ADAPTER_URL = process.env.BQ_BRIDGE_URL || 'http://localhost:4000';

async function join(name) {
  const res = await axios.post(`${ADAPTER_URL}/join`, { name });
  return res.data;
}

async function sendCommand(session, command) {
  const res = await axios.post(`${ADAPTER_URL}/command`, {
    playerId: session.playerId,
    token: session.token,
    command
  });
  return res.data;
}

function banner(name, playerId) {
  console.log('==========================================');
  console.log('  BROWSERQUEST // TERMINAL LINK ESTABLISHED');
  console.log('==========================================');
  console.log(`  operator: ${name}`);
  console.log(`  playerId: ${playerId}`);
  console.log('  type "help" for commands');
  console.log('');
}

async function main() {
  const name = process.argv[2] || 'opencode';
  let session;
  try {
    session = await join(name);
  } catch (err) {
    console.error('Failed to join via adapter:', err.message);
    process.exit(1);
  }

  banner(name, session.playerId);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) return rl.prompt();

    if (input === 'quit' || input === 'exit') {
      console.log('link closed');
      process.exit(0);
    }

    if (input === 'help') {
      console.log('Commands:');
      console.log('  look / where     - show position (stub)');
      console.log('  m|move <dir>     - move in a direction (stub)');
      console.log('  quit / exit      - disconnect');
      return rl.prompt();
    }

    try {
      const res = await sendCommand(session, input);
      if (res.output) {
        console.log(res.output);
      } else {
        console.log(JSON.stringify(res, null, 2));
      }
    } catch (err) {
      console.error('command failed:', err.response?.data || err.message);
    }

    rl.prompt();
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

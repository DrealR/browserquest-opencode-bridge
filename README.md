# browserquest-opencode-bridge

Bridge to play [BrowserQuest](https://github.com/mozilla/BrowserQuest) using AI CLIs like OpenCode.

This repo provides:

- A small adapter server exposing a clean HTTP/WebSocket API.
- A MUD-style CLI client that talks to the adapter.
- Bot helpers so AI agents (like OpenCode) can control characters.

High-level flow:

1. Run a BrowserQuest server (from the Mozilla repo or a fork).
2. Run this bridge next to it.
3. Connect from:
   - a human terminal, or
   - an AI CLI (OpenCode) using HTTP/WS calls.
4. You appear in the same BrowserQuest world as regular browser players.

Implementation is in progress.

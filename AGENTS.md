# AGENTS.md

## Cursor Cloud specific instructions

This is a **single-file static web application** (`index.html`, ~482KB). There is no build step, no package manager, no backend, and no database.

### Running the application

Serve `index.html` with any static HTTP server:

```bash
python3 -m http.server 3000
# Open http://localhost:3000
```

The app loads 31 live data sources from external APIs on page load (takes ~8-15 seconds). Core functionality works with no API keys — all keys are optional and entered via the browser UI.

### Linting / Testing / Building

There is no linter, test framework, or build system configured. The entire application is vanilla HTML/CSS/JS in a single file. Code quality checks would need to be done manually or by reading the file directly.

### Key caveats

- The 3D visualization (Three.js r128) loads from CDN — internet connectivity is required.
- Some data sources (Yahoo Finance, CBOE, TMDb) use the `api.allorigins.win` CORS proxy.
- The Anthropic API key (for AI deliberation) is entered in the bottom input bar of the UI and stored in `localStorage`.
- The `SIMULATE` button requires an Anthropic API key to run a full 4-phase deliberation. Without it, the button is still clickable but the AI deliberation phases will not execute.
- Deployment configuration is in `vercel.json` (static serving with CORS/CSP headers).

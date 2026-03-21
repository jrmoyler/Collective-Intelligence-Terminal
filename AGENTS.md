# AGENTS.md

## Cursor Cloud specific instructions

This is a single-file static web application (`index.html`, ~450KB). There is no build step, no package manager, no backend server, and no database.

### Running the application

Serve with any static HTTP server:

```bash
python3 -m http.server 3000
```

Then open `http://localhost:3000` in Chrome. The app takes 8-15 seconds to connect to its 31 live data sources on initial load.

### Key caveats

- **No dependencies to install.** There is no `package.json`, `requirements.txt`, or similar. The update script is a no-op echo.
- **No lint, test, or build commands.** The repo has no automated tests, no linter config, and no build pipeline. Code quality checks are manual.
- **All external API keys are optional.** Core functionality (3D visualization, domain tabs, agent panels, data ticker) works without any keys. Keys are entered in the browser UI via the MARKET button and stored in `localStorage`.
- **CORS proxy dependency.** Some data sources (Yahoo Finance, CBOE, TMDb) use `api.allorigins.win` as a CORS proxy. If this service is down, those specific feeds will show `—` but the app still works.
- **Vercel deployment config** is in `vercel.json` — only relevant for production deploys, not local development.
- **AI deliberation** requires an Anthropic API key entered in the bottom input bar of the terminal UI. Without it, the SIMULATE button will not produce deliberation results.

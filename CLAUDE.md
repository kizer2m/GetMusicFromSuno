# CLAUDE.md — Get Music

## Project Overview
**Get Music** is a Suno AI music generator with a premium graphical interface.
It connects to the Suno API via [kie.ai](https://api.kie.ai) to generate music from text prompts.

## Version
**1.0.0**

## Tech Stack
- **Backend:** Node.js + Express.js
- **Frontend:** Vanilla HTML/CSS/JS
- **API:** Suno via kie.ai proxy (`https://api.kie.ai/api/v1`)
- **Font:** Inter (Google Fonts)

## Architecture
```
Get Music/
  .env                 # API key + config (not committed)
  .gitignore
  package.json
  server.js            # Express backend — proxies API calls
  public/
    index.html          # SPA entry point
    style.css           # Premium dark theme design system
    app.js              # Frontend logic (generation, playlist, player)
  CLAUDE.md             # This file
  GEMINI.md             # AI assistant guidelines
  README.md             # User documentation
```

## Key API Endpoints (backend)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/generate` | POST | Queue a music generation task |
| `/api/status/:taskId` | GET | Poll generation status |
| `/api/balance` | GET | Check API credit balance |
| `/api/proxy-audio` | GET | Proxy remote audio to avoid CORS |

## Suno API (kie.ai) Integration
- **Generate:** `POST /api/v1/generate` — returns `taskId`
- **Poll:** `GET /api/v1/generate/record-info?taskId=` — returns status + `sunoData[]`
- **Statuses:** `PENDING`, `SUCCESS`, `FIRST_SUCCESS`, `CREATE_TASK_FAILED`, `GENERATE_AUDIO_FAILED`, `SENSITIVE_WORD_ERROR`
- **Auth:** Bearer token via `Authorization` header

## Conventions
- Semantic versioning (x.y.z)
- All API keys in `.env`, never committed
- CSS custom properties for theming
- IIFE pattern for frontend JS (no global pollution)

## Commands
```bash
npm install     # Install dependencies
npm run dev     # Start dev server (port 3000)
npm start       # Same as dev
```

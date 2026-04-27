# Get Music

> AI-powered music generator with a premium interface, built on the Suno API.

## Version

**1.0.0**

## Features

- **Text Prompt Generation** — Describe the music you want, and AI creates it
- **Batch Generation** — Generate multiple songs from one prompt
- **Real-time Progress** — Live progress bar and status updates
- **Built-in Playlist** — All generated tracks appear in a sleek playlist
- **Mini Player** — Play, pause, skip, and seek through generated tracks
- **Volume Control** — Toggle mute/unmute with one click
- **API Balance** — Monitor your remaining credits in the header

## Quick Start

1. Clone the repository
2. Create a `.env` file with your API key:
   ```
   SUNO_API_KEY=your_api_key_here
   SUNO_API_BASE=https://api.kie.ai/api/v1
   PORT=3000
   ```
3. Install dependencies and run:
   ```bash
   npm install
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000)

## Controls

| Element | Action |
|---------|--------|
| Prompt textarea | Describe the music you want |
| Song count | Set how many songs to generate (1-20) |
| Generate button | Start the generation process |
| Reset button | Clear prompt, playlist, and all counters |
| Double-click track | Play selected track |
| Play/Pause | Toggle playback |
| Prev/Next | Switch between tracks |
| Volume icon | Mute/unmute audio |

## Tech Stack

- Node.js + Express.js (backend)
- Vanilla HTML/CSS/JS (frontend)
- Suno API via kie.ai

## License

MIT

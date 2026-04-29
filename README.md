# Get Music From Suno

> AI-powered music generator with a premium interface, built on the Suno API.

## Version

**1.5.0**

## Features

- **Text Prompt Generation** — Describe the music you want, and AI creates it
- **Batch Generation** — Generate multiple songs from one prompt
- **Real-time Progress** — Live progress bar and status updates
- **Built-in Playlist** — All generated tracks appear in a sleek playlist
- **Format Selector** — Choose WAV (lossless) or MP3 (compressed) download format
- **WAV Conversion** — Automatic WAV conversion via Suno API pipeline
- **Dynamic Format Badge** — Shows WAV or MP3 in player and playlist per track
- **Mini Player** — Play, pause, skip, rewind/forward 10s, and seek through tracks
- **Interactive Seek Bar** — Full-width seek bar with mouse drag support
- **Volume Control** — Toggle mute/unmute with one click
- **Auto-Save** — Tracks automatically download to `done/` folder as `TrackName_V1.wav`, `TrackName_V2.wav`
- **Versioned Filenames** — Multi-version tracks saved with V1, V2, V3... suffixes
- **API Balance** — Monitor your remaining credits in the header
- **Styled Console** — Beautiful server logs with colors, icons, and progress indicators
- **Dark/Light Theme** — Toggle between dark and light themes (persisted in browser)

## Prerequisites

- **[Node.js](https://nodejs.org/)** v18 or higher (includes npm)

## Quick Start

1. Clone the repository
2. Create a `.env` file with your API key:
   ```
   SUNO_API_KEY=your_api_key_here
   SUNO_API_BASE=https://api.sunoapi.org/api/v1
   PORT=3000
   ```
3. Install dependencies and run:
   ```bash
   npm install
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000)

## Start Scripts

The project includes ready-to-use start scripts that automatically:
- ✅ Check Node.js and npm are installed
- ✅ Verify all npm dependencies are present
- ✅ Create the `done/` folder for saved tracks
- ✅ Check for `.env` file and create a template if missing
- ✅ Validate that `SUNO_API_KEY` is set (not a placeholder)
- ✅ Install missing packages automatically
- ✅ Kill existing processes on port 3000
- ✅ Start the server and open the browser

### Windows
```cmd
start.bat
```
Double-click `start.bat` or run from Command Prompt.

### macOS / Linux
```bash
chmod +x start.sh
./start.sh
```

## .env Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SUNO_API_KEY` | ✅ Yes | — | Your API key from [sunoapi.org](https://sunoapi.org) |
| `SUNO_API_BASE` | No | `https://api.sunoapi.org/api/v1` | API base URL |
| `PORT` | No | `3000` | Local server port |

## Controls

| Element | Action |
|---------|--------|
| Prompt textarea | Describe the music you want |
| Song count | Set how many songs to generate (1-20) |
| Model selector | Choose Suno model version |
| Format selector | Choose WAV or MP3 download format |
| Generate button | Start the generation process |
| Reset button | Clear prompt, playlist, and all counters |
| Double-click track | Play selected track |
| Play/Pause | Toggle playback |
| Prev/Next | Switch between tracks |
| Rewind/Forward | Skip ±10 seconds |
| Seek bar | Click or drag to jump to any position |
| Volume icon | Mute/unmute audio |

## Changelog

### v1.5.0
- Dark/Light theme toggle with sun/moon icon button
- Theme persists across sessions (localStorage)
- Dynamic version display from package.json
- Fixed version mismatch in UI
- Smooth CSS transitions on theme switch

### v1.4.0
- Versioned filenames: tracks saved as `TrackName_V1.wav`, `TrackName_V2.wav`
- Fixed WAV pipeline: correct polling (wait for full SUCCESS before WAV conversion)
- Fixed infinite polling bug (variable scoping in FIRST_SUCCESS handler)
- Added retry logic for WAV conversion (3 attempts with exponential backoff)
- Start scripts kill existing port 3000 process before starting
- Removed accidental `]` file artifact

### v1.3.0
- Fixed WAV conversion pipeline (correct API field mapping)
- Styled server console with ANSI colors and icons
- Start scripts now verify all dependencies
- Added CLAUDE.md/GEMINI.md to .gitignore

### v1.2.1
- Fixed format badge logic in playlist and player
- Cross-platform start scripts

### v1.2.0
- WAV/MP3 format selector
- Dynamic format badges

## Tech Stack

- Node.js + Express.js (backend)
- Vanilla HTML/CSS/JS (frontend)
- Suno API via sunoapi.org

## License

MIT

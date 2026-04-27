/**
 * Get Music - Suno AI Music Generator
 * Backend server (Express.js)
 * Version: 1.1.0
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.SUNO_API_KEY;
const API_BASE = process.env.SUNO_API_BASE || 'https://api.sunoapi.org/api/v1';
const DONE_DIR = path.join(__dirname, 'done');

// Ensure done/ exists
if (!fs.existsSync(DONE_DIR)) {
  fs.mkdirSync(DONE_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Utility ----------
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };
  console.log(`[API Request] ${options.method || 'GET'} ${url}`);
  if (options.body) console.log(`[API Body] ${options.body}`);
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  console.log(`[API Response] Status: ${res.status} | Body: ${text.slice(0, 500)}`);
  try {
    return JSON.parse(text);
  } catch {
    return { code: res.status, msg: text };
  }
}

/**
 * Sanitize a string for use as a filename.
 * Removes illegal characters and trims to a reasonable length.
 */
function sanitizeFilename(name) {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'untitled';
}

// ---------- Routes ----------

// Generate music
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, customMode, instrumental, model, title, style } = req.body;
    const payload = {
      prompt: prompt || '',
      customMode: customMode || false,
      instrumental: instrumental || false,
      model: model || 'V5_5',
      callBackUrl: 'https://example.com/callback',
    };
    if (title) payload.title = title;
    if (style) payload.style = style;

    const result = await apiFetch('/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (result.code === 200) {
      return res.json({ success: true, taskId: result.data.taskId });
    }
    return res.status(400).json({ success: false, error: result.msg || 'Generation failed' });
  } catch (err) {
    console.error('[Generate Error]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Check task status
app.get('/api/status/:taskId', async (req, res) => {
  try {
    const result = await apiFetch(`/generate/record-info?taskId=${req.params.taskId}`, {
      method: 'GET',
    });

    if (result.code === 200) {
      return res.json({ success: true, data: result.data });
    }
    return res.status(400).json({ success: false, error: result.msg || 'Status check failed' });
  } catch (err) {
    console.error('[Status Error]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Initiate WAV conversion for a completed audio
app.post('/api/wav/generate', async (req, res) => {
  try {
    const { taskId, audioId } = req.body;
    if (!taskId && !audioId) {
      return res.status(400).json({ success: false, error: 'Missing taskId or audioId' });
    }

    const payload = { callBackUrl: 'https://example.com/callback' };
    if (taskId) payload.taskId = taskId;
    if (audioId) payload.audioId = audioId;

    const result = await apiFetch('/wav/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (result.code === 200) {
      return res.json({ success: true, wavTaskId: result.data?.taskId || result.data });
    }
    return res.status(400).json({ success: false, error: result.msg || 'WAV generation failed' });
  } catch (err) {
    console.error('[WAV Generate Error]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Check WAV conversion status
app.get('/api/wav/status/:taskId', async (req, res) => {
  try {
    const result = await apiFetch(`/wav/record-info?taskId=${req.params.taskId}`, {
      method: 'GET',
    });

    if (result.code === 200) {
      return res.json({ success: true, data: result.data });
    }
    return res.status(400).json({ success: false, error: result.msg || 'WAV status check failed' });
  } catch (err) {
    console.error('[WAV Status Error]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Get account balance / credits
app.get('/api/balance', async (req, res) => {
  try {
    const result = await apiFetch('/generate/credit', { method: 'GET' });
    if (result.code === 200) {
      return res.json({ success: true, data: result.data });
    }
    // Fallback: return whatever we got
    return res.json({ success: true, data: result.data || result, raw: true });
  } catch (err) {
    console.error('[Balance Error]', err.message);
    return res.json({ success: false, data: { credits: 'N/A' }, error: err.message });
  }
});

// Download / proxy audio to avoid CORS
app.get('/api/proxy-audio', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).send('Missing url parameter');

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Upstream ${response.status}`);

    // Detect content type — prefer WAV when applicable
    const upstreamType = response.headers.get('content-type') || '';
    const isWav = url.includes('.wav') || upstreamType.includes('wav');
    res.setHeader('Content-Type', isWav ? 'audio/wav' : (upstreamType || 'audio/mpeg'));
    res.setHeader('Accept-Ranges', 'bytes');

    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error('[Proxy Error]', err.message);
    res.status(500).send('Proxy error');
  }
});

// Save track to done/ folder
app.post('/api/save-track', async (req, res) => {
  try {
    const { url, title, id } = req.body;
    if (!url) return res.status(400).json({ success: false, error: 'Missing url' });

    const safeName = sanitizeFilename(title || 'track');
    const shortId = (id || '').slice(0, 8);
    const isWav = url.includes('.wav');
    const ext = isWav ? '.wav' : '.mp3';
    const filename = `${safeName}_${shortId}${ext}`;
    const filepath = path.join(DONE_DIR, filename);

    // Check if already saved
    if (fs.existsSync(filepath)) {
      console.log(`[Save] Already exists: ${filename}`);
      return res.json({ success: true, filename, alreadyExists: true });
    }

    console.log(`[Save] Downloading: ${url.slice(0, 80)}...`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);

    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(filepath, Buffer.from(arrayBuffer));

    const sizeMB = (arrayBuffer.byteLength / (1024 * 1024)).toFixed(2);
    console.log(`[Save] ✅ Saved: ${filename} (${sizeMB} MB)`);

    return res.json({ success: true, filename, sizeMB });
  } catch (err) {
    console.error('[Save Error]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// List saved tracks in done/ folder
app.get('/api/saved-tracks', (req, res) => {
  try {
    const files = fs.readdirSync(DONE_DIR)
      .filter(f => f.endsWith('.wav') || f.endsWith('.mp3'))
      .map(f => ({
        filename: f,
        size: fs.statSync(path.join(DONE_DIR, f)).size,
        modified: fs.statSync(path.join(DONE_DIR, f)).mtime,
      }));
    return res.json({ success: true, files });
  } catch (err) {
    return res.json({ success: true, files: [] });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[Get Music] Server running at http://localhost:${PORT}`);
  console.log(`[Get Music] API Base: ${API_BASE}`);
  console.log(`[Get Music] API Key: ${API_KEY ? API_KEY.slice(0, 6) + '...' : 'NOT SET'}`);
  console.log(`[Get Music] Tracks folder: ${DONE_DIR}`);
});

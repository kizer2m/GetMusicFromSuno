/**
 * Get Music From Suno — AI Music Generator
 * Backend server (Express.js)
 * Version: 1.3.0
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

// ========== Console Styling ==========
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
};

function log(icon, label, msg, color = C.white) {
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
  console.log(`${C.dim}${timestamp}${C.reset} ${icon}  ${C.bold}${color}${label}${C.reset} ${msg}`);
}

function logSuccess(label, msg) { log('✅', label, msg, C.green); }
function logInfo(label, msg) { log('ℹ️', label, msg, C.cyan); }
function logWarn(label, msg) { log('⚠️', label, msg, C.yellow); }
function logError(label, msg) { log('❌', label, msg, C.red); }
function logStep(label, msg) { log('🔄', label, msg, C.blue); }
function logSave(label, msg) { log('💾', label, msg, C.magenta); }
function logMusic(label, msg) { log('🎵', label, msg, C.cyan); }

function drawBox(lines) {
  const maxLen = Math.max(...lines.map(l => l.replace(/\x1b\[[0-9;]*m/g, '').length));
  const border = '═'.repeat(maxLen + 2);
  console.log(`\n${C.cyan}╔${border}╗${C.reset}`);
  lines.forEach(line => {
    const cleanLen = line.replace(/\x1b\[[0-9;]*m/g, '').length;
    const padding = ' '.repeat(maxLen - cleanLen);
    console.log(`${C.cyan}║${C.reset} ${line}${padding} ${C.cyan}║${C.reset}`);
  });
  console.log(`${C.cyan}╚${border}╝${C.reset}\n`);
}

// ========== API Utility ==========
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  logStep('API', `${options.method || 'GET'} ${url.replace(API_BASE, '')}`);

  const res = await fetch(url, { ...options, headers });
  const body = await res.json();

  if (body.code !== 200) {
    logWarn('API', `Response code ${body.code}: ${body.msg || 'unknown'}`);
  }

  return body;
}

function sanitizeFilename(name) {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100);
}

// ========== Routes ==========

// Generate music
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, customMode, instrumental, model, title, style } = req.body;

    logMusic('Generate', `Model: ${C.bold}${model || 'V5_5'}${C.reset} | Prompt: "${(prompt || '').slice(0, 50)}..."`);

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
      logSuccess('Generate', `Task created: ${C.bold}${result.data.taskId}${C.reset}`);
      return res.json({ success: true, taskId: result.data.taskId });
    }
    logError('Generate', result.msg || 'Generation failed');
    return res.status(400).json({ success: false, error: result.msg || 'Generation failed' });
  } catch (err) {
    logError('Generate', err.message);
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
      const sunoData = result.data?.response?.sunoData;
      if (sunoData && sunoData.length > 0) {
        const statusFlag = result.data?.status || result.data?.successFlag;
        if (statusFlag === 'SUCCESS' || statusFlag === 'FIRST_SUCCESS') {
          logSuccess('Status', `Task ${req.params.taskId.slice(0, 12)}... → ${C.bold}${statusFlag}${C.reset} (${sunoData.length} track${sunoData.length > 1 ? 's' : ''})`);
          sunoData.forEach((t, i) => {
            logMusic('Track', `#${i + 1} "${t.title || 'untitled'}" | ID: ${(t.id || '').slice(0, 8)}`);
          });
        }
      }
      return res.json({ success: true, data: result.data });
    }
    return res.status(400).json({ success: false, error: result.msg || 'Status check failed' });
  } catch (err) {
    logError('Status', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Initiate WAV conversion
app.post('/api/wav/generate', async (req, res) => {
  try {
    const { audioId } = req.body;
    if (!audioId) {
      return res.status(400).json({ success: false, error: 'Missing audioId' });
    }

    const payload = {
      audioId,
      callBackUrl: 'https://example.com/callback',
    };

    logStep('WAV', `Converting to WAV: audioId=${audioId.slice(0, 16)}...`);

    const result = await apiFetch('/wav/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (result.code === 200) {
      const wavTaskId = result.data?.taskId || result.data;
      logSuccess('WAV', `Conversion started, wavTaskId: ${C.bold}${wavTaskId}${C.reset}`);
      return res.json({ success: true, wavTaskId });
    }

    logWarn('WAV', `Code ${result.code}: ${result.msg || 'WAV generation failed'}`);
    return res.status(400).json({ success: false, error: result.msg || 'WAV generation failed', code: result.code });
  } catch (err) {
    logError('WAV', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Check WAV conversion status
app.get('/api/wav/status/:taskId', async (req, res) => {
  try {
    const result = await apiFetch(`/wav/record-info?taskId=${req.params.taskId}`, {
      method: 'GET',
    });

    if (result.code === 200 && result.data) {
      const flag = result.data.successFlag || result.data.status;
      const wavUrl = result.data.response?.audioWavUrl;

      if (flag === 'SUCCESS' && wavUrl) {
        logSuccess('WAV', `Conversion complete! URL: ${wavUrl.slice(0, 60)}...`);
      } else if (flag === 'PENDING') {
        logStep('WAV', `Still converting... (${req.params.taskId.slice(0, 12)})`);
      } else {
        logWarn('WAV', `Flag: ${flag}`);
      }

      return res.json({ success: true, data: result.data });
    }
    return res.status(400).json({ success: false, error: result.msg || 'WAV status check failed' });
  } catch (err) {
    logError('WAV Status', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Get account balance / credits
app.get('/api/balance', async (req, res) => {
  try {
    const result = await apiFetch('/generate/credit', { method: 'GET' });
    if (result.code === 200) {
      logInfo('Balance', `Credits: ${C.bold}${result.data}${C.reset}`);
      return res.json({ success: true, data: result.data });
    }
    return res.json({ success: true, data: result.data || result, raw: true });
  } catch (err) {
    logError('Balance', err.message);
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
    logError('Proxy', err.message);
    res.status(500).send('Proxy error');
  }
});

// Save track to done/ folder
app.post('/api/save-track', async (req, res) => {
  try {
    const { url, title, id, format } = req.body;
    if (!url) return res.status(400).json({ success: false, error: 'Missing url' });

    const safeName = sanitizeFilename(title || 'track');
    const shortId = (id || '').slice(0, 8);
    const ext = (format === 'wav' || url.includes('.wav')) ? '.wav' : '.mp3';
    const filename = `${safeName}_${shortId}${ext}`;
    const filepath = path.join(DONE_DIR, filename);

    // Check if already saved
    if (fs.existsSync(filepath)) {
      logInfo('Save', `Already exists: ${filename}`);
      return res.json({ success: true, filename, alreadyExists: true });
    }

    logSave('Save', `Downloading ${C.bold}${ext.toUpperCase()}${C.reset}: ${url.slice(0, 60)}...`);

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);

    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(filepath, Buffer.from(arrayBuffer));

    const sizeMB = (arrayBuffer.byteLength / (1024 * 1024)).toFixed(2);
    logSuccess('Save', `${C.bold}${filename}${C.reset} (${sizeMB} MB)`);

    return res.json({ success: true, filename, sizeMB });
  } catch (err) {
    logError('Save', err.message);
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
  drawBox([
    `${C.bold}${C.cyan}🎵 Get Music From Suno v1.3.0${C.reset}`,
    ``,
    `${C.green}Server${C.reset}     http://localhost:${PORT}`,
    `${C.blue}API Base${C.reset}   ${API_BASE}`,
    `${C.yellow}API Key${C.reset}    ${API_KEY ? API_KEY.slice(0, 6) + '••••••' : `${C.red}NOT SET!${C.reset}`}`,
    `${C.magenta}Tracks${C.reset}     ${DONE_DIR}`,
    ``,
    `${C.dim}Ready for music generation...${C.reset}`,
  ]);
});

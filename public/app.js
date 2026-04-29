/**
 * Get Music — Frontend Application Logic
 * Version: 1.1.0
 *
 * Handles: Suno API generation, polling, playlist management,
 *          audio playback (mini-player), auto-save to done/, and UI state.
 */

(function () {
  'use strict';

  // ========== STATE ==========
  const state = {
    tracks: [],           // { id, taskId, title, prompt, status, audioUrl, imageUrl, lyrics, saved, format }
    currentIndex: -1,     // index in tracks[]
    isPlaying: false,
    isMuted: false,
    isGenerating: false,
    completed: 0,
    total: 0,
    activeTasks: [],      // taskIds being polled
  };

  const audio = new Audio();
  audio.volume = 1;
  audio.preload = 'auto';

  // ========== DOM REFS ==========
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const DOM = {
    // Controls
    promptInput: $('#prompt-input'),
    songCount: $('#song-count'),
    countMinus: $('#count-minus'),
    countPlus: $('#count-plus'),
    btnGenerate: $('#btn-generate'),
    btnReset: $('#btn-reset'),
    modelSelect: $('#model-select'),
    formatSelect: $('#format-select'),
    // Progress
    progressCounter: $('#progress-counter'),
    progressBarFill: $('#progress-bar-fill'),
    progressStatus: $('#progress-status'),
    // Playlist
    playlistContainer: $('#playlist-container'),
    playlistEmpty: $('#playlist-empty'),
    playlistList: $('#playlist-list'),
    trackCount: $('#track-count'),
    // Player
    btnPrev: $('#btn-prev'),
    btnPlay: $('#btn-play'),
    btnNext: $('#btn-next'),
    btnRewind: $('#btn-rewind'),
    btnForward: $('#btn-forward'),
    btnVolume: $('#btn-volume'),
    iconPlay: $('#icon-play'),
    iconPause: $('#icon-pause'),
    iconVolumeOn: $('#icon-volume-on'),
    iconVolumeOff: $('#icon-volume-off'),
    playerTitle: $('#player-title'),
    playerSubtitle: $('#player-subtitle'),
    playerArt: $('#player-art'),
    playerCurrentTime: $('#player-current-time'),
    playerDuration: $('#player-duration'),
    formatBadge: $('#player-format-badge'),
    // Custom seek bar
    seekContainer: $('#seek-bar-container'),
    seekTrack: $('#seek-bar-track'),
    seekFill: $('#seek-bar-fill'),
    seekThumb: $('#seek-bar-thumb'),
    // Balance
    balanceValue: $('#balance-value'),
  };

  // Seek drag state
  let isSeeking = false;

  // ========== INIT ==========
  function init() {
    bindEvents();
    fetchBalance();
    updateProgressUI();
  }

  // ========== EVENTS ==========
  function bindEvents() {
    // Count +/-
    DOM.countMinus.addEventListener('click', () => {
      const v = parseInt(DOM.songCount.value, 10);
      if (v > 1) DOM.songCount.value = v - 1;
    });
    DOM.countPlus.addEventListener('click', () => {
      const v = parseInt(DOM.songCount.value, 10);
      if (v < 20) DOM.songCount.value = v + 1;
    });

    // Generate
    DOM.btnGenerate.addEventListener('click', startGeneration);

    // Reset
    DOM.btnReset.addEventListener('click', resetAll);

    // Player
    DOM.btnPlay.addEventListener('click', togglePlay);
    DOM.btnPrev.addEventListener('click', prevTrack);
    DOM.btnNext.addEventListener('click', nextTrack);
    DOM.btnVolume.addEventListener('click', toggleMute);

    // Rewind / Forward 10s
    DOM.btnRewind.addEventListener('click', () => {
      if (audio.duration) audio.currentTime = Math.max(0, audio.currentTime - 10);
    });
    DOM.btnForward.addEventListener('click', () => {
      if (audio.duration) audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
    });

    // Custom seek bar — mouse drag
    DOM.seekContainer.addEventListener('mousedown', onSeekStart);
    document.addEventListener('mousemove', onSeekMove);
    document.addEventListener('mouseup', onSeekEnd);

    // Audio events
    audio.addEventListener('timeupdate', updateSeek);
    audio.addEventListener('loadedmetadata', () => {
      DOM.playerDuration.textContent = formatTime(audio.duration);
    });
    audio.addEventListener('ended', () => {
      nextTrack();
    });
  }

  // ========== SEEK BAR DRAG ==========
  function getSeekPercent(e) {
    const rect = DOM.seekTrack.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    return x / rect.width;
  }

  function onSeekStart(e) {
    if (!audio.duration) return;
    isSeeking = true;
    DOM.seekContainer.classList.add('dragging');
    const pct = getSeekPercent(e);
    audio.currentTime = pct * audio.duration;
    setSeekPosition(pct * 100);
  }

  function onSeekMove(e) {
    if (!isSeeking || !audio.duration) return;
    const pct = getSeekPercent(e);
    audio.currentTime = pct * audio.duration;
    setSeekPosition(pct * 100);
  }

  function onSeekEnd() {
    if (!isSeeking) return;
    isSeeking = false;
    DOM.seekContainer.classList.remove('dragging');
  }

  function setSeekPosition(pct) {
    DOM.seekFill.style.width = pct + '%';
    DOM.seekThumb.style.left = pct + '%';
    DOM.playerCurrentTime.textContent = formatTime(audio.currentTime);
  }

  // ========== BALANCE ==========
  async function fetchBalance() {
    try {
      const res = await fetch('/api/balance');
      const json = await res.json();
      if (json.success && json.data !== undefined && json.data !== null) {
        // sunoapi.org returns credits as a raw number in data
        const credits = typeof json.data === 'number' ? json.data : (json.data.credits ?? 'N/A');
        DOM.balanceValue.textContent = credits !== 'N/A' ? `${credits} credits` : 'N/A';
      } else {
        DOM.balanceValue.textContent = 'N/A';
      }
    } catch {
      DOM.balanceValue.textContent = 'Offline';
    }
  }

  // ========== GENERATION ==========
  async function startGeneration() {
    const prompt = DOM.promptInput.value.trim();
    if (!prompt) {
      DOM.promptInput.focus();
      DOM.promptInput.classList.add('shake');
      setTimeout(() => DOM.promptInput.classList.remove('shake'), 500);
      return;
    }

    const count = Math.max(1, Math.min(20, parseInt(DOM.songCount.value, 10) || 1));
    state.isGenerating = true;
    state.completed = 0;
    state.total = count;
    state.activeTasks = [];

    DOM.btnGenerate.disabled = true;
    updateProgressUI();
    setStatus('Starting generation...');

    for (let i = 0; i < count; i++) {
      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, model: DOM.modelSelect.value }),
        });
        const json = await res.json();

        if (json.success && json.taskId) {
          const track = {
            id: Date.now() + '_' + i,
            taskId: json.taskId,
            title: `Song #${state.tracks.length + 1}`,
            prompt,
            status: 'pending',
            audioUrl: null,
            imageUrl: null,
            lyrics: null,
            saved: false,
            format: DOM.formatSelect.value, // 'wav' or 'mp3'
          };
          state.tracks.push(track);
          state.activeTasks.push(json.taskId);
          addTrackToPlaylist(track, state.tracks.length - 1);
          setStatus(`Queued ${i + 1}/${count}...`);
        } else {
          setStatus(`Error on song ${i + 1}: ${json.error || 'Unknown'}`);
        }
      } catch (err) {
        setStatus(`Network error on song ${i + 1}`);
      }

      // Small delay between requests to avoid rate-limiting
      if (i < count - 1) await delay(1500);
    }

    // Start polling all tasks
    pollAllTasks();
  }

  async function pollAllTasks() {
    setStatus('Generating music...');

    while (state.activeTasks.length > 0) {
      const stillActive = [];

      for (const taskId of state.activeTasks) {
        try {
          const res = await fetch(`/api/status/${taskId}`);
          const json = await res.json();

          if (json.success && json.data) {
            const { status, response } = json.data;
            const trackIdx = state.tracks.findIndex(t => t.taskId === taskId);
            if (trackIdx === -1) continue;

            if (status === 'SUCCESS' || status === 'FIRST_SUCCESS') {
              const sunoData = response?.sunoData;
              if (sunoData && sunoData.length > 0) {
                const first = sunoData[0];
                // Log all available fields to debug WAV URL availability
                console.log(`[Poll] sunoData[0] keys:`, Object.keys(first));
                console.log(`[Poll] audioUrl: ${first.audioUrl?.slice(0, 80)}`);
                if (first.wavAudioUrl) console.log(`[Poll] wavAudioUrl: ${first.wavAudioUrl.slice(0, 80)}`);
                state.tracks[trackIdx].status = 'success';
                state.tracks[trackIdx].audioUrl = first.audioUrl || first.streamAudioUrl;
                state.tracks[trackIdx].imageUrl = first.imageUrl || first.sourceImageUrl;
                state.tracks[trackIdx].title = first.title || state.tracks[trackIdx].title;
                state.tracks[trackIdx].lyrics = first.prompt || first.lyric;
                state.tracks[trackIdx].id = first.id || state.tracks[trackIdx].id;

                // Request WAV conversion if format is wav, otherwise save MP3 directly
                if (state.tracks[trackIdx].format === 'wav') {
                  // Delay WAV request — API needs time after generation
                  setTimeout(() => requestWavConversion(trackIdx, taskId), 5000);
                } else {
                  autoSaveTrack(trackIdx);
                }

                // Add additional tracks from the same task (Suno generates 2 per task)
                for (let si = 1; si < sunoData.length; si++) {
                  const extra = sunoData[si];
                  const extraTrack = {
                    id: extra.id || (Date.now() + '_extra_' + si),
                    taskId: taskId + '_sub_' + si,
                    title: extra.title || `Song #${state.tracks.length + 1}`,
                    prompt: extra.prompt || state.tracks[trackIdx].prompt,
                    status: (extra.audioUrl || extra.streamAudioUrl) ? 'success' : 'generating',
                    audioUrl: extra.audioUrl || extra.streamAudioUrl,
                    imageUrl: extra.imageUrl || extra.sourceImageUrl,
                    lyrics: extra.prompt || extra.lyric,
                    saved: false,
                    format: state.tracks[trackIdx].format, // inherit format from parent
                  };
                  // Only add if not already present
                  if (!state.tracks.find(t => t.id === extraTrack.id)) {
                    state.tracks.push(extraTrack);
                    const newIdx = state.tracks.length - 1;
                    addTrackToPlaylist(extraTrack, newIdx);
                    // Request WAV for extra tracks too (if format is wav)
                    if (extraTrack.audioUrl) {
                      if (state.tracks[trackIdx].format === 'wav') {
                        const capturedIdx = newIdx;
                        setTimeout(() => requestWavConversion(capturedIdx, taskId), 6000);
                      } else {
                        autoSaveTrack(newIdx);
                      }
                    }
                  }
                }
              } else {
                state.tracks[trackIdx].status = 'success';
              }
              state.completed++;
              updateTrackInPlaylist(trackIdx);
              updateProgressUI();
            } else if (status === 'TEXT_SUCCESS') {
              // Lyrics generated, audio still processing
              const sunoData = response?.sunoData;
              if (sunoData && sunoData.length > 0) {
                const first = sunoData[0];
                state.tracks[trackIdx].title = first.title || state.tracks[trackIdx].title;
                state.tracks[trackIdx].imageUrl = first.imageUrl || first.sourceImageUrl;
                if (first.streamAudioUrl) {
                  state.tracks[trackIdx].audioUrl = first.streamAudioUrl;
                }
              }
              state.tracks[trackIdx].status = 'generating';
              updateTrackInPlaylist(trackIdx);
              stillActive.push(taskId);
            } else if (
              status === 'CREATE_TASK_FAILED' ||
              status === 'GENERATE_AUDIO_FAILED' ||
              status === 'SENSITIVE_WORD_ERROR' ||
              status === 'CALLBACK_EXCEPTION'
            ) {
              state.tracks[trackIdx].status = 'failed';
              state.completed++;
              updateTrackInPlaylist(trackIdx);
              updateProgressUI();
            } else {
              // Still pending / generating
              state.tracks[trackIdx].status = 'generating';
              updateTrackInPlaylist(trackIdx);
              stillActive.push(taskId);
            }
          } else {
            stillActive.push(taskId);
          }
        } catch {
          stillActive.push(taskId);
        }
      }

      state.activeTasks = stillActive;

      if (stillActive.length > 0) {
        await delay(8000); // poll every 8 seconds
      }
    }

    // Done
    state.isGenerating = false;
    DOM.btnGenerate.disabled = false;
    setStatus(`Done! ${state.completed}/${state.total} completed.`);
    fetchBalance(); // refresh credits
  }

  // ========== AUTO-SAVE ==========
  async function autoSaveTrack(index) {
    const track = state.tracks[index];
    if (!track || !track.audioUrl || track.saved) return;

    // Determine actual format for saving
    const saveFormat = track.wavReady ? 'wav' : (track.format || 'mp3');

    try {
      const res = await fetch('/api/save-track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: track.audioUrl,
          title: track.title,
          id: track.id,
          format: saveFormat,
        }),
      });
      const json = await res.json();

      if (json.success) {
        track.saved = true;
        track.savedFilename = json.filename;
        updateTrackInPlaylist(index);
        console.log(`[Auto-Save] ✅ ${json.filename} (${json.sizeMB || '?'} MB) [${saveFormat.toUpperCase()}]`);
      }
    } catch (err) {
      console.error(`[Auto-Save] Failed for ${track.title}:`, err);
    }
  }

  // ========== RESET ==========
  function resetAll() {
    // Stop audio
    audio.pause();
    audio.src = '';
    state.isPlaying = false;
    updatePlayPauseIcon();

    // Clear state
    state.tracks = [];
    state.currentIndex = -1;
    state.completed = 0;
    state.total = 0;
    state.activeTasks = [];
    state.isGenerating = false;

    // Clear UI
    DOM.promptInput.value = '';
    DOM.songCount.value = '1';
    DOM.modelSelect.value = 'V5_5';
    DOM.formatSelect.value = 'wav';
    DOM.playlistList.innerHTML = '';
    DOM.playlistEmpty.classList.remove('hidden');
    DOM.trackCount.textContent = '0 tracks';
    DOM.btnGenerate.disabled = false;

    // Reset player
    DOM.playerTitle.textContent = 'No track selected';
    DOM.playerSubtitle.textContent = 'Get Music From Suno';
    DOM.playerCurrentTime.textContent = '0:00';
    DOM.playerDuration.textContent = '0:00';
    setSeekPosition(0);
    DOM.playerArt.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/>
        <circle cx="18" cy="16" r="3"/>
      </svg>`;

    updateProgressUI();
    setStatus('Ready');
  }

  // ========== PLAYLIST UI ==========
  function addTrackToPlaylist(track, index) {
    DOM.playlistEmpty.classList.add('hidden');

    const li = document.createElement('li');
    li.className = 'playlist-item animate-in';
    li.dataset.index = index;
    li.innerHTML = buildTrackHTML(track, index);

    li.addEventListener('dblclick', () => playTrackAt(index));

    DOM.playlistList.appendChild(li);
    DOM.trackCount.textContent = `${state.tracks.length} track${state.tracks.length !== 1 ? 's' : ''}`;
  }

  function updateTrackInPlaylist(index) {
    const li = DOM.playlistList.querySelector(`[data-index="${index}"]`);
    if (!li) return;
    const track = state.tracks[index];
    li.innerHTML = buildTrackHTML(track, index);

    // Re-attach dblclick
    li.addEventListener('dblclick', () => playTrackAt(index));
  }

  function buildTrackHTML(track, index) {
    const statusClass = {
      pending: 'status-pending',
      generating: 'status-generating',
      success: 'status-success',
      failed: 'status-failed',
    }[track.status] || 'status-pending';

    const statusLabel = {
      pending: 'Pending',
      generating: 'Generating',
      success: 'Ready',
      failed: 'Failed',
    }[track.status] || 'Unknown';

    const artHTML = track.imageUrl
      ? `<img src="${track.imageUrl}" alt="${track.title}">`
      : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
           <path d="M9 18V5l12-2v13"/>
           <circle cx="6" cy="18" r="3"/>
           <circle cx="18" cy="16" r="3"/>
         </svg>`;

    const savedBadge = track.saved
      ? `<span class="playlist-item-saved" title="Saved to done/">💾</span>`
      : '';

    // Format badge: show format based on track state
    let formatBadgeHTML = '';
    if (track.status === 'success') {
      if (track.wavReady) {
        formatBadgeHTML = `<span class="playlist-item-wav" title="WAV format">WAV</span>`;
      } else if (track.format === 'mp3') {
        formatBadgeHTML = `<span class="playlist-item-wav playlist-item-mp3" title="MP3 format">MP3</span>`;
      } else {
        // WAV selected, conversion in progress — show WAV (will update when done)
        formatBadgeHTML = `<span class="playlist-item-wav" title="WAV format">WAV</span>`;
      }
    }

    return `
      <span class="playlist-item-index">${index + 1}</span>
      <div class="playlist-item-art">${artHTML}</div>
      <div class="playlist-item-info">
        <div class="playlist-item-title">${escapeHTML(track.title)}</div>
        <div class="playlist-item-meta">${escapeHTML(truncate(track.prompt, 40))}</div>
      </div>
      ${formatBadgeHTML}
      ${savedBadge}
      <span class="playlist-item-status ${statusClass}">${statusLabel}</span>
    `;
  }

  function highlightActive(index) {
    DOM.playlistList.querySelectorAll('.playlist-item').forEach(li => li.classList.remove('active'));
    const target = DOM.playlistList.querySelector(`[data-index="${index}"]`);
    if (target) {
      target.classList.add('active');
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // ========== AUDIO PLAYBACK ==========
  function playTrackAt(index) {
    const track = state.tracks[index];
    if (!track || !track.audioUrl) return;

    state.currentIndex = index;
    highlightActive(index);

    // Use proxy to avoid CORS
    audio.src = `/api/proxy-audio?url=${encodeURIComponent(track.audioUrl)}`;
    audio.load();
    audio.play().then(() => {
      state.isPlaying = true;
      updatePlayPauseIcon();
    }).catch(() => {});

    // Update player info
    DOM.playerTitle.textContent = track.title;
    DOM.playerSubtitle.textContent = truncate(track.prompt, 50);

    if (track.imageUrl) {
      DOM.playerArt.innerHTML = `<img src="${track.imageUrl}" alt="${track.title}">`;
    }

    // Update format badge based on actual track format
    const actualFormat = track.wavReady ? 'WAV' : (track.format === 'wav' ? 'WAV' : 'MP3');
    DOM.formatBadge.textContent = actualFormat;
  }

  function togglePlay() {
    if (state.currentIndex === -1) {
      // Try to play first available track
      const firstReady = state.tracks.findIndex(t => t.status === 'success' && t.audioUrl);
      if (firstReady !== -1) {
        playTrackAt(firstReady);
        return;
      }
      return;
    }

    if (state.isPlaying) {
      audio.pause();
      state.isPlaying = false;
      updatePlayPauseIcon();
    } else {
      audio.play().then(() => {
        state.isPlaying = true;
        updatePlayPauseIcon();
      }).catch(() => {});
    }
  }

  function prevTrack() {
    if (state.tracks.length === 0) return;
    let idx = state.currentIndex - 1;
    // Find previous playable
    while (idx >= 0 && (state.tracks[idx].status !== 'success' || !state.tracks[idx].audioUrl)) idx--;
    if (idx < 0) {
      // Wrap to end
      idx = state.tracks.length - 1;
      while (idx >= 0 && (state.tracks[idx].status !== 'success' || !state.tracks[idx].audioUrl)) idx--;
    }
    if (idx >= 0) playTrackAt(idx);
  }

  function nextTrack() {
    if (state.tracks.length === 0) return;
    let idx = state.currentIndex + 1;
    while (idx < state.tracks.length && (state.tracks[idx].status !== 'success' || !state.tracks[idx].audioUrl)) idx++;
    if (idx >= state.tracks.length) {
      // Wrap to start
      idx = 0;
      while (idx < state.tracks.length && (state.tracks[idx].status !== 'success' || !state.tracks[idx].audioUrl)) idx++;
    }
    if (idx < state.tracks.length && idx !== state.currentIndex) playTrackAt(idx);
  }

  function toggleMute() {
    state.isMuted = !state.isMuted;
    audio.muted = state.isMuted;

    DOM.iconVolumeOn.classList.toggle('hidden', state.isMuted);
    DOM.iconVolumeOff.classList.toggle('hidden', !state.isMuted);
    DOM.btnVolume.classList.toggle('muted', state.isMuted);
  }

  function updatePlayPauseIcon() {
    DOM.iconPlay.classList.toggle('hidden', state.isPlaying);
    DOM.iconPause.classList.toggle('hidden', !state.isPlaying);
  }

  function updateSeek() {
    if (!audio.duration || isSeeking) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    setSeekPosition(pct);
  }

  // ========== WAV CONVERSION ==========
  async function requestWavConversion(trackIdx, taskId) {
    const track = state.tracks[trackIdx];
    if (!track) return;

    try {
      const audioId = track.id;
      console.log(`[WAV] Starting conversion for "${track.title}" (audioId: ${audioId}, taskId: ${taskId})`);
      const res = await fetch('/api/wav/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, audioId }),
      });
      const json = await res.json();
      console.log(`[WAV] Generate response:`, json);

      if (json.success && json.wavTaskId) {
        console.log(`[WAV] Conversion started for "${track.title}", wavTaskId: ${json.wavTaskId}`);
        pollWavStatus(trackIdx, json.wavTaskId);
      } else {
        console.warn(`[WAV] Could not start conversion for "${track.title}": ${json.error}`);
        // Fallback: mark as MP3 and save
        markAsMp3Fallback(trackIdx);
      }
    } catch (err) {
      console.error(`[WAV] Request failed for "${track.title}":`, err);
      markAsMp3Fallback(trackIdx);
    }
  }

  async function pollWavStatus(trackIdx, wavTaskId) {
    const maxAttempts = 30; // ~5 minutes
    for (let i = 0; i < maxAttempts; i++) {
      await delay(10000); // poll every 10s

      try {
        const res = await fetch(`/api/wav/status/${wavTaskId}`);
        const json = await res.json();
        // API uses 'successFlag' (not 'status')
        const flag = json.data?.successFlag || json.data?.status;
        console.log(`[WAV] Poll #${i + 1} for track ${trackIdx}: flag=${flag}`);

        if (json.success && json.data) {
          if (flag === 'SUCCESS') {
            // API returns WAV URL as 'audioWavUrl' (per docs)
            const resp = json.data.response || {};
            const wavUrl = resp.audioWavUrl || resp.wavAudioUrl || resp.audioUrl || resp.url;
            if (wavUrl && state.tracks[trackIdx]) {
              console.log(`[WAV] ✅ Ready: "${state.tracks[trackIdx].title}" → ${wavUrl.slice(0, 80)}`);
              state.tracks[trackIdx].audioUrl = wavUrl;
              state.tracks[trackIdx].wavReady = true;
              updateTrackInPlaylist(trackIdx);
              if (state.currentIndex === trackIdx) {
                DOM.formatBadge.textContent = 'WAV';
              }
              autoSaveTrack(trackIdx);
            } else {
              console.warn(`[WAV] SUCCESS but no URL found in response:`, JSON.stringify(resp));
              markAsMp3Fallback(trackIdx);
            }
            return;
          } else if (flag === 'CREATE_TASK_FAILED' || flag === 'GENERATE_WAV_FAILED') {
            console.warn(`[WAV] Conversion failed for track ${trackIdx}, flag: ${flag}`);
            markAsMp3Fallback(trackIdx);
            return;
          }
          // PENDING — continue polling
        }
      } catch (err) {
        console.warn(`[WAV] Poll error for track ${trackIdx}:`, err.message);
      }
    }

    // Timeout — save MP3 fallback
    console.warn(`[WAV] Timeout for track ${trackIdx}, falling back to MP3`);
    markAsMp3Fallback(trackIdx);
  }

  /**
   * When WAV conversion fails, update the track to reflect MP3 format
   * and save the MP3 version.
   */
  function markAsMp3Fallback(trackIdx) {
    const track = state.tracks[trackIdx];
    if (!track) return;
    track.format = 'mp3';
    track.wavReady = false;
    updateTrackInPlaylist(trackIdx);
    // Update player badge if this track is currently playing
    if (state.currentIndex === trackIdx) {
      DOM.formatBadge.textContent = 'MP3';
    }
    autoSaveTrack(trackIdx);
    console.log(`[WAV] Fallback to MP3 for "${track.title}"`);
  }

  // ========== PROGRESS ==========
  function updateProgressUI() {
    DOM.progressCounter.textContent = `${state.completed} / ${state.total}`;
    const pct = state.total > 0 ? (state.completed / state.total) * 100 : 0;
    DOM.progressBarFill.style.width = `${pct}%`;
  }

  function setStatus(msg) {
    DOM.progressStatus.textContent = msg;
  }

  // ========== UTILS ==========
  function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function formatTime(secs) {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.slice(0, len) + '...' : str;
  }

  function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ========== START ==========
  document.addEventListener('DOMContentLoaded', init);
})();

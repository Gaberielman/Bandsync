const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SONGS = {
  'neon-stage': {
    title: 'Neon Stage',
    artist: 'BandSync Ensemble',
    originalKey: 'C',
    sections: {
      Verse: ['Dm7', 'G7', 'Cmaj7', 'Fmaj7'],
      Chorus: ['Dmaj7', 'Gmaj7', 'A7', 'Bm7'],
      Bridge: ['Bm7', 'E7', 'Amaj7', 'Dmaj7']
    }
  },
  'midnight-ride': {
    title: 'Midnight Ride',
    artist: 'Stage Echoes',
    originalKey: 'A',
    sections: {
      Verse: ['Amaj7', 'F#m7', 'Dmaj7', 'E7'],
      Chorus: ['Bmaj7', 'Emaj7', 'F#7', 'G#m7'],
      Bridge: ['G#m7', 'C#7', 'F#maj7', 'Bmaj7']
    }
  }
};

const params = new URLSearchParams(window.location.search);
const roomId = (params.get('room') || '404').trim();
const userName = (params.get('name') || 'Musician').trim();
const userRole = (params.get('role') || 'KEYS').trim().toUpperCase();
const isHost = document.body.dataset.view === 'host';
const backendUrl = (window.BANDSYNC_BACKEND_URL || window.location.origin).replace(/\/$/, '');
const topic = `/topic/room/${roomId}`;
const action = `/app/room/${roomId}/action`;

let stompClient;
let reconnectTimer;
let overlayTimer;
let currentSongId = 'neon-stage';
let currentSectionName = 'Verse';
let currentKey = SONGS[currentSongId].originalKey;
let semitoneOffset = 0;

const $ = (id) => document.getElementById(id);
const els = {
  roomLabel: $('roomLabel'),
  playerName: $('playerName'),
  playerRole: $('playerRole'),
  connectionStatus: $('connectionStatus'),
  songSelect: $('songSelect'),
  sectionSelect: $('sectionSelect'),
  transposeDown: $('transposeDown'),
  transposeUp: $('transposeUp'),
  keySelect: $('keySelect'),
  keyAlertButton: $('keyAlertButton'),
  songTitle: $('songTitle'),
  songArtist: $('songArtist'),
  songKey: $('songKey'),
  currentSection: $('currentSection'),
  chordGrid: $('chordGrid'),
  keyChangeOverlay: $('keyChangeOverlay'),
  keyChangeNotice: $('keyChangeNotice')
};

function connectBandSync() {
  if (!window.SockJS || !window.Stomp) {
    setStatus('SockJS or StompJS did not load.');
    return;
  }

  const socket = new SockJS(`${backendUrl}/connect-bandsync`);
  stompClient = Stomp.over(socket);
  stompClient.debug = null;

  stompClient.connect({}, () => {
    clearTimeout(reconnectTimer);
    setStatus(`Live in room ${roomId}`);
    stompClient.subscribe(topic, (frame) => handleBandMessage(JSON.parse(frame.body)));

    if (isHost) {
      broadcastSongChange();
      broadcastTranspose();
    }
  }, () => {
    setStatus('Reconnecting...');
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connectBandSync, 1200);
  });
}

function setStatus(message) {
  if (els.connectionStatus) els.connectionStatus.textContent = message;
}

function sendBandAction(payload) {
  if (!stompClient || !stompClient.connected) {
    setStatus('Waiting for connection...');
    return;
  }

  stompClient.send(action, {}, JSON.stringify({
    roomId,
    senderRole: isHost ? 'HOST' : userRole,
    sentAt: new Date().toISOString(),
    ...payload
  }));
}

function handleBandMessage(message) {
  switch (message.type) {
    case 'SONG_CHANGE':
      renderSongChange(message.songChange);
      break;
    case 'TRANSPOSE':
      renderTranspose(message.transpose);
      break;
    case 'KEY_CHANGE':
      showKeyChange(message.keyChange);
      break;
    default:
      break;
  }
}

function renderSongChange(songChange) {
  if (!songChange) return;
  if (els.songTitle) els.songTitle.textContent = songChange.songTitle;
  if (els.songArtist) els.songArtist.textContent = songChange.artist;
  if (els.currentSection) els.currentSection.textContent = songChange.currentSection;
  if (els.songKey && currentKey === '--') els.songKey.textContent = songChange.originalKey;
}

function renderTranspose(transpose) {
  if (!transpose) return;
  currentKey = transpose.newKey;
  semitoneOffset = transpose.semitoneOffset;
  if (els.songKey) els.songKey.textContent = transpose.newKey;
  renderChordGrid(transpose.chords || []);
}

function renderChordGrid(chords) {
  if (!els.chordGrid) return;
  const tiles = chords.map((chord, index) => {
    const tile = document.createElement('article');
    tile.className = 'rounded-lg border border-cyan-300/15 bg-slate-950/80 p-4 text-center shadow-lg shadow-cyan-950/30';

    const beat = document.createElement('p');
    beat.className = 'text-xs font-semibold uppercase tracking-[0.18em] text-slate-500';
    beat.textContent = `Beat ${index + 1}`;

    const chordName = document.createElement('p');
    chordName.className = 'mt-2 text-3xl font-black text-white';
    chordName.textContent = chord;

    const offset = document.createElement('p');
    offset.className = 'mt-2 text-xs text-cyan-200/80';
    offset.textContent = semitoneOffset === 0 ? 'Concert key' : `${semitoneOffset > 0 ? '+' : ''}${semitoneOffset} semitones`;

    tile.append(beat, chordName, offset);
    return tile;
  });
  els.chordGrid.replaceChildren(...tiles);
}

function showKeyChange(keyChange) {
  if (!keyChange || !els.keyChangeOverlay) return;

  if (els.keyChangeNotice) {
    els.keyChangeNotice.textContent = keyChange.notice || `Modulating to ${keyChange.targetKey}`;
  }

  els.keyChangeOverlay.classList.remove('hidden');
  els.keyChangeOverlay.classList.add('flex');
  clearTimeout(overlayTimer);
  overlayTimer = setTimeout(() => {
    els.keyChangeOverlay.classList.add('hidden');
    els.keyChangeOverlay.classList.remove('flex');
  }, 3000);
}

function normalizeRoot(input) {
  const root = String(input || '').toUpperCase();
  if (root === 'DB') return 'C#';
  if (root === 'EB') return 'D#';
  if (root === 'GB') return 'F#';
  if (root === 'AB') return 'G#';
  if (root === 'BB') return 'A#';
  return root;
}

function transposeChord(chord, steps) {
  const match = chord.match(/^([A-G])([b#]?)(.*)$/i);
  if (!match) return chord;

  const root = normalizeRoot(`${match[1]}${match[2] || ''}`);
  const rootIndex = CHROMATIC.indexOf(root);
  if (rootIndex === -1) return chord;

  return `${CHROMATIC[(rootIndex + steps + 120) % 12]}${match[3]}`;
}

function activeSong() {
  return SONGS[currentSongId] || SONGS['neon-stage'];
}

function activeChords() {
  return activeSong().sections[currentSectionName] || activeSong().sections.Verse;
}

function broadcastSongChange() {
  const song = activeSong();
  sendBandAction({
    type: 'SONG_CHANGE',
    songChange: {
      songTitle: song.title,
      artist: song.artist,
      originalKey: song.originalKey,
      currentSection: currentSectionName
    }
  });
}

function broadcastTranspose() {
  sendBandAction({
    type: 'TRANSPOSE',
    transpose: {
      newKey: currentKey,
      semitoneOffset,
      chords: activeChords().map((chord) => transposeChord(chord, semitoneOffset))
    }
  });
}

function broadcastKeyChange() {
  sendBandAction({
    type: 'KEY_CHANGE',
    keyChange: {
      isModulating: true,
      targetKey: currentKey,
      notice: `KEY CHANGE: ${currentKey} in 4 counts`
    }
  });
}

function syncHostControls() {
  if (!isHost) return;
  const song = activeSong();
  const sections = Object.keys(song.sections);

  if (els.sectionSelect) {
    els.sectionSelect.replaceChildren(...sections.map((section) => {
      const option = document.createElement('option');
      option.value = section;
      option.textContent = section;
      option.selected = section === currentSectionName;
      return option;
    }));
  }

  if (els.keySelect) {
    els.keySelect.replaceChildren(...CHROMATIC.map((key) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = key;
      option.selected = key === currentKey;
      return option;
    }));
  }
}

function bindHostControls() {
  if (!isHost) return;

  if (els.songSelect) {
    els.songSelect.addEventListener('change', () => {
      currentSongId = els.songSelect.value;
      currentSectionName = 'Verse';
      currentKey = activeSong().originalKey;
      semitoneOffset = 0;
      syncHostControls();
      broadcastSongChange();
      broadcastTranspose();
    });
  }

  if (els.sectionSelect) {
    els.sectionSelect.addEventListener('change', () => {
      currentSectionName = els.sectionSelect.value;
      broadcastSongChange();
      broadcastTranspose();
    });
  }

  if (els.keySelect) {
    els.keySelect.addEventListener('change', () => {
      currentKey = els.keySelect.value;
      semitoneOffset = (CHROMATIC.indexOf(currentKey) - CHROMATIC.indexOf(activeSong().originalKey) + 12) % 12;
      broadcastTranspose();
    });
  }

  if (els.transposeDown) {
    els.transposeDown.addEventListener('click', () => {
      semitoneOffset -= 1;
      currentKey = CHROMATIC[(CHROMATIC.indexOf(activeSong().originalKey) + semitoneOffset + 120) % 12];
      syncHostControls();
      broadcastTranspose();
    });
  }

  if (els.transposeUp) {
    els.transposeUp.addEventListener('click', () => {
      semitoneOffset += 1;
      currentKey = CHROMATIC[(CHROMATIC.indexOf(activeSong().originalKey) + semitoneOffset + 120) % 12];
      syncHostControls();
      broadcastTranspose();
    });
  }

  if (els.keyAlertButton) {
    els.keyAlertButton.addEventListener('click', broadcastKeyChange);
  }
}

function initPage() {
  if (els.roomLabel) els.roomLabel.textContent = roomId;
  if (els.playerName) els.playerName.textContent = userName;
  if (els.playerRole) els.playerRole.textContent = isHost ? 'HOST' : userRole;

  syncHostControls();
  bindHostControls();
  connectBandSync();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage, { once: true });
} else {
  initPage();
}

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const chromatic = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const songs = {
  'neon-stage': {
    id: 'neon-stage',
    title: 'Neon Stage',
    artist: 'BandSync Ensemble',
    baseKey: 'C',
    sections: {
      verse: {
        label: 'Verse',
        sectionKey: 'C',
        chords: ['Dm7', 'G7', 'Cmaj7', 'Fmaj7'],
        cue: 'Intro',
        keyChange: null,
      },
      chorus: {
        label: 'Chorus',
        sectionKey: 'D',
        chords: ['Dmaj7', 'Gmaj7', 'A7', 'Bm7'],
        cue: 'Main',
        keyChange: { newKey: 'D', bars: 2 },
      },
      bridge: {
        label: 'Bridge',
        sectionKey: 'D',
        chords: ['Bm7', 'E7', 'Amaj7', 'Dmaj7'],
        cue: 'End',
        keyChange: null,
      },
    },
  },
  'midnight-ride': {
    id: 'midnight-ride',
    title: 'Midnight Ride',
    artist: 'Stage Echoes',
    baseKey: 'A',
    sections: {
      verse: {
        label: 'Verse',
        sectionKey: 'A',
        chords: ['Amaj7', 'F#m7', 'Dmaj7', 'E7'],
        cue: 'Intro',
        keyChange: null,
      },
      chorus: {
        label: 'Chorus',
        sectionKey: 'B',
        chords: ['Bmaj7', 'Emaj7', 'F#7', 'G#m7'],
        cue: 'Main',
        keyChange: { newKey: 'B', bars: 2 },
      },
      bridge: {
        label: 'Bridge',
        sectionKey: 'B',
        chords: ['G#m7', 'C#7', 'F#maj7', 'Bmaj7'],
        cue: 'End',
        keyChange: null,
      },
    },
  },
};

const defaultSong = songs['neon-stage'];

const rooms = {};

function normalizeRoot(input) {
  const root = input.toUpperCase();
  if (root === 'DB') return 'C#';
  if (root === 'EB') return 'D#';
  if (root === 'GB') return 'F#';
  if (root === 'AB') return 'G#';
  if (root === 'BB') return 'A#';
  return root;
}

function transposeChord(chord, semitoneShift) {
  const match = chord.match(/^([A-G])([b#]?)(.*)$/i);
  if (!match) return chord;

  let [, root, accidental, suffix] = match;
  root = root.toUpperCase();
  accidental = accidental || '';
  const normalizedRoot = normalizeRoot(root + accidental);
  const rootIndex = chromatic.indexOf(normalizedRoot);
  if (rootIndex === -1) return chord;

  const shiftedIndex = (rootIndex + semitoneShift + 12) % 12;
  const newRoot = chromatic[shiftedIndex];
  return `${newRoot}${suffix}`;
}

function transposeChordList(chords, semitoneShift) {
  return chords.map(chord => transposeChord(chord, semitoneShift));
}

function createRoom(roomId) {
  const song = defaultSong;
  const baseKeyIndex = chromatic.indexOf(song.baseKey);
  return {
    roomId,
    hostId: null,
    users: {},
    song,
    customSongs: {},
    activeSection: 'verse',
    sectionBaseIndex: baseKeyIndex,
    transposeSteps: 0,
    currentKeyIndex: baseKeyIndex,
    progressionDegree: 1,
  };
}

function createCustomSong(title, artist, baseKey) {
  const normalizedKey = normalizeRoot(baseKey);
  const id = `${title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
  const rootIndex = chromatic.indexOf(normalizedKey);
  const fourth = chromatic[(rootIndex + 5) % 12];
  const fifth = chromatic[(rootIndex + 7) % 12];
  const sixth = chromatic[(rootIndex + 9) % 12];
  return {
    id,
    title: title.trim(),
    artist: artist.trim(),
    baseKey: normalizedKey,
    sections: {
      verse: {
        label: 'Verse',
        sectionKey: normalizedKey,
        chords: [`${normalizedKey}maj7`, `${fourth}maj7`, `${fifth}7`, `${sixth}m7`],
        cue: 'Intro',
        keyChange: null,
      },
      chorus: {
        label: 'Chorus',
        sectionKey: normalizedKey,
        chords: [`${normalizedKey}maj7`, `${fourth}maj7`, `${fifth}7`, `${sixth}m7`],
        cue: 'Main',
        keyChange: null,
      },
      bridge: {
        label: 'Bridge',
        sectionKey: normalizedKey,
        chords: [`${fourth}m7`, `${fifth}7`, `${normalizedKey}maj7`, `${sixth}m7`],
        cue: 'Bridge',
        keyChange: null,
      },
    },
  };
}

function deriveRoomState(room) {
  const section = room.song.sections[room.activeSection];
  const semitoneShift = (room.currentKeyIndex - room.sectionBaseIndex + 12) % 12;
  const transposedChords = transposeChordList(section.chords, semitoneShift);

  return {
    roomId: room.roomId,
    currentSongId: room.song.id,
    currentSong: {
      title: room.song.title,
      artist: room.song.artist,
      key: chromatic[room.currentKeyIndex],
    },
    availableSongs: Object.values(songs)
      .concat(Object.values(room.customSongs || {}))
      .map((songItem) => ({
        id: songItem.id,
        title: songItem.title,
        artist: songItem.artist,
        key: songItem.baseKey,
      })),
    progressionDegree: room.progressionDegree,
    activeSection: room.activeSection,
    sectionLabel: section.label,
    sectionCue: section.cue || '',
    sections: Object.keys(room.song.sections).map((key) => ({
      key,
      label: room.song.sections[key].label,
      active: key === room.activeSection,
      keyChange: !!room.song.sections[key].keyChange,
    })),
    chords: transposedChords,
    hostId: room.hostId,
    users: Object.values(room.users).map((user) => ({
      id: user.id,
      name: user.name,
      role: user.role,
      isHost: user.isHost,
    })),
  };
}

function assignNewHost(room) {
  const userIds = Object.keys(room.users);
  if (userIds.length === 0) {
    room.hostId = null;
    return;
  }

  const nextHostId = userIds[0];
  room.hostId = nextHostId;
  Object.values(room.users).forEach((user) => {
    user.isHost = user.id === nextHostId;
  });
}

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/host', (req, res) => {
  res.sendFile(path.join(__dirname, 'host.html'));
});
app.get('/member', (req, res) => {
  res.sendFile(path.join(__dirname, 'member.html'));
});
app.get('/room', (req, res) => {
  res.sendFile(path.join(__dirname, 'room.html'));
});

io.on('connection', (socket) => {
  socket.on('joinRoom', ({ roomId, name, role, wantsHost }) => {
    if (!roomId || !name || !role) {
      socket.emit('joinError', 'Room ID, name, and role are required.');
      return;
    }

    const normalizedRoom = roomId.trim().toUpperCase();
    const room = rooms[normalizedRoom] || createRoom(normalizedRoom);
    rooms[normalizedRoom] = room;

    const isHost = wantsHost && !room.hostId;
    room.users[socket.id] = {
      id: socket.id,
      name: name.trim() || 'Player',
      role,
      isHost,
    };

    if (isHost) {
      room.hostId = socket.id;
    }

    socket.join(normalizedRoom);
    socket.data.roomId = normalizedRoom;

    socket.emit('joinedRoom', {
      userId: socket.id,
      isHost,
      hostApproved: isHost,
      roomState: deriveRoomState(room),
    });

    io.to(normalizedRoom).emit('roomUpdated', deriveRoomState(room));
  });

  socket.on('transpose', (direction) => {
    const roomId = socket.data.roomId;
    const room = roomId ? rooms[roomId] : null;
    if (!room || socket.id !== room.hostId) return;

    const step = direction === 'up' ? 1 : -1;
    room.transposeSteps = (room.transposeSteps + step + 12) % 12;
    room.currentKeyIndex = (room.sectionBaseIndex + room.transposeSteps + 12) % 12;

    io.to(roomId).emit('roomUpdated', deriveRoomState(room));
  });

  socket.on('setSong', ({ songId }) => {
    const roomId = socket.data.roomId;
    const room = roomId ? rooms[roomId] : null;
    if (!room || socket.id !== room.hostId) return;

    const selectedSong = songs[songId] || room.customSongs[songId];
    if (!selectedSong) return;

    room.song = selectedSong;
    room.activeSection = 'verse';
    room.sectionBaseIndex = chromatic.indexOf(room.song.baseKey);
    room.transposeSteps = 0;
    room.currentKeyIndex = room.sectionBaseIndex;

    io.to(roomId).emit('roomUpdated', deriveRoomState(room));
  });

  socket.on('addSong', ({ title, artist, key }) => {
    const roomId = socket.data.roomId;
    const room = roomId ? rooms[roomId] : null;
    if (!room || socket.id !== room.hostId) return;
    if (!title || !artist || !key) return;
    const normalizedKey = normalizeRoot(key);
    if (!chromatic.includes(normalizedKey)) return;

    const newSong = createCustomSong(title, artist, normalizedKey);
    room.customSongs[newSong.id] = newSong;
    io.to(roomId).emit('roomUpdated', deriveRoomState(room));
  });

  socket.on('setKey', ({ key }) => {
    const roomId = socket.data.roomId;
    const room = roomId ? rooms[roomId] : null;
    if (!room || socket.id !== room.hostId) return;
    const normalizedKey = normalizeRoot(key);
    const keyIndex = chromatic.indexOf(normalizedKey);
    if (keyIndex === -1) return;

    room.currentKeyIndex = keyIndex;
    room.transposeSteps = (room.currentKeyIndex - room.sectionBaseIndex + 12) % 12;
    io.to(roomId).emit('roomUpdated', deriveRoomState(room));
  });

  socket.on('setProgression', ({ degree }) => {
    const roomId = socket.data.roomId;
    const room = roomId ? rooms[roomId] : null;
    if (!room || socket.id !== room.hostId) return;
    const parsed = parseInt(degree, 10);
    if (Number.isNaN(parsed) || parsed < 1 || parsed > 7) return;

    room.progressionDegree = parsed;
    io.to(roomId).emit('roomUpdated', deriveRoomState(room));
  });

  socket.on('switchSection', (sectionKey) => {
    const roomId = socket.data.roomId;
    const room = roomId ? rooms[roomId] : null;
    if (!room || socket.id !== room.hostId) return;
    if (!room.song.sections[sectionKey]) return;

    room.activeSection = sectionKey;
    const section = room.song.sections[sectionKey];
    room.sectionBaseIndex = chromatic.indexOf(section.sectionKey || room.song.baseKey);
    room.currentKeyIndex = (room.sectionBaseIndex + room.transposeSteps + 12) % 12;

    io.to(roomId).emit('roomUpdated', deriveRoomState(room));
    if (section.keyChange) {
      io.to(roomId).emit('keyChangeAlert', {
        message: `KEY CHANGE AHEAD - Modulating to ${section.keyChange.newKey} in ${section.keyChange.bars} Bars`,
        newKey: section.keyChange.newKey,
      });
    }
  });

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    const room = roomId ? rooms[roomId] : null;
    if (!room) return;

    delete room.users[socket.id];
    if (socket.id === room.hostId) {
      assignNewHost(room);
    }

    if (Object.keys(room.users).length === 0) {
      delete rooms[roomId];
      return;
    }

    io.to(roomId).emit('roomUpdated', deriveRoomState(room));
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`BandSync server running on http://localhost:${PORT}`);
});

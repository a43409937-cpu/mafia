const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const rooms = {};

function shuffle(array) { return array.sort(() => Math.random() - 0.5); }

function assignRoles(players) {
  let roles = ['Mafia', 'Doctor', 'Detective'];
  while (roles.length < players.length) roles.push('Citizen');
  roles = shuffle(roles);
  players.forEach((player, i) => { player.role = roles[i]; player.isAlive = true; });
}

function checkWinCondition(roomId) {
  const room = rooms[roomId];
  if (!room) return false;
  const alivePlayers = room.players.filter(p => p.isAlive);
  const mafiaCount = alivePlayers.filter(p => p.role === 'Mafia').length;
  const citizenCount = alivePlayers.length - mafiaCount;

  if (mafiaCount === 0) {
    io.to(roomId).emit('game_over', { winner: 'Citizens', message: 'شهروندان برنده شدند!' });
    return true;
  } else if (mafiaCount >= citizenCount) {
    io.to(roomId).emit('game_over', { winner: 'Mafia', message: 'مافیا برنده شد!' });
    return true;
  }
  return false;
}

io.on('connection', (socket) => {
  socket.on('create_room', ({ playerName }) => {
    const roomId = Math.random().toString(36).substring(2, 7).toUpperCase();
    rooms[roomId] = { id: roomId, host: socket.id, phase: 'Lobby', players: [{ id: socket.id, name: playerName, role: null, isAlive: true }], nightActions: {}, votes: {} };
    socket.join(roomId);
    socket.emit('room_created', { roomId, players: rooms[roomId].players });
  });

  socket.on('join_room', ({ roomId, playerName }) => {
    const room = rooms[roomId];
    if (!room) return socket.emit('error_msg', 'اتاق یافت نشد.');
    if (room.phase !== 'Lobby') return socket.emit('error_msg', 'بازی در حال جریان است.');
    room.players.push({ id: socket.id, name: playerName, role: null, isAlive: true });
    socket.join(roomId);
    io.to(roomId).emit('update_players', room.players);
  });

  socket.on('start_game', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.host !== socket.id) return;
    if (room.players.length < 4) return socket.emit('error_msg', 'حداقل به ۴ بازیکن نیاز است.');
    assignRoles(room.players);
    room.phase = 'Night';
    room.players.forEach(p => io.to(p.id).emit('your_role', { role: p.role }));
    io.to(roomId).emit('phase_changed', { phase: 'Night', players: room.players });
  });

  socket.on('night_action', ({ roomId, action, targetId }) => {
    const room = rooms[roomId];
    if (!room || room.phase !== 'Night') return;
    const sender = room.players.find(p => p.id === socket.id);
    if (!sender || !sender.isAlive) return;
    if (action === 'kill' && sender.role === 'Mafia') room.nightActions.kill = targetId;
    if (action === 'save' && sender.role === 'Doctor') room.nightActions.save = targetId;
    if (action === 'check' && sender.role === 'Detective') {
      const target = room.players.find(p => p.id === targetId);
      socket.emit('check_result', { isMafia: target?.role === 'Mafia' });
    }
  });

  socket.on('resolve_night', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.host !== socket.id) return;
    let killedId = null;
    if (room.nightActions.kill && room.nightActions.kill !== room.nightActions.save) {
      killedId = room.nightActions.kill;
      const killedPlayer = room.players.find(p => p.id === killedId);
      if (killedPlayer) killedPlayer.isAlive = false;
    }
    room.nightActions = {};
    room.phase = 'Day';
    io.to(roomId).emit('phase_changed', { phase: 'Day', killedId, players: room.players });
    checkWinCondition(roomId);
  });

  socket.on('cast_vote', ({ roomId, targetId }) => {
    const room = rooms[roomId];
    if (!room || room.phase !== 'Voting') return;
    room.votes[socket.id] = targetId;
    io.to(roomId).emit('update_votes', room.votes);
  });

  socket.on('resolve_voting', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.host !== socket.id) return;
    const voteCounts = {};
    Object.values(room.votes).forEach(tId => { voteCounts[tId] = (voteCounts[tId] || 0) + 1; });
    let eliminatedId = null;
    let maxVotes = 0;
    for (const [tId, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) { maxVotes = count; eliminatedId = tId; }
    }
    if (eliminatedId) {
      const p = room.players.find(player => player.id === eliminatedId);
      if (p) p.isAlive = false;
    }
    room.votes = {};
    room.phase = 'Night';
    io.to(roomId).emit('phase_changed', { phase: 'Night', eliminatedId, players: room.players });
    checkWinCondition(roomId);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

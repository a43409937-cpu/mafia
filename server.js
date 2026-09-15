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

io.on('connection', (socket) => {
  // ساخت اتاق
  socket.on('create_room', ({ playerName, peerId }) => {
    const roomId = Math.random().toString(36).substring(2, 7).toUpperCase();
    rooms[roomId] = {
      id: roomId,
      host: socket.id,
      players: [{ id: socket.id, peerId, name: playerName, isMuted: false }]
    };
    socket.join(roomId);
    socket.emit('room_created', { roomId, players: rooms[roomId].players });
  });

  // ورود به اتاق
  socket.on('join_room', ({ roomId, playerName, peerId }) => {
    const room = rooms[roomId];
    if (!room) return socket.emit('error_msg', 'اتاق یافت نشد!');
    
    const newPlayer = { id: socket.id, peerId, name: playerName, isMuted: false };
    room.players.push(newPlayer);
    socket.join(roomId);

    // اطلاع به بقیه افراد اتاق برای برقراری تماس صوتی
    socket.to(roomId).emit('user_joined_voice', { peerId, playerName });
    io.to(roomId).emit('update_players', room.players);
    socket.emit('room_created', { roomId, players: room.players });
  });

  // چت متنی
  socket.on('send_message', ({ roomId, message }) => {
    const room = rooms[roomId];
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;
    io.to(roomId).emit('new_message', { sender: player.name, text: message });
  });

  // تغییر وضعیت میکروفون
  socket.on('toggle_mute', ({ roomId, isMuted }) => {
    const room = rooms[roomId];
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      player.isMuted = isMuted;
      io.to(roomId).emit('update_players', room.players);
    }
  });

  // خروج کاربر
  socket.on('disconnecting', () => {
    for (const roomId of socket.rooms) {
      if (rooms[roomId]) {
        const player = rooms[roomId].players.find(p => p.id === socket.id);
        rooms[roomId].players = rooms[roomId].players.filter(p => p.id !== socket.id);
        if (player) {
          io.to(roomId).emit('user_left_voice', { peerId: player.peerId });
        }
        io.to(roomId).emit('update_players', rooms[roomId].players);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

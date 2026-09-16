const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// پوشه فایل‌های استاتیک برای ذخیره تصاویر مانند عکس تالار اژدها
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// حافظه نگهداری اتاق‌های فعال
const rooms = {};

io.on('connection', (socket) => {
  console.log(`⚡ کاربر متصل شد: ${socket.id}`);

  // 1. ساخت اتاق با تم تالار اژدها
  socket.on('create_dragon_room', (data) => {
    // تولید کد ۴ رقمی اختصاصی اتاق
    const roomId = data.roomId || Math.floor(1000 + Math.random() * 9000).toString();

    // ساختار داده‌ای اتاق با تم گوتیک/اژدها
    rooms[roomId] = {
      id: roomId,
      title: data.roomTitle || "تالار سلطنتی اژدها",
      theme: {
        id: "dragon_hall",
        bgImage: data.bgImage || "/assets/dragon_hall.jpg", // آدرس تصویر تالار
        themeColor: "#8b0000", // قرمز تیره گوتیک
        atmosphere: "gothic_dark"
      },
      maxPlayers: data.maxPlayers || 10,
      hostId: socket.id,
      gameStatus: "waiting", // waiting | playing | ended
      players: []
    };

    // ورود سازنده به اتاق Socket.IO
    socket.join(roomId);

    const hostPlayer = {
      id: socket.id,
      name: data.playerName || "فرمانروا",
      isHost: true,
      role: null,
      isAlive: true
    };

    rooms[roomId].players.push(hostPlayer);

    // ارسال پاسخ به سازنده
    socket.emit('room_created', {
      success: true,
      roomId: roomId,
      roomData: rooms[roomId]
    });

    console.log(`🏰 اتاق «${rooms[roomId].title}» (کد: ${roomId}) ساخته شد.`);
  });

  // 2. پیوستن بازیکن به اتاق
  socket.on('join_room', ({ roomId, playerName }) => {
    const room = rooms[roomId];

    if (!room) {
      return socket.emit('error_message', 'اتاقی با این کد یافت نشد!');
    }

    if (room.players.length >= room.maxPlayers) {
      return socket.emit('error_message', 'ظرفیت تالار تکمیل است!');
    }

    if (room.gameStatus !== 'waiting') {
      return socket.emit('error_message', 'بازی در این تالار شروع شده است!');
    }

    // اضافه کردن به گروه سوکت
    socket.join(roomId);

    const newPlayer = {
      id: socket.id,
      name: playerName || `مبارز ${room.players.length + 1}`,
      isHost: false,
      role: null,
      isAlive: true
    };

    room.players.push(newPlayer);

    // ارسال اطلاعات اتاق برای بازیکنی که تازه وارد شده
    socket.emit('room_joined', { roomData: room });

    // اطلاع‌رسانی به بقیه اعضای اتاق
    io.to(roomId).emit('room_updated', { roomData: room });

    console.log(`👤 ${newPlayer.name} وارد اتاق ${roomId} شد.`);
  });

  // 3. ارسال پیام درون لابی/چت اتاق
  socket.on('send_room_message', ({ roomId, message }) => {
    const room = rooms[roomId];
    if (room) {
      const sender = room.players.find(p => p.id === socket.id);
      io.to(roomId).emit('receive_room_message', {
        sender: sender ? sender.name : "ناشناس",
        message: message,
        time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
      });
    }
  });

  // 4. خروج کاربر یا قطعی اتصال
  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const playerIndex = room.players.findIndex(p => p.id === socket.id);

      if (playerIndex !== -1) {
        const removedPlayer = room.players.splice(playerIndex, 1)[0];
        console.log(`❌ ${removedPlayer.name} از اتاق ${roomId} خارج شد.`);

        // اگر اتاق خالی شد، حذفش کن
        if (room.players.length === 0) {
          delete rooms[roomId];
          console.log(`🗑️ اتاق ${roomId} پاک شد.`);
        } else {
          // اگر سازنده رفت، نقش Host رو بده به نفر بعدی
          if (room.hostId === socket.id) {
            room.hostId = room.players[0].id;
            room.players[0].isHost = true;
          }
          // به روز رسانی لیست بازیکنان برای بقیه
          io.to(roomId).emit('room_updated', { roomData: room });
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 سرور بازی روی پورت ${PORT} در حال اجراست...`);
});

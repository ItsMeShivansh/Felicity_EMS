// Import Dependencies
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const participantRoutes = require('./routes/participantRoutes');
const eventRoutes = require('./routes/eventRoutes');
const organizerRoutes = require('./routes/organizerRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
const teamRoutes = require('./routes/teamRoutes');
const chatRoutes = require('./routes/chatRoutes');
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Message = require('./models/Message');
const Team = require('./models/Team');

require('dotenv').config();

// Initialiaze Express App
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL
].filter(Boolean);

// Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

// Middleware Setup
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/participant', participantRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/organizers', organizerRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/chat', chatRoutes);

// Socket.IO Chat
const onlineUsers = new Map(); // participantId -> { socketId, teamRooms: Set }
const typingUsers = new Map(); // teamId -> Set of participantIds

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.userName = decoded.name || 'Unknown';
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  onlineUsers.set(socket.userId, { socketId: socket.id, teamRooms: new Set() });

  socket.on('join-team', async (teamId) => {
    try {
      const team = await Team.findById(teamId);
      if (!team) return;
      const isMember = team.members.some(m => m.participant.toString() === socket.userId) ||
        team.leader.toString() === socket.userId;
      if (!isMember) return;

      socket.join(teamId);
      const userData = onlineUsers.get(socket.userId);
      if (userData) userData.teamRooms.add(teamId);

      // Broadcast online status to the team room
      const onlineInRoom = [];
      for (const [uid, data] of onlineUsers) {
        if (data.teamRooms.has(teamId)) onlineInRoom.push(uid);
      }
      io.to(teamId).emit('online-users', onlineInRoom);
    } catch (err) {
      console.error('Error joining team room:', err);
    }
  });

  socket.on('leave-team', (teamId) => {
    socket.leave(teamId);
    const userData = onlineUsers.get(socket.userId);
    if (userData) userData.teamRooms.delete(teamId);

    const onlineInRoom = [];
    for (const [uid, data] of onlineUsers) {
      if (data.teamRooms.has(teamId)) onlineInRoom.push(uid);
    }
    io.to(teamId).emit('online-users', onlineInRoom);
  });

  socket.on('send-message', async (data) => {
    try {
      const { teamId, content, type } = data;
      const team = await Team.findById(teamId);
      if (!team) return;
      const isMember = team.members.some(m => m.participant.toString() === socket.userId) ||
        team.leader.toString() === socket.userId;
      if (!isMember) return;

      const message = new Message({
        team: teamId,
        sender: socket.userId,
        content,
        type: type || 'text'
      });
      await message.save();
      await message.populate('sender', 'firstName lastName');

      io.to(teamId).emit('new-message', {
        _id: message._id,
        team: teamId,
        sender: { _id: message.sender._id, firstName: message.sender.firstName, lastName: message.sender.lastName },
        content: message.content,
        type: message.type,
        createdAt: message.createdAt
      });
    } catch (err) {
      console.error('Error sending message:', err);
    }
  });

  socket.on('typing-start', (teamId) => {
    if (!typingUsers.has(teamId)) typingUsers.set(teamId, new Set());
    typingUsers.get(teamId).add(socket.userId);
    socket.to(teamId).emit('typing-update', Array.from(typingUsers.get(teamId)));
  });

  socket.on('typing-stop', (teamId) => {
    if (typingUsers.has(teamId)) {
      typingUsers.get(teamId).delete(socket.userId);
      socket.to(teamId).emit('typing-update', Array.from(typingUsers.get(teamId)));
    }
  });

  socket.on('disconnect', () => {
    const userData = onlineUsers.get(socket.userId);
    if (userData) {
      for (const teamId of userData.teamRooms) {
        const onlineInRoom = [];
        for (const [uid, data] of onlineUsers) {
          if (uid !== socket.userId && data.teamRooms.has(teamId)) onlineInRoom.push(uid);
        }
        io.to(teamId).emit('online-users', onlineInRoom);

        if (typingUsers.has(teamId)) {
          typingUsers.get(teamId).delete(socket.userId);
          io.to(teamId).emit('typing-update', Array.from(typingUsers.get(teamId)));
        }
      }
    }
    onlineUsers.delete(socket.userId);
  });
});

// Database Connection
const connectdb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully');
  }
  catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

connectdb();

// Test Route
app.get('/', (req, res) => {
  res.send('Welcome to the backend server!');
});

// Start Server
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
})
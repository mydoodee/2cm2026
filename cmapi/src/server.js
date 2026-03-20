require('./utils/consoleSuppressor');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

dotenv.config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/ProjectRoutes');
const statusRoutes = require('./routes/statusRoutes');
const foldersRoutes = require('./routes/foldersRoutes');
const dashboardRoutes = require('./routes/DashboardRoutes');
const progressRoutes = require('./routes/Progressroutes');
const publicRoutes = require('./routes/publicRoutes');
const weatherRoutes = require('./routes/weather');
const dashboardProjectRoutes = require('./routes/DashboardProjectRoutes');
const planningRoutes = require('./routes/PlanningRoutes');
const actualRoutes = require('./routes/actualRoutes');
const scurveRoutes = require('./routes/scurveRoutes');

const app = express();
const httpServer = createServer(app); // ⭐ เปลี่ยนจาก app.listen เป็น createServer

// ===============================================
// 🔌 SOCKET.IO SETUP
// ===============================================

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = [
        'https://app.spkconstruction.co.th',
        'http://localhost:5173',
        'http://localhost:3000',
      ];
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://192.168.') || origin.startsWith('http://10.')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Middleware: Authenticate Socket connections
// ✅ โค้ดใหม่ (ถูกต้อง)
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  console.log('🔐 Socket.IO Authentication attempt');
  console.log('   Token exists:', !!token);
  console.log('   Token preview:', token ? `${token.substring(0, 20)}...` : 'none');

  if (!token) {
    console.error('❌ No token provided');
    return next(new Error('Authentication error: No token'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Debug: ดูว่า token มีอะไรบ้าง
    console.log('🔍 Decoded token fields:', Object.keys(decoded));

    socket.userId = decoded.user_id || decoded.userId || decoded.id;

    // ✅ รองรับหลาย format ของชื่อ
    const firstName = decoded.first_name || decoded.firstName || decoded.name || 'User';
    const lastName = decoded.last_name || decoded.lastName || '';
    const username = decoded.username || decoded.userName || '';

    socket.userName = username || `${firstName} ${lastName}`.trim() || 'Unknown User';

    console.log('✅ Socket authenticated:', socket.userName, `(ID: ${socket.userId})`);
    console.log('   Token data:', {
      user_id: decoded.user_id,
      first_name: decoded.first_name,
      last_name: decoded.last_name,
      username: decoded.username
    });

    next();
  } catch (err) {
    console.error('❌ Token verification failed:', err.message);
    return next(new Error(`Invalid token: ${err.message}`));
  }
});
// Track connected users
const connectedUsers = new Map();

// Handle Socket connections
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.userName} (ID: ${socket.userId})`);

  connectedUsers.set(socket.userId, {
    socketId: socket.id,
    userName: socket.userName,
    connectedAt: new Date()
  });

  // Join user's projects rooms
  socket.on('join-projects', (projectIds) => {
    if (Array.isArray(projectIds)) {
      projectIds.forEach(projectId => {
        socket.join(`project:${projectId}`);
      });
      console.log(`📁 User ${socket.userName} joined ${projectIds.length} projects`);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.userName}`);
    connectedUsers.delete(socket.userId);
  });
});

// Export io globally for use in controllers
global.io = io;

// ===============================================
// HELPER FUNCTIONS (ใช้ใน controllers)
// ===============================================

function emitFileActivity(projectId, activityData) {
  if (global.io) {
    global.io.to(`project:${projectId}`).emit('file-activity', {
      ...activityData,
      timestamp: new Date()
    });
    // Emit to all users too (for "all projects" view)
    global.io.emit('file-activity-global', {
      ...activityData,
      projectId,
      timestamp: new Date()
    });
  }
}

module.exports = {
  emitFileActivity
};

// ===============================================
// REST OF SERVER.JS (เหมือนเดิม)
// ===============================================

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://app.spkconstruction.co.th',
      'http://localhost:5173',
      'http://localhost:3000',
    ];

    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://192.168.') || origin.startsWith('http://10.')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

const uploadsPath = path.join(__dirname, 'Uploads');
app.use('/Uploads', express.static(uploadsPath, {
  maxAge: '1d',
  etag: true
}));

app.use('/uploads', express.static(uploadsPath, {
  maxAge: '1d',
  etag: true
}));

app.use((req, res, next) => {
  if (!req.path.startsWith('/Uploads') && !req.path.startsWith('/uploads')) {
    res.set('Cache-Control', 'no-store');
  }
  next();
});

app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/public', publicRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api', authRoutes);
app.use('/api', projectRoutes);
app.use('/api', statusRoutes);
app.use('/api', foldersRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', dashboardProjectRoutes);
app.use('/api', progressRoutes);
app.use('/api', planningRoutes);
app.use('/api', actualRoutes);
app.use('/api', scurveRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 3050,
    environment: process.env.NODE_ENV || 'development',
    mode: 'API Server with WebSocket',
    connectedUsers: connectedUsers.size,
    features: {
      websocket: '✅ enabled',
      weather: process.env.OPENWEATHER_API_KEY ? '✅ configured' : '❌ not configured',
      shareToken: '✅ enabled',
      rateLimiting: '✅ enabled',
      statusRoutes: '✅ enabled',
      planningRoutes: '✅ enabled',
      planningFileUpload: '✅ enabled',
      scurveRoutes: '✅ enabled'
    }
  });
});

app.get('/api/public/health', (req, res) => {
  res.json({
    success: true,
    message: 'Public routes with share token are working',
    timestamp: new Date().toISOString(),
    features: [
      'Share Token System',
      'Rate Limiting',
      'Access Logging',
      'Expiration Check'
    ]
  });
});

app.use((req, res) => {
  console.log(`❌ 404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    message: 'ไม่พบ API endpoint ที่ร้องขอ',
    path: req.url,
    method: req.method,
    hint: 'This is an API-only server. Frontend is served by Nginx/Apache at /cm/'
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Global Error Handler:');
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'การเข้าถึงถูกปฏิเสธโดย CORS',
      origin: req.get('origin')
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ⭐ เปลี่ยนจาก app.listen เป็น httpServer.listen
const PORT = process.env.PORT || 3050;

httpServer.listen(PORT, () => {
  console.log('\n🚀 ========================================');
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('========================================\n');

  console.log('📋 Registered Routes:');
  console.log('   - /api/public/*        (Public routes)');
  console.log('   - /api/weather/*       (Weather API)');
  console.log('   - /api/auth/*          (Authentication)');
  console.log('   - /api/projects/*      (Projects)');
  console.log('   - /api/user/projects   (✅ Status Routes)');
  console.log('   - /api/file-statistics (✅ Statistics)');
  console.log('   - /api/folders/*       (Folders)');
  console.log('   - /api/dashboard/*     (Dashboard เก่า)');
  console.log('   - /api/dashboard-projects/* (✅ Dashboard ใหม่)');
  console.log('   - /api/progress/*      (Progress)');
  console.log('   - /api/planning/*      (✅ Planning with File Upload)');
  console.log('   - /api/project/:projectId/scurve/* (✅ S-Curve API)');
  console.log('========================================\n');

  console.log('🔌 WebSocket Events:');
  console.log('   - file-activity        (Project-specific updates)');
  console.log('   - file-activity-global (All projects updates)');
  console.log('   - join-projects        (Client subscribes to projects)');
  console.log('========================================\n');
});
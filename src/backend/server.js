const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// 보안 및 성능 최적화 미들웨어
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://web-mes-frontend.vercel.app', 'https://web-mes-frontend-git-main.vercel.app']
    : '*',
  credentials: true
}));

// Rate limiting - 50명 동시 접속 고려
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 1000, // IP당 최대 요청 수
  message: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Socket.IO 서버 설정 - 50명 동시 접속 최적화
const server = http.createServer(app);
const io = socketio(server, { 
  cors: { 
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://web-mes-frontend.vercel.app', 'https://web-mes-frontend-git-main.vercel.app']
      : '*',
    credentials: true 
  },
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 1e8, // 100MB
  pingTimeout: 60000,
  pingInterval: 25000
});

// Socket.IO 연결 관리
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log(`사용자 연결: ${socket.id}`);
  connectedUsers.set(socket.id, { connectedAt: new Date() });
  
  // 연결된 사용자 수 브로드캐스트
  io.emit('userCount', connectedUsers.size);
  
  socket.on('disconnect', () => {
    console.log(`사용자 연결 해제: ${socket.id}`);
    connectedUsers.delete(socket.id);
    io.emit('userCount', connectedUsers.size);
  });
  
  // 에러 핸들링
  socket.on('error', (error) => {
    console.error('Socket.IO 에러:', error);
  });
});

const DATA_FILE = path.join(__dirname, 'equipments.json');
let equipments = [];

function loadEquipments() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      equipments = JSON.parse(data);
    }
  } catch (e) {
    console.error('장비 데이터 로드 오류:', e);
    equipments = [];
  }
}

function saveEquipments() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(equipments, null, 2), 'utf-8');
  } catch (e) {
    console.error('장비 데이터 저장 오류:', e);
  }
}

loadEquipments();

// API 엔드포인트들
app.get('/api/equipments', (req, res) => {
  res.json(equipments);
});

app.post('/api/equipments', (req, res) => {
  try {
    const { name, iconUrl, x, y } = req.body;
    const newEq = { id: Date.now(), name, iconUrl, x, y, status: 'idle' };
    equipments.push(newEq);
    saveEquipments();
    io.emit('equipmentAdded', newEq);
    res.status(201).json(newEq);
  } catch (error) {
    console.error('장비 추가 오류:', error);
    res.status(500).json({ error: '장비 추가 중 오류가 발생했습니다.' });
  }
});

app.put('/api/equipments/:id', (req, res) => {
  try {
    const id = +req.params.id;
    const idx = equipments.findIndex(eq => eq.id === id);
    if (idx === -1) return res.sendStatus(404);

    const updated = { ...equipments[idx], ...req.body };
    if (typeof req.body.x !== 'number') updated.x = equipments[idx].x;
    if (typeof req.body.y !== 'number') updated.y = equipments[idx].y;
    if (Array.isArray(req.body.maintenanceHistory)) {
      updated.maintenanceHistory = req.body.maintenanceHistory;
    }

    if (!Array.isArray(updated.history)) updated.history = [];
    updated.history.push({
      user: req.body.user || 'unknown',
      time: new Date().toISOString(),
      value: req.body.status !== undefined ? req.body.status : updated.status
    });

    equipments[idx] = updated;
    saveEquipments();
    io.emit('equipmentUpdated', equipments[idx]);
    res.json(equipments[idx]);
  } catch (error) {
    console.error('장비 업데이트 오류:', error);
    res.status(500).json({ error: '장비 업데이트 중 오류가 발생했습니다.' });
  }
});

app.delete('/api/equipments/:id', (req, res) => {
  try {
    const id = +req.params.id;
    equipments = equipments.filter(eq => eq.id !== id);
    saveEquipments();
    io.emit('equipmentDeleted', id);
    res.sendStatus(204);
  } catch (error) {
    console.error('장비 삭제 오류:', error);
    res.status(500).json({ error: '장비 삭제 중 오류가 발생했습니다.' });
  }
});

// === 공정명(processTitles) 데이터 및 파일 관리 ===
const PROCESS_FILE = path.join(__dirname, 'processTitles.json');
let processTitles = [];

function loadProcessTitles() {
  try {
    if (!fs.existsSync(PROCESS_FILE)) {
      fs.writeFileSync(PROCESS_FILE, '[]', 'utf-8');
    }
    const data = fs.readFileSync(PROCESS_FILE, 'utf-8');
    processTitles = JSON.parse(data);
  } catch (e) {
    console.error('processTitles 파일 로드 오류:', e);
    processTitles = [];
  }
}

function saveProcessTitles() {
  try {
    fs.writeFileSync(PROCESS_FILE, JSON.stringify(processTitles, null, 2), 'utf-8');
  } catch (e) {
    console.error('processTitles 파일 저장 오류:', e);
  }
}

loadProcessTitles();

app.get('/api/processTitles', (req, res) => {
  res.json(processTitles);
});

app.post('/api/processTitles', (req, res) => {
  try {
    const { title, x, y, team } = req.body;
    const newProcess = { 
      id: Date.now(), 
      title, 
      x: x || 0, 
      y: y || 0, 
      team: team || 'ALL',
      createdAt: new Date().toISOString()
    };
    processTitles.push(newProcess);
    saveProcessTitles();
    io.emit('processTitleAdded', newProcess);
    res.status(201).json(newProcess);
  } catch (error) {
    console.error('공정명 추가 오류:', error);
    res.status(500).json({ error: '공정명 추가 중 오류가 발생했습니다.' });
  }
});

app.put('/api/processTitles/:id', (req, res) => {
  try {
    const id = +req.params.id;
    const idx = processTitles.findIndex(process => process.id === id);
    if (idx === -1) return res.sendStatus(404);

    const updated = { ...processTitles[idx], ...req.body };
    processTitles[idx] = updated;
    saveProcessTitles();
    io.emit('processTitleUpdated', updated);
    res.json(updated);
  } catch (error) {
    console.error('공정명 업데이트 오류:', error);
    res.status(500).json({ error: '공정명 업데이트 중 오류가 발생했습니다.' });
  }
});

app.delete('/api/processTitles/:id', (req, res) => {
  try {
    const id = +req.params.id;
    processTitles = processTitles.filter(process => process.id !== id);
    saveProcessTitles();
    io.emit('processTitleDeleted', id);
    res.sendStatus(204);
  } catch (error) {
    console.error('공정명 삭제 오류:', error);
    res.status(500).json({ error: '공정명 삭제 중 오류가 발생했습니다.' });
  }
});

// === 라인명(lineNames) 데이터 및 파일 관리 ===
const LINE_FILE = path.join(__dirname, 'lineNames.json');
let lineNames = [];

function loadLineNames() {
  try {
    if (!fs.existsSync(LINE_FILE)) {
      fs.writeFileSync(LINE_FILE, '[]', 'utf-8');
    }
    const data = fs.readFileSync(LINE_FILE, 'utf-8');
    lineNames = JSON.parse(data);
  } catch (e) {
    console.error('lineNames 파일 로드 오류:', e);
    lineNames = [];
  }
}

function saveLineNames() {
  try {
    fs.writeFileSync(LINE_FILE, JSON.stringify(lineNames, null, 2), 'utf-8');
  } catch (e) {
    console.error('lineNames 파일 저장 오류:', e);
  }
}

loadLineNames();

app.get('/api/lineNames', (req, res) => {
  res.json(lineNames);
});

app.post('/api/lineNames', (req, res) => {
  try {
    const { name, x, y } = req.body;
    const newLine = { 
      id: Date.now(), 
      name, 
      x: x || 0, 
      y: y || 0,
      createdAt: new Date().toISOString()
    };
    lineNames.push(newLine);
    saveLineNames();
    io.emit('lineNameAdded', newLine);
    res.status(201).json(newLine);
  } catch (error) {
    console.error('라인명 추가 오류:', error);
    res.status(500).json({ error: '라인명 추가 중 오류가 발생했습니다.' });
  }
});

app.put('/api/lineNames/:id', (req, res) => {
  try {
    const id = +req.params.id;
    const idx = lineNames.findIndex(line => line.id === id);
    if (idx === -1) return res.sendStatus(404);

    const updated = { ...lineNames[idx], ...req.body };
    lineNames[idx] = updated;
    saveLineNames();
    io.emit('lineNameUpdated', updated);
    res.json(updated);
  } catch (error) {
    console.error('라인명 업데이트 오류:', error);
    res.status(500).json({ error: '라인명 업데이트 중 오류가 발생했습니다.' });
  }
});

app.delete('/api/lineNames/:id', (req, res) => {
  try {
    const id = +req.params.id;
    lineNames = lineNames.filter(line => line.id !== id);
    saveLineNames();
    io.emit('lineNameDeleted', id);
    res.sendStatus(204);
  } catch (error) {
    console.error('라인명 삭제 오류:', error);
    res.status(500).json({ error: '라인명 삭제 중 오류가 발생했습니다.' });
  }
});

// === 사용자(users) 데이터 및 파일 관리 ===
const USER_FILE = path.join(__dirname, 'users.json');
let users = [];

function loadUsers() {
  try {
    if (!fs.existsSync(USER_FILE)) {
      fs.writeFileSync(USER_FILE, '[]', 'utf-8');
    }
    const data = fs.readFileSync(USER_FILE, 'utf-8');
    users = JSON.parse(data);
  } catch (e) {
    console.error('users 파일 로드 오류:', e);
    users = [];
  }
}

function saveUsers() {
  try {
    fs.writeFileSync(USER_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (e) {
    console.error('users 파일 저장 오류:', e);
  }
}

loadUsers();

app.get('/api/users', (req, res) => {
  res.json(users);
});

app.post('/api/users', (req, res) => {
  try {
    const { username, password, role } = req.body;
    const newUser = { 
      id: Date.now(), 
      username, 
      password, 
      role: role || 'user',
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    saveUsers();
    res.status(201).json(newUser);
  } catch (error) {
    console.error('사용자 추가 오류:', error);
    res.status(500).json({ error: '사용자 추가 중 오류가 발생했습니다.' });
  }
});

// 헬스체크 엔드포인트
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    connectedUsers: connectedUsers.size,
    uptime: process.uptime()
  });
});

// 서버 상태 엔드포인트
app.get('/api/status', (req, res) => {
  res.json({
    equipments: equipments.length,
    processTitles: processTitles.length,
    lineNames: lineNames.length,
    users: users.length,
    connectedUsers: connectedUsers.size,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📊 현재 연결된 사용자: ${connectedUsers.size}명`);
  console.log(`🔧 장비 수: ${equipments.length}개`);
  console.log(`🏭 공정명 수: ${processTitles.length}개`);
  console.log(`📏 라인명 수: ${lineNames.length}개`);
});

// 프로세스 종료 시 정리
process.on('SIGTERM', () => {
  console.log('SIGTERM 신호 수신. 서버를 정상적으로 종료합니다.');
  server.close(() => {
    console.log('서버가 정상적으로 종료되었습니다.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT 신호 수신. 서버를 정상적으로 종료합니다.');
  server.close(() => {
    console.log('서버가 정상적으로 종료되었습니다.');
    process.exit(0);
  });
});

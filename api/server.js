const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const server = http.createServer(app);
const io = socketio(server, { cors: { origin: '*' } });

// Vercel serverless 환경을 위한 메모리 기반 데이터 저장
let equipments = [];
let processTitles = [];
let lineNames = [];
let users = [];

// 초기 데이터 로드
function loadInitialData() {
  try {
    // 기본 사용자 데이터
    users = [
      { username: 'admin', password: 'admin123', role: 'admin' },
      { username: 'operator', password: 'op123', role: 'operator' },
      { username: 'manager', password: 'mg123', role: 'manager' }
    ];
    
    // 기본 장비 데이터
    equipments = [
      { id: 1, name: '프레스', iconUrl: '/images/press.png', x: 100, y: 100, status: 'idle', history: [] },
      { id: 2, name: '용접기', iconUrl: '/images/welder.png', x: 300, y: 100, status: 'idle', history: [] },
      { id: 3, name: '조립기', iconUrl: '/images/assembler.png', x: 500, y: 100, status: 'idle', history: [] }
    ];
    
    // 기본 공정명 데이터
    processTitles = [
      { id: 1, name: '절단', x: 100, y: 200 },
      { id: 2, name: '용접', x: 300, y: 200 },
      { id: 3, name: '조립', x: 500, y: 200 }
    ];
    
    // 기본 라인명 데이터
    lineNames = [
      { id: 1, name: 'A라인', x: 100, y: 300 },
      { id: 2, name: 'B라인', x: 300, y: 300 },
      { id: 3, name: 'C라인', x: 500, y: 300 }
    ];
  } catch (e) {
    console.error('초기 데이터 로드 오류:', e);
  }
}

loadInitialData();

// API 라우트들
app.get('/api/equipments', (req, res) => {
  res.json(equipments);
});

app.post('/api/equipments', (req, res) => {
  const { name, iconUrl, x, y } = req.body;
  const newEq = { id: Date.now(), name, iconUrl, x, y, status: 'idle', history: [] };
  equipments.push(newEq);
  io.emit('equipmentAdded', newEq);
  res.status(201).json(newEq);
});

app.put('/api/equipments/:id', (req, res) => {
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
  io.emit('equipmentUpdated', equipments[idx]);
  res.json(equipments[idx]);
});

app.delete('/api/equipments/:id', (req, res) => {
  const id = +req.params.id;
  equipments = equipments.filter(eq => eq.id !== id);
  io.emit('equipmentDeleted', id);
  res.sendStatus(204);
});

// 공정명 API
app.get('/api/processTitles', (req, res) => {
  res.json(processTitles);
});

app.post('/api/processTitles', (req, res) => {
  const { name, x, y } = req.body;
  const newProcess = { id: Date.now(), name, x, y };
  processTitles.push(newProcess);
  res.status(201).json(newProcess);
});

app.put('/api/processTitles/:id', (req, res) => {
  const id = +req.params.id;
  const idx = processTitles.findIndex(p => p.id === id);
  if (idx === -1) return res.sendStatus(404);
  const updated = { ...processTitles[idx] };
  if (typeof req.body.name === 'string') updated.name = req.body.name;
  if (typeof req.body.x === 'number') updated.x = req.body.x;
  if (typeof req.body.y === 'number') updated.y = req.body.y;
  processTitles[idx] = updated;
  res.json(processTitles[idx]);
});

app.delete('/api/processTitles/:id', (req, res) => {
  const id = +req.params.id;
  processTitles = processTitles.filter(p => p.id !== id);
  res.sendStatus(204);
});

// 라인명 API
app.get('/api/lineNames', (req, res) => {
  res.json(lineNames);
});

app.post('/api/lineNames', (req, res) => {
  const { name, x, y } = req.body;
  const newLine = { id: Date.now(), name, x, y };
  lineNames.push(newLine);
  res.status(201).json(newLine);
});

app.put('/api/lineNames/:id', (req, res) => {
  const id = +req.params.id;
  const idx = lineNames.findIndex(l => l.id === id);
  if (idx === -1) return res.sendStatus(404);
  const updated = { ...lineNames[idx] };
  if (typeof req.body.name === 'string') updated.name = req.body.name;
  if (typeof req.body.x === 'number') updated.x = req.body.x;
  if (typeof req.body.y === 'number') updated.y = req.body.y;
  lineNames[idx] = updated;
  res.json(lineNames[idx]);
});

app.delete('/api/lineNames/:id', (req, res) => {
  const id = +req.params.id;
  lineNames = lineNames.filter(l => l.id !== id);
  res.sendStatus(204);
});

// 로그인 API
app.post('/api/login', (req, res) => {
  const { username, password, role } = req.body;
  const user = users.find(u => u.username === username && u.password === password && u.role === role);
  if (!user) return res.status(401).json({ error: '로그인 실패: 아이디, 비밀번호 또는 역할이 일치하지 않습니다.' });
  res.json({ username: user.username, role: user.role });
});

// Socket.IO 연결 처리
io.on('connection', socket => {
  console.log('클라이언트 연결:', socket.id);
  socket.emit('initialEquipments', equipments);
  
  socket.on('updateStatus', ({ id, status }) => {
    const eq = equipments.find(e => e.id === id);
    if (!eq) return;
    eq.status = status;
    io.emit('statusUpdate', { id, status });
  });
  
  socket.on('disconnect', () => {
    console.log('클라이언트 연결 해제:', socket.id);
  });
});

// Vercel serverless 환경을 위한 export
module.exports = app; 
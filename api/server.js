const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 메모리 기반 데이터 저장
let equipments = [
  { id: 1, name: '프레스', iconUrl: '/images/press.png', x: 100, y: 100, status: 'idle', history: [] },
  { id: 2, name: '용접기', iconUrl: '/images/welder.png', x: 300, y: 100, status: 'idle', history: [] },
  { id: 3, name: '조립기', iconUrl: '/images/assembler.png', x: 500, y: 100, status: 'idle', history: [] }
];

let processTitles = [
  { id: 1, name: '절단', x: 100, y: 200 },
  { id: 2, name: '용접', x: 300, y: 200 },
  { id: 3, name: '조립', x: 500, y: 200 }
];

let lineNames = [
  { id: 1, name: 'A라인', x: 100, y: 300 },
  { id: 2, name: 'B라인', x: 300, y: 300 },
  { id: 3, name: 'C라인', x: 500, y: 300 }
];

let users = [
  { username: 'admin', password: 'admin123', role: 'admin' },
  { username: 'operator', password: 'op123', role: 'operator' },
  { username: 'manager', password: 'mg123', role: 'manager' }
];

// API 라우트들
app.get('/api/equipments', (req, res) => {
  res.json(equipments);
});

app.post('/api/equipments', (req, res) => {
  const { name, iconUrl, x, y } = req.body;
  const newEq = { id: Date.now(), name, iconUrl, x, y, status: 'idle', history: [] };
  equipments.push(newEq);
  res.status(201).json(newEq);
});

app.put('/api/equipments/:id', (req, res) => {
  const id = +req.params.id;
  const idx = equipments.findIndex(eq => eq.id === id);
  if (idx === -1) return res.sendStatus(404);

  const updated = { ...equipments[idx], ...req.body };
  equipments[idx] = updated;
  res.json(equipments[idx]);
});

app.delete('/api/equipments/:id', (req, res) => {
  const id = +req.params.id;
  equipments = equipments.filter(eq => eq.id !== id);
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

// 로그인 API
app.post('/api/login', (req, res) => {
  const { username, password, role } = req.body;
  const user = users.find(u => u.username === username && u.password === password && u.role === role);
  if (!user) return res.status(401).json({ error: '로그인 실패' });
  res.json({ username: user.username, role: user.role });
});

// 테스트 엔드포인트
app.get('/api/test', (req, res) => {
  res.json({ message: 'API 서버가 정상 작동합니다!' });
});

module.exports = app; 
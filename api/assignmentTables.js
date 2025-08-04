import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

let assignmentTables = [];
const ASSIGNMENT_FILE = join(process.cwd(), 'data', 'assignmentTables.json');

function loadAssignmentTables() {
  try {
    if (existsSync(ASSIGNMENT_FILE)) {
      const data = readFileSync(ASSIGNMENT_FILE, 'utf-8');
      assignmentTables = JSON.parse(data);
    }
  } catch (e) {
    console.error('어싸인표 파일 로드 오류:', e);
    assignmentTables = [];
  }
}

function saveAssignmentTables() {
  try {
    writeFileSync(ASSIGNMENT_FILE, JSON.stringify(assignmentTables, null, 2), 'utf-8');
  } catch (e) {
    console.error('어싸인표 파일 저장 오류:', e);
  }
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  loadAssignmentTables();

  if (req.method === 'GET') {
    return res.json(assignmentTables);
  }

  if (req.method === 'POST') {
    try {
      const newTable = { 
        id: Date.now(), 
        ...req.body,
        x: req.body.x || 100,
        y: req.body.y || 100,
        width: req.body.width || 400,
        height: req.body.height || 300
      };
      assignmentTables.push(newTable);
      saveAssignmentTables();
      return res.status(201).json(newTable);
    } catch (error) {
      return res.status(500).json({ error: '어싸인표 추가 중 오류가 발생했습니다.' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id } = req.query;
      const tableId = +id;
      const idx = assignmentTables.findIndex(t => t.id === tableId);
      
      if (idx === -1) return res.status(404).json({ error: '어싸인표를 찾을 수 없습니다.' });

      const updated = { ...assignmentTables[idx], ...req.body };
      assignmentTables[idx] = updated;
      saveAssignmentTables();
      return res.json(assignmentTables[idx]);
    } catch (error) {
      return res.status(500).json({ error: '어싸인표 업데이트 중 오류가 발생했습니다.' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      const tableId = +id;
      assignmentTables = assignmentTables.filter(t => t.id !== tableId);
      saveAssignmentTables();
      return res.status(204).end();
    } catch (error) {
      return res.status(500).json({ error: '어싸인표 삭제 중 오류가 발생했습니다.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
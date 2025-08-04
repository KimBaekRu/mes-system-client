// 실제 저장된 라인명 데이터를 직접 포함
const REAL_LINENAMES_DATA = [
  {
    "id": 1752668751483,
    "name": "Underfill",
    "x": 320,
    "y": -1066
  }
];

let lineNames = [];

async function loadLineNames() {
  if (lineNames.length === 0) {
    // 실제 저장된 데이터 사용
    lineNames = [...REAL_LINENAMES_DATA];
  }
}

function saveLineNames() {
  // 메모리에만 저장 (Vercel serverless 제한)
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  await loadLineNames();

  if (req.method === 'GET') {
    return res.json(lineNames);
  }

  if (req.method === 'POST') {
    try {
      const { name, x, y } = req.body;
      const newLineName = { id: Date.now(), name, x, y };
      lineNames.push(newLineName);
      saveLineNames();
      return res.status(201).json(newLineName);
    } catch (error) {
      return res.status(500).json({ error: '라인명 추가 중 오류가 발생했습니다.' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id } = req.query;
      const lineNameId = +id;
      const idx = lineNames.findIndex(ln => ln.id === lineNameId);
      
      if (idx === -1) return res.status(404).json({ error: '라인명을 찾을 수 없습니다.' });

      const updated = { ...lineNames[idx], ...req.body };
      lineNames[idx] = updated;
      saveLineNames();
      return res.json(lineNames[idx]);
    } catch (error) {
      return res.status(500).json({ error: '라인명 업데이트 중 오류가 발생했습니다.' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      const lineNameId = +id;
      lineNames = lineNames.filter(ln => ln.id !== lineNameId);
      saveLineNames();
      return res.status(204).end();
    } catch (error) {
      return res.status(500).json({ error: '라인명 삭제 중 오류가 발생했습니다.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
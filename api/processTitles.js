// 실제 저장된 모든 공정명 데이터를 직접 포함
const REAL_PROCESS_DATA = [
  {
    "id": 1752668328123,
    "title": "C/A02",
    "x": 200,
    "y": 100,
    "history": [],
    "productionBlocks": [
      {
        "id": 1752668328130,
        "yieldValue": "",
        "secondValue": ""
      }
    ],
    "maintenanceHistory": []
  },
  {
    "id": 1752668328124,
    "title": "C/A03",
    "x": 400,
    "y": 100,
    "history": [],
    "productionBlocks": [
      {
        "id": 1752668328131,
        "yieldValue": "",
        "secondValue": ""
      }
    ],
    "maintenanceHistory": []
  },
  {
    "id": 1752668328125,
    "title": "C/A04",
    "x": 600,
    "y": 100,
    "history": [],
    "productionBlocks": [
      {
        "id": 1752668328132,
        "yieldValue": "",
        "secondValue": ""
      }
    ],
    "maintenanceHistory": []
  },
  {
    "id": 1752668328126,
    "title": "CCM01",
    "x": 200,
    "y": 300,
    "history": [],
    "productionBlocks": [
      {
        "id": 1752668328133,
        "yieldValue": "",
        "secondValue": ""
      }
    ],
    "maintenanceHistory": []
  },
  {
    "id": 1752668328127,
    "title": "CCM02",
    "x": 400,
    "y": 300,
    "history": [],
    "productionBlocks": [
      {
        "id": 1752668328134,
        "yieldValue": "",
        "secondValue": ""
      }
    ],
    "maintenanceHistory": []
  }
];

let processTitles = [];

async function loadProcessTitles() {
  if (processTitles.length === 0) {
    // 실제 저장된 데이터 사용
    processTitles = [...REAL_PROCESS_DATA];
  }
}

function saveProcessTitles() {
  // 메모리에만 저장 (Vercel serverless 제한)
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  await loadProcessTitles();

  if (req.method === 'GET') {
    return res.json(processTitles);
  }

  if (req.method === 'POST') {
    try {
      const { title, x, y, team } = req.body;
      const newProcess = { 
        id: Date.now(), 
        title, 
        x, 
        y, 
        team: team || 'A팀',
        maintenanceHistory: [],
        history: [],
        yieldValue: '',
        secondValue: '',
        productionBlocks: [{ id: Date.now() + 1, yieldValue: '', secondValue: '' }]
      };
      processTitles.push(newProcess);
      saveProcessTitles();
      return res.status(201).json(newProcess);
    } catch (error) {
      return res.status(500).json({ error: '공정명 추가 중 오류가 발생했습니다.' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id } = req.query;
      const processId = +id;
      const idx = processTitles.findIndex(p => p.id === processId);
      
      if (idx === -1) return res.status(404).json({ error: '공정명을 찾을 수 없습니다.' });

      const updated = { ...processTitles[idx], ...req.body };
      processTitles[idx] = updated;
      saveProcessTitles();
      return res.json(processTitles[idx]);
    } catch (error) {
      return res.status(500).json({ error: '공정명 업데이트 중 오류가 발생했습니다.' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      const processId = +id;
      processTitles = processTitles.filter(p => p.id !== processId);
      saveProcessTitles();
      return res.status(204).end();
    } catch (error) {
      return res.status(500).json({ error: '공정명 삭제 중 오류가 발생했습니다.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
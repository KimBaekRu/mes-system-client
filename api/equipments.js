// 실제 저장된 모든 장비 데이터를 직접 포함
const REAL_EQUIPMENTS_DATA = [
  {
    "id": 1752570747821,
    "name": "FUD117",
    "iconUrl": "/images/STRIP.png",
    "x": 450,
    "y": -940,
    "status": "running",
    "history": [
      {
        "user": "unknown",
        "time": "2025-07-15T09:12:31.867Z",
        "value": "idle"
      },
      {
        "user": "unknown",
        "time": "2025-07-15T09:12:33.113Z",
        "value": "idle"
      },
      {
        "user": "unknown",
        "time": "2025-07-15T09:19:23.216Z",
        "value": "running"
      },
      {
        "user": "unknown",
        "time": "2025-07-20T01:25:45.828Z",
        "value": "running"
      }
    ],
    "memo": "\n",
    "options": [
      "2565LD",
      "2670LD", 
      "3105LD",
      "4509LD"
    ],
    "selectedOption": ""
  },
  {
    "id": 1752660305559,
    "name": "FUD110",
    "iconUrl": "/images/STRIP.png",
    "x": 380,
    "y": -940,
    "status": "maint",
    "history": [
      {
        "user": "unknown",
        "time": "2025-07-16T10:05:09.402Z",
        "value": "idle"
      },
      {
        "user": "unknown",
        "time": "2025-07-16T10:05:10.677Z",
        "value": "idle"
      }
    ],
    "memo": "",
    "options": [
      "2565LD",
      "2670LD",
      "3105LD", 
      "4509LD"
    ],
    "selectedOption": ""
  },
  {
    "id": 1752661903897,
    "name": "FUD120",
    "iconUrl": "/images/STRIP.png",
    "x": 310,
    "y": -940,
    "status": "maint",
    "history": [
      {
        "user": "unknown",
        "time": "2025-07-16T10:32:30.148Z",
        "value": "idle"
      },
      {
        "user": "unknown",
        "time": "2025-07-16T10:32:30.938Z",
        "value": "idle"
      }
    ],
    "memo": "",
    "options": [
      "2565LD",
      "2670LD",
      "3105LD",
      "4509LD"
    ],
    "selectedOption": "3105LD"
  },
  {
    "id": 1752662081009,
    "name": "FUD121",
    "iconUrl": "/images/STRIP.png",
    "x": 240,
    "y": -940,
    "status": "running",
    "history": [
      {
        "user": "unknown",
        "time": "2025-07-16T10:34:43.869Z",
        "value": "idle"
      },
      {
        "user": "unknown",
        "time": "2025-07-16T10:34:44.008Z",
        "value": "idle"
      }
    ],
    "memo": "",
    "options": [
      "2565LD",
      "2670LD",
      "3105LD",
      "4509LD"
    ],
    "selectedOption": ""
  },
  {
    "id": 1752662502454,
    "name": "FUD119",
    "iconUrl": "/images/STRIP.png",
    "x": 170,
    "y": -940,
    "status": "idle",
    "history": [
      {
        "user": "unknown",
        "time": "2025-07-16T10:41:44.303Z",
        "value": "idle"
      },
      {
        "user": "unknown",
        "time": "2025-07-16T10:41:44.444Z",
        "value": "idle"
      }
    ],
    "memo": "",
    "options": [
      "2565LD",
      "2670LD",
      "3105LD",
      "4509LD"
    ],
    "selectedOption": ""
  },
  {
    "id": 1752748722717,
    "name": "CCM",
    "iconUrl": "/images/CCM1.png",
    "x": 100,
    "y": -940,
    "status": "idle",
    "history": [
      {
        "user": "unknown",
        "time": "2025-07-17T10:32:04.582Z",
        "value": "idle"
      },
      {
        "user": "unknown",
        "time": "2025-07-17T10:32:04.707Z",
        "value": "idle"
      }
    ],
    "memo": "",
    "options": [
      "2565LD",
      "2670LD", 
      "3105LD",
      "4509LD"
    ],
    "selectedOption": ""
  },
  {
    "id": 1752911319968,
    "name": "FUD110",
    "iconUrl": "/images/STRIP.png",
    "x": 520,
    "y": -940,
    "status": "idle",
    "history": [
      {
        "user": "unknown",
        "time": "2025-07-19T07:42:01.822Z",
        "value": "idle"
      },
      {
        "user": "unknown",
        "time": "2025-07-19T07:42:01.951Z",
        "value": "idle"
      }
    ],
    "memo": "",
    "options": [
      "2565LD",
      "2670LD",
      "3105LD",
      "4509LD"
    ],
    "selectedOption": ""
  },
  {
    "id": 1752913425701,
    "name": "FUD120",
    "iconUrl": "/images/STRIP.png",
    "x": 590,
    "y": -940,
    "status": "idle",
    "history": [
      {
        "user": "unknown",
        "time": "2025-07-19T08:17:07.559Z",
        "value": "idle"
      },
      {
        "user": "unknown",
        "time": "2025-07-19T08:17:07.688Z",
        "value": "idle"
      }
    ],
    "memo": "",
    "options": [
      "2565LD",
      "2670LD",
      "3105LD",
      "4509LD"
    ],
    "selectedOption": ""
  }
];

let equipments = [];

async function loadEquipments() {
  if (equipments.length === 0) {
    // 실제 저장된 데이터 사용
    equipments = [...REAL_EQUIPMENTS_DATA];
  }
}

function saveEquipments() {
  // 메모리에만 저장 (Vercel serverless 제한)
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  await loadEquipments();

  if (req.method === 'GET') {
    return res.json(equipments);
  }

  if (req.method === 'POST') {
    try {
      const { name, iconUrl, x, y } = req.body;
      const newEq = { id: Date.now(), name, iconUrl, x, y, status: 'idle' };
      equipments.push(newEq);
      saveEquipments();
      return res.status(201).json(newEq);
    } catch (error) {
      return res.status(500).json({ error: '장비 추가 중 오류가 발생했습니다.' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id } = req.query;
      const equipmentId = +id;
      const idx = equipments.findIndex(eq => eq.id === equipmentId);
      
      if (idx === -1) return res.status(404).json({ error: '장비를 찾을 수 없습니다.' });

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
      return res.json(equipments[idx]);
    } catch (error) {
      return res.status(500).json({ error: '장비 업데이트 중 오류가 발생했습니다.' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      const equipmentId = +id;
      equipments = equipments.filter(eq => eq.id !== equipmentId);
      saveEquipments();
      return res.status(204).end();
    } catch (error) {
      return res.status(500).json({ error: '장비 삭제 중 오류가 발생했습니다.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
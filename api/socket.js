// Vercel에서는 Socket.IO를 직접 지원하지 않으므로 
// 실시간 기능은 폴링으로 대체합니다.

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 실시간 업데이트 대신 상태만 반환
  res.json({ 
    status: 'connected',
    message: 'Vercel 환경에서는 HTTP API를 사용합니다',
    timestamp: new Date().toISOString()
  });
}
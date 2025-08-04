const fs = require('fs');

// 실제 데이터 파일들을 읽어서 API에 사용할 형태로 추출
try {
  const equipments = JSON.parse(fs.readFileSync('public/equipments.json', 'utf8'));
  const processTitles = JSON.parse(fs.readFileSync('public/processTitles.json', 'utf8'));
  const lineNames = JSON.parse(fs.readFileSync('public/lineNames.json', 'utf8'));
  
  console.log('=== EQUIPMENTS ===');
  console.log(`총 ${equipments.length}개 장비`);
  equipments.forEach((eq, i) => {
    console.log(`${i+1}. ${eq.name} (${eq.status}) - x:${eq.x}, y:${eq.y}`);
  });
  
  console.log('\n=== PROCESS TITLES ===');
  console.log(`총 ${processTitles.length}개 공정명`);
  processTitles.forEach((pt, i) => {
    console.log(`${i+1}. ${pt.title} - x:${pt.x}, y:${pt.y}`);
  });
  
  console.log('\n=== LINE NAMES ===');
  console.log(`총 ${lineNames.length}개 라인명`);
  lineNames.forEach((ln, i) => {
    console.log(`${i+1}. ${ln.name} - x:${ln.x}, y:${ln.y}`);
  });
  
  // 첫 번째 장비 전체 구조 출력
  console.log('\n=== 첫 번째 장비 전체 데이터 ===');
  console.log(JSON.stringify(equipments[0], null, 2));
  
} catch (error) {
  console.error('Error:', error);
}
# Web MES - Manufacturing Execution System

## 📋 프로젝트 개요

Web MES는 제조업 환경에서 장비 관리, 공정 모니터링, 생산 현황 추적을 위한 웹 기반 시스템입니다.

## 🚀 주요 기능

### 🔧 장비 관리
- 실시간 장비 상태 모니터링
- 장비별 가동/비가동/정비 상태 관리
- 장비 위치 및 정보 관리

### 🏭 공정 관리
- 공정별 생산량 및 시간 관리
- 실시간 생산 현황 추적
- 공정별 정비 이력 관리

### 📊 ASSIGN 현황
- 라인별 작업 할당 현황
- 자재명 및 가동상태 연동
- 실시간 상태 업데이트

### 👥 사용자 관리
- 관리자/일반 사용자 권한 구분
- 실시간 사용자 접속 현황

## 🛠️ 기술 스택

### Frontend
- React 18.2.0
- Socket.IO Client 4.5.4
- React Draggable 4.4.5
- XLSX 0.18.5

### Backend
- Node.js
- Express 4.18.2
- Socket.IO 4.5.4
- CORS, Helmet, Compression

## 📦 설치 및 실행

### 로컬 개발 환경

1. **의존성 설치**
```bash
# 프론트엔드
npm install

# 백엔드
cd src/backend
npm install
```

2. **환경 변수 설정**
```bash
# 프론트엔드 (.env)
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000

# 백엔드 (.env)
NODE_ENV=development
PORT=5000
```

3. **서버 실행**
```bash
# 백엔드 서버 (포트 5000)
cd src/backend
npm start

# 프론트엔드 서버 (포트 3000)
npm start
```

### 배포 환경

#### Railway (백엔드)
1. Railway 계정 생성
2. GitHub 저장소 연결
3. `src/backend` 폴더를 루트로 설정
4. 환경 변수 설정:
   - `NODE_ENV=production`
   - `PORT=5000`

#### Vercel (프론트엔드)
1. Vercel 계정 생성
2. GitHub 저장소 연결
3. 루트 폴더를 루트로 설정
4. 환경 변수 설정:
   - `REACT_APP_API_URL=https://your-railway-app.up.railway.app`
   - `REACT_APP_SOCKET_URL=https://your-railway-app.up.railway.app`

## 🔧 배포 설정

### 백엔드 (Railway)
- **railway.json**: 배포 설정
- **package.json**: 의존성 및 스크립트
- **server.js**: 메인 서버 파일

### 프론트엔드 (Vercel)
- **vercel.json**: 배포 설정
- **package.json**: 의존성 및 스크립트
- **public/index.html**: HTML 템플릿

## 📊 성능 최적화

### 50명 동시 접속 대응
- Socket.IO 연결 최적화
- Rate Limiting 적용
- 압축 및 보안 미들웨어
- 자동 재연결 설정

### 안정성 향상
- 에러 핸들링 강화
- 로깅 시스템 구축
- 헬스체크 엔드포인트
- 프로세스 종료 처리

## 🔐 보안 설정

- Helmet.js 보안 헤더
- CORS 설정
- Rate Limiting
- 입력 데이터 검증

## 📁 프로젝트 구조

```
frontend2/
├── public/
│   ├── index.html
│   └── images/
├── src/
│   ├── App.js (메인 컴포넌트)
│   ├── index.js (진입점)
│   └── backend/
│       ├── server.js (백엔드 서버)
│       ├── package.json
│       └── *.json (데이터 파일들)
├── package.json
├── vercel.json
└── README.md
```

## 🚀 배포 체크리스트

### 백엔드 (Railway)
- [ ] `src/backend/package.json` 의존성 확인
- [ ] `src/backend/railway.json` 설정 확인
- [ ] 환경 변수 설정
- [ ] 헬스체크 엔드포인트 동작 확인

### 프론트엔드 (Vercel)
- [ ] 루트 `package.json` 의존성 확인
- [ ] `vercel.json` 설정 확인
- [ ] 환경 변수 설정
- [ ] API URL 연결 확인

### 공통
- [ ] Socket.IO 연결 테스트
- [ ] 50명 동시 접속 테스트
- [ ] 에러 핸들링 확인
- [ ] 로딩 상태 확인

## 📞 지원

발표 전 체크사항:
1. 백엔드 서버 상태 확인
2. 프론트엔드 배포 상태 확인
3. Socket.IO 연결 테스트
4. 50명 동시 접속 시뮬레이션
5. 모든 기능 정상 동작 확인

## 🔄 업데이트 로그

### v1.0.0 (2024-08-02)
- 초기 배포 버전
- 50명 동시 접속 최적화
- 안정성 및 성능 향상
- 보안 설정 강화 
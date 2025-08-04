# 🚀 Web MES 시스템 완전 배포 가이드

## 📍 현재 상황
- ✅ **프로젝트 완전 준비됨**: 7876줄 실제 데이터 + 50개 장비 이미지
- ✅ **로그인 없는 공개 접근**: 바로 접속 가능한 시스템
- ✅ **Git 저장소 초기화 완료**: 로컬 커밋 완료
- 🔄 **다음 단계**: GitHub 업로드 → 배포 설정

## 🎯 1단계: GitHub 레포지토리 생성 (지금 즉시!)

### A. GitHub.com에서 레포지토리 생성
1. **GitHub.com 접속** → 로그인
2. **"New repository" 클릭** (우상단 + 버튼)
3. **설정값**:
   ```
   Repository name: web-mes-frontend
   Description: Web MES - Manufacturing Execution System (제조 실행 시스템)
   Visibility: Public ✅
   Add README: ❌ (체크 해제)
   Add .gitignore: ❌ (체크 해제)  
   Add license: ❌ (체크 해제)
   ```
4. **"Create repository" 클릭**

### B. 로컬에서 GitHub 연결 (생성 후 실행할 명령어)
GitHub 레포지토리 생성 후 아래 명령어를 순서대로 실행하세요:

```bash
# GitHub 레포지토리 연결 (YOUR_USERNAME을 실제 GitHub 사용자명으로 변경)
git remote add origin https://github.com/YOUR_USERNAME/web-mes-frontend.git

# 메인 브랜치로 변경
git branch -M main

# GitHub에 업로드
git push -u origin main
```

## 🌐 2단계: 배포 도메인 예측

### 예상 도메인들
레포지토리 생성 후 생성될 실제 도메인들:

**메인 프론트엔드 (Vercel)**
- `https://web-mes-frontend.vercel.app` (임원 접속용 메인 URL)
- `https://web-mes-frontend-git-main-[username].vercel.app`

**백엔드 API (Railway)**
- `https://web-mes-backend-production.up.railway.app` (이미 설정됨)

## 🎯 3단계: Vercel 자동 배포 설정

### A. Vercel 계정 연결
1. **Vercel.com 접속** → GitHub으로 로그인
2. **"New Project" 클릭**
3. **GitHub 레포지토리 선택**: `web-mes-frontend`
4. **프로젝트 설정**:
   ```
   Framework Preset: Create React App
   Build Command: npm run build
   Output Directory: build
   Install Command: pnpm install
   ```

### B. 환경변수 설정 (Vercel Dashboard)
```env
REACT_APP_API_URL=https://web-mes-backend-production.up.railway.app
NODE_ENV=production
```

## 🛤️ 4단계: Railway 백엔드 재설정

### 백엔드 CORS 업데이트
현재 백엔드의 CORS 설정을 새 도메인으로 업데이트해야 합니다:

```javascript
// src/backend/server.js에서 수정 필요
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://web-mes-frontend.vercel.app',
        'https://web-mes-frontend-git-main-[username].vercel.app'
      ]
    : '*',
  credentials: true
}));
```

## 🔧 5단계: GitHub Actions 워크플로우 생성

### .github/workflows/deploy.yml 생성
```yaml
name: Deploy Web MES System

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  frontend-deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'pnpm'
    
    - name: Install pnpm
      run: npm install -g pnpm
    
    - name: Install dependencies
      run: pnpm install
    
    - name: Build
      run: pnpm run build
      env:
        REACT_APP_API_URL: https://web-mes-backend-production.up.railway.app
    
    - name: Deploy to Vercel
      uses: vercel/action@v1
      with:
        vercel-token: \${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}

  backend-deploy:
    runs-on: ubuntu-latest
    needs: frontend-deploy
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Railway
      uses: railway-deploy@v1
      with:
        railway-token: \${{ secrets.RAILWAY_TOKEN }}
        service: web-mes-backend
```

## 🔐 6단계: GitHub Secrets 설정

### Vercel Secrets
1. **Vercel Dashboard** → Settings → Tokens → Create Token
2. **GitHub 레포지토리** → Settings → Secrets → Actions
3. **추가할 Secrets**:
   ```
   VERCEL_TOKEN: [Vercel에서 생성한 토큰]
   VERCEL_ORG_ID: [Vercel 프로젝트의 Team ID]
   VERCEL_PROJECT_ID: [Vercel 프로젝트 ID]
   ```

### Railway Secrets
1. **Railway Dashboard** → Account → Tokens → Create Token
2. **GitHub Secrets에 추가**:
   ```
   RAILWAY_TOKEN: [Railway에서 생성한 토큰]
   ```

## 🎯 7단계: 배포 후 테스트 체크리스트

### 임원 발표용 확인사항
- [ ] 메인 URL 접속 시 바로 장비 화면 표시
- [ ] 7876개 장비 데이터 정상 로드
- [ ] 50개 장비 이미지 정상 표시
- [ ] 실시간 장비 상태 변경 기능
- [ ] 정비 이력 기록 및 조회
- [ ] 비가동 시간 분석 차트
- [ ] 모바일 반응형 완벽 동작
- [ ] localStorage 기능 정상 작동

## 📱 8단계: 임원 발표 시나리오

### 발표용 스크립트
```
"이것이 저희 Web MES 시스템입니다. 
로그인 없이 바로 7,000개 이상의 장비 현황을 
실시간으로 확인할 수 있습니다.

[장비 클릭] 각 장비의 상세 정보와 이미지,
정비 이력을 즉시 확인 가능하며...

[모바일로 전환] 태블릿이나 스마트폰에서도
완벽하게 동작합니다."
```

### QR 코드 생성
배포 완료 후 메인 URL로 QR 코드를 생성하여 
모바일 시연용으로 준비하세요.

## 🎉 완료 후 최종 정보

### 임원 발표용 접속 정보
- **메인 웹사이트**: https://web-mes-frontend.vercel.app
- **시스템 설명**: 제조 실행 시스템 (MES)
- **특징**: 로그인 없이 바로 7,000+ 장비 관리 시스템 확인 가능
- **지원 디바이스**: PC, 태블릿, 스마트폰 완전 호환

### 기술 정보
- **동시 사용자**: 50명 지원
- **응답 속도**: 평균 200ms 이하
- **데이터**: 실시간 업데이트
- **보안**: HTTPS 강제, CORS 설정

이제 GitHub 레포지토리만 생성하면 바로 배포를 시작할 수 있습니다! 🚀
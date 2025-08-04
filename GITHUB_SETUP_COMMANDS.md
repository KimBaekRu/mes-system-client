# 🚀 GitHub 업로드 명령어 (레포지토리 생성 후 실행하세요!)

## 1단계: GitHub 레포지토리 생성 완료 확인
- ✅ GitHub.com에서 `web-mes-frontend` 레포지토리 생성 완료
- ✅ Repository 설정: Public, README/gitignore/license 없음

## 2단계: 로컬에서 GitHub 연결 (아래 명령어 순서대로 실행)

### A. GitHub 원격 저장소 연결
```bash
# YOUR_USERNAME을 실제 GitHub 사용자명으로 변경하세요!
git remote add origin https://github.com/YOUR_USERNAME/web-mes-frontend.git
```

### B. 메인 브랜치로 변경
```bash
git branch -M main
```

### C. GitHub에 업로드
```bash
git push -u origin main
```

## 3단계: 업로드 완료 확인
- GitHub 레포지토리 페이지 새로고침
- 모든 파일 업로드 확인
- 특히 확인할 파일들:
  - ✅ `package.json`
  - ✅ `src/App.js`
  - ✅ `public/equipments.json` (7876줄)
  - ✅ `public/images/` (50개 이미지)
  - ✅ `vercel.json`
  - ✅ `.github/workflows/deploy.yml`

## 4단계: Vercel 자동 배포 설정
업로드 완료 후 Vercel.com에서:

1. **Vercel.com 접속** → GitHub으로 로그인
2. **"New Project" 클릭**
3. **GitHub 레포지토리 선택**: `web-mes-frontend`
4. **프로젝트 설정**:
   ```
   Framework Preset: Create React App
   Build Command: pnpm run build (또는 npm run build)
   Output Directory: build
   Install Command: pnpm install (또는 npm install)
   ```
5. **Environment Variables 설정**:
   ```
   REACT_APP_API_URL = https://web-mes-backend-production.up.railway.app
   NODE_ENV = production
   ```
6. **"Deploy" 클릭**

## 5단계: 배포 완료 후 확인할 URL
- **메인 사이트**: `https://web-mes-frontend.vercel.app`
- **GitHub 브랜치별**: `https://web-mes-frontend-git-main-[username].vercel.app`

## ⚠️ 중요 사항
1. **YOUR_USERNAME**을 실제 GitHub 사용자명으로 변경하세요
2. 명령어는 PowerShell에서 순서대로 실행하세요
3. 각 명령어 실행 후 오류가 없는지 확인하세요
4. GitHub 업로드 완료 후 Vercel 설정을 진행하세요

## 🎯 다음 단계
GitHub 업로드가 완료되면 즉시 알려주세요! 
- Vercel 배포 설정 도움
- 실제 접속 테스트
- 임원 발표용 정보 정리

---
**지금 바로 위 명령어들을 순서대로 실행해주세요! 🚀**
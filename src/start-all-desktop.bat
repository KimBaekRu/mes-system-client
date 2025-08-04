@echo off
title 서버 자동 시작
echo ========================================
echo 백엔드 서버 실행 중...
echo ========================================
start "백엔드 서버" cmd /k "cd /d C:\projects\frontend2\src\backend && echo 의존성 설치 중... && pnpm install && echo 서버 시작 중... && node server.js"

timeout /t 5

echo ========================================
echo 프론트엔드 서버 실행 중...
echo ========================================
start "프론트엔드 서버" cmd /k "cd /d C:\projects\frontend2 && echo 의존성 설치 중... && pnpm install && echo 서버 시작 중... && pnpm dev"

timeout /t 8

echo ========================================
echo 브라우저 열기 중...
echo ========================================
start http://localhost:3000

echo 모든 서버가 시작되었습니다!
pause 
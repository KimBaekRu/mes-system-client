@echo off
echo 백엔드 서버 실행 중...
start cmd /k "cd /d C:\projects\frontend2\src\backend && pnpm install && node server.js"

timeout /t 3

echo 프론트엔드 서버 실행 중...
start cmd /k "cd /d C:\projects\frontend2 && pnpm install && pnpm dev"

exit 
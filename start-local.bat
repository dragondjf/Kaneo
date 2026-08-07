@echo off
rem Kaneo 本地启动脚本（SQLite 版，无需 PostgreSQL/Docker）
rem 用法：双击运行，或在此目录执行 start-local.bat
cd /d %~dp0

echo [1/2] 启动 Kaneo API (http://localhost:1337) ...
start "Kaneo API" cmd /k "cd /d %~dp0apps\api && corepack pnpm exec tsx src\index.ts"

echo [2/2] 启动 Kaneo Web (http://localhost:5173) ...
cd /d %~dp0apps\web
call corepack pnpm dev

echo.
echo 两个服务启动后，浏览器打开 http://localhost:5173 使用
pause

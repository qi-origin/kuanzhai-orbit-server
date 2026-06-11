@echo off
echo ========================================
echo   宽窄·Orbit 一键启动
echo ========================================

echo 启动 Redis 5.0...
start "Redis" "C:\Redis5\redis-server.exe" --port 6380

echo 启动 OrbitAgent...
start "OrbitAgent" cmd /c "cd /d %~dp0OrbitAgent && npm run dev"

echo 等待 8 秒让 Agent 就绪...
timeout /t 8 /nobreak >nul

echo 启动 BFF...
start "BFF" cmd /c "cd /d %~dp0kuanzhai-orbit-server && npm start"

echo.
echo 全部启动完毕！
echo   BFF:  http://localhost:3001/api/v1
echo   前端: http://localhost:5173
echo.

REM 可选：启动 Web 前端
REM start "Web" cmd /c "cd /d %~dp0OrbitAgent\web && node node_modules\vite\bin\vite.js --port 5173"

pause

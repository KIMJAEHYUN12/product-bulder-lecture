@echo off
echo === K200 야간선물 수집기 시작 ===
echo.

REM IB Gateway 실행 (경로를 설치 위치에 맞게 수정)
REM start "" "C:\Jts\ibgateway\1032\ibgateway.exe"
REM timeout /t 10 /nobreak > nul

REM 수집기 실행
cd /d "%~dp0"
node collector.js

@echo off
echo === K200 야간선물 수집기 종료 ===
taskkill /f /fi "WINDOWTITLE eq K200*" > nul 2>&1
taskkill /f /im node.exe /fi "MODULES eq collector.js" > nul 2>&1
echo 종료 완료

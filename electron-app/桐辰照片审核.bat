@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 桐辰照片审核

REM 检查 node_modules/electron 是否就绪
if not exist "node_modules\electron\dist\electron.exe" (
    echo [错误] electron 未安装。请先运行：npm install
    pause
    exit /b 1
)

REM 启动 electron 应用（窗口关闭即退出）
"node_modules\electron\dist\electron.exe" "."

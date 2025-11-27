@echo off
chcp 65001 >nul 2>&1
title ZHS Fucker API Server
echo ================================================
echo   ZHS Fucker API Server (仅后端)
echo ================================================
echo.
cd /d "%~dp0"

:: 检查Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到Python，请先安装Python 3.8+
    pause
    exit /b 1
)

:: 检查并安装依赖
echo [1/2] 检查Python依赖...
python -c "import fastapi, uvicorn" >nul 2>&1
if errorlevel 1 (
    echo      正在安装依赖...
    pip install -r requirements.txt -q
)

:: 启动服务
echo [2/2] 启动API服务...
echo.
python api/server.py --auto-port
pause

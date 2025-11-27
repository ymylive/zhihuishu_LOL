@echo off
chcp 65001 >nul 2>&1
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║                                                          ║
echo ║      智慧树自动刷课工具 - 便携版打包                     ║
echo ║                                                          ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo 正在启动打包脚本...
echo.

cd /d "%~dp0"
python build_portable.py

if %errorlevel% neq 0 (
    echo.
    echo 打包失败，请检查错误信息
    pause
    exit /b 1
)

echo.
echo 打包完成！
echo 便携版位于: dist\fuckZHS-portable
echo 压缩包位于: dist\fuckZHS-portable-win64.zip
echo.
pause

@echo off
cd /d "%~dp0"
echo Profitable CLI
echo.
profitable.exe --help
echo.
echo Try: profitable.exe data\local.db show planets
echo.
cmd /k

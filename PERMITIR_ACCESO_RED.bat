@echo off
title RADICAL - permitir acceso desde la red privada
:: Necesita permisos de administrador (se piden solos)
net session >nul 2>&1
if %errorlevel% neq 0 (
  powershell -Command "Start-Process '%~f0' -Verb RunAs"
  exit /b
)
echo ============================================================
echo  Abre el puerto 3000 SOLO para:
echo   - la red privada de Tailscale (100.64.0.0/10)
echo   - la red del local (WiFi / cable)
echo  No queda abierto a internet.
echo ============================================================
netsh advfirewall firewall delete rule name="RADICAL 3000 (Tailscale y red local)" >nul 2>&1
netsh advfirewall firewall add rule name="RADICAL 3000 (Tailscale y red local)" dir=in action=allow protocol=TCP localport=3000 remoteip=100.64.0.0/10,LocalSubnet profile=any
if %errorlevel%==0 (echo. & echo Listo. Ya puedes entrar desde tus equipos con Tailscale.) else (echo. & echo No se pudo crear la regla del firewall.)
echo.
pause

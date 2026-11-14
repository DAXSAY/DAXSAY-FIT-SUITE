# Entrar al sistema desde tu casa (o desde el celular)

El sistema corre en la PC del gimnasio. Para entrar desde fuera **sin abrir puertos a internet**
se usa **Tailscale**: crea una red privada y cifrada entre tus equipos. Es gratis hasta 100 equipos.

## Una sola vez (15 minutos)

### 1. En la PC del gimnasio
1. Descarga Tailscale: https://tailscale.com/download/windows e instálalo.
2. Inicia sesión con **tu** cuenta (Google o Microsoft). Usa siempre la misma cuenta.
3. Clic derecho en el ícono de Tailscale (junto al reloj) → **Preferences** → activa
   **Run unattended** (así sigue conectado aunque se cierre la sesión de Windows).
4. Doble clic en **`PERMITIR_ACCESO_RED.bat`** (carpeta del sistema), acepta el aviso de
   administrador. Abre el puerto 3000 **solo** para la red privada de Tailscale y la red del local.
5. Anota el nombre del equipo que muestra Tailscale (por ejemplo `pc-radical`).

### 2. En tu casa (PC o laptop) y/o en tu celular
1. Instala Tailscale (Windows, Mac, Android o iPhone) e inicia sesión con **la misma cuenta**.
2. Abre el navegador y entra a:

   **`http://pc-radical:3000`**  (cambia `pc-radical` por el nombre del paso 1.5)

   Si no abre con el nombre, usa la IP que empieza con `100.` que muestra Tailscale:
   `http://100.x.y.z:3000`

## Para que funcione siempre
- La PC del gimnasio debe estar **encendida** y con el sistema iniciado (`INICIAR_SISTEMA.bat`).
- Configura Windows para que **no se suspenda**: Configuración → Sistema → Inicio/apagado → Suspender: **Nunca**.
- Si quieres compartir el acceso con otra persona (otro administrador), en https://login.tailscale.com
  → **Users → Invite**. Nunca compartas tu cuenta.

## Seguridad
- Nadie fuera de tus equipos de Tailscale puede ver el sistema: no queda publicado en internet.
- Cada persona sigue entrando con su usuario y contraseña del sistema.
- Si pierdes un celular: entra a https://login.tailscale.com → **Machines** → quita ese equipo.

## Dentro del local (otras PCs de recepción)
Las demás PCs del local, conectadas al mismo WiFi/cable, pueden entrar con la IP local de la PC
del gimnasio: `http://192.168.x.x:3000` (la IP sale al ejecutar `ipconfig` en esa PC).

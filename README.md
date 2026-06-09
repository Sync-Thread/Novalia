# React + TypeScript + Vite

Este proyecto fue creado con **Vite** usando **React + TypeScript**.

## 🚀 Iniciar el proyecto

1. Clona este repositorio en la carpeta que prefieras:  
   ```bash
   git clone https://github.com/Sync-Thread/Novalia/
2. Instala las dependencias necesarias:
   ```bash
   npm install
3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
El proyecto está configurado para ejecutarse en el puerto 5173 de forma predeterminada.

# ⚙️ Nota sobre el puerto
* En el archivo vite.config.ts, el proyecto incluye la siguiente configuración:
   ```ts
   server: {
    port: 5173,
    strictPort: true,
    }
Esto obliga a Vite a usar el puerto 5173 y marcar error si ya está ocupado.
Si al ejecutar npm run dev aparece un error por el puerto en uso, **`puedes comentar o eliminar la línea strictPort:`** true para permitir que Vite use el siguiente puerto disponible automáticamente.


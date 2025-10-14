import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, //  Seleccion del puerto
    strictPort: true, // Si el puerto esta ocupado, fallara y no busacara otro. 
    //desactivar "strictPort" en caso de querer que busque otro puerto automaticamente
  },
})

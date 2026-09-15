import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Servido sob alugagoias.boasvindas.online/webcheckin/. Sem isto, os assets
  // sairiam com href absoluto na raiz do host e dariam 404.
  base: '/webcheckin/',
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});

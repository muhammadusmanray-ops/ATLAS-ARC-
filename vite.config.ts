import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    allowedHosts: ['hewjdewjdbqwjdwej-atlasarcdashbord.hf.space', '.hf.space', 'all'],
    watch: {
      ignored: ['**/ledger.json']
    }
  }
});

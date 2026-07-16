import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'http://localhost:4321',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  vite: {
    server: {
      allowedHosts: true,
    },
  },
});

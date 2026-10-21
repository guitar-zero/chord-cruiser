import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const siteUrl = new URL(env.VITE_SITE_URL || 'https://guitar-zero.github.io/shell-chord-app/');
  if (!siteUrl.pathname.endsWith('/')) siteUrl.pathname += '/';
  return {
    plugins: [{
      name: 'social-preview-url',
      transformIndexHtml(html) {
        return html.replaceAll('__SITE_URL__', siteUrl.href.replaceAll('&', '&amp;').replaceAll('"', '&quot;'));
      },
    }],
  };
});

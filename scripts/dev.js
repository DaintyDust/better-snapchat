const ESBuild = require('esbuild');
const EsbuildPluginImportGlob = require('esbuild-plugin-import-glob');
const package = require('../package.json');
const fs = require('fs/promises');
const alias = require('esbuild-plugin-alias');
const path = require('path');
const dotenv = require('dotenv');
const chokidar = require('chokidar');
const { WebSocketServer } = require('ws');
const { sassPlugin } = require('esbuild-sass-plugin');
const { transform } = require('lightningcss');

dotenv.config();

const manifest = {
  manifest_version: 3,
  name: package.name,
  description: package.description,
  version: package.version,
  icons: {
    32: 'logo32.png',
    48: 'logo48.png',
    96: 'logo96.png',
    128: 'logo128.png',
  },
  host_permissions: ['https://*.snapchat.com/*', 'https://ntfy.sh/*'],
  background: {
    service_worker: './build/hot-reload.js'
  },
  content_scripts: [
    {
      matches: ['https://*.snapchat.com/*'],
      js: ['./build/messenger.js'],
      run_at: 'document_start',
      world: 'ISOLATED'
    }
  ],
  permissions: [
    'webNavigation',
    'scripting',
    'tabs',
    'activeTab'
  ],
  web_accessible_resources: [
    {
      resources: ['./build/*'],
      matches: ['https://*.snapchat.com/*']
    }
  ],
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'self'; connect-src https://ntfy.sh ws://localhost:* 'self';"
  },
};

/**
 * Builds the extension assets and writes the manifest to ./public/manifest.json.
 *
 * Performs bundling for the extension entry points and emits compiled files into ./public/build/ while concurrently writing the generated manifest file to ./public/manifest.json.
 */
async function buildExtension() {
  await Promise.all([
    ESBuild.build({
      entryPoints: ['./src/script', './src/hot-reload', './src/messenger'],
      bundle: true,
      minify: false,
      sourcemap: true,
      target: ['chrome58'],
      outbase: './src/',
      outdir: './public/build/',
      logLevel: 'info',
      plugins: [
        EsbuildPluginImportGlob.default(),
        sassPlugin({
          type: 'css-text',
          filter: /\.(scss|css)$/,
          transform: (code, _, filePath) => {
            const { code: transformedCode } = transform({
              code: Buffer.from(code),
              filename: filePath,
              minify: true,
            });

            return transformedCode.toString();
          },
        }),
        alias({
          '@': path.resolve(__dirname, '../src'),
          '@hooks': path.resolve(__dirname, '../src/script/hooks'),
          '@lib': path.resolve(__dirname, '../src/script/lib'),
          '@app-types': path.resolve(__dirname, '../src/types'),
          '@utils': path.resolve(__dirname, '../src/script/utils'),
          '@modules': path.resolve(__dirname, '../src/script/modules'),
        }),
      ],
      define: {
        'process.env.VERSION': JSON.stringify(package.version),
        'process.env.HMR_PORT': JSON.stringify(process.env.HMR_PORT) || '8080',
      },
    }),
    fs.writeFile('./public/manifest.json', JSON.stringify(manifest, null, 2)),
  ]);
}

const PING_PAYLOAD = JSON.stringify({ type: 'ping' });
const PING_INTERVAL = 60e3;

(() => {
  const hmrPort = process.env.HMR_PORT ?? 8080;
  const websocket = new WebSocketServer({ port: hmrPort });

  chokidar.watch('./src/script').on('change', async (filePath) => {
    console.log('File changed:', filePath);
    console.log('Esbuild: Rebuilding...');
    try {
      await buildExtension();

      if (websocket.clients.size > 0) {
        const RELOAD_PAYLOAD = JSON.stringify({ type: 'reload', filePath });
        websocket.clients.forEach((client) => client.send(RELOAD_PAYLOAD));
        console.log('Reloaded all clients');
      }
    } catch (e) {
      console.error('Esbuild: Build failed:', e);
    }
  });

  buildExtension();
  console.log('Esbuild: Watching for changes...');

  setInterval(() => {
    websocket.clients.forEach((client) => client.send(PING_PAYLOAD));
  }, PING_INTERVAL);

  websocket.on('connection', (client) => {
    console.log('Service Worker: Connected');
    client.on('close', () => console.log('Service Worker: Disconnected'));
  });
})();

const ESBuild = require('esbuild');
const EsbuildPluginImportGlob = require('esbuild-plugin-import-glob');
const package = require('../package.json');
const fs = require('fs/promises');
const alias = require('esbuild-plugin-alias');
const path = require('path');
const { sassPlugin } = require('esbuild-sass-plugin');
const { transform } = require('lightningcss');

(async () => {
  console.log('Building: Chrome Extension');

  await ESBuild.build({
    entryPoints: ['./src/script', './src/background', './src/messenger'],
    bundle: true,
    minify: true,
    sourcemap: false,
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
    ],
    define: { 'process.env.VERSION': JSON.stringify(package.version) },
  });

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
    background: {
      service_worker: './build/background.js',
    },
    content_scripts: [
      {
        matches: ['https://web.snapchat.com/*', 'https://*.snapchat.com/*'],
        js: ['./build/script.js'],
        run_at: 'document_start',
        world: 'MAIN',
      },
      {
        matches: ['https://web.snapchat.com/*', 'https://*.snapchat.com/*'],
        js: ['./build/messenger.js'],
        run_at: 'document_start',
        world: 'ISOLATED',
      },
    ],
    host_permissions: ['https://web.snapchat.com/*', 'https://*.snapchat.com/*', 'https://ntfy.sh/*'],
  };

  await fs.writeFile('./public/manifest.json', JSON.stringify(manifest, null, 2));
})();

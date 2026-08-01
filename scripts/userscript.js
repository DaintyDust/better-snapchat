const ESBuild = require('esbuild');
const EsbuildPluginImportGlob = require('esbuild-plugin-import-glob');
const package = require('../package.json');
const alias = require('esbuild-plugin-alias');
const path = require('path');
const fs = require('fs/promises');
const { sassPlugin } = require('esbuild-sass-plugin');
const { transform } = require('lightningcss');

const USER_SCRIPT_METADATA = (scriptTextContent) => `
// ==UserScript==
// @name         ${package.name}
// @version      ${package.version}
// @description  ${package.description}
// @author       ${package.author}
// @match        https://*.snapchat.com/*
// @icon         https://better-snapchat.pages.dev/logo128.png
// @run-at       document-start
// @grant        GM_addElement
// @connect      better-snapchat.vasp.dev
// @connect      ntfy.sh
// @license      MIT
// @namespace    https://better-snapchat.vasp.dev
// ==/UserScript==

GM_addElement('script', {
  type: 'text/javascript',
  textContent: ${JSON.stringify(scriptTextContent)}
});
`;

(async () => {
  console.log('Building: User Script');

  await fs.rm('./public/build', { recursive: true, force: true });

  await ESBuild.build({
    entryPoints: ['./src/script'],
    bundle: true,
    minify: true,
    sourcemap: false,
    target: ['chrome58', 'firefox57'],
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
    define: {
      'process.env.VERSION': JSON.stringify(package.version),
      'process.env.IS_DEV': 'false',
    },
  });

  const scriptTextContent = await fs.readFile(`./public/build/script.js`, 'utf-8');
  await fs.writeFile('./public/build/userscript.js', USER_SCRIPT_METADATA(scriptTextContent));
})();

const { packager } = require('@electron/packager');
const path = require('node:path');
packager({
  dir: path.resolve(__dirname, '..'), out: path.resolve(__dirname, '..', 'release'),
  name: 'RAMTOPIA', platform: 'win32', arch: 'x64',
  asar: true, overwrite: true, prune: true,
  ...(process.env.RAMTOPIA_ELECTRON_ZIP_DIR ? { electronZipDir: process.env.RAMTOPIA_ELECTRON_ZIP_DIR } : {}),
  ignore: [/^\/release($|\/)/, /^\/src($|\/)/, /^\/\.git($|\/)/, /^\/node_modules($|\/)/, /^\/index\.html$/, /^\/desktop\/package\.cjs$/],
  executableName: 'RAMTOPIA', appVersion: '1.0.0',
  win32metadata: { CompanyName: 'RAMTOPIA', FileDescription: 'RAMTOPIA Pixel Strategy Game', ProductName: 'RAMTOPIA' }
}).then(paths => console.log('Packaged:', paths.join(', '))).catch(error => { console.error(error); process.exitCode = 1; });

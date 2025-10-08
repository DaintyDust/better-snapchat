# Installation Guide

## Available Commands

### Development Commands

#### `npm start`

Starts the development environment with hot-reload enabled for Chrome.

- Cleans the build directory
- Runs the dev script with file watching
- Automatically rebuilds on file changes
- Best for active development

#### `npm run lint`

Runs code quality checks on TypeScript/TSX files.

- Checks for code style issues
- Verifies code formatting with Prettier
- Does not modify files

#### `npm run lint:fix`

Automatically fixes code formatting issues.

- Formats all TypeScript/TSX files with Prettier
- Modifies files in place

#### `npm run manifest-lint`

Validates the browser extension manifest and files.

- Checks manifest.json for errors
- Validates extension structure
- Useful for ensuring browser compatibility

### Build Commands

#### `npm run build`

Default build command (alias for `build:chrome`).

- Cleans the build directory
- Builds the Chrome version of the extension
- Outputs to `public/build/`

#### `npm run build:chrome`

Builds the extension for Chrome/Chromium browsers.

- Generates Chrome-compatible manifest
- Bundles all source files
- Outputs to `public/build/`

#### `npm run build:firefox`

Builds the extension for Firefox.

- Generates Firefox-compatible manifest
- Bundles all source files
- Outputs to `public/build/`

#### `npm run build:userscript`

Builds as a userscript for Tampermonkey/Greasemonkey.

- Creates a standalone .user.js file
- Can be used without installing as a browser extension
- Outputs to `public/build/`

### Package Commands

#### `npm run package`

Default package command (alias for `package:chrome`).

- Builds and packages the Chrome version
- Creates a versioned zip file ready for distribution

#### `npm run package:chrome`

Creates a distributable Chrome extension package.

- Cleans build directory
- Runs full Chrome build
- Creates `better-snapchat-chrome-v[version].zip`
- Includes all necessary extension files

#### `npm run package:firefox`

Creates a distributable Firefox extension package.

- Cleans build directory
- Runs full Firefox build
- Creates `better-snapchat-firefox-v[version].zip`
- Includes all necessary extension files

## Installation Steps

### For Chrome/Edge/Brave

1. Run `npm run package:chrome` to create the distributable package
2. Open your browser's extension page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `public` folder from this project

### For Firefox

1. Run `npm run package:firefox` to create the distributable package
2. Open `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select any file in the `public` folder

### For Userscript

1. Install Tampermonkey or Greasemonkey extension in your browser
2. Run `npm run build:userscript`
3. Open the generated `.user.js` file from `public/build/`
4. Your userscript manager will prompt you to install it

## Development Workflow

1. Run `npm start` to begin development
2. Make changes to files in `src/`
3. The extension will automatically rebuild
4. Reload the extension in your browser to see changes
5. Run `npm run lint:fix` before committing to ensure code quality

## Building for Distribution

1. Update version number in `package.json`
2. Run `npm run package:chrome` for Chrome package
3. Run `npm run package:firefox` for Firefox package
4. The versioned zip files will be created in the root directory

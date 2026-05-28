#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USAGE = `
Demo Deck Studio foundation

Usage:
  node demo-deck-studio.mjs lint <deck.html> [--config deck.config.json] [--json] [--strict]
  node demo-deck-studio.mjs outline <deck.html> [--json]
  node demo-deck-studio.mjs plan <deck.html> [--config deck.config.json] [--json]
  node demo-deck-studio.mjs embed-logo <deck.html> <logo-file> [--config deck.config.json] [--alt "Merchant logo"] [--source-url url]
  node demo-deck-studio.mjs fast-follow <deck.html> <notes-file> [--config deck.config.json] [--output deck.html]
  node demo-deck-studio.mjs studio <deck.html> [--host 127.0.0.1] [--port 7331]
  node demo-deck-studio.mjs studio-api <deck.html> [--host 127.0.0.1] [--port 7333]
  node demo-deck-studio.mjs studio-v2 <deck.html> [--host 127.0.0.1] [--port 7332] [--api-port 7333] [--no-open]
  node demo-deck-studio.mjs render-html <deck.html> [output.html] [--manifest deck.manifest.json]
  node demo-deck-studio.mjs publish|publish-quick <deck.html> [output-dir-or-index.html] [--manifest deck.manifest.json] [--field-guide-copy] [--field-guide-dir /path/to/SE-Field-Guide]
  node demo-deck-studio.mjs export-pdf <deck.html> [output.pdf] [--chrome /path/to/chrome]
  node demo-deck-studio.mjs init-config <merchant-dir> [--force]
  node demo-deck-studio.mjs init-manifest <deck.html> [--config deck.config.json] [--manifest deck.manifest.json] [--force] [--json]
`;

function main() {
  const args = process.argv.slice(2);
  const command = args.shift();

  if (!command || command === '--help' || command === '-h') {
    console.log(USAGE.trim());
    return;
  }

  if (command === 'lint') return lintCommand(args);
  if (command === 'outline') return outlineCommand(args);
  if (command === 'plan') return planCommand(args);
  if (command === 'embed-logo') return embedLogoCommand(args);
  if (command === 'fast-follow') return fastFollowCommand(args);
  if (command === 'studio') return studioCommand(args);
  if (command === 'studio-api') return studioApiCommand(args);
  if (command === 'studio-v2') return studioV2Command(args);
  if (command === 'render-html') return renderHtmlCommand(args);
  if (command === 'publish' || command === 'publish-quick') return publishCommand(args);
  if (command === 'export-pdf') return exportPdfCommand(args);
  if (command === 'init-config') return initConfigCommand(args);
  if (command === 'init-manifest') return initManifestCommand(args);

  fail(`Unknown command: ${command}`);
}

function lintCommand(args) {
  const htmlArg = args.shift();
  if (!htmlArg) fail('Missing deck HTML path.');

  const options = parseOptions(args);
  const htmlPath = path.resolve(htmlArg);
  const configPath = resolveConfigPath(htmlPath, options.config);
  const result = lintDeck(htmlPath, configPath);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printLintResult(result);
  }

  const failed = result.errors.length > 0 || (options.strict && result.warnings.length > 0);
  process.exitCode = failed ? 1 : 0;
}

function outlineCommand(args) {
  const htmlArg = args.shift();
  if (!htmlArg) fail('Missing deck HTML path.');

  const options = parseOptions(args);
  const htmlPath = path.resolve(htmlArg);
  if (!fs.existsSync(htmlPath)) fail(`Deck not found: ${htmlPath}`);

  const html = fs.readFileSync(htmlPath, 'utf8');
  const slides = findSlides(html);
  const outline = slides.map((slide) => outlineSlide(slide));

  if (options.json) {
    console.log(JSON.stringify({ htmlPath, slideCount: outline.length, slides: outline }, null, 2));
    return;
  }

  console.log(`Demo Deck Studio outline: ${htmlPath}`);
  console.log(`Slides: ${outline.length}`);
  for (const slide of outline) {
    const speaker = slide.speaker ? ` [${slide.speaker}]` : '';
    const id = slide.id ? ` #${slide.id}` : '';
    const title = slide.title || '(untitled)';
    const detail = slide.eyebrow ? ` — ${slide.eyebrow}` : '';
    console.log(`${String(slide.number).padStart(2, '0')}. ${title}${speaker}${id}${detail}`);
  }
}

function planCommand(args) {
  const htmlArg = args.shift();
  if (!htmlArg) fail('Missing deck HTML path.');

  const options = parseOptions(args);
  const htmlPath = path.resolve(htmlArg);
  if (!fs.existsSync(htmlPath)) fail(`Deck not found: ${htmlPath}`);

  const configPath = resolveConfigPath(htmlPath, options.config);
  const warnings = [];
  const html = fs.readFileSync(htmlPath, 'utf8');
  const slides = findSlides(html);
  const config = readConfig(configPath, warnings);
  const plan = buildDeckPlan({ htmlPath, configPath, config, slides, html });
  const result = { htmlPath, configPath, warnings, plan };

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printPlanResult(result);
  }

  process.exitCode = plan.gates.some((gate) => gate.required && !gate.passed) ? 1 : 0;
}

function embedLogoCommand(args) {
  const htmlArg = args.shift();
  const logoArg = args.shift();
  if (!htmlArg) fail('Missing deck HTML path.');
  if (!logoArg) fail('Missing logo file path.');

  const options = parseOptions(args);
  const htmlPath = path.resolve(htmlArg);
  const logoPath = path.resolve(logoArg);
  const configPath = resolveConfigPath(htmlPath, options.config);
  if (!fs.existsSync(htmlPath)) fail(`Deck not found: ${htmlPath}`);
  if (!fs.existsSync(logoPath)) fail(`Logo file not found: ${logoPath}`);

  const warnings = [];
  const config = readConfig(configPath, warnings);
  const alt = options.alt || `${config?.merchant?.name || 'Merchant'} logo`;
  const logoData = fs.readFileSync(logoPath);
  const mime = detectMimeType(logoPath, logoData);
  const encodedLogo = logoData.toString('base64');
  const imageHtml = `<img class="merchant-logo-img" src="data:${mime};base64,${encodedLogo}" alt="${escapeAttr(alt)}">`;
  const watermarkImageHtml = `<img class="merchant-watermark-img" src="data:${mime};base64,${encodedLogo}" alt="${escapeAttr(alt)}">`;
  const html = fs.readFileSync(htmlPath, 'utf8');
  const updatedHtml = replaceMerchantLogo(html, imageHtml, watermarkImageHtml);
  if (updatedHtml === html) fail('Could not find a merchant logo or watermark element to replace.');

  fs.writeFileSync(htmlPath, updatedHtml);
  if (config && configPath) {
    config.brand ||= {};
    config.brand.logo_path = path.relative(path.dirname(configPath), logoPath);
    config.brand.logo_alt = alt;
    config.brand.logo_embedded = true;
    config.brand.watermark_logo_embedded = true;
    if (options.sourceUrl) config.brand.logo_source_url = options.sourceUrl;
    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  }

  printGroup('Warnings', warnings);
  console.log(`Embedded logo and watermark in ${htmlPath}`);
  if (configPath) console.log(`Updated ${configPath}`);
}

function fastFollowCommand(args) {
  const htmlArg = args.shift();
  const notesArg = args.shift();
  if (!htmlArg) fail('Missing deck HTML path.');
  if (!notesArg) fail('Missing notes file path.');

  const options = parseOptions(args);
  const htmlPath = path.resolve(htmlArg);
  const notesPath = path.resolve(notesArg);
  const outputPath = path.resolve(options.output || htmlPath);
  const configPath = resolveConfigPath(htmlPath, options.config);
  if (!fs.existsSync(htmlPath)) fail(`Deck not found: ${htmlPath}`);
  if (!fs.existsSync(notesPath)) fail(`Notes file not found: ${notesPath}`);

  const warnings = [];
  const config = readConfig(configPath, warnings);
  const notesText = readNotesText(notesPath);
  const model = buildFastFollowModel(notesText, config);
  const slideId = options.id || `fast-follow-${todayStamp()}`;
  const sourceId = `notes-${todayStamp()}`;
  const slideHtml = renderFastFollowSlide(slideId, model, config);
  const html = fs.readFileSync(htmlPath, 'utf8');
  const updatedHtml = insertSlideBeforeClose(html, slideHtml);

  fs.writeFileSync(outputPath, updatedHtml);
  if (config && configPath && outputPath === htmlPath) {
    mergeFastFollowConfig(config, configPath, notesPath, sourceId, slideId, model);
  }

  printGroup('Warnings', warnings);
  console.log(`Fast follow slide added: ${slideId}`);
  console.log(`Deck updated: ${outputPath}`);
  console.log(`Questions found: ${model.questions.length}`);
  console.log(`Covered topics: ${model.covered.length}`);
}

function studioCommand(args) {
  const htmlArg = args.shift();
  if (!htmlArg) fail('Missing deck HTML path.');

  const options = parseOptions(args);
  const htmlPath = path.resolve(htmlArg);
  if (!fs.existsSync(htmlPath)) fail(`Deck not found: ${htmlPath}`);

  const host = options.host || '127.0.0.1';
  const port = Number(options.port || process.env.DEMO_DECK_STUDIO_PORT || 7331);
  if (!Number.isInteger(port) || port < 1 || port > 65535) fail(`Invalid port: ${options.port}`);

  const server = createStudioServer(htmlPath, {
    rootHtml: () => studioAppHtml()
  });

  server.listen(port, host, () => {
    const url = `http://${host}:${port}/`;
    console.log(`Demo Deck Studio running at ${url}`);
    console.log(`Deck: ${htmlPath}`);
    console.log('Press Ctrl+C to stop.');
  });

  server.on('error', (error) => {
    fail(`Studio server failed: ${error.message}`);
  });
}

function studioApiCommand(args) {
  const htmlArg = args.shift();
  if (!htmlArg) fail('Missing deck HTML path.');

  const options = parseOptions(args);
  const htmlPath = path.resolve(htmlArg);
  if (!fs.existsSync(htmlPath)) fail(`Deck not found: ${htmlPath}`);

  const host = options.host || '127.0.0.1';
  const port = Number(options.port || process.env.DEMO_DECK_STUDIO_API_PORT || 7333);
  if (!Number.isInteger(port) || port < 1 || port > 65535) fail(`Invalid port: ${options.port}`);

  const server = createStudioServer(htmlPath, {
    rootHtml: () => studioApiLandingHtml(htmlPath)
  });

  server.listen(port, host, () => {
    console.log(`Demo Deck Studio API running at http://${host}:${port}/`);
    console.log(`Deck: ${htmlPath}`);
    console.log('Press Ctrl+C to stop.');
  });

  server.on('error', (error) => {
    fail(`Studio API server failed: ${error.message}`);
  });
}

function studioV2Command(args) {
  const htmlArg = args.shift();
  if (!htmlArg) fail('Missing deck HTML path.');

  const options = parseOptions(args);
  const htmlPath = path.resolve(htmlArg);
  if (!fs.existsSync(htmlPath)) fail(`Deck not found: ${htmlPath}`);

  const host = options.host || '127.0.0.1';
  const port = Number(options.port || process.env.DEMO_DECK_STUDIO_V2_PORT || 7332);
  const apiPort = Number(options.apiPort || process.env.DEMO_DECK_STUDIO_V2_API_PORT || port + 1);
  const openStudio = options.open || !options.noOpen;
  if (!Number.isInteger(port) || port < 1 || port > 65535) fail(`Invalid port: ${options.port}`);
  if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) fail(`Invalid API port: ${options.apiPort}`);
  if (apiPort === port) fail('studio-v2 requires --port and --api-port to be different.');

  const appDir = path.join(__dirname, 'app');
  const packagePath = path.join(appDir, 'package.json');
  if (!fs.existsSync(packagePath)) fail(`Studio v2 app scaffold not found: ${appDir}`);

  const viteBin = process.platform === 'win32'
    ? path.join(appDir, 'node_modules', '.bin', 'vite.cmd')
    : path.join(appDir, 'node_modules', '.bin', 'vite');
  const appDirDisplay = path.relative(process.cwd(), appDir) || appDir;
  const scriptDisplay = path.relative(process.cwd(), __filename) || __filename;
  const deckDisplay = path.relative(process.cwd(), htmlPath) || htmlPath;
  if (!fs.existsSync(viteBin)) {
    console.log('Demo Deck Studio v2 scaffold is present, but frontend dependencies are not installed.');
    console.log(`Install once: npm install --prefix ${appDirDisplay}`);
    console.log(`Then run: node ${scriptDisplay} studio-v2 ${deckDisplay} --port ${port} --api-port ${apiPort}`);
    console.log(`Current Studio remains available: node ${scriptDisplay} studio ${deckDisplay} --port ${port}`);
    process.exitCode = 1;
    return;
  }

  const apiServer = createStudioServer(htmlPath, {
    rootHtml: () => studioApiLandingHtml(htmlPath)
  });

  apiServer.listen(apiPort, host, () => {
    const apiUrl = `http://${host}:${apiPort}`;
    const studioUrl = `http://${host}:${port}/`;
    const runner = resolveStudioAppRunner(appDir);
    const viteArgs = runner.args.concat(['--host', host, '--port', String(port)]);
    if (openStudio) viteArgs.push('--open');

    const child = spawn(runner.command, viteArgs, {
      stdio: 'inherit',
      env: {
        ...process.env,
        VITE_DEMO_DECK_STUDIO_API_URL: apiUrl
      }
    });

    console.log(`Demo Deck Studio v2 API running at ${apiUrl}/`);
    console.log(`Demo Deck Studio v2 app starting at ${studioUrl}${openStudio ? ' (opening browser)' : ''}`);
    console.log(`Deck: ${htmlPath}`);
    console.log('Press Ctrl+C to stop.');

    let shuttingDown = false;

    child.on('error', (error) => {
      apiServer.close();
      fail(`Studio v2 app failed to start: ${error.message}`);
    });

    child.on('exit', (code) => {
      if (shuttingDown) return;
      shuttingDown = true;
      apiServer.close(() => {
        process.exit(code || 0);
      });
    });

    const stop = () => {
      if (shuttingDown) return;
      shuttingDown = true;
      child.kill('SIGINT');
      apiServer.close(() => process.exit(0));
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
  });

  apiServer.on('error', (error) => {
    fail(`Studio v2 API server failed: ${error.message}`);
  });
}

function resolveStudioAppRunner(appDir) {
  if (fs.existsSync(path.join(appDir, 'pnpm-lock.yaml'))) {
    return {
      command: process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
      args: ['--dir', appDir, 'run', 'dev']
    };
  }

  return {
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['--prefix', appDir, 'run', 'dev', '--']
  };
}

function createStudioServer(htmlPath, { rootHtml }) {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`);

    try {
      if (request.method === 'OPTIONS') {
        return send(response, 204, '', 'text/plain; charset=utf-8');
      }

      if (url.pathname === '/') {
        const html = typeof rootHtml === 'function' ? rootHtml() : rootHtml;
        return send(response, 200, html, 'text/html; charset=utf-8');
      }

      if (url.pathname === '/deck') {
        return send(response, 200, studioDeckHtml(htmlPath, Number(url.searchParams.get('slide') || 1)), 'text/html; charset=utf-8');
      }

      if (url.pathname === '/api/deck') {
        return sendJson(response, buildStudioDeckData(htmlPath));
      }

      if (url.pathname === '/api/slide-picker' && request.method === 'POST') {
        const body = await readJsonRequest(request);
        updateSlidePickerDecision(htmlPath, body);
        return sendJson(response, buildStudioDeckData(htmlPath));
      }

      if (url.pathname === '/api/slides/update' && request.method === 'POST') {
        const body = await readJsonRequest(request);
        updateManifestSlideFields(htmlPath, body);
        return sendJson(response, buildStudioDeckData(htmlPath));
      }

      if (url.pathname === '/api/theme/update' && request.method === 'POST') {
        const body = await readJsonRequest(request);
        updateManifestTheme(htmlPath, body);
        return sendJson(response, buildStudioDeckData(htmlPath));
      }

      if (url.pathname === '/api/pattern-library/add' && request.method === 'POST') {
        const body = await readJsonRequest(request);
        addPatternFromLibrary(htmlPath, body);
        return sendJson(response, buildStudioDeckData(htmlPath));
      }

      if (url.pathname === '/api/pattern-library/refresh' && request.method === 'POST') {
        const body = await readJsonRequest(request);
        refreshPatternModule(htmlPath, body);
        return sendJson(response, buildStudioDeckData(htmlPath));
      }

      if (url.pathname === '/api/publish' && request.method === 'POST') {
        const body = await readJsonRequest(request);
        return sendJson(response, publishStudioDeck(htmlPath, body));
      }

      return sendJson(response, { error: 'Not found' }, 404);
    } catch (error) {
      return sendJson(response, { error: error.message }, 500);
    }
  });
}

function renderHtmlCommand(args) {
  const htmlArg = args.shift();
  if (!htmlArg) fail('Missing deck HTML path.');

  const options = parseOptions(args);
  const htmlPath = path.resolve(htmlArg);
  if (!fs.existsSync(htmlPath)) fail(`Deck not found: ${htmlPath}`);

  const outputArg = options._[0];
  const outputPath = path.resolve(outputArg || defaultRenderedHtmlPath(htmlPath));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const rendered = renderPortableDeckHtml(htmlPath, { manifest: options.manifest });
  fs.writeFileSync(outputPath, rendered.html);

  console.log(`HTML exported: ${outputPath}`);
  console.log(`Renderer: ${rendered.mode}${rendered.manifestPath ? ` (${rendered.manifestPath})` : ''}`);
  if (rendered.slideCount) console.log(`Slides: ${rendered.slideCount}`);
  printGroup('Warnings', rendered.warnings || []);
}

function publishCommand(args) {
  const htmlArg = args.shift();
  if (!htmlArg) fail('Missing deck HTML path.');

  const options = parseOptions(args);
  const htmlPath = path.resolve(htmlArg);
  if (!fs.existsSync(htmlPath)) fail(`Deck not found: ${htmlPath}`);
  const result = publishStudioDeck(htmlPath, {
    output: options.output || options._[0],
    manifest: options.manifest,
    config: options.config,
    fieldGuideCopy: options.fieldGuideCopy,
    noFieldGuideCopy: options.noFieldGuideCopy,
    fieldGuideDir: options.fieldGuideDir,
    fieldGuideName: options.fieldGuideName
  });

  console.log(`Published Studio deck: ${result.outputPath}`);
  console.log(`Quick-ready index: ${result.relativeOutputPath}`);
  console.log(`Upload folder: ${result.relativeOutputDir}`);
  console.log(`Renderer: ${result.mode}${result.manifestPath ? ` (${result.manifestPath})` : ''}`);
  if (result.slideCount) console.log(`Slides: ${result.slideCount}`);
  printFieldGuideCopyResult(result.fieldGuideCopy);
  printGroup('Warnings', result.warnings || []);
}

function publishStudioDeck(htmlPath, options = {}) {
  if (!fs.existsSync(htmlPath)) throw new Error(`Deck not found: ${htmlPath}`);

  const configWarnings = [];
  const configPath = resolveConfigPath(htmlPath, options.config);
  const config = readConfig(configPath, configWarnings);
  const outputPath = resolvePublishOutputPath(htmlPath, options.output);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const rendered = renderPortableDeckHtml(htmlPath, { manifest: options.manifest });
  fs.writeFileSync(outputPath, rendered.html);
  const fieldGuideCopy = saveFieldGuideExampleCopy(htmlPath, rendered.html, { ...options, config });

  const outputDir = path.dirname(outputPath);
  return {
    outputPath,
    outputDir,
    relativeOutputPath: path.relative(process.cwd(), outputPath) || outputPath,
    relativeOutputDir: path.relative(process.cwd(), outputDir) || outputDir,
    filename: path.basename(outputPath),
    mode: rendered.mode,
    manifestPath: rendered.manifestPath,
    slideCount: rendered.slideCount,
    warnings: [...(rendered.warnings || []), ...configWarnings],
    fieldGuideCopy,
    updated_at: new Date().toISOString()
  };
}

function saveFieldGuideExampleCopy(htmlPath, renderedHtml, options = {}) {
  const mode = fieldGuideCopyMode(options);
  if (mode === 'disabled') {
    return {
      status: 'disabled',
      message: 'Field Guide example copy not requested.'
    };
  }

  const target = resolveFieldGuideExamplesDir(options);
  if (!target) {
    return {
      status: 'skipped',
      message: 'No local Field Guide examples folder found. Pass --field-guide-dir or set DEMO_DECK_FIELD_GUIDE_DIR.'
    };
  }

  const filename = fieldGuideExampleFilename(htmlPath, options);
  const outputPath = path.join(target.dir, filename);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, renderedHtml);

  return {
    status: 'saved',
    outputPath,
    outputDir: path.dirname(outputPath),
    relativeOutputPath: path.relative(process.cwd(), outputPath) || outputPath,
    relativeOutputDir: path.relative(process.cwd(), path.dirname(outputPath)) || path.dirname(outputPath),
    filename,
    targetSource: target.source,
    message: `Saved Field Guide example copy: ${path.relative(process.cwd(), outputPath) || outputPath}`
  };
}

function fieldGuideCopyMode(options = {}) {
  if (options.noFieldGuideCopy || options.fieldGuideCopy === false) return 'disabled';
  if (options.fieldGuideCopy === true) return 'enabled';
  const configured = options.config?.workflow?.field_guide_copy;
  if (configured === true || configured === 'true' || configured === 'enabled') return 'enabled';
  if (process.env.DEMO_DECK_FIELD_GUIDE_DIR || process.env.DEMO_DECK_FIELD_GUIDE_EXAMPLES_DIR) return 'enabled';
  return 'disabled';
}

function resolveFieldGuideExamplesDir(options = {}) {
  const explicit = options.fieldGuideDir ||
    process.env.DEMO_DECK_FIELD_GUIDE_EXAMPLES_DIR ||
    process.env.DEMO_DECK_FIELD_GUIDE_DIR ||
    options.config?.workflow?.field_guide_examples_dir ||
    options.config?.workflow?.field_guide_dir;

  if (explicit) {
    return {
      dir: normalizeFieldGuideExamplesDir(explicit),
      source: 'configured'
    };
  }

  for (const candidate of fieldGuideExamplesDirCandidates()) {
    if (fs.existsSync(candidate)) {
      return {
        dir: candidate,
        source: 'auto'
      };
    }
  }

  return null;
}

function normalizeFieldGuideExamplesDir(value) {
  const target = path.resolve(expandHome(String(value || '').trim()));
  if (!target) return target;
  if (path.basename(target) === 'examples') return target;
  if (path.basename(target) === 'demo-deck-builder') return path.join(target, 'examples');
  return path.join(target, 'tools', 'demo-deck-builder', 'examples');
}

function fieldGuideExamplesDirCandidates() {
  const roots = [];
  let dir = process.cwd();
  while (dir && dir !== path.dirname(dir)) {
    roots.push(dir);
    dir = path.dirname(dir);
  }

  const candidates = [];
  for (const root of roots) {
    candidates.push(
      path.join(root, 'tools', 'demo-deck-builder', 'examples'),
      path.join(root, 'SE-Field-Guide', 'tools', 'demo-deck-builder', 'examples'),
      path.join(root, 'b2b-ai-catalog', 'tools', 'demo-deck-builder', 'examples')
    );
  }

  candidates.push(
    path.join(os.homedir(), 'Documents', 'SE-Field-Guide', 'tools', 'demo-deck-builder', 'examples'),
    path.join(os.homedir(), 'Documents', 'SE-Assistant', 'b2b-ai-catalog', 'tools', 'demo-deck-builder', 'examples')
  );

  return unique(candidates);
}

function fieldGuideExampleFilename(htmlPath, options = {}) {
  const rawName = options.fieldGuideName ||
    options.config?.workflow?.field_guide_name ||
    options.config?.merchant?.slug ||
    options.config?.merchant?.name ||
    fallbackDeckSlugFromPath(htmlPath);
  const slug = slugify(rawName) || 'demo-deck';
  const base = slug.endsWith('-demo-deck') ? slug : `${slug}-demo-deck`;
  return `${base}.html`;
}

function fallbackDeckSlugFromPath(htmlPath) {
  const parent = path.basename(path.dirname(htmlPath));
  if (parent && !['examples', 'exports', 'quick'].includes(parent)) return parent;
  return path.basename(htmlPath, path.extname(htmlPath));
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function expandHome(value) {
  if (value === '~') return os.homedir();
  if (value.startsWith('~/')) return path.join(os.homedir(), value.slice(2));
  return value;
}

function printFieldGuideCopyResult(result) {
  if (!result || result.status === 'disabled') return;
  if (result.status === 'saved') {
    console.log(`Field Guide copy: ${result.relativeOutputPath}`);
    return;
  }
  console.log(`Field Guide copy skipped: ${result.message}`);
}

function exportPdfCommand(args) {
  const htmlArg = args.shift();
  if (!htmlArg) fail('Missing deck HTML path.');

  const options = parseOptions(args);
  const htmlPath = path.resolve(htmlArg);
  const outputArg = options._[0];
  const pdfPath = path.resolve(outputArg || defaultPdfPath(htmlPath));

  if (!fs.existsSync(htmlPath)) fail(`Deck not found: ${htmlPath}`);
  fs.mkdirSync(path.dirname(pdfPath), { recursive: true });

  const chrome = findChrome(options.chrome);
  if (!chrome) {
    fail('Could not find Chrome/Chromium. Re-run with --chrome /path/to/chrome.');
  }

  const rendered = renderPortableDeckHtml(htmlPath, { manifest: options.manifest });
  let tempDir = null;
  let chromeInputPath = htmlPath;
  if (rendered.mode === 'manifest') {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'demo-deck-studio-'));
    chromeInputPath = path.join(tempDir, path.basename(htmlPath));
    fs.writeFileSync(chromeInputPath, rendered.html);
  }

  try {
    const fileUrl = pathToFileURL(chromeInputPath).href;
    const argsForChrome = [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--disable-background-networking',
      '--run-all-compositor-stages-before-draw',
      '--virtual-time-budget=5000',
      `--print-to-pdf=${pdfPath}`,
      '--print-to-pdf-no-header',
      fileUrl
    ];

    const result = spawnSync(chrome, argsForChrome, { encoding: 'utf8' });
    if (result.status !== 0) {
      const stderr = result.stderr ? `\n${result.stderr.trim()}` : '';
      fail(`Chrome PDF export failed.${stderr}`);
    }
  } finally {
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  }

  if (!fs.existsSync(pdfPath)) fail(`Chrome finished, but PDF was not created: ${pdfPath}`);
  console.log(`PDF exported: ${pdfPath}`);
  console.log(`Renderer: ${rendered.mode}${rendered.manifestPath ? ` (${rendered.manifestPath})` : ''}`);
}

function initConfigCommand(args) {
  const dirArg = args.shift();
  if (!dirArg) fail('Missing merchant directory.');

  const options = parseOptions(args);
  const merchantDir = path.resolve(dirArg);
  const configPath = path.join(merchantDir, 'deck.config.json');
  if (!fs.existsSync(merchantDir)) fs.mkdirSync(merchantDir, { recursive: true });
  if (fs.existsSync(configPath) && !options.force) {
    fail(`Config already exists: ${configPath}. Use --force to overwrite.`);
  }

  const examplePath = path.join(__dirname, 'deck.config.example.json');
  const config = JSON.parse(fs.readFileSync(examplePath, 'utf8'));
  const slug = path.basename(merchantDir);
  config.merchant.slug = slug;
  config.merchant.name = titleize(slug);
  config.deck.title = `Shopify x ${config.merchant.name} - Demo Deck`;
  config.deck.source_html = 'index.html';
  config.deck.merchant_pdf = `exports/${slug}-demo-deck.pdf`;
  config.deck.internal_review_pdf = `exports/${slug}-demo-deck-internal.pdf`;

  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`Created ${configPath}`);
}

function initManifestCommand(args) {
  const htmlArg = args.shift();
  if (!htmlArg) fail('Missing deck HTML path.');

  const options = parseOptions(args);
  const htmlPath = path.resolve(htmlArg);
  if (!fs.existsSync(htmlPath)) fail(`Deck not found: ${htmlPath}`);

  const configPath = resolveConfigPath(htmlPath, options.config);
  const manifestPath = resolveManifestPath(htmlPath, options.manifest, { forWrite: true });
  if (fs.existsSync(manifestPath) && !options.force) {
    fail(`Manifest already exists: ${manifestPath}. Use --force to overwrite.`);
  }

  const warnings = [];
  const config = readConfig(configPath, warnings);
  const manifest = buildDeckManifestForPath(htmlPath, { configPath, config, manifestPath });
  writeManifest(manifestPath, manifest);

  if (options.json) {
    console.log(JSON.stringify({ manifestPath, warnings, manifest }, null, 2));
    return;
  }

  console.log(`Created ${manifestPath}`);
  console.log(`Modules: ${manifest.modules.length} | Source slides: ${manifest.slides.length}`);
  printGroup('Warnings', warnings);
}

function lintDeck(htmlPath, configPath) {
  const errors = [];
  const warnings = [];
  const info = [];

  if (!fs.existsSync(htmlPath)) {
    return { htmlPath, configPath, slideCount: 0, errors: [`Deck not found: ${htmlPath}`], warnings, info };
  }

  const html = fs.readFileSync(htmlPath, 'utf8');
  const stat = fs.statSync(htmlPath);
  const slides = findSlides(html);
  const manifestPath = resolveManifestPath(htmlPath, null);
  const manifest = readManifest(manifestPath, warnings, { silentMissing: true });
  const config = configWithManifestDecisions(readConfig(configPath, warnings), manifest);
  const plan = buildDeckPlan({ htmlPath, configPath, config, slides, html });

  if (!/<title>[^<]+<\/title>/i.test(html)) errors.push('Missing <title>.');
  if (slides.length === 0) errors.push('No slides found. Expected elements with class "slide".');
  if (!/@media\s+print/i.test(html)) warnings.push('Missing @media print rules. PDF export may not render one slide per page.');
  if (stat.size > 15 * 1024 * 1024) warnings.push(`Large HTML file (${formatBytes(stat.size)}). PDF export may be slow.`);

  checkPlaceholders(html, warnings);
  checkSpeakers(slides, warnings);
  checkCssVariables(html, warnings);
  checkExternalAssets(html, warnings);
  checkChatTiming(html, warnings);
  checkSlideDensity(slides, warnings);
  checkShareArtifacts(html, warnings);
  checkConfig(config, slides, warnings, info);
  checkBrandAssets(config, htmlPath, html, warnings, info);
  checkStrategyGates(plan, warnings, info);
  checkSlidePicker(config, plan, html, warnings, info);

  if (/staticrypt|github\.io/i.test(html)) {
    warnings.push('Deck appears to include hosted/encrypted-share artifacts. Studio v2 defaults to merchant-safe PDF export instead.');
  }

  if (/pdi-logo|pdi-watermark-img|pdi-text/.test(html)) {
    info.push('Legacy PDI class names are present. They are supported, but new templates should use merchant-logo and merchant-watermark aliases.');
  }

  return {
    htmlPath,
    configPath,
    manifestPath,
    slideCount: slides.length,
    size: stat.size,
    errors,
    warnings,
    info,
    plan
  };
}

function findSlides(html) {
  const searchableHtml = html.replace(/<!--[\s\S]*?-->/g, (comment) => ' '.repeat(comment.length));
  const slideOpeners = [];
  const re = /<(section|div)\b([^>]*)>/gi;
  let match;
  while ((match = re.exec(searchableHtml))) {
    const classValue = match[2].match(/\bclass=["']([^"']+)["']/i)?.[1] || '';
    const classes = classValue.split(/\s+/).filter(Boolean);
    if (!classes.includes('slide')) continue;
    slideOpeners.push({ index: match.index, tag: match[1], attrs: match[2], opener: match[0] });
  }

  return slideOpeners.map((slide, i) => {
    const next = slideOpeners[i + 1]?.index ?? html.length;
    const explicitEnd = findSlideEnd(html, slide, next);
    const end = explicitEnd > -1 ? explicitEnd : next;
    const block = html.slice(slide.index, end);
    return { ...slide, number: i + 1, block };
  });
}

function findSlideEnd(html, slide, nextSlideIndex) {
  if (String(slide.tag).toLowerCase() !== 'section') return -1;
  const closeTag = '</section>';
  const closeIndex = html.toLowerCase().indexOf(closeTag, slide.index + slide.opener.length);
  if (closeIndex < 0 || closeIndex > nextSlideIndex) return -1;
  return closeIndex + closeTag.length;
}

function outlineSlide(slide) {
  return {
    number: slide.number,
    id: attr(slide.attrs, 'id') || '',
    classes: (attr(slide.attrs, 'class') || '').split(/\s+/).filter(Boolean),
    speaker: attr(slide.attrs, 'data-speaker') || '',
    eyebrow: firstText(slide.block, /<[^>]*class=["'][^"']*\b(?:slide-eyebrow|hero-eyebrow|section-kicker)\b[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i),
    title: firstText(slide.block, /<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/i),
    word_count: slideWordCount(slide)
  };
}

function extractTitle(html) {
  return firstText(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i);
}

function checkPlaceholders(html, warnings) {
  const bracketPlaceholders = html.match(/\[(?:MERCHANT|Merchant|merchant|date|category|Peer|headline|Product [^\]]+|price|total|IMG_URL|Full Name|Role|slack-avatar-url|Parallel [^\]]+)[^\]]*\]/g) || [];
  const phrasePlaceholders = [
    'Stakeholder names',
    'Presenter names',
    'Topic focus',
    'Eyebrow Text',
    'Main Headline',
    'Supporting subhead copy',
    'Capability one',
    'Feature headline',
    'Lede paragraph',
    'Closing headline',
    'Section description',
    'Badge One'
  ].filter((phrase) => html.includes(phrase));

  const placeholders = unique([...bracketPlaceholders, ...phrasePlaceholders]);
  if (placeholders.length) warnings.push(`Placeholder content still present: ${placeholders.slice(0, 8).join(', ')}${placeholders.length > 8 ? '...' : ''}`);
}

function checkSpeakers(slides, warnings) {
  const missing = slides.filter((slide) => !/\bdata-speaker=["'][^"']+["']/.test(slide.attrs));
  if (missing.length) warnings.push(`${missing.length} slide(s) are missing data-speaker.`);

  const generic = slides
    .map((slide) => {
      const speaker = slide.attrs.match(/\bdata-speaker=["']([^"']+)["']/)?.[1];
      return speaker && /^(AE|SE|Presenter)$/i.test(speaker) ? slide.number : null;
    })
    .filter(Boolean);
  if (generic.length) warnings.push(`Generic speaker labels on slide(s): ${generic.join(', ')}.`);
}

function checkCssVariables(html, warnings) {
  const definitions = new Set();
  const uses = new Set();
  const fallbackUses = new Set();
  for (const match of html.matchAll(/--([a-zA-Z0-9-]+)\s*:/g)) definitions.add(match[1]);
  for (const match of html.matchAll(/var\(\s*--([a-zA-Z0-9-]+)/g)) uses.add(match[1]);
  for (const match of html.matchAll(/var\(\s*--([a-zA-Z0-9-]+)\s*,/g)) fallbackUses.add(match[1]);
  const missing = [...uses].filter((name) => !definitions.has(name) && !fallbackUses.has(name));
  if (missing.length) warnings.push(`CSS variables used but not defined: ${missing.map((name) => `--${name}`).join(', ')}.`);
}

function checkExternalAssets(html, warnings) {
  const allowedHosts = new Set(['fonts.googleapis.com', 'fonts.gstatic.com']);
  const external = [];
  const re = /<(img|script|iframe|link)\b[^>]*(?:src|href)=["'](https?:\/\/[^"']+)["'][^>]*>/gi;
  for (const match of html.matchAll(re)) {
    const tag = match[1].toLowerCase();
    const url = match[2];
    const host = safeHost(url);
    if (allowedHosts.has(host)) continue;
    external.push(`${tag}: ${url}`);
  }
  if (external.length) warnings.push(`External assets may leak or fail in PDF/offline review: ${external.slice(0, 5).join('; ')}${external.length > 5 ? '...' : ''}`);
}

function checkChatTiming(html, warnings) {
  const chatMsgCount = count(html, /\bclass=["'][^"']*\bchat-msg\b/g);
  const chatDelayCount = count(html, /\bclass=["'][^"']*\bchat-msg\b[^>]*\bdata-chat-delay=/g);
  if (chatMsgCount > chatDelayCount) warnings.push(`Gemini chat has ${chatMsgCount - chatDelayCount} message(s) without data-chat-delay.`);

  const sidekickMsgCount = count(html, /\bclass=["'][^"']*\bsidekick-msg\b/g);
  const sidekickDelayCount = count(html, /\bclass=["'][^"']*\bsidekick-msg\b[^>]*\bdata-chat-delay=/g);
  if (sidekickMsgCount > sidekickDelayCount) warnings.push(`Sidekick chat has ${sidekickMsgCount - sidekickDelayCount} message(s) without data-chat-delay.`);
}

function checkSlideDensity(slides, warnings) {
  const dense = slides
    .map((slide) => {
      return { number: slide.number, words: slideWordCount(slide) };
    })
    .filter((slide) => slide.words > 220);

  if (dense.length) warnings.push(`Dense slide copy detected: ${dense.map((slide) => `slide ${slide.number} (${slide.words} words)`).join(', ')}.`);
}

function checkShareArtifacts(html, warnings) {
  if (/quick\.shopify\.io/i.test(html)) {
    warnings.push('Quick-site URLs found. Quick sites are internal-only and should not be the merchant share artifact.');
  }
}

function checkConfig(config, slides, warnings, info) {
  if (!config) return;
  if (!config.merchant?.name) warnings.push('deck.config.json is missing merchant.name.');
  if (config.workflow?.export_target && config.workflow.export_target !== 'pdf') {
    warnings.push(`deck.config.json export_target is "${config.workflow.export_target}", but Studio v2 defaults to "pdf".`);
  }
  if (config.workflow?.hosting_allowed === true) {
    warnings.push('deck.config.json allows hosting. Confirm this is intentional for merchant-specific content.');
  }
  if (Array.isArray(config.slides) && config.slides.length && config.slides.length !== slides.length) {
    info.push(`deck.config.json lists ${config.slides.length} slide(s); HTML contains ${slides.length}.`);
  }
  const registry = readPatternRegistry();
  const knownPatternIds = new Set((registry?.patterns || []).map((pattern) => pattern.id));
  const unknownPatterns = unique((config.slides || [])
    .map((slide) => slide.pattern)
    .filter((pattern) => pattern && !knownPatternIds.has(pattern)));
  if (unknownPatterns.length) warnings.push(`deck.config.json references unknown pattern(s): ${unknownPatterns.join(', ')}.`);
}

function checkBrandAssets(config, htmlPath, html, warnings, info) {
  const brand = summarizeBrand(config, htmlPath, html);
  if (brand.status === 'text-fallback') {
    info.push('Deck is using a text logo fallback. Use embed-logo when a merchant logo is available.');
  }
  if (brand.logo_path && !brand.logo_exists) {
    warnings.push(`brand.logo_path does not exist: ${brand.logo_path}`);
  }
  if (brand.logo_exists && !brand.logo_embedded) {
    warnings.push('brand.logo_path is configured, but the deck does not contain an embedded merchant logo image.');
  }
}

function checkStrategyGates(plan, warnings, info) {
  if (!plan?.gates?.length) return;

  const missingRequired = plan.gates.filter((gate) => gate.required && !gate.passed);
  for (const gate of missingRequired) {
    warnings.push(`Strategy gate missing: ${gate.label}. ${gate.fix}`);
  }

  if (!missingRequired.length) {
    info.push(`Strategy gates passed for ${plan.strategy.deck_type} deck.`);
  }
}

function checkSlidePicker(config, plan, html, warnings, info) {
  if (!config || !plan) return;
  const picker = buildSlidePicker({ config, plan, html });
  const excludedRequired = picker.modules.filter((module) => module.requirement === 'required' && !module.included);
  if (excludedRequired.length) {
    warnings.push(`Studio has required slide option(s) hidden from the deck: ${excludedRequired.map((module) => module.label).join(', ')}. Restore them or keep the exclusion as an intentional story decision.`);
  }

  const selectedMissing = picker.modules.filter((module) => module.included && !module.present && module.requirement !== 'optional');
  if (selectedMissing.length) {
    warnings.push(`Studio slide picker selects module(s) not currently present in the deck: ${selectedMissing.map((module) => module.label).join(', ')}.`);
  }

  if (picker.selected_count) {
    info.push(`Studio slide picker selected ${picker.selected_count} module(s).`);
  }
}

function printLintResult(result) {
  console.log(`Demo Deck Studio lint: ${result.htmlPath}`);
  console.log(`Slides: ${result.slideCount} | Size: ${formatBytes(result.size || 0)}`);
  printGroup('Errors', result.errors);
  printGroup('Warnings', result.warnings);
  printGroup('Info', result.info);
  if (!result.errors.length && !result.warnings.length) console.log('No issues found.');
}

function printPlanResult(result) {
  const { plan } = result;
  console.log(`Demo Deck Studio plan: ${result.htmlPath}`);
  if (result.configPath) console.log(`Config: ${result.configPath}`);
  printGroup('Config Warnings', result.warnings);
  console.log(`\nStrategy: ${plan.strategy.deck_type}`);
  console.log(`Signals: B2B ${yesNo(plan.strategy.has_b2b)} | DTC ${yesNo(plan.strategy.has_dtc)} | Shopify Plus ${yesNo(plan.strategy.plus_sales_deck)} | AI moment ${yesNo(plan.strategy.ai_moment_required)}`);

  console.log('\nRequired Gates:');
  for (const gate of plan.gates.filter((item) => item.required)) {
    console.log(`${gate.passed ? 'OK' : 'MISSING'} ${gate.label} - ${gate.passed ? gate.evidence : gate.fix}`);
  }

  const recommended = plan.gates.filter((item) => !item.required);
  if (recommended.length) {
    console.log('\nRecommended Checks:');
    for (const gate of recommended) {
      console.log(`${gate.passed ? 'OK' : 'REVIEW'} ${gate.label} - ${gate.passed ? gate.evidence : gate.fix}`);
    }
  }

  console.log('\nRecommended Slide Plan:');
  for (const item of plan.recommended_slide_plan) {
    console.log(`- ${item.status.toUpperCase()} ${item.label} (${item.pattern})`);
  }
}

function printGroup(label, items) {
  if (!items.length) return;
  console.log(`\n${label}:`);
  for (const item of items) console.log(`- ${item}`);
}

function yesNo(value) {
  return value ? 'yes' : 'no';
}

function buildDeckPlan({ htmlPath, configPath, config, slides, html }) {
  const registry = readPatternRegistry();
  const configSlides = Array.isArray(config?.slides) ? config.slides : [];
  const presentPatterns = new Set(configSlides.map((slide) => slide.pattern).filter(Boolean));
  for (const pattern of inferHtmlPatterns(html)) presentPatterns.add(pattern);

  const strategy = inferStrategy(config, html);
  const gates = [];
  const addGate = (gate) => gates.push(gate);
  const hasPattern = (...patterns) => patterns.some((pattern) => presentPatterns.has(pattern));
  const hasSlideId = (...ids) => {
    const wanted = new Set(ids);
    return configSlides.some((slide) => wanted.has(slide.id));
  };
  const hasHtml = (re) => re.test(html || '');
  const hasPlusPricingDetail = hasHtml(/(?:Shopify Plus pricing|\$2,300|0\.18%|0\.35%|0\.25%|variable platform fee|platform fee)/i);
  const hasPricingEvidence = configSlides
    .filter((slide) => slide.pattern === 'pricing' || /pricing|investment|commercial/i.test(`${slide.id || ''} ${slide.pattern || ''}`))
    .some((slide) => Array.isArray(slide.evidence) && slide.evidence.length > 0);

  addGate({
    id: 'source-config',
    label: 'Deck manifest',
    required: true,
    passed: Boolean(config && configPath),
    evidence: configPath ? path.basename(configPath) : '',
    fix: 'Create or load deck.config.json so Studio can reason about strategy, slides, and evidence.'
  });

  addGate({
    id: 'b2b-workflow',
    label: 'B2B buyer workflow coverage',
    required: strategy.has_b2b,
    passed: !strategy.has_b2b || hasPattern('b2b-evolution', 'feature-slide', 'interactive-storefront'),
    evidence: 'B2B pattern present',
    fix: 'Add B2B workflow slides such as catalogs, quick order, account hierarchy, or interactive storefront.'
  });

  addGate({
    id: 'integration-ops',
    label: 'Operations and integration story',
    required: strategy.has_b2b,
    passed: !strategy.has_b2b || hasSlideId('blue-cherry-kbo', 'erp-integration', 'integration', 'edi-visibility') || hasHtml(/Blue Cherry|ERP|EDI|KBO|Boommy/i),
    evidence: 'Integration / ERP content present',
    fix: 'Add an ERP/integration slide that names the systems of record and what Shopify should own.'
  });

  addGate({
    id: 'agentic-commerce',
    label: 'Agentic Commerce / Gemini moment',
    required: strategy.ai_moment_required,
    passed: hasPattern('agentic-commerce') || hasHtml(/id=["']gemini-chat["']/i),
    evidence: 'Gemini / Agentic Commerce pattern present',
    fix: 'Add an Agentic Commerce slide with a buyer-side Gemini, ChatGPT, or Copilot discovery scenario.'
  });

  addGate({
    id: 'sidekick-ops',
    label: 'Merchant-side AI operations moment',
    required: Boolean(strategy.sidekick_required),
    passed: hasPattern('sidekick-chat') || hasHtml(/id=["']sidekick-chat["']/i),
    evidence: 'Sidekick operations pattern present',
    fix: 'Add a Sidekick slide that answers an operator or sales-rep workflow question.'
  });

  addGate({
    id: 'plus-pricing',
    label: 'Shopify Plus pricing slide',
    required: strategy.pricing_required,
    passed: !strategy.pricing_required || (hasPattern('pricing') && hasPlusPricingDetail),
    evidence: 'Plus pricing mechanics present',
    fix: 'Add a real Shopify Plus pricing slide with platform fee, variable fee, payments, and implementation caveats.'
  });

  addGate({
    id: 'pricing-evidence',
    label: 'Pricing evidence mapping',
    required: strategy.pricing_required,
    passed: !strategy.pricing_required || hasPricingEvidence,
    evidence: 'Pricing slide has evidence IDs',
    fix: 'Map pricing or commercial slides to Salesforce, pricing notes, or approved pricing sources in deck.config.json.'
  });

  const recommendedSlidePlan = recommendedSlidePlanFor(strategy).map((item) => {
    const passed = modulePresent(item, presentPatterns, html);
    return {
      id: item.id,
      label: item.label,
      pattern: item.patterns.join(' / '),
      requirement: item.required ? 'required' : 'recommended',
      status: passed ? 'present' : item.required ? 'missing' : 'recommended'
    };
  });

  return {
    htmlPath,
    configPath,
    strategy,
    registry_version: registry?.schema_version || null,
    gates,
    missing_required: gates.filter((gate) => gate.required && !gate.passed).map((gate) => gate.id),
    present_patterns: [...presentPatterns].sort(),
    recommended_slide_plan: recommendedSlidePlan
  };
}

function inferStrategy(config, html) {
  const strategy = config?.strategy || {};
  const sourceText = [
    strategy.deck_type,
    config?.merchant?.business_model,
    config?.deck?.title,
    config?.deck?.primary_goal
  ].filter(Boolean).join(' ').toLowerCase();

  const explicitB2b = typeof strategy.has_b2b === 'boolean' ? strategy.has_b2b : null;
  const explicitDtc = typeof strategy.has_dtc === 'boolean' ? strategy.has_dtc : null;
  const hasB2b = explicitB2b ?? /\b(b2b|wholesale|trade|companies|catalogs?)\b/i.test(sourceText);
  const hasDtc = explicitDtc ?? /\b(d2c|dtc|direct[- ]to[- ]consumer|consumer|retail|hybrid)\b/i.test(sourceText);
  const deckType = normalizeDeckType(strategy.deck_type || (hasB2b && hasDtc ? 'hybrid' : hasB2b ? 'b2b' : hasDtc ? 'dtc' : 'general'));
  const plusSalesDeck = typeof strategy.plus_sales_deck === 'boolean'
    ? strategy.plus_sales_deck
    : /shopify plus|plus|pricing|commercial|opportunity|sales/i.test(`${sourceText} ${html || ''}`);
  const aiMomentRequired = typeof strategy.ai_moment_required === 'boolean'
    ? strategy.ai_moment_required
    : deckType === 'hybrid' || deckType === 'dtc' || hasDtc;
  const pricingRequired = typeof strategy.pricing_required === 'boolean'
    ? strategy.pricing_required
    : plusSalesDeck;

  return {
    deck_type: deckType,
    has_b2b: hasB2b,
    has_dtc: hasDtc,
    plus_sales_deck: plusSalesDeck,
    ai_moment_required: aiMomentRequired,
    sidekick_required: Boolean(strategy.sidekick_required),
    pricing_required: pricingRequired,
    audience: config?.deck?.audience || 'merchant'
  };
}

function normalizeDeckType(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('hybrid')) return 'hybrid';
  if (normalized.includes('b2b')) return 'b2b';
  if (normalized.includes('dtc') || normalized.includes('d2c')) return 'dtc';
  if (normalized.includes('executive')) return 'executive';
  if (normalized.includes('technical')) return 'technical';
  if (normalized.includes('competitive')) return 'competitive';
  return normalized || 'general';
}

function inferHtmlPatterns(html) {
  const patterns = new Set();
  if (!html) return patterns;
  for (const match of html.matchAll(/\bdata-pattern=["']([^"']+)["']/gi)) {
    if (match[1]) patterns.add(match[1]);
  }
  if (/id=["']gemini-chat["']/i.test(html)) patterns.add('agentic-commerce');
  if (/id=["']sidekick-chat["']/i.test(html)) patterns.add('sidekick-chat');
  if (/pricing-tiers|pricing-callout/i.test(html)) patterns.add('pricing');
  if (/section-header/i.test(html)) patterns.add('section-header');
  return patterns;
}

function recommendedSlidePlanFor(strategy) {
  const items = [
    { id: 'cover', label: 'Cover', patterns: ['cover'], required: true, category: 'opening', section: 'opening', slot: '01-cover', reason: 'Sets merchant context, audience, date, and ownership.' },
    { id: 'discovery-recap', label: 'Discovery recap', patterns: ['discovery-recap'], required: true, category: 'opening', section: 'opening', slot: '02-discovery', reason: 'Grounds the story in what the merchant already told us.' },
    { id: 'agenda', label: 'Agenda', patterns: ['agenda'], required: true, category: 'bridge', section: 'bridge', slot: '06-agenda', reason: 'Makes the demo path explicit before feature depth.' }
  ];

  if (strategy.has_b2b) {
    items.push(
      { id: 'b2b-workflows', label: 'B2B buyer workflows', patterns: ['b2b-evolution', 'feature-slide', 'interactive-storefront'], required: true, category: 'demo', section: 'buyer-journey', slot: '10-b2b-workflows', reason: 'B2B deals need buyer, catalog, account, and order workflow coverage.' },
      { id: 'ops-integration', label: 'ERP / operations architecture', patterns: ['feature-slide'], required: true, category: 'operations', section: 'operations', slot: '30-ops-integration', html_probe: /Blue Cherry|ERP|EDI|KBO|Boommy/i, reason: 'Shows where Shopify fits with the systems of record.' }
    );
  }

  if (strategy.has_dtc || strategy.ai_moment_required) {
    items.push({ id: 'agentic-commerce', label: 'Agentic Commerce buyer moment', patterns: ['agentic-commerce'], required: true, category: 'simulation', section: 'simulation', slot: '20-agentic-commerce', html_probe: /id=["']gemini-chat["']/i, reason: 'DTC and hybrid stories should show how AI discovery changes buyer behavior.' });
  }

  items.push({ id: 'sidekick-ops', label: 'Merchant-side AI operations', patterns: ['sidekick-chat'], required: Boolean(strategy.sidekick_required), category: 'simulation', section: 'operations', slot: '32-sidekick', html_probe: /id=["']sidekick-chat["']/i, reason: 'Shows operator value beyond buyer-side AI.' });

  if (strategy.pricing_required) {
    items.push({ id: 'plus-pricing', label: 'Shopify Plus pricing', patterns: ['pricing'], required: true, category: 'close', section: 'close', slot: '42-pricing', html_probe: /Shopify Plus pricing|\$2,300|0\.18%|0\.35%/i, reason: 'Commercial decks need Plus pricing mechanics before the close.' });
  }

  items.push(
    { id: 'timeline-close', label: 'Timeline / next steps', patterns: ['timeline', 'closing'], required: true, category: 'close', section: 'close', slot: '44-timeline-close', reason: 'Converts the demo into a concrete decision path.' },
    { id: 'source-map', label: 'Internal evidence map', patterns: ['source-map'], required: false, category: 'proof', section: 'appendix', slot: '90-source-map', reason: 'Keeps source confidence with the deck without exposing raw notes.' }
  );

  return items;
}

function modulePresent(item, presentPatterns, html) {
  return item.patterns.some((pattern) => presentPatterns.has(pattern)) ||
    (item.html_probe ? item.html_probe.test(html || '') : false);
}

function buildSlidePicker({ config, plan, html }) {
  const registry = readPatternRegistry();
  const strategy = plan?.strategy || inferStrategy(config, html);
  const presentPatterns = new Set(plan?.present_patterns || []);
  for (const pattern of inferHtmlPatterns(html || '')) presentPatterns.add(pattern);
  const decisions = config?.studio?.slide_picker?.modules || {};
  const selectedPatterns = new Set();
  const modules = [];

  for (const item of recommendedSlidePlanFor(strategy)) {
    if (item.patterns.length === 1) item.patterns.forEach((pattern) => selectedPatterns.add(pattern));
    modules.push(slidePickerModuleFromPlanItem(item, {
      requirement: item.required ? 'required' : 'recommended',
      config,
      decisions,
      presentPatterns,
      html
    }));
  }

  for (const pattern of registry?.patterns || []) {
    if (selectedPatterns.has(pattern.id)) continue;
    const present = presentPatterns.has(pattern.id);
    const item = {
      id: `pattern:${pattern.id}`,
      label: pattern.name,
      patterns: [pattern.id],
      category: pattern.category || 'other',
      ...patternFlowMetadata(pattern.id, pattern.category || 'other'),
      export_behavior: pattern.export_behavior || '',
      reason: optionalPatternReason(pattern, strategy)
    };
    modules.push(slidePickerModuleFromPlanItem(item, {
      requirement: 'optional',
      config,
      decisions,
      presentPatterns,
      html
    }));
  }

  const selected = modules.filter((module) => module.included);
  const selectedMissing = selected.filter((module) => !module.present);
  const excludedRequired = modules.filter((module) => module.requirement === 'required' && !module.included);

  return {
    version: 1,
    updated_at: config?.studio?.slide_picker?.updated_at || null,
    selected_count: selected.length,
    selected_missing_count: selectedMissing.length,
    excluded_required_count: excludedRequired.length,
    modules
  };
}

function slidePickerModuleFromPlanItem(item, context) {
  const decision = normalizeSlidePickerDecision(context.decisions[item.id]);
  const present = modulePresent(item, context.presentPatterns, context.html);
  const defaultIncluded = item.required || context.requirement === 'recommended' || present;
  const included = typeof decision.included === 'boolean' ? decision.included : defaultIncluded;
  const patternLabel = item.patterns.join(' / ');
  const status = !included ? 'excluded' : present ? 'present' : context.requirement === 'optional' ? 'planned' : 'missing';
  const addPattern = item.patterns.find((pattern) => canRenderPattern(pattern)) || '';
  const scaffold = patternScaffoldMetadata(addPattern || item.patterns[0] || '');
  const currentRendererVersion = patternRendererVersion(addPattern || item.patterns[0] || '');
  const rendererVersion = Number(decision.renderer_version || 0);
  const legacyScaffold = Boolean(decision.added_slide_id && slideHasLegacyScaffoldNote(context.html, decision.added_slide_id));
  const canRefresh = Boolean(addPattern && present && decision.added_slide_id && (legacyScaffold || rendererVersion < currentRendererVersion));

  return {
    id: item.id,
    label: item.label,
    category: item.category || 'other',
    section: item.section || 'other',
    section_label: flowSectionLabel(item.section || 'other'),
    slot: item.slot || '',
    slot_label: flowSlotLabel(item.slot || item.section || item.category || 'other'),
    flow_order: flowOrder(item.slot || item.section || item.category || ''),
    requirement: context.requirement,
    patterns: item.patterns,
    pattern_label: patternLabel,
    reason: item.reason || '',
    present,
    included,
    status,
    can_add: Boolean(addPattern && !present),
    add_pattern: addPattern,
    can_refresh: canRefresh,
    refresh_reason: canRefresh ? refreshReasonForModule({ legacyScaffold, rendererVersion, currentRendererVersion }) : '',
    added_slide_id: decision.added_slide_id || '',
    renderer_version: rendererVersion || null,
    current_renderer_version: currentRendererVersion,
    export_behavior: item.export_behavior || scaffold.export_behavior || '',
    scaffold_quality: scaffold.quality,
    scaffold_note: scaffold.note,
    reference_path: scaffold.reference_path || '',
    exclusion_note: !included ? exclusionNoteForModule(item, context.requirement, decision) : '',
    user_set: typeof decision.included === 'boolean',
    updated_at: decision.updated_at || null
  };
}

function exclusionNoteForModule(item, requirement, decision) {
  if (decision.reason) return String(decision.reason);
  if (requirement === 'required') {
    return 'Required slide option is intentionally hidden from the deck. Restore it unless this is a conscious story decision.';
  }
  if (requirement === 'recommended') {
    return 'Recommended slide option is hidden from the deck.';
  }
  return 'Optional slide option is not included in the deck.';
}

function patternRendererVersion(patternId) {
  const versions = {
    'chatgpt-claude-management': 2,
    'interactive-storefront': 2,
    'agentic-commerce': 2,
    'sidekick-chat': 2
  };
  return versions[patternId] || 1;
}

function slideHasLegacyScaffoldNote(html, slideId) {
  if (!html || !slideId) return false;
  const slide = findSlides(html).find((item) => outlineSlide(item).id === slideId);
  return /addable scaffold|high-fidelity animated version|migrate the reference simulation/i.test(slide?.block || '');
}

function refreshReasonForModule({ legacyScaffold, rendererVersion, currentRendererVersion }) {
  if (legacyScaffold) {
    return 'This slide still contains an internal scaffold note. Refresh it to replace the old placeholder with the current demo-ready renderer.';
  }
  if (rendererVersion < currentRendererVersion) {
    return `Renderer v${currentRendererVersion} is available. Refresh this module before merchant sharing.`;
  }
  return 'Refresh this module from the current renderer.';
}

function patternScaffoldMetadata(patternId) {
  const richSimulation = {
    quality: 'rich-scaffold',
    export_behavior: 'snapshot-final-state',
    note: 'Rich simulation scaffold. Review merchant copy before sharing, but the visual interaction pattern is already built.'
  };

  const metadata = {
    'agentic-commerce': {
      ...richSimulation,
      quality: 'full-reference',
      note: 'Animated buyer-side AI discovery and checkout scaffold from the simulation library.',
      reference_path: 'references/agentic-commerce-sim.html'
    },
    'sidekick-chat': {
      ...richSimulation,
      note: 'Animated merchant-operator AI workflow scaffold with timed message reveals.',
      reference_path: 'references/chat-animation.md'
    },
    'chatgpt-claude-management': {
      ...richSimulation,
      quality: 'full-reference',
      note: 'Rich two-pane AI store-management scaffold. The full standalone reference remains available for final polish.',
      reference_path: 'references/chatgpt-claude-management-sim.html'
    },
    'interactive-storefront': {
      quality: 'full-reference',
      export_behavior: 'snapshot-active-view',
      note: 'Working storefront scaffold for buyer login, product detail, quick order, resources, and cart signals.',
      reference_path: 'references/interactive-storefront-mockup.html'
    },
    'fast-follow': {
      quality: 'post-demo',
      export_behavior: 'appendix-or-merchant-addendum',
      note: 'Post-demo addendum scaffold. Use after call notes are reviewed, not as a default base-deck slide.'
    },
    'source-map': {
      quality: 'internal',
      export_behavior: 'internal-preferred',
      note: 'Internal evidence map scaffold. Keep or remove depending on merchant-safe export needs.'
    }
  };

  return metadata[patternId] || {
    quality: 'starter-scaffold',
    export_behavior: 'static',
    note: 'Starter scaffold. Replace placeholder copy and evidence before merchant sharing.'
  };
}

function patternFlowMetadata(patternId, category = '') {
  const byPattern = {
    cover: { section: 'opening', slot: '01-cover' },
    'discovery-recap': { section: 'opening', slot: '02-discovery' },
    'stats-grid': { section: 'opening', slot: '03-shopify-proof' },
    'customer-proof-grid': { section: 'opening', slot: '04-customer-proof' },
    'case-study': { section: 'opening', slot: '05-case-study' },
    aspiration: { section: 'bridge', slot: '06-aspiration' },
    agenda: { section: 'bridge', slot: '07-agenda' },
    'section-header': { section: 'structure', slot: '08-section-break' },
    'b2b-evolution': { section: 'buyer-journey', slot: '10-b2b-evolution' },
    'feature-slide': { section: 'buyer-journey', slot: '12-feature-slide' },
    'interactive-storefront': { section: 'buyer-journey', slot: '14-interactive-storefront' },
    'agentic-commerce': { section: 'simulation', slot: '20-agentic-commerce' },
    'chatgpt-claude-management': { section: 'simulation', slot: '22-ai-management' },
    'sidekick-chat': { section: 'operations', slot: '32-sidekick' },
    'challenges-solutions': { section: 'close', slot: '40-challenges-solutions' },
    'three-anchors': { section: 'close', slot: '41-three-anchors' },
    pricing: { section: 'close', slot: '42-pricing' },
    timeline: { section: 'close', slot: '43-timeline' },
    closing: { section: 'close', slot: '44-closing' },
    'source-map': { section: 'appendix', slot: '90-source-map' },
    'fast-follow': { section: 'post-demo', slot: '95-fast-follow' }
  };

  if (byPattern[patternId]) return byPattern[patternId];

  const byCategory = {
    opening: { section: 'opening', slot: '09-opening-extra' },
    platform: { section: 'opening', slot: '09-platform-extra' },
    bridge: { section: 'bridge', slot: '09-bridge-extra' },
    demo: { section: 'buyer-journey', slot: '19-demo-extra' },
    simulation: { section: 'simulation', slot: '29-simulation-extra' },
    operations: { section: 'operations', slot: '39-operations-extra' },
    proof: { section: 'appendix', slot: '89-proof-extra' },
    summary: { section: 'close', slot: '40-summary-extra' },
    close: { section: 'close', slot: '49-close-extra' },
    'follow-up': { section: 'post-demo', slot: '95-follow-up-extra' },
    structure: { section: 'structure', slot: '08-structure-extra' }
  };

  return byCategory[category] || { section: 'other', slot: '99-other' };
}

function flowSectionLabel(section) {
  const labels = {
    opening: 'Opening',
    bridge: 'Bridge',
    structure: 'Structure',
    'buyer-journey': 'Buyer journey',
    simulation: 'AI / simulation',
    operations: 'Operations',
    close: 'Close',
    appendix: 'Appendix',
    'post-demo': 'Post-demo',
    other: 'Other'
  };
  return labels[section] || titleize(section || 'Other');
}

function flowSlotLabel(slot) {
  const label = String(slot || '')
    .replace(/^\d+-/, '')
    .split('-')
    .filter(Boolean)
    .map(titleize)
    .join(' ') || 'Unslotted';
  return normalizeInitialisms(label);
}

function flowOrder(slot) {
  const match = String(slot || '').match(/^(\d+)/);
  return match ? Number(match[1]) : 99;
}

function normalizeInitialisms(label) {
  return String(label || '')
    .replace(/\bAi\b/g, 'AI')
    .replace(/\bB2b\b/g, 'B2B')
    .replace(/\bDtc\b/g, 'DTC')
    .replace(/\bErp\b/g, 'ERP')
    .replace(/\bApi\b/g, 'API');
}

function normalizeSlidePickerDecision(decision) {
  if (typeof decision === 'boolean') return { included: decision };
  if (decision && typeof decision === 'object') return decision;
  return {};
}

function patternMatchesStrategy(pattern, strategy) {
  const bestFor = Array.isArray(pattern.best_for) ? pattern.best_for : [];
  if (!bestFor.length || bestFor.includes('all')) return true;
  if (bestFor.includes(strategy.deck_type)) return true;
  if (strategy.has_b2b && bestFor.includes('b2b')) return true;
  if (strategy.has_dtc && (bestFor.includes('dtc') || bestFor.includes('d2c'))) return true;
  return false;
}

function optionalPatternReason(pattern, strategy) {
  const category = pattern.category ? `${pattern.category} pattern` : 'Optional pattern';
  const fit = Array.isArray(pattern.best_for) && !pattern.best_for.includes('all')
    ? `Best for ${pattern.best_for.join(', ')} decks.`
    : `Useful across ${strategy.deck_type} decks when the story needs it.`;
  return `${category}. ${fit}`;
}

function canRenderPattern(patternId) {
  return Boolean(PATTERN_RENDERERS[patternId]);
}

const PATTERN_RENDERERS = {
  cover: renderCoverPatternSlide,
  'discovery-recap': renderDiscoveryRecapPatternSlide,
  'stats-grid': renderStatsGridPatternSlide,
  'b2b-evolution': renderB2bEvolutionPatternSlide,
  'customer-proof-grid': renderCustomerProofGridPatternSlide,
  'case-study': renderCaseStudyPatternSlide,
  aspiration: renderAspirationPatternSlide,
  agenda: renderAgendaPatternSlide,
  'section-header': renderSectionHeaderPatternSlide,
  'feature-slide': renderFeaturePatternSlide,
  'agentic-commerce': renderAgenticCommercePatternSlide,
  'sidekick-chat': renderSidekickPatternSlide,
  'chatgpt-claude-management': renderChatGptClaudeManagementPatternSlide,
  'interactive-storefront': renderInteractiveStorefrontPatternSlide,
  'challenges-solutions': renderChallengesSolutionsPatternSlide,
  'three-anchors': renderThreeAnchorsPatternSlide,
  pricing: renderPricingPatternSlide,
  timeline: renderTimelinePatternSlide,
  'source-map': renderSourceMapPatternSlide,
  'fast-follow': renderFastFollowPatternSlide,
  closing: renderClosingPatternSlide
};

function replaceMerchantLogo(html, imageHtml, watermarkImageHtml = '') {
  let updated = html;

  if (/<img\b[^>]*class=["'][^"']*\bmerchant-logo-img\b[^"']*["'][^>]*>/i.test(updated)) {
    updated = updated.replace(/<img\b[^>]*class=["'][^"']*\bmerchant-logo-img\b[^"']*["'][^>]*>/i, imageHtml);
  } else {
    updated = updated.replace(
      /<div\b[^>]*class=["'][^"']*\bmerchant-logo\b[^"']*["'][^>]*>[\s\S]*?<\/div>/i,
      imageHtml
    );
  }

  if (watermarkImageHtml) {
    updated = replaceMerchantWatermarkLogo(updated, watermarkImageHtml);
  }

  return updated;
}

function replaceMerchantWatermarkLogo(html, watermarkImageHtml) {
  if (/<img\b[^>]*class=["'][^"']*\bmerchant-watermark-img\b[^"']*["'][^>]*>/i.test(html)) {
    return html.replace(/<img\b[^>]*class=["'][^"']*\bmerchant-watermark-img\b[^"']*["'][^>]*>/i, watermarkImageHtml);
  }

  if (/<span\b[^>]*class=["'][^"']*\bmerchant-text\b[^"']*["'][^>]*>[\s\S]*?<\/span>/i.test(html)) {
    return html.replace(/<span\b[^>]*class=["'][^"']*\bmerchant-text\b[^"']*["'][^>]*>[\s\S]*?<\/span>/i, watermarkImageHtml);
  }

  return html.replace(
    /<span\b[^>]*class=["'][^"']*\bpdi-text\b[^"']*["'][^>]*>[\s\S]*?<\/span>/i,
    watermarkImageHtml
  );
}

function detectMimeType(filePath, buffer) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
  return 'application/octet-stream';
}

function summarizeBrand(config, htmlPath, html) {
  const configDir = config ? path.dirname(resolveConfigPath(htmlPath, null) || htmlPath) : path.dirname(htmlPath);
  const logoPath = config?.brand?.logo_path || '';
  const absoluteLogoPath = logoPath ? path.resolve(configDir, logoPath) : '';
  const logoExists = absoluteLogoPath ? fs.existsSync(absoluteLogoPath) : false;
  const embedded = /<img\b(?=[^>]*class=["'][^"']*\bmerchant-logo-img\b[^"']*["'])(?=[^>]*src=["']data:)[^>]*>/i.test(html);
  const watermarkEmbedded = /<img\b(?=[^>]*class=["'][^"']*\bmerchant-watermark-img\b[^"']*["'])(?=[^>]*src=["']data:)[^>]*>/i.test(html);
  const textFallback = /<div\b[^>]*class=["'][^"']*\bmerchant-logo\b[^"']*["'][^>]*>/i.test(html);
  const watermarkTextFallback = /<span\b[^>]*class=["'][^"']*\b(merchant-text|pdi-text)\b[^"']*["'][^>]*>/i.test(html);

  return {
    mode: config?.brand?.mode || 'unknown',
    accent: config?.brand?.accent || '',
    accent_bright: config?.brand?.accent_bright || '',
    preset_id: config?.brand?.preset_id || '',
    preset_label: config?.brand?.preset_label || '',
    heading_font: config?.brand?.heading_font || '',
    merchant_preset: normalizeMerchantThemePreset(config?.brand?.merchant_preset),
    logo_path: logoPath,
    logo_exists: logoExists,
    logo_embedded: embedded,
    watermark_logo_embedded: watermarkEmbedded,
    logo_alt: config?.brand?.logo_alt || '',
    logo_source_url: config?.brand?.logo_source_url || '',
    text_fallback: textFallback,
    watermark_text_fallback: watermarkTextFallback,
    status: embedded ? (watermarkEmbedded ? 'embedded' : 'cover-embedded') : logoExists ? 'configured' : textFallback ? 'text-fallback' : 'missing'
  };
}

function readNotesText(notesPath) {
  if (path.extname(notesPath).toLowerCase() === '.pdf') {
    const result = spawnSync('pdftotext', [notesPath, '-'], { encoding: 'utf8' });
    if (result.status !== 0) {
      fail('Could not extract text from PDF. Install pdftotext or provide a .txt/.md notes export.');
    }
    return result.stdout;
  }

  return fs.readFileSync(notesPath, 'utf8');
}

function buildFastFollowModel(notesText, config) {
  const cleaned = cleanText(notesText || '');
  const questions = extractQuestions(cleaned).slice(0, 4);
  const covered = extractCoveredTopics(cleaned).slice(0, 5);
  const nextSteps = extractNextSteps(notesText || '').slice(0, 4);

  return {
    merchant: config?.merchant?.name || 'the merchant',
    title: 'Fast follow from the demo.',
    lede: 'A concise addendum for the questions, context, and follow-ups that came out of the live conversation.',
    covered: covered.length ? covered : ['Demo flow recap', 'Open questions', 'Recommended next steps'],
    questions: questions.length ? questions : ['What questions came up during the demo that need a written answer?'],
    next_steps: nextSteps.length ? nextSteps : ['Confirm owners for open questions', 'Send polished answers with the PDF follow-up', 'Decide whether the addendum stays internal or merchant-facing']
  };
}

function extractQuestions(text) {
  const candidates = text
    .split(/(?<=[?.!])\s+|\n+/)
    .map((item) => item.trim())
    .filter((item) => item.includes('?'))
    .map((item) => item.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter((item) => item.length > 12 && item.length < 220);
  return unique(candidates);
}

function extractCoveredTopics(text) {
  const topicMap = [
    ['B2B buyer workflows', /\b(catalog|quick order|buyer|portal|company|rep|draft order|approval)\b/i],
    ['ERP, EDI, and system-of-record boundaries', /\b(ERP|Blue Cherry|KBO|Boommy|integration|EDI|invoice|inventory|allocation)\b/i],
    ['Payments, tax, and terms', /\b(payment|Authorized\.net|Stripe|Shopify Payments|Avalara|tax|net terms|credit hold)\b/i],
    ['Rollout timing and implementation path', /\b(timeline|go-live|launch|kickoff|October|June|rollout|implementation)\b/i],
    ['DTC, AI discovery, and storefront roadmap', /\b(DTC|consumer|Gemini|AI|Sidekick|agentic|discovery|storefront)\b/i],
    ['Commercial model and GMV attribution', /\b(pricing|fee|commercial|GMV|contract|opportunity|attributable)\b/i]
  ];
  return topicMap.filter(([, re]) => re.test(text)).map(([label]) => label);
}

function extractNextSteps(text) {
  const candidates = text
    .split(/\n+/)
    .map((item) => cleanText(item).replace(/^[-*•\d.)\s]+/, '').trim())
    .filter((item) => /\b(action|follow up|next step|send|confirm|review|circle back|owner|due|todo)\b/i.test(item))
    .filter((item) => item.length > 10 && item.length < 180);
  return unique(candidates);
}

function renderFastFollowSlide(slideId, model, config) {
  const speaker = (config?.speakers || []).find((person) => /SE/i.test(person.role))?.name || config?.speakers?.[0]?.name || '';
  return `

  <section class="slide" id="${escapeAttr(slideId)}" data-speaker="${escapeAttr(speaker)}">
    <div class="mesh-bg"></div>
    <div class="slide-particles">
      <span></span><span></span><span></span><span></span><span></span>
      <span></span><span></span><span></span><span></span><span></span>
    </div>
    <div class="slide-ambient-glow"></div>
    <div class="slide-inner stagger">
      <div class="slide-eyebrow">Fast follow</div>
      <h2 class="slide-title">${escapeHtml(model.title)}</h2>
      <p class="slide-lede">${escapeHtml(model.lede)}</p>
      <div class="recap-grid">
        <div class="recap-col">
          <div class="recap-col-label">WHAT WE COVERED</div>
          <ul class="recap-list">
            ${model.covered.map((item) => `<li>${escapeHtml(item)}</li>`).join('\n            ')}
          </ul>
        </div>
        <div class="recap-col">
          <div class="recap-col-label">QUESTIONS TO ANSWER</div>
          <ul class="recap-list">
            ${model.questions.map((item) => `<li>${escapeHtml(item)}</li>`).join('\n            ')}
          </ul>
        </div>
        <div class="recap-col">
          <div class="recap-col-label">RECOMMENDED NEXT STEPS</div>
          <ul class="recap-list">
            ${model.next_steps.map((item) => `<li>${escapeHtml(item)}</li>`).join('\n            ')}
          </ul>
        </div>
      </div>
    </div>
  </section>`;
}

function insertSlideBeforeClose(html, slideHtml) {
  const closeMatch = html.match(/\n\s*<section\b[^>]*class=["'][^"']*\bslide\b[^"']*\bclosing\b[^"']*["'][^>]*>/i);
  if (closeMatch?.index) {
    return `${html.slice(0, closeMatch.index)}${slideHtml}\n${html.slice(closeMatch.index)}`;
  }

  const scriptIndex = html.search(/\n\s*<script\b/i);
  if (scriptIndex > -1) return `${html.slice(0, scriptIndex)}${slideHtml}\n${html.slice(scriptIndex)}`;
  return `${html}\n${slideHtml}\n`;
}

function mergeFastFollowConfig(config, configPath, notesPath, sourceId, slideId, model) {
  const existingSources = new Set((config.sources || []).map((source) => source.id));
  if (!existingSources.has(sourceId)) {
    config.sources ||= [];
    config.sources.push({
      id: sourceId,
      type: 'meeting-notes',
      path: path.relative(path.dirname(configPath), notesPath),
      label: `Fast follow notes, ${todayStamp()}`,
      confidence: 'medium'
    });
  }

  config.slides ||= [];
  if (!config.slides.some((slide) => slide.id === slideId)) {
    const closeIndex = config.slides.findIndex((slide) => slide.pattern === 'closing' || slide.id === 'close');
    const slideConfig = {
      id: slideId,
      pattern: 'fast-follow',
      speaker: (config?.speakers || []).find((person) => /SE/i.test(person.role))?.name || config?.speakers?.[0]?.name || '',
      evidence: [sourceId],
      notes: `${model.questions.length} question(s), ${model.covered.length} covered topic(s)`
    };
    if (closeIndex > -1) config.slides.splice(closeIndex, 0, slideConfig);
    else config.slides.push(slideConfig);
  }

  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

function resolveManifestPath(htmlPath, explicitPath, options = {}) {
  if (explicitPath) return path.resolve(explicitPath);
  const adjacent = path.join(path.dirname(htmlPath), 'deck.manifest.json');
  if (options.forWrite) return adjacent;
  return fs.existsSync(adjacent) ? adjacent : null;
}

function readManifest(manifestPath, warnings, options = {}) {
  if (!manifestPath) return null;
  if (!fs.existsSync(manifestPath)) {
    if (!options.silentMissing) warnings.push(`Manifest not found: ${manifestPath}`);
    return null;
  }
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (!Array.isArray(manifest.modules)) {
      warnings.push(`deck.manifest.json has no modules array: ${manifestPath}`);
    }
    return manifest;
  } catch (error) {
    warnings.push(`Could not parse deck.manifest.json: ${error.message}`);
    return null;
  }
}

function writeManifest(manifestPath, manifest) {
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function updateManifestSlideFields(htmlPath, body) {
  const warnings = [];
  let manifestPath = resolveManifestPath(htmlPath, null);
  let manifest = readManifest(manifestPath, warnings, { silentMissing: true });

  if (!manifest) {
    manifestPath = resolveManifestPath(htmlPath, null, { forWrite: true });
    const configPath = resolveConfigPath(htmlPath, null);
    const config = readConfig(configPath, warnings);
    manifest = buildDeckManifestForPath(htmlPath, { configPath, config, manifestPath });
  }

  if (!manifestPath) throw new Error('No deck.manifest.json path could be resolved.');

  const slideId = String(body?.id || body?.slide_id || '').trim();
  if (!slideId) throw new Error('Missing slide id.');

  const slide = (manifest.slides || []).find((item) => {
    return item.id === slideId ||
      item.manifest_slide_id === slideId ||
      String(item.source_slide_number || '') === slideId;
  });
  if (!slide) throw new Error(`Unknown slide: ${slideId}`);

  const isCoverSlide = slide.id === 'cover' || slide.pattern === 'cover';
  const fields = isCoverSlide
    ? normalizeCoverSlideFields(body?.fields || {})
    : normalizeGenericSlideFields(body?.fields || {});
  if (!Object.keys(fields).length) throw new Error(`No supported ${isCoverSlide ? 'cover' : 'slide'} fields provided.`);

  const now = new Date().toISOString();
  slide.fields = { ...(slide.fields || {}), ...fields };
  if (Object.prototype.hasOwnProperty.call(fields, 'eyebrow')) slide.eyebrow = fields.eyebrow;
  if (Object.prototype.hasOwnProperty.call(fields, 'title')) slide.title = fields.title;
  if (Object.prototype.hasOwnProperty.call(fields, 'speaker')) slide.speaker = fields.speaker;
  slide.updated_at = now;

  const matchingModule = (manifest.modules || []).find((module) => {
    return module.id === slide.id ||
      module.source_slide_id === slide.id ||
      Number(module.source_slide_number) === Number(slide.source_slide_number);
  });
  if (matchingModule && Object.prototype.hasOwnProperty.call(fields, 'title')) {
    matchingModule.title = fields.title;
    matchingModule.updated_at = now;
  }

  manifest.updated_at = now;
  writeManifest(manifestPath, manifest);
}

function updateManifestTheme(htmlPath, body) {
  const warnings = [];
  let manifestPath = resolveManifestPath(htmlPath, null);
  let manifest = readManifest(manifestPath, warnings, { silentMissing: true });

  if (!manifest) {
    manifestPath = resolveManifestPath(htmlPath, null, { forWrite: true });
    const configPath = resolveConfigPath(htmlPath, null);
    const config = readConfig(configPath, warnings);
    manifest = buildDeckManifestForPath(htmlPath, { configPath, config, manifestPath });
  }

  if (!manifestPath) throw new Error('No deck.manifest.json path could be resolved.');

  const theme = normalizeThemeFields(body || {});
  if (!theme.accent || !theme.accent_bright) throw new Error('Theme preset requires accent and bright colors.');

  const now = new Date().toISOString();
  const existingBrand = manifest.brand && typeof manifest.brand === 'object' ? manifest.brand : {};
  const merchantPreset = normalizeMerchantThemePreset(existingBrand.merchant_preset)
    || captureMerchantThemePreset(existingBrand, manifest);
  const nextBrand = {
    ...existingBrand,
    mode: 'studio-preset',
    preset_id: theme.preset_id || 'custom',
    preset_label: theme.preset_label || 'Studio preset',
    accent: theme.accent,
    accent_bright: theme.accent_bright,
    heading_font: theme.heading_font || existingBrand.heading_font || 'Inter',
    updated_at: now
  };
  if (merchantPreset) nextBrand.merchant_preset = merchantPreset;
  manifest.brand = nextBrand;
  manifest.updated_at = now;

  writeManifest(manifestPath, manifest);
}

const SHARED_THEME_PRESET_IDS = new Set(['shopify-teal', 'commerce-blue', 'launch-gold', 'ai-coral']);

function normalizeMerchantThemePreset(value) {
  if (!value || typeof value !== 'object') return null;
  const accent = normalizeHexColor(value.accent);
  const accentBright = normalizeHexColor(value.accent_bright || value.bright);
  if (!accent || !accentBright) return null;

  return stripUndefined({
    label: normalizeManifestTextField(value.label || value.preset_label || '', 120),
    accent,
    accent_bright: accentBright,
    heading_font: normalizeManifestTextField(value.heading_font || '', 80)
  });
}

function captureMerchantThemePreset(brand, manifest) {
  if (!brand || typeof brand !== 'object') return null;
  const presetId = normalizeManifestTextField(brand.preset_id || '', 80);
  if (SHARED_THEME_PRESET_IDS.has(presetId)) return null;

  const accent = normalizeHexColor(brand.accent);
  const accentBright = normalizeHexColor(brand.accent_bright || brand.bright);
  if (!accent || !accentBright) return null;

  const merchant = normalizeManifestTextField(manifest?.merchant?.name || '', 120);
  const label = merchant ? `${merchant} Brand` : normalizeManifestTextField(brand.preset_label || 'Merchant Brand', 120);

  return stripUndefined({
    label,
    accent,
    accent_bright: accentBright,
    heading_font: normalizeManifestTextField(brand.heading_font || '', 80)
  });
}

function normalizeThemeFields(value) {
  return {
    preset_id: normalizeManifestTextField(value.preset_id || value.id || '', 80),
    preset_label: normalizeManifestTextField(value.preset_label || value.label || '', 120),
    accent: normalizeHexColor(value.accent),
    accent_bright: normalizeHexColor(value.accent_bright || value.bright),
    heading_font: normalizeManifestTextField(value.heading_font || '', 80)
  };
}

function normalizeHexColor(value) {
  const text = String(value || '').trim();
  const match = text.match(/^#?([0-9a-f]{6})$/i);
  return match ? `#${match[1].toLowerCase()}` : '';
}

function normalizeCoverSlideFields(fields) {
  const rules = {
    eyebrow: 90,
    title: 150,
    subtitle: 320,
    prepared_for: 160,
    presented_by: 160,
    focus: 160,
    speaker: 80
  };
  const normalized = {};
  for (const [key, max] of Object.entries(rules)) {
    if (!Object.prototype.hasOwnProperty.call(fields, key)) continue;
    normalized[key] = normalizeManifestTextField(fields[key], max);
  }
  return normalized;
}

function normalizeGenericSlideFields(fields) {
  const rules = {
    eyebrow: 90,
    title: 180,
    speaker: 80,
    lede: 320,
    feature_closing: 240
  };
  const normalized = {};
  for (const [key, max] of Object.entries(rules)) {
    if (!Object.prototype.hasOwnProperty.call(fields, key)) continue;
    normalized[key] = normalizeManifestTextField(fields[key], max);
  }
  for (const key of ['discovery_confirmed', 'discovery_in_motion', 'feature_bullets']) {
    if (!Object.prototype.hasOwnProperty.call(fields, key)) continue;
    normalized[key] = normalizeManifestMultilineField(fields[key], {
      maxLineLength: key === 'feature_bullets' ? 190 : 180,
      maxLines: key === 'feature_bullets' ? 6 : 7
    });
  }
  return normalized;
}

function normalizeManifestTextField(value, maxLength) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function normalizeManifestMultilineField(value, options = {}) {
  const maxLineLength = options.maxLineLength || 180;
  const maxLines = options.maxLines || 6;
  return String(value ?? '')
    .split(/\r?\n/)
    .map((line) => normalizeManifestTextField(line, maxLineLength))
    .filter(Boolean)
    .slice(0, maxLines)
    .join('\n');
}

function buildDeckManifestForPath(htmlPath, options = {}) {
  const warnings = [];
  const manifestPath = options.manifestPath || resolveManifestPath(htmlPath, options.manifest, { forWrite: true });
  const configPath = Object.prototype.hasOwnProperty.call(options, 'configPath')
    ? options.configPath
    : resolveConfigPath(htmlPath, options.config);
  const html = fs.readFileSync(htmlPath, 'utf8');
  const config = Object.prototype.hasOwnProperty.call(options, 'config')
    ? options.config
    : readConfig(configPath, warnings);

  return buildDeckManifest({ htmlPath, configPath, manifestPath, config, html });
}

function buildDeckManifest({ htmlPath, configPath, manifestPath, config, html }) {
  const sourceSlides = findSlides(html);
  const plan = buildDeckPlan({ htmlPath, configPath, config, slides: sourceSlides, html });
  const studioHtml = applySlidePickerSelectionsToHtml(html, { htmlPath, configPath, config, plan, initialSlideNumber: 1 });
  const visibleSlides = findStudioVisibleSlides(studioHtml);
  const slidePicker = decorateSlidePickerWithSlideTargets(
    buildSlidePicker({ config, plan, html }),
    { config, sourceSlides, visibleSlides }
  );
  const manifestDir = path.dirname(manifestPath || htmlPath);

  return {
    schema_version: '0.1',
    source: {
      html: manifestRelativePath(manifestDir, htmlPath),
      config: configPath ? manifestRelativePath(manifestDir, configPath) : null
    },
    merchant: cloneJson(config?.merchant || {}),
    deck: cloneJson(config?.deck || { title: extractTitle(html) || path.basename(htmlPath) }),
    brand: cloneJson(config?.brand || {}),
    strategy: cloneJson(plan.strategy || {}),
    modules: slidePicker.modules.map((module) => manifestModuleFromStudioModule(module, { config, sourceSlides, visibleSlides })),
    slides: sourceSlides.map((slide) => manifestSlideFromSourceSlide(slide, { config, visibleSlides })),
    updated_at: new Date().toISOString()
  };
}

function manifestModuleFromStudioModule(module, { config, sourceSlides, visibleSlides }) {
  const sourceSlide = module.source_slide_number
    ? sourceSlides.find((slide) => slide.number === module.source_slide_number)
    : null;
  const visibleSlide = module.target_slide_number
    ? visibleSlides.find((slide) => slide.number === module.target_slide_number)
    : null;
  const sourceOutline = sourceSlide ? outlineSlide(sourceSlide) : null;
  const visibleOutline = visibleSlide ? outlineSlide(visibleSlide) : null;
  const configSlides = Array.isArray(config?.slides) ? config.slides : [];
  const sourceConfigSlide = sourceSlide
    ? (sourceOutline?.id && configSlides.find((item) => item.id === sourceOutline.id)) || configSlides[sourceSlide.number - 1] || {}
    : {};
  const targetConfigSlide = visibleSlide
    ? (visibleOutline?.id && configSlides.find((item) => item.id === visibleOutline.id)) || configSlides[visibleSlide.source_number - 1] || {}
    : {};
  const patterns = Array.isArray(module.patterns) ? module.patterns.filter(Boolean) : [];
  const pattern = module.add_pattern || patterns[0] || '';
  const addedPattern = module.added_slide_id ? pattern : '';

  return stripUndefined({
    id: module.id,
    label: module.label,
    title: module.target_slide_title || module.source_slide_title || module.label,
    pattern,
    patterns,
    requirement: module.requirement,
    section: module.section || '',
    section_label: module.section_label || '',
    slot: module.slot || '',
    slot_label: module.slot_label || '',
    flow_order: module.flow_order || null,
    included: Boolean(module.included),
    present: Boolean(module.present),
    state: manifestModuleState(module),
    source_slide_id: sourceConfigSlide.id || sourceOutline?.id || '',
    source_slide_number: module.source_slide_number || null,
    target_slide_number: module.target_slide_number || null,
    target_slide_id: targetConfigSlide.id || visibleOutline?.id || '',
    added_slide_id: module.added_slide_id || '',
    added_pattern: addedPattern,
    renderer_version: module.renderer_version || null,
    current_renderer_version: module.current_renderer_version || null,
    export_behavior: module.export_behavior || '',
    scaffold_quality: module.scaffold_quality || '',
    updated_at: module.updated_at || null
  });
}

function manifestSlideFromSourceSlide(slide, { config, visibleSlides }) {
  const outline = outlineSlide(slide);
  const configSlides = Array.isArray(config?.slides) ? config.slides : [];
  const configSlide = (outline.id && configSlides.find((item) => item.id === outline.id)) || configSlides[slide.number - 1] || {};
  const visible = visibleSlides.some((item) => item.source_number === slide.number);

  return stripUndefined({
    id: configSlide.id || outline.id || `slide-${String(slide.number).padStart(2, '0')}`,
    source_slide_number: slide.number,
    title: outline.title,
    speaker: configSlide.speaker || outline.speaker || '',
    pattern: configSlide.pattern || attr(slide.attrs, 'data-pattern') || '',
    included: visible,
    evidence: Array.isArray(configSlide.evidence) ? configSlide.evidence : []
  });
}

function manifestModuleState(module) {
  if (module.included && module.present) return 'present';
  if (module.included && !module.present) return module.status || 'planned';
  if (!module.included && module.present) return 'excluded';
  return 'available';
}

function configWithManifestDecisions(config, manifest) {
  if (!config || !Array.isArray(manifest?.modules) || !manifest.modules.length) return config;

  const next = cloneJson(config);
  next.studio ||= {};
  next.studio.slide_picker ||= { version: 1 };
  next.studio.slide_picker.version = 1;
  next.studio.slide_picker.updated_at = manifest.updated_at || next.studio.slide_picker.updated_at || null;
  if (manifest.brand && typeof manifest.brand === 'object') {
    next.brand = {
      ...(next.brand || {}),
      ...cloneJson(manifest.brand)
    };
  }

  const existingModules = next.studio.slide_picker.modules && typeof next.studio.slide_picker.modules === 'object'
    ? next.studio.slide_picker.modules
    : {};
  const modules = { ...existingModules };

  for (const manifestModule of manifest.modules) {
    const id = String(manifestModule?.id || '').trim();
    if (!id) continue;

    const decision = {
      ...normalizeSlidePickerDecision(modules[id])
    };
    if (typeof manifestModule.included === 'boolean') decision.included = manifestModule.included;
    if (manifestModule.added_slide_id && manifestModule.added_pattern) decision.added_pattern = manifestModule.added_pattern;
    if (manifestModule.added_slide_id) decision.added_slide_id = manifestModule.added_slide_id;
    if (manifestModule.renderer_version) decision.renderer_version = manifestModule.renderer_version;
    decision.updated_at = manifestModule.updated_at || manifest.updated_at || decision.updated_at || null;
    modules[id] = stripUndefined(decision);
  }

  next.studio.slide_picker.modules = modules;
  return next;
}

function syncManifestIfPresent(htmlPath, configPath, config) {
  const manifestPath = resolveManifestPath(htmlPath, null);
  if (!manifestPath) return null;
  const manifest = buildDeckManifestForPath(htmlPath, { configPath, config, manifestPath });
  writeManifest(manifestPath, manifest);
  return manifest;
}

function summarizeManifest(manifest, manifestPath) {
  if (!manifest) {
    return {
      status: 'missing',
      path: null,
      module_count: 0,
      updated_at: null
    };
  }

  return {
    status: 'active',
    path: manifestPath,
    schema_version: manifest.schema_version || '',
    module_count: Array.isArray(manifest.modules) ? manifest.modules.length : 0,
    slide_count: Array.isArray(manifest.slides) ? manifest.slides.length : 0,
    updated_at: manifest.updated_at || null
  };
}

function manifestRelativePath(fromDir, targetPath) {
  return path.relative(fromDir, targetPath).split(path.sep).join('/') || path.basename(targetPath);
}

function cloneJson(value) {
  if (value === null || typeof value === 'undefined') return value;
  return JSON.parse(JSON.stringify(value));
}

function stripUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => typeof item !== 'undefined'));
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value || {}, key);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function parseOptions(args) {
  const options = { _: [] };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--json') options.json = true;
    else if (arg === '--strict') options.strict = true;
    else if (arg === '--force') options.force = true;
    else if (arg === '--config') options.config = args[++i];
    else if (arg === '--manifest') options.manifest = args[++i];
    else if (arg === '--chrome') options.chrome = args[++i];
    else if (arg === '--host') options.host = args[++i];
    else if (arg === '--port') options.port = args[++i];
    else if (arg === '--api-port') options.apiPort = args[++i];
    else if (arg === '--open') options.open = true;
    else if (arg === '--no-open') options.noOpen = true;
    else if (arg === '--field-guide-copy') options.fieldGuideCopy = true;
    else if (arg === '--no-field-guide-copy') options.noFieldGuideCopy = true;
    else if (arg === '--field-guide-dir') options.fieldGuideDir = args[++i];
    else if (arg === '--field-guide-name') options.fieldGuideName = args[++i];
    else if (arg === '--alt') options.alt = args[++i];
    else if (arg === '--source-url') options.sourceUrl = args[++i];
    else if (arg === '--output') options.output = args[++i];
    else if (arg === '--id') options.id = args[++i];
    else options._.push(arg);
  }
  return options;
}

function readConfig(configPath, warnings) {
  if (!configPath) return null;
  if (!fs.existsSync(configPath)) {
    warnings.push(`Config not found: ${configPath}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    warnings.push(`Could not parse deck.config.json: ${error.message}`);
    return null;
  }
}

function resolveConfigPath(htmlPath, explicitPath) {
  if (explicitPath) return path.resolve(explicitPath);
  const adjacent = path.join(path.dirname(htmlPath), 'deck.config.json');
  return fs.existsSync(adjacent) ? adjacent : null;
}

function readPatternRegistry() {
  const registryPath = path.join(__dirname, 'pattern-registry.json');
  if (!fs.existsSync(registryPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  } catch {
    return null;
  }
}

function findChrome(explicitPath) {
  const candidates = [
    explicitPath,
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    'google-chrome',
    'chromium',
    'chromium-browser',
    'chrome',
    'msedge'
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate.includes('/') && fs.existsSync(candidate)) return candidate;
    const result = spawnSync(candidate, ['--version'], { encoding: 'utf8' });
    if (result.status === 0) return candidate;
  }
  return null;
}

function defaultPdfPath(htmlPath) {
  const dir = path.dirname(htmlPath);
  const base = path.basename(htmlPath, path.extname(htmlPath));
  return path.join(dir, 'exports', `${base}.pdf`);
}

function defaultRenderedHtmlPath(htmlPath) {
  const dir = path.dirname(htmlPath);
  const slug = path.basename(dir) || path.basename(htmlPath, path.extname(htmlPath));
  return path.join(dir, 'exports', `${slug}-selected-deck.html`);
}

function resolvePublishOutputPath(htmlPath, outputArg) {
  if (!outputArg) return path.join(path.dirname(htmlPath), 'exports', 'quick', 'index.html');
  const outputPath = path.resolve(outputArg);
  if (path.extname(outputPath).toLowerCase() === '.html') return outputPath;
  return path.join(outputPath, 'index.html');
}

function titleize(slug) {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function safeHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

function attr(attrs, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return attrs.match(new RegExp(`\\b${escaped}=["']([^"']+)["']`, 'i'))?.[1] || '';
}

function firstText(html, re) {
  const match = html.match(re);
  return match ? cleanText(match[1]) : '';
}

function slideWordCount(slide) {
  const text = cleanText(slide.block
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' '));
  return text ? text.split(/\s+/).length : 0;
}

function cleanText(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&middot;/g, '·')
    .replace(/&times;/g, '×')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .trim();
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function count(text, re) {
  return (text.match(re) || []).length;
}

function unique(items) {
  return [...new Set(items)];
}

function formatBytes(bytes) {
  if (!bytes) return '0B';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function send(response, status, body, contentType) {
  response.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  });
  response.end(body);
}

function sendJson(response, body, status = 200) {
  send(response, status, JSON.stringify(body, null, 2), 'application/json; charset=utf-8');
}

function studioApiLandingHtml(htmlPath) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Demo Deck Studio API</title>
<style>
  body {
    margin: 0;
    min-height: 100vh;
    display: grid;
    place-items: center;
    background: #0b0f14;
    color: #eef4f5;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  main {
    width: min(720px, calc(100vw - 40px));
    border: 1px solid #2c3946;
    border-radius: 8px;
    background: #111820;
    padding: 24px;
  }
  h1 { margin: 0 0 12px; font-size: 22px; }
  p, code { color: #9caab6; }
  code { display: block; white-space: pre-wrap; word-break: break-word; }
</style>
</head>
<body>
<main>
  <h1>Demo Deck Studio API</h1>
  <p>Backend ready for the v2 local app.</p>
  <code>${escapeHtml(htmlPath)}</code>
</main>
</body>
</html>`;
}

function studioDeckHtml(htmlPath, initialSlideNumber = 1) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const warnings = [];
  const manifestPath = resolveManifestPath(htmlPath, null);
  const manifest = readManifest(manifestPath, warnings, { silentMissing: true });
  const manifestHtml = renderManifestSelectedDeckHtml(html, { htmlPath, manifestPath, manifest, initialSlideNumber });
  if (manifestHtml) return manifestHtml;

  const configPath = resolveConfigPath(htmlPath, null);
  const config = configWithManifestDecisions(readConfig(configPath, warnings), manifest);
  if (!config) return html;

  const slides = findSlides(html);
  const plan = buildDeckPlan({ htmlPath, configPath, config, slides, html });
  return applySlidePickerSelectionsToHtml(html, { htmlPath, configPath, config, plan, initialSlideNumber });
}

function renderPortableDeckHtml(htmlPath, options = {}) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const warnings = [];
  const manifestPath = resolveManifestPath(htmlPath, options.manifest);
  const manifest = readManifest(manifestPath, warnings, { silentMissing: true });
  const manifestHtml = renderManifestSelectedDeckHtml(html, {
    htmlPath,
    manifestPath,
    manifest,
    initialSlideNumber: options.initialSlideNumber || 1
  });

  if (manifestHtml) {
    return {
      html: manifestHtml,
      mode: 'manifest',
      manifestPath,
      warnings,
      slideCount: findSlides(manifestHtml).length
    };
  }

  const fallbackHtml = studioDeckHtml(htmlPath, options.initialSlideNumber || 1);
  return {
    html: fallbackHtml,
    mode: 'config',
    manifestPath: null,
    warnings,
    slideCount: findStudioVisibleSlides(fallbackHtml).length
  };
}

function renderManifestSelectedDeckHtml(html, { htmlPath, manifestPath, manifest, initialSlideNumber = 1 }) {
  if (!manifest || !Array.isArray(manifest.slides)) return null;

  const sourceSlides = findSlides(html);
  if (!sourceSlides.length) return null;

  const byNumber = new Map(sourceSlides.map((slide) => [slide.number, slide]));
  const selectedBlocks = [];
  const seen = new Set();

  for (const manifestSlide of manifest.slides) {
    if (!manifestSlide?.included) continue;
    const sourceNumber = Number(manifestSlide.source_slide_number);
    if (!Number.isInteger(sourceNumber) || seen.has(sourceNumber)) continue;
    const sourceSlide = byNumber.get(sourceNumber);
    if (!sourceSlide) continue;
    const renderedBlock = applyManifestSlideFieldsToBlock(sourceSlide.block, manifestSlide);
    selectedBlocks.push(markManifestRenderedSlide(renderedBlock, manifestSlide, sourceNumber));
    seen.add(sourceNumber);
  }

  if (!selectedBlocks.length) return null;

  const firstSlide = sourceSlides[0];
  const lastSlide = sourceSlides[sourceSlides.length - 1];
  const lastSlideEnd = lastSlide.index + lastSlide.block.length;
  const sourceLabel = path.basename(htmlPath);
  const manifestLabel = manifestPath ? path.basename(manifestPath) : 'deck.manifest.json';
  const note = `<!-- Demo Deck Studio manifest render: ${selectedBlocks.length} selected slide${selectedBlocks.length === 1 ? '' : 's'} from ${sourceSlides.length} source slide${sourceSlides.length === 1 ? '' : 's'}. Source HTML unchanged: ${sourceLabel} + ${manifestLabel}. -->`;
  const output = [
    html.slice(0, firstSlide.index),
    note,
    selectedBlocks.join('\n'),
    html.slice(lastSlideEnd)
  ].join('\n');

  return applyStudioDeckRuntime(setInitialStudioActiveSlide(applyManifestBrandToHtml(output, manifest.brand), initialSlideNumber));
}

function applyManifestBrandToHtml(html, brand) {
  if (!brand || typeof brand !== 'object') return html;
  const accent = normalizeHexColor(brand.accent);
  const accentBright = normalizeHexColor(brand.accent_bright);
  if (!accent && !accentBright) return html;

  const vars = {};
  if (accent) {
    const rgb = hexToRgb(accent);
    vars['--accent'] = accent;
    vars['--c-accent'] = accent;
    vars['--accent-rgb'] = rgb.join(', ');
    vars['--accent-dim'] = `rgba(${rgb.join(', ')}, 0.14)`;
    vars['--accent-glow'] = `rgba(${rgb.join(', ')}, 0.42)`;
  }
  if (accentBright) {
    const brightRgb = hexToRgb(accentBright);
    vars['--accent-bright'] = accentBright;
    vars['--c-accent-bright'] = accentBright;
    vars['--accent-bright-rgb'] = brightRgb.join(', ');
    vars['--accent-border'] = `rgba(${brightRgb.join(', ')}, 0.34)`;
  }

  return replaceRootCssVars(html, vars);
}

function replaceRootCssVars(html, vars) {
  if (!vars || !Object.keys(vars).length) return html;
  return html.replace(/(:root\s*\{)([\s\S]*?)(\})/i, (match, open, body, close) => {
    let nextBody = body;
    for (const [name, value] of Object.entries(vars)) {
      const re = new RegExp(`(${escapeRegExp(name)}\\s*:\\s*)[^;]+;`, 'i');
      if (re.test(nextBody)) {
        nextBody = nextBody.replace(re, `$1${value};`);
      } else {
        nextBody = `${nextBody.replace(/\s*$/, '')}\n    ${name}: ${value};\n`;
      }
    }
    return `${open}${nextBody}${close}`;
  });
}

function hexToRgb(hex) {
  const normalized = normalizeHexColor(hex).slice(1);
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16)
  ];
}

function markManifestRenderedSlide(block, manifestSlide, sourceNumber) {
  return block.replace(/<(section|div)\b([^>]*)>/i, (opener, tag, attrs) => {
    let updatedAttrs = attrs;
    if (!/\bdata-studio-source-slide=/i.test(updatedAttrs)) {
      updatedAttrs += ` data-studio-source-slide="${escapeAttr(String(sourceNumber))}"`;
    }
    if (manifestSlide?.id && !/\bdata-studio-manifest-slide-id=/i.test(updatedAttrs)) {
      updatedAttrs += ` data-studio-manifest-slide-id="${escapeAttr(String(manifestSlide.id))}"`;
    }
    return `<${tag}${updatedAttrs}>`;
  });
}

function applyManifestSlideFieldsToBlock(block, manifestSlide) {
  if (!manifestSlide || !manifestSlide.fields || typeof manifestSlide.fields !== 'object') return block;
  if (manifestSlide.id === 'cover' || manifestSlide.pattern === 'cover') {
    return applyCoverFieldsToBlock(block, manifestSlide.fields);
  }
  return applyGenericSlideFieldsToBlock(block, manifestSlide.fields);
}

function applyCoverFieldsToBlock(block, fields) {
  let output = block;
  if (hasOwn(fields, 'speaker')) output = setSlideDataSpeaker(output, fields.speaker);
  if (hasOwn(fields, 'eyebrow')) output = replaceClassInnerHtml(output, 'cover-eyebrow', escapeHtml(fields.eyebrow));
  if (hasOwn(fields, 'title')) output = replaceClassInnerHtml(output, 'cover-title', renderCoverTitleHtml(fields.title));
  if (hasOwn(fields, 'subtitle')) output = replaceClassInnerHtml(output, 'cover-sub', escapeHtml(fields.subtitle));
  if (hasOwn(fields, 'prepared_for')) output = replaceCoverMetaValue(output, 'Prepared For', fields.prepared_for);
  if (hasOwn(fields, 'presented_by')) output = replaceCoverMetaValue(output, 'Presented By', fields.presented_by);
  if (hasOwn(fields, 'focus')) output = replaceCoverMetaValue(output, 'Focus', fields.focus);
  return output;
}

function applyGenericSlideFieldsToBlock(block, fields) {
  let output = block;
  if (hasOwn(fields, 'speaker')) output = setSlideDataSpeaker(output, fields.speaker);
  if (hasOwn(fields, 'eyebrow')) output = replaceClassInnerHtml(output, 'slide-eyebrow', escapeHtml(fields.eyebrow));
  if (hasOwn(fields, 'title')) output = replaceFirstHeadingInnerHtml(output, renderSlideTitleHtml(fields.title));
  if (hasOwn(fields, 'lede')) output = replaceGenericLedeHtml(output, fields.lede);
  if (hasOwn(fields, 'discovery_confirmed')) output = replaceNthListItemsByClass(output, 'recap-list', 0, fields.discovery_confirmed, renderPlainListItemHtml);
  if (hasOwn(fields, 'discovery_in_motion')) output = replaceNthListItemsByClass(output, 'recap-list', 1, fields.discovery_in_motion, renderPlainListItemHtml);
  if (hasOwn(fields, 'feature_bullets')) output = replaceNthListItemsByClass(output, 'feature-capabilities', 0, fields.feature_bullets, renderFeatureBulletItemHtml);
  if (hasOwn(fields, 'feature_closing')) output = replaceFeatureClosingHtml(output, fields.feature_closing);
  return output;
}

function setSlideDataSpeaker(block, speaker) {
  return block.replace(/<(section|div)\b([^>]*)>/i, (opener, tag, attrs) => {
    const value = escapeAttr(speaker);
    if (/\bdata-speaker=(["'])[^"']*\1/i.test(attrs)) {
      return `<${tag}${attrs.replace(/\bdata-speaker=(["'])[^"']*\1/i, `data-speaker="${value}"`)}>`;
    }
    return `<${tag}${attrs} data-speaker="${value}">`;
  });
}

function replaceClassInnerHtml(block, className, replacementHtml) {
  const escapedClass = escapeRegExp(className);
  const re = new RegExp(`(<([a-z0-9]+)\\b(?=[^>]*\\bclass=(["'])[^"']*\\b${escapedClass}\\b[^"']*\\3)[^>]*>)([\\s\\S]*?)(<\\/\\2>)`, 'i');
  return block.replace(re, (match, open, tag, quote, existing, close) => `${open}${replacementHtml}${close}`);
}

function replaceFirstHeadingInnerHtml(block, replacementHtml) {
  return block.replace(/(<h[12]\b[^>]*>)([\s\S]*?)(<\/h[12]>)/i, (match, open, existing, close) => `${open}${replacementHtml}${close}`);
}

function replaceGenericLedeHtml(block, value) {
  const html = escapeHtml(value);
  if (/\bclass=(["'])[^"']*\bslide-lede\b/i.test(block)) return replaceClassInnerHtml(block, 'slide-lede', html);
  if (/\bclass=(["'])[^"']*\bsection-header-sub\b/i.test(block)) return replaceClassInnerHtml(block, 'section-header-sub', html);
  return block;
}

function replaceFeatureClosingHtml(block, value) {
  const html = escapeHtml(value);
  if (/\bclass=(["'])[^"']*\bfeature-closing\b/i.test(block)) return replaceClassInnerHtml(block, 'feature-closing', html);
  if (/\bclass=(["'])[^"']*\bagentic-impact-callout\b/i.test(block)) return replaceClassInnerHtml(block, 'agentic-impact-callout', html);
  return block;
}

function replaceNthListItemsByClass(block, className, index, value, renderItem) {
  const escapedClass = escapeRegExp(className);
  const re = new RegExp(`(<ul\\b(?=[^>]*\\bclass=(["'])[^"']*\\b${escapedClass}\\b[^"']*\\2)[^>]*>)([\\s\\S]*?)(<\\/ul>)`, 'gi');
  let listIndex = 0;
  return block.replace(re, (match, open, quote, existing, close) => {
    if (listIndex++ !== index) return match;
    const items = multilineFieldItems(value);
    return `${open}\n${items.map((item) => `          ${renderItem(item)}`).join('\n')}\n        ${close}`;
  });
}

function replaceCoverMetaValue(block, label, value) {
  const escapedLabel = escapeRegExp(label).replace(/\s+/g, '\\s+');
  const re = new RegExp(`(<div\\b(?=[^>]*\\bclass=(["'])[^"']*\\bcover-meta-item\\b[^"']*\\2)[^>]*>[\\s\\S]*?<div\\b(?=[^>]*\\bclass=(["'])[^"']*\\blabel\\b[^"']*\\3)[^>]*>\\s*${escapedLabel}\\s*<\\/div>[\\s\\S]*?<div\\b(?=[^>]*\\bclass=(["'])[^"']*\\bvalue\\b[^"']*\\4)[^>]*>)([\\s\\S]*?)(<\\/div>)`, 'i');
  return block.replace(re, (match, prefix, quoteA, quoteB, quoteC, existing, suffix) => `${prefix}${escapeHtml(value)}${suffix}`);
}

function multilineFieldItems(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((item) => normalizeManifestTextField(item, 220))
    .filter(Boolean);
}

function renderPlainListItemHtml(value) {
  return `<li>${escapeHtml(value)}</li>`;
}

function renderFeatureBulletItemHtml(value) {
  const text = normalizeManifestTextField(value, 220);
  const parts = splitFeatureBullet(text);
  if (!parts) return `<li><span class="check">&#10003;</span> ${escapeHtml(text)}</li>`;
  return `<li><span class="check">&#10003;</span> <strong>${escapeHtml(parts.title)}</strong> &mdash; ${escapeHtml(parts.body)}</li>`;
}

function splitFeatureBullet(value) {
  const text = String(value || '').trim();
  const match = text.match(/^(.+?)\s+(?:—|–|-)\s+(.+)$/);
  if (!match) return null;
  return { title: match[1].trim(), body: match[2].trim() };
}

function renderSlideTitleHtml(value) {
  const text = normalizeManifestTextField(value, 180);
  if (!text) return '';

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return escapeHtml(text);

  const accent = words.pop();
  return `${escapeHtml(words.join(' '))} ${renderAccentTokenHtml(accent)}`;
}

function renderCoverTitleHtml(value) {
  const text = normalizeManifestTextField(value, 150);
  if (!text) return '';

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 1) return `<span class="accent">${escapeHtml(words[0])}</span>`;
  if (words.length <= 3) {
    const lead = words.slice(0, -1).join(' ');
    return `${lead ? `${escapeHtml(lead)} ` : ''}${renderAccentTokenHtml(words[words.length - 1])}`;
  }

  const breakIndex = Math.max(2, Math.ceil(words.length / 2));
  const firstLine = words.slice(0, breakIndex).join(' ');
  const secondLineWords = words.slice(breakIndex);
  const accent = secondLineWords.pop();
  const secondLine = secondLineWords.join(' ');

  if (!firstLine || !accent) return escapeHtml(text);
  return `${escapeHtml(firstLine)}<br>${secondLine ? `${escapeHtml(secondLine)} ` : ''}${renderAccentTokenHtml(accent)}`;
}

function renderAccentTokenHtml(token) {
  const match = String(token || '').match(/^(.+?)([.,!?;:]*)$/);
  const word = match?.[1] || token;
  const punctuation = match?.[2] || '';
  return `<span class="accent">${escapeHtml(word)}</span>${escapeHtml(punctuation)}`;
}

function buildStudioDeckData(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const studioHtml = studioDeckHtml(htmlPath);
  const slides = findStudioVisibleSlides(studioHtml);
  const sourceSlides = findSlides(html);
  const configPath = resolveConfigPath(htmlPath, null);
  const lint = lintDeck(htmlPath, configPath);
  const configWarnings = [];
  const manifestPath = resolveManifestPath(htmlPath, null);
  const manifest = readManifest(manifestPath, configWarnings, { silentMissing: true });
  const config = configWithManifestDecisions(readConfig(configPath, configWarnings), manifest);
  const slidePicker = decorateSlidePickerWithSlideTargets(
    buildSlidePicker({ config, plan: lint.plan, html }),
    { config, sourceSlides, visibleSlides: slides }
  );

  return {
    htmlPath,
    configPath,
    manifestPath,
    manifest: summarizeManifest(manifest, manifestPath),
    merchant: cloneJson(config?.merchant || manifest?.merchant || {}),
    title: extractTitle(html) || path.basename(htmlPath),
    slideCount: slides.length,
    sourceSlideCount: sourceSlides.length,
    slides: slides.map((slide) => {
      const manifestSlide = findManifestSlideForRenderedSlide(manifest, slide);
      return {
        ...outlineSlide(slide),
        source_number: slide.source_number || slide.number,
        manifest_slide_id: attr(slide.attrs, 'data-studio-manifest-slide-id') || manifestSlide?.id || '',
        fields: editableFieldsForStudioSlide(slide, manifestSlide),
        editable: isEditableStudioSlide(slide, manifestSlide)
      };
    }),
    lint,
    plan: lint.plan,
    brand: summarizeBrand(config, htmlPath, html),
    slide_picker: slidePicker
  };
}

function findManifestSlideForRenderedSlide(manifest, renderedSlide) {
  const manifestSlides = Array.isArray(manifest?.slides) ? manifest.slides : [];
  if (!manifestSlides.length) return null;

  const manifestSlideId = attr(renderedSlide.attrs, 'data-studio-manifest-slide-id');
  const sourceNumber = renderedSlide.source_number || Number(attr(renderedSlide.attrs, 'data-studio-source-slide')) || renderedSlide.number;
  const outline = outlineSlide(renderedSlide);

  return manifestSlides.find((slide) => slide.id && slide.id === manifestSlideId) ||
    manifestSlides.find((slide) => slide.id && slide.id === outline.id) ||
    manifestSlides.find((slide) => Number(slide.source_slide_number) === Number(sourceNumber)) ||
    null;
}

function editableFieldsForStudioSlide(renderedSlide, manifestSlide) {
  if (!isEditableStudioSlide(renderedSlide, manifestSlide)) return {};
  const extracted = isCoverStudioSlide(renderedSlide, manifestSlide)
    ? extractCoverFieldsFromBlock(renderedSlide.block)
    : extractGenericSlideFieldsFromBlock(renderedSlide.block);
  return {
    ...extracted,
    ...(manifestSlide?.fields || {})
  };
}

function isEditableStudioSlide(renderedSlide, manifestSlide) {
  if (isCoverStudioSlide(renderedSlide, manifestSlide)) return true;
  return Boolean(extractFirstHeadingText(renderedSlide.block) || extractClassText(renderedSlide.block, 'slide-eyebrow'));
}

function isCoverStudioSlide(renderedSlide, manifestSlide) {
  const classes = (attr(renderedSlide.attrs, 'class') || '').split(/\s+/).filter(Boolean);
  return manifestSlide?.id === 'cover' || manifestSlide?.pattern === 'cover' || classes.includes('cover');
}

function extractCoverFieldsFromBlock(block) {
  return stripEmptyValues({
    speaker: extractSlideSpeakerFromBlock(block),
    eyebrow: extractClassText(block, 'cover-eyebrow'),
    title: extractClassText(block, 'cover-title'),
    subtitle: extractClassText(block, 'cover-sub'),
    prepared_for: extractCoverMetaText(block, 'Prepared For'),
    presented_by: extractCoverMetaText(block, 'Presented By'),
    focus: extractCoverMetaText(block, 'Focus')
  });
}

function extractGenericSlideFieldsFromBlock(block) {
  const fields = {
    speaker: extractSlideSpeakerFromBlock(block),
    eyebrow: extractClassText(block, 'slide-eyebrow'),
    title: extractFirstHeadingText(block),
    lede: extractGenericLedeText(block),
    discovery_confirmed: extractNthListItemsText(block, 'recap-list', 0),
    discovery_in_motion: extractNthListItemsText(block, 'recap-list', 1),
    feature_bullets: extractNthListItemsText(block, 'feature-capabilities', 0),
    feature_closing: extractFeatureClosingText(block)
  };

  return stripEmptyValues(fields);
}

function extractSlideSpeakerFromBlock(block) {
  const opener = block.match(/<(section|div)\b([^>]*)>/i);
  return opener ? attr(opener[2], 'data-speaker') : '';
}

function extractFirstHeadingText(block) {
  const match = block.match(/<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/i);
  return match ? cleanText(match[1]) : '';
}

function extractGenericLedeText(block) {
  return extractClassText(block, 'slide-lede') || extractClassText(block, 'section-header-sub');
}

function extractClassText(block, className) {
  const escapedClass = escapeRegExp(className);
  const re = new RegExp(`<([a-z0-9]+)\\b(?=[^>]*\\bclass=(["'])[^"']*\\b${escapedClass}\\b[^"']*\\2)[^>]*>([\\s\\S]*?)<\\/\\1>`, 'i');
  const match = block.match(re);
  return match ? cleanText(match[3]) : '';
}

function extractNthListItemsText(block, className, index) {
  const list = extractNthClassBlock(block, 'ul', className, index);
  if (!list) return '';

  const items = [];
  const re = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  let match;
  while ((match = re.exec(list))) {
    const item = cleanListItemText(match[1]);
    if (item) items.push(item);
  }
  return items.join('\n');
}

function extractFeatureClosingText(block) {
  return extractClassText(block, 'feature-closing') || extractClassText(block, 'agentic-impact-callout');
}

function extractNthClassBlock(block, tagName, className, index) {
  const escapedClass = escapeRegExp(className);
  const re = new RegExp(`<${tagName}\\b(?=[^>]*\\bclass=(["'])[^"']*\\b${escapedClass}\\b[^"']*\\1)[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
  let current = 0;
  let match;
  while ((match = re.exec(block))) {
    if (current++ === index) return match[2];
  }
  return '';
}

function cleanListItemText(html) {
  return cleanText(html)
    .replace(/^(?:✓|&#10003;|✔)\s*/i, '')
    .trim();
}

function extractCoverMetaText(block, label) {
  const escapedLabel = escapeRegExp(label).replace(/\s+/g, '\\s+');
  const re = new RegExp(`<div\\b(?=[^>]*\\bclass=(["'])[^"']*\\bcover-meta-item\\b[^"']*\\1)[^>]*>[\\s\\S]*?<div\\b(?=[^>]*\\bclass=(["'])[^"']*\\blabel\\b[^"']*\\2)[^>]*>\\s*${escapedLabel}\\s*<\\/div>[\\s\\S]*?<div\\b(?=[^>]*\\bclass=(["'])[^"']*\\bvalue\\b[^"']*\\3)[^>]*>([\\s\\S]*?)<\\/div>`, 'i');
  const match = block.match(re);
  return match ? cleanText(match[4]) : '';
}

function stripEmptyValues(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== ''));
}

function decorateSlidePickerWithSlideTargets(picker, { config, sourceSlides, visibleSlides }) {
  if (!picker || !Array.isArray(picker.modules)) return picker;
  return {
    ...picker,
    modules: picker.modules.map((module) => {
      const sourceTarget = firstMatchingStudioSlide(module, sourceSlides, config);
      const visibleSourceSlide = sourceTarget ? visibleSlides.find((slide) => slide.source_number === sourceTarget.number) : null;
      const visibleTarget = sourceTarget
        ? (visibleSourceSlide ? outlineSlide(visibleSourceSlide) : null)
        : firstMatchingStudioSlide(module, visibleSlides, config, { useOrdinalConfigFallback: false });
      return {
        ...module,
        target_slide_number: visibleTarget?.number || null,
        target_slide_title: visibleTarget?.title || '',
        source_slide_number: sourceTarget?.number || null,
        source_slide_title: sourceTarget?.title || ''
      };
    })
  };
}

function firstMatchingStudioSlide(module, slides, config, options = {}) {
  for (const slide of slides || []) {
    const descriptor = describeSlideForStudio(config, slide, options);
    if (moduleMatchesStudioSlide(module, descriptor)) return outlineSlide(slide);
  }
  return null;
}

function applySlidePickerSelectionsToHtml(html, { htmlPath, configPath, config, plan, initialSlideNumber = 1 }) {
  const picker = buildSlidePicker({ config, plan, html });
  const excludedModules = picker.modules.filter((module) => module.present && !module.included);
  if (!excludedModules.length) return applyStudioDeckRuntime(setInitialStudioActiveSlide(html, initialSlideNumber));

  const slides = findSlides(html);
  let output = '';
  let cursor = 0;
  let hidden = 0;

  for (const slide of slides) {
    const descriptor = describeSlideForStudio(config, slide);
    const matchedModules = excludedModules.filter((module) => moduleMatchesStudioSlide(module, descriptor));
    if (!matchedModules.length) continue;

    output += html.slice(cursor, slide.index);
    output += markStudioExcludedSlide(slide.block, matchedModules);
    cursor = slide.index + slide.block.length;
    hidden += 1;
  }

  if (!hidden) return applyStudioDeckRuntime(setInitialStudioActiveSlide(html, initialSlideNumber));
  output += html.slice(cursor);
  const note = `<!-- Demo Deck Studio selection applied: ${hidden} slide${hidden === 1 ? '' : 's'} hidden from this view. Source HTML unchanged: ${path.basename(htmlPath)}${configPath ? ` + ${path.basename(configPath)}` : ''}. -->`;
  return applyStudioDeckRuntime(setInitialStudioActiveSlide(output.replace(/<body([^>]*)>/i, `<body$1>\n${note}`), initialSlideNumber));
}

function findStudioVisibleSlides(html) {
  return findSlides(html)
    .filter((slide) => attr(slide.attrs, 'data-studio-excluded') !== 'true')
    .map((slide, index) => ({ ...slide, source_number: Number(attr(slide.attrs, 'data-studio-source-slide')) || slide.number, number: index + 1 }));
}

function markStudioExcludedSlide(block, modules) {
  const label = modules.map((module) => module.label).join(', ');
  return block.replace(/<(section|div)\b([^>]*)>/i, (opener, tag, attrs) => {
    let updatedAttrs = attrs;
    const classMatch = updatedAttrs.match(/\bclass=["']([^"']*)["']/i);
    if (classMatch && !classMatch[1].split(/\s+/).includes('studio-excluded')) {
      const quote = classMatch[0].includes('"') ? '"' : "'";
      updatedAttrs = updatedAttrs.replace(/\bclass=["'][^"']*["']/i, `class=${quote}${classMatch[1]} studio-excluded${quote}`);
    }
    if (!/\bdata-studio-excluded=/i.test(updatedAttrs)) {
      updatedAttrs += ` data-studio-excluded="true" data-studio-excluded-label="${escapeAttr(label)}"`;
    }
    return `<${tag}${updatedAttrs}>`;
  });
}

function setInitialStudioActiveSlide(html, initialSlideNumber = 1) {
  const slides = findSlides(html);
  const visibleSlides = slides.filter((slide) => attr(slide.attrs, 'data-studio-excluded') !== 'true');
  if (!visibleSlides.length) return html;

  const targetIndex = Math.max(0, Math.min(visibleSlides.length - 1, Number(initialSlideNumber || 1) - 1));
  const targetSlideIndex = visibleSlides[targetIndex].index;
  let output = '';
  let cursor = 0;

  for (const slide of slides) {
    output += html.slice(cursor, slide.index);
    const isTarget = slide.index === targetSlideIndex;
    output += setSlideBlockActiveClass(slide.block, isTarget);
    cursor = slide.index + slide.block.length;
  }

  output += html.slice(cursor);
  return output;
}

function setSlideBlockActiveClass(block, isActive) {
  return block.replace(/<(section|div)\b([^>]*)>/i, (opener, tag, attrs) => {
    const classMatch = attrs.match(/\bclass=(["'])([^"']*)\1/i);
    if (!classMatch) {
      return isActive ? `<${tag}${attrs} class="active">` : opener;
    }

    const quote = classMatch[1];
    const classNames = classMatch[2].split(/\s+/).filter(Boolean).filter((name) => name !== 'active');
    if (isActive) classNames.push('active');
    return `<${tag}${attrs.replace(/\bclass=(["'])([^"']*)\1/i, `class=${quote}${classNames.join(' ')}${quote}`)}>`;
  });
}

function applyStudioDeckRuntime(html) {
  let updated = html;
  const style = `<style id="demo-deck-studio-selection">
  .slide[data-studio-excluded="true"] { display: none !important; }
</style>`;
  if (!/id=["']demo-deck-studio-selection["']/i.test(updated)) {
    updated = updated.replace(/<\/head>/i, `${style}\n</head>`);
  }

  updated = updated
    .replace(/document\.querySelectorAll\('(.slide)'\)/g, "document.querySelectorAll('.slide:not([data-studio-excluded=\"true\"])')")
    .replace(/document\.querySelectorAll\("(.slide)"\)/g, 'document.querySelectorAll(".slide:not([data-studio-excluded=\\"true\\"])")');

  updated = updated.replace(
    /function show\(index\) \{\s*current = Math\.max\(0, Math\.min\(total - 1, index\)\);\s*slides\.forEach\(\(s, i\) => s\.classList\.toggle\('active', i === current\)\);/i,
    `function show(index) {
    if (!total) return;
    current = Math.max(0, Math.min(total - 1, index));
    document.querySelectorAll('.slide.active').forEach((s) => s.classList.remove('active'));
    slides.forEach((s, i) => s.classList.toggle('active', i === current));`
  );

  const initialSlideScript = `const studioParams = new URLSearchParams(window.location.search);
  const studioInitialSlide = Math.max(1, parseInt(studioParams.get('slide') || '1', 10) || 1);
  show(studioInitialSlide - 1);`;
  updated = updated.replace(/\n\s*show\(0\);\s*<\/script>/i, `\n  ${initialSlideScript}\n</script>`);
  return updated;
}

function describeSlideForStudio(config, slide, options = {}) {
  const outline = outlineSlide(slide);
  const configSlides = Array.isArray(config?.slides) ? config.slides : [];
  const ordinalConfigSlide = options.useOrdinalConfigFallback === false ? null : configSlides[slide.number - 1];
  const configSlide = (outline.id && configSlides.find((item) => item.id === outline.id)) || ordinalConfigSlide || {};
  const dataPattern = attr(slide.attrs, 'data-pattern');
  const patterns = new Set([configSlide.pattern, dataPattern].filter(Boolean));
  for (const className of outline.classes) {
    if (className === 'cover') patterns.add('cover');
    if (className === 'closing') patterns.add('closing');
    if (className === 'section-header') patterns.add('section-header');
  }
  if (/id=["']gemini-chat["']/i.test(slide.block)) patterns.add('agentic-commerce');
  if (/id=["']sidekick-chat["']/i.test(slide.block)) patterns.add('sidekick-chat');
  if (/pricing-tiers|pricing-callout/i.test(slide.block)) patterns.add('pricing');

  return {
    id: configSlide.id || outline.id || '',
    patterns,
    hasAgenticCommerceContent: /id=["']gemini-chat["']/i.test(slide.block),
    hasSidekickContent: /id=["']sidekick-chat["']/i.test(slide.block),
    text: `${configSlide.id || ''} ${configSlide.pattern || ''} ${outline.title || ''} ${outline.eyebrow || ''} ${cleanText(slide.block)}`
  };
}

function moduleMatchesStudioSlide(module, descriptor) {
  if (module.id === 'agentic-commerce') {
    return descriptor.hasAgenticCommerceContent ||
      (descriptor.patterns.has('agentic-commerce') && !descriptor.patterns.has('section-header'));
  }
  if (module.id === 'sidekick-ops') {
    return descriptor.hasSidekickContent || descriptor.patterns.has('sidekick-chat') || /sidekick/i.test(descriptor.text);
  }

  const ids = studioModuleSlideIds(module.id);
  if (ids.includes(descriptor.id)) return true;

  const modulePatterns = new Set(module.patterns || []);
  if (module.id?.startsWith('pattern:')) {
    return intersects(modulePatterns, descriptor.patterns);
  }

  if (module.id === 'cover') return descriptor.patterns.has('cover') || descriptor.id === 'cover';
  if (module.id === 'discovery-recap') {
    return descriptor.patterns.has('discovery-recap') ||
      descriptor.id === 'discovery-recap' ||
      /\b(aligned on so far|where we are|discovery recap)\b/i.test(descriptor.text);
  }
  if (module.id === 'agenda') return descriptor.patterns.has('agenda') || /agenda|what we'll cover/i.test(descriptor.text);
  if (module.id === 'plus-pricing') return descriptor.patterns.has('pricing');
  if (module.id === 'timeline-close') return descriptor.patterns.has('timeline') || descriptor.patterns.has('closing');
  if (module.id === 'source-map') return descriptor.patterns.has('source-map') || descriptor.id === 'source-map';

  return intersects(modulePatterns, descriptor.patterns) && !modulePatterns.has('feature-slide');
}

function studioModuleSlideIds(moduleId) {
  const map = {
    'b2b-workflows': [
      'brand-architecture',
      'customer-accounts',
      'digital-catalogs',
      'quick-order',
      'sales-enable'
    ],
    'ops-integration': [
      'ops-header',
      'blue-cherry-kbo',
      'edi-visibility',
      'inventory-allocation',
      'payments-tax'
    ],
    'agentic-commerce': ['agentic-commerce'],
    'sidekick-ops': ['sidekick'],
    'plus-pricing': ['plus-pricing', 'investment-paths'],
    'timeline-close': ['timeline', 'close'],
    'source-map': ['source-map']
  };
  return map[moduleId] || [];
}

function intersects(left, right) {
  for (const item of left) {
    if (right.has(item)) return true;
  }
  return false;
}

function updateSlidePickerDecision(htmlPath, body) {
  const configPath = resolveConfigPath(htmlPath, null);
  if (!configPath) throw new Error('No deck.config.json found. Run init-config before using the slide picker.');
  const warnings = [];
  const manifestPath = resolveManifestPath(htmlPath, null);
  const manifest = readManifest(manifestPath, warnings, { silentMissing: true });
  const config = configWithManifestDecisions(readConfig(configPath, warnings), manifest);
  if (!config) throw new Error(warnings[0] || 'Could not load deck.config.json.');

  const id = String(body?.id || '').trim();
  if (!id) throw new Error('Missing slide picker module id.');
  if (typeof body?.included !== 'boolean') throw new Error('Missing boolean included value.');

  const now = new Date().toISOString();
  config.studio ||= {};
  config.studio.slide_picker ||= { version: 1 };
  config.studio.slide_picker.version = 1;
  config.studio.slide_picker.updated_at = now;
  config.studio.slide_picker.modules ||= {};
  config.studio.slide_picker.modules[id] = {
    included: body.included,
    updated_at: now
  };

  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  syncManifestIfPresent(htmlPath, configPath, config);
}

function addPatternFromLibrary(htmlPath, body) {
  const configPath = resolveConfigPath(htmlPath, null);
  if (!configPath) throw new Error('No deck.config.json found. Run init-config before adding patterns.');
  const warnings = [];
  const manifestPath = resolveManifestPath(htmlPath, null);
  const manifest = readManifest(manifestPath, warnings, { silentMissing: true });
  const config = configWithManifestDecisions(readConfig(configPath, warnings), manifest);
  if (!config) throw new Error(warnings[0] || 'Could not load deck.config.json.');

  const html = fs.readFileSync(htmlPath, 'utf8');
  const slides = findSlides(html);
  const plan = buildDeckPlan({ htmlPath, configPath, config, slides, html });
  const picker = buildSlidePicker({ config, plan, html });
  const moduleId = String(body?.id || '').trim();
  const module = picker.modules.find((item) => item.id === moduleId);
  if (!module) throw new Error(`Unknown slide picker module: ${moduleId}`);
  if (module.present) throw new Error(`${module.label} is already present in this deck.`);

  const patternId = String(body?.pattern || module.add_pattern || module.patterns[0] || '').trim();
  if (!canRenderPattern(patternId)) {
    throw new Error(`${module.label} needs custom generation. Ask Studio to draft this slide from natural language.`);
  }

  const speaker = defaultSpeakerForPattern(config, patternId);
  const slideId = uniqueSlideId(config, html, patternId);
  const slideHtml = PATTERN_RENDERERS[patternId]({ config, slideId, speaker, module });
  const updatedHtml = insertPatternSlide(html, slideHtml, patternId);
  fs.writeFileSync(htmlPath, updatedHtml);

  const now = new Date().toISOString();
  config.studio ||= {};
  config.studio.slide_picker ||= { version: 1 };
  config.studio.slide_picker.version = 1;
  config.studio.slide_picker.updated_at = now;
  config.studio.slide_picker.modules ||= {};
  config.studio.slide_picker.modules[moduleId] = {
    included: true,
    added_pattern: patternId,
    added_slide_id: slideId,
    renderer_version: patternRendererVersion(patternId),
    updated_at: now
  };

  insertConfigSlide(config, patternId, {
    id: slideId,
    pattern: patternId,
    speaker,
    evidence: [],
    notes: 'Added from Demo Deck Studio pattern library. Review and replace scaffold copy before merchant sharing.'
  });

  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  syncManifestIfPresent(htmlPath, configPath, config);
}

function refreshPatternModule(htmlPath, body) {
  const configPath = resolveConfigPath(htmlPath, null);
  if (!configPath) throw new Error('No deck.config.json found. Run init-config before refreshing patterns.');
  const warnings = [];
  const manifestPath = resolveManifestPath(htmlPath, null);
  const manifest = readManifest(manifestPath, warnings, { silentMissing: true });
  const config = configWithManifestDecisions(readConfig(configPath, warnings), manifest);
  if (!config) throw new Error(warnings[0] || 'Could not load deck.config.json.');

  const html = fs.readFileSync(htmlPath, 'utf8');
  const slides = findSlides(html);
  const plan = buildDeckPlan({ htmlPath, configPath, config, slides, html });
  const picker = buildSlidePicker({ config, plan, html });
  const moduleId = String(body?.id || '').trim();
  const module = picker.modules.find((item) => item.id === moduleId);
  if (!module) throw new Error(`Unknown slide picker module: ${moduleId}`);

  const decision = normalizeSlidePickerDecision(config?.studio?.slide_picker?.modules?.[moduleId]);
  const patternId = String(body?.pattern || decision.added_pattern || module.add_pattern || module.patterns[0] || '').trim();
  if (!canRenderPattern(patternId)) {
    throw new Error(`${module.label} needs custom generation and cannot be refreshed automatically.`);
  }

  const slideId = String(decision.added_slide_id || firstMatchingStudioSlide(module, slides, config)?.id || '').trim();
  if (!slideId) throw new Error(`${module.label} does not have a slide id to refresh.`);

  const existingSlide = findSlides(html).find((slide) => outlineSlide(slide).id === slideId);
  if (!existingSlide) throw new Error(`Could not find slide to refresh: ${slideId}`);

  const configSlide = Array.isArray(config.slides) ? config.slides.find((slide) => slide.id === slideId) : null;
  const speaker = configSlide?.speaker || defaultSpeakerForPattern(config, patternId);
  const slideHtml = PATTERN_RENDERERS[patternId]({ config, slideId, speaker, module });
  const updatedHtml = replaceSlideBlock(html, existingSlide, slideHtml);
  fs.writeFileSync(htmlPath, updatedHtml);

  const now = new Date().toISOString();
  config.studio ||= {};
  config.studio.slide_picker ||= { version: 1 };
  config.studio.slide_picker.version = 1;
  config.studio.slide_picker.updated_at = now;
  config.studio.slide_picker.modules ||= {};
  config.studio.slide_picker.modules[moduleId] = {
    ...decision,
    included: true,
    added_pattern: patternId,
    added_slide_id: slideId,
    renderer_version: patternRendererVersion(patternId),
    updated_at: now
  };

  insertConfigSlide(config, patternId, {
    id: slideId,
    pattern: patternId,
    speaker,
    evidence: configSlide?.evidence || [],
    notes: 'Refreshed from the current Demo Deck Studio renderer. Review merchant-specific copy before external sharing.'
  });

  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  syncManifestIfPresent(htmlPath, configPath, config);
}

function replaceSlideBlock(html, slide, replacement) {
  return `${html.slice(0, slide.index)}${replacement}\n${html.slice(slide.index + slide.block.length)}`;
}

function defaultSpeakerForPattern(config, patternId) {
  const ae = (config?.speakers || []).find((person) => /AE/i.test(person.role))?.name;
  const se = (config?.speakers || []).find((person) => /SE/i.test(person.role))?.name;
  if (['pricing', 'timeline', 'three-anchors', 'closing'].includes(patternId)) return ae || se || '';
  return se || ae || '';
}

function uniqueSlideId(config, html, patternId) {
  const base = patternId.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'studio-slide';
  const existingIds = new Set((config?.slides || []).map((slide) => slide.id).filter(Boolean));
  for (const match of html.matchAll(/\bid=["']([^"']+)["']/gi)) existingIds.add(match[1]);
  if (!existingIds.has(base)) return base;
  for (let index = 2; index < 100; index += 1) {
    const candidate = `${base}-${index}`;
    if (!existingIds.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

function insertConfigSlide(config, patternId, slideConfig) {
  config.slides ||= [];
  const existingIndex = config.slides.findIndex((slide) => slide.id === slideConfig.id);
  if (existingIndex > -1) {
    config.slides[existingIndex] = { ...config.slides[existingIndex], ...slideConfig };
    return;
  }

  const index = findConfigInsertIndex(config.slides, patternId);
  if (index > -1) config.slides.splice(index, 0, slideConfig);
  else config.slides.push(slideConfig);
}

function findConfigInsertIndex(slides, patternId) {
  const beforeAny = (...patterns) => slides.findIndex((slide) => patterns.includes(slide.pattern) || patterns.includes(slide.id));
  const afterAny = (...patterns) => {
    const index = slides.findIndex((slide) => patterns.includes(slide.pattern) || patterns.includes(slide.id));
    return index > -1 ? index + 1 : -1;
  };

  if (patternId === 'case-study') {
    const afterProof = afterAny('customer-proof-grid', 'stats-grid');
    if (afterProof > -1) return afterProof;
  }
  if (['agentic-commerce', 'sidekick-chat', 'chatgpt-claude-management', 'interactive-storefront', 'feature-slide', 'section-header', 'aspiration', 'agenda', 'b2b-evolution', 'customer-proof-grid', 'stats-grid'].includes(patternId)) {
    const beforeCommercial = beforeAny('three-anchors', 'pricing', 'timeline', 'source-map', 'closing', 'close');
    if (beforeCommercial > -1) return beforeCommercial;
  }
  if (patternId === 'challenges-solutions') {
    const beforeClose = beforeAny('three-anchors', 'pricing', 'timeline', 'source-map', 'closing', 'close');
    if (beforeClose > -1) return beforeClose;
  }
  if (patternId === 'three-anchors') {
    const beforeCommercial = beforeAny('pricing', 'timeline', 'source-map', 'closing', 'close');
    if (beforeCommercial > -1) return beforeCommercial;
  }
  if (patternId === 'pricing') {
    const beforeTimeline = beforeAny('timeline', 'source-map', 'closing', 'close');
    if (beforeTimeline > -1) return beforeTimeline;
  }
  if (patternId === 'timeline' || patternId === 'source-map' || patternId === 'fast-follow') {
    const beforeClose = beforeAny('closing', 'close');
    if (beforeClose > -1) return beforeClose;
  }
  return beforeAny('closing', 'close');
}

function insertPatternSlide(html, slideHtml, patternId) {
  const slides = findSlides(html);
  const targetIndex = findHtmlInsertIndex(slides, patternId);
  if (targetIndex > -1) {
    return `${html.slice(0, targetIndex)}${slideHtml}\n${html.slice(targetIndex)}`;
  }
  const scriptIndex = html.search(/\n\s*<script\b/i);
  if (scriptIndex > -1) return `${html.slice(0, scriptIndex)}${slideHtml}\n${html.slice(scriptIndex)}`;
  return `${html}\n${slideHtml}\n`;
}

function findHtmlInsertIndex(slides, patternId) {
  const beforeSlide = (predicate) => slides.find((slide) => predicate(outlineSlide(slide), slide));
  const afterSlide = (predicate) => {
    const index = slides.findIndex((slide) => predicate(outlineSlide(slide), slide));
    if (index < 0) return -1;
    return slides[index + 1]?.index ?? slides[index].index + slides[index].block.length;
  };
  const isClosing = (outline, slide) => outline.classes.includes('closing') || /data-pattern=["']closing["']|id=["']close["']/i.test(slide.block);
  const isPricing = (outline, slide) => /pricing|investment|commercial/i.test(`${outline.title} ${outline.eyebrow} ${slide.block}`);
  const isTimeline = (outline, slide) => /timeline|next steps|go-live|rollout/i.test(`${outline.title} ${outline.eyebrow} ${slide.block}`);
  const isCustomerProof = (outline, slide) => /customer-grid|customer-tile|good company|peer proof|operating model/i.test(`${outline.title} ${outline.eyebrow} ${slide.block}`);
  const isCommercial = (outline, slide) => /commercial|pricing|investment|outcomes|three outcomes/i.test(`${outline.title} ${outline.eyebrow} ${slide.block}`);
  const isSimulation = (outline, slide) => /gemini-chat|sidekick-chat|agentic|AI discovery|AI-assisted|management/i.test(`${outline.title} ${outline.eyebrow} ${slide.block}`);
  const isPlatformBridge = (outline, slide) => /agenda|aspiration|B2B|commerce platform|buyer journey|workflow|operations/i.test(`${outline.title} ${outline.eyebrow} ${slide.block}`);

  if (patternId === 'case-study') {
    const afterProof = afterSlide(isCustomerProof);
    if (afterProof > -1) return afterProof;
  }
  if (['agentic-commerce', 'sidekick-chat', 'chatgpt-claude-management', 'interactive-storefront'].includes(patternId)) {
    const afterSim = afterSlide(isSimulation);
    if (afterSim > -1) return afterSim;
    const afterBridge = afterSlide(isPlatformBridge);
    if (afterBridge > -1) return afterBridge;
  }
  if (['feature-slide', 'section-header', 'aspiration', 'agenda', 'b2b-evolution', 'customer-proof-grid', 'stats-grid'].includes(patternId)) {
    const commercial = beforeSlide(isCommercial);
    if (commercial) return commercial.index;
  }
  if (patternId === 'challenges-solutions') {
    const commercial = beforeSlide(isCommercial);
    if (commercial) return commercial.index;
  }
  if (patternId === 'three-anchors') {
    const pricing = beforeSlide((outline, slide) => isPricing(outline, slide) || isTimeline(outline, slide) || isClosing(outline, slide));
    if (pricing) return pricing.index;
  }
  if (patternId === 'pricing') {
    const timeline = beforeSlide((outline, slide) => isTimeline(outline, slide) || isClosing(outline, slide));
    if (timeline) return timeline.index;
  }
  const closing = beforeSlide(isClosing);
  return closing?.index ?? -1;
}

function renderPatternScaffoldShell({ slideId, patternId, speaker, eyebrow, title, lede, bodyHtml, extraClass = '' }) {
  const classes = ['slide', extraClass].filter(Boolean).join(' ');
  return `

  <section class="${classes}" id="${escapeAttr(slideId)}" data-pattern="${escapeAttr(patternId)}" data-speaker="${escapeAttr(speaker)}">
    <div class="mesh-bg"></div>
    ${slideParticlesHtml()}
    <div class="slide-ambient-glow"></div>
    <div class="slide-inner stagger">
      <div class="slide-eyebrow">${escapeHtml(eyebrow)}</div>
      <h2 class="slide-title">${title}</h2>
      <p class="slide-lede">${escapeHtml(lede)}</p>
      ${studioPatternStyles()}
      <div class="studio-pattern">
        ${bodyHtml}
      </div>
    </div>
  </section>`;
}

function studioPatternStyles() {
  return `<style>
      .studio-pattern { margin-top: 26px; }
      .studio-pattern .studio-card-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
      .studio-pattern .studio-card { border: 1px solid rgba(255,255,255,.12); border-radius: 8px; background: rgba(255,255,255,.045); padding: 20px; min-height: 150px; }
      .studio-pattern .studio-card strong { display: block; color: var(--c-accent, #14a098); font-size: 13px; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 10px; }
      .studio-pattern .studio-card p, .studio-pattern .studio-note { color: rgba(237,245,247,.72); font-size: 15px; line-height: 1.55; }
      .studio-pattern .studio-note { margin-top: 18px; border: 1px dashed rgba(255,255,255,.16); border-radius: 8px; padding: 14px 16px; background: rgba(255,255,255,.035); }
      .studio-pattern .studio-split { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: stretch; }
      .studio-pattern .studio-list { margin: 0; padding-left: 18px; color: rgba(237,245,247,.78); font-size: 16px; line-height: 1.65; }
      .studio-pattern .studio-list li { margin: 0 0 8px; }
      .studio-pattern .studio-window { border: 1px solid rgba(255,255,255,.13); border-radius: 12px; overflow: hidden; background: rgba(5,11,18,.8); box-shadow: 0 20px 60px rgba(0,0,0,.24); }
      .studio-pattern .studio-window-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,.1); color: rgba(237,245,247,.84); font-size: 13px; font-weight: 700; }
      .studio-pattern .studio-window-body { padding: 16px; display: grid; gap: 12px; }
      .studio-pattern .studio-message { border-radius: 10px; padding: 12px 14px; background: rgba(255,255,255,.07); color: rgba(237,245,247,.82); font-size: 14px; line-height: 1.45; }
      .studio-pattern .studio-message.ai { background: rgba(20,160,152,.14); border: 1px solid rgba(20,160,152,.28); }
      .studio-pattern .studio-admin-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 16px; }
      .studio-pattern .studio-admin-item { border: 1px solid rgba(20,160,152,.22); border-radius: 8px; padding: 12px; background: rgba(20,160,152,.08); }
      .studio-pattern .studio-admin-item span { display: block; color: rgba(237,245,247,.58); font-size: 11px; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 5px; }
      .studio-pattern .studio-admin-item strong { color: rgba(237,245,247,.9); font-size: 14px; }
      .studio-pattern .studio-flow { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
      .studio-pattern .studio-flow-step { position: relative; border: 1px solid rgba(255,255,255,.12); border-radius: 8px; padding: 18px; background: rgba(255,255,255,.04); min-height: 140px; }
      .studio-pattern .studio-flow-step b { display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: rgba(20,160,152,.18); color: var(--c-accent, #14a098); margin-bottom: 12px; }
      @media (max-width: 900px) {
        .studio-pattern .studio-card-grid, .studio-pattern .studio-split, .studio-pattern .studio-admin-strip, .studio-pattern .studio-flow { grid-template-columns: 1fr; }
      }
    </style>`;
}

function slideParticlesHtml() {
  return `<div class="slide-particles">
      <span></span><span></span><span></span><span></span><span></span>
      <span></span><span></span><span></span><span></span><span></span>
    </div>`;
}

function merchantName(config) {
  return config?.merchant?.name || 'this merchant';
}

function merchantDomain(config) {
  try {
    return new URL(config?.merchant?.website || '').hostname.replace(/^www\./, '') || 'shopify-store.myshopify.com';
  } catch {
    return config?.merchant?.slug ? `${config.merchant.slug}.myshopify.com` : 'shopify-store.myshopify.com';
  }
}

function renderCoverPatternSlide({ config, slideId, speaker }) {
  const merchant = merchantName(config);
  return renderPatternScaffoldShell({
    slideId,
    patternId: 'cover',
    speaker,
    extraClass: 'cover',
    eyebrow: 'Shopify demo',
    title: `Shopify x <span class="accent">${escapeHtml(merchant)}</span>`,
    lede: 'A working cover scaffold. Add audience, date, presenters, and the primary story for this meeting.',
    bodyHtml: `<div class="studio-card-grid">
        <div class="studio-card"><strong>Audience</strong><p>Decision makers, operators, technical stakeholders, or executive readout.</p></div>
        <div class="studio-card"><strong>Purpose</strong><p>The meeting outcome this deck needs to create.</p></div>
        <div class="studio-card"><strong>Presenters</strong><p>Replace with AE / SE ownership and any partner presenters.</p></div>
      </div>`
  });
}

function renderDiscoveryRecapPatternSlide({ config, slideId, speaker }) {
  const merchant = merchantName(config);
  return renderPatternScaffoldShell({
    slideId,
    patternId: 'discovery-recap',
    speaker,
    eyebrow: 'Where we are',
    title: `Everything we have <span class="accent">aligned on</span> with ${escapeHtml(merchant)}.`,
    lede: 'Replace with confirmed discovery notes before merchant sharing.',
    bodyHtml: `<div class="studio-split">
        <div class="studio-card">
          <strong>Confirmed</strong>
          <ul class="studio-list">
            <li>Confirmed business priority from discovery.</li>
            <li>Workflow, channel, or brand in scope.</li>
            <li>Decision criteria the team has named.</li>
          </ul>
        </div>
        <div class="studio-card">
          <strong>Still in motion</strong>
          <ul class="studio-list">
            <li>Open integration, pricing, or rollout question.</li>
            <li>Owner and source for the follow-up.</li>
            <li>Next artifact or meeting to confirm.</li>
          </ul>
        </div>
      </div>`
  });
}

function renderStatsGridPatternSlide({ config, slideId, speaker }) {
  return renderPatternScaffoldShell({
    slideId,
    patternId: 'stats-grid',
    speaker,
    eyebrow: 'About Shopify',
    title: 'Commerce infrastructure, <span class="accent">at scale.</span>',
    lede: 'Use only approved, current proof points. Replace placeholder values before sharing.',
    bodyHtml: `<div class="studio-card-grid">
        <div class="stat-card"><div class="stat-value">Metric</div><div class="stat-label">Scale proof point</div></div>
        <div class="stat-card"><div class="stat-value">Metric</div><div class="stat-label">Enterprise capability</div></div>
        <div class="stat-card"><div class="stat-value">Metric</div><div class="stat-label">Reliability or ecosystem proof</div></div>
      </div>
      <p class="studio-note">Map these claims to approved source material before export.</p>`
  });
}

function renderB2bEvolutionPatternSlide({ config, slideId, speaker }) {
  const merchant = merchantName(config);
  return renderPatternScaffoldShell({
    slideId,
    patternId: 'b2b-evolution',
    speaker,
    eyebrow: 'B2B evolution',
    title: `A path from portal replacement to <span class="accent">modern B2B commerce</span>.`,
    lede: `Use this to frame how ${merchant} can move from current workflows to a repeatable B2B operating model.`,
    bodyHtml: `<div class="studio-flow">
        <div class="studio-flow-step"><b>1</b><strong>Digitize</strong><p>Move known buyer workflows into a controlled storefront.</p></div>
        <div class="studio-flow-step"><b>2</b><strong>Personalize</strong><p>Apply company-specific catalogs, pricing, and terms.</p></div>
        <div class="studio-flow-step"><b>3</b><strong>Integrate</strong><p>Respect ERP, inventory, fulfillment, and finance boundaries.</p></div>
        <div class="studio-flow-step"><b>4</b><strong>Scale</strong><p>Repeat the model across brands, regions, or buyer segments.</p></div>
      </div>`
  });
}

function renderCustomerProofGridPatternSlide({ config, slideId, speaker }) {
  return renderPatternScaffoldShell({
    slideId,
    patternId: 'customer-proof-grid',
    speaker,
    eyebrow: 'Customer proof',
    title: 'Proof points that make the path <span class="accent">feel proven.</span>',
    lede: 'Replace with peer brands, case studies, or public proof relevant to this merchant.',
    bodyHtml: `<div class="studio-card-grid">
        <div class="studio-card"><strong>Peer one</strong><p>Why this merchant maps to the current opportunity.</p></div>
        <div class="studio-card"><strong>Peer two</strong><p>Comparable business model, integration, or buyer journey.</p></div>
        <div class="studio-card"><strong>Peer three</strong><p>Outcome, metric, or launch pattern worth borrowing.</p></div>
      </div>`
  });
}

function renderAspirationPatternSlide({ config, slideId, speaker }) {
  const merchant = merchantName(config);
  return renderPatternScaffoldShell({
    slideId,
    patternId: 'aspiration',
    speaker,
    extraClass: 'aspiration',
    eyebrow: 'Aspiration',
    title: `The goal is not just a new site. It is a <span class="accent">better operating model</span>.`,
    lede: `Replace this with ${merchant}'s own ambition, ideally phrased from discovery notes or executive language.`,
    bodyHtml: `<div class="studio-note">Use this slide as the bridge from discovery into the demo path. It should make the room feel heard before the product story begins.</div>`
  });
}

function renderAgendaPatternSlide({ config, slideId, speaker }) {
  return renderPatternScaffoldShell({
    slideId,
    patternId: 'agenda',
    speaker,
    eyebrow: "Today's agenda",
    title: 'What we will <span class="accent">cover.</span>',
    lede: 'Keep the agenda short and aligned to the demo sections.',
    bodyHtml: `<div class="studio-card-grid">
        <div class="studio-card"><strong>01</strong><p>Discovery recap and success criteria.</p></div>
        <div class="studio-card"><strong>02</strong><p>Buyer, operator, and AI-enabled workflows.</p></div>
        <div class="studio-card"><strong>03</strong><p>Commercial path, rollout, and next steps.</p></div>
      </div>`
  });
}

function renderSectionHeaderPatternSlide({ config, slideId, speaker }) {
  return renderPatternScaffoldShell({
    slideId,
    patternId: 'section-header',
    speaker,
    extraClass: 'section-header',
    eyebrow: 'Section',
    title: 'Name the next <span class="accent">chapter</span> of the story.',
    lede: 'Use section headers to reset attention before a new product or workflow arc.',
    bodyHtml: `<div class="studio-note">Replace this scaffold with a concise section title and the one-sentence reason this section matters.</div>`
  });
}

function renderFeaturePatternSlide({ config, slideId, speaker }) {
  return renderPatternScaffoldShell({
    slideId,
    patternId: 'feature-slide',
    speaker,
    eyebrow: 'Capability',
    title: 'A merchant-specific workflow, <span class="accent">not a generic feature.</span>',
    lede: 'Tie this slide to one named pain point, requirement, or buying criterion.',
    bodyHtml: `<div class="studio-split">
        <div class="studio-card">
          <strong>Merchant need</strong>
          <ul class="studio-list">
            <li>What they asked for.</li>
            <li>Why it matters operationally.</li>
            <li>How success should be measured.</li>
          </ul>
        </div>
        <div class="studio-card">
          <strong>Shopify path</strong>
          <ul class="studio-list">
            <li>Product, API, app, or workflow.</li>
            <li>Implementation boundary.</li>
            <li>Open caveat to validate.</li>
          </ul>
        </div>
      </div>`
  });
}

function renderAgenticCommercePatternSlide({ config, slideId, speaker }) {
  const merchant = merchantName(config);
  return renderPatternScaffoldShell({
    slideId,
    patternId: 'agentic-commerce',
    speaker,
    eyebrow: 'AI discovery',
    title: 'Let shoppers find the right product <span class="accent">before the storefront</span>.',
    lede: `A scaffold for showing how ${merchant} can participate in agentic discovery and checkout paths.`,
    bodyHtml: `<div class="studio-split">
        <div class="studio-window">
          <div class="studio-window-head"><span>AI assistant</span><span>Buyer journey</span></div>
          <div class="studio-window-body">
            <div class="studio-message">I need the right product for a specific buyer, use case, budget, or deadline.</div>
            <div class="studio-message ai">Here are the best-fit products, availability, policy context, and a path to purchase.</div>
            <div class="studio-message">Add the recommended option and show checkout details.</div>
          </div>
        </div>
        <div class="studio-card">
          <strong>Why it matters</strong>
          <ul class="studio-list">
            <li>Discovery starts outside the storefront more often.</li>
            <li>Product data, policy, and checkout readiness become strategic.</li>
            <li>The deck can connect AI discovery to measurable commerce.</li>
          </ul>
        </div>
      </div>`
  });
}

function renderSidekickPatternSlide({ config, slideId, speaker }) {
  return renderPatternScaffoldShell({
    slideId,
    patternId: 'sidekick-chat',
    speaker,
    eyebrow: 'AI-assisted operations',
    title: 'A faster way to answer the next <span class="accent">operator question</span>.',
    lede: 'Use this scaffold to show merchant-side AI on top of Shopify data and workflows.',
    bodyHtml: `<div class="studio-split">
        <div class="studio-window">
          <div class="studio-window-head"><span>Sidekick</span><span>Operator workflow</span></div>
          <div class="studio-window-body">
            <div class="studio-message">Which customers, orders, products, or campaigns need attention this week?</div>
            <div class="studio-message ai">I found the priority list and drafted next actions for review.</div>
            <div class="studio-message ai">Approve the segment, draft, or admin action before anything goes live.</div>
          </div>
        </div>
        <div class="studio-card">
          <strong>Replace with</strong>
          <ul class="studio-list">
            <li>The merchant's real operator question.</li>
            <li>The Shopify data needed to answer it.</li>
            <li>The approved action Sidekick should accelerate.</li>
          </ul>
        </div>
      </div>`
  });
}

function renderChatGptClaudeManagementPatternSlide({ config, slideId, speaker }) {
  const merchant = merchantName(config);
  const domain = merchantDomain(config);
  return renderPatternScaffoldShell({
    slideId,
    patternId: 'chatgpt-claude-management',
    speaker,
    eyebrow: 'AI store management',
    title: 'Manage the same Shopify store from <span class="accent">multiple AI workspaces</span>.',
    lede: `${merchant} can let different AI tools assist different jobs while Shopify remains the system of record and approval layer.`,
    bodyHtml: `<style>
        [data-pattern="chatgpt-claude-management"] { padding-top: 54px; padding-bottom: 78px; }
        [data-pattern="chatgpt-claude-management"] .slide-inner { max-width: 1120px; }
        [data-pattern="chatgpt-claude-management"] .slide-eyebrow { margin-bottom: 12px; }
        [data-pattern="chatgpt-claude-management"] .slide-title { font-size: clamp(38px, 4vw, 48px); line-height: 1.06; margin-bottom: 14px; max-width: 1040px; }
        [data-pattern="chatgpt-claude-management"] .slide-lede { font-size: 18px; line-height: 1.4; margin-bottom: 18px; max-width: 880px; }
        [data-pattern="chatgpt-claude-management"] .studio-pattern { margin-top: 0; }
        .ccv2-sim { border: 1px solid rgba(255,255,255,.13); border-radius: 14px; overflow: hidden; background: linear-gradient(135deg, rgba(10,16,25,.95), rgba(15,28,42,.9)); box-shadow: 0 22px 64px rgba(0,0,0,.32); }
        .ccv2-store-bar { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,.11); background: rgba(255,255,255,.04); }
        .ccv2-store { display: flex; align-items: center; gap: 10px; color: rgba(237,245,247,.92); font-weight: 750; }
        .ccv2-bag { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; color: #061014; background: var(--c-accent, #14a098); font-weight: 900; }
        .ccv2-domain { color: rgba(237,245,247,.52); font-size: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
        .ccv2-live { display: inline-flex; align-items: center; gap: 8px; border: 1px solid rgba(20,160,152,.35); border-radius: 999px; padding: 5px 9px; color: rgba(237,245,247,.75); font-size: 12px; background: rgba(20,160,152,.1); white-space: nowrap; }
        .ccv2-live::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: #43c982; box-shadow: 0 0 12px #43c982; }
        .ccv2-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
        .ccv2-pane { min-height: 218px; border-right: 1px solid rgba(255,255,255,.1); padding: 13px 14px; }
        .ccv2-pane:last-child { border-right: 0; }
        .ccv2-pane-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .ccv2-app { display: flex; align-items: center; gap: 9px; font-weight: 800; color: rgba(237,245,247,.94); }
        .ccv2-mark { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; font-size: 12px; color: #061014; background: #10a37f; }
        .ccv2-mark.claude { background: #d97757; }
        .ccv2-role { color: rgba(237,245,247,.5); font-size: 11px; text-transform: uppercase; letter-spacing: .1em; }
        .ccv2-chat { display: grid; gap: 8px; }
        .ccv2-msg { opacity: .38; transform: translateY(8px); border: 1px solid rgba(255,255,255,.1); border-radius: 10px; padding: 9px 10px; color: rgba(237,245,247,.82); font-size: 12px; line-height: 1.36; background: rgba(255,255,255,.055); animation: ccv2Reveal .7s ease forwards; }
        .ccv2-msg.ai { border-color: rgba(20,160,152,.28); background: rgba(20,160,152,.12); }
        .ccv2-pane.claude .ccv2-msg.ai { border-color: rgba(217,119,87,.32); background: rgba(217,119,87,.12); }
        .ccv2-msg:nth-child(2) { animation-delay: .45s; }
        .ccv2-msg:nth-child(3) { animation-delay: .9s; }
        .ccv2-admin { display: grid; grid-template-columns: repeat(4, 1fr); gap: 9px; padding: 10px 14px 12px; border-top: 1px solid rgba(255,255,255,.1); background: rgba(3,8,13,.38); }
        .ccv2-admin-item { position: relative; overflow: hidden; border: 1px solid rgba(20,160,152,.24); border-radius: 9px; padding: 8px 10px; background: rgba(20,160,152,.08); }
        .ccv2-admin-item::after { content: ''; position: absolute; inset: 0; transform: translateX(-120%); background: linear-gradient(90deg, transparent, rgba(255,255,255,.13), transparent); animation: ccv2Sweep 4s ease infinite; }
        .ccv2-admin-item span { display: block; color: rgba(237,245,247,.55); font-size: 9px; letter-spacing: .1em; text-transform: uppercase; margin-bottom: 4px; }
        .ccv2-admin-item strong { color: rgba(237,245,247,.9); font-size: 12px; line-height: 1.2; }
        @keyframes ccv2Reveal { to { opacity: 1; transform: translateY(0); } }
        @keyframes ccv2Sweep { 45%, 100% { transform: translateX(120%); } }
      </style>
      <div class="ccv2-sim">
        <div class="ccv2-store-bar">
          <div class="ccv2-store"><div class="ccv2-bag">S</div><div><div>${escapeHtml(merchant)}</div><div class="ccv2-domain">${escapeHtml(domain)}</div></div></div>
          <div class="ccv2-live">Shopify admin sync active</div>
        </div>
        <div class="ccv2-grid">
          <div class="ccv2-pane">
            <div class="ccv2-pane-head"><div class="ccv2-app"><span class="ccv2-mark">G</span>ChatGPT</div><div class="ccv2-role">Daily ops</div></div>
            <div class="ccv2-chat">
              <div class="ccv2-msg">Summarize today's buyer activity, inventory risks, and accounts that need follow-up.</div>
              <div class="ccv2-msg ai">Three accounts need attention. I found two low-stock products and one high-value quote that has not converted.</div>
              <div class="ccv2-msg ai">I drafted admin updates and rep follow-ups for review before anything changes in Shopify.</div>
            </div>
          </div>
          <div class="ccv2-pane claude">
            <div class="ccv2-pane-head"><div class="ccv2-app"><span class="ccv2-mark claude">C</span>Claude</div><div class="ccv2-role">Strategic work</div></div>
            <div class="ccv2-chat">
              <div class="ccv2-msg">Turn the launch plan into a campaign brief, executive recap, and technical dependency map.</div>
              <div class="ccv2-msg ai">I grouped the launch work into buyer experience, operations, data readiness, and partner tasks.</div>
              <div class="ccv2-msg ai">I linked each recommendation back to the Shopify objects and decisions the team needs to approve.</div>
            </div>
          </div>
        </div>
        <div class="ccv2-admin">
          <div class="ccv2-admin-item"><span>Control</span><strong>Human approval</strong></div>
          <div class="ccv2-admin-item"><span>Drafts</span><strong>Admin-ready</strong></div>
          <div class="ccv2-admin-item"><span>Context</span><strong>Same store data</strong></div>
          <div class="ccv2-admin-item"><span>System</span><strong>Shopify remains source</strong></div>
        </div>
      </div>`
  });
}

function renderInteractiveStorefrontPatternSlide({ config, slideId, speaker }) {
  const merchant = merchantName(config);
  return renderPatternScaffoldShell({
    slideId,
    patternId: 'interactive-storefront',
    speaker,
    eyebrow: 'Interactive storefront',
    title: `A working buyer experience for <span class="accent">${escapeHtml(merchant)}</span>.`,
    lede: 'One live-feeling module can replace several static buyer journey slides while keeping the story merchant-specific.',
    bodyHtml: `<style>
        .sfv2-window { border: 1px solid rgba(255,255,255,.13); border-radius: 14px; overflow: hidden; background: #f6f7f2; color: #17211d; box-shadow: 0 28px 80px rgba(0,0,0,.28); }
        .sfv2-top { display: flex; justify-content: space-between; align-items: center; gap: 14px; padding: 13px 16px; background: #17211d; color: #f7f7f0; }
        .sfv2-brand { display: flex; align-items: center; gap: 10px; font-weight: 850; }
        .sfv2-logo { width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; background: var(--c-accent, #14a098); color: #04100f; }
        .sfv2-pill { border: 1px solid rgba(255,255,255,.18); border-radius: 999px; padding: 6px 10px; color: rgba(247,247,240,.78); font-size: 12px; }
        .sfv2-body { display: grid; grid-template-columns: 160px minmax(0, 1fr) 230px; min-height: 320px; }
        .sfv2-tabs { border-right: 1px solid #d8dbd1; background: #eef0e8; padding: 14px; display: grid; gap: 9px; align-content: start; }
        .sfv2-tab { border: 1px solid #d6dacf; border-radius: 9px; padding: 10px; background: #fff; font-size: 12px; font-weight: 750; color: #46524a; }
        .sfv2-tab.active { border-color: var(--c-accent, #14a098); box-shadow: 0 0 0 2px rgba(20,160,152,.12); color: #10261f; }
        .sfv2-main { padding: 16px; display: grid; grid-template-columns: .85fr 1.15fr; gap: 16px; align-items: stretch; }
        .sfv2-product { border-radius: 14px; background: linear-gradient(135deg, #dfe7dd, #f7f2df); display: grid; place-items: center; min-height: 250px; position: relative; overflow: hidden; }
        .sfv2-product::before { content: ''; width: 150px; height: 190px; border-radius: 28px 28px 18px 18px; background: linear-gradient(150deg, var(--c-accent, #14a098), #244c6c); box-shadow: 0 28px 60px rgba(0,0,0,.18); }
        .sfv2-badge { position: absolute; top: 14px; left: 14px; border-radius: 999px; padding: 6px 9px; background: #17211d; color: #fff; font-size: 11px; font-weight: 800; }
        .sfv2-info { display: grid; gap: 12px; align-content: start; }
        .sfv2-info h3 { margin: 0; font-size: 26px; line-height: 1.05; color: #17211d; }
        .sfv2-info p { color: #5d675f; font-size: 13px; line-height: 1.45; }
        .sfv2-matrix { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .sfv2-cell { border: 1px solid #d7dbd0; border-radius: 8px; background: #fff; padding: 9px; text-align: center; }
        .sfv2-cell span { display: block; color: #6b746d; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; }
        .sfv2-cell strong { display: block; color: #17211d; font-size: 17px; margin-top: 4px; }
        .sfv2-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .sfv2-action { border: 0; border-radius: 8px; padding: 10px 12px; background: #17211d; color: #fff; font-size: 12px; font-weight: 800; }
        .sfv2-action.secondary { background: #e4e7dd; color: #263128; }
        .sfv2-cart { border-left: 1px solid #d8dbd1; background: #fff; padding: 16px; display: grid; align-content: start; gap: 12px; }
        .sfv2-cart h4 { margin: 0; font-size: 13px; color: #17211d; letter-spacing: .08em; text-transform: uppercase; }
        .sfv2-cart-row { display: flex; justify-content: space-between; gap: 10px; border-bottom: 1px solid #eceee8; padding-bottom: 9px; color: #556158; font-size: 12px; }
        .sfv2-cart-row strong { color: #17211d; }
        .sfv2-resource { border: 1px solid #e1e4dc; border-radius: 8px; padding: 9px; color: #49544d; background: #f7f8f3; font-size: 12px; }
        @media (max-width: 980px) { .sfv2-body, .sfv2-main { grid-template-columns: 1fr; } .sfv2-cart, .sfv2-tabs { border: 0; } }
      </style>
      <div class="sfv2-window">
        <div class="sfv2-top">
          <div class="sfv2-brand"><div class="sfv2-logo">${escapeHtml(merchant[0] || 'S')}</div>${escapeHtml(merchant)}</div>
          <div class="sfv2-pill">Signed in as approved buyer</div>
        </div>
        <div class="sfv2-body">
          <div class="sfv2-tabs">
            <div class="sfv2-tab active">Product detail</div>
            <div class="sfv2-tab">Quick order</div>
            <div class="sfv2-tab">Resources</div>
            <div class="sfv2-tab">Cart</div>
          </div>
          <div class="sfv2-main">
            <div class="sfv2-product"><div class="sfv2-badge">Buyer-specific catalog</div></div>
            <div class="sfv2-info">
              <h3>Hero product or buyer-specific assortment</h3>
              <p>Show the merchant's real product structure: variants, availability, prepacks, minimums, terms, resources, or regional rules.</p>
              <div class="sfv2-matrix">
                <div class="sfv2-cell"><span>ATS</span><strong>184</strong></div>
                <div class="sfv2-cell"><span>Prebook</span><strong>320</strong></div>
                <div class="sfv2-cell"><span>Terms</span><strong>Net 30</strong></div>
                <div class="sfv2-cell"><span>Price</span><strong>$42</strong></div>
              </div>
              <div class="sfv2-actions"><button class="sfv2-action">Add case pack</button><button class="sfv2-action secondary">Download spec sheet</button></div>
            </div>
          </div>
          <div class="sfv2-cart">
            <h4>Order workspace</h4>
            <div class="sfv2-cart-row"><span>Case pack</span><strong>12 units</strong></div>
            <div class="sfv2-cart-row"><span>Ship window</span><strong>Fall</strong></div>
            <div class="sfv2-cart-row"><span>Buyer price</span><strong>Contracted</strong></div>
            <div class="sfv2-resource">Resources: size guide, compliance docs, campaign imagery, sell sheet.</div>
            <div class="sfv2-resource">Next action: checkout, quote, draft order, or sales rep assist.</div>
          </div>
        </div>
      </div>`
  });
}

function renderCaseStudyPatternSlide({ config, slideId, speaker }) {
  const merchant = merchantName(config);
  return renderPatternScaffoldShell({
    slideId,
    patternId: 'case-study',
    speaker,
    eyebrow: 'Peer proof',
    title: `A peer story to pressure test the <span class="accent">${escapeHtml(merchant)}</span> path.`,
    lede: 'Replace this scaffold with a named peer merchant, hard metrics, and the parallels that matter to this opportunity.',
    bodyHtml: `<div class="stats-grid">
        <div class="stat-card"><div class="stat-value">Metric</div><div class="stat-label">Outcome to validate</div></div>
        <div class="stat-card"><div class="stat-value">Metric</div><div class="stat-label">Operational improvement</div></div>
        <div class="stat-card"><div class="stat-value">Metric</div><div class="stat-label">Commercial result</div></div>
      </div>
      <div class="recap-grid" style="margin-top: 22px;">
        <div class="recap-col">
          <div class="recap-col-label">WHY THIS PEER MAPS</div>
          <ul class="recap-list">
            <li>Shared business model or buyer workflow.</li>
            <li>Comparable integration or rollout complexity.</li>
            <li>Outcome the merchant already cares about.</li>
          </ul>
        </div>
        <div class="recap-col">
          <div class="recap-col-label">WHAT TO BORROW</div>
          <ul class="recap-list">
            <li>The implementation pattern worth repeating.</li>
            <li>The proof point that should shape the decision.</li>
            <li>The caveat or difference to keep honest.</li>
          </ul>
        </div>
      </div>`
  });
}

function renderChallengesSolutionsPatternSlide({ config, slideId, speaker }) {
  const merchant = merchantName(config);
  return renderPatternScaffoldShell({
    slideId,
    patternId: 'challenges-solutions',
    speaker,
    eyebrow: 'Story check',
    title: `${escapeHtml(merchant)} goals, <span class="accent">mapped to Shopify.</span>`,
    lede: 'Use this slide to consolidate the demo: what they said, how Shopify addresses it, and why it matters.',
    bodyHtml: `<div class="recap-grid">
        <div class="recap-col">
          <div class="recap-col-label">MERCHANT GOALS</div>
          <ul class="recap-list">
            <li>Goal or pain from discovery.</li>
            <li>Workflow the current approach makes harder.</li>
            <li>Decision criteria the team needs to validate.</li>
            <li>Risk or constraint to respect.</li>
          </ul>
        </div>
        <div class="recap-col">
          <div class="recap-col-label">SHOPIFY RESPONSE</div>
          <ul class="recap-list">
            <li>Specific Shopify product, workflow, or API.</li>
            <li>How the demo proved the requested capability.</li>
            <li>Expected operating benefit in their language.</li>
            <li>Open caveat, owner, or follow-up.</li>
          </ul>
        </div>
      </div>`
  });
}

function renderThreeAnchorsPatternSlide({ config, slideId, speaker }) {
  const merchant = merchantName(config);
  return renderPatternScaffoldShell({
    slideId,
    patternId: 'three-anchors',
    speaker,
    eyebrow: `What this delivers for ${merchant}`,
    title: 'Three outcomes <span class="accent">that matter.</span>',
    lede: 'Replace the scaffold copy with the three outcomes the AE and SE want the room to remember.',
    bodyHtml: `<div class="anchors-grid">
        <div class="anchor-card">
          <div class="anchor-num">01</div>
          <div class="anchor-name">Outcome one</div>
          <div class="anchor-desc">The business outcome this deck should make obvious.</div>
        </div>
        <div class="anchor-card">
          <div class="anchor-num">02</div>
          <div class="anchor-name">Outcome two</div>
          <div class="anchor-desc">The operational or technical outcome the demo validated.</div>
        </div>
        <div class="anchor-card">
          <div class="anchor-num">03</div>
          <div class="anchor-name">Outcome three</div>
          <div class="anchor-desc">The decision path or next-step outcome that moves the deal forward.</div>
        </div>
      </div>`
  });
}

function renderPricingPatternSlide({ config, slideId, speaker }) {
  return renderPatternScaffoldShell({
    slideId,
    patternId: 'pricing',
    speaker,
    eyebrow: 'Shopify Plus pricing',
    title: 'Transparent platform pricing that <span class="accent">scales with volume.</span>',
    lede: 'Review all commercial details before sharing. Map this slide to Salesforce or approved pricing notes in the manifest.',
    bodyHtml: `<div class="pricing-tiers">
        <div class="pricing-tier featured">
          <div class="pricing-tier-name">PLATFORM · 3-YEAR</div>
          <div class="pricing-tier-value">$2,300<span class="unit"> / mo</span></div>
          <div class="pricing-tier-sub">Or the applicable variable platform fee, whichever is higher.</div>
          <ul class="pricing-tier-list">
            <li>Shopify Plus platform access.</li>
            <li>Contract term and billing details to confirm.</li>
          </ul>
        </div>
        <div class="pricing-tier">
          <div class="pricing-tier-name">VARIABLE PLATFORM FEE</div>
          <div class="pricing-tier-value">0.18%<span class="unit"> B2B</span></div>
          <div class="pricing-tier-sub">0.35% DTC · 0.25% retail, where applicable.</div>
          <ul class="pricing-tier-list">
            <li>Applied to Shopify-attributable volume.</li>
            <li>Confirm brokered vs visible-only GMV.</li>
          </ul>
        </div>
        <div class="pricing-tier">
          <div class="pricing-tier-name">PAYMENTS + SERVICES</div>
          <div class="pricing-tier-value">Scoped<span class="unit"> path</span></div>
          <div class="pricing-tier-sub">Payments, tax, apps, and implementation stay explicit.</div>
          <ul class="pricing-tier-list">
            <li>Gateway and Shopify Payments decisions.</li>
            <li>Partner or internal implementation scope.</li>
          </ul>
        </div>
      </div>
      <div class="pricing-callout"><strong>Review required:</strong> validate numbers, term, source evidence, and merchant-specific assumptions before export.</div>`
  });
}

function renderTimelinePatternSlide({ config, slideId, speaker }) {
  return renderPatternScaffoldShell({
    slideId,
    patternId: 'timeline',
    speaker,
    eyebrow: 'Timeline',
    title: 'A practical path from <span class="accent">decision to launch.</span>',
    lede: 'Replace these placeholders with the actual mutual action plan.',
    bodyHtml: `<div class="timeline">
        <div class="timeline-item"><div class="timeline-year">Now</div><div class="timeline-label">Confirm scope, success criteria, owners, and commercial model.</div></div>
        <div class="timeline-item"><div class="timeline-year">Next</div><div class="timeline-label">Align technical architecture, partner plan, data model, and dependencies.</div></div>
        <div class="timeline-item"><div class="timeline-year">Build</div><div class="timeline-label">Configure the core buyer journey, integrations, content, and operational workflows.</div></div>
        <div class="timeline-item now"><div class="timeline-year">Launch</div><div class="timeline-label">Go live, measure adoption, and decide what scales next.</div></div>
      </div>`
  });
}

function renderSourceMapPatternSlide({ config, slideId, speaker }) {
  const sources = (config?.sources || []).slice(0, 6);
  const sourceItems = sources.length
    ? sources.map((source) => `<li>${escapeHtml(source.label || source.id || source.type || 'Source')}</li>`).join('\n            ')
    : '<li>Add Salesforce, meeting notes, discovery docs, or approved proof sources in deck.config.json.</li>';
  return renderPatternScaffoldShell({
    slideId,
    patternId: 'source-map',
    speaker,
    eyebrow: 'Grounding',
    title: 'This story is grounded in <span class="accent">named sources.</span>',
    lede: 'Keep this internal by default, or polish it into a merchant-safe proof appendix.',
    bodyHtml: `<div class="recap-grid">
        <div class="recap-col">
          <div class="recap-col-label">PRIMARY SOURCES</div>
          <ul class="recap-list">
            ${sourceItems}
          </ul>
        </div>
        <div class="recap-col">
          <div class="recap-col-label">CLAIMS TO REVIEW</div>
          <ul class="recap-list">
            <li>Discovery recap and merchant quotes.</li>
            <li>Pricing and commercial assumptions.</li>
            <li>Integration, timeline, and implementation claims.</li>
            <li>Case-study metrics or public proof points.</li>
          </ul>
        </div>
      </div>`
  });
}

function renderFastFollowPatternSlide({ config, slideId, speaker }) {
  return renderPatternScaffoldShell({
    slideId,
    patternId: 'fast-follow',
    speaker,
    eyebrow: 'Fast follow',
    title: 'What we covered, what came up, <span class="accent">and what happens next.</span>',
    lede: 'After the demo, replace this scaffold with Gemini notes or call notes using the fast-follow command.',
    bodyHtml: `<div class="recap-grid">
        <div class="recap-col">
          <div class="recap-col-label">WHAT WE COVERED</div>
          <ul class="recap-list">
            <li>Demo topic or workflow covered live.</li>
            <li>Capability the team reacted to.</li>
            <li>Decision point clarified during the call.</li>
          </ul>
        </div>
        <div class="recap-col">
          <div class="recap-col-label">QUESTIONS + NEXT STEPS</div>
          <ul class="recap-list">
            <li>Open question that needs a written answer.</li>
            <li>Context, source, or owner for the answer.</li>
            <li>Next meeting, artifact, or decision to confirm.</li>
          </ul>
        </div>
      </div>`
  });
}

function renderClosingPatternSlide({ config, slideId, speaker }) {
  const merchant = merchantName(config);
  return renderPatternScaffoldShell({
    slideId,
    patternId: 'closing',
    speaker,
    extraClass: 'closing',
    eyebrow: 'Next steps',
    title: `Let's define the next <span class="accent">${escapeHtml(merchant)}</span> decision.`,
    lede: 'Use this as the final close, with clear owners and the next meeting or artifact.',
    bodyHtml: `<div class="studio-card-grid">
        <div class="studio-card"><strong>Decision</strong><p>What the merchant needs to decide next.</p></div>
        <div class="studio-card"><strong>Owner</strong><p>Who owns the follow-up, artifact, or validation.</p></div>
        <div class="studio-card"><strong>Date</strong><p>The next meeting, deadline, or launch-backward milestone.</p></div>
      </div>`
  });
}

function readJsonRequest(request) {
  return new Promise((resolve, reject) => {
    let raw = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        request.destroy();
        reject(new Error('Request body too large.'));
      }
    });
    request.on('end', () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error(`Invalid JSON body: ${error.message}`));
      }
    });
    request.on('error', reject);
  });
}

function studioAppHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Demo Deck Studio</title>
<style>
  :root {
    --bg: #0b1118;
    --panel: #111b26;
    --panel-2: #162231;
    --border: #263546;
    --text: #edf5f7;
    --muted: #91a1b2;
    --faint: #657384;
    --accent: #14a098;
    --danger: #fb7185;
    --warn: #fbbf24;
    --ok: #34d399;
  }
  * { box-sizing: border-box; }
  html { height: 100%; overflow: hidden; }
  body {
    margin: 0;
    min-height: 100vh;
    height: 100%;
    overflow: hidden;
    width: 100vw;
    position: fixed;
    inset: 0;
    overscroll-behavior: none;
    background: var(--bg);
    color: var(--text);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  header {
    position: fixed;
    inset: 0 0 auto 0;
    height: 64px;
    padding: 0 20px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    z-index: 10;
    background: var(--bg);
  }
  .brand { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .brand strong { font-size: 15px; letter-spacing: .01em; }
  .brand span { color: var(--muted); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .stats { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
  .stat {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 6px 10px;
    color: var(--muted);
    font-size: 12px;
    background: var(--panel);
  }
  .stat b { color: var(--text); margin-right: 4px; }
  main {
    position: fixed;
    inset: 64px 0 0 0;
    height: auto;
    display: grid;
    grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
    min-height: 0;
    overflow: hidden;
  }
  aside {
    border-right: 1px solid var(--border);
    min-height: 0;
    overflow: auto;
    overscroll-behavior: contain;
    background: #0d141d;
  }
  .pane { padding: 16px; border-bottom: 1px solid var(--border); }
  h2 {
    margin: 0 0 12px;
    font-size: 12px;
    color: var(--muted);
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
  }
  .pane-note {
    margin: -4px 0 12px;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.45;
  }
  .issue-list { display: grid; gap: 8px; }
  .issue {
    border: 1px solid var(--border);
    border-left-width: 3px;
    border-radius: 8px;
    padding: 9px 10px;
    background: var(--panel);
    color: var(--muted);
    font-size: 12px;
    line-height: 1.45;
  }
  .issue.error { border-left-color: var(--danger); }
  .issue.warning { border-left-color: var(--warn); }
  .issue.info { border-left-color: var(--accent); }
  .strategy-summary {
    display: grid;
    gap: 8px;
    margin-bottom: 12px;
  }
  .strategy-line {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px;
    background: var(--panel);
    color: var(--muted);
    font-size: 12px;
    line-height: 1.45;
  }
  .strategy-line strong { color: var(--text); }
  .brand-assets {
    display: grid;
    gap: 8px;
  }
  .brand-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 9px 10px;
    background: var(--panel);
    color: var(--muted);
    font-size: 12px;
  }
  .brand-row strong { color: var(--text); }
  .brand-row .ok { color: var(--ok); }
  .brand-row .warn { color: var(--warn); }
  .gate-list { display: grid; gap: 8px; }
  .gate {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 9px 10px;
    background: var(--panel);
    font-size: 12px;
    line-height: 1.4;
  }
  .gate.pass { border-left: 3px solid var(--ok); }
  .gate.missing { border-left: 3px solid var(--danger); }
  .gate.optional { border-left: 3px solid var(--accent); }
  .gate-top { display: flex; justify-content: space-between; gap: 10px; color: var(--text); font-weight: 700; }
  .gate-status { color: var(--muted); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; }
  .gate-detail { margin-top: 5px; color: var(--muted); }
  .pane-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }
  .pane-heading h2 { margin: 0; }
  .save-status {
    color: var(--faint);
    font-size: 11px;
    min-width: 56px;
    text-align: right;
  }
  .picker-summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-bottom: 12px;
  }
  .picker-stat {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px;
    background: var(--panel);
    color: var(--muted);
    font-size: 11px;
    line-height: 1.35;
  }
  .picker-stat strong {
    display: block;
    color: var(--text);
    font-size: 16px;
    line-height: 1.1;
    margin-bottom: 2px;
  }
  .picker-groups { display: grid; gap: 14px; }
  .picker-group-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    color: var(--muted);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
  }
  .picker-group-title span:last-child {
    color: var(--faint);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-weight: 600;
  }
  .module-list { display: grid; gap: 8px; margin-top: 8px; }
  .module-card {
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 10px;
    background: var(--panel);
  }
  .module-card.required { border-left: 3px solid var(--danger); }
  .module-card.recommended { border-left: 3px solid var(--accent); }
  .module-card.optional { border-left: 3px solid var(--faint); }
  .module-card.excluded { opacity: .72; }
  .module-card.active {
    border-color: rgba(20, 160, 152, .75);
    background: var(--panel-2);
  }
  .module-card[data-target-slide],
  .module-card[data-source-slide] {
    cursor: pointer;
  }
  .module-top {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
    align-items: start;
  }
  .module-title {
    color: var(--text);
    font-size: 13px;
    font-weight: 700;
    line-height: 1.3;
  }
  .module-reason {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.45;
    margin-top: 5px;
  }
  .module-meta {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 8px;
  }
  .module-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 10px;
  }
  .module-action {
    border: 1px solid rgba(20, 160, 152, .55);
    border-radius: 7px;
    background: rgba(20, 160, 152, .12);
    color: var(--accent);
    cursor: pointer;
    font: inherit;
    font-size: 11px;
    font-weight: 700;
    padding: 6px 9px;
  }
  .module-action:hover {
    background: rgba(20, 160, 152, .2);
    border-color: rgba(20, 160, 152, .85);
  }
  .module-action.secondary {
    border-color: var(--border);
    background: #0c141d;
    color: var(--muted);
    cursor: default;
  }
  .module-chip {
    border: 1px solid var(--border);
    border-radius: 999px;
    color: var(--muted);
    font-size: 10px;
    line-height: 1;
    padding: 4px 7px;
    background: #0c141d;
  }
  .module-chip.present { color: var(--ok); border-color: rgba(52, 211, 153, .35); }
  .module-chip.missing { color: var(--danger); border-color: rgba(251, 113, 133, .35); }
  .module-chip.planned { color: var(--warn); border-color: rgba(251, 191, 36, .35); }
  .module-chip.preview { color: var(--accent); border-color: rgba(20, 160, 152, .35); }
  .module-toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 0;
    background: transparent;
    padding: 0;
    color: var(--muted);
    font-size: 11px;
    cursor: pointer;
    user-select: none;
  }
  .module-toggle:focus-visible {
    outline: 2px solid rgba(20, 160, 152, .7);
    outline-offset: 3px;
    border-radius: 999px;
  }
  .toggle-track {
    width: 36px;
    height: 20px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: #0b1118;
    position: relative;
    transition: .15s ease;
  }
  .toggle-track::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--muted);
    transition: .15s ease;
  }
  .module-toggle[aria-checked="true"] .toggle-track {
    background: rgba(20, 160, 152, .18);
    border-color: rgba(20, 160, 152, .65);
  }
  .module-toggle[aria-checked="true"] .toggle-track::after {
    transform: translateX(16px);
    background: var(--accent);
  }
  .empty {
    border: 1px dashed var(--border);
    border-radius: 8px;
    padding: 12px;
    color: var(--faint);
    font-size: 12px;
  }
  .slides { display: grid; gap: 8px; }
  .slide-row {
    width: 100%;
    text-align: left;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px;
    background: var(--panel);
    color: var(--text);
    cursor: pointer;
    font: inherit;
  }
  .slide-row:hover, .slide-row.active { border-color: rgba(20, 160, 152, .7); background: var(--panel-2); }
  .slide-top { display: flex; gap: 8px; align-items: baseline; }
  .slide-num { color: var(--accent); font-size: 12px; font-weight: 700; min-width: 24px; }
  .slide-title { font-size: 13px; line-height: 1.35; }
  .slide-meta { margin-top: 6px; color: var(--faint); font-size: 11px; display: flex; gap: 8px; flex-wrap: wrap; }
  .dense { color: var(--warn); }
  .preview-wrap {
    min-height: 0;
    min-width: 0;
    display: grid;
    grid-template-rows: auto 1fr;
    background: #05080c;
    overflow: hidden;
  }
  .preview-bar {
    min-height: 44px;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
    color: var(--muted);
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .preview-bar a { color: var(--accent); text-decoration: none; }
  .preview-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
  .preview-status { color: var(--warn); font-size: 12px; }
  .preview-stage {
    position: relative;
    min-height: 0;
    background: #000;
    overflow: hidden;
  }
  .preview-stage iframe {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
    background: #000;
  }
</style>
</head>
<body>
<header>
  <div class="brand">
    <strong>Demo Deck Studio</strong>
    <span id="deck-title">Loading deck...</span>
  </div>
  <div class="stats">
    <div class="stat"><b id="slide-count">0</b> <span id="slide-count-label">slides</span></div>
    <div class="stat"><b id="warning-count">0</b> warnings</div>
    <div class="stat"><b id="error-count">0</b> errors</div>
  </div>
</header>
<main>
  <aside>
    <section class="pane">
      <h2>Strategy Plan</h2>
      <div id="strategy"></div>
    </section>
    <section class="pane">
      <h2>Brand Assets</h2>
      <div id="brand-assets"></div>
    </section>
    <section class="pane">
      <div class="pane-heading">
        <h2>Slide Picker</h2>
        <span id="picker-save-status" class="save-status"></span>
      </div>
      <p class="pane-note">Toggles update the selected slide set. Source HTML stays intact unless you explicitly add a slide.</p>
      <div id="slide-picker"></div>
    </section>
    <section class="pane">
      <h2>Studio Checks</h2>
      <div id="issues" class="issue-list"></div>
    </section>
    <section class="pane">
      <h2>Outline</h2>
      <div id="slides" class="slides"></div>
    </section>
  </aside>
  <section class="preview-wrap">
    <div class="preview-bar">
      <span id="deck-path"></span>
      <div class="preview-actions">
        <span id="preview-status" class="preview-status"></span>
        <a id="open-deck-link" href="/deck" target="_blank">Preview deck</a>
      </div>
    </div>
    <div class="preview-stage">
      <iframe id="preview-frame" src="/deck" title="Deck preview" tabindex="-1"></iframe>
    </div>
  </section>
</main>
<script>
const issueEl = document.getElementById('issues');
const slidesEl = document.getElementById('slides');
const strategyEl = document.getElementById('strategy');
const brandEl = document.getElementById('brand-assets');
const pickerEl = document.getElementById('slide-picker');
const pickerSaveEl = document.getElementById('picker-save-status');
const sidePanel = document.querySelector('aside');
const openDeckLink = document.getElementById('open-deck-link');
const previewStatusEl = document.getElementById('preview-status');
const previewFrame = document.getElementById('preview-frame');
let selectedSlideNumber = 1;
let latestSlideCount = 1;
let latestDeckVersion = '';
let currentSlides = [];

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.addEventListener('scroll', () => {
  if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
}, { passive: true });

fetch('/api/deck')
  .then((response) => response.json())
  .then(render)
  .catch((error) => {
    issueEl.innerHTML = '<div class="issue error">' + escapeHtml(error.message) + '</div>';
  });

pickerEl.addEventListener('click', (event) => {
  const toggle = event.target.closest('[data-picker-module]');
  if (toggle) {
    event.preventDefault();
    try {
      toggle.blur({ preventScroll: true });
    } catch {
      toggle.blur();
    }
    saveSlidePickerDecision(toggle.dataset.pickerModule, toggle.getAttribute('aria-checked') !== 'true');
    return;
  }

  const button = event.target.closest('[data-add-module]');
  if (button) {
    addPatternFromLibrary(button.dataset.addModule, button.dataset.addPattern);
    return;
  }

  const card = event.target.closest('[data-module-card]');
  if (!card) return;
  selectModuleCardSlide(card);
});

slidesEl.addEventListener('click', (event) => {
  const row = event.target.closest('[data-slide-number]');
  if (!row) return;
  selectedSlideNumber = Number(row.dataset.slideNumber || 1);
  refreshPreview();
});

function render(data) {
  document.getElementById('deck-title').textContent = data.title;
  latestDeckVersion = data.slide_picker?.updated_at || String(Date.now());
  document.getElementById('deck-path').textContent = data.sourceSlideCount && data.sourceSlideCount !== data.slideCount
    ? 'Deck: ' + data.slideCount + ' of ' + data.sourceSlideCount + ' source slides'
    : 'Deck: ' + data.slideCount + ' slides';
  document.getElementById('slide-count').textContent = data.slideCount;
  document.getElementById('slide-count-label').textContent = data.sourceSlideCount && data.sourceSlideCount !== data.slideCount
    ? 'selected / ' + data.sourceSlideCount + ' source'
    : 'slides';
  document.getElementById('warning-count').textContent = data.lint.warnings.length;
  document.getElementById('error-count').textContent = data.lint.errors.length;
  latestSlideCount = data.slideCount || 1;
  selectedSlideNumber = Math.max(1, Math.min(selectedSlideNumber, data.slideCount || 1));
  currentSlides = Array.isArray(data.slides) ? data.slides : [];

  renderStrategy(data.plan);
  renderBrand(data.brand);
  renderSlidePicker(data.slide_picker);

  const issues = [
    ...data.lint.errors.map((text) => ({ type: 'error', text })),
    ...data.lint.warnings.map((text) => ({ type: 'warning', text })),
    ...data.lint.info.map((text) => ({ type: 'info', text }))
  ];
  issueEl.innerHTML = issues.length
    ? issues.map((issue) => '<div class="issue ' + issue.type + '">' + escapeHtml(issue.text) + '</div>').join('')
    : '<div class="empty">No lint findings.</div>';

  slidesEl.innerHTML = currentSlides.map((slide) => {
    const denseClass = slide.word_count > 220 ? ' dense' : '';
    const speaker = slide.speaker ? '<span>' + escapeHtml(slide.speaker) + '</span>' : '<span>No speaker</span>';
    const eyebrow = slide.eyebrow ? '<span>' + escapeHtml(slide.eyebrow) + '</span>' : '';
    return '<button class="slide-row" type="button" data-slide-number="' + slide.number + '">' +
      '<div class="slide-top"><span class="slide-num">' + String(slide.number).padStart(2, '0') + '</span>' +
      '<span class="slide-title">' + escapeHtml(slide.title || '(untitled)') + '</span></div>' +
      '<div class="slide-meta">' + speaker + eyebrow + '<span class="' + denseClass + '">' + slide.word_count + ' words</span></div>' +
      '</button>';
  }).join('');
  refreshPreview();
}

function renderSlidePicker(picker) {
  if (!picker || !Array.isArray(picker.modules)) {
    pickerEl.innerHTML = '<div class="empty">No slide picker model found.</div>';
    return;
  }

  const groups = [
    { key: 'required', label: 'Required' },
    { key: 'recommended', label: 'Recommended' },
    { key: 'optional', label: 'Optional' }
  ];
  const summary = '<div class="picker-summary">' +
    '<div class="picker-stat"><strong>' + picker.selected_count + '</strong>selected</div>' +
    '<div class="picker-stat"><strong>' + picker.selected_missing_count + '</strong>selected missing</div>' +
    '<div class="picker-stat"><strong>' + picker.excluded_required_count + '</strong>required excluded</div>' +
    '</div>';
  const groupHtml = groups.map((group) => {
    const modules = picker.modules.filter((module) => module.requirement === group.key);
    if (!modules.length) return '';
    return '<div class="picker-group">' +
      '<div class="picker-group-title"><span>' + group.label + '</span><span>' + modules.length + '</span></div>' +
      '<div class="module-list">' + modules.map(renderSlidePickerModule).join('') + '</div>' +
      '</div>';
  }).join('');

  pickerEl.innerHTML = summary + '<div class="picker-groups">' + groupHtml + '</div>';
}

function renderSlidePickerModule(module) {
  const checked = module.included ? 'true' : 'false';
  const statusClass = module.status === 'missing' ? 'missing' : module.status === 'planned' ? 'planned' : module.present ? 'present' : '';
  const statusLabel = module.status === 'excluded' ? 'excluded' : module.present ? 'present' : module.status;
  const targetSlide = Number(module.target_slide_number || 0);
  const sourceSlide = Number(module.source_slide_number || 0);
  const targetAttrs = [
    targetSlide ? 'data-target-slide="' + targetSlide + '"' : '',
    sourceSlide ? 'data-source-slide="' + sourceSlide + '"' : '',
    module.target_slide_title ? 'data-slide-title="' + escapeAttr(module.target_slide_title) + '"' : module.source_slide_title ? 'data-slide-title="' + escapeAttr(module.source_slide_title) + '"' : ''
  ].filter(Boolean).join(' ');
  const previewChip = targetSlide
    ? '<span class="module-chip preview">preview ' + String(targetSlide).padStart(2, '0') + '</span>'
    : sourceSlide ? '<span class="module-chip">excluded ' + String(sourceSlide).padStart(2, '0') + '</span>' : '';
  const actions = module.can_add
    ? '<div class="module-actions"><button class="module-action" type="button" data-add-module="' + escapeHtml(module.id) + '" data-add-pattern="' + escapeHtml(module.add_pattern) + '">Add slide</button></div>'
    : (!module.present && module.included ? '<div class="module-actions"><span class="module-action secondary">Prompt required</span></div>' : '');
  return '<div class="module-card ' + escapeHtml(module.requirement) + (module.included ? '' : ' excluded') + '" data-module-card="' + escapeHtml(module.id) + '" ' + targetAttrs + '>' +
    '<div class="module-top">' +
      '<div>' +
        '<div class="module-title">' + escapeHtml(module.label) + '</div>' +
        '<div class="module-reason">' + escapeHtml(module.reason || module.pattern_label) + '</div>' +
      '</div>' +
      '<button class="module-toggle" type="button" data-picker-module="' + escapeHtml(module.id) + '" aria-checked="' + checked + '" aria-label="' + escapeHtml((module.included ? 'Exclude ' : 'Include ') + module.label) + '">' +
        '<span class="toggle-track" aria-hidden="true"></span>' +
      '</button>' +
    '</div>' +
    '<div class="module-meta">' +
      '<span class="module-chip">' + escapeHtml(module.requirement) + '</span>' +
      '<span class="module-chip ' + statusClass + '">' + escapeHtml(statusLabel) + '</span>' +
      '<span class="module-chip">' + escapeHtml(module.pattern_label) + '</span>' +
      previewChip +
      (module.user_set ? '<span class="module-chip">user set</span>' : '') +
    '</div>' +
    actions +
    '</div>';
}

function saveSlidePickerDecision(id, included) {
  pickerSaveEl.textContent = 'Saving...';
  const anchor = captureSidePanelAnchor(id);
  fetch('/api/slide-picker', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, included })
  })
    .then((response) => response.json().then((body) => {
      if (!response.ok || body.error) throw new Error(body.error || 'Could not save slide picker choice.');
      return body;
    }))
    .then((data) => {
      pickerSaveEl.textContent = 'Saved';
      const module = findPickerModule(data, id);
      if (included && module?.target_slide_number) selectedSlideNumber = Number(module.target_slide_number);
      render(data);
      restoreSidePanelAnchor(anchor);
      markPreviewStale('Selection changed');
      setTimeout(() => {
        if (pickerSaveEl.textContent === 'Saved') pickerSaveEl.textContent = '';
      }, 1400);
    })
    .catch((error) => {
      pickerSaveEl.textContent = 'Save failed';
      issueEl.innerHTML = '<div class="issue error">' + escapeHtml(error.message) + '</div>' + issueEl.innerHTML;
    });
}

function addPatternFromLibrary(id, pattern) {
  pickerSaveEl.textContent = 'Adding...';
  const anchor = captureSidePanelAnchor(id);
  fetch('/api/pattern-library/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, pattern })
  })
    .then((response) => response.json().then((body) => {
      if (!response.ok || body.error) throw new Error(body.error || 'Could not add pattern slide.');
      return body;
    }))
    .then((data) => {
      pickerSaveEl.textContent = 'Added';
      const module = findPickerModule(data, id);
      selectedSlideNumber = Number(module?.target_slide_number || data.slideCount || selectedSlideNumber);
      render(data);
      restoreSidePanelAnchor(anchor);
      markPreviewStale('Slide added');
      setTimeout(() => {
        if (pickerSaveEl.textContent === 'Added') pickerSaveEl.textContent = '';
      }, 1400);
    })
    .catch((error) => {
      pickerSaveEl.textContent = 'Add failed';
      issueEl.innerHTML = '<div class="issue error">' + escapeHtml(error.message) + '</div>' + issueEl.innerHTML;
    });
}

function refreshPreview() {
  selectedSlideNumber = Math.max(1, Math.min(selectedSlideNumber, latestSlideCount || 1));
  const url = selectedDeckUrl();
  if (openDeckLink) openDeckLink.href = url;
  if (previewFrame) previewFrame.src = url;
  if (previewStatusEl) previewStatusEl.textContent = '';
  updateActiveSlideRow();
  updateActiveModuleCard();
}

function markPreviewStale(message) {
  if (previewStatusEl) previewStatusEl.textContent = message || '';
  selectedSlideNumber = Math.max(1, Math.min(selectedSlideNumber, latestSlideCount || 1));
  updateActiveSlideRow();
  updateActiveModuleCard();
}

function updateActiveSlideRow() {
  slidesEl.querySelectorAll('.slide-row').forEach((row) => {
    row.classList.toggle('active', Number(row.dataset.slideNumber) === selectedSlideNumber);
  });
  if (openDeckLink) openDeckLink.href = selectedDeckUrl();
}

function selectedDeckUrl() {
  const params = new URLSearchParams();
  params.set('slide', String(selectedSlideNumber));
  if (latestDeckVersion) params.set('v', latestDeckVersion);
  return '/deck?' + params.toString();
}

function selectModuleCardSlide(card) {
  const targetSlide = Number(card.dataset.targetSlide || 0);
  const sourceSlide = Number(card.dataset.sourceSlide || 0);
  const title = card.dataset.slideTitle || '';
  if (targetSlide) {
    selectedSlideNumber = targetSlide;
    refreshPreview();
    if (previewStatusEl) previewStatusEl.textContent = title ? 'Previewing ' + title : 'Previewing selected slide';
    return;
  }
  if (sourceSlide && previewStatusEl) {
    previewStatusEl.textContent = 'That slide is hidden from the deck. Turn it back on to preview it here.';
  }
  updateActiveModuleCard();
}

function updateActiveModuleCard() {
  pickerEl.querySelectorAll('[data-module-card]').forEach((card) => {
    card.classList.toggle('active', Number(card.dataset.targetSlide || 0) === selectedSlideNumber);
  });
}

function findPickerModule(data, id) {
  return data?.slide_picker?.modules?.find((module) => module.id === id) || null;
}

function captureSidePanelAnchor(moduleId) {
  if (!sidePanel) return null;
  const card = findModuleCard(moduleId);
  return {
    moduleId,
    scrollTop: sidePanel.scrollTop,
    offsetTop: card ? card.getBoundingClientRect().top - sidePanel.getBoundingClientRect().top : null
  };
}

function restoreSidePanelAnchor(anchor) {
  if (!sidePanel || !anchor) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const card = findModuleCard(anchor.moduleId);
      if (card && anchor.offsetTop !== null) {
        const currentOffset = card.getBoundingClientRect().top - sidePanel.getBoundingClientRect().top;
        sidePanel.scrollTop += currentOffset - anchor.offsetTop;
      } else {
        sidePanel.scrollTop = anchor.scrollTop || 0;
      }
      if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
    });
  });
}

function findModuleCard(moduleId) {
  if (!sidePanel || !moduleId) return null;
  return Array.from(sidePanel.querySelectorAll('[data-module-card]')).find((card) => card.dataset.moduleCard === moduleId) || null;
}

function renderStrategy(plan) {
  if (!plan) {
    strategyEl.innerHTML = '<div class="empty">No deck strategy found.</div>';
    return;
  }
  const strategy = plan.strategy;
  const missing = plan.gates.filter((gate) => gate.required && !gate.passed).length;
  const summary = '<div class="strategy-summary">' +
    '<div class="strategy-line"><strong>' + escapeHtml(strategy.deck_type) + '</strong> deck · B2B ' + yesNo(strategy.has_b2b) + ' · DTC ' + yesNo(strategy.has_dtc) + ' · Plus pricing ' + yesNo(strategy.pricing_required) + '</div>' +
    '<div class="strategy-line"><strong>' + missing + '</strong> required gap' + (missing === 1 ? '' : 's') + ' · ' + escapeHtml(plan.present_patterns.length + ' patterns detected') + '</div>' +
    '</div>';
  const gates = plan.gates.map((gate) => {
    const state = gate.passed ? 'pass' : gate.required ? 'missing' : 'optional';
    const status = gate.passed ? 'OK' : gate.required ? 'MISSING' : 'REVIEW';
    const detail = gate.passed ? gate.evidence : gate.fix;
    return '<div class="gate ' + state + '">' +
      '<div class="gate-top"><span>' + escapeHtml(gate.label) + '</span><span class="gate-status">' + status + '</span></div>' +
      '<div class="gate-detail">' + escapeHtml(detail) + '</div>' +
      '</div>';
  }).join('');
  strategyEl.innerHTML = summary + '<div class="gate-list">' + gates + '</div>';
}

function renderBrand(brand) {
  if (!brand) {
    brandEl.innerHTML = '<div class="empty">No brand manifest found.</div>';
    return;
  }
  const statusClass = brand.logo_embedded ? 'ok' : 'warn';
  brandEl.innerHTML = '<div class="brand-assets">' +
    '<div class="brand-row"><strong>Logo</strong><span class="' + statusClass + '">' + escapeHtml(brand.status) + '</span></div>' +
    '<div class="brand-row"><strong>Accent</strong><span>' + escapeHtml(brand.accent || 'not set') + '</span></div>' +
    '<div class="brand-row"><strong>File</strong><span>' + escapeHtml(brand.logo_path || 'none') + '</span></div>' +
    '</div>';
}

function yesNo(value) {
  return value ? 'yes' : 'no';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
</script>
</body>
</html>`;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

main();

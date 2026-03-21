const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const INDEX_PATH = path.resolve(__dirname, '..', '..', 'index.html');

function findFunctionSource(html, functionName) {
  const patterns = [
    `async function ${functionName}(`,
    `function ${functionName}(`
  ];

  let start = -1;
  for (const pattern of patterns) {
    start = html.indexOf(pattern);
    if (start !== -1) break;
  }
  if (start === -1) {
    throw new Error(`Function "${functionName}" not found in index.html`);
  }

  const openBrace = html.indexOf('{', start);
  if (openBrace === -1) {
    throw new Error(`Cannot locate function body for "${functionName}"`);
  }

  let i = openBrace;
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;

  for (; i < html.length; i++) {
    const ch = html[i];
    const next = html[i + 1];

    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }

    if (inSingle) {
      if (!escaped && ch === "'") inSingle = false;
      escaped = !escaped && ch === '\\';
      continue;
    }

    if (inDouble) {
      if (!escaped && ch === '"') inDouble = false;
      escaped = !escaped && ch === '\\';
      continue;
    }

    if (inTemplate) {
      if (!escaped && ch === '`') inTemplate = false;
      escaped = !escaped && ch === '\\';
      continue;
    }

    if (ch === '/' && next === '/') {
      inLineComment = true;
      i++;
      continue;
    }

    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i++;
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      escaped = false;
      continue;
    }

    if (ch === '"') {
      inDouble = true;
      escaped = false;
      continue;
    }

    if (ch === '`') {
      inTemplate = true;
      escaped = false;
      continue;
    }

    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (depth === 0) break;
  }

  if (depth !== 0) {
    throw new Error(`Unbalanced braces while extracting "${functionName}"`);
  }

  return html.slice(start, i + 1);
}

function loadInlineFunctions(functionNames, globals = {}) {
  const html = fs.readFileSync(INDEX_PATH, 'utf8');
  const chunks = functionNames.map((name) => findFunctionSource(html, name));

  const context = vm.createContext({
    ...globals,
    console,
    setTimeout,
    clearTimeout,
    AbortController: globals.AbortController || AbortController
  });

  const source = `${chunks.join('\n\n')}\nthis.__loaded = { ${functionNames.join(', ')} };`;
  vm.runInContext(source, context, { timeout: 1000 });
  return context.__loaded;
}

module.exports = {
  loadInlineFunctions
};

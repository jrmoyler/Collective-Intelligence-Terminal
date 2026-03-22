const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════
//  HTML STRUCTURE & INTEGRITY — Integration Tests
// ═══════════════════════════════════════════════════════════════

const htmlPath = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf-8');

describe('HTML Document Structure', () => {
  test('has valid DOCTYPE', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
  });

  test('has <html> tag with lang attribute', () => {
    expect(html).toMatch(/<html\s+lang="en">/);
  });

  test('has <head> section with charset', () => {
    expect(html).toMatch(/<meta\s+charset="UTF-8">/);
  });

  test('has viewport meta tag', () => {
    expect(html).toMatch(/<meta\s+name="viewport"/);
  });

  test('has <title> tag', () => {
    expect(html).toMatch(/<title>.*Collective Intelligence Terminal.*<\/title>/);
  });

  test('has <style> block', () => {
    expect(html).toMatch(/<style>/);
    expect(html).toMatch(/<\/style>/);
  });

  test('has at least 3 <script> blocks', () => {
    const scriptTags = html.match(/<script[^>]*>/g) || [];
    expect(scriptTags.length).toBeGreaterThanOrEqual(3);
  });

  test('all script tags are closed', () => {
    const openScripts = (html.match(/<script[^>]*>/g) || []).length;
    const closeScripts = (html.match(/<\/script>/g) || []).length;
    expect(openScripts).toBe(closeScripts);
  });

  test('closing </html> tag exists', () => {
    expect(html).toMatch(/<\/html>/);
  });
});

describe('Critical DOM Elements', () => {
  test('has top-bar element', () => {
    expect(html).toMatch(/id="top-bar"/);
  });

  test('has domain tabs container', () => {
    expect(html).toMatch(/id="dtabs"/);
  });

  test('has left panel', () => {
    expect(html).toMatch(/id="lp"/);
  });

  test('has right panel', () => {
    expect(html).toMatch(/id="rp"/);
  });

  test('has center panel', () => {
    expect(html).toMatch(/id="cp"/);
  });

  test('has live ticker', () => {
    expect(html).toMatch(/id="ds"/);
  });

  test('has inject bar', () => {
    expect(html).toMatch(/id="ib"/);
  });

  test('has analysis drawer', () => {
    expect(html).toMatch(/id="ad"/);
  });

  test('has 3D canvas', () => {
    expect(html).toMatch(/id="cv"/);
  });

  test('has event log', () => {
    expect(html).toMatch(/id="el"/);
  });

  test('has flash overlay', () => {
    expect(html).toMatch(/id="sf"/);
  });
});

describe('Domain Tabs Integrity', () => {
  test('has POLYMARKET domain tab', () => {
    expect(html).toMatch(/POLYMARKET/);
  });

  test('has MARKETS domain tab', () => {
    expect(html).toMatch(/MARKETS/);
  });

  test('has SPORTS domain tab', () => {
    expect(html).toMatch(/SPORTS/);
  });

  test('has TECHNOLOGY domain tab', () => {
    expect(html).toMatch(/TECHNOLOGY/);
  });

  test('has ENVIRONMENT domain tab', () => {
    expect(html).toMatch(/ENVIRONMENT/);
  });

  test('has at least 15 domain references', () => {
    const domains = ['POLYMARKET','MARKETS','SPORTS','MEDICINE','SCIENCE',
                     'TECHNOLOGY','SOCIETY','ENVIRONMENT','GEOLOGY','BIOLOGY',
                     'ASTROPHYSICS','OCEANOGRAPHY','PHILOSOPHY','PHYSICS','REAL ESTATE'];
    let found = 0;
    domains.forEach(d => { if (html.includes(d)) found++; });
    expect(found).toBeGreaterThanOrEqual(15);
  });
});

describe('External Dependencies', () => {
  test('loads Three.js', () => {
    expect(html).toMatch(/three/i);
  });

  test('uses Space Mono font', () => {
    expect(html).toMatch(/Space Mono/);
  });

  test('references Anthropic API endpoint', () => {
    expect(html).toMatch(/api\.anthropic\.com/);
  });

  test('references Polymarket API', () => {
    expect(html).toMatch(/gamma-api\.polymarket\.com/);
  });

  test('references allOrigins CORS proxy', () => {
    expect(html).toMatch(/api\.allorigins\.win/);
  });
});

describe('JavaScript Function Presence', () => {
  test('defines runSim function', () => {
    expect(html).toMatch(/function\s+runSim/);
  });

  test('defines runDeliberation function', () => {
    expect(html).toMatch(/function\s+runDeliberation/);
  });

  test('defines fetchPolymarket function', () => {
    expect(html).toMatch(/function\s+fetchPolymarket/);
  });

  test('defines buildTicker function', () => {
    expect(html).toMatch(/function\s+buildTicker/);
  });

  test('defines computeSignalFusion function', () => {
    expect(html).toMatch(/function\s+computeSignalFusion/);
  });

  test('defines BOOT function', () => {
    expect(html).toMatch(/BOOT/);
  });

  test('defines refreshMarketData function', () => {
    expect(html).toMatch(/refreshMarketData/);
  });

  test('defines claudeCall function', () => {
    expect(html).toMatch(/function\s+claudeCall/);
  });

  test('defines parseJSON function', () => {
    expect(html).toMatch(/function\s+parseJSON/);
  });

  test('defines levenshteinSim function', () => {
    expect(html).toMatch(/function\s+levenshteinSim/);
  });
});

describe('Configuration & Security', () => {
  test('no hardcoded API keys in source', () => {
    const keyPatterns = [
      /sk-[a-zA-Z0-9]{20,}/,
      /AKIA[A-Z0-9]{16}/,
    ];
    keyPatterns.forEach(pattern => {
      expect(html).not.toMatch(pattern);
    });
  });

  test('uses localStorage for key storage', () => {
    expect(html).toMatch(/localStorage/);
  });

  test('CIT_KEYS object defined', () => {
    expect(html).toMatch(/CIT_KEYS/);
  });
});

describe('Vercel Configuration', () => {
  const vercelConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf-8'));

  test('has version 2', () => {
    expect(vercelConfig.version).toBe(2);
  });

  test('has static build config', () => {
    expect(vercelConfig.builds).toBeDefined();
    expect(vercelConfig.builds[0].use).toBe('@vercel/static');
  });

  test('has wildcard route to index.html', () => {
    expect(vercelConfig.routes).toBeDefined();
    const route = vercelConfig.routes.find(r => r.dest === '/index.html');
    expect(route).toBeDefined();
  });

  test('has CORS headers', () => {
    const headers = vercelConfig.headers[0].headers;
    const corsHeader = headers.find(h => h.key === 'Access-Control-Allow-Origin');
    expect(corsHeader).toBeDefined();
    expect(corsHeader.value).toBe('*');
  });

  test('has CSP with connect-src *', () => {
    const headers = vercelConfig.headers[0].headers;
    const csp = headers.find(h => h.key === 'Content-Security-Policy');
    expect(csp).toBeDefined();
    expect(csp.value).toContain('connect-src *');
  });

  test('has Cache-Control: no-cache', () => {
    const headers = vercelConfig.headers[0].headers;
    const cache = headers.find(h => h.key === 'Cache-Control');
    expect(cache).toBeDefined();
    expect(cache.value).toContain('must-revalidate');
  });
});

describe('Data Source Connectivity', () => {
  const apiEndpoints = [
    'query1.finance.yahoo.com',
    'gamma-api.polymarket.com',
    'clob.polymarket.com',
    'earthquake.usgs.gov',
    'api.weather.gov',
    'api.nasa.gov',
    'api.gbif.org',
    'site.api.espn.com',
    'api.open-meteo.com',
    'clinicaltrials.gov',
    'api.coingecko.com',
    'export.arxiv.org',
    'marine-api.open-meteo.com',
    'restcountries.com',
    'api.worldbank.org',
    'api.gdeltproject.org',
    'gnews.io',
    'll.thespacedevs.com',
    'www.reddit.com',
    'api.opensanctions.org',
    'fiscaldata.treasury.gov',
    'open.er-api.com',
  ];

  apiEndpoints.forEach(endpoint => {
    test(`references ${endpoint}`, () => {
      expect(html).toContain(endpoint);
    });
  });
});

describe('Duplicate Key Detection in ASSET_CORRELATIONS', () => {
  // Extract only the ASSET_CORRELATIONS block to check for duplicate keys within it
  function extractBlock(src, varName) {
    const start = src.indexOf(`const ${varName} = {`);
    if (start === -1) return '';
    let depth = 0, i = src.indexOf('{', start);
    for (; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
    }
    return '';
  }

  test('world key is defined (checking for duplicate key issue)', () => {
    const block = extractBlock(html, 'ASSET_CORRELATIONS');
    const worldMatches = block.match(/^\s*world:\s*\{/gm);
    if (worldMatches && worldMatches.length > 1) {
      console.warn(`WARNING: 'world' key is defined ${worldMatches.length} times in ASSET_CORRELATIONS — last definition wins`);
    }
    expect(worldMatches && worldMatches.length > 1).toBe(false);
    expect(html).toContain("world:");
  });

  test('political key is defined (checking for duplicate key issue)', () => {
    const block = extractBlock(html, 'ASSET_CORRELATIONS');
    const politicalMatches = block.match(/^\s*political:\s*\{/gm);
    if (politicalMatches && politicalMatches.length > 1) {
      console.warn(`WARNING: 'political' key is defined ${politicalMatches.length} times in ASSET_CORRELATIONS — last definition wins`);
    }
    expect(politicalMatches && politicalMatches.length > 1).toBe(false);
    expect(html).toContain("political:");
  });
});

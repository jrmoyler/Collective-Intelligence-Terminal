const test = require('node:test');
const assert = require('node:assert/strict');

const { loadInlineFunctions } = require('./helpers/inline-function-loader');

test('citAllOrigins wraps and URL-encodes source URL', () => {
  const { citAllOrigins } = loadInlineFunctions(['citAllOrigins']);
  const upstream = 'https://example.com/api?q=btc usd&mode=fast';
  const wrapped = citAllOrigins(upstream);

  assert.equal(
    wrapped,
    `https://api.allorigins.win/get?url=${encodeURIComponent(upstream)}`
  );
});

test('citSafeFetch returns parsed JSON for successful responses', async () => {
  const { citSafeFetch } = loadInlineFunctions(['citSafeFetch'], {
    fetch: async () => ({
      ok: true,
      json: async () => ({ ok: true, source: 'mock' })
    })
  });

  const data = await citSafeFetch('https://example.com/test');
  assert.deepEqual(data, { ok: true, source: 'mock' });
});

test('citSafeFetch returns null on non-2xx and thrown errors', async () => {
  const goodCase = loadInlineFunctions(['citSafeFetch'], {
    fetch: async () => ({ ok: false, json: async () => ({}) })
  });
  assert.equal(await goodCase.citSafeFetch('https://example.com/bad-status'), null);

  const throwCase = loadInlineFunctions(['citSafeFetch'], {
    fetch: async () => {
      throw new Error('network down');
    }
  });
  assert.equal(await throwCase.citSafeFetch('https://example.com/throws'), null);
});

test('citSMA and citRSI return expected market indicators', () => {
  const { citSMA, citRSI } = loadInlineFunctions(['citSMA', 'citRSI']);

  assert.equal(citSMA([1, 2, 3], 5), null);
  assert.equal(citSMA([10, 20, 30, 40, 50], 3), 40);

  assert.equal(citRSI([1, 2, 3], 14), 50);
  assert.equal(citRSI([1, 2, 3, 4, 5, 6], 5), 100);
  assert.equal(citRSI([10, 9, 10, 9, 10, 9], 5), 40);
});

test('levenshteinSim gives stable fuzzy-match scores', () => {
  const { levenshteinSim } = loadInlineFunctions(['levenshteinSim']);

  assert.equal(levenshteinSim('same', 'same'), 1);
  assert.equal(levenshteinSim('a', 'this is much longer'), 0);
  assert.ok(levenshteinSim('federal reserve', 'federal reserve rate') > 0.7);
});

test('citDeriveOBMetrics computes microstructure summary fields', () => {
  const { citDeriveOBMetrics } = loadInlineFunctions(['citDeriveOBMetrics']);

  const orderBook = {
    bids: [
      { price: 0.49, size: 100 },
      { price: 0.48, size: 80 }
    ],
    asks: [
      { price: 0.51, size: 90 },
      { price: 0.52, size: 60 }
    ]
  };
  const trades = [
    { price: 0.50, size: 10, side: 1, timestamp: 1000 },
    { price: 0.51, size: 5, side: -1, timestamp: 2000 },
    { price: 0.50, size: 8, side: 1, timestamp: 3500 }
  ];

  const out = citDeriveOBMetrics(orderBook, trades);
  assert.equal(out.mid, 0.5);
  assert.equal(out.spreadPct, 4);
  assert.equal(out.roundTripPct, 8);
  assert.equal(out.buyVol, 18);
  assert.equal(out.sellVol, 5);
  assert.equal(out.measuredVPIN, null);
  assert.deepEqual(out.interArrivals, [1, 1.5]);
});

test('brierScore computes calibration penalty', () => {
  const { brierScore } = loadInlineFunctions(['brierScore']);
  assert.equal(brierScore(80, 'YES'), 0.04);
  assert.equal(brierScore(20, 'NO'), 0.04);
});

test('fetchResolvedContracts keeps only resolved contracts and applies domain filter', async () => {
  const markets = [
    {
      question: 'Will the S&P 500 reach 7,000 before end of 2026?',
      outcomePrices: JSON.stringify(['0.99', '0.01']),
      volume24hr: 20000,
      endDate: '2026-12-31',
      clobTokenIds: JSON.stringify(['fin-1'])
    },
    {
      question: 'Will the Chiefs win the Super Bowl?',
      outcomePrices: JSON.stringify(['0.01', '0.99']),
      volume24hr: 12000,
      endDate: '2026-02-01',
      clobTokenIds: JSON.stringify(['sports-1'])
    },
    {
      question: 'Will a candidate win the US presidential election?',
      outcomePrices: JSON.stringify(['0.99', '0.01']),
      volume24hr: 16000,
      endDate: '2028-11-01',
      clobTokenIds: JSON.stringify(['pol-1'])
    },
    {
      question: 'Unresolved contract should be excluded',
      outcomePrices: JSON.stringify(['0.60', '0.40']),
      volume24hr: 5000,
      endDate: '2027-01-01',
      clobTokenIds: JSON.stringify(['skip-unresolved'])
    }
  ];

  const functions = loadInlineFunctions(['inferBacktestDomain', 'fetchResolvedContracts'], {
    citAllOrigins: (url) => url,
    citSafeFetch: async () => ({ contents: JSON.stringify(markets) })
  });

  const all = await functions.fetchResolvedContracts(10, 'all');
  assert.equal(all.length, 3);

  const financialOnly = await functions.fetchResolvedContracts(10, 'financial');
  assert.equal(financialOnly.length, 1);
  assert.equal(financialOnly[0].tokenId, 'fin-1');

  const sportsOnly = await functions.fetchResolvedContracts(10, 'sports');
  assert.equal(sportsOnly.length, 1);
  assert.equal(sportsOnly[0].tokenId, 'sports-1');

  const politicsOnly = await functions.fetchResolvedContracts(10, 'politics');
  assert.equal(politicsOnly.length, 1);
  assert.equal(politicsOnly[0].tokenId, 'pol-1');
});

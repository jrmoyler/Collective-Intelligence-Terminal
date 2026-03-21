const {
  parlayCorrelationFactor,
  computeParlayOdds,
  buildCrossAssetSignals,
  computeExecutionSignal,
  computeSignalFusion,
} = require('../lib/core');

// ═══════════════════════════════════════════════════════════════
//  PARLAY ENGINE — Unit Tests
// ═══════════════════════════════════════════════════════════════

describe('parlayCorrelationFactor', () => {
  test('single leg returns 1.0', () => {
    expect(parlayCorrelationFactor([{domain: 'sports'}])).toBe(1.0);
  });

  test('empty array returns 1.0', () => {
    expect(parlayCorrelationFactor([])).toBe(1.0);
  });

  test('same domain legs return lower factor (higher correlation)', () => {
    const legs = [
      {domain: 'technology', assetSignals: {equitySignals: [{sym: 'QQQ'}]}},
      {domain: 'technology', assetSignals: {equitySignals: [{sym: 'XLK'}]}},
    ];
    const factor = parlayCorrelationFactor(legs);
    expect(factor).toBeLessThan(1.0);
  });

  test('unrelated domains return higher factor (lower correlation)', () => {
    const legs = [
      {domain: 'sports', assetSignals: {equitySignals: [{sym: 'DKNG'}]}},
      {domain: 'geology', assetSignals: {equitySignals: [{sym: 'FCX'}]}},
    ];
    const factor = parlayCorrelationFactor(legs);
    expect(factor).toBeGreaterThan(0.9);
  });

  test('adjacent domains (shared symbols) return medium factor', () => {
    const legs = [
      {domain: 'technology', assetSignals: {equitySignals: [{sym: 'QQQ'}, {sym: 'SPY'}]}},
      {domain: 'financial', assetSignals: {equitySignals: [{sym: 'SPY'}, {sym: 'XLF'}]}},
    ];
    const factor = parlayCorrelationFactor(legs);
    expect(factor).toBeGreaterThan(0.5);
    expect(factor).toBeLessThan(1.0);
  });

  test('factor is always >= 0.4', () => {
    const legs = Array(8).fill({domain: 'technology', assetSignals: {equitySignals: [{sym: 'QQQ'}]}});
    const factor = parlayCorrelationFactor(legs);
    expect(factor).toBeGreaterThanOrEqual(0.4);
  });
});

describe('computeParlayOdds', () => {
  test('empty legs return null', () => {
    expect(computeParlayOdds([])).toBeNull();
  });

  test('single leg computes correctly', () => {
    const result = computeParlayOdds([
      {probability: 70, marketPrice: 60, domain: 'sports'},
    ]);
    expect(result.legs).toBe(1);
    expect(result.rawProb).toBeCloseTo(70, 0);
    expect(result.adjProb).toBeCloseTo(70, 0);
  });

  test('two legs reduce raw probability', () => {
    const result = computeParlayOdds([
      {probability: 70, marketPrice: 60, domain: 'sports'},
      {probability: 60, marketPrice: 50, domain: 'technology'},
    ]);
    expect(result.rawProb).toBeLessThan(70);
    expect(result.rawProb).toBeCloseTo(42, 0);
  });

  test('edge is positive when AI prob > market prob', () => {
    const result = computeParlayOdds([
      {probability: 80, marketPrice: 60, domain: 'sports'},
    ]);
    expect(result.edge).toBeGreaterThan(0);
  });

  test('edge is negative when AI prob < market prob', () => {
    const result = computeParlayOdds([
      {probability: 40, marketPrice: 60, domain: 'sports'},
    ]);
    expect(result.edge).toBeLessThan(0);
  });

  test('verdict is ENTER for large positive edge', () => {
    const result = computeParlayOdds([
      {probability: 90, marketPrice: 50, domain: 'sports'},
    ]);
    expect(result.verdict).toBe('ENTER');
  });

  test('verdict is AVOID for negative edge', () => {
    const result = computeParlayOdds([
      {probability: 30, marketPrice: 70, domain: 'sports'},
    ]);
    expect(result.verdict).toBe('AVOID');
  });

  test('verdict is NO MARKET DATA when no market prices', () => {
    const result = computeParlayOdds([
      {probability: 70, domain: 'sports'},
    ]);
    expect(result.verdict).toBe('NO MARKET DATA');
    expect(result.mktProb).toBeNull();
    expect(result.edge).toBeNull();
  });

  test('Kelly fraction is capped at 5%', () => {
    const result = computeParlayOdds([
      {probability: 99, marketPrice: 10, domain: 'sports'},
    ]);
    expect(result.kellyFraction).toBeLessThanOrEqual(5);
  });

  test('payout increases with more legs', () => {
    const oneleg = computeParlayOdds([
      {probability: 60, marketPrice: 50, domain: 'sports'},
    ]);
    const twoleg = computeParlayOdds([
      {probability: 60, marketPrice: 50, domain: 'sports'},
      {probability: 60, marketPrice: 50, domain: 'technology'},
    ]);
    expect(twoleg.payout).toBeGreaterThan(oneleg.payout);
  });

  test('correlated legs have lower correlation factor than uncorrelated', () => {
    const corrLegs = [
      {probability: 70, marketPrice: 60, domain: 'technology', assetSignals: {equitySignals: [{sym:'QQQ'}]}},
      {probability: 70, marketPrice: 60, domain: 'technology', assetSignals: {equitySignals: [{sym:'QQQ'}]}},
    ];
    const uncorrLegs = [
      {probability: 70, marketPrice: 60, domain: 'sports', assetSignals: {equitySignals: [{sym:'DKNG'}]}},
      {probability: 70, marketPrice: 60, domain: 'geology', assetSignals: {equitySignals: [{sym:'FCX'}]}},
    ];
    const correlated = computeParlayOdds(corrLegs);
    const uncorrelated = computeParlayOdds(uncorrLegs);
    expect(correlated.corrFactor).toBeLessThan(uncorrelated.corrFactor);
  });
});

// ═══════════════════════════════════════════════════════════════
//  CROSS-ASSET SIGNALS — Unit Tests
// ═══════════════════════════════════════════════════════════════

describe('buildCrossAssetSignals', () => {
  test('returns signals for known domain', () => {
    const result = buildCrossAssetSignals('financial', 'YES', 10);
    expect(result).not.toBeNull();
    expect(result.equitySignals.length).toBeGreaterThan(0);
  });

  test('falls back to polymarket for unknown domain', () => {
    const result = buildCrossAssetSignals('unknown_domain', 'YES', 5);
    expect(result).not.toBeNull();
    expect(result.equitySignals.some(e => e.sym === 'SPY')).toBe(true);
  });

  test('YES direction gives LONG signals for bullish assets', () => {
    const result = buildCrossAssetSignals('financial', 'YES', 10);
    const spy = result.equitySignals.find(e => e.sym === 'SPY');
    expect(spy.action).toBe('LONG');
    expect(spy.signal).toBe('BULLISH');
  });

  test('NO direction gives SHORT signals for risk assets', () => {
    const result = buildCrossAssetSignals('financial', 'NO', 10);
    const spy = result.equitySignals.find(e => e.sym === 'SPY');
    expect(spy.action).toBe('SHORT');
    expect(spy.signal).toBe('BEARISH');
  });

  test('probDelta scales weights', () => {
    const noScale = buildCrossAssetSignals('financial', 'YES', 0);
    const scaled  = buildCrossAssetSignals('financial', 'YES', 50);
    const spyNo = noScale.equitySignals.find(e => e.sym === 'SPY');
    const spySc = scaled.equitySignals.find(e => e.sym === 'SPY');
    expect(spySc.weight).toBeGreaterThan(spyNo.weight);
  });

  test('scale factor is capped at 1.5', () => {
    const result = buildCrossAssetSignals('financial', 'YES', 200);
    const spy = result.equitySignals.find(e => e.sym === 'SPY');
    expect(spy.weight).toBeLessThanOrEqual(1.5);
  });

  test('null probDelta uses scale factor 1.0', () => {
    const result = buildCrossAssetSignals('financial', 'YES', null);
    const spy = result.equitySignals.find(e => e.sym === 'SPY');
    expect(spy.weight).toBe(1);
  });

  test('includes forex signals when domain has them', () => {
    const result = buildCrossAssetSignals('financial', 'YES', 10);
    expect(result.forexSignals.length).toBeGreaterThan(0);
  });

  test('includes crypto signals when domain has them', () => {
    const result = buildCrossAssetSignals('technology', 'YES', 10);
    expect(result.cryptoSignals.length).toBeGreaterThan(0);
  });

  test('topPlay is first equity or crypto signal', () => {
    const result = buildCrossAssetSignals('financial', 'YES', 10);
    expect(result.topPlay).toBeDefined();
    expect(result.topPlay.sym).toBe('SPY');
  });

  test('philosophy domain returns empty equity signals', () => {
    const result = buildCrossAssetSignals('philosophy', 'YES', 5);
    expect(result.equitySignals.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
//  EXECUTION SIGNAL — Unit Tests
// ═══════════════════════════════════════════════════════════════

describe('computeExecutionSignal', () => {
  function makeMicrostructure() {
    return {
      kyle: {r2: 12, informed: false},
      hawkes: {branchingRatio: 0.5, hotMarket: false, explosive: false},
      as: {bidSpread: 0.002, askSpread: 0.002},
      vpin: {vpin: 0.35, polySpread: 8.0, highToxicity: false, flashCrashRisk: false},
    };
  }

  test('returns null when microstructure is null', () => {
    expect(computeExecutionSignal(null, {}, {})).toBeNull();
  });

  test('basic execution with positive edge', () => {
    const ms = makeMicrostructure();
    const delibSignal = { probDelta: 15, marketProb: 50, predProb: 65, confidence: 'HIGH' };
    const result = computeExecutionSignal(ms, {}, delibSignal);
    expect(result).not.toBeNull();
    expect(result.direction).toBe('YES');
    expect(result.edge).toBeGreaterThan(0);
  });

  test('negative probDelta gives NO direction', () => {
    const ms = makeMicrostructure();
    const delibSignal = { probDelta: -15, marketProb: 50, predProb: 35, confidence: 'MEDIUM' };
    const result = computeExecutionSignal(ms, {}, delibSignal);
    expect(result.direction).toBe('NO');
  });

  test('null probDelta gives null direction and CAUTION', () => {
    const ms = makeMicrostructure();
    const result = computeExecutionSignal(ms, {}, {});
    expect(result.direction).toBeNull();
    expect(result.rec).toBe('CAUTION');
  });

  test('flash crash risk forces AVOID', () => {
    const ms = makeMicrostructure();
    ms.vpin.flashCrashRisk = true;
    const delibSignal = { probDelta: 15, marketProb: 50, predProb: 65, confidence: 'HIGH' };
    const result = computeExecutionSignal(ms, {}, delibSignal);
    expect(result.rec).toBe('AVOID');
  });

  test('explosive market forces AVOID', () => {
    const ms = makeMicrostructure();
    ms.hawkes.explosive = true;
    const delibSignal = { probDelta: 15, marketProb: 50, predProb: 65, confidence: 'HIGH' };
    const result = computeExecutionSignal(ms, {}, delibSignal);
    expect(result.rec).toBe('AVOID');
  });

  test('Kelly is capped at 10%', () => {
    const ms = makeMicrostructure();
    const delibSignal = { probDelta: 40, marketProb: 20, predProb: 60, confidence: 'HIGH' };
    const result = computeExecutionSignal(ms, {}, delibSignal);
    expect(result.capKelly).toBeLessThanOrEqual(0.10);
  });

  test('high confidence yields higher Kelly than low confidence', () => {
    const ms = makeMicrostructure();
    const highConf = computeExecutionSignal(ms, {},
      { probDelta: 15, marketProb: 50, predProb: 65, confidence: 'HIGH' });
    const lowConf = computeExecutionSignal(ms, {},
      { probDelta: 15, marketProb: 50, predProb: 65, confidence: 'LOW' });
    expect(highConf.capKelly).toBeGreaterThanOrEqual(lowConf.capKelly);
  });

  test('VPIN penalty reduces Kelly', () => {
    const ms = makeMicrostructure();
    const lowVPIN = {...ms, vpin: {...ms.vpin, vpin: 0.1}};
    const highVPIN = {...ms, vpin: {...ms.vpin, vpin: 0.5}};
    const delibSignal = { probDelta: 15, marketProb: 50, predProb: 65, confidence: 'HIGH' };
    const r1 = computeExecutionSignal(lowVPIN, {}, delibSignal);
    const r2 = computeExecutionSignal(highVPIN, {}, delibSignal);
    expect(r2.capKelly).toBeLessThanOrEqual(r1.capKelly);
  });

  test('limit price is positive', () => {
    const ms = makeMicrostructure();
    const delibSignal = { probDelta: 15, marketProb: 50, predProb: 65, confidence: 'HIGH' };
    const result = computeExecutionSignal(ms, {}, delibSignal);
    expect(result.limitPrice).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
//  SIGNAL FUSION — Unit Tests
// ═══════════════════════════════════════════════════════════════

describe('computeSignalFusion', () => {
  test('returns neutral with no data', () => {
    const result = computeSignalFusion(null, {});
    expect(result.score).toBe(0);
    expect(result.direction).toBe('NEUTRAL');
    expect(result.count).toBe(0);
  });

  test('bullish signals produce positive score', () => {
    const mktData = {
      scores: { total: 80 },
      data: { vix: 15, spyPrice: 550, spy50: 530, spy200: 480, spyRsi: 55, abv200: 70, dxy: 99, fomc: false, cpi: false },
    };
    const liveData = {
      unusualWhales: { flowBias: 'BULLISH', bullPct: 70 },
      fearGreed: { value: 25 },
      crypto: { bitcoin: { usd_24h_change: 5 } },
    };
    const result = computeSignalFusion(mktData, liveData);
    expect(result.score).toBeGreaterThan(0);
    expect(result.direction).toBe('BULLISH');
  });

  test('bearish signals produce negative score', () => {
    const mktData = {
      scores: { total: 25 },
      data: { vix: 35, spyPrice: 420, spy50: 460, spy200: 500, spyRsi: 28, abv200: 30, dxy: 110, fomc: true, cpi: true, tnyield: 5.5 },
    };
    const liveData = {
      unusualWhales: { flowBias: 'BEARISH', bullPct: 30 },
      fearGreed: { value: 80 },
      crypto: { bitcoin: { usd_24h_change: -8 } },
    };
    const result = computeSignalFusion(mktData, liveData);
    expect(result.score).toBeLessThan(0);
    expect(result.direction).toBe('BEARISH');
  });

  test('score is clamped to [-100, 100]', () => {
    const mktData = { scores: { total: 100 }, data: {} };
    const result = computeSignalFusion(mktData, {});
    expect(result.score).toBeGreaterThanOrEqual(-100);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  test('returns top 5 signals sorted by contribution', () => {
    const mktData = {
      scores: { total: 70 },
      data: { vix: 18, spyPrice: 500, spy50: 490, spy200: 470, spyRsi: 55, abv200: 60, dxy: 102, tnyield: 4.0 },
    };
    const result = computeSignalFusion(mktData, {});
    expect(result.signals.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < result.signals.length; i++) {
      expect(Math.abs(result.signals[i-1].contribution)).toBeGreaterThanOrEqual(
        Math.abs(result.signals[i].contribution)
      );
    }
  });

  test('conviction levels: HIGH > 40, MEDIUM > 18, LOW otherwise', () => {
    const mktData = {
      scores: { total: 90 },
      data: { vix: 12, abv200: 80, spyPrice: 550, spy50: 530, spy200: 480, spyRsi: 55, dxy: 98, tnyield: 3.5 },
    };
    const liveData = {
      unusualWhales: { flowBias: 'BULLISH', bullPct: 80 },
      fearGreed: { value: 20 },
    };
    const result = computeSignalFusion(mktData, liveData);
    if (Math.abs(result.score) > 40) expect(result.conviction).toBe('HIGH');
    else if (Math.abs(result.score) > 18) expect(result.conviction).toBe('MEDIUM');
    else expect(result.conviction).toBe('LOW');
  });

  test('P/C ratio contrarian: high P/C = bullish signal', () => {
    const mktData = { data: { pcRatio: 1.4 } };
    const result = computeSignalFusion(mktData, {});
    const pcSignal = result.signals.find(s => s.label === 'CBOE P/C Ratio');
    if (pcSignal) expect(pcSignal.value).toBeGreaterThan(0);
  });

  test('Fear & Greed contrarian: extreme fear = bullish', () => {
    const result = computeSignalFusion(null, { fearGreed: { value: 15 } });
    const fgSignal = result.signals.find(s => s.label === 'Fear & Greed');
    if (fgSignal) expect(fgSignal.value).toBeGreaterThan(0);
  });

  test('congressional trades: more buys = bullish', () => {
    const liveData = {
      unusualWhales: {
        congress: [
          { type: 'purchase' }, { type: 'purchase' }, { type: 'purchase' },
          { type: 'sale' },
        ],
      },
    };
    const result = computeSignalFusion(null, liveData);
    const congSignal = result.signals.find(s => s.label === 'Congress Trades');
    if (congSignal) expect(congSignal.value).toBeGreaterThan(0);
  });
});

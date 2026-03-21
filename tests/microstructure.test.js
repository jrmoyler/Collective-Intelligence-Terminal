const {
  citDeriveOBMetrics,
  citKyleLambda,
  citHawkes,
  citAlmgrenChriss,
  citAvellanedaStoikov,
  citVPIN,
  citComputeAll,
} = require('../lib/core');

// ═══════════════════════════════════════════════════════════════
//  MICROSTRUCTURE MODELS — Unit Tests
// ═══════════════════════════════════════════════════════════════

function makeOrderBook() {
  return {
    bids: [
      {price: 0.58, size: 500}, {price: 0.57, size: 400},
      {price: 0.56, size: 300}, {price: 0.55, size: 200},
    ],
    asks: [
      {price: 0.60, size: 450}, {price: 0.61, size: 350},
      {price: 0.62, size: 250}, {price: 0.63, size: 150},
    ],
  };
}

function makeTrades() {
  const base = Date.now();
  return Array.from({length: 20}, (_, i) => ({
    price: 0.58 + Math.sin(i) * 0.02,
    size: 100 + i * 10,
    side: i % 3 === 0 ? -1 : 1,
    timestamp: base + i * 2000,
  }));
}

function makeMarketData() {
  return {
    vix: 20, spyPrice: 500, spyRsi: 55,
    adRatio: 1.3, abv200: 60,
  };
}

describe('citDeriveOBMetrics', () => {
  test('returns null for null order book', () => {
    expect(citDeriveOBMetrics(null, [])).toBeNull();
  });

  test('returns null for empty bids', () => {
    expect(citDeriveOBMetrics({bids: [], asks: [{price: 1, size: 1}]}, [])).toBeNull();
  });

  test('returns null for empty asks', () => {
    expect(citDeriveOBMetrics({bids: [{price: 1, size: 1}], asks: []}, [])).toBeNull();
  });

  test('computes correct mid price', () => {
    const ob = makeOrderBook();
    const trades = makeTrades();
    const metrics = citDeriveOBMetrics(ob, trades);
    expect(metrics.mid).toBeCloseTo((0.58 + 0.60) / 2, 4);
  });

  test('computes correct best bid and ask', () => {
    const metrics = citDeriveOBMetrics(makeOrderBook(), makeTrades());
    expect(metrics.bestBid).toBe(0.58);
    expect(metrics.bestAsk).toBe(0.60);
  });

  test('spread is positive', () => {
    const metrics = citDeriveOBMetrics(makeOrderBook(), makeTrades());
    expect(metrics.spreadPct).toBeGreaterThan(0);
  });

  test('round-trip cost is double the spread', () => {
    const metrics = citDeriveOBMetrics(makeOrderBook(), makeTrades());
    expect(metrics.roundTripPct).toBeCloseTo(metrics.spreadPct * 2, 2);
  });

  test('bid and ask depth are positive', () => {
    const metrics = citDeriveOBMetrics(makeOrderBook(), makeTrades());
    expect(metrics.bidDepth).toBeGreaterThan(0);
    expect(metrics.askDepth).toBeGreaterThan(0);
  });

  test('order imbalance is between -1 and 1', () => {
    const metrics = citDeriveOBMetrics(makeOrderBook(), makeTrades());
    expect(metrics.orderImbalance).toBeGreaterThanOrEqual(-1);
    expect(metrics.orderImbalance).toBeLessThanOrEqual(1);
  });

  test('signed flows match trade count', () => {
    const trades = makeTrades();
    const metrics = citDeriveOBMetrics(makeOrderBook(), trades);
    expect(metrics.signedFlows.length).toBe(trades.length);
  });

  test('price changes have length trades.length - 1', () => {
    const trades = makeTrades();
    const metrics = citDeriveOBMetrics(makeOrderBook(), trades);
    expect(metrics.priceChanges.length).toBe(trades.length - 1);
  });

  test('buy and sell volumes are non-negative', () => {
    const metrics = citDeriveOBMetrics(makeOrderBook(), makeTrades());
    expect(metrics.buyVol).toBeGreaterThanOrEqual(0);
    expect(metrics.sellVol).toBeGreaterThanOrEqual(0);
  });

  test('VPIN is between 0 and 1 when measurable', () => {
    const metrics = citDeriveOBMetrics(makeOrderBook(), makeTrades());
    if (metrics.measuredVPIN != null) {
      expect(metrics.measuredVPIN).toBeGreaterThanOrEqual(0);
      expect(metrics.measuredVPIN).toBeLessThanOrEqual(1);
    }
  });

  test('interArrivals are positive', () => {
    const metrics = citDeriveOBMetrics(makeOrderBook(), makeTrades());
    metrics.interArrivals.forEach(ia => {
      expect(ia).toBeGreaterThan(0);
    });
  });
});

describe('citKyleLambda', () => {
  test('analytical mode (no OB metrics)', () => {
    const d = makeMarketData();
    const result = citKyleLambda(d, null);
    expect(result.measured).toBe(false);
    expect(result.lambda).toBeGreaterThanOrEqual(0);
    expect(result.r2).toBeGreaterThanOrEqual(0);
    expect(result.r2).toBeLessThanOrEqual(100);
  });

  test('measured mode with OB metrics', () => {
    const d = makeMarketData();
    const obMetrics = citDeriveOBMetrics(makeOrderBook(), makeTrades());
    const result = citKyleLambda(d, obMetrics);
    expect(result.measured).toBe(true);
    expect(result.n).toBeGreaterThanOrEqual(5);
  });

  test('deliberation boost increases R2', () => {
    const d = makeMarketData();
    const noDelib = citKyleLambda(d, null, { active: false });
    const withDelib = citKyleLambda(d, null, { active: true, probDelta: 25 });
    expect(withDelib.r2).toBeGreaterThan(noDelib.r2);
    expect(withDelib.delibBoosted).toBe(true);
  });

  test('no delib boost for small delta', () => {
    const d = makeMarketData();
    const result = citKyleLambda(d, null, { active: true, probDelta: 5 });
    expect(result.delibBoosted).toBe(false);
  });

  test('informed flag based on R2 > 15%', () => {
    const d = makeMarketData();
    const result = citKyleLambda(d, null);
    if (result.r2 > 15) expect(result.informed).toBe(true);
    else expect(result.informed).toBe(false);
  });

  test('gaugeVal is capped at 100', () => {
    const d = makeMarketData();
    const result = citKyleLambda(d, null, { active: true, probDelta: 50 });
    expect(result.gaugeVal).toBeLessThanOrEqual(100);
  });
});

describe('citHawkes', () => {
  test('analytical mode without inter-arrivals', () => {
    const d = makeMarketData();
    const result = citHawkes(d, null);
    expect(result.measured).toBe(false);
    expect(result.eventCount).toBe(45);
    expect(result.alpha).toBeGreaterThan(0);
    expect(result.beta).toBeGreaterThan(0);
  });

  test('measured mode with inter-arrivals', () => {
    const obMetrics = citDeriveOBMetrics(makeOrderBook(), makeTrades());
    const d = makeMarketData();
    const result = citHawkes(d, obMetrics);
    expect(result.measured).toBe(true);
    expect(result.eventCount).toBeGreaterThan(0);
  });

  test('branching ratio between 0 and 1', () => {
    const d = makeMarketData();
    const result = citHawkes(d, null);
    expect(+result.branchingRatio).toBeGreaterThanOrEqual(0);
    expect(+result.branchingRatio).toBeLessThanOrEqual(1);
  });

  test('hotMarket flag when branching ratio > 0.8', () => {
    const d = {...makeMarketData(), vix: 40, spyRsi: 85};
    const result = citHawkes(d, null);
    if (+result.branchingRatio > 0.8) expect(result.hotMarket).toBe(true);
    else expect(result.hotMarket).toBe(false);
  });

  test('explosive flag when branching ratio > 0.95', () => {
    const d = makeMarketData();
    const result = citHawkes(d, null);
    if (+result.branchingRatio > 0.95) expect(result.explosive).toBe(true);
    else expect(result.explosive).toBe(false);
  });
});

describe('citAlmgrenChriss', () => {
  test('returns trajectory array', () => {
    const d = makeMarketData();
    const result = citAlmgrenChriss(d);
    expect(Array.isArray(result.trajectory)).toBe(true);
    expect(result.trajectory.length).toBe(21);
  });

  test('trajectory starts at full position', () => {
    const d = makeMarketData();
    const result = citAlmgrenChriss(d);
    expect(result.trajectory[0].remaining).toBeCloseTo(1, 1);
  });

  test('trajectory ends near zero', () => {
    const d = makeMarketData();
    const result = citAlmgrenChriss(d);
    const last = result.trajectory[result.trajectory.length - 1];
    expect(last.remaining).toBeLessThan(0.1);
  });

  test('optimal slices between 3 and 20', () => {
    const d = makeMarketData();
    const result = citAlmgrenChriss(d);
    expect(result.optimalSlices).toBeGreaterThanOrEqual(3);
    expect(result.optimalSlices).toBeLessThanOrEqual(20);
  });

  test('slippage increases with VIX', () => {
    const lowVix = citAlmgrenChriss({...makeMarketData(), vix: 12});
    const highVix = citAlmgrenChriss({...makeMarketData(), vix: 35});
    expect(highVix.slippagePct).toBeGreaterThan(lowVix.slippagePct);
  });

  test('riskWarning flag when slippage dollar > 300', () => {
    const d = makeMarketData();
    const result = citAlmgrenChriss(d);
    if (result.slippageDollar > 300) expect(result.riskWarning).toBe(true);
    else expect(result.riskWarning).toBe(false);
  });
});

describe('citAvellanedaStoikov', () => {
  test('returns reservation price near SPY price', () => {
    const d = makeMarketData();
    const hawkes = citHawkes(d, null);
    const result = citAvellanedaStoikov(d, hawkes);
    expect(Math.abs(result.reservationPrice - d.spyPrice)).toBeLessThan(50);
  });

  test('bid and ask spreads are positive', () => {
    const d = makeMarketData();
    const hawkes = citHawkes(d, null);
    const result = citAvellanedaStoikov(d, hawkes);
    expect(result.bidSpread).toBeGreaterThan(0);
    expect(result.askSpread).toBeGreaterThan(0);
  });

  test('deliberation adjusts reservation price', () => {
    const d = makeMarketData();
    const hawkes = citHawkes(d, null);
    const noDelib = citAvellanedaStoikov(d, hawkes, { active: false });
    const withDelib = citAvellanedaStoikov(d, hawkes, {
      active: true, probDelta: 20, confidence: 'HIGH'
    });
    expect(withDelib.reservationAdj).not.toBe(0);
    expect(withDelib.delibInfo).not.toBeNull();
  });

  test('spread widens on dissensus', () => {
    const d = makeMarketData();
    const hawkes = citHawkes(d, null);
    const normal = citAvellanedaStoikov(d, hawkes, { active: false });
    const dissensus = citAvellanedaStoikov(d, hawkes, { active: true, dissensus: true });
    expect(dissensus.spreadWidened).toBe(true);
    expect(dissensus.bidSpread).toBeGreaterThan(normal.bidSpread);
  });

  test('spread widens on herd signal', () => {
    const d = makeMarketData();
    const hawkes = citHawkes(d, null);
    const normal = citAvellanedaStoikov(d, hawkes, { active: false });
    const herd = citAvellanedaStoikov(d, hawkes, { active: true, herdLikely: true });
    expect(herd.spreadWidened).toBe(true);
    expect(herd.bidSpread).toBeGreaterThan(normal.bidSpread);
  });

  test('inventory warning when |q| > 3', () => {
    const d = {...makeMarketData(), adRatio: 3.5};
    const hawkes = citHawkes(d, null);
    const result = citAvellanedaStoikov(d, hawkes);
    expect(result.inventoryWarning).toBe(true);
  });
});

describe('citVPIN', () => {
  test('analytical mode without measured VPIN', () => {
    const d = makeMarketData();
    const kyle = citKyleLambda(d, null);
    const result = citVPIN(d, kyle, null);
    expect(result.measured).toBe(false);
    expect(result.vpin).toBeGreaterThan(0);
    expect(result.vpin).toBeLessThanOrEqual(0.95);
  });

  test('measured mode uses OB VPIN', () => {
    const d = makeMarketData();
    const kyle = citKyleLambda(d, null);
    const obMetrics = citDeriveOBMetrics(makeOrderBook(), makeTrades());
    if (obMetrics.measuredVPIN != null) {
      const result = citVPIN(d, kyle, obMetrics);
      expect(result.measured).toBe(true);
      expect(result.vpin).toBe(obMetrics.measuredVPIN);
    }
  });

  test('high toxicity flag when VPIN > 0.5', () => {
    const d = {...makeMarketData(), vix: 35, adRatio: 3.0};
    const kyle = {r2: 30};
    const result = citVPIN(d, kyle, null);
    if (result.vpin > 0.5) expect(result.highToxicity).toBe(true);
    else expect(result.highToxicity).toBe(false);
  });

  test('flash crash risk flag when VPIN > 0.7', () => {
    const d = {...makeMarketData(), vix: 35, adRatio: 3.0};
    const kyle = {r2: 30};
    const result = citVPIN(d, kyle, null);
    if (result.vpin > 0.7) expect(result.flashCrashRisk).toBe(true);
    else expect(result.flashCrashRisk).toBe(false);
  });

  test('dissensus and herd boost VPIN', () => {
    const d = makeMarketData();
    const kyle = citKyleLambda(d, null);
    const normal = citVPIN(d, kyle, null, { active: false });
    const boosted = citVPIN(d, kyle, null, { active: true, dissensus: true, herdLikely: true });
    expect(boosted.vpin).toBeGreaterThanOrEqual(normal.vpin);
  });

  test('gaugeVal capped at 100', () => {
    const d = {...makeMarketData(), vix: 35, adRatio: 5.0};
    const kyle = {r2: 80};
    const result = citVPIN(d, kyle, null);
    expect(result.gaugeVal).toBeLessThanOrEqual(100);
  });
});

describe('citComputeAll', () => {
  test('returns all five model results', () => {
    const d = makeMarketData();
    const result = citComputeAll(d, null);
    expect(result.kyle).toBeDefined();
    expect(result.hawkes).toBeDefined();
    expect(result.ac).toBeDefined();
    expect(result.as).toBeDefined();
    expect(result.vpin).toBeDefined();
  });

  test('microRisk is a number', () => {
    const d = makeMarketData();
    const result = citComputeAll(d, null);
    expect(typeof result.microRisk).toBe('number');
    expect(result.microRisk).toBeGreaterThanOrEqual(0);
  });

  test('hasLiveOB is false without OB metrics', () => {
    const d = makeMarketData();
    const result = citComputeAll(d, null);
    expect(result.hasLiveOB).toBe(false);
  });

  test('hasLiveOB is true with OB metrics', () => {
    const d = makeMarketData();
    const obMetrics = citDeriveOBMetrics(makeOrderBook(), makeTrades());
    const result = citComputeAll(d, obMetrics);
    expect(result.hasLiveOB).toBe(true);
  });
});

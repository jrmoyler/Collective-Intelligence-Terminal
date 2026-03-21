const { citScoreMarket } = require('../lib/core');

// ═══════════════════════════════════════════════════════════════
//  MARKET SCORING ENGINE — Unit Tests
// ═══════════════════════════════════════════════════════════════

function makeBullishMarketData() {
  return {
    vix: 15, pcRatio: 0.8,
    spyPrice: 550, spy20: 540, spy50: 530, spy200: 480,
    spyRsi: 60,
    qqq: 490, qqq50: 470,
    abv20: 65, abv50: 70, abv200: 72,
    adRatio: 1.8, nhNl: 90, pctHH: 60,
    tnyield: 3.8, dxy: 99,
    fomc: false, cpi: false,
    sectors: [
      {sym:'XLK',name:'TECH',chg:2.5},{sym:'XLF',name:'FIN',chg:1.8},
      {sym:'XLE',name:'ENERGY',chg:1.5},{sym:'XLV',name:'HEALTH',chg:1.2},
      {sym:'XLI',name:'INDUS',chg:1.0},{sym:'XLY',name:'DISC',chg:0.8},
      {sym:'XLP',name:'STAPLES',chg:0.5},{sym:'XLU',name:'UTIL',chg:0.3},
      {sym:'XLB',name:'MATER',chg:0.2},{sym:'XLRE',name:'REIT',chg:0.1},
      {sym:'XLC',name:'COMM',chg:-0.1},
    ],
  };
}

function makeBearishMarketData() {
  return {
    vix: 32, pcRatio: 1.3,
    spyPrice: 420, spy20: 440, spy50: 460, spy200: 500,
    spyRsi: 28,
    qqq: 350, qqq50: 380,
    abv20: 25, abv50: 30, abv200: 28,
    adRatio: 0.6, nhNl: 20, pctHH: 15,
    tnyield: 5.2, dxy: 110,
    fomc: true, cpi: true,
    sectors: [
      {sym:'XLK',name:'TECH',chg:-2.5},{sym:'XLF',name:'FIN',chg:-2.0},
      {sym:'XLE',name:'ENERGY',chg:-1.8},{sym:'XLV',name:'HEALTH',chg:-1.5},
      {sym:'XLI',name:'INDUS',chg:-1.2},{sym:'XLY',name:'DISC',chg:-1.0},
      {sym:'XLP',name:'STAPLES',chg:-0.5},{sym:'XLU',name:'UTIL',chg:-0.3},
      {sym:'XLB',name:'MATER',chg:-0.2},{sym:'XLRE',name:'REIT',chg:-0.1},
      {sym:'XLC',name:'COMM',chg:0.0},
    ],
  };
}

describe('citScoreMarket', () => {
  test('returns LOADING state when core data is null', () => {
    const result = citScoreMarket({ vix: null, spyPrice: null });
    expect(result.decision).toBe('LOADING');
    expect(result.regime).toBe('FETCHING...');
    expect(result.total).toBe(0);
  });

  test('returns LOADING when only VIX is null', () => {
    const result = citScoreMarket({ vix: null, spyPrice: 500 });
    expect(result.decision).toBe('LOADING');
  });

  test('returns LOADING when only SPY is null', () => {
    const result = citScoreMarket({ vix: 20, spyPrice: null });
    expect(result.decision).toBe('LOADING');
  });

  test('bullish market scores high', () => {
    const result = citScoreMarket(makeBullishMarketData());
    expect(result.total).toBeGreaterThan(60);
    expect(result.decision).not.toBe('NO');
    expect(result.regime).toBe('UPTREND');
  });

  test('bearish market scores low', () => {
    const result = citScoreMarket(makeBearishMarketData());
    expect(result.total).toBeLessThan(40);
    expect(result.decision).toBe('NO');
  });

  test('total score is between 0 and 100', () => {
    const bull = citScoreMarket(makeBullishMarketData());
    const bear = citScoreMarket(makeBearishMarketData());
    expect(bull.total).toBeGreaterThanOrEqual(0);
    expect(bull.total).toBeLessThanOrEqual(100);
    expect(bear.total).toBeGreaterThanOrEqual(0);
    expect(bear.total).toBeLessThanOrEqual(100);
  });

  test('sub-scores stay 0-100', () => {
    const result = citScoreMarket(makeBullishMarketData());
    expect(result.volScore).toBeGreaterThanOrEqual(0);
    expect(result.volScore).toBeLessThanOrEqual(100);
    expect(result.trendScore).toBeGreaterThanOrEqual(0);
    expect(result.trendScore).toBeLessThanOrEqual(100);
    expect(result.breadthScore).toBeGreaterThanOrEqual(0);
    expect(result.breadthScore).toBeLessThanOrEqual(100);
    expect(result.momScore).toBeGreaterThanOrEqual(0);
    expect(result.momScore).toBeLessThanOrEqual(100);
    expect(result.macroScore).toBeGreaterThanOrEqual(0);
    expect(result.macroScore).toBeLessThanOrEqual(100);
  });

  test('day mode applies 0.9 multiplier', () => {
    const swing = citScoreMarket(makeBullishMarketData(), 'swing');
    const day   = citScoreMarket(makeBullishMarketData(), 'day');
    expect(day.total).toBeLessThanOrEqual(swing.total);
  });

  test('FOMC and CPI events reduce macro score', () => {
    const noEvents = makeBullishMarketData();
    const withEvents = {...makeBullishMarketData(), fomc: true, cpi: true};
    const r1 = citScoreMarket(noEvents);
    const r2 = citScoreMarket(withEvents);
    expect(r2.macroScore).toBeLessThan(r1.macroScore);
  });

  test('high VIX reduces volatility score', () => {
    const lowVix = {...makeBullishMarketData(), vix: 12};
    const highVix = {...makeBullishMarketData(), vix: 35};
    const r1 = citScoreMarket(lowVix);
    const r2 = citScoreMarket(highVix);
    expect(r2.volScore).toBeLessThan(r1.volScore);
  });

  test('high P/C ratio reduces vol score', () => {
    const lowPC = {...makeBullishMarketData(), pcRatio: 0.8};
    const highPC = {...makeBullishMarketData(), pcRatio: 1.4};
    const r1 = citScoreMarket(lowPC);
    const r2 = citScoreMarket(highPC);
    expect(r2.volScore).toBeLessThan(r1.volScore);
  });

  test('decision thresholds: YES >= 80, CAUTION >= 60, else NO', () => {
    const d = makeBullishMarketData();
    const result = citScoreMarket(d);
    if (result.total >= 80) expect(result.decision).toBe('YES');
    else if (result.total >= 60) expect(result.decision).toBe('CAUTION');
    else expect(result.decision).toBe('NO');
  });

  test('regime detection: UPTREND when trend+breadth high', () => {
    const bull = citScoreMarket(makeBullishMarketData());
    expect(bull.regime).toBe('UPTREND');
  });

  test('regime detection: DOWNTREND when trend+breadth low', () => {
    const bear = citScoreMarket(makeBearishMarketData());
    expect(['DOWNTREND', 'CHOP']).toContain(bear.regime);
  });

  test('execution signals are boolean', () => {
    const result = citScoreMarket(makeBullishMarketData());
    expect(typeof result.breakoutsHolding).toBe('boolean');
    expect(typeof result.pullbacksBought).toBe('boolean');
    expect(typeof result.followThru).toBe('boolean');
    expect(typeof result.setupsWorking).toBe('boolean');
  });

  test('execScore is built from execution signals', () => {
    const result = citScoreMarket(makeBullishMarketData());
    let expected = 0;
    if (result.breakoutsHolding) expected += 30;
    if (result.pullbacksBought) expected += 25;
    if (result.followThru) expected += 25;
    if (result.setupsWorking) expected += 20;
    expect(result.execScore).toBe(expected);
  });
});

const {
  levenshteinSim,
  citSMA,
  citRSI,
  brierScore,
  parseJSON,
  citAllOrigins,
  citFallback,
  citScoreColor,
} = require('../lib/core');

// ═══════════════════════════════════════════════════════════════
//  UTILITY FUNCTIONS — Unit Tests
// ═══════════════════════════════════════════════════════════════

describe('levenshteinSim', () => {
  test('identical strings return 1', () => {
    expect(levenshteinSim('hello', 'hello')).toBe(1);
  });

  test('completely different strings return 0', () => {
    expect(levenshteinSim('abc', 'xyz')).toBe(0);
  });

  test('null or empty inputs return 0', () => {
    expect(levenshteinSim(null, 'hello')).toBe(0);
    expect(levenshteinSim('hello', null)).toBe(0);
    expect(levenshteinSim('', 'hello')).toBe(0);
    expect(levenshteinSim('hello', '')).toBe(0);
    expect(levenshteinSim(null, null)).toBe(0);
  });

  test('similar strings return value between 0 and 1', () => {
    const sim = levenshteinSim('kitten', 'sitting');
    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThan(1);
  });

  test('single character difference yields high similarity', () => {
    const sim = levenshteinSim('cat', 'bat');
    expect(sim).toBeCloseTo(0.667, 2);
  });

  test('early exit on length mismatch > 30%', () => {
    expect(levenshteinSim('ab', 'abcdefgh')).toBe(0);
  });

  test('case sensitivity is maintained', () => {
    const sim = levenshteinSim('Hello', 'hello');
    expect(sim).toBeLessThan(1);
    expect(sim).toBeGreaterThan(0.5);
  });

  test('handles unicode strings', () => {
    expect(levenshteinSim('café', 'cafe')).toBeGreaterThan(0.5);
  });

  test('handles prefix deletion (regression: boundary init bug)', () => {
    const sim = levenshteinSim('abcdef', 'bcdef');
    expect(sim).toBeCloseTo(0.833, 2);
    expect(sim).toBeGreaterThan(0);
  });

  test('handles suffix deletion within 30% threshold', () => {
    const sim = levenshteinSim('abcdefg', 'abcdef');
    expect(sim).toBeCloseTo(0.857, 2);
    expect(sim).toBeGreaterThan(0);
  });

  test('never returns negative values', () => {
    const pairs = [
      ['abcdef', 'bcdef'], ['hello', 'ello'], ['world', 'orld'],
      ['testing', 'estin'], ['compare', 'compar'],
    ];
    pairs.forEach(([a, b]) => {
      const sim = levenshteinSim(a, b);
      expect(sim).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('citSMA', () => {
  test('returns null when insufficient data', () => {
    expect(citSMA([1, 2], 5)).toBeNull();
    expect(citSMA([], 3)).toBeNull();
  });

  test('computes correct SMA for exact period length', () => {
    expect(citSMA([10, 20, 30], 3)).toBe(20);
  });

  test('uses only the last N values', () => {
    expect(citSMA([1, 2, 3, 10, 20, 30], 3)).toBe(20);
  });

  test('handles single element period', () => {
    expect(citSMA([42], 1)).toBe(42);
  });

  test('returns properly rounded result', () => {
    const result = citSMA([10, 20, 33], 3);
    expect(result).toBe(21);
  });

  test('handles floating point closes', () => {
    const result = citSMA([100.5, 101.3, 99.8, 102.1, 98.7], 3);
    expect(typeof result).toBe('number');
    expect(result).toBeCloseTo(100.2, 1);
  });
});

describe('citRSI', () => {
  test('returns 50 when insufficient data', () => {
    expect(citRSI([1, 2, 3], 14)).toBe(50);
  });

  test('returns 100 when all gains (no losses)', () => {
    const data = Array.from({length: 20}, (_, i) => 100 + i);
    expect(citRSI(data, 14)).toBe(100);
  });

  test('returns value near 0 when all losses', () => {
    const data = Array.from({length: 20}, (_, i) => 200 - i);
    const rsi = citRSI(data, 14);
    expect(rsi).toBeLessThan(10);
    expect(rsi).toBeGreaterThanOrEqual(0);
  });

  test('returns value near 50 when gains equal losses', () => {
    const data = [100, 101, 100, 101, 100, 101, 100, 101, 100, 101, 100, 101, 100, 101, 100, 101];
    const rsi = citRSI(data, 14);
    expect(rsi).toBeCloseTo(50, 0);
  });

  test('RSI stays between 0 and 100', () => {
    const data = [100, 105, 98, 110, 95, 115, 90, 120, 85, 125, 80, 130, 75, 135, 70, 140];
    const rsi = citRSI(data, 14);
    expect(rsi).toBeGreaterThanOrEqual(0);
    expect(rsi).toBeLessThanOrEqual(100);
  });

  test('uses default period of 14', () => {
    const data = Array.from({length: 20}, (_, i) => 100 + i);
    const withDefault = citRSI(data);
    const withExplicit = citRSI(data, 14);
    expect(withDefault).toBe(withExplicit);
  });
});

describe('brierScore', () => {
  test('perfect YES prediction returns 0', () => {
    expect(brierScore(100, 'YES')).toBe(0);
  });

  test('perfect NO prediction returns 0', () => {
    expect(brierScore(0, 'NO')).toBe(0);
  });

  test('completely wrong YES prediction returns 1', () => {
    expect(brierScore(0, 'YES')).toBe(1);
  });

  test('completely wrong NO prediction returns 1', () => {
    expect(brierScore(100, 'NO')).toBe(1);
  });

  test('50% prediction returns 0.25 regardless of outcome', () => {
    expect(brierScore(50, 'YES')).toBe(0.25);
    expect(brierScore(50, 'NO')).toBe(0.25);
  });

  test('70% YES with YES outcome', () => {
    expect(brierScore(70, 'YES')).toBeCloseTo(0.09, 2);
  });

  test('30% YES with NO outcome', () => {
    expect(brierScore(30, 'NO')).toBeCloseTo(0.09, 2);
  });

  test('result is between 0 and 1', () => {
    for (let p = 0; p <= 100; p += 10) {
      const bYes = brierScore(p, 'YES');
      const bNo = brierScore(p, 'NO');
      expect(bYes).toBeGreaterThanOrEqual(0);
      expect(bYes).toBeLessThanOrEqual(1);
      expect(bNo).toBeGreaterThanOrEqual(0);
      expect(bNo).toBeLessThanOrEqual(1);
    }
  });
});

describe('parseJSON', () => {
  test('parses clean JSON', () => {
    const result = parseJSON('{"key": "value"}');
    expect(result).toEqual({key: 'value'});
  });

  test('parses JSON wrapped in markdown code blocks', () => {
    const result = parseJSON('```json\n{"key": "value"}\n```');
    expect(result).toEqual({key: 'value'});
  });

  test('handles text before and after JSON', () => {
    const result = parseJSON('Here is the result: {"key": "value"} done.');
    expect(result).toEqual({key: 'value'});
  });

  test('returns fallback for invalid JSON', () => {
    const result = parseJSON('not json at all', {default: true});
    expect(result).toEqual({default: true});
  });

  test('returns fallback for empty string', () => {
    const result = parseJSON('', {empty: true});
    expect(result).toEqual({empty: true});
  });

  test('handles nested JSON objects', () => {
    const result = parseJSON('{"a": {"b": {"c": 1}}}');
    expect(result.a.b.c).toBe(1);
  });

  test('handles JSON with arrays', () => {
    const result = parseJSON('{"items": [1, 2, 3]}');
    expect(result.items).toEqual([1, 2, 3]);
  });

  test('returns default fallback (empty object) when no fallback given', () => {
    const result = parseJSON('broken');
    expect(result).toEqual({});
  });

  test('handles string without braces', () => {
    const result = parseJSON('no braces here');
    expect(result).toEqual({});
  });
});

describe('citAllOrigins', () => {
  test('wraps URL in allOrigins proxy', () => {
    const result = citAllOrigins('https://example.com/api');
    expect(result).toBe('https://api.allorigins.win/get?url=https%3A%2F%2Fexample.com%2Fapi');
  });

  test('encodes special characters', () => {
    const result = citAllOrigins('https://api.example.com?foo=bar&baz=qux');
    expect(result).toContain('api.allorigins.win');
    expect(result).toContain(encodeURIComponent('https://api.example.com?foo=bar&baz=qux'));
  });
});

describe('citFallback', () => {
  test('returns object with all null market fields', () => {
    const fb = citFallback();
    expect(fb.vix).toBeNull();
    expect(fb.spyPrice).toBeNull();
    expect(fb.spy200).toBeNull();
    expect(fb.spyRsi).toBeNull();
    expect(fb.tnyield).toBeNull();
    expect(fb.dxy).toBeNull();
  });

  test('returns boolean false for event flags', () => {
    const fb = citFallback();
    expect(fb.fomc).toBe(false);
    expect(fb.cpi).toBe(false);
  });

  test('returns 11 sector entries', () => {
    const fb = citFallback();
    expect(fb.sectors).toHaveLength(11);
  });

  test('each sector has sym, name, and null chg', () => {
    const fb = citFallback();
    fb.sectors.forEach(s => {
      expect(s).toHaveProperty('sym');
      expect(s).toHaveProperty('name');
      expect(s.chg).toBeNull();
    });
  });

  test('returns a new object each call (no shared reference)', () => {
    const fb1 = citFallback();
    const fb2 = citFallback();
    expect(fb1).not.toBe(fb2);
    fb1.vix = 20;
    expect(fb2.vix).toBeNull();
  });
});

describe('citScoreColor', () => {
  test('returns green for scores >= 70', () => {
    expect(citScoreColor(70)).toBe('#00FFB2');
    expect(citScoreColor(100)).toBe('#00FFB2');
  });

  test('returns amber for scores 45-69', () => {
    expect(citScoreColor(45)).toBe('#FFB800');
    expect(citScoreColor(69)).toBe('#FFB800');
  });

  test('returns red for scores < 45', () => {
    expect(citScoreColor(44)).toBe('#FF3B5C');
    expect(citScoreColor(0)).toBe('#FF3B5C');
  });
});

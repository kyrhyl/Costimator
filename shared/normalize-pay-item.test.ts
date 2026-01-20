/**
 * Unit Tests for Pay Item Normalization Utilities
 */

import { describe, it, expect } from 'vitest';
import {
  normalizePayItemNumber,
  payItemsMatch,
  normalizeUnit,
  getBaseItemNumber,
  getTradeFromPayItem,
  isValidPayItemFormat,
} from './normalize-pay-item';

describe('normalizePayItemNumber', () => {
  it('should remove space before letter suffix', () => {
    expect(normalizePayItemNumber('900 (1) c')).toBe('900 (1)C');
    expect(normalizePayItemNumber('800 (3) a1')).toBe('800 (3)A1');
    expect(normalizePayItemNumber('902 (1) a7')).toBe('902 (1)A7');
  });

  it('should handle items without space before letter', () => {
    expect(normalizePayItemNumber('900 (1)c')).toBe('900 (1)C');
    expect(normalizePayItemNumber('800 (3)a1')).toBe('800 (3)A1');
  });

  it('should convert to uppercase', () => {
    expect(normalizePayItemNumber('900 (1) c')).toBe('900 (1)C');
    expect(normalizePayItemNumber('900 (1) C')).toBe('900 (1)C');
  });

  it('should normalize multiple spaces', () => {
    expect(normalizePayItemNumber('900  (1)   c')).toBe('900 (1)C');
  });

  it('should handle simple items without letter suffix', () => {
    expect(normalizePayItemNumber('800 (1)')).toBe('800 (1)');
    expect(normalizePayItemNumber('900 (2)')).toBe('900 (2)');
  });

  it('should handle empty or invalid input', () => {
    expect(normalizePayItemNumber('')).toBe('');
    expect(normalizePayItemNumber('   ')).toBe('');
  });
});

describe('payItemsMatch', () => {
  it('should match items with different spacing', () => {
    expect(payItemsMatch('900 (1) c', '900 (1)c')).toBe(true);
    expect(payItemsMatch('800 (3) a1', '800 (3)a1')).toBe(true);
  });

  it('should match items with different case', () => {
    expect(payItemsMatch('900 (1) c', '900 (1) C')).toBe(true);
    expect(payItemsMatch('800 (3)A1', '800 (3)a1')).toBe(true);
  });

  it('should not match different items', () => {
    expect(payItemsMatch('900 (1)c', '900 (2)c')).toBe(false);
    expect(payItemsMatch('800 (1)', '801 (1)')).toBe(false);
  });
});

describe('normalizeUnit', () => {
  it('should normalize abbreviated units', () => {
    expect(normalizeUnit('cu.m')).toBe('Cubic Meter');
    expect(normalizeUnit('sq.m')).toBe('Square Meter');
    expect(normalizeUnit('l.m')).toBe('Linear Meter');
    expect(normalizeUnit('kg')).toBe('Kilogram');
    expect(normalizeUnit('l.s.')).toBe('Lump Sum');
  });

  it('should normalize different cases', () => {
    expect(normalizeUnit('CUBIC METER')).toBe('Cubic Meter');
    expect(normalizeUnit('cubic meter')).toBe('Cubic Meter');
    expect(normalizeUnit('Cubic Meter')).toBe('Cubic Meter');
  });

  it('should handle plural forms', () => {
    expect(normalizeUnit('cubic meters')).toBe('Cubic Meter');
    expect(normalizeUnit('kilograms')).toBe('Kilogram');
  });

  it('should preserve unknown units', () => {
    expect(normalizeUnit('Tonne')).toBe('Tonne');
    expect(normalizeUnit('Piece')).toBe('Each');
  });
});

describe('getBaseItemNumber', () => {
  it('should extract base number from pay item', () => {
    expect(getBaseItemNumber('900 (1) c')).toBe('900');
    expect(getBaseItemNumber('800 (3)a1')).toBe('800');
    expect(getBaseItemNumber('1500 (1)')).toBe('1500');
  });

  it('should handle items without prefix', () => {
    expect(getBaseItemNumber('(1)')).toBe('');
    expect(getBaseItemNumber('abc')).toBe('');
  });
});

describe('getTradeFromPayItem', () => {
  it('should identify concrete items', () => {
    expect(getTradeFromPayItem('900 (1) c')).toBe('Concrete');
    expect(getTradeFromPayItem('901 (1)')).toBe('Concrete');
  });

  it('should identify rebar items', () => {
    expect(getTradeFromPayItem('902 (1) a7')).toBe('Rebar');
  });

  it('should identify formwork items', () => {
    expect(getTradeFromPayItem('903 (1)')).toBe('Formwork');
  });

  it('should identify earthwork items', () => {
    expect(getTradeFromPayItem('800 (1)')).toBe('Earthwork');
    expect(getTradeFromPayItem('802 (1)')).toBe('Earthwork');
  });

  it('should identify finishes', () => {
    expect(getTradeFromPayItem('1000 (1)')).toBe('Finishes');
    expect(getTradeFromPayItem('1050 (1)')).toBe('Finishes');
  });

  it('should identify roofing', () => {
    expect(getTradeFromPayItem('1100 (1)')).toBe('Roofing');
  });

  it('should identify marine works', () => {
    expect(getTradeFromPayItem('1500 (1)')).toBe('Marine Works');
  });

  it('should return Other for unknown items', () => {
    expect(getTradeFromPayItem('9999 (1)')).toBe('Other');
  });
});

describe('isValidPayItemFormat', () => {
  it('should validate correct formats', () => {
    expect(isValidPayItemFormat('900 (1)')).toBe(true);
    expect(isValidPayItemFormat('900 (1)c')).toBe(true);
    expect(isValidPayItemFormat('800 (3)a1')).toBe(true);
    expect(isValidPayItemFormat('1500 (1)')).toBe(true);
  });

  it('should reject invalid formats', () => {
    expect(isValidPayItemFormat('900')).toBe(false);
    expect(isValidPayItemFormat('(1)')).toBe(false);
    expect(isValidPayItemFormat('invalid')).toBe(false);
    expect(isValidPayItemFormat('')).toBe(false);
  });

  it('should handle normalized input', () => {
    const normalized = normalizePayItemNumber('900 (1) c');
    expect(isValidPayItemFormat(normalized)).toBe(true);
  });
});

// Integration test: Real-world examples from both systems
describe('Real-world Integration Examples', () => {
  const testCases = [
    {
      buildingEstimate: '900 (1) c',
      costEstimate: '900 (1)c',
      description: 'Class A Concrete',
    },
    {
      buildingEstimate: '800 (3) a1',
      costEstimate: '800 (3)a1',
      description: 'Tree Removal',
    },
    {
      buildingEstimate: '902 (1) a7',
      costEstimate: '902 (1)a7',
      description: 'Rebar 28mm',
    },
  ];

  testCases.forEach(({ buildingEstimate, costEstimate, description }) => {
    it(`should match ${description}: "${buildingEstimate}" with "${costEstimate}"`, () => {
      expect(payItemsMatch(buildingEstimate, costEstimate)).toBe(true);
      
      const normalized1 = normalizePayItemNumber(buildingEstimate);
      const normalized2 = normalizePayItemNumber(costEstimate);
      expect(normalized1).toBe(normalized2);
    });
  });
});

import { describe, expect, it } from 'vitest';
import { getDefaultZoomRange, isZoomRangeActive, resolveZoomRange } from './chartZoom';

describe('chart zoom state', () => {
  it('resets to the full range when the chart key changes', () => {
    const zoomed = { key: 'price:rolling', startIndex: 20, endIndex: 80 };
    expect(resolveZoomRange(zoomed, 'total-return:rolling', 120)).toEqual({
      key: 'total-return:rolling',
      startIndex: 0,
      endIndex: 119,
    });
  });

  it('preserves a range for the same data and detects active zoom', () => {
    const zoomed = { key: 'price:rolling', startIndex: 20, endIndex: 80 };
    expect(resolveZoomRange(zoomed, zoomed.key, 120)).toBe(zoomed);
    expect(isZoomRangeActive(zoomed, 120)).toBe(true);
    expect(isZoomRangeActive(getDefaultZoomRange('key', 120), 120)).toBe(false);
  });
});

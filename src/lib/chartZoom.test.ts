import { describe, expect, it } from 'vitest';
import { getDefaultZoomRange, isDefaultZoomRange, resolveZoomRange } from './chartZoom';

describe('chart zoom state', () => {
  it('resets to the configured recent window when the chart key changes', () => {
    const zoomed = { key: 'price:rolling', startIndex: 20, endIndex: 80 };
    expect(resolveZoomRange(zoomed, 'total-return:rolling', 120, 60)).toEqual({
      key: 'total-return:rolling',
      startIndex: 60,
      endIndex: 119,
    });
  });

  it('preserves a range for the same data and detects the default window', () => {
    const zoomed = { key: 'price:rolling', startIndex: 20, endIndex: 80 };
    expect(resolveZoomRange(zoomed, zoomed.key, 120, 60)).toBe(zoomed);
    expect(isDefaultZoomRange(zoomed, 120, 60)).toBe(false);
    expect(isDefaultZoomRange(getDefaultZoomRange('key', 120, 60), 120, 60)).toBe(true);
  });
});

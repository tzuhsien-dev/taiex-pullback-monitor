export type ChartZoomRange = {
  key: string;
  startIndex: number;
  endIndex: number;
};

export const getDefaultZoomRange = (key: string, dataLength: number): ChartZoomRange => ({
  key,
  startIndex: 0,
  endIndex: Math.max(0, dataLength - 1),
});

export const resolveZoomRange = (
  storedRange: ChartZoomRange,
  key: string,
  dataLength: number,
): ChartZoomRange => (storedRange.key === key ? storedRange : getDefaultZoomRange(key, dataLength));

export const isZoomRangeActive = (range: ChartZoomRange, dataLength: number) =>
  range.startIndex > 0 || range.endIndex < dataLength - 1;

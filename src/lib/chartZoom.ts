export type ChartZoomRange = {
  key: string;
  startIndex: number;
  endIndex: number;
};

export const getDefaultZoomRange = (
  key: string,
  dataLength: number,
  windowSize = dataLength,
): ChartZoomRange => ({
  key,
  startIndex: Math.max(0, dataLength - windowSize),
  endIndex: Math.max(0, dataLength - 1),
});

export const resolveZoomRange = (
  storedRange: ChartZoomRange,
  key: string,
  dataLength: number,
  windowSize = dataLength,
): ChartZoomRange =>
  storedRange.key === key ? storedRange : getDefaultZoomRange(key, dataLength, windowSize);

export const isDefaultZoomRange = (
  range: ChartZoomRange,
  dataLength: number,
  windowSize: number,
) => {
  const defaultRange = getDefaultZoomRange(range.key, dataLength, windowSize);
  return (
    range.startIndex === defaultRange.startIndex &&
    range.endIndex === defaultRange.endIndex
  );
};

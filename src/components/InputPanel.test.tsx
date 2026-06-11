import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InputPanel } from './InputPanel';
import type { PullbackParams } from '../types';

const params: PullbackParams = {
  highLowMode: 'volatilityAdjustedZigZag',
  lookbackDays: 250,
  pullbackThreshold: 0.1,
  pivotThreshold: 0.05,
  volLookback: 20,
  volatilityMultiplier: 3,
  minThreshold: 0.03,
  maxThreshold: 0.1,
};

describe('InputPanel', () => {
  it('shows the derived near threshold and updates the selected threshold', () => {
    const onParamsChange = vi.fn();
    render(
      <InputPanel
        indexType="price"
        params={params}
        source="static"
        onClearCsv={vi.fn()}
        onCsvUpload={vi.fn()}
        onIndexTypeChange={vi.fn()}
        onParamsChange={onParamsChange}
      />,
    );

    expect(screen.getByText('接近提示：7.00%')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('回落門檻 %'), { target: { value: '3' } });
    expect(onParamsChange).toHaveBeenCalledWith({ ...params, pullbackThreshold: 0.03 });
  });

  it('shows CSV clearing only while CSV data is active', () => {
    const { rerender } = render(
      <InputPanel
        indexType="price"
        params={params}
        source="static"
        onClearCsv={vi.fn()}
        onCsvUpload={vi.fn()}
        onIndexTypeChange={vi.fn()}
        onParamsChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: '清除 CSV' })).not.toBeInTheDocument();

    rerender(
      <InputPanel
        indexType="price"
        params={params}
        source="csv"
        onClearCsv={vi.fn()}
        onCsvUpload={vi.fn()}
        onIndexTypeChange={vi.fn()}
        onParamsChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: '清除 CSV' })).toBeInTheDocument();
  });
});

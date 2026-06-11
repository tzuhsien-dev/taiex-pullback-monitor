import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DataActions } from './DataActions';

describe('DataActions', () => {
  it('turns the update control into a cancel action while updating', () => {
    const onCancel = vi.fn();
    render(
      <DataActions
        isUpdating
        historySummary={null}
        latestDate="2026-06-11"
        metadata={null}
        source="csv"
        updateKind="latest"
        updateProgress={{ completed: 2, total: 4, label: '讀取資料' }}
        updateStatus={{ kind: 'idle' }}
        onCancel={onCancel}
        onClear={vi.fn()}
        onDownloadHistory={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );

    const cancelButton = screen.getByRole('button', { name: '取消更新 50%' });
    expect(cancelButton).toBeEnabled();
    fireEvent.click(cancelButton);
    expect(onCancel).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: '下載完整歷史' })).toBeDisabled();
  });
});

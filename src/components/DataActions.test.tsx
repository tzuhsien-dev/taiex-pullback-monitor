import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DataActions } from './DataActions';

describe('DataActions', () => {
  it('turns the update control into a cancel action while updating', () => {
    const onCancel = vi.fn();
    render(
      <DataActions
        isUpdating
        latestDate="2026-06-11"
        metadata={null}
        source="csv"
        updateProgress={{ completed: 2, total: 4, label: '讀取資料' }}
        updateStatus={{ kind: 'idle' }}
        onCancel={onCancel}
        onClear={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );

    const cancelButton = screen.getByRole('button', { name: '取消更新 50%' });
    expect(cancelButton).toBeEnabled();
    fireEvent.click(cancelButton);
    expect(onCancel).toHaveBeenCalledOnce();
  });
});

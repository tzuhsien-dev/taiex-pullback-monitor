import { describe, expect, it } from 'vitest';
import { getModuleScriptPath } from './appVersion';

describe('getModuleScriptPath', () => {
  it('extracts the deployed module path from HTML', () => {
    expect(
      getModuleScriptPath(
        '<script type="module" crossorigin src="/taiex-pullback-monitor/assets/index-new.js"></script>',
        'https://example.com/taiex-pullback-monitor/',
      ),
    ).toBe('/taiex-pullback-monitor/assets/index-new.js');
  });

  it('returns null when the page has no module script', () => {
    expect(getModuleScriptPath('<main>missing</main>', 'https://example.com/')).toBeNull();
  });
});

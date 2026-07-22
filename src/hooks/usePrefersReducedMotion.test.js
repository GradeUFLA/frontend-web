import { act, renderHook } from '@testing-library/react';
import usePrefersReducedMotion from './usePrefersReducedMotion';

test('acompanha a preferência de movimento reduzido do sistema', () => {
  let changeListener;
  const mediaQuery = {
    matches: true,
    addEventListener: vi.fn((event, listener) => {
      if (event === 'change') changeListener = listener;
    }),
    removeEventListener: vi.fn()
  };
  const originalMatchMedia = window.matchMedia;
  window.matchMedia = vi.fn(() => mediaQuery);

  const { result, unmount } = renderHook(() => usePrefersReducedMotion());
  expect(result.current).toBe(true);

  act(() => changeListener({ matches: false }));
  expect(result.current).toBe(false);

  unmount();
  expect(mediaQuery.removeEventListener).toHaveBeenCalledWith('change', changeListener);
  window.matchMedia = originalMatchMedia;
});

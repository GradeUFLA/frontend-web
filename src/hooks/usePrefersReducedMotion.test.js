import { act, renderHook } from '@testing-library/react';
import usePrefersReducedMotion from './usePrefersReducedMotion';

test('acompanha a preferência de movimento reduzido do sistema', () => {
  let changeListener;
  const mediaQuery = {
    matches: true,
    addEventListener: jest.fn((event, listener) => {
      if (event === 'change') changeListener = listener;
    }),
    removeEventListener: jest.fn()
  };
  const originalMatchMedia = window.matchMedia;
  window.matchMedia = jest.fn(() => mediaQuery);

  const { result, unmount } = renderHook(() => usePrefersReducedMotion());
  expect(result.current).toBe(true);

  act(() => changeListener({ matches: false }));
  expect(result.current).toBe(false);

  unmount();
  expect(mediaQuery.removeEventListener).toHaveBeenCalledWith('change', changeListener);
  window.matchMedia = originalMatchMedia;
});

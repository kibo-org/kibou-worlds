import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import WorldCanvas from '../src/WorldCanvas';
import { createWorld } from '../src/simulation';

test.each([false, true])('unavailable or throwing canvas keeps the fallback (%s)', throws => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
    if (throws) throw new Error('Canvas disabled');
    return null;
  });
  render(<WorldCanvas world={createWorld()} selected={0} en />);
  expect(screen.getByRole('status')).toHaveTextContent('simulation and agent list remain available');
});

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import WorldsLab from '../src/WorldsLab';
import { LocaleProvider } from '../src/LocaleProvider';

vi.mock('../src/WorldCanvas', () => ({
  default: ({ world }: { world: { tick: number } }) => <div data-testid="tick">{world.tick}</div>,
}));
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('step, synchronized fork, pause and confirmed reset work offline', () => {
  render(<WorldsLab />);
  fireEvent.click(screen.getByRole('button', { name: 'Step' }));
  expect(screen.getByTestId('tick')).toHaveTextContent('1');
  expect(screen.getByLabelText('Resource ownership')).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Fork rules' }));
  expect(screen.getByLabelText('Branch comparison')).toHaveTextContent('Baseline');
  fireEvent.click(screen.getByRole('button', { name: 'Run world' }));
  act(() => { vi.advanceTimersByTime(1400); });
  expect(screen.getByTestId('tick')).toHaveTextContent('3');
  fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
  act(() => { vi.advanceTimersByTime(1400); });
  expect(screen.getByTestId('tick')).toHaveTextContent('3');
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
  expect(screen.getByTestId('tick')).toHaveTextContent('3');
  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
  expect(screen.getByTestId('tick')).toHaveTextContent('0');
});

test('hidden tabs stop automatic runs and unsaved work warns before unload', () => {
  render(<WorldsLab />);
  fireEvent.click(screen.getByRole('button', { name: 'Run world' }));
  act(() => { vi.advanceTimersByTime(700); });
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  fireEvent(document, new Event('visibilitychange'));
  expect(screen.getByRole('button', { name: 'Run world' })).toBeEnabled();
  const leave = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(leave);
  expect(leave.defaultPrevented).toBe(true);
});

test('failed export retains data and invalid seeds cannot reset', () => {
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => { throw new Error('Download unavailable'); });
  render(<WorldsLab />);
  fireEvent.click(screen.getByRole('button', { name: 'Step' }));
  fireEvent.click(screen.getByRole('button', { name: 'Export' }));
  expect(screen.getByRole('status')).toHaveTextContent('Export failed');
  const leave = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(leave);
  expect(leave.defaultPrevented).toBe(true);
  fireEvent.change(screen.getByLabelText('Next seed'), { target: { value: '-1' } });
  expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
});

test('export includes reproducible branch state without account or browser identifiers', async () => {
  vi.useRealTimers();
  let exported: Blob | undefined;
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL(blob: Blob) { exported = blob; return 'blob:synthetic-experiment'; }
    static revokeObjectURL = vi.fn();
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  try {
    render(<WorldsLab />);
    fireEvent.click(screen.getByRole('button', { name: 'Step' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fork rules' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(screen.getByRole('status')).toHaveTextContent('No unexported changes');
    const text = await new Promise<string>(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(exported!);
    });
    const payload = JSON.parse(text);
    expect(Object.keys(payload).sort()).toEqual(['baseline', 'engine', 'forkAt', 'format', 'limitations', 'version', 'world']);
    expect(payload.world.seed).toBe(42);
    expect(payload.world.rule).toBe('private');
    expect(payload.baseline.rule).toBe('commons');
    expect(payload.forkAt).toBe(1);
    const leave = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(leave);
    expect(leave.defaultPrevented).toBe(false);
  } finally { vi.unstubAllGlobals(); }
});

test('locale provider needs no persistent browser identifiers', () => {
  render(<LocaleProvider><WorldsLab /></LocaleProvider>);
  expect(document.documentElement.lang).toBe('en');
  expect(screen.getByRole('heading', { name: 'KIBOU Worlds' })).toBeVisible();
});

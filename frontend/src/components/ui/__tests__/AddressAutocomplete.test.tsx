import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useState } from 'react';
import { AddressAutocomplete, type AddressAutocompleteProps, type AddressSelectResult } from '../AddressAutocomplete';

// ── Nominatim mock ──────────────────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeJsonResponse(data: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

const SUGGESTIONS = [
  { display_name: 'Cra 15 # 80-20, Bogotá, Colombia', lat: '4.6694', lon: '-74.0563' },
  { display_name: 'Cra 15 # 90-10, Bogotá, Colombia', lat: '4.6710', lon: '-74.0570' },
];

// ── Controlled wrapper ───────────────────────────────────────
// Needed because AddressAutocomplete is controlled — value must be kept in sync
// with onChange for the useEffect to see typing changes.

function ControlledWrapper({
  onSelect,
  countryCode,
}: {
  onSelect: (r: AddressSelectResult) => void;
  countryCode?: string;
}) {
  const [value, setValue] = useState('');
  return (
    <AddressAutocomplete
      value={value}
      onChange={setValue}
      onSelect={onSelect}
      placeholder="Buscar dirección"
      id="test-address"
      debounceMs={0}
      countryCode={countryCode}
    />
  );
}

// ── Helpers ─────────────────────────────────────────────────

function setup(opts: { countryCode?: string } = {}) {
  const onSelect = vi.fn();
  render(<ControlledWrapper onSelect={onSelect} countryCode={opts.countryCode} />);
  const input = screen.getByRole('combobox') as HTMLInputElement;
  return { input, onSelect };
}

async function typeAndWait(input: HTMLInputElement, text: string) {
  await act(async () => {
    fireEvent.change(input, { target: { value: text } });
  });
}

// ── Tests ───────────────────────────────────────────────────

describe('AddressAutocomplete', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  // ── Spec: no fetch with < 3 chars ───────────────────────────
  it('does not fetch when input has fewer than 3 characters', async () => {
    const { input } = setup();
    await typeAndWait(input, 'Ca');
    // Small pause to ensure no pending microtasks fire
    await new Promise((r) => setTimeout(r, 30));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // ── Spec: fetch with User-Agent ─────────────────────────────
  it('sends request to Nominatim with User-Agent header when typing 3+ chars', async () => {
    mockFetch.mockReturnValue(makeJsonResponse([]));
    const { input } = setup();

    await typeAndWait(input, 'Cra');

    await waitFor(() => expect(mockFetch).toHaveBeenCalledOnce());

    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('nominatim.openstreetmap.org');
    expect((opts.headers as Record<string, string>)['User-Agent']).toContain('RideFlow');
  });

  // ── Spec: dropdown shows suggestions ───────────────────────
  it('shows suggestions in dropdown after successful fetch', async () => {
    mockFetch.mockReturnValue(makeJsonResponse(SUGGESTIONS));
    const { input } = setup();

    await typeAndWait(input, 'Cra 15');

    await waitFor(() =>
      expect(screen.getByText('Cra 15 # 80-20, Bogotá, Colombia')).toBeInTheDocument(),
    );
    expect(screen.getByText('Cra 15 # 90-10, Bogotá, Colombia')).toBeInTheDocument();
  });

  // ── Spec: no results message ────────────────────────────────
  it('shows "No se encontraron resultados" when Nominatim returns empty', async () => {
    mockFetch.mockReturnValue(makeJsonResponse([]));
    const { input } = setup();

    await typeAndWait(input, 'xyzxyz');

    await waitFor(() =>
      expect(screen.getByText(/no se encontraron resultados/i)).toBeInTheDocument(),
    );
  });

  // ── Spec: network error does not throw ──────────────────────
  it('hides the dropdown and does not propagate when fetch fails', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({ ok: false, json: () => Promise.reject(new Error('fail')) }),
    );
    const { input } = setup();

    await typeAndWait(input, 'Cra');
    await waitFor(() => expect(mockFetch).toHaveBeenCalledOnce());

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  // ── Spec: onSelect with parsed coords ──────────────────────
  it('calls onSelect with address and parsed lat/lng when suggestion is clicked', async () => {
    mockFetch.mockReturnValue(makeJsonResponse(SUGGESTIONS));
    const { input, onSelect } = setup();

    await typeAndWait(input, 'Cra 15');
    await waitFor(() => screen.getByText('Cra 15 # 80-20, Bogotá, Colombia'));

    fireEvent.mouseDown(screen.getByText('Cra 15 # 80-20, Bogotá, Colombia'));

    expect(onSelect).toHaveBeenCalledWith({
      address: 'Cra 15 # 80-20, Bogotá, Colombia',
      lat: 4.6694,
      lng: -74.0563,
    });
  });

  // ── Spec: dropdown closes after selection ───────────────────
  it('closes the dropdown after a suggestion is selected', async () => {
    mockFetch.mockReturnValue(makeJsonResponse(SUGGESTIONS));
    const { input } = setup();

    await typeAndWait(input, 'Cra 15');
    await waitFor(() => screen.getByText('Cra 15 # 80-20, Bogotá, Colombia'));

    fireEvent.mouseDown(screen.getByText('Cra 15 # 80-20, Bogotá, Colombia'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  // ── Spec: Escape closes dropdown ────────────────────────────
  it('closes the dropdown when Escape is pressed without selecting', async () => {
    mockFetch.mockReturnValue(makeJsonResponse(SUGGESTIONS));
    const { input, onSelect } = setup();

    await typeAndWait(input, 'Cra 15');
    await waitFor(() => screen.getByRole('listbox'));

    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });

  // ── Spec: keyboard navigation ───────────────────────────────
  it('navigates with ArrowDown/Up and selects first item with Enter', async () => {
    mockFetch.mockReturnValue(makeJsonResponse(SUGGESTIONS));
    const { input, onSelect } = setup();

    await typeAndWait(input, 'Cra 15');
    await waitFor(() => screen.getByRole('listbox'));

    fireEvent.keyDown(input, { key: 'ArrowDown' }); // index 0
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // index 1
    fireEvent.keyDown(input, { key: 'ArrowUp' });   // back to 0
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith({
      address: 'Cra 15 # 80-20, Bogotá, Colombia',
      lat: 4.6694,
      lng: -74.0563,
    });
  });

  // ── Spec: countryCode prop ──────────────────────────────────
  it('passes the countryCode prop as countrycodes query param', async () => {
    mockFetch.mockReturnValue(makeJsonResponse([]));
    const { input } = setup({ countryCode: 'ar' });

    await typeAndWait(input, 'Bue');

    await waitFor(() => expect(mockFetch).toHaveBeenCalledOnce());

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('countrycodes=ar');
  });
});

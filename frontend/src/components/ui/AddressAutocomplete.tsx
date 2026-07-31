'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type KeyboardEvent,
} from 'react';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

export interface AddressSelectResult {
  address: string;
  lat: number;
  lng: number;
}

export interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: AddressSelectResult) => void;
  placeholder?: string;
  countryCode?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  error?: boolean;
  /** Debounce delay in ms. Default 400. Set to 0 in tests to bypass timing. */
  debounceMs?: number;
}

// ── Constants ────────────────────────────────────────────────

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const DEBOUNCE_MS = 400;
const MIN_CHARS = 3;
const MAX_RESULTS = 5;

// ── Component ────────────────────────────────────────────────

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  countryCode = 'co',
  id,
  required,
  disabled,
  className,
  error,
  debounceMs = DEBOUNCE_MS,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Fetch suggestions ──────────────────────────────────────

  const fetchSuggestions = useCallback(
    async (query: string) => {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        limit: String(MAX_RESULTS),
        countrycodes: countryCode,
      });

      setIsLoading(true);
      setHasSearched(false);

      try {
        const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
          headers: {
            'User-Agent': 'RideFlow/1.0 (carpooling app)',
            'Accept-Language': 'es',
          },
        });
        if (!res.ok) throw new Error('Nominatim response not ok');
        const data: NominatimResult[] = await res.json();
        setSuggestions(data);
        setIsOpen(true);
        setHasSearched(true);
      } catch {
        // Network error: silently close dropdown, do not propagate
        setSuggestions([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    },
    [countryCode],
  );

  // ── Debounce on value change ───────────────────────────────

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length < MIN_CHARS) {
      setSuggestions([]);
      setIsOpen(false);
      setHasSearched(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, debounceMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, fetchSuggestions]);

  // ── Close on outside click ─────────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Selection ──────────────────────────────────────────────

  const handleSelect = useCallback(
    (suggestion: NominatimResult) => {
      onChange(suggestion.display_name);
      onSelect({
        address: suggestion.display_name,
        lat: parseFloat(suggestion.lat),
        lng: parseFloat(suggestion.lon),
      });
      setSuggestions([]);
      setIsOpen(false);
      setActiveIndex(-1);
    },
    [onChange, onSelect],
  );

  // ── Keyboard navigation ────────────────────────────────────

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
        break;

      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
        break;

      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          handleSelect(suggestions[activeIndex]);
        }
        break;

      case 'Escape':
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  // ── Render ─────────────────────────────────────────────────

  const showDropdown = isOpen && (suggestions.length > 0 || (hasSearched && !isLoading));

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        aria-controls={showDropdown ? `${id}-listbox` : undefined}
        aria-activedescendant={
          activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined
        }
        aria-invalid={error ? true : undefined}
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete="off"
        data-slot="input"
        className={cn(
          'flex h-9 w-full rounded-md border bg-surface px-3 py-1 text-sm shadow-sm transition-all duration-300',
          'placeholder:text-text-muted',
          'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive',
          className,
        )}
      />

      {/* Loading indicator */}
      {isLoading && (
        <div
          aria-live="polite"
          aria-label="Buscando direcciones..."
          className="absolute right-3 top-1/2 -translate-y-1/2"
        >
          <div className="size-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {/* Dropdown */}
      {showDropdown && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-md border border-border bg-surface py-1 shadow-lg"
        >
          {suggestions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-text-muted">
              No se encontraron resultados
            </li>
          ) : (
            suggestions.map((s, i) => (
              <li
                key={`${s.lat}-${s.lon}`}
                id={`${id}-option-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                onMouseDown={(e) => {
                  // Prevent input blur before click registers
                  e.preventDefault();
                  handleSelect(s);
                }}
                className={cn(
                  'cursor-pointer px-3 py-2 text-sm transition-colors',
                  i === activeIndex
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-surface-hover',
                )}
              >
                {s.display_name}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

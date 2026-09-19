import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

export interface SearchableSelectOption {
  id: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  className?: string;
  noResultsText?: string;
  onCreateQuery?: (query: string) => void;
  createLabel?: (query: string) => string;
  disabled?: boolean;
  'aria-label'?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'ابحث...',
  className = '',
  noResultsText = 'لا توجد نتائج مطابقة',
  onCreateQuery,
  createLabel,
  disabled,
  'aria-label': ariaLabel,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find(o => o.id === value);

  // Reset query each time dropdown opens so the user sees the full list again.
  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  // Close when clicking outside the component.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const normalized = query.trim().toLowerCase();
  const filtered = normalized
    ? options.filter(
        o =>
          o.label.toLowerCase().includes(normalized) ||
          (o.sublabel && o.sublabel.toLowerCase().includes(normalized))
      )
    : options;

  const showCreate = !!onCreateQuery && normalized.length > 0 && filtered.length === 0;

  const handleInput = (val: string) => {
    setQuery(val);
    setOpen(true);
    setHighlight(-1);
  };

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  };

  const handleCreate = () => {
    if (!onCreateQuery) return;
    onCreateQuery(query.trim());
    setOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const total = filtered.length + (showCreate ? 1 : 0);
      setHighlight(h => (h + 1) % (total || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const total = filtered.length + (showCreate ? 1 : 0);
      setHighlight(h => (h - 1 + (total || 1)) % (total || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlight >= 0 && highlight < filtered.length) {
        pick(filtered[highlight].id);
      } else if (highlight === filtered.length && showCreate) {
        handleCreate();
      } else if (filtered.length === 1) {
        pick(filtered[0].id);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen(prev => !prev);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-right text-xs font-semibold text-slate-800 disabled:opacity-60"
      >
        <span className="min-w-0 flex-1 truncate">
          {selected ? (
            <span className="block">
              <span className="block truncate">{selected.label}</span>
              {selected.sublabel && (
                <span className="block truncate text-[10px] font-normal text-slate-400">
                  {selected.sublabel}
                </span>
              )}
            </span>
          ) : (
            <span className="font-normal text-slate-400">{placeholder}</span>
          )}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          <div className="relative mb-1 border-b border-slate-100 pb-1">
            <Search className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 rtl:right-2.5 rtl:left-auto" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => handleInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              aria-label={ariaLabel || placeholder}
              className="w-full rounded-lg border border-slate-200 py-2 pl-2.5 pr-8 text-xs outline-hidden focus:border-blue-400"
            />
          </div>

          {showCreate && (
            <button
              type="button"
              onClick={handleCreate}
              onMouseEnter={() => setHighlight(filtered.length)}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-right text-xs font-bold text-blue-700 hover:bg-blue-50 ${highlight === filtered.length ? 'bg-blue-50' : ''}`}
            >
              <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px]">+</span>
              <span className="min-w-0 truncate">
                {createLabel ? createLabel(normalized) : `إنشاء جديد: "${query.trim()}"`}
              </span>
            </button>
          )}

          {!showCreate && filtered.length === 0 && (
            <div className="px-2.5 py-3 text-center text-xs text-slate-400">{noResultsText}</div>
          )}

          {filtered.map((option, idx) => {
            const active = idx === highlight && !showCreate;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => pick(option.id)}
                onMouseEnter={() => setHighlight(idx)}
                aria-selected={option.id === value}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-right hover:bg-slate-50 ${active ? 'bg-slate-50' : ''}`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-slate-800">{option.label}</span>
                  {option.sublabel && (
                    <span className="block truncate text-[10px] text-slate-400">{option.sublabel}</span>
                  )}
                </span>
                {option.id === value && <Check className="h-3.5 w-3.5 shrink-0 text-blue-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
import { useEffect, useRef, useState } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}

export function Combobox({ value, onChange, options, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [hi, setHi] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const filtered =
    query && !options.includes(query)
      ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
      : options;
  const showCustom = query.trim() !== '' && !options.includes(query);
  const total = filtered.length + (showCustom ? 1 : 0);

  const commit = (v: string) => {
    setQuery(v);
    onChange(v);
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHi((h) => Math.min(h + 1, total - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHi((h) => Math.max(0, h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      if (hi < filtered.length) commit(filtered[hi]);
      else if (showCustom) commit(query);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="combo" ref={rootRef}>
      <div className="combo-input">
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setOpen(true);
            setHi(0);
          }}
          onKeyDown={onKey}
        />
        <button
          type="button"
          className="combo-caret"
          aria-label="展开"
          tabIndex={-1}
          onMouseDown={(e) => {
            e.preventDefault();
            setOpen((o) => !o);
            inputRef.current?.focus();
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="combo-panel" role="listbox">
          {filtered.map((o, i) => (
            <div
              key={o}
              role="option"
              aria-selected={o === value}
              className={`combo-option ${o === value ? 'selected' : ''} ${i === hi ? 'active' : ''}`}
              onMouseEnter={() => setHi(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                commit(o);
              }}
            >
              <span>{o}</span>
              {o === value && <span className="combo-check">✓</span>}
            </div>
          ))}

          {showCustom && (
            <div
              role="option"
              className={`combo-option custom ${hi === filtered.length ? 'active' : ''}`}
              onMouseEnter={() => setHi(filtered.length)}
              onMouseDown={(e) => {
                e.preventDefault();
                commit(query);
              }}
            >
              使用自定义：<b>{query}</b>
            </div>
          )}

          {filtered.length === 0 && !showCustom && <div className="combo-empty">无匹配</div>}
        </div>
      )}
    </div>
  );
}

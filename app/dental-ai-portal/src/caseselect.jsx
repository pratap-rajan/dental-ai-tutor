import { useState, useRef, useEffect, useMemo } from "react";
import { theme, fonts } from "./theme.js";

/**
 * Searchable case picker — replaces a plain native <select> once the case
 * catalog grows large enough that scrolling through it (especially on
 * mobile) becomes genuinely painful. Filters by label as the student
 * types, keyboard-navigable, and closes on selection or outside click.
 */
export default function CaseSelect({ options, value, onChange, disabled, placeholder = "Select a case" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selected = options.find((o) => o.id === value) || null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    setHighlighted(0);
  }, [query, open]);

  function openDropdown() {
    if (disabled) return;
    setOpen(true);
    setQuery("");
    // focus the search input once it's rendered
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function selectOption(opt) {
    onChange(opt.id);
    setOpen(false);
    setQuery("");
  }

  function handleKeyDown(e) {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        openDropdown();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlighted]) selectOption(filtered[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div ref={containerRef} style={styles.container} onKeyDown={handleKeyDown}>
      {!open ? (
        <button
          type="button"
          style={{
            ...styles.trigger,
            color: selected ? theme.white : theme.slateLight,
            opacity: disabled ? 0.6 : 1,
            cursor: disabled ? "not-allowed" : "pointer"
          }}
          onClick={openDropdown}
          disabled={disabled}
        >
          <span style={styles.triggerText}>{selected ? selected.label : placeholder}</span>
          <ChevronIcon />
        </button>
      ) : (
        <div style={styles.searchBox}>
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cases…"
            style={styles.searchInput}
          />
        </div>
      )}

      {open && (
        <div style={styles.dropdown}>
          {filtered.length === 0 ? (
            <div style={styles.noResults}>No cases match "{query}"</div>
          ) : (
            filtered.map((opt, i) => (
              <div
                key={opt.id}
                style={{
                  ...styles.option,
                  background: i === highlighted ? "rgba(114,212,196,0.10)" : "transparent",
                  color: i === highlighted ? theme.ctaMint : theme.white
                }}
                onMouseEnter={() => setHighlighted(i)}
                onMouseDown={(e) => {
                  // onMouseDown, not onClick — fires before the input's
                  // blur/outside-click handler would otherwise close the
                  // dropdown first and swallow the selection
                  e.preventDefault();
                  selectOption(opt);
                }}
              >
                {opt.label}
                {opt.id === value && <CheckIcon />}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.slateLight} strokeWidth="2">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.slateLight} strokeWidth="2" style={{ flexShrink: 0 }}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={theme.ctaMint} strokeWidth="2.5">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const styles = {
  container: {
    position: "relative",
    width: "100%"
  },
  trigger: {
    width: "100%",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    padding: "11px 12px",
    borderRadius: 8,
    border: `1px solid ${theme.navyLighter}`,
    background: "rgba(255,255,255,0.03)",
    fontSize: 15,
    fontFamily: fonts.body,
    textAlign: "left"
  },
  triggerText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  searchBox: {
    width: "100%",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "11px 12px",
    borderRadius: 8,
    border: `1.5px solid ${theme.ctaMint}`,
    background: "rgba(114,212,196,0.06)"
  },
  searchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    color: theme.white,
    fontSize: 15,
    fontFamily: fonts.body
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: 0,
    right: 0,
    maxHeight: 260,
    overflowY: "auto",
    background: theme.cardBg,
    border: `1px solid ${theme.navyLighter}`,
    borderRadius: 10,
    boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
    zIndex: 30,
    padding: 6
  },
  option: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    padding: "10px 10px",
    borderRadius: 6,
    fontSize: 14.5,
    fontFamily: fonts.body,
    cursor: "pointer"
  },
  noResults: {
    padding: "14px 10px",
    fontSize: 13.5,
    color: theme.slateLight,
    fontFamily: fonts.body,
    textAlign: "center"
  }
};
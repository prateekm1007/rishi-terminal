"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Category = "stock" | "crypto" | "commodity" | "forex" | "bond";

interface SearchResult {
  symbol: string;
  name: string;
  category: Category;
  url: string;
  sector?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  stock: "#22C55E",
  crypto: "#F59E0B",
  commodity: "#D4AF37",
  forex: "#60A5FA",
  bond: "#A78BFA",
};

const CATEGORY_LABELS: Record<string, string> = {
  stock: "NSE",
  crypto: "CRYPTO",
  commodity: "MCX",
  forex: "FX",
  bond: "BOND",
};

export function GlobalSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);

  const navigate = useCallback((r: SearchResult) => {
    router.push(r.url);
    setQuery("");
    setResults([]);
    setFocused(false);
    setSelected(-1);
    inputRef.current?.blur();
  }, [router]);

  // Fetch results (debounced)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (!query.trim()) {
      setResults([]);
      setSelected(-1);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const q = query.trim();
      abortRef.current = new AbortController();

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`, {
          signal: abortRef.current.signal,
          headers: { "Accept": "application/json" },
        });
        if (!res.ok) return;

        const data = await res.json();
        setResults(Array.isArray(data?.results) ? data.results : []);
        setSelected(-1);
      } catch {
        // ignore aborts
      }
    }, 120);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Click outside closes dropdown
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (dropdownRef.current && dropdownRef.current.contains(t)) return;
      if (inputRef.current && inputRef.current.contains(t)) return;
      setResults([]);
      setFocused(false);
      setSelected(-1);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Keyboard shortcut "/" focuses
  useEffect(() => {
    function onSlash(e: KeyboardEvent) {
      if (e.key === "/" && (document.activeElement as any)?.tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onSlash);
    return () => document.removeEventListener("keydown", onSlash);
  }, []);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected(s => Math.min(s + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected(s => Math.max(s - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selected >= 0 && results[selected]) return navigate(results[selected]);
      if (results[0]) return navigate(results[0]);
    } else if (e.key === "Escape") {
      setQuery("");
      setResults([]);
      setFocused(false);
      setSelected(-1);
      inputRef.current?.blur();
    }
  };

  const showDropdown = focused && results.length > 0;

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 560 }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        background: "#0B1020",
        border: `1px solid ${focused ? "rgba(212,175,55,0.55)" : "rgba(255,255,255,0.10)"}`,
        borderRadius: 12,
        padding: "0 14px",
        gap: 10,
        transition: "border-color 0.2s",
        boxShadow: focused ? "0 0 0 2px rgba(212,175,55,0.08)" : "none",
      }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke={focused ? "#D4AF37" : "#64748B"} strokeWidth="2"
          style={{ flexShrink: 0, transition: "stroke 0.2s" }}>
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>

        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKey}
          placeholder="Search stocks, crypto, commodities, forex..."
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#F8FAFC",
            fontSize: 13,
            fontFamily: "monospace",
            padding: "10px 0",
            letterSpacing: 0.3,
          }}
          autoComplete="off"
          spellCheck={false}
        />

        {!focused && (
          <span style={{
            fontSize: 10,
            color: "#374151",
            fontFamily: "monospace",
            background: "#111827",
            padding: "2px 6px",
            borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0,
          }}>
            /
          </span>
        )}

        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }}
            style={{
              background: "none",
              border: "none",
              color: "#94A3B8",
              cursor: "pointer",
              padding: 0,
              fontSize: 16,
              lineHeight: 1,
              flexShrink: 0,
            }}
            aria-label="Clear search"
          >
            x
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          ref={dropdownRef}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "#070B14",
            border: "1px solid rgba(212,175,55,0.18)",
            borderRadius: 12,
            overflow: "hidden",
            zIndex: 9999,
            boxShadow: "0 16px 48px rgba(0,0,0,0.85)",
          }}
        >
          {results.map((r, i) => (
            <div
              key={r.category + ":" + r.symbol}
              onMouseDown={() => navigate(r)}
              onMouseEnter={() => setSelected(i)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 16px",
                cursor: "pointer",
                background: i === selected ? "rgba(212,175,55,0.08)" : "transparent",
                borderBottom: i < results.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}
            >
              <span style={{
                fontSize: 9,
                fontFamily: "monospace",
                fontWeight: 700,
                color: CATEGORY_COLORS[r.category],
                background: CATEGORY_COLORS[r.category] + "18",
                padding: "2px 6px",
                borderRadius: 6,
                border: `1px solid ${CATEGORY_COLORS[r.category]}30`,
                minWidth: 44,
                textAlign: "center",
                flexShrink: 0,
              }}>
                {CATEGORY_LABELS[r.category]}
              </span>

              <span style={{
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "monospace",
                color: "#F8FAFC",
                minWidth: 80,
                flexShrink: 0,
              }}>
                {r.symbol}
              </span>

              <span style={{
                fontSize: 12,
                color: "#94A3B8",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {r.name}
              </span>

              {r.sector && (
                <span style={{
                  fontSize: 10,
                  color: "#475569",
                  marginLeft: "auto",
                  flexShrink: 0,
                  fontFamily: "monospace",
                }}>
                  {r.sector}
                </span>
              )}
            </div>
          ))}

          <div style={{
            padding: "6px 16px",
            fontSize: 10,
            color: "#475569",
            fontFamily: "monospace",
            background: "#050812",
            borderTop: "1px solid rgba(255,255,255,0.04)",
          }}>
            Enter to open - Arrows to select - Esc to close
          </div>
        </div>
      )}
    </div>
  );
}
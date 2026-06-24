"use client";

/**
 * SearchBar component for the AURA E-Commerce Demo.
 *
 * Provides a debounced search input (300ms after final keystroke),
 * enforces max 200 character limit, emits `search.submitted` events,
 * and handles error/loading states gracefully.
 *
 * Features:
 * - Search icon (lucide-react)
 * - Clear button to reset query
 * - Loading indicator
 * - Error message display
 * - Retains query text on error
 *
 * @see Requirements 1.1, 1.2, 1.5, 1.7
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { emitSearchSubmitted } from "@/lib/events/emitter";
import type { EmitterConfig } from "@/lib/events/emitter";
import { MAX_QUERY_LENGTH } from "@/lib/search";

/** Default debounce delay in milliseconds */
const DEBOUNCE_MS = 300;

export interface SearchBarProps {
  /** Callback invoked with the debounced search query */
  onSearch: (query: string) => void;
  /** Optional callback invoked on form submit (Enter key) */
  onSubmit?: (query: string) => void;
  /** Whether search is currently in progress */
  isLoading?: boolean;
  /** Error message to display when search is unavailable */
  error?: string;
  /** Message to display when no results are found (includes the echoed query) */
  noResultsQuery?: string;
  /** Optional emitter config for event emission; if not provided, events are not emitted */
  emitterConfig?: EmitterConfig;
  /** Optional placeholder text */
  placeholder?: string;
  /** Optional className for the wrapper */
  className?: string;
}

/**
 * SearchBar with debounced input, search icon, clear button,
 * loading indicator, event emission, and error handling.
 */
export function SearchBar({
  onSearch,
  onSubmit,
  isLoading = false,
  error,
  noResultsQuery,
  emitterConfig,
  placeholder = "Search products...",
  className,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const executeSearch = useCallback(
    (searchQuery: string) => {
      // Emit search.submitted event if emitter config is provided
      if (emitterConfig) {
        emitSearchSubmitted(emitterConfig, searchQuery);
      }

      // Invoke the search callback
      onSearch(searchQuery);
    },
    [onSearch, emitterConfig]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Enforce max 200 character limit
      const value = e.target.value.slice(0, MAX_QUERY_LENGTH);
      setQuery(value);

      // Clear any existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounce timer (300ms after final keystroke)
      debounceTimerRef.current = setTimeout(() => {
        executeSearch(value);
      }, DEBOUNCE_MS);
    },
    [executeSearch]
  );

  const handleClear = useCallback(() => {
    setQuery("");

    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Trigger search with empty string immediately
    executeSearch("");

    // Refocus the input after clearing
    inputRef.current?.focus();
  }, [executeSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();

        // Cancel pending debounce and execute immediately
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        executeSearch(query);
        onSubmit?.(query);
      }
    },
    [executeSearch, onSubmit, query]
  );

  return (
    <div className={cn("w-full", className)}>
      <div className="relative">
        {/* Search icon */}
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none"
          aria-hidden="true"
        />

        <Input
          ref={inputRef}
          type="search"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={MAX_QUERY_LENGTH}
          aria-label="Search products"
          aria-describedby={error ? "search-error" : undefined}
          aria-invalid={error ? true : undefined}
          className={cn(
            "w-full pl-10 pr-10",
            error && "border-destructive focus-visible:ring-destructive"
          )}
        />

        {/* Right side: loading indicator or clear button */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
          {isLoading ? (
            <Loader2
              className="h-4 w-4 animate-spin text-muted-foreground"
              aria-label="Searching..."
            />
          ) : (
            query.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )
          )}
        </div>
      </div>

      {/* Error message when search is unavailable */}
      {error && (
        <p
          id="search-error"
          className="mt-2 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}

      {/* No results message with echoed search term */}
      {noResultsQuery && !error && (
        <p className="mt-2 text-sm text-muted-foreground" role="status">
          No results found for &ldquo;{noResultsQuery}&rdquo;
        </p>
      )}
    </div>
  );
}

export default SearchBar;

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SearchBar } from "@/components/search-bar";
import type { EmitterConfig } from "@/lib/events/emitter";
import { MAX_QUERY_LENGTH } from "@/lib/search";

describe("SearchBar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders a search input", () => {
    render(<SearchBar onSearch={vi.fn()} />);
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("renders with custom placeholder", () => {
    render(<SearchBar onSearch={vi.fn()} placeholder="Find items..." />);
    expect(screen.getByPlaceholderText("Find items...")).toBeInTheDocument();
  });

  it("enforces maxLength of 200 characters", () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    const input = screen.getByRole("searchbox");

    const longValue = "a".repeat(250);
    fireEvent.change(input, { target: { value: longValue } });

    expect((input as HTMLInputElement).value.length).toBeLessThanOrEqual(
      MAX_QUERY_LENGTH
    );
  });

  it("debounces search by 300ms after final keystroke", () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "lap" } });

    // Not called immediately
    expect(onSearch).not.toHaveBeenCalled();

    // Still not called at 200ms
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(onSearch).not.toHaveBeenCalled();

    // Called after 300ms
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(onSearch).toHaveBeenCalledWith("lap");
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it("resets debounce timer on subsequent keystrokes", () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "la" } });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Type more before the 300ms elapses
    fireEvent.change(input, { target: { value: "laptop" } });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // First search should not have fired
    expect(onSearch).not.toHaveBeenCalled();

    // After another 100ms (300ms total from last keystroke)
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(onSearch).toHaveBeenCalledWith("laptop");
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it("emits search.submitted event when emitterConfig provided", () => {
    const onSearch = vi.fn();
    const onEmit = vi.fn();
    const emitterConfig: EmitterConfig = {
      getSessionId: () => "test-session-123",
      onEmit,
    };

    render(<SearchBar onSearch={onSearch} emitterConfig={emitterConfig} />);
    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "headphones" } });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onEmit).toHaveBeenCalledWith(
      "search.submitted",
      expect.objectContaining({
        query: "headphones",
        sessionId: "test-session-123",
      })
    );
  });

  it("retains query text on error", () => {
    const onSearch = vi.fn();
    const { rerender } = render(<SearchBar onSearch={onSearch} />);
    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "laptop" } });

    // Now rerender with an error
    rerender(
      <SearchBar
        onSearch={onSearch}
        error="Search is temporarily unavailable"
      />
    );

    // Query text should be retained
    expect((input as HTMLInputElement).value).toBe("laptop");
  });

  it("displays error message when search is unavailable", () => {
    render(
      <SearchBar
        onSearch={vi.fn()}
        error="Search is temporarily unavailable"
      />
    );
    expect(
      screen.getByText("Search is temporarily unavailable")
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("displays no-results message with echoed query", () => {
    render(
      <SearchBar onSearch={vi.fn()} noResultsQuery="quantum widgets" />
    );
    expect(
      screen.getByText(/No results found for/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/quantum widgets/)).toBeInTheDocument();
  });

  it("does not show no-results message when error is present", () => {
    render(
      <SearchBar
        onSearch={vi.fn()}
        error="Search unavailable"
        noResultsQuery="laptop"
      />
    );
    // Error takes priority
    expect(screen.getByText("Search unavailable")).toBeInTheDocument();
    expect(screen.queryByText(/No results found/)).not.toBeInTheDocument();
  });

  it("has correct aria attributes for accessibility", () => {
    render(
      <SearchBar
        onSearch={vi.fn()}
        error="Something went wrong"
      />
    );
    const input = screen.getByRole("searchbox");
    expect(input).toHaveAttribute("aria-label", "Search products");
    expect(input).toHaveAttribute("aria-describedby", "search-error");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("renders a search icon", () => {
    render(<SearchBar onSearch={vi.fn()} />);
    // The Search icon from lucide-react renders an SVG
    const searchIcon = document.querySelector("svg.lucide-search");
    expect(searchIcon).toBeInTheDocument();
  });

  it("shows clear button when query has text", () => {
    render(<SearchBar onSearch={vi.fn()} />);
    const input = screen.getByRole("searchbox");

    // Initially no clear button
    expect(screen.queryByLabelText("Clear search")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "laptop" } });

    // Clear button should appear
    expect(screen.getByLabelText("Clear search")).toBeInTheDocument();
  });

  it("clears query and triggers search on clear button click", () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "laptop" } });

    // Click clear button
    const clearButton = screen.getByLabelText("Clear search");
    fireEvent.click(clearButton);

    // Query should be empty
    expect((input as HTMLInputElement).value).toBe("");

    // onSearch should be called with empty string immediately (no debounce)
    expect(onSearch).toHaveBeenCalledWith("");
  });

  it("shows loading indicator when isLoading is true", () => {
    render(<SearchBar onSearch={vi.fn()} isLoading={true} />);
    expect(screen.getByLabelText("Searching...")).toBeInTheDocument();
  });

  it("hides clear button when isLoading is true (shows spinner instead)", () => {
    render(<SearchBar onSearch={vi.fn()} isLoading={true} />);
    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "laptop" } });

    // Loading spinner takes precedence over clear button
    expect(screen.getByLabelText("Searching...")).toBeInTheDocument();
    expect(screen.queryByLabelText("Clear search")).not.toBeInTheDocument();
  });

  it("calls onSubmit and executes search immediately on Enter key", () => {
    const onSearch = vi.fn();
    const onSubmit = vi.fn();
    render(<SearchBar onSearch={onSearch} onSubmit={onSubmit} />);
    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "monitor" } });
    fireEvent.keyDown(input, { key: "Enter" });

    // Should call both immediately without waiting for debounce
    expect(onSearch).toHaveBeenCalledWith("monitor");
    expect(onSubmit).toHaveBeenCalledWith("monitor");
  });
});

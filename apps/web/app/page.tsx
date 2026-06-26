"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Moon,
  Sun,
  Code2,
  Zap,
  ShoppingCart,
  Laptop,
  Headphones,
  Smartphone,
  Watch,
  Tablet,
  Monitor,
  Tag,
} from "lucide-react";
import type { UIPrescription, Adaptation } from "@aura/protocol";
import { useAuraEmit } from "@aura/react";
import { ConsentControls } from "@/components/consent-controls";
import { DemoControls } from "@/components/demo-controls";
import {
  DevtoolsOverlay,
  type DevtoolsEvent,
  type DevtoolsPrescription,
} from "@/components/devtools-overlay";
import { ExplanationPanel } from "@/components/explanation-panel";
import { FilterPanel } from "@/components/filter-panel";
import { ProductGrid, type LayoutDensity } from "@/components/product-grid";
import { RiskOverlay } from "@/components/risk-overlay";
import { SearchBar } from "@/components/search-bar";
import { useDemoMode } from "@/hooks/use-demo-mode";
import { useProductSearch } from "@/hooks/use-product-search";
import { getFlags } from "@/lib/config/flags";
import { simulationEngine, type ScenarioId } from "@/lib/demo/scenarios";
import { applyFilters, clearAll } from "@/lib/filters/engine";
import type { UIState } from "@/lib/prescriptions/engine";
import { createDefaultUIState } from "@/lib/prescriptions/engine";
import type { ConsentState, Explanation } from "@/lib/types/explanation";
import type { FilterState, Product, ProductCategory, SortOption } from "@/lib/types/product";
import { cn } from "@/lib/utils";
import { manifest } from "@/manifest/aura.manifest";
import productsJson from "@/data/products.json";

type DemoPrescription = DevtoolsPrescription & {
  explanation?: string;
};

const DEFAULT_CONTEXT = {
  deviceType: "desktop",
  viewportWidth: 1440,
  viewportHeight: 900,
};

const SORT_LABELS: Record<SortOption, string> = {
  relevance: "Relevance",
  "price-low-to-high": "Price low-high",
  "price-high-to-low": "Price high-low",
  rating: "Rating",
};

const productCatalog = productsJson as unknown as Product[];

function createExplanation(prescription?: UIPrescription): Explanation | null {
  if (!prescription?.explanation) return null;
  const text =
    prescription.explanation.summary?.slice(0, 200) ??
    "A demo adaptation was applied to this interface.";
  return {
    text,
    sentences: [text],
    confidence: Math.round(prescription.explanation.confidence * 100),
    factors: [
      {
        category:
          prescription.id === "sim-accessibility-preference"
            ? "accessibility needs"
            : prescription.id === "sim-mobile-context"
              ? "device context"
              : "search intent",
        description: prescription.id,
      },
    ],
  };
}

function applyPrescriptionToState(
  previous: UIState,
  prescription: UIPrescription
): UIState {
  const next: UIState = structuredClone(previous);

  for (const adaptation of prescription.adaptations) {
    switch (adaptation.type) {
      case "rank": {
        const ordered = new Set(adaptation.orderedIds);
        const rest = next.searchResults.productOrder.filter((id) => !ordered.has(id));
        const existingOrdered = adaptation.orderedIds.filter((id) =>
          next.searchResults.productOrder.includes(id)
        );
        next.searchResults.productOrder = [...existingOrdered, ...rest];
        break;
      }
      case "componentVariant":
        next.searchResults.variant = adaptation.variant;
        break;
      case "content":
        break;
      case "filter":
        next.filterPanel.highlightedFilterIds = adaptation.visibleFilters
          .filter((id) => id !== "collapsed")
          .slice(0, 3);
        if (adaptation.visibleFilters.includes("collapsed")) {
          next.filterPanel.collapsed = true;
        }
        break;
      case "layout":
        next.searchResults.layoutDensity =
          adaptation.layout === "compact" || adaptation.layout === "expanded"
            ? adaptation.layout
            : "standard";
        break;
      case "accessibility":
        if (adaptation.setting === "fontScale" && typeof adaptation.value === "number") {
          next.accessibility.fontScale = adaptation.value;
        }
        if (adaptation.setting === "contrast") {
          next.accessibility.contrast =
            adaptation.value === "high" || adaptation.value === true ? "high" : "normal";
        }
        if (adaptation.setting === "motion") {
          next.accessibility.motionReduced =
            adaptation.value === "reduced" || adaptation.value === true;
        }
        break;
    }
  }

  return next;
}

function getBadgeFromPrescription(prescription?: UIPrescription): string | undefined {
  const content = prescription?.adaptations.find(
    (adaptation): adaptation is Extract<Adaptation, { type: "content" }> =>
      adaptation.type === "content" && adaptation.contentKey === "badgeLabel"
  );
  return content?.content;
}

export default function Home() {
  const flags = getFlags();
  const emit = useAuraEmit();
  const search = useProductSearch();
  const demo = useDemoMode();
  const [filters, setFilters] = useState<FilterState>(() => clearAll());
  const [uiState, setUiState] = useState<UIState>(() => ({
    ...createDefaultUIState(),
    searchResults: {
      ...createDefaultUIState().searchResults,
      productOrder: productCatalog.map((product) => product.id),
    },
  }));
  const [activePrescription, setActivePrescription] = useState<UIPrescription | undefined>();
  const [events, setEvents] = useState<DevtoolsEvent[]>([]);
  const [prescriptions, setPrescriptions] = useState<DemoPrescription[]>([]);
  const [consentState, setConsentState] = useState<ConsentState>({
    behavior: true,
    personalization: true,
  });
  const [contextModel, setContextModel] = useState(DEFAULT_CONTEXT);
  const [devtoolsOpen, setDevtoolsOpen] = useState(flags.SHOW_DEVTOOLS);
  const [darkMode, setDarkMode] = useState(false);
  const [riskVisible, setRiskVisible] = useState(false);

  const availableBrands = useMemo(() => {
    return Array.from(new Set(productCatalog.map((product) => product.brand))).sort();
  }, []);

  const filteredProducts = useMemo(() => {
    const filtered = applyFilters(search.results, filters);
    const order = new Map(
      uiState.searchResults.productOrder.map((productId, index) => [productId, index])
    );
    return [...filtered].sort(
      (a, b) =>
        (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(b.id) ?? Number.MAX_SAFE_INTEGER)
    );
  }, [filters, search.results, uiState.searchResults.productOrder]);

  const explanation = useMemo(
    () => createExplanation(activePrescription),
    [activePrescription]
  );

  const recordEvent = useCallback((event: DevtoolsEvent) => {
    setEvents((prev) => [event, ...prev].slice(0, 500));
  }, []);

  const resetAdaptations = useCallback(() => {
    setUiState({
      ...createDefaultUIState(),
      searchResults: {
        ...createDefaultUIState().searchResults,
        productOrder: productCatalog.map((product) => product.id),
      },
    });
    setActivePrescription(undefined);
    setRiskVisible(false);
  }, []);

  const applyScenario = useCallback(
    (scenarioId: string) => {
      const prescription = simulationEngine.getScenarioPrescription(
        scenarioId as ScenarioId
      );
      setUiState((prev) => applyPrescriptionToState(prev, prescription));
      setActivePrescription(prescription);
      setRiskVisible(
        prescription.adaptations.some(
          (adaptation) =>
            adaptation.type === "filter" && adaptation.visibleFilters.length > 0
        )
      );
      setPrescriptions((prev) => [
        {
          id: prescription.id,
          status: "accepted",
          surfaceId: prescription.surfaceId,
          adaptations: prescription.adaptations,
          decisionTier: "rules",
          explanation: prescription.explanation?.summary,
          receivedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      recordEvent({
        type: "interaction.clicked",
        timestamp: new Date().toISOString(),
        payload: { elementType: "scenario", elementId: scenarioId },
      });
      demo.triggerScenario(scenarioId);
    },
    [demo, recordEvent]
  );

  const handleFilterChange = useCallback((nextFilters: FilterState) => {
    setFilters(nextFilters);
  }, []);

  const handleFilterClick = useCallback(
    (_elementType: "filter", elementId: string) => {
      const event = {
        type: "interaction.clicked",
        surfaceId: "filter.panel",
        timestamp: new Date().toISOString(),
        payload: { elementType: "filter", elementId },
      };
      recordEvent({
        type: event.type,
        timestamp: event.timestamp,
        payload: event.payload,
      });
      void emit(event);
    },
    [emit, recordEvent]
  );

  const handleContextChange = useCallback(
    (context: string) => {
      const nextContext =
        context === "mobile"
          ? { deviceType: "mobile", viewportWidth: 390, viewportHeight: 844 }
          : context === "tablet"
            ? { deviceType: "tablet", viewportWidth: 820, viewportHeight: 1180 }
            : context === "accessibility"
              ? {
                  deviceType: "desktop",
                  viewportWidth: 1440,
                  viewportHeight: 900,
                  accessibility: "large-text",
                }
              : DEFAULT_CONTEXT;
      setContextModel(nextContext);
      recordEvent({
        type: "context.changed",
        timestamp: new Date().toISOString(),
        payload: { property: "device.type", value: context },
      });
      if (context === "mobile") {
        applyScenario("mobile-context");
      }
      if (context === "accessibility") {
        applyScenario("accessibility-preference");
      }
    },
    [applyScenario, recordEvent]
  );

  const handleReset = useCallback(() => {
    resetAdaptations();
    setFilters(clearAll());
    setPrescriptions([]);
    setEvents([]);
    demo.resetProfile();
  }, [demo, resetAdaptations]);

  const handleThemeToggle = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  }, []);

  const cardVariant = uiState.searchResults.variant;
  const badgeLabel = getBadgeFromPrescription(activePrescription);
  const density = uiState.searchResults.layoutDensity as LayoutDensity;
  const fontScale = uiState.accessibility.fontScale;

  return (
    <main
      className={cn(
        "min-h-screen bg-background text-foreground",
        uiState.accessibility.contrast === "high" && "contrast-125",
        uiState.accessibility.motionReduced && "[&_*]:transition-none"
      )}
      style={{ fontSize: `${fontScale}rem` }}
    >
      <header className="sticky top-0 z-30 border-b border-border bg-card shadow-sm">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3">
          {/* Logo */}
          <div className="flex shrink-0 items-center gap-2">
            <Zap className="h-5 w-5 text-brand" aria-hidden="true" />
            <h1 className="text-lg font-bold tracking-tight">
              <span className="text-brand">AURA</span>
              <span className="font-light text-foreground"> Commerce</span>
            </h1>
          </div>

          {/* Category nav */}
          <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Product categories">
            {(
              [
                { label: "Laptops", icon: Laptop, category: "Laptops" },
                { label: "Headphones", icon: Headphones, category: "Headphones" },
                { label: "Smartphones", icon: Smartphone, category: "Smartphones" },
                { label: "Wearables", icon: Watch, category: "Wearables" },
                { label: "Tablets", icon: Tablet, category: "Tablets" },
                { label: "Monitors", icon: Monitor, category: "Monitors" },
                { label: "Accessories", icon: Tag, category: "Accessories" },
              ] as const
            ).map(({ label, icon: Icon, category }) => (
              <button
                key={category}
                type="button"
                onClick={() => {
                  const isActive = filters.categories.includes(category as ProductCategory);
                  handleFilterChange({
                    ...filters,
                    categories: isActive
                      ? filters.categories.filter((c) => c !== category)
                      : [category as ProductCategory],
                  });
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  filters.categories.includes(category as ProductCategory)
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </button>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Cart (cosmetic) */}
            <div className="relative">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Shopping cart"
              >
                <ShoppingCart className="h-4 w-4" />
              </button>
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                2
              </span>
            </div>

            {/* Theme toggle */}
            <button
              onClick={handleThemeToggle}
              aria-label="Toggle theme"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Devtools toggle */}
            <button
              onClick={() => setDevtoolsOpen((open) => !open)}
              className="flex h-9 items-center gap-2 rounded-lg border border-border bg-panel px-3 text-sm font-medium text-panel-foreground transition-colors hover:bg-panel-border"
              aria-label="Open devtools"
            >
              <Code2 className="h-4 w-4 text-panel-accent" />
              <span className="hidden sm:inline font-mono text-xs tracking-wide">DEVTOOLS</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-4 px-4 py-4 xl:grid-cols-[280px_minmax(780px,1fr)] 2xl:grid-cols-[280px_minmax(860px,1fr)_320px]">
        {/* Console panel — always dark */}
        <div className="rounded-xl bg-panel p-4 space-y-0 self-start sticky top-20">
          <DemoControls
            currentMode={demo.mode}
            onModeChange={demo.setMode}
            onTriggerScenario={applyScenario}
            onResetProfile={handleReset}
            onContextChange={handleContextChange}
          />
          <ConsentControls
            onChange={setConsentState}
            onPersonalizationRevoked={resetAdaptations}
          />
        </div>

        <section className="min-w-0 space-y-3">
          {/* Search + sort bar */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <SearchBar
                onSearch={search.setQuery}
                isLoading={search.isLoading}
                error={search.error ?? undefined}
                noResultsQuery={
                  search.query && filteredProducts.length === 0
                    ? search.query
                    : undefined
                }
              />
            </div>
            <label className="flex min-w-44 flex-col gap-1 text-sm">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Sort by
              </span>
              <select
                value={search.sort}
                onChange={(event) => search.setSort(event.target.value as SortOption)}
                className="h-12 rounded-xl border border-input bg-card px-3 text-sm shadow-sm"
              >
                {Object.entries(SORT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Filter + product grid */}
          <div className="flex min-h-[640px] min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <FilterPanel
              filterState={filters}
              onFilterChange={handleFilterChange}
              availableBrands={availableBrands}
              highlightedFilterIds={uiState.filterPanel.highlightedFilterIds}
              collapsed={uiState.filterPanel.collapsed}
              onFilterClick={handleFilterClick}
              showNoResults={filteredProducts.length === 0}
            />
            <div className="min-w-0 flex-1 p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{filteredProducts.length}</span>{" "}
                  of {search.results.length} products
                </p>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
                    {density}
                  </span>
                  <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
                    {cardVariant} cards
                  </span>
                </div>
              </div>
              <ProductGrid
                products={filteredProducts}
                variant={cardVariant}
                layoutDensity={density}
                hasMore={search.hasMore}
                onLoadMore={search.loadMore}
                isLoading={search.isLoading}
                badgeLabel={badgeLabel}
              />
            </div>
          </div>
        </section>

        <aside className="space-y-4 xl:col-span-2 2xl:col-span-1">
          <ExplanationPanel explanation={explanation} onUndo={resetAdaptations} />
        </aside>
      </div>

      <RiskOverlay
        open={riskVisible}
        title="Medium-risk adaptation"
        message="Filter guidance was adapted for this scenario. Dismiss to keep browsing."
        onDismiss={() => setRiskVisible(false)}
      />

      <DevtoolsOverlay
        isOpen={devtoolsOpen}
        onToggle={() => setDevtoolsOpen((open) => !open)}
        sessionId="demo-session"
        userId="demo-user"
        consentState={consentState}
        manifestVersion={manifest.version}
        events={events}
        prescriptions={prescriptions}
        contextModel={contextModel}
        manifest={{ content: manifest, validationStatus: "valid" }}
      />
    </main>
  );
}

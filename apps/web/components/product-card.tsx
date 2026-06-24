"use client";

/**
 * ProductCard component supporting four visual variants:
 * standard, compact, comparison, and image-lead.
 *
 * Uses `usePrescription` from `@aura/react` for variant/badge/visibility prescriptions.
 * Falls back to "standard" on unrecognized variant values.
 * Displays an adaptation indicator (colored border) for 3+ seconds when adapted.
 *
 * @see Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 14.4
 */

import { useState, useEffect } from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { usePrescription } from "@aura/react";
import type { Product } from "@/lib/types/product";
import type { UIPrescription } from "@aura/protocol";
import { ShoppingCart, Star } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ProductCardVariant = "standard" | "compact" | "comparison" | "image-lead";

const VALID_VARIANTS: ProductCardVariant[] = ["standard", "compact", "comparison", "image-lead"];

export interface ProductCardProps {
  product: Product;
  /** Variant override (will be superseded by prescription if available) */
  variant?: string;
  /** Badge label override (will be superseded by prescription if available) */
  badgeLabel?: string;
  /** Surface ID for prescription subscription */
  surfaceId?: string;
}

// ─── CVA Variant Styles ──────────────────────────────────────────────────────

const cardVariants = cva(
  "relative flex min-w-0 flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-300",
  {
    variants: {
      variant: {
        standard: "",
        compact: "",
        comparison: "",
        "image-lead": "h-[400px]",
      },
      adapted: {
        true: "border-2 border-blue-500 ring-2 ring-blue-500/20",
        false: "",
      },
    },
    defaultVariants: {
      variant: "standard",
      adapted: false,
    },
  }
);

const imageVariants = cva("relative overflow-hidden rounded-t-lg bg-muted", {
  variants: {
    variant: {
      standard: "h-48",
      compact: "h-32",
      comparison: "h-40",
      "image-lead": "hidden",
    },
  },
  defaultVariants: {
    variant: "standard",
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveVariant(value: string | undefined): ProductCardVariant {
  if (value && VALID_VARIANTS.includes(value as ProductCardVariant)) {
    return value as ProductCardVariant;
  }
  // Fallback to "standard" for unrecognized variants (Req 2.7, 2.8)
  if (value && !VALID_VARIANTS.includes(value as ProductCardVariant)) {
    console.warn(
      `[ProductCard] Unrecognized variant "${value}", falling back to "standard"`
    );
  }
  return "standard";
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength);
}

function extractVariantFromPrescription(
  prescription: UIPrescription | undefined
): string | undefined {
  if (!prescription) return undefined;
  const adaptation = prescription.adaptations.find(
    (a) => a.type === "componentVariant" && a.componentId === "product-card"
  );
  if (adaptation && adaptation.type === "componentVariant") {
    return adaptation.variant;
  }
  return undefined;
}

function extractBadgeFromPrescription(
  prescription: UIPrescription | undefined
): string | undefined {
  if (!prescription) return undefined;
  const adaptation = prescription.adaptations.find(
    (a) =>
      a.type === "content" &&
      a.target === "product-card" &&
      a.contentKey === "badgeLabel"
  );
  if (adaptation && adaptation.type === "content") {
    return adaptation.content;
  }
  return undefined;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function RatingStars({ rating }: { rating: number }) {
  return (
    <div
      className="flex items-center gap-1"
      aria-label={`Rating: ${rating} out of 5`}
    >
      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      <span className="text-sm font-medium text-foreground">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

function PriceDisplay({ price, discount }: { price: number; discount: number }) {
  const discountedPrice =
    discount > 0 ? price * (1 - discount / 100) : price;
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg font-bold text-foreground">
        ${discountedPrice.toFixed(2)}
      </span>
      {discount > 0 && (
        <span className="text-sm text-muted-foreground line-through">
          ${price.toFixed(2)}
        </span>
      )}
    </div>
  );
}

function AddToCartButton() {
  return (
    <button
      className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
      aria-label="Add to cart"
    >
      <ShoppingCart className="h-4 w-4" />
      <span>Add to Cart</span>
    </button>
  );
}

function Badge({ label }: { label: string }) {
  // Badge text limited to 24 characters (Req 2.6)
  const truncatedLabel = truncate(label, 24);
  return (
    <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
      {truncatedLabel}
    </span>
  );
}

// ─── Variant Renderers ───────────────────────────────────────────────────────

/**
 * Standard variant: title, price, rating, description (≤120 chars), add-to-cart (Req 2.2)
 */
function StandardContent({
  product,
  badgeLabel,
}: {
  product: Product;
  badgeLabel?: string;
}) {
  const descSnippet = truncate(product.description, 120);
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-base font-semibold text-foreground line-clamp-2">
          {product.name}
        </h3>
        {badgeLabel && <Badge label={badgeLabel} />}
      </div>
      <PriceDisplay price={product.price} discount={product.discount} />
      <RatingStars rating={product.rating} />
      <p className="text-sm text-muted-foreground">{descSnippet}</p>
      <div className="mt-auto pt-2">
        <AddToCartButton />
      </div>
    </div>
  );
}

/**
 * Compact variant: title, price, rating, add-to-cart — no description (Req 2.3)
 */
function CompactContent({
  product,
  badgeLabel,
}: {
  product: Product;
  badgeLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-sm font-semibold text-foreground line-clamp-1">
          {product.name}
        </h3>
        {badgeLabel && <Badge label={badgeLabel} />}
      </div>
      <PriceDisplay price={product.price} discount={product.discount} />
      <RatingStars rating={product.rating} />
      <div className="mt-auto pt-1">
        <AddToCartButton />
      </div>
    </div>
  );
}

/**
 * Comparison variant: title, price, rating, add-to-cart, comparison badge,
 * ≤5 spec highlights (Req 2.4)
 */
function ComparisonContent({
  product,
  badgeLabel,
}: {
  product: Product;
  badgeLabel?: string;
}) {
  // Show up to 5 specification highlights from the product's specs
  const specEntries = Object.entries(product.specs).slice(0, 5);
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-base font-semibold text-foreground line-clamp-2">
          {product.name}
        </h3>
        {badgeLabel ? <Badge label={badgeLabel} /> : <Badge label="Compare" />}
      </div>
      <PriceDisplay price={product.price} discount={product.discount} />
      <RatingStars rating={product.rating} />
      <ul
        className="space-y-1 text-sm text-muted-foreground"
        aria-label="Specifications"
      >
        {specEntries.map(([key, value]) => (
          <li key={key} className="flex justify-between gap-2">
            <span className="font-medium text-foreground">{key}</span>
            <span className="text-right">{value}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-2">
        <AddToCartButton />
      </div>
    </div>
  );
}

/**
 * Image-lead variant: image ≥60% of card height, title, price, add-to-cart (Req 2.5)
 */
function ImageLeadContent({
  product,
  badgeLabel,
}: {
  product: Product;
  badgeLabel?: string;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Image takes ≥60% of the card height */}
      <div className="relative min-h-[60%] flex-[3] overflow-hidden rounded-t-lg bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-full object-cover"
        />
        {badgeLabel && (
          <div className="absolute top-2 right-2">
            <Badge label={badgeLabel} />
          </div>
        )}
      </div>
      {/* Text content takes remaining space */}
      <div className="flex flex-col gap-2 p-3 flex-[2]">
        <h3 className="text-sm font-semibold text-foreground line-clamp-1">
          {product.name}
        </h3>
        <PriceDisplay price={product.price} discount={product.discount} />
        <div className="mt-auto pt-1">
          <AddToCartButton />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ProductCard({
  product,
  variant: variantProp,
  badgeLabel: badgeLabelProp,
  surfaceId = "search.results",
}: ProductCardProps) {
  // Subscribe to prescriptions for this surface via @aura/react
  const prescription = usePrescription(surfaceId);

  // Resolve variant: prescription > prop > default ("standard")
  // Falls back to "standard" on unrecognized variant (Req 2.7, 2.8)
  const prescribedVariant = extractVariantFromPrescription(prescription);
  const resolvedVariant = resolveVariant(prescribedVariant ?? variantProp);

  // Resolve badge: prescription > prop (Req 2.6)
  const prescribedBadge = extractBadgeFromPrescription(prescription);
  const resolvedBadge = prescribedBadge ?? badgeLabelProp;

  // Track adaptation indicator: show colored border for 3+ seconds when adapted (Req 14.4)
  const isAdapted = prescription !== undefined;
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    if (isAdapted) {
      setShowIndicator(true);
      // Keep the indicator visible for at least 3 seconds
      const timer = setTimeout(() => {
        setShowIndicator(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowIndicator(false);
    }
  }, [isAdapted, prescription?.id]);

  return (
    <article
      className={cn(
        cardVariants({
          variant: resolvedVariant,
          adapted: showIndicator,
        })
      )}
      data-variant={resolvedVariant}
      data-adapted={isAdapted}
      aria-label={`Product: ${product.name}`}
    >
      {/* Image header for standard, compact, and comparison variants */}
      {resolvedVariant !== "image-lead" && (
        <div className={cn(imageVariants({ variant: resolvedVariant }))}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Render variant-specific content */}
      {resolvedVariant === "standard" && (
        <StandardContent product={product} badgeLabel={resolvedBadge} />
      )}
      {resolvedVariant === "compact" && (
        <CompactContent product={product} badgeLabel={resolvedBadge} />
      )}
      {resolvedVariant === "comparison" && (
        <ComparisonContent product={product} badgeLabel={resolvedBadge} />
      )}
      {resolvedVariant === "image-lead" && (
        <ImageLeadContent product={product} badgeLabel={resolvedBadge} />
      )}
    </article>
  );
}

export default ProductCard;

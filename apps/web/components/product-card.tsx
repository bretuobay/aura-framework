"use client";

import { useState, useEffect } from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { usePrescription } from "@aura/react";
import type { Product } from "@/lib/types/product";
import type { UIPrescription } from "@aura/protocol";
import { ShoppingCart, Star, Heart } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ProductCardVariant = "standard" | "compact" | "comparison" | "image-lead";

const VALID_VARIANTS: ProductCardVariant[] = ["standard", "compact", "comparison", "image-lead"];

export interface ProductCardProps {
  product: Product;
  variant?: string;
  badgeLabel?: string;
  surfaceId?: string;
}

// ─── CVA Variant Styles ──────────────────────────────────────────────────────

const cardVariants = cva(
  "group relative flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
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

const imageVariants = cva("relative overflow-hidden rounded-t-xl bg-muted", {
  variants: {
    variant: {
      standard: "aspect-[4/3]",
      compact: "aspect-square",
      comparison: "aspect-[4/3]",
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
  if (value && !VALID_VARIANTS.includes(value as ProductCardVariant)) {
    console.warn(`[ProductCard] Unrecognized variant "${value}", falling back to "standard"`);
  }
  return "standard";
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength);
}

function extractVariantFromPrescription(prescription: UIPrescription | undefined): string | undefined {
  if (!prescription) return undefined;
  const adaptation = prescription.adaptations.find(
    (a) => a.type === "componentVariant" && a.componentId === "product-card"
  );
  if (adaptation && adaptation.type === "componentVariant") return adaptation.variant;
  return undefined;
}

function extractBadgeFromPrescription(prescription: UIPrescription | undefined): string | undefined {
  if (!prescription) return undefined;
  const adaptation = prescription.adaptations.find(
    (a) => a.type === "content" && a.target === "product-card" && a.contentKey === "badgeLabel"
  );
  if (adaptation && adaptation.type === "content") return adaptation.content;
  return undefined;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function RatingStars({ rating, reviewCount }: { rating: number; reviewCount: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Rating: ${rating} out of 5`}>
      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
      <span className="text-sm font-semibold text-foreground">{rating.toFixed(1)}</span>
      <span className="text-xs text-muted-foreground">({reviewCount})</span>
    </div>
  );
}

function PriceDisplay({ price, discount }: { price: number; discount: number }) {
  const discountedPrice = discount > 0 ? price * (1 - discount / 100) : price;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xl font-bold text-foreground">${discountedPrice.toFixed(2)}</span>
      {discount > 0 && (
        <>
          <span className="text-sm text-muted-foreground line-through">${price.toFixed(2)}</span>
          <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
            -{discount}%
          </span>
        </>
      )}
    </div>
  );
}

function AddToCartButton() {
  return (
    <button
      className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      aria-label="Add to cart"
    >
      <ShoppingCart className="h-4 w-4" />
      <span>Add to Cart</span>
    </button>
  );
}

function WishlistButton() {
  return (
    <button
      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-muted-foreground opacity-0 shadow-sm transition-all duration-200 hover:text-red-500 group-hover:opacity-100 dark:bg-card/90"
      aria-label="Add to wishlist"
      type="button"
    >
      <Heart className="h-4 w-4" />
    </button>
  );
}

function Badge({ label, variant = "default" }: { label: string; variant?: "default" | "compare" }) {
  const truncatedLabel = truncate(label, 24);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold",
        variant === "compare"
          ? "bg-emerald-600 text-white"
          : "bg-blue-600 text-white"
      )}
    >
      {truncatedLabel}
    </span>
  );
}

function CategoryLabel({ category }: { category: string }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {category}
    </span>
  );
}

// ─── Variant Renderers ───────────────────────────────────────────────────────

function StandardContent({ product, badgeLabel }: { product: Product; badgeLabel?: string }) {
  const reviewCount = Math.floor(product.rating * 47);
  const descSnippet = truncate(product.description, 120);
  return (
    <div className="flex flex-col gap-2.5 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <CategoryLabel category={product.category} />
          <h3 className="mt-0.5 min-w-0 text-base font-semibold text-foreground line-clamp-2">
            {product.name}
          </h3>
        </div>
        {badgeLabel && <Badge label={badgeLabel} />}
      </div>
      <PriceDisplay price={product.price} discount={product.discount} />
      <RatingStars rating={product.rating} reviewCount={reviewCount} />
      <p className="text-sm text-muted-foreground line-clamp-2">{descSnippet}</p>
      <div className="mt-auto pt-1">
        <AddToCartButton />
      </div>
    </div>
  );
}

function CompactContent({ product, badgeLabel }: { product: Product; badgeLabel?: string }) {
  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <CategoryLabel category={product.category} />
          <h3 className="min-w-0 text-sm font-semibold text-foreground line-clamp-1">
            {product.name}
          </h3>
        </div>
        {badgeLabel && <Badge label={badgeLabel} />}
      </div>
      <PriceDisplay price={product.price} discount={product.discount} />
      <RatingStars rating={product.rating} reviewCount={Math.floor(product.rating * 47)} />
      <div className="mt-auto pt-1">
        <AddToCartButton />
      </div>
    </div>
  );
}

function ComparisonContent({ product, badgeLabel }: { product: Product; badgeLabel?: string }) {
  const specEntries = Object.entries(product.specs).slice(0, 5);
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <CategoryLabel category={product.category} />
          <h3 className="min-w-0 text-base font-semibold text-foreground line-clamp-2">
            {product.name}
          </h3>
        </div>
        {badgeLabel ? <Badge label={badgeLabel} /> : <Badge label="Compare" variant="compare" />}
      </div>
      <PriceDisplay price={product.price} discount={product.discount} />
      <RatingStars rating={product.rating} reviewCount={Math.floor(product.rating * 47)} />
      <ul className="space-y-1.5 text-sm text-muted-foreground border-t border-border pt-2" aria-label="Specifications">
        {specEntries.map(([key, value]) => (
          <li key={key} className="flex justify-between gap-2">
            <span className="font-medium text-foreground">{key}</span>
            <span className="text-right">{value}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-1">
        <AddToCartButton />
      </div>
    </div>
  );
}

function ImageLeadContent({ product, badgeLabel }: { product: Product; badgeLabel?: string }) {
  return (
    <div className="flex flex-col h-full">
      <div className="relative min-h-[60%] flex-[3] overflow-hidden rounded-t-xl bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
        {badgeLabel && (
          <div className="absolute top-2 left-2">
            <Badge label={badgeLabel} />
          </div>
        )}
        <WishlistButton />
      </div>
      <div className="flex flex-col gap-2 p-3 flex-[2]">
        <CategoryLabel category={product.category} />
        <h3 className="text-sm font-semibold text-foreground line-clamp-1">{product.name}</h3>
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
  const prescription = usePrescription(surfaceId);

  const prescribedVariant = extractVariantFromPrescription(prescription);
  const resolvedVariant = resolveVariant(prescribedVariant ?? variantProp);

  const prescribedBadge = extractBadgeFromPrescription(prescription);
  const resolvedBadge = prescribedBadge ?? badgeLabelProp;

  const isAdapted = prescription !== undefined;
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    if (isAdapted) {
      setShowIndicator(true);
      const timer = setTimeout(() => setShowIndicator(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setShowIndicator(false);
    }
  }, [isAdapted, prescription?.id]);

  return (
    <article
      className={cn(cardVariants({ variant: resolvedVariant, adapted: showIndicator }))}
      data-variant={resolvedVariant}
      data-adapted={isAdapted}
      aria-label={`Product: ${product.name}`}
    >
      {resolvedVariant !== "image-lead" && (
        <div className={cn(imageVariants({ variant: resolvedVariant }))}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
          <WishlistButton />
        </div>
      )}

      {resolvedVariant === "standard" && <StandardContent product={product} badgeLabel={resolvedBadge} />}
      {resolvedVariant === "compact" && <CompactContent product={product} badgeLabel={resolvedBadge} />}
      {resolvedVariant === "comparison" && <ComparisonContent product={product} badgeLabel={resolvedBadge} />}
      {resolvedVariant === "image-lead" && <ImageLeadContent product={product} badgeLabel={resolvedBadge} />}
    </article>
  );
}

export default ProductCard;

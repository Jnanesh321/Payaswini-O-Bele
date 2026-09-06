/**
 * Helper utilities for mapping tools and categories to their corresponding image assets
 * and handling fallbacks gracefully.
 */

export function getCategoryFallbackImage(category?: string, name?: string): string {
  const cat = (category || "").toUpperCase().replace(/[-\s]/g, "_")
  const n = (name || "").toLowerCase()

  if (
    cat.includes("CLIMB") ||
    cat.includes("POLE") ||
    n.includes("pole") ||
    n.includes("carbon") ||
    n.includes("areca")
  ) {
    return "/images/carbon-fiber-pole.svg"
  }

  if (
    cat.includes("SPRAY") ||
    n.includes("sprayer") ||
    n.includes("spray") ||
    n.includes("knapsack")
  ) {
    return "/images/battery-sprayer.svg"
  }

  if (
    cat.includes("TILLER") ||
    cat.includes("TRACTOR") ||
    n.includes("tiller") ||
    n.includes("cultivator") ||
    n.includes("tractor")
  ) {
    return "/images/power-tiller.svg"
  }

  if (
    cat.includes("PRUNER") ||
    cat.includes("CUTTER") ||
    cat.includes("WEED") ||
    n.includes("cutter") ||
    n.includes("weeder") ||
    n.includes("brush") ||
    n.includes("grass")
  ) {
    return "/images/weed-cutter.svg"
  }

  if (
    cat.includes("PUMP") ||
    cat.includes("WATER") ||
    n.includes("pump") ||
    n.includes("motor") ||
    n.includes("irrigation")
  ) {
    return "/images/water-pump.svg"
  }

  if (
    cat.includes("NET") ||
    cat.includes("COVER") ||
    n.includes("net") ||
    n.includes("cover") ||
    n.includes("tarpaulin") ||
    n.includes("shade")
  ) {
    return "/images/nets-covers.svg"
  }

  if (
    cat.includes("TRANSPLANTER") ||
    cat.includes("PLANTER") ||
    n.includes("transplanter") ||
    n.includes("planter") ||
    n.includes("seeder")
  ) {
    return "/images/transplanter.svg"
  }

  if (
    cat.includes("HARVEST") ||
    n.includes("harvest") ||
    n.includes("sickle") ||
    n.includes("reaper")
  ) {
    return "/images/harvesting-tool.svg"
  }

  return "/images/carbon-fiber-pole.svg"
}

/**
 * Resolves an initial tool image URL.
 * Automatically catches placeholder/broken domains (like mock Cloudinary URLs in seeds)
 * and returns the proper category SVG upfront to avoid broken image flicker or 404 network errors.
 */
export function resolveToolImage(
  src?: string | null,
  category?: string,
  name?: string
): string {
  if (!src || src.trim() === "") {
    return getCategoryFallbackImage(category, name)
  }

  // Placeholder Cloudinary URLs from seed data that don't exist on CDN
  if (src.includes("res.cloudinary.com/obele/")) {
    return getCategoryFallbackImage(category, name)
  }

  return src
}

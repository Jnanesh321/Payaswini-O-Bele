/**
 * Helper utilities for mapping tools and categories to real machinery photography
 * exported from Figma and handling fallbacks gracefully.
 */

export function getCategoryFallbackImage(category?: string, name?: string): string {
  const cat = (category || "").toUpperCase().replace(/[-\s]/g, "_")
  const n = (name || "").toLowerCase()

  if (
    cat.includes("CLIMB") ||
    cat.includes("POLE") ||
    n.includes("pole") ||
    n.includes("carbon") ||
    n.includes("areca") ||
    cat.includes("HARVEST") ||
    n.includes("harvest")
  ) {
    return "/images/tools/arecanut-pole.webp"
  }

  if (
    cat.includes("SPRAY") ||
    n.includes("spray") ||
    n.includes("knapsack") ||
    n.includes("battery")
  ) {
    return "/images/tools/battery-sprayer.webp"
  }

  if (
    cat.includes("TILLER") ||
    n.includes("tiller") ||
    n.includes("cultivator") ||
    n.includes("shakti")
  ) {
    return "/images/tools/power-tiller.webp"
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
    return "/images/tools/brush-cutter.webp"
  }

  if (n.includes("tractor") || cat.includes("TRACTOR")) {
    return "/images/tools/tractor.webp"
  }

  return "/images/tools/power-tiller.webp"
}

/**
 * Resolves an initial tool image URL to real machinery photography.
 * Automatically replaces placeholder/broken domains (like mock Cloudinary URLs in seeds)
 * and SVGs with real machinery photography from /images/tools/.
 */
export function resolveToolImage(
  src?: string | null,
  category?: string,
  name?: string
): string {
  if (!src || src.trim() === "" || src.includes("res.cloudinary.com") || src.endsWith(".svg")) {
    return getCategoryFallbackImage(category, name)
  }

  // Automatically map legacy /images/tools/*.png paths to optimized .webp
  if (src.includes("/images/tools/") && src.endsWith(".png")) {
    return src.replace(/\.png$/, ".webp")
  }

  return src
}

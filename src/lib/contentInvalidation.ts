import { revalidatePath } from "next/cache";
import { invalidateCachePrefix } from "@/lib/multiLayerCache";
import { delCachePrefix } from "@/lib/simpleCache";

type InvalidateContentOptions = {
  includeHome?: boolean;
  detailPath?: string;
  extraPaths?: string[];
};

function revalidateUniquePaths(paths: Array<string | null | undefined>) {
  const unique = new Set<string>();

  for (const path of paths) {
    if (!path) continue;
    if (unique.has(path)) continue;
    unique.add(path);
    revalidatePath(path);
  }
}

function invalidateSharedHome(includeHome = true) {
  if (!includeHome) return;
  invalidateCachePrefix("home:");
}

export function invalidateHomeContent() {
  invalidateCachePrefix("home:");
  revalidatePath("/", "layout");
  revalidatePath("/");
}

export function invalidateBlogContent(options: InvalidateContentOptions = {}) {
  const { includeHome = true, detailPath, extraPaths = [] } = options;

  delCachePrefix("blog:list:");
  invalidateSharedHome(includeHome);

  revalidateUniquePaths([
    includeHome ? "/" : null,
    "/blog",
    detailPath,
    ...extraPaths,
  ]);
}

export function invalidateGalleryContent(options: InvalidateContentOptions = {}) {
  const { includeHome = true, detailPath, extraPaths = [] } = options;

  delCachePrefix("gallery:list:");
  delCachePrefix("gallery:count:");
  invalidateSharedHome(includeHome);

  revalidateUniquePaths([
    includeHome ? "/" : null,
    "/gallery",
    detailPath,
    ...extraPaths,
  ]);
}

export function invalidatePresetContent(options: InvalidateContentOptions = {}) {
  const { includeHome = true, detailPath, extraPaths = [] } = options;

  delCachePrefix("presets:");
  delCachePrefix("ssr:presets:");
  invalidateSharedHome(includeHome);

  revalidateUniquePaths([
    includeHome ? "/" : null,
    "/presets",
    detailPath,
    ...extraPaths,
  ]);
}

export function invalidateWallpaperContent(options: InvalidateContentOptions = {}) {
  const { includeHome = true, detailPath, extraPaths = [] } = options;

  delCachePrefix("wallpapers:list:");
  delCachePrefix("wallpapers:count:");
  invalidateSharedHome(includeHome);

  revalidateUniquePaths([
    includeHome ? "/" : null,
    "/wallpapers",
    detailPath,
    ...extraPaths,
  ]);
}

export function invalidateContactContent(options: { includeHome?: boolean } = {}) {
  const { includeHome = true } = options;

  if (includeHome) {
    invalidateCachePrefix("home:");
  }
  invalidateCachePrefix("contact:");

  revalidateUniquePaths([
    includeHome ? "/" : null,
    "/contact",
  ]);
}

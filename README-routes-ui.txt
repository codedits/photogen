PhotoGen — Backend routes & UI summary

Purpose
- Quick reference for backend API routes, request/response contracts, auth requirements, and top-level UI pages/components.
- Keep this up-to-date when routes or public shapes change.

Repo locations
- Backend / API routes: src/app/api/**
- Server helpers: src/lib/* (mongodb, cloudinaryUrl, cloudinary, auth, simpleCache)
- UI pages: src/app/** (App Router)
- Components: src/components/**

Data shape (most-used)
- Preset document (Mongo):
  {
    _id: ObjectId,
    name: string,
    description?: string,
    prompt?: string,
    tags?: string[],
    image?: string | null,          // cover image url
    images?: [{ url: string, public_id: string }],
    dng?: { url: string, public_id?: string, format?: string } | null,
    createdAt: Date
  }

Backend API (summary)
- /api/admin/login (POST)
  - Purpose: create admin session. Body: { password, remember }
  - Response: { ok: true } on success; sets server session/cookie.
  - Auth: public (login endpoint)

- /api/admin/logout (POST)
  - Purpose: end admin session.
  - Response: { ok: true }

- /api/admin/session (GET)
  - Returns session status for client-side admin guard: { ok: boolean }

- /api/ai-image (POST/GET serverless route)
  - Purpose: generate or proxy AI image generation. Accepts prompt/params.
  - Response: image content-type stream or JSON wrapper depending on implementation.

- /api/upload-image (POST)
  - Purpose: upload images (multipart/form-data). The route accepts image files and returns Cloudinary (or uploaded) urls/public_ids.
  - Note: allowed content-types validated in route (jpg, webp, gif, png typically).

- /api/presets (GET)
  - List presets. Query: ?q= for search; uses text-index or regex fallback.
  - Response: { ok: true, presets: [...] }
  - Caching: short-lived in-memory cache (simpleCache).

- /api/presets (POST)
  - Create preset. Accepts multipart form or JSON body.
  - Required now: dngUrl (download URL) field when creating via admin UI.
  - Accepts imageUrls or image files to populate images[].
  - Response: { ok: true, id }
  - Auth: admin required.

- /api/presets/[id] (PATCH)
  - Update preset fields, add/remove images, optionally set/replace dngUrl (stored but not uploaded).
  - Accepts multipart or JSON. Auth: admin required.

- /api/presets/[id] (DELETE)
  - Delete preset and best-effort removal of associated Cloudinary assets (images/dng public_id). Auth: admin required.

- /api/presets/[id]/download (optional)
  - In some installs a download proxy/route may exist; currently admin flow stores dng.url and clients navigate directly to that URL.

UI pages (app router)
- / (Home)
  - Large Hero (full-bleed), FeatureCards, other marketing sections.
- /presets (list)
  - LiveSearchPresets component performs client search and shows PresetCard items (server provides initial list).
- /presets/[id] (preset detail)
  - Carousel (client), description, tags, download CTA. Uses ImageWithLqip and thumbUrl for Cloudinary transforms.
- /gallery, /studio, /admin (admin UI)
  - /admin contains create/edit forms and lists of presets. Admin forms now take a `dngUrl` text field for the downloadable asset.

Key components
- Carousel.tsx — interactive client carousel with optional thumbnails; now default autoplay disabled. Uses ImageWithLqip for each slide.
- ImageWithLqip.tsx — wraps Next/Image and provides LQIP blurDataURL via useBlurDataUrl() and injects Cloudinary transform tokens via thumbUrl().
- LazyCarousel / LazyChatWidget — client wrappers to defer heavy client bundles.
- Nav, Hero, PresetCard, PresetsList, Admin UI components (see src/components/* for full list).

Cloudinary helper
- src/lib/cloudinaryUrl.ts -> thumbUrl(source, opts)
  - Inserts transform string (c_, w_, h_, q_, f_, dpr_) into Cloudinary URLs.
  - Used per-image in ImageWithLqip and Carousel to request appropriately sized images.

Auth
- Admin-protected routes use isAdminRequest helper in src/lib/auth.
- Admin UI uses session endpoints to gate access.

Developer notes / how to run
- Dev server: npm run dev
- Build: npm run build
- Linting: Next's build will surface ESLint warnings; fix unused imports or missing alt props to silence warnings.
- Tests: none included by default; add lightweight tests if desired.

Common adjustments
- To change download behavior (open vs force-download), update the UI anchor on /presets/[id] — leaving href as stored dng.url will navigate directly.
- To change Cloudinary transforms, edit src/lib/cloudinaryUrl.ts and callers (ImageWithLqip/Carousel).

Contact
- Update this file when adding or removing routes, changing required fields (for example `dngUrl`), or when renaming components.

End of file

# public/

Static assets served at the site root.

## Hero image

The landing page hero (`components/landing/hero.tsx`) references:

```
/jin-cl-gJdQ3FV3-Mw-unsplash.jpg
```

Drop that Unsplash photo into this directory as `jin-cl-gJdQ3FV3-Mw-unsplash.jpg`.
Until it's present the hero renders a forest-green gradient fallback (no broken
image, no build error — it's a CSS `background`, not `next/image`).

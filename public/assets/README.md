# Image assets

Drop the following files here. They are referenced by path, and every reference
degrades gracefully to a labelled placeholder while the file is absent — so the
site runs without them, it just shows placeholders.

| File | Used by |
| --- | --- |
| `logo.jpeg` | header, footer, favicon (falls back to a "The Perch" wordmark) — ✅ present |
| `hornbill-main.png` | Hornbill apartment card, listing row, detail hero |
| `gallery-hornbill-2.png` | Gallery → Bedrooms |
| `gallery-hornbill-3.png` | Gallery → Bedrooms |

The three still missing live in the Claude Design project this app was built from
(`assets/` folder of "New UI mockups"). They could not be pulled down
automatically: the design API caps file reads at 256 KiB and these exceed it,
so they need to be copied across by hand.

The remaining image slots across the site (hero, gallery preview, About, maps,
per-room bedroom/bathroom shots) never had photography in the mockup either. To
fill one, add the file here and point the matching `src` at it:

- apartment photos — `photo:` in `src/data/apartments.ts`
- gallery photos — `photo:` in `src/data/content.ts`
- one-off slots (hero, About, maps) — the `<ImageSlot>` call in the relevant
  screen under `src/screens/`

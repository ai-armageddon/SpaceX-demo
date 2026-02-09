# SpaceX Launch Archive

A modern, lightweight dashboard for exploring SpaceX launch history with real-time search, filters, and rich launch details.

![App Preview](public/brand/spacex-logo.png)

**Live demo:** https://jeremyboulerice.com/SpaceX-demo

**Tech stack**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- SpaceX API v4

**Run locally**
```bash
npm install
npm run dev
```

**Sync supplemental launch data (post-Dec 2022)**
```bash
npm run data:sync
```
This command fetches SpaceX launches after `2022-12-04T23:59:59Z` from:
- SpaceX API v4 (base schema + rocket matching)
- The Space Devs Launch Library 2 (new launch records)
- Wikipedia API (article link enrichment)

Generated files:
- `data/supplemental-launches.json`
- `data/supplemental-rockets.json`
- `data/supplemental-meta.json`

**What this demonstrates**
This project shows how to build a data-rich Next.js App Router experience with server-side data fetching and a responsive, dark UI. It includes client-side search, sorting, pagination, and detail views while keeping performance smooth and payloads light. The UI emphasizes clean visual hierarchy and motion for a polished, production-ready feel.

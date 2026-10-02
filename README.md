# Personal Portfolio

A personal portfolio site built to showcase the thinking, design process,
and approach behind projects that live in private repositories — without
exposing the underlying source code.

This repository currently contains an **experimental landing-page
prototype**: a cinematic, atmospheric desert environment with a hidden
network of systems (backend, APIs, integrations, data, AI) that reveals
itself as the visitor explores. It is intentionally scoped to just the
first-glance landing experience — project pages, a résumé, a blog, and a
contact page are not built yet.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript)
- [Tailwind CSS](https://tailwindcss.com) for styling
- [Framer Motion](https://www.framer.com/motion/) for animation and motion design
- Canvas 2D and SVG for the atmospheric/particle and system-network effects

The goal is a site with room to grow: lots of visual design, graphics, and
animation, alongside write-ups of each project's problem, approach, and
stack.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

## Project structure

- `src/app` — routes, layout, and global styles
- `src/components/landing` — the landing-page prototype: `LandingExperience`
  (orchestrator), `Atmosphere` (background gradients), `DustField` (canvas
  sand/haze), `SystemNetwork` (interactive node graph), `IdentityPanel` /
  `IdentityPortrait` (name, title, photo with fallback), `ExploreCue`,
  `ParallaxLayer`, and `network-data.ts` (node/edge content)
- `src/hooks` — shared hooks for pointer tracking, reduced-motion
  preference, and viewport size, used across the landing components

Add `/public/sarah-ferg.png` to replace the placeholder "SJ" initials with
a real portrait.

## Scripts

- `npm run dev` — start the local dev server
- `npm run build` — create a production build
- `npm run start` — run the production build locally
- `npm run lint` — run ESLint

## Deployment

The easiest way to deploy is [Vercel](https://vercel.com/new), the creators
of Next.js. See the [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying)
for other options.

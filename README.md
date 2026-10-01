# Personal Portfolio

A personal portfolio site built to showcase the thinking, design process,
and approach behind projects that live in private repositories — without
exposing the underlying source code.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript)
- [Tailwind CSS](https://tailwindcss.com) for styling
- [Framer Motion](https://www.framer.com/motion/) for animation and motion design

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
- `src/components` — UI sections (`Hero`, `Projects`, `About`, `Contact`, etc.)
- `src/data/projects.ts` — placeholder project outlines; replace with real
  case studies describing the problem, approach, and tech stack for each
  private repository you want to highlight

## Scripts

- `npm run dev` — start the local dev server
- `npm run build` — create a production build
- `npm run start` — run the production build locally
- `npm run lint` — run ESLint

## Deployment

The easiest way to deploy is [Vercel](https://vercel.com/new), the creators
of Next.js. See the [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying)
for other options.

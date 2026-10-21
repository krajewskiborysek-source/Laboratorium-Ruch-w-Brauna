# Brownian Motion Lab

A small, dependency-light browser simulation of Brownian motion. The project uses Vite and native browser APIs.

## Requirements

- Node.js 20.19+ (or 22.12+)
- npm

## Development

```sh
npm install
npm run dev
```

## Production build

```sh
npm run build
npm run preview
```

The static production site is generated in `dist/` and can be deployed to any static host. Vite is configured with relative asset URLs so it can also be served from a project subpath.

## Pages and controls

- **History** follows Brown's observation, Einstein's explanation, Perrin's experimental evidence, and later applications.
- **Equations** introduces mean squared displacement and the Stokes–Einstein relation with accessible explanations.
- **Simulation** lets you drag large particles, adjust energy/size/mass/visibility, toggle trails, pause, and download a PNG.
- Anime.js provides restrained page-entry animations; reduced-motion preferences are respected.
- The light/dark theme choice is remembered in local storage.

The simulation runs locally in the browser and does not require an API.

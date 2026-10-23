# magikdidi24.github.io

Source of my portfolio, [magikdidi24.github.io](https://magikdidi24.github.io). I'm an AI engineering student at EPITA, on exchange in Tokyo. The site has my research on image reconstruction, my compiler work, my open source PRs and my projects.

It's a static Astro site with plain CSS and a bit of JavaScript. Most of the content comes from `src/data/site.ts` and `src/data/projects.ts`.

The figure on the home page is not real data. I wrote a small simulation for it in `src/lib/photon/`: a meteorite section imaged one X-ray photon at a time, with the raw counts on one side and a reconstruction guided by an electron image on the other. It shows the idea behind my research but it's not the lab's method or data.

To run it you need Node 22.22 or newer.

```sh
npm ci
npm run dev       # http://localhost:4321
npm run build     # static site in dist/
npm run verify    # checks dist/ for broken links, missing alt text...
```

Each push to `main` builds the site, runs the same check and deploys it to GitHub Pages (`.github/workflows/deploy.yml`). If the check fails nothing is deployed.

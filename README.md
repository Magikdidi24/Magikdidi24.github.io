# magikdidi24.github.io

Source of my portfolio, [magikdidi24.github.io](https://magikdidi24.github.io). I'm an AI engineering student at EPITA, on exchange in Tokyo. The site has my research on image reconstruction, my compiler work, my open source PRs and my projects.

The home page is my bedroom, drawn in 3D pixel art with three.js. Things in it can be clicked: some open a panel, the main screen opens a desktop with my projects, and a few of those projects run in the page. The same content is at [/classic/](https://magikdidi24.github.io/classic/) as plain text, which is also where you land if your browser has no WebGL.

It's a static Astro site with plain CSS. Most of the content comes from `src/data/site.ts` and `src/data/projects.ts`. What belongs to the room alone (which object opens what, the names under the pointer) is in `src/data/room.ts`, and the room itself is in `src/room/`: every object is built in code from small cubes, there is no 3D model file. GSAP runs the journeys of the camera, and ZzFX plays the sounds, which are written as notes in `src/room/audio.ts`: there is no audio file either.

The projects you can play on the desktop are my own programs compiled to WebAssembly: the liquid simulator, the chess engine and five small C programs. `scripts/demos/build.sh` rebuilds them from their repositories; the compiled files are in `public/room/demos/`.

The photon figure is not real data. I wrote a small simulation for it in `src/lib/photon/`: a meteorite section imaged one X-ray photon at a time, with the raw counts on one side and a reconstruction guided by an electron image on the other. It shows the idea behind my research but it's not the lab's method or data.

To run it you need Node 22.22 or newer.

```sh
npm ci
npm run dev       # http://localhost:4321
npm run build     # static site in dist/
npm run verify    # checks dist/ for broken links, missing alt text...
npm test          # unit tests of the room
```

Each push to `main` builds the site, runs the same check and deploys it to GitHub Pages (`.github/workflows/deploy.yml`). If the check fails nothing is deployed.

The licenses of three.js, GSAP, ZzFX and of the two fonts are in `public/licenses.txt`.

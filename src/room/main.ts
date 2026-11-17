/*
  Bootstrap of the 3D room: renderer, scene, camera, pixel pipeline and the
  render loop. A frame is drawn only when the camera moved, the viewport
  changed or something called invalidate().
*/
import { NoToneMapping, PCFShadowMap, Vector3, WebGLRenderer } from 'three';
import { createRig, type Pose, type Rig } from './camera.ts';
import { easeInOut } from './interaction/motion.ts';
import { createReactions } from './interaction/reactions.ts';
import { createPipeline, type Pipeline } from './render/pixel.ts';
import { createScene, ROOM, type RoomScene } from './scene.ts';
import { pixelAt, type Framing } from './view.ts';

export interface RoomApp {
  readonly renderer: WebGLRenderer;
  readonly room: RoomScene;
  readonly rig: Rig;
  readonly pipeline: Pipeline;
  /** Draw a frame on the next tick. With `shadows`, redraw the shadow map too: something that casts one moved. */
  invalidate(shadows?: boolean): void;
  /** Call `step` before each frame, with the time in milliseconds, until it returns false. */
  animate(step: (now: number) => boolean): void;
  /** The name of the object drawn under a point of the viewport, if there is one. */
  pick(clientX: number, clientY: number): string | null;
  /** The line of sight through a point of the viewport: where it starts and the way it goes, in metres. */
  ray(clientX: number, clientY: number): { origin: [number, number, number]; direction: [number, number, number] };
  /** Recompute the pixel grid and the camera fit, after the viewport or the pixel size changed. */
  resize(): void;
  setNight(night: boolean): void;
  /** Draw the room with smooth edges, one buffer pixel per device pixel, or in large pixels again. */
  setSmooth(smooth: boolean): void;
  /** Outline an object in the accent colour, by its name: the one under the pointer. Null for none. */
  hover(name: string | null): void;
  /** Go round to the other side of the room, half a turn: the walls in front of the camera give way to the two behind it. Not while the camera is held on a stop. */
  turn(): Promise<void>;
  /**
   * Take the camera to a stop of the visit and hold it there: where it
   * looks, and what the open panel covers of the viewport. With null, give
   * the camera back to the visitor where they left it.
   */
  focus(view: Framing | null, cover?: { right: number; bottom: number }): Promise<void>;
  dispose(): void;
}

/* The camera is the one thing of the room that does not move in steps: it is redrawn at every frame of its way. */
/** The half turn round the room, in seconds. */
const TURN = 1.4;
/** The way to a stop of the visit, and back. */
const GLIDE = 0.7;

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export async function start(canvas: HTMLCanvasElement, container: HTMLElement): Promise<RoomApp> {
  const renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  /* The palette colours must reach the screen unchanged. */
  renderer.toneMapping = NoToneMapping;
  renderer.shadowMap.enabled = true;
  /* Filtered: unfiltered shadows saw-tooth on 5 cm steps. The low-resolution buffer makes the edge hard again. */
  renderer.shadowMap.type = PCFShadowMap;
  /* The shadow map is drawn again only when asked: when the lights change or something that casts a shadow moves. */
  renderer.shadowMap.autoUpdate = false;
  /* The pipeline calls render() several times per frame: count draw calls over the whole frame. */
  renderer.info.autoReset = false;

  const room = createScene();
  const rig = createRig(ROOM, canvas);
  const pipeline = createPipeline(renderer, room.scene, rig.camera, container);

  let dirty = true;
  let frame = 0;
  let turning: Promise<void> | null = null;
  /** Where the visitor left the camera, while it is held on a stop. */
  let left: Pose | null = null;
  /** The number of the last journey of the camera: a newer one takes over. */
  let journeys = 0;
  const still = matchMedia('(prefers-reduced-motion: reduce)');

  /** Call `apply` at every frame for `seconds`, with how far the camera has come: slow, fast, then slow, from 0 to 1. */
  const travel = (seconds: number, apply: (t: number) => void) =>
    new Promise<void>((done) => {
      let start = -1;
      app.animate((now) => {
        if (start < 0) start = now;
        const t = still.matches ? 1 : Math.min(1, (now - start) / (seconds * 1000));
        apply(easeInOut(t));
        dirty = true;
        if (t < 1) return true;
        done();
        return false;
      });
    });
  const animations = new Set<(now: number) => boolean>();
  /** Draw a frame with fresh shadows: the lights changed, or the graphics context came back. */
  const redraw = () => app.invalidate(true);

  const app: RoomApp = {
    renderer,
    room,
    rig,
    pipeline,
    invalidate(shadows = false) {
      if (shadows) renderer.shadowMap.needsUpdate = true;
      dirty = true;
    },
    animate(step) {
      animations.add(step);
    },
    pick(clientX, clientY) {
      const box = canvas.getBoundingClientRect();
      const pixel = pixelAt(pipeline.grid, clientX - box.left, clientY - box.top);
      if (!pixel) return null;
      return room.names[pipeline.outlinePass.idAt(renderer, pixel.x, pixel.y) - 1] ?? null;
    },
    ray(clientX, clientY) {
      const box = canvas.getBoundingClientRect();
      const origin = new Vector3(((clientX - box.left) / box.width) * 2 - 1, 1 - ((clientY - box.top) / box.height) * 2, -1).unproject(rig.camera);
      return { origin: origin.toArray(), direction: rig.camera.getWorldDirection(new Vector3()).toArray() };
    },
    resize() {
      pipeline.resize();
      room.fitBoard(rig.fit(pipeline.grid), pipeline.grid);
      dirty = true;
    },
    setNight(night) {
      room.setNight(night);
      /* A glow shows less in daylight. */
      pipeline.bloomPass.strength = night ? 0.6 : 0.25;
      redraw();
    },
    setSmooth(smooth) {
      pipeline.mode = smooth ? 'smooth' : 'auto';
      app.resize();
    },
    hover(name) {
      pipeline.outlinePass.hovered = name === null ? 0 : room.names.indexOf(name) + 1;
      dirty = true;
    },
    turn() {
      if (left) return Promise.resolve();
      turning ??= travel(TURN, (t) => rig.around(t)).then(() => void (turning = null));
      return turning;
    },
    async focus(view, cover = { right: 0, bottom: 0 }) {
      const journey = ++journeys;
      if (view && rig.behind) await app.turn(); // the stops are on the walls of the opening view
      if (journey !== journeys || (!view && !left)) return;
      const from = rig.pose();
      const to = view ? rig.frame(view, cover, pipeline.grid) : left!;
      if (view) left ??= from;
      rig.hold(true);
      await travel(GLIDE, (eased) => {
        if (journey !== journeys) return;
        rig.place({
          target: [0, 1, 2].map((k) => mix(from.target[k], to.target[k], eased)) as Pose['target'],
          azimuth: mix(from.azimuth, to.azimuth, eased),
          elevation: mix(from.elevation, to.elevation, eased),
          zoom: mix(from.zoom, to.zoom, eased),
        });
      });
      if (journey !== journeys || view) return;
      left = null;
      rig.hold(false);
    },
    dispose() {
      cancelAnimationFrame(frame);
      stopReactions();
      rig.controls.removeEventListener('change', changed);
      observer.disconnect();
      canvas.removeEventListener('webglcontextrestored', redraw);
      rig.dispose();
      pipeline.dispose();
      room.dispose();
      renderer.dispose();
    },
  };

  const stopReactions = createReactions(app, canvas);
  /* The controls apply a turn of the wheel as soon as it happens, outside the loop below: the loop
     would see nothing left to do and never draw it. Their own signal is what asks for a frame. */
  const changed = () => app.invalidate();
  rig.controls.addEventListener('change', changed);
  const observer = new ResizeObserver(() => app.resize());
  observer.observe(container);
  canvas.addEventListener('webglcontextrestored', redraw);
  const hour = new Date().getHours();
  app.setNight(hour < 7 || hour >= 19);
  app.resize();

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    for (const step of animations) if (!step(now)) animations.delete(step);
    rig.update();
    if (!dirty) return;
    dirty = false;
    /* The walls that show, and the side the daylight comes from, follow the camera. */
    if (room.face(rig.azimuth(), rig.turned)) renderer.shadowMap.needsUpdate = true;
    renderer.info.reset();
    rig.renderAligned(pipeline.grid, () => pipeline.render());
  };
  tick(performance.now());

  if (import.meta.env.DEV) (await import('./debug.ts')).setupDebug(app);
  return app;
}

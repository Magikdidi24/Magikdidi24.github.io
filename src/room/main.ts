/*
  Bootstrap of the 3D room: renderer, scene, camera, pixel pipeline and the
  render loop. A frame is drawn only when the camera moved, the viewport
  changed or something called invalidate().
*/
import { gsap } from 'gsap';
import { NoToneMapping, PCFShadowMap, Vector3, WebGLRenderer } from 'three';
import { createRig, type Pose, type Rig } from './camera.ts';
import { easeInOut } from './interaction/motion.ts';
import { createReactions } from './interaction/reactions.ts';
import { createPipeline, type Pipeline } from './render/pixel.ts';
import { createScene, ROOM, type RoomScene, type Switch } from './scene.ts';
import { glide, pixelAt, type Cover, type Framing } from './view.ts';

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
  focus(view: Framing | null, cover?: Cover): Promise<void>;
  /** The room comes to life as the visitor enters: dark at first, its lights come on one after the other while the camera comes forward. */
  intro(): Promise<void>;
  /** Outline some objects in turn, twice each, by their names: a hint that they answer a click. */
  hint(names: readonly string[]): Promise<void>;
  /** Draw nothing while something covers the room from side to side, and draw again once it is gone. */
  rest(asleep: boolean): void;
  dispose(): void;
}

/* The camera is the one thing of the room that does not move in steps: it is redrawn at every frame of its way. */
/** The half turn round the room, in seconds. */
const TURN = 1.4;
/** The way to a stop of the visit, and back. */
const GLIDE = 0.7;
/** The room coming to life as the visitor enters: how long it takes, from how far the camera comes (a share of its zoom, and degrees), and what comes on, in that order. */
const INTRO = { seconds: 2.2, zoom: 0.85, turn: 5, lights: ['lamp', 'neon', 'pc'] as Switch[] };
/** A hint: how long an object stays outlined, then how long it does not, in milliseconds. */
const HINT = { on: 260, off: 140 };

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Start the room. `progress` hears how far the building of it has come, from 0 to 1. */
export async function start(canvas: HTMLCanvasElement, container: HTMLElement, progress?: (share: number) => void): Promise<RoomApp> {
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

  const room = await createScene(progress);
  const rig = createRig(ROOM, canvas);
  const pipeline = createPipeline(renderer, room.scene, rig.camera, container);

  let dirty = true;
  let asleep = false;
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
      const come = { far: 0 };
      const step = () => {
        apply(come.far);
        dirty = true;
      };
      /* GSAP runs the journey, with the easing of the room. For who asked for less motion there is no journey: the camera is there at once. */
      if (still.matches) {
        come.far = 1;
        step();
        done();
      } else gsap.to(come, { far: 1, duration: seconds, ease: easeInOut, onUpdate: step, onComplete: done });
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
        const zoom = mix(from.zoom, to.zoom, eased);
        rig.place({
          target: glide(from.target, to.target, eased, from.zoom, zoom),
          azimuth: mix(from.azimuth, to.azimuth, eased),
          elevation: mix(from.elevation, to.elevation, eased),
          zoom,
        });
      });
      if (journey !== journeys || view) return;
      left = null;
      rig.hold(false);
    },
    async intro() {
      if (still.matches) return;
      const journey = ++journeys;
      const to = rig.pose();
      const from = { ...to, zoom: to.zoom * INTRO.zoom, azimuth: to.azimuth + INTRO.turn };
      for (const which of INTRO.lights) room.setLevel(which, 0);
      rig.hold(true);
      rig.place(from);
      redraw();
      let lit = 0;
      await travel(INTRO.seconds, (eased) => {
        /* The lights do not wait for the camera: something else may have taken it. */
        while (lit < INTRO.lights.length && eased >= (lit + 1) / (INTRO.lights.length + 1)) room.setLevel(INTRO.lights[lit++], 1);
        if (journey === journeys) rig.place({ ...to, zoom: mix(from.zoom, to.zoom, eased), azimuth: mix(from.azimuth, to.azimuth, eased) });
      });
      if (journey === journeys) rig.hold(false);
    },
    async hint(names) {
      if (still.matches) return;
      const pause = (milliseconds: number) => new Promise((done) => setTimeout(done, milliseconds));
      for (const name of names) {
        for (let blink = 0; blink < 2; blink++) {
          pipeline.outlinePass.hinted = room.names.indexOf(name) + 1;
          dirty = true;
          await pause(HINT.on);
          pipeline.outlinePass.hinted = 0;
          dirty = true;
          await pause(HINT.off);
        }
      }
    },
    rest(value) {
      asleep = value;
      dirty = true;
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
    if (!dirty || asleep) return;
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

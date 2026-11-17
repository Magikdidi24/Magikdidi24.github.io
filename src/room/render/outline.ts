/*
  The outline pass. It takes the place of three's RenderPixelatedPass, whose
  edge-highlight logic it keeps, and adds what that pass cannot do in this
  room: an outline around an object that lies flat on another one.

  The scene is drawn twice into the low-resolution buffer:
    1. colour and depth;
    2. "aux", with one override material: the view-space normal (red, green),
       the object id (blue) and the emissive flag (alpha).
  A full-screen pass then draws the colour, with
    - the accent colour on the edge of the object under the pointer;
    - a dark outline on a pixel that is in front of its neighbour: any step
      when the neighbour belongs to another object, a step of depthThreshold
      metres inside one object. "In front" is measured against the plane of
      the pixel's own surface, so a wall seen at a low angle gets no outline;
    - a highlight on one side of a crease, where two faces of an object meet.
  The aux buffer is also what the bloom reads to keep emissive pixels only.
*/
import {
  Color,
  DepthStencilFormat,
  DepthTexture,
  HalfFloatType,
  NearestFilter,
  NoBlending,
  ShaderMaterial,
  UnsignedInt248Type,
  Vector2,
  Vector4,
  WebGLRenderTarget,
  type OrthographicCamera,
  type Scene,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js';

/**
 * The layer of what is drawn in the colour render only, like a painted
 * backdrop: it writes no depth and no id, so it gets no outline and the
 * composite treats it as background.
 */
export const COLOR_ONLY = 1;

/**
 * The layer of what is drawn in the aux render only: it has an id and no
 * colour, so the pointer finds an object where nothing of it is painted, as
 * in the opening of the window.
 */
export const ID_ONLY = 2;

const auxMaterial = () =>
  new ShaderMaterial({
    blending: NoBlending,
    vertexShader: /* glsl */ `
      attribute vec2 aux;
      varying vec3 vNormal;
      varying vec2 vAux;

      void main() {
        #include <beginnormal_vertex>
        #include <defaultnormal_vertex>
        #include <begin_vertex>
        #include <project_vertex>
        vNormal = transformedNormal;
        vAux = aux;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec2 vAux;

      void main() {
        gl_FragColor = vec4(normalize(vNormal).xy * 0.5 + 0.5, vAux.x / 255.0, vAux.y);
      }
    `,
  });

const compositeMaterial = () =>
  new ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
      tDepth: { value: null },
      tAux: { value: null },
      resolution: { value: new Vector4() }, // width, height, 1 / width, 1 / height
      pixel: { value: new Vector2() }, // size of a pixel in the scene, in metres
      depthRange: { value: new Vector2() }, // camera near and far
      depthEdgeStrength: { value: 0 },
      normalEdgeStrength: { value: 0 },
      depthThreshold: { value: 0 },
      hovered: { value: 0 },
      accent: { value: new Color() },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform sampler2D tDepth;
      uniform sampler2D tAux;
      uniform vec4 resolution;
      uniform vec2 pixel;
      uniform vec2 depthRange;
      uniform float depthEdgeStrength;
      uniform float normalEdgeStrength;
      uniform float depthThreshold;
      uniform float hovered;
      uniform vec3 accent;
      varying vec2 vUv;

      // Distance from the camera, in metres. Orthographic depth is linear.
      float depthAt(vec2 offset) {
        return mix(depthRange.x, depthRange.y, texture2D(tDepth, vUv + offset * resolution.zw).r);
      }

      vec4 auxAt(vec2 offset) {
        return texture2D(tAux, vUv + offset * resolution.zw);
      }

      vec3 normalOf(vec4 aux) {
        vec2 n = aux.rg * 2.0 - 1.0;
        return vec3(n, sqrt(max(0.0, 1.0 - dot(n, n))));
      }

      float idOf(vec4 aux) {
        return floor(aux.b * 255.0 + 0.5);
      }

      // 1 when this pixel is in front of its neighbour.
      float outline(vec2 offset, float depth, vec3 normal, float id) {
        // Where this pixel's own surface would be under the neighbour, if it went on.
        float onPlane = depth + dot(normal.xy, offset * pixel) / max(normal.z, 0.2);
        float behind = depthAt(offset) - onPlane;
        float other = idOf(auxAt(offset));
        if (other == id) return float(behind > depthThreshold);
        // Two objects: any step counts. Flush with each other, the higher id takes the line.
        return float(behind > 0.004 || (behind > -0.004 && id > other));
      }

      // From three's RenderPixelatedPass: a crease is highlighted on one of its two sides only.
      float crease(vec2 offset, float depth, vec3 normal, float id) {
        vec4 aux = auxAt(offset);
        if (idOf(aux) != id) return 0.0;
        vec3 other = normalOf(aux);
        // The side whose normal is closer to (1, 1, 1) yields to the other.
        float yields = smoothstep(-0.01, 0.01, dot(normal - other, vec3(1.0)));
        // Only the nearer side of a step highlights.
        float nearer = step(-0.05, depthAt(offset) - depth);
        return (1.0 - dot(normal, other)) * nearer * yields;
      }

      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        // Nothing drawn here: the background has no surface to outline.
        if (texture2D(tDepth, vUv).r >= 1.0) {
          gl_FragColor = texel;
          return;
        }
        vec4 aux = auxAt(vec2(0.0));
        float depth = depthAt(vec2(0.0));
        vec3 normal = normalOf(aux);
        float id = idOf(aux);

        // The object under the pointer: the pixels of its edge take the accent colour.
        if (hovered > 0.0 && id == hovered) {
          bool edge = idOf(auxAt(vec2(1.0, 0.0))) != id || idOf(auxAt(vec2(-1.0, 0.0))) != id
            || idOf(auxAt(vec2(0.0, 1.0))) != id || idOf(auxAt(vec2(0.0, -1.0))) != id;
          if (edge) {
            gl_FragColor = vec4(accent, texel.a);
            return;
          }
        }

        float dark = max(
          max(outline(vec2(1.0, 0.0), depth, normal, id), outline(vec2(-1.0, 0.0), depth, normal, id)),
          max(outline(vec2(0.0, 1.0), depth, normal, id), outline(vec2(0.0, -1.0), depth, normal, id))
        );
        float light = crease(vec2(1.0, 0.0), depth, normal, id) + crease(vec2(-1.0, 0.0), depth, normal, id)
          + crease(vec2(0.0, 1.0), depth, normal, id) + crease(vec2(0.0, -1.0), depth, normal, id);
        // An emissive pixel keeps its exact colour: no outline and no highlight on it.
        dark *= 1.0 - aux.a;
        light = step(0.1, light) * (1.0 - aux.a);

        float strength = dark > 0.0 ? 1.0 - depthEdgeStrength * dark : 1.0 + normalEdgeStrength * light;
        gl_FragColor = vec4(texel.rgb * strength, texel.a);
      }
    `,
  });

export class OutlinePass extends Pass {
  /** How dark an outline is, 0 to 1. */
  depthEdgeStrength = 0.6;
  /** How bright a highlighted crease is. */
  normalEdgeStrength = 0.3;
  /** Inside one object, a step of this many metres gets an outline. */
  depthThreshold = 0.1;
  /** The id of the object to outline in the accent colour: the one under the pointer. 0 for none. */
  hovered = 0;
  readonly accent = new Color();

  private readonly scene: Scene;
  private readonly camera: OrthographicCamera;
  private readonly beauty: WebGLRenderTarget;
  private readonly aux: WebGLRenderTarget;
  private readonly auxOverride = auxMaterial();
  private readonly quad = new FullScreenQuad(compositeMaterial());
  private readonly clearColor = new Color();
  private readonly picked = new Uint8Array(4);

  constructor(scene: Scene, camera: OrthographicCamera) {
    super();
    this.scene = scene;
    this.camera = camera;
    /* With a stencil buffer: the scene uses it to show the city through the window opening only. */
    this.beauty = new WebGLRenderTarget(1, 1, { type: HalfFloatType, minFilter: NearestFilter, magFilter: NearestFilter, stencilBuffer: true });
    this.beauty.depthTexture = new DepthTexture(1, 1, UnsignedInt248Type, undefined, undefined, undefined, undefined, undefined, undefined, DepthStencilFormat);
    this.aux = new WebGLRenderTarget(1, 1, { minFilter: NearestFilter, magFilter: NearestFilter });
  }

  /** Normal, object id and emissive flag of every pixel of the last frame. */
  get auxTexture(): Texture {
    return this.aux.texture;
  }

  /**
   * The id of the object drawn at a pixel of the last frame, counted from the
   * bottom left of the buffer. 0 is the room itself, or nothing.
   */
  idAt(renderer: WebGLRenderer, x: number, y: number): number {
    renderer.readRenderTargetPixels(this.aux, x, y, 1, 1, this.picked);
    return this.picked[2];
  }

  override setSize(width: number, height: number): void {
    this.beauty.setSize(width, height);
    this.aux.setSize(width, height);
    (this.quad.material as ShaderMaterial).uniforms.resolution.value.set(width, height, 1 / width, 1 / height);
  }

  override render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget): void {
    const { scene, camera } = this;
    const uniforms = (this.quad.material as ShaderMaterial).uniforms;

    camera.layers.enable(COLOR_ONLY);
    renderer.setRenderTarget(this.beauty);
    renderer.render(scene, camera);
    camera.layers.disable(COLOR_ONLY);

    /* Second render: no second shadow pass, one material for everything, and
       nothing where the background is (id 0, not emissive; the composite
       skips those pixels by their depth). */
    const { background, overrideMaterial } = scene;
    const { autoUpdate } = renderer.shadowMap;
    renderer.getClearColor(this.clearColor);
    const clearAlpha = renderer.getClearAlpha();
    scene.background = null;
    scene.overrideMaterial = this.auxOverride;
    renderer.shadowMap.autoUpdate = false;
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(this.aux);
    camera.layers.enable(ID_ONLY);
    renderer.render(scene, camera);
    camera.layers.disable(ID_ONLY);
    scene.background = background;
    scene.overrideMaterial = overrideMaterial;
    renderer.shadowMap.autoUpdate = autoUpdate;
    renderer.setClearColor(this.clearColor, clearAlpha);

    uniforms.tDiffuse.value = this.beauty.texture;
    uniforms.tDepth.value = this.beauty.depthTexture;
    uniforms.tAux.value = this.aux.texture;
    uniforms.pixel.value.set(
      (camera.right - camera.left) / camera.zoom / this.beauty.width,
      (camera.top - camera.bottom) / camera.zoom / this.beauty.height,
    );
    uniforms.depthRange.value.set(camera.near, camera.far);
    uniforms.depthEdgeStrength.value = this.depthEdgeStrength;
    uniforms.normalEdgeStrength.value = this.normalEdgeStrength;
    uniforms.depthThreshold.value = this.depthThreshold;
    uniforms.hovered.value = this.hovered;
    uniforms.accent.value.copy(this.accent);

    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    if (!this.renderToScreen && this.clear) renderer.clear();
    this.quad.render(renderer);
  }

  override dispose(): void {
    this.beauty.dispose();
    this.aux.dispose();
    this.auxOverride.dispose();
    this.quad.material.dispose();
    this.quad.dispose();
  }
}

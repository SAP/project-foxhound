/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, svg } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";

const PROXIMITY_THRESHOLD_PX = 50;

// How much each polygon corner drifts toward the cursor when fully
// engaged (as a fraction of its distance to the cursor).
// Higher = the whole shape leans more toward the cursor (e.g. 0.2 = dramatic lean);
// Lower = corners stay put (e.g. 0 = no lean at all).
const MAX_CORNER_PULL = 0.05;

// Shape of the glowing "bumps" that ride along the top and bottom edges.
// SIGMA = how wide the bump is. Larger = wider/softer hill; lower = narrower spike.
// AMPLITUDE = how far the bump pokes outward in px. ↑ taller bump.
const BUMP_SIGMA_PX = 55;
const BUMP_AMPLITUDE_PX = 35;

// How quickly the bumps shrink as the cursor approaches a side of the
// bar.
// Higher = bumps start shrinking earlier and more gradually;
// Lower = they stay full height until very close to the edge.
const EDGE_FADE_PX = 175;

// How many points we sample along the top and bottom edges when drawing
// the path.
// Higher = smoother bump curve, slightly more work per frame (e.g. 60 = very smooth);
// Lower = faster but the bump may look faceted (e.g. 8 = visibly angular).
const EDGE_SAMPLES = 28;

// How quickly the glow chases its target each frame.
// Higher = snappier, less lag (e.g. 0.2 = fast snap);
// Lower = slower, more graceful ease-out (e.g. 0.01 = very sluggish).
// POSITION_SMOOTHING    controls the LEFT↔RIGHT shape morph.
// ALPHA_SMOOTHING       controls how quickly the glow engages (REST→triangle, bump grow/slide).
// BUMP_FOLLOW_SMOOTHING controls how closely the bumps trail the cursor's x.
const POSITION_SMOOTHING = 0.03;
const ALPHA_SMOOTHING = 0.03;
const BUMP_FOLLOW_SMOOTHING = 0.06;

// Denominator for the bump's gaussian falloff (exp(-dx² / 2σ²)).
// Computed once here rather than on every frame.
const BUMP_GAUSSIAN_DENOMINATOR = 2 * BUMP_SIGMA_PX * BUMP_SIGMA_PX;

// How far (px) TL and BR start tucked inside the bar before growing
// back out to their REST positions. Reads as the corners "settling
// into place." Larger = bigger starting tuck.
const CORNER_SPREAD_PUSH_PX = 10;

// How fast the corners spread back to their REST positions each frame.
// Lower = slower, more dramatic spread (e.g. 0.01 = very slow grow-in);
// Higher = quicker, snappier (e.g. 0.15 = nearly instant).
const CORNER_SPREAD_SMOOTHING = 0.03;

// The glow polygon has three "shapes" we blend between based on where the
// cursor is. Each shape is six points around the bar.
//
// Coordinates are fractions of the bar's box (the .urlbar-background div):
//   x = 0 is the bar's left edge, x = 1 is the right.
//   y = 0 is the top edge,        y = 1 is the bottom.
//   Values outside 0–1 sit in the bleed area outside the bar (e.g. y = -0.1
//   means 10% of the bar's height above the top).
//
// Each list goes in order: TL → top-mid → TR → BR → bot-mid → BL.
//
// To make a corner bleed further out: push its x/y further past 0/1.
// To pull a corner closer to the bar: nudge x/y back toward 0/1.

// Shown when the cursor is far away or the input is focused.
// TL pokes up-left
// BR pokes down-right
const POLYGON_REST = [
  { x: -0.01, y: -0.1 }, // TL — bleeds up-left
  { x: 0.48386, y: 0.225 }, // top-mid
  { x: 1, y: 0.3125 }, // TR — sits at the corner
  { x: 1.01, y: 1.1 }, // BR — bleeds down-right
  { x: 0.48386, y: 0.775 }, // bot-mid
  { x: 0, y: 0.6 }, // BL — sits at the corner
];

// Shown when the cursor is at the bar's left side. A triangle whose long
// side hugs the bar's left edge (TL and BL both bleed left); the right
// side is tucked in close to the bar.
const POLYGON_LEFT = [
  { x: -0.01, y: -0.05 }, // TL — small bleed up-left
  { x: 0.48386, y: 0.225 }, // top-mid
  { x: 1.0, y: 0.3 }, // TR — tucked just inside the right edge
  { x: 1.0, y: 0.7 }, // BR — tucked just inside the right edge
  { x: 0.48386, y: 0.775 }, // bot-mid
  { x: -0.01, y: 1.05 }, // BL — small bleed down-left
];

// Mirror of LEFT: shown when the cursor is at the bar's right side. The
// triangle's long side hugs the right edge (TR and BR bleed right).
const POLYGON_RIGHT = [
  { x: 0, y: 0.3 }, // TL — tucked
  { x: 0.51614, y: 0.225 }, // top-mid
  { x: 1.01, y: -0.05 }, // TR — small bleed up-right
  { x: 1.01, y: 1.05 }, // BR — small bleed down-right
  { x: 0.51614, y: 0.775 }, // bot-mid
  { x: 0, y: 0.7 }, // BL — tucked
];

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * @param {number} from
 * @param {number} to
 * @param {number} fraction
 * @returns {number}
 */
function lerp(from, to, fraction) {
  return from + (to - from) * fraction;
}

/**
 * Given a list of points (a polyline), returns the point you'd land on
 * after walking `fraction` (0..1) of the way along it. Used to lay out
 * evenly-spaced samples across the top and bottom edges of the polygon.
 *
 * @param {{x: number, y: number}[]} points
 * @param {number} fraction
 * @returns {{x: number, y: number}}
 */
function samplePolyline(points, fraction) {
  const segmentCount = points.length - 1;
  const scaledFraction = clamp(fraction, 0, 1) * segmentCount;
  const segmentIndex = Math.min(Math.floor(scaledFraction), segmentCount - 1);
  const segmentFraction = scaledFraction - segmentIndex;
  return {
    x: lerp(
      points[segmentIndex].x,
      points[segmentIndex + 1].x,
      segmentFraction
    ),
    y: lerp(
      points[segmentIndex].y,
      points[segmentIndex + 1].y,
      segmentFraction
    ),
  };
}

/**
 * The glow that surrounds the smartbar input. Drawn as one SVG polygon
 * filled with a gradient and softly blurred, so it shows as a halo of
 * colored light rather than a hard shape.
 *
 * The polygon reacts to the cursor in three ways at once:
 *   1. Its shape blends between three keyframes: REST (cursor far / input
 *      focused), LEFT (cursor on the bar's left side), and RIGHT (cursor
 *      on the right side).
 *   2. Two glowing "bumps" react to the cursor on hover. They rest
 *      at the polygon's TL and BR corners and rush toward the cursor as it gets closer.
 *
 * When the cursor leaves (or the input gains focus), everything eases
 * back to the REST shape.
 *
 * SVG is used rather than a CSS/div approach because the shape is
 * cursor-driven and computed fresh every frame: bump positions, corner
 * pull, and keyframe blending all depend on live cursor coordinates and
 * cannot be expressed as CSS transitions between predefined states.
 *
 * SVG is preferred over canvas because only one thing changes in JS per
 * frame: the path's `d` attribute. Canvas would require explicit API calls
 * each frame to clear, recreate the gradient object, and refill the path.
 * The blur is applied as a CSS filter on the SVG element so it runs on the
 * compositor.
 *
 * The component uses a self-scheduling animation loop (#tick) that only
 * re-queues itself when animated state is still changing. When all
 * values have settled the loop goes idle, making no further animation
 * frame requests until the next external trigger (mouse move, resize, etc.).
 */
export class SmartwindowSmartbarGlow extends MozLitElement {
  // ── Private fields ──────────────────────────────────────────────────────────

  /** @type {Element|null} */
  #svgElement = null;
  /** @type {Element|null} */
  #pathElement = null;
  #animationFrameId = 0;
  /** @type {nsIDOMWindowUtils|null} */
  #winUtils = null;

  // Cursor position in viewport coordinates. Initialized far off-screen so
  // the glow starts at REST with no apparent cursor engagement.
  #cursorX = -9999;
  #cursorY = -9999;

  // Animated state — each value is lerped toward its target every frame.
  //   bias:         where the cursor is along the bar: -1 = far left, +1 = far right.
  //                 Controls which keyframe shape the polygon blends toward.
  //   engagement:   how much the cursor has activated the glow: 0 = cursor far away, 1 = cursor on the bar.
  //   cornerSpread:  0 = TL/BR corners tucked inside the bar.
  //                  1 = TL/BR at their REST bleed positions.
  //                  Snaps to 0 when [open] closes so the spread animation
  //                  replays on the next appearance (see #syncStateFromParent).

  #bias = -1;
  #engagement = 0;
  #cornerSpread = 0;
  #topBumpX = 0;
  #bottomBumpX = 0;

  #isFocused = false;
  #parentWasOpen = false;
  /** @type {MutationObserver|null} */
  #attributeObserver = null;
  static OBSERVED_PARENT_ATTRIBUTES = ["focused", "open"];

  #boundMouseMove;
  #boundTick;
  #lastTickSnapshot = "";
  #lastTickTime = 0;
  #hostWidth = 0;
  #hostHeight = 0;

  /** @type {Element|null} */
  #referenceElement = null;

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  constructor() {
    super();
    // Bind once so the same function reference is used for both
    // addEventListener and removeEventListener.
    this.#boundMouseMove = /** @param {MouseEvent} event */ event =>
      this.#onMouseMove(event);
    this.#boundTick = timestamp => this.#tick(timestamp);
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("mousemove", this.#boundMouseMove);
    this.#scheduleTick();

    if (this.parentElement) {
      // Watch the parent for the attribute changes that affect glow state.
      this.#attributeObserver = new MutationObserver(() =>
        this.#syncStateFromParent()
      );
      this.#attributeObserver.observe(this.parentElement, {
        attributes: true,
        attributeFilter: SmartwindowSmartbarGlow.OBSERVED_PARENT_ATTRIBUTES,
      });
      this.#syncStateFromParent();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("mousemove", this.#boundMouseMove);
    cancelAnimationFrame(this.#animationFrameId);
    this.#attributeObserver?.disconnect();
    this.#attributeObserver = null;
    // Drop the cached windowUtils so it's re-acquired on reconnect; it is
    // per-window and would be stale if the element moves to another document.
    this.#winUtils = null;
  }

  firstUpdated() {
    // Grab handles to the SVG elements rendered inside the shadow root.
    this.#svgElement = this.renderRoot.querySelector(".glow-svg");
    this.#pathElement = this.renderRoot.querySelector(".glow-path");
    // Sync now that we have handles on the SVG elements — parent state
    // already present needs to be read before the first tick fires.
    this.#syncStateFromParent();
    this.#scheduleTick();
  }

  // ── External API ─────────────────────────────────────────────────────────────

  /**
   * The element whose bounds drive the glow geometry. Set once by the
   * parent component (SmartbarInput) after connecting.
   */
  get referenceElement() {
    return this.#referenceElement;
  }
  /** @param {Element|null} value */
  set referenceElement(value) {
    this.#referenceElement = value;
    this.#scheduleTick();
  }

  // ── Internal (execution order) ───────────────────────────────────────────────

  /**
   * Reads observed parent attributes into local state and kicks the tick.
   * Called on connect and again whenever a watched attribute changes.
   *
   * [focused] puts the glow into REST (no engagement, bias resets to -1).
   * [open] hides the glow via CSS; when it is removed #cornerSpread snaps to 0
   * so the corner spread animation replays on the next appearance.
   */
  #syncStateFromParent() {
    const parentEl = this.parentElement;
    if (!parentEl) {
      return;
    }
    this.#isFocused = parentEl.hasAttribute("focused");
    const isOpen = parentEl.hasAttribute("open");
    if (this.#parentWasOpen && !isOpen) {
      this.#cornerSpread = 0;
    }
    this.#parentWasOpen = isOpen;

    if (isOpen) {
      window.removeEventListener("mousemove", this.#boundMouseMove);
    } else {
      window.addEventListener("mousemove", this.#boundMouseMove);
    }

    this.#scheduleTick();
  }

  /** @param {MouseEvent} event */
  #onMouseMove(event) {
    this.#cursorX = event.clientX;
    this.#cursorY = event.clientY;
    this.#scheduleTick();
  }

  /** Queues an animation frame if one isn't already pending. */
  #scheduleTick() {
    if (!this.#animationFrameId) {
      this.#animationFrameId = requestAnimationFrame(this.#boundTick);
    }
  }

  /**
   * Main animation loop — runs at most once per frame. Each call:
   *   1. Reads layout bounds without forcing a reflow.
   *   2. Computes cursor proximity and its normalized position along the bar.
   *   3. Lerps all animated values one step toward their targets.
   *   4. Writes the new polygon path to the SVG element.
   *   5. Reschedules itself only if any value is still changing.
   *
   * @param {DOMHighResTimeStamp} timestamp
   */
  #tick(timestamp) {
    this.#animationFrameId = 0;

    if (!this.referenceElement || !this.#pathElement || !this.#svgElement) {
      return;
    }

    // How many milliseconds have passed since the last frame. Capped at 100ms
    // to avoid a large animation jump when the tab returns from the background.
    const elapsed = this.#lastTickTime
      ? Math.min(timestamp - this.#lastTickTime, 100)
      : 1000 / 60;
    this.#lastTickTime = timestamp;
    // Scales a smoothing constant so the animation runs at the same speed
    // regardless of display refresh rate. At 60 Hz this returns the constant
    // unchanged; at 120 Hz it returns a smaller value so each tick moves less
    // but there are twice as many ticks, keeping the overall feel identical.
    const BASE_FRAME_MS = 1000 / 60;
    const adjustForFrameTime = smoothing =>
      1 - (1 - smoothing) ** (elapsed / BASE_FRAME_MS);

    // 1. Read layout bounds without triggering a reflow.
    const winUtils = (this.#winUtils ??= this.documentGlobal.windowUtils);
    const hostRect = winUtils.getBoundsWithoutFlushing(this);
    const referenceRect = winUtils.getBoundsWithoutFlushing(
      this.referenceElement
    );
    const hostWidth = hostRect.width;
    const hostHeight = hostRect.height;

    if (!hostWidth || !hostHeight) {
      return;
    }

    // Update the SVG viewBox only when the host dimensions change.
    if (hostWidth !== this.#hostWidth || hostHeight !== this.#hostHeight) {
      this.#hostWidth = hostWidth;
      this.#hostHeight = hostHeight;
      this.#svgElement.setAttribute(
        "viewBox",
        `0 0 ${hostWidth} ${hostHeight}`
      );
    }

    // 2a. Express the reference bar's edges in host-local coordinates so all
    //     subsequent math stays in the same coordinate space.
    const leftEdge = referenceRect.left - hostRect.left;
    const topEdge = referenceRect.top - hostRect.top;
    const rightEdge = leftEdge + referenceRect.width;
    const bottomEdge = topEdge + referenceRect.height;

    const cursorHostX = this.#cursorX - hostRect.left;
    const cursorHostY = this.#cursorY - hostRect.top;

    // 2b. Compute how far outside the bar's bounding box the cursor is.
    //     Each axis contributes only the amount it overshoots the box;
    //     inside the box each axis contributes 0. Combined as Euclidean
    //     distance to get a single "distance to bar" value.
    const horizontalOvershoot = Math.max(
      0,
      leftEdge - cursorHostX,
      cursorHostX - rightEdge
    );
    const verticalOvershoot = Math.max(
      0,
      topEdge - cursorHostY,
      cursorHostY - bottomEdge
    );
    const distanceToReference = Math.sqrt(
      horizontalOvershoot * horizontalOvershoot +
        verticalOvershoot * verticalOvershoot
    );
    const isCursorInside = distanceToReference === 0;

    // proximity: 1.0 when the cursor is on the bar, falling linearly to 0
    // at PROXIMITY_THRESHOLD_PX away, and 0 beyond that.
    const proximity = isCursorInside
      ? 1
      : Math.max(0, 1 - distanceToReference / PROXIMITY_THRESHOLD_PX);

    const referenceWidth = Math.max(1, rightEdge - leftEdge);
    // cursorTInBar: 0 at the bar's left edge, 1 at the right.
    const cursorTInBar = clamp((cursorHostX - leftEdge) / referenceWidth, 0, 1);

    // bias drives the LEFT/RIGHT blend (-1 = full LEFT, +1 = full RIGHT).
    // engagement drives how much the cursor has activated the glow (0 = REST, 1 = fully engaged).
    let biasTarget = cursorTInBar * 2 - 1;
    let engagementTarget = proximity;

    if (this.#isFocused) {
      biasTarget = -1;
      engagementTarget = 0;
    } else if (proximity <= 0) {
      biasTarget = -1;
    }

    // 3. Lerp all animated values one step toward their targets.
    this.#bias +=
      (biasTarget - this.#bias) * adjustForFrameTime(POSITION_SMOOTHING);
    this.#engagement +=
      (engagementTarget - this.#engagement) *
      adjustForFrameTime(ALPHA_SMOOTHING);
    this.#cornerSpread +=
      (1 - this.#cornerSpread) * adjustForFrameTime(CORNER_SPREAD_SMOOTHING);

    // Bump x-positions follow the cursor but lag behind via BUMP_FOLLOW_SMOOTHING,
    // so they look like lights rushing in to meet the cursor rather than
    // teleporting there.
    const topBumpRestX = leftEdge + POLYGON_REST[0].x * referenceWidth;
    const bottomBumpRestX = leftEdge + POLYGON_REST[3].x * referenceWidth;
    const topBumpTargetX = lerp(topBumpRestX, cursorHostX, this.#engagement);
    const bottomBumpTargetX = lerp(
      bottomBumpRestX,
      cursorHostX,
      this.#engagement
    );
    this.#topBumpX +=
      (topBumpTargetX - this.#topBumpX) *
      adjustForFrameTime(BUMP_FOLLOW_SMOOTHING);
    this.#bottomBumpX +=
      (bottomBumpTargetX - this.#bottomBumpX) *
      adjustForFrameTime(BUMP_FOLLOW_SMOOTHING);

    // 4. Build and write the new polygon path.
    this.#pathElement.setAttribute(
      "d",
      this.#buildPath(
        leftEdge,
        topEdge,
        referenceWidth,
        bottomEdge - topEdge,
        cursorHostX,
        cursorHostY
      )
    );

    // 5. Keep the loop running only while something is still visually changing.
    //    Comparing a string of all animated values is cheaper than tracking each
    //    one individually. When the string matches the previous frame the loop
    //    goes idle until the next external trigger (mouse move, resize, etc.).
    const snapshot = [
      this.#bias.toFixed(3),
      this.#engagement.toFixed(3),
      this.#cornerSpread.toFixed(3),
      this.#topBumpX.toFixed(1),
      this.#bottomBumpX.toFixed(1),
      hostWidth.toFixed(0),
      hostHeight.toFixed(0),
    ].join(",");
    if (snapshot !== this.#lastTickSnapshot) {
      this.#lastTickSnapshot = snapshot;
      this.#scheduleTick();
    }
  }

  /**
   * Computes the SVG path string for the polygon this frame. For each anchor
   * point, blends between the REST and LEFT/RIGHT keyframes based on cursor
   * position, then nudges the point toward the cursor for a subtle lean. Two
   * bell-curve bumps are then traced along the top and bottom edges, sliding
   * toward the cursor as it gets closer.
   *
   * @param {number} barLeft
   * @param {number} barTop
   * @param {number} barWidth
   * @param {number} barHeight
   * @param {number} cursorHostX
   * @param {number} cursorHostY
   * @returns {string}
   */
  #buildPath(barLeft, barTop, barWidth, barHeight, cursorHostX, cursorHostY) {
    const sideBlend = (this.#bias + 1) / 2;
    const cornerPull = this.#engagement * MAX_CORNER_PULL;

    // For each of the six polygon anchors, blend between REST and the
    // LEFT/RIGHT keyframes, then nudge the result toward the cursor to
    // create the subtle lean.
    const anchors = POLYGON_REST.map((restAnchor, anchorIndex) => {
      const sideX = lerp(
        POLYGON_LEFT[anchorIndex].x,
        POLYGON_RIGHT[anchorIndex].x,
        sideBlend
      );
      const sideY = lerp(
        POLYGON_LEFT[anchorIndex].y,
        POLYGON_RIGHT[anchorIndex].y,
        sideBlend
      );
      const blendedFractionX = lerp(restAnchor.x, sideX, this.#engagement);
      const blendedFractionY = lerp(restAnchor.y, sideY, this.#engagement);
      const baseX = barLeft + blendedFractionX * barWidth;
      const baseY = barTop + blendedFractionY * barHeight;
      return {
        x: lerp(baseX, cursorHostX, cornerPull),
        y: lerp(baseY, cursorHostY, cornerPull),
      };
    });

    // While #cornerSpread < 1, push TL inward (down-right) and BR inward
    // (up-left) so the corners look like they're growing back into place
    // as the glow fades in.
    const spreadOffset = (1 - this.#cornerSpread) * CORNER_SPREAD_PUSH_PX;
    if (spreadOffset > 0.01) {
      anchors[0].x += spreadOffset;
      anchors[0].y += spreadOffset;
      anchors[3].x -= spreadOffset;
      anchors[3].y -= spreadOffset;
    }

    const topEdge = [anchors[0], anchors[1], anchors[2]];
    const bottomEdge = [anchors[3], anchors[4], anchors[5]];

    // Ease the bump height to zero as the cursor approaches either horizontal
    // edge so bumps don't stack awkwardly against the corners.
    const distFromHorizEdge = Math.max(
      0,
      Math.min(cursorHostX - barLeft, barLeft + barWidth - cursorHostX)
    );
    const edgeFadeRatio = clamp(distFromHorizEdge / EDGE_FADE_PX, 0, 1);
    const bumpHeightScale =
      edgeFadeRatio * edgeFadeRatio * (3 - 2 * edgeFadeRatio);

    const peakAmplitude =
      this.#engagement * bumpHeightScale * BUMP_AMPLITUDE_PX;

    // Walk each edge at evenly-spaced points and displace each point up or
    // down by a bell-curve-shaped bump centered at bumpX. bumpDirection is
    // -1 for the top edge (bump pokes upward) and 1 for the bottom (downward).
    // "M" starts the SVG path; subsequent points use "L" to draw lines between them.
    const pathSegments = [];
    const traceEdge = (edge, bumpX, bumpDirection) => {
      for (let sampleIndex = 0; sampleIndex <= EDGE_SAMPLES; sampleIndex++) {
        const sampleFraction = sampleIndex / EDGE_SAMPLES;
        const samplePoint = samplePolyline(edge, sampleFraction);
        const offsetFromBumpX = samplePoint.x - bumpX;
        const bumpHeight =
          peakAmplitude *
          Math.exp(
            -(offsetFromBumpX * offsetFromBumpX) / BUMP_GAUSSIAN_DENOMINATOR
          );
        const x = samplePoint.x.toFixed(2);
        const y = (samplePoint.y + bumpDirection * bumpHeight).toFixed(2);
        const command = pathSegments.length ? "L" : "M";
        pathSegments.push(`${command}${x},${y}`);
      }
    };

    traceEdge(topEdge, this.#topBumpX, -1);
    traceEdge(bottomEdge, this.#bottomBumpX, 1);
    pathSegments.push("Z");
    return pathSegments.join("");
  }

  // ── Rendering ────────────────────────────────────────────────────────────────

  // The stop offset tokens should always sync with --smartbar-border-color-gradient in smartbar.css
  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/aiwindow/components/smartwindow-smartbar-glow.css"
      />
      ${svg`
        <svg
          class="glow-svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id="smartbar-glow-gradient"
              gradientUnits="objectBoundingBox"
              gradientTransform="rotate(5 0.5 0.5)"
              x1="0" y1="0" x2="1" y2="0"
            >
              <stop offset="0.0122" stop-color="var(--color-violet-50)"/>
              <stop offset="0.4998" stop-color="var(--color-pink-40)"/>
              <stop offset="0.9968" stop-color="var(--color-yellow-30)"/>
            </linearGradient>
          </defs>
          <path
            class="glow-path"
            fill="url(#smartbar-glow-gradient)"
          />
        </svg>
      `}
    `;
  }
}

customElements.define("smartwindow-smartbar-glow", SmartwindowSmartbarGlow);

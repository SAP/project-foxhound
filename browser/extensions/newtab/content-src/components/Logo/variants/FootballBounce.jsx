/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * @backward-compat { version 153 }
 * The entire logo-variation feature can be removed after Firefox 153 hits
 * Release, when the 2026 World Cup is over. Delete this file, the
 * `football-bounce` entry in `LOGO_VARIATIONS` (in `Logo.jsx`), the
 * `football-bounce.webp` asset under `data/content/assets/`, and the
 * `logo.variation` pref entry in `ActivityStream.sys.mjs`.
 */

import React, { useEffect, useRef, useState } from "react";

const SPRITE_URL =
  "chrome://newtab/content/data/content/assets/football-bounce.webp";

// 56 frames laid out as an 8-column x 7-row grid of 480x270 cells inside a
// 3840x1890 sprite sheet. Each value is "<x> <y>" in source-image pixels.
// Read in scanline order: top-left across to top-right, then row by row down
// to bottom-right.
const TRANSFORM_VALUES =
  "0 0;-480 0;-960 0;-1440 0;-1920 0;-2400 0;-2880 0;-3360 0;0 -270;-480 -270;-960 -270;-1440 -270;-1920 -270;-2400 -270;-2880 -270;-3360 -270;0 -540;-480 -540;-960 -540;-1440 -540;-1920 -540;-2400 -540;-2880 -540;-3360 -540;0 -810;-480 -810;-960 -810;-1440 -810;-1920 -810;-2400 -810;-2880 -810;-3360 -810;0 -1080;-480 -1080;-960 -1080;-1440 -1080;-1920 -1080;-2400 -1080;-2880 -1080;-3360 -1080;0 -1350;-480 -1350;-960 -1350;-1440 -1350;-1920 -1350;-2400 -1350;-2880 -1350;-3360 -1350;0 -1620;-480 -1620;-960 -1620;-1440 -1620;-1920 -1620;-2400 -1620;-2880 -1620;-3360 -1620";

/**
 * The "football bounce" logo variation. Windows onto a 3840x1890 WebP
 * sprite sheet (56 frames, 8 columns x 7 rows of 480x270 cells). Unlike
 * the square logo variations, each cell is 16:9 — the animation is
 * deliberately wider and taller than the logo slot. To avoid disturbing
 * the surrounding layout the outer element is a fixed-size container
 * matching the standard logo slot, and the SVG inside it renders at the
 * sprite's natural cell size (480x270) and overflows the container so
 * the football's bounce trajectory can extend beyond the standard logo
 * bounds. The container's `overflow: visible` plus the SVG's absolute
 * positioning are defined in `_FootballBounce.scss`; aligning the
 * sprite's "rest" cell to the standard logo position is a job for those
 * CSS offsets.
 *
 * LTR only: the football bounces left-to-right, which would read
 * incorrectly when mirrored for RTL. The variation registry sets
 * `requiresLTR: true` and falls back to `spin-smooth` in RTL locales.
 *
 * The WebP is served from
 * `chrome://newtab/content/data/content/assets/football-bounce.webp` —
 * `chrome:` is permitted by the newtab CSP's `img-src` list. A single
 * SMIL `<animateTransform>` element pans the image through all 56 cells
 * in 3.752 seconds. `fill="freeze"` keeps the final cell (bottom-right
 * of the sprite — the "rest" pose) visible after the animation ends,
 * unlike the other variations which return to frame 0 via the default
 * `fill="remove"`.
 *
 * Click semantics match the other click-triggered variations:
 *  - First click plays the animation.
 *  - Clicks while the animation is in flight are ignored.
 *  - Clicks after the animation finishes replay it cleanly (SMIL
 *    `restart="always"` default means `beginElement()` rewinds to t=0).
 *  - Clicks under `prefers-reduced-motion: reduce` are a no-op.
 *
 * The click target is the 64x64 container, not the wider SVG — so only
 * the logo-slot area triggers replay, not the airborne football itself.
 *
 * @returns {React.ReactElement} The container div wrapping the
 *   sprite-window SVG and its indefinitely-begun SMIL animation.
 */
function FootballBounce() {
  const animRef = useRef(null);
  const isRunningRef = useRef(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const anim = animRef.current;
    if (!anim) {
      return undefined;
    }
    const onBegin = () => {
      isRunningRef.current = true;
      setIsAnimating(true);
    };
    const onEnd = () => {
      isRunningRef.current = false;
      setIsAnimating(false);
    };
    anim.addEventListener("beginEvent", onBegin);
    anim.addEventListener("endEvent", onEnd);
    return () => {
      anim.removeEventListener("beginEvent", onBegin);
      anim.removeEventListener("endEvent", onEnd);
    };
  }, []);

  /**
   * Plays the SMIL animation once, unless the user has reduced motion
   * enabled or the animation is already running.
   */
  const handleClick = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    if (!animRef.current || isRunningRef.current) {
      return;
    }
    animRef.current.beginElement();
  };

  return (
    <div
      className={`logo-variation-small football-bounce${isAnimating ? " is-animating" : ""}`}
      onClick={handleClick}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 480 270"
        width="480"
        height="270"
        className="football-bounce__sprite"
        aria-hidden="true"
      >
        {/*
          The inline transform on this <g> shows the sprite's "rest" cell
          (bottom-right, the freeze-end pose) by default so the
          before-first-click state matches the after-animation state. The
          SMIL `<animateTransform>` below overrides this attribute while
          running; its first value is "0 0" (sprite cell 0,0), so clicking
          visibly snaps the football to the start of the bounce, plays
          through, and lands back at this same rest pose.
        */}
        <g transform="translate(-3360 -1620)">
          <image
            width="3840"
            height="1890"
            x="0"
            y="0"
            imageRendering="optimizeQuality"
            href={SPRITE_URL}
          />
          <animateTransform
            ref={animRef}
            attributeName="transform"
            type="translate"
            calcMode="discrete"
            dur="3.752s"
            begin="indefinite"
            fill="freeze"
            values={TRANSFORM_VALUES}
          />
        </g>
      </svg>
    </div>
  );
}

export { FootballBounce };

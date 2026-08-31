/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * @backward-compat { version 153 }
 * The entire logo-variation feature can be removed after Firefox 153 hits
 * Release, when the 2026 World Cup is over. Delete this file, the
 * `rotating-ball` entry in `LOGO_VARIATIONS` (in `Logo.jsx`), the
 * `rotating-ball.webp` asset under `data/content/assets/`, and the
 * `logo.variation` pref entry in `ActivityStream.sys.mjs`.
 */

import React, { useEffect, useRef, useState } from "react";

const SPRITE_URL =
  "chrome://newtab/content/data/content/assets/rotating-ball.webp";

// 30 frames (one entry per sprite cell).
const TRANSFORM_VALUES =
  "0,0;-200,0;-400,0;-600,0;-800,0;-1000,0;-1200,0;-1400,0;-1600,0;-1800,0;-2000,0;-2200,0;-2400,0;-2600,0;-2800,0;-3000,0;-3200,0;-3400,0;-3600,0;-3800,0;-4000,0;-4200,0;-4400,0;-4600,0;-4800,0;-5000,0;-5200,0;-5400,0;-5600,0;-5800,0";

/**
 * The "rotating ball" logo variation. Renders a 200x200 SVG that windows
 * onto a 6000x200 WebP sprite sheet (30 frames in a single row, each
 * 200x200 to match `spin-smooth.webp`). The WebP is served from
 * `chrome://newtab/content/data/content/assets/rotating-ball.webp` —
 * `chrome:` is permitted by the newtab CSP's `img-src` list. A SMIL
 * `<animateTransform>` element pans the image through all 30 frames in
 * 2.9333 seconds. The animation runs **on click**, not automatically —
 * it's authored with `begin="indefinite"` and triggered via
 * `beginElement()` from the click handler. Default `fill="remove"` means
 * the sprite snaps back to frame 0 once the animation completes, ready
 * for the next click.
 *
 * Click semantics match the other click-triggered variations:
 *  - First click plays the animation.
 *  - Clicks while the animation is in flight are ignored (so the sprite
 *    doesn't jump back mid-spin).
 *  - Clicks after the animation finishes replay it cleanly.
 *  - Clicks under `prefers-reduced-motion: reduce` are a no-op; the SVG
 *    stays at frame 0 (left-most cell of the sprite). This preserves the
 *    visual presence and click affordance for reduced-motion users
 *    without forcing them through the spin.
 *
 * @returns {React.ReactElement} The SVG element wrapping the sprite +
 *   the indefinitely-begun SMIL animation.
 */
function RotatingBall() {
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
   * enabled or the animation is already running. `beginElement()` is the
   * SMIL equivalent of `Animation.play()` for the Web Animations API.
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
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      className={`logo-variation-small rotating-ball${isAnimating ? " is-animating" : ""}`}
      aria-hidden="true"
      onClick={handleClick}
    >
      <defs>
        <clipPath id="rotating-ball-clip">
          <rect x="0" y="0" width="200" height="200" />
        </clipPath>
      </defs>
      <g clipPath="url(#rotating-ball-clip)">
        <g>
          <image
            width="6000"
            height="200"
            imageRendering="smooth"
            href={SPRITE_URL}
          />
          <animateTransform
            ref={animRef}
            attributeName="transform"
            type="translate"
            calcMode="discrete"
            dur="2.9333s"
            begin="indefinite"
            values={TRANSFORM_VALUES}
          />
        </g>
      </g>
    </svg>
  );
}

export { RotatingBall };

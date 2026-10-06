/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * @backward-compat { version 153 }
 * The entire logo-variation feature can be removed after Firefox 153 hits
 * Release, when the 2026 World Cup is over. Delete this file, the
 * `spin-smooth` entry in `LOGO_VARIATIONS` (in `Logo.jsx`), the
 * `spin-smooth.webp` asset under `data/content/assets/`, and the
 * `logo.variation` pref entry in `ActivityStream.sys.mjs`.
 */

import React, { useEffect, useRef, useState } from "react";

const SPRITE_URL =
  "chrome://newtab/content/data/content/assets/spin-smooth.webp";

const TRANSFORM_VALUES =
  "0 0;-200 0;-400 0;-600 0;-800 0;-1000 0;0 -200;-200 -200;-400 -200;-600 -200;-800 -200;-1000 -200;0 -400;-200 -400;-400 -400;-600 -400;-800 -400;-1000 -400;0 -600;-200 -600;-400 -600;-600 -600;-800 -600;-1000 -600;0 -800;-200 -800;-400 -800;-600 -800;-800 -800;-1000 -800;0 -1000;-200 -1000;-400 -1000;-600 -1000;-800 -1000;-1000 -1000;0 -1200;-200 -1200;-400 -1200;-600 -1200;-800 -1200;-1000 -1200;0 -1400;-200 -1400;-400 -1400;-600 -1400;-800 -1400;-1000 -1400;0 -1600;-200 -1600;-400 -1600;-600 -1600;-800 -1600;-1000 -1600;0 -1800;-200 -1800;-400 -1800;-600 -1800;-800 -1800;-1000 -1800";

/**
 * The "logo spin smooth" logo variation. Renders a 200x200 SVG that
 * windows onto a 1200x2000 WebP sprite sheet (60 frames, 6 columns x
 * 10 rows). The WebP is served from
 * `chrome://newtab/content/data/content/assets/spin-smooth.webp` —
 * `chrome:` is permitted by the newtab CSP's `img-src` list. A SMIL
 * `<animateTransform>` element pans the image through all 60 cells in
 * 6.67 seconds. The animation runs **on click**, not automatically — it's
 * authored with `begin="indefinite"` and triggered via `beginElement()`
 * from the click handler below. Default `fill="remove"` means the sprite
 * snaps back to frame 0 once the animation completes, ready for the next
 * click.
 *
 * Click semantics match `<SpinBallSmall>`:
 *  - First click plays the animation.
 *  - Clicks while the animation is in flight are ignored (so the sprite
 *    doesn't jump back mid-spin).
 *  - Clicks after the animation finishes replay it cleanly.
 *  - Clicks under `prefers-reduced-motion: reduce` are a no-op; the SVG
 *    stays at frame 0 (top-left cell of the sprite). This preserves the
 *    visual presence and click affordance for reduced-motion users
 *    without forcing them through the spin.
 *
 * The variation has no script: the only JS involvement is in the React
 * click handler. The animation itself is SMIL-declarative.
 *
 * @returns {React.ReactElement} The SVG element wrapping the sprite +
 *   the indefinitely-begun SMIL animation.
 */
function SpinSmooth() {
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
      className={`logo-variation-small spin-smooth${isAnimating ? " is-animating" : ""}`}
      aria-hidden="true"
      onClick={handleClick}
    >
      <defs>
        <clipPath id="spin-smooth-clip">
          <rect x="0" y="0" width="200" height="200" />
        </clipPath>
      </defs>
      <g clipPath="url(#spin-smooth-clip)">
        <g>
          <image width="1200" height="2000" x="0" y="0" href={SPRITE_URL} />
          <animateTransform
            ref={animRef}
            attributeName="transform"
            type="translate"
            calcMode="discrete"
            dur="6.67s"
            begin="indefinite"
            values={TRANSFORM_VALUES}
          />
        </g>
      </g>
    </svg>
  );
}

export { SpinSmooth };

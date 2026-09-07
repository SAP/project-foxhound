/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * @backward-compat { version 153 }
 * The entire logo-variation feature can be removed after Firefox 153 hits
 * Release, when the 2026 World Cup is over. Delete this file, the
 * `logo-variation-small`/`spin-ball-small` SCSS blocks plus their
 * `@keyframes`, the `logo.variation` pref entry in
 * `ActivityStream.sys.mjs`, and the logo-variation selection logic in
 * `Logo.jsx` (Logo reverts to its original default-only rendering).
 */

import React, { useEffect, useRef, useState } from "react";

/**
 * The "spin ball, small" logo variation. Renders the supplied animated
 * Firefox SVG (inline JSX) into the newtab logo slot. The SVG is purely
 * decorative — it's `aria-hidden`, has no interactive ARIA role, and is not
 * keyboard-focusable. Mouse users discover the click affordance via
 * `cursor: pointer` (defined in `_Logo.scss`).
 *
 * All animations declared on the SVG's children load `paused` (per the
 * `animation-play-state: paused` rule in `_Logo.scss`). They begin running
 * on the first click and re-run on each subsequent click (see the click
 * handler below).
 *
 * @returns {React.ReactElement} The animated SVG element.
 */
function SpinBallSmall() {
  const svgRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Track whether any of the SVG's CSS animations are in flight. The SVG
  // contains four parallel animations (spin, blur, classic-fade, nova-fade);
  // count starts and ends so we only clear `isAnimating` once they're all
  // done. CSS `animationstart`/`animationend` events bubble from the
  // animated children up to the SVG ref.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) {
      return undefined;
    }
    let inflight = 0;
    const onStart = () => {
      inflight += 1;
      setIsAnimating(true);
    };
    const onEnd = () => {
      inflight = Math.max(0, inflight - 1);
      if (inflight === 0) {
        setIsAnimating(false);
      }
    };
    svg.addEventListener("animationstart", onStart);
    svg.addEventListener("animationend", onEnd);
    return () => {
      svg.removeEventListener("animationstart", onStart);
      svg.removeEventListener("animationend", onEnd);
    };
  }, []);

  /**
   * Plays every CSS animation declared on the SVG (and its descendants),
   * resetting them to t=0 first so the cross-fade between the classic and
   * "nova" Firefox icons stays synchronised across replays.
   *
   * Two guards:
   *  - `prefers-reduced-motion: reduce` short-circuits without invoking
   *    `play()`. The SVG remains visible at its frame-0 keyframe state
   *    (effectively the static Firefox logo), preserving the click
   *    affordance for users who have reduced motion enabled while
   *    honouring their preference.
   *  - `playState !== "running"` makes the variation one-shot per click.
   *    Clicking again while the animation is in flight does nothing;
   *    clicking after it finishes restarts cleanly thanks to the
   *    explicit `currentTime = 0` reset.
   */
  const handleClick = () => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const animations = svg.getAnimations({ subtree: true });
    if (animations.length && animations[0].playState !== "running") {
      animations.forEach(a => {
        a.currentTime = 0;
        a.play();
      });
    }
  };

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1000 1000"
      className={`logo-variation-small spin-ball-small${isAnimating ? " is-animating" : ""}`}
      aria-hidden="true"
      onClick={handleClick}
    >
      <defs>
        <linearGradient
          id="spin-ball-small-gradient-0"
          x1="309.4"
          y1="12.5"
          x2="368.1"
          y2="337.9"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#fff44f" />
          <stop offset=".3" stopColor="#ffd94d" />
          <stop offset=".7" stopColor="#ffb04b" />
          <stop offset="1" stopColor="#ff980e" />
        </linearGradient>
        <linearGradient
          id="spin-ball-small-gradient-1"
          x1=".4"
          y1="397.2"
          x2="55.6"
          y2="397.2"
          gradientUnits="userSpaceOnUse"
          gradientTransform="matrix(1 0 0 -1 0 523.6)"
        >
          <stop offset=".2" stopColor="#af16c0" />
          <stop offset=".9" stopColor="#00053d" />
        </linearGradient>
        <linearGradient
          id="spin-ball-small-gradient-2"
          x1="283.1"
          y1="397.1"
          x2="338.1"
          y2="397.1"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset=".2" stopColor="#af16c0" />
          <stop offset=".9" stopColor="#00053d" />
        </linearGradient>
        <linearGradient
          id="spin-ball-small-gradient-3"
          x1="112.2"
          y1="498.8"
          x2="226.6"
          y2="498.8"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset=".2" stopColor="#af16c0" />
          <stop offset=".9" stopColor="#00053d" />
        </linearGradient>
        <linearGradient
          id="spin-ball-small-gradient-4"
          x1="39.6"
          y1="236.6"
          x2="134.2"
          y2="236.6"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset=".2" stopColor="#af16c0" />
          <stop offset=".9" stopColor="#00053d" />
        </linearGradient>
        <linearGradient
          id="spin-ball-small-gradient-5"
          x1="204.5"
          y1="236.8"
          x2="299.2"
          y2="236.8"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset=".2" stopColor="#af16c0" />
          <stop offset=".9" stopColor="#00053d" />
        </linearGradient>
        <linearGradient
          id="spin-ball-small-gradient-6"
          x1="112.6"
          y1="359.2"
          x2="226.1"
          y2="359.2"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset=".2" stopColor="#af16c0" />
          <stop offset=".9" stopColor="#00053d" />
        </linearGradient>
        <linearGradient
          id="spin-ball-small-gradient-7"
          x1="-137.6"
          y1="457.7"
          x2="-0.8"
          y2="320.9"
          gradientUnits="userSpaceOnUse"
          gradientTransform="matrix(.7 .7 .7 -0.7 -226.3 307.5)"
        >
          <stop offset="0" stopColor="#929497" />
          <stop offset="1" stopColor="#929497" />
        </linearGradient>
        <linearGradient
          id="spin-ball-small-gradient-8"
          x1="-49.2"
          y1="116.8"
          x2="47"
          y2="-111.8"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset=".3" stopColor="#3a8ee6" />
          <stop offset=".7" stopColor="#9059ff" />
          <stop offset="1" stopColor="#c139e6" />
        </linearGradient>
        <radialGradient
          id="spin-ball-small-gradient-9"
          cx="1.8"
          cy="-36.9"
          r="137.5"
          fx="1.8"
          fy="-36.9"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset=".2" stopColor="#9059ff" stopOpacity="0" />
          <stop offset="1" stopColor="#6e008b" stopOpacity=".6" />
        </radialGradient>
        <radialGradient
          id="spin-ball-small-gradient-10"
          cx="-1767.7"
          cy="2465"
          r="2.9"
          fx="-1767.7"
          fy="2465"
          gradientUnits="userSpaceOnUse"
          gradientTransform="matrix(58.5 0 0 -58.7 103677 144814)"
        >
          <stop offset=".1" stopColor="#ffe226" />
          <stop offset=".8" stopColor="#ff7139" />
        </radialGradient>
        <radialGradient
          id="spin-ball-small-gradient-11"
          cx="-1788.7"
          cy="2446.5"
          r="3.1"
          fx="-1788.7"
          fy="2446.5"
          gradientUnits="userSpaceOnUse"
          gradientTransform="matrix(178.6 0 0 -159.8 319794 391016)"
        >
          <stop offset=".1" stopColor="#fff44f" />
          <stop offset=".6" stopColor="#ff980e" />
        </radialGradient>
        <linearGradient
          id="spin-ball-small-gradient-12"
          x1="420.4"
          y1="80.8"
          x2="71.7"
          y2="389"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset=".1" stopColor="#fff44f" />
          <stop offset=".6" stopColor="#ff980e" />
          <stop offset=".9" stopColor="#ff3647" />
        </linearGradient>
        <linearGradient
          id="spin-ball-small-gradient-13"
          x1="475.9"
          y1="184.4"
          x2="50.9"
          y2="413.4"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#ffe743" />
          <stop offset=".3" stopColor="#ff980e" />
          <stop offset=".5" stopColor="#ff3750" />
          <stop offset=".8" stopColor="#eb0878" />
          <stop offset="1" stopColor="#e50080" />
        </linearGradient>
        <radialGradient
          id="spin-ball-small-gradient-14"
          cx="291.4"
          cy="184"
          r="311.4"
          fx="291.4"
          fy="184"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset=".1" stopColor="#fff44f" />
          <stop offset=".6" stopColor="#ff980e" />
          <stop offset=".8" stopColor="#ff3647" />
        </radialGradient>
      </defs>
      <g className="spin-ball-small__spin">
        <path
          d="M438.4 180.4c-27.2-67.7-73.2-95-110.9-154.5c-1.9-3-3.8-6-5.6-9.2c-1-1.6-1.9-3.3-2.7-4.9c-1.5-3.1-2.8-6.3-3.6-9.6c0-0.3-0.2-0.6-0.5-0.6c-0.2 0-0.3 0-0.4 0c.2-0.1 .4-0.3 .6-0.4c0 0 .1-0.1 .1-0.1c-60.4 35.4-80.9 100.8-82.7 133.5c2.8-0.2 5.5-0.4 8.4-0.4c30.7 0 58.7 11.5 80 30.4c1.2 1.2 2.3 2.4 3.5 3.6c8.8 8.6 16.3 18.4 22.3 29.1c1.3 1 2.6 2 3.6 2.9c54.5 50.2 26 121.2 23.8 126.3c44.3-36.5 72.6-90.4 64.1-146.1Z"
          fill="url(#spin-ball-small-gradient-0)"
        />
        <g
          className="spin-ball-small__classic"
          transform="translate(241.1,255.7) scale(.739424,.739424) translate(-169.3,-169.3)"
        >
          <g data-name="Layer 1">
            <path
              d="M55.6 132.2l-0.2-60c0 0-9.6 1.5-15.6 3.1c-5.4 1.4-14.1 4.3-14.1 4.3c-14.2 22.8-23.2 49.2-25.3 77.5c0 0 5.4 7.6 8.3 11.1c4 4.9 11.5 12.4 11.5 12.4l35.4-48.4Z"
              fill="url(#spin-ball-small-gradient-1)"
            />
            <path
              d="M283.1 132.1l35.4 48.5c0 0 7.2-7.7 11.4-13.3c4.4-5.9 8.2-12.2 8.2-12.2c-2.3-27.4-11.1-53-24.9-75.2c0 0-6.5-2.4-14.6-4.6c-7.5-2-15.3-3.1-15.3-3.1l-0.2 59.9Z"
              fill="url(#spin-ball-small-gradient-2)"
            />
            <path
              d="M169.3 49.5l57.3-18.6c0 0-4.5-8.7-8.5-14.6c-4.6-6.9-8.5-11.5-8.5-11.5c-12.9-3.1-26.4-4.8-40.3-4.8c-13.9 0-27.8 1.7-40.9 5c0 0-5.5 7.5-8.4 11.9c-3.3 5.3-7.8 14-7.8 14l57.1 18.6Z"
              fill="url(#spin-ball-small-gradient-3)"
            />
            <path
              d="M99 265.9l-57.1-18.5c0 0-1.5 10-1.9 15.2c-0.4 5.6-0.4 15.5-0.4 15.5c17.8 21.3 40.7 38.1 66.9 48.5c0 0 7.9-2.5 13.9-5.1c7-3.1 13.8-6.9 13.8-6.9l-35.2-48.7Z"
              fill="url(#spin-ball-small-gradient-4)"
            />
            <path
              d="M239.7 265.9l-35.2 48.7c0 0 7.8 4 13.8 6.5c7.3 2.9 14.8 5.1 14.8 5.1c25.8-10.5 48.4-27.1 66.1-48.1c-0.1 0 .2-8.1-0.3-14.6c-0.6-7.3-2.1-16.1-2.1-16.1l-57.1 18.6Z"
              fill="url(#spin-ball-small-gradient-5)"
            />
            <path
              d="M204.5 314.6c0-0.1 11.4-10.5 20.2-22.8c9.5-13.3 15-25.9 15-25.9l-35.3-48.5h-70.1l-35.3 48.5c0 0 6.3 14.3 14.9 25.9c9.1 12.4 20.3 22.8 20.3 22.8c0 0 15.2 4.3 35.2 4.3c18.5 0 35.1-4.4 35.1-4.4Z"
              fill="#dcdddd"
            />
            <path
              d="M318.5 180.6c0 0-6.1-13.6-15.9-27c-8.6-11.8-19.5-21.5-19.5-21.5l-57 18.6l-21.7 66.7l35.3 48.5c0 0 15.5-1.7 29.6-6.3c15.1-5 27.5-12.2 27.5-12.2c0 0 9-13.9 14.9-31.9c5.9-18 6.8-34.9 6.8-34.9Z"
              fill="#d4d5d5"
            />
            <path
              d="M20.2 180.6c0 0 5.9-13.6 15.2-26.2c9.2-12.5 20.1-22.2 20.1-22.2l57 18.5l21.7 66.7l-35.2 48.5c0 0-14.6-1.5-29.9-6.3c-14.9-4.7-27.3-12.2-27.3-12.2c0 0-9.1-12.9-14.9-31.7c-6.1-19.6-6.7-35.1-6.7-35.1Z"
              fill="#eeefef"
            />
            <path
              d="M55.4 72.2c0 0-3 14.5-3 28.3c0 16.9 3.2 31.7 3.2 31.7l57 18.5l56.7-41.3v-59.9c0 0-12.7-7.4-28.8-12.6c-15-4.9-28.3-6-28.3-6c0 0-14 5-30.5 16.9c-16.2 11.6-26.3 24.4-26.3 24.4Z"
              fill="#f9f9f9"
            />
            <path
              d="M169.3 109.4v-59.9c0 0 13.4-7.7 28.2-12.5c15.4-4.9 29.1-6.2 29.1-6.2c0 0 13.3 5 30.2 16.9c15.5 11 26.5 24.5 26.5 24.5c0 0 3 12.6 3 29.6c0 17-3.2 30.3-3.2 30.3l-57 18.6l-56.8-41.3Z"
              fill="#ececec"
            />
            <path
              d="M134.2 217.4c.1 0-9.8-24.1-13-34c-3.3-10-8.6-32.7-8.6-32.7c0 0 17.7-15.2 27.3-22.3c9.3-6.8 29.4-19 29.4-19c0 0 20.6 12.8 30 19.6c8.7 6.2 26.8 21.7 26.8 21.7c0 0-5.5 22.4-9 33.4c-3.4 11-12.7 33.3-12.7 33.3c0 0-23.3 1.9-35.8 1.9c-11.7 0-34.3-1.9-34.3-1.9Z"
              fill="url(#spin-ball-small-gradient-6)"
            />
            <path
              d="M204.5 314.6v-0.1l-0.1 .1c0-0.1-16.5 4.3-35.1 4.3c-19.9 0-35-4.3-35.1-4.3c0 0-6.8 3.8-13.8 6.9c-6 2.6-13.9 5.1-13.9 5.1c-1.6-0.6 26.4 12.1 62.8 12.1c22.6 0 44.1-4.5 63.8-12.5c0 0-7.6-2.2-14.8-5.1c-6.1-2.4-13.8-6.5-13.8-6.5h-0.1Z"
              fill="#cacbcb"
            />
            <path
              d="M318.5 180.6c0 0-0.9 16.9-6.8 34.9c-5.9 18-14.9 31.9-14.9 31.9c0 0 1.6 8.8 2.1 16.1c.5 6.4 .3 14.5 .3 14.6c24.6-29.5 39.5-67.4 39.5-108.8c0-4.8-0.2-9.5-0.6-14.2c-0.1 .1-3.9 6.4-8.2 12.2c-4.2 5.6-11.4 13.3-11.4 13.3Z"
              fill="#cacbcb"
            />
            <path
              d="M39.6 278.1c0 0 0-9.9 .4-15.5c.3-5.1 1.8-15.1 1.8-15.2c0 0-9.1-12.9-14.9-31.8c-6.1-19.6-6.7-35-6.7-35c0 0-7.5-7.6-11.5-12.4c-2.7-3.3-7.5-10.1-8.3-11.1c-0.2 4.1-0.4 8.1-0.4 12.2c0 62 33.3 116.2 82.9 145.7c-16.4-9.8-31.1-22.3-43.3-36.9Z"
              fill="#f3f4f4"
            />
            <path
              d="M55.4 72.2c0 0 10.1-12.8 26.3-24.4c16.5-11.9 30.5-16.9 30.5-16.9c0 0 4.4-8.8 7.8-14c2.9-4.4 8.4-11.9 8.4-11.9c1.6-0.4 3.3-0.8 4.9-1.2c-45.3 9.8-83.8 37.8-107.6 75.8c1.4-0.4 9.2-3.1 14.1-4.3c5.9-1.6 15.5-3.1 15.6-3.1Z"
              fill="#f6f6f6"
            />
            <path
              d="M226.6 30.9c0 0 13.3 4.9 30.2 16.9c15.5 10.9 26.5 24.4 26.5 24.4c0 0 7.8 1.1 15.3 3.1c8.1 2.2 14.5 4.6 14.6 4.6c-23.1-37-60-64.4-103.6-75.1c.1 .1 3.9 4.6 8.5 11.5c4 5.9 8.4 14.6 8.4 14.6Z"
              fill="#f1f1f1"
            />
            <ellipse
              rx="123.4"
              ry="115.8"
              fill="url(#spin-ball-small-gradient-7)"
              transform="translate(-57.4,146.1) rotate(-45) translate(147.7,142.3)"
              style={{ isolation: "isolate", mixBlendMode: "hard-light" }}
            />
            <path
              d="M338.7 169.3c0 93.5-75.9 169.4-169.4 169.4c-64.5-0.1-120.6-36.2-149.2-89.3c28.8 24.7 66.3 39.7 107.3 39.7c90.8 0 164.4-73.2 164.4-163.4c-0.1-38.6-13.5-74-35.9-101.9c49.5 29.5 82.7 83.7 82.7 145.5h.1Z"
              opacity=".6"
              fill="#696969"
              style={{ isolation: "isolate", mixBlendMode: "hard-light" }}
            />
          </g>
        </g>
        <g className="spin-ball-small__nova">
          <ellipse
            rx="130"
            ry="130"
            fill="url(#spin-ball-small-gradient-8)"
            transform="translate(240,263.6)"
          />
          <ellipse
            rx="130"
            ry="130"
            fill="url(#spin-ball-small-gradient-9)"
            transform="translate(240,263.6)"
          />
        </g>
        <path
          d="M153.6 151.7c1.7 1.1 3.3 2.2 5 3.3c-5.5-19.1-5.7-39.4-0.7-58.7c-24.7 11.2-43.9 29-57.9 44.7c1.2 0 36.1-0.7 53.6 10.7Z"
          fill="url(#spin-ball-small-gradient-10)"
        />
        <path
          d="M132.7 278.5c0 0 11.1-41.4 79.4-41.4c7.4 0 28.5-20.6 28.9-26.6c.4-5.9-43.7 18.4-90.2-3.5c-50.3-23.6-88.4 3.5-88.4 3.5c0 0 14.5 35.9 56.9 35.9c-4.4 39.2 16.4 85 66.6 109.1c1.2 .5 2.2 1.1 3.4 1.6c-29.4-15.2-53.6-43.8-56.6-78.6Z"
          fill="url(#spin-ball-small-gradient-11)"
        />
        <path
          d="M2.2 262.7c18.5 109.6 117.8 193.2 230.6 196.4c104.4 3 171-57.6 198.6-116.7c17.8-38.2 30.1-100.7 7.5-162.2c0 0-0.1-0.2-0.1-0.2c0-0.2 0-0.3 0-0.3c0 .1 0 .2 0 .4c8.6 55.7-19.8 109.6-64 146.1l-0.1 .3c-86.3 70.2-168.8 42.4-185.5 31c-1.2-0.6-2.4-1.2-3.5-1.8c-50.3-24-71.1-69.8-66.6-109.1c-42.5 0-57-35.8-57-35.8c0 0 38.2-27.2 88.4-3.6c46.5 21.9 90.2 3.6 90.2 3.6c-0.1-2-41.9-18.6-58.2-34.7c-8.7-8.6-12.8-12.7-16.5-15.8c-2-1.7-4.1-3.3-6.2-4.7c-1.7-1.1-3.3-2.2-5-3.3c-17.5-11.4-52.4-10.8-53.5-10.7h-0.2c-9.5-12.1-8.8-51.9-8.3-60.2c-0.1-0.5-7.1 3.6-8 4.2c-8.4 6-16.3 12.8-23.5 20.1c-8.2 8.4-15.7 17.4-22.4 27c0 0 0 0 0 0c0 0 0 0 0 0c-15.5 21.9-26.4 46.6-32.3 72.8c-0.1 .5-8.6 37.8-4.4 57.2Z"
          fill="url(#spin-ball-small-gradient-12)"
        />
        <path
          d="M462.7 166.4c-10.4-25.2-31.6-52.3-48.2-60.9c13.5 26.5 21.4 53.1 24.3 73c0-0.1 0 0 .1 .2c0 .1 0 .2 0 .3c22.7 61.4 10.3 123.9-7.5 162.1c-27.5 59.1-94.2 119.7-198.6 116.8c-112.7-3.2-212-86.9-230.6-196.5c-3.4-17.3 0-26 1.7-40.1c-2.1 10.9-2.8 14-3.9 33.2c0 .4 0 .8 0 1.2c0 132.7 107.6 240.3 240.3 240.3c118.9 0 217.6-86.3 236.9-199.6c.4-3.1 .7-6.2 1.1-9.3c4.8-41.2-0.5-84.5-15.6-120.7Z"
          fill="url(#spin-ball-small-gradient-13)"
        />
        <path
          d="M350 200.4c-1-1-2.3-2-3.6-2.9c-0.5-0.4-0.9-0.8-1.5-1.1c-12.8-9.1-35.8-18-57.9-14.1c86.4 43.2 63.2 192-56.6 186.4c-10.6-0.5-21.2-2.5-31.2-6c-2.4-0.9-4.8-1.9-7.1-2.9c-1.4-0.7-2.7-1.3-4-2c0 .1 .1 .1 .1 .1c16.7 11.4 99.3 39.3 185.5-30.9l.1-0.3c2.2-5.1 30.7-76.1-23.8-126.3Z"
          fill="url(#spin-ball-small-gradient-14)"
        />
        <path
          d="M438 180.2c-27.2-67.7-73.3-95-110.9-154.5c-1.9-3-3.8-6-5.7-9.2c-0.9-1.6-1.8-3.3-2.6-5c-1.6-3-2.8-6.2-3.6-9.5c0-0.3-0.2-0.6-0.5-0.6c-0.2-0.1-0.3-0.1-0.5 0c0 0-0.1 0-0.1 0c-0.1 .1-0.1 .1-0.2 .1c-9.3 4.5-64.4 91.7 10.3 166.4c8.8 8.6 16.3 18.4 22.3 29.1c1.3 1 2.6 2 3.6 3c54.5 50.2 26 121.2 23.8 126.2c44.3-36.4 72.6-90.3 64.1-146Z"
          opacity=".05"
          fill="#060605"
        />
      </g>
    </svg>
  );
}

export { SpinBallSmall };

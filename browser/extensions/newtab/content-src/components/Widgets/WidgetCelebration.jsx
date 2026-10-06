/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import React from "react";

const DEFAULT_GRADIENT_STOPS = [
  { offset: "0%", color: "var(--color-orange-20)" },
  { offset: "28%", color: "var(--color-orange-30)" },
  { offset: "64%", color: "var(--color-pink-30)" },
  { offset: "100%", color: "var(--color-pink-40)" },
];

const DEFAULT_CONFETTI_COUNT = 42;

// Flat confetti shapes (border-radius + clip-path) used by the default "mixed"
// confetti.
const CONFETTI_SHAPES = [
  { radius: "1px", clip: "none" }, // rectangle / streamer
  { radius: "50%", clip: "none" }, // circle / oval
  { radius: "0", clip: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }, // diamond
  { radius: "0", clip: "polygon(50% 0%, 0% 100%, 100% 100%)" }, // triangle
];

// The "soccer" shape mode mixes team-colored soccer balls (the `ball` entries)
// with the smaller flat shapes. Duplicate `{ ball: true }` to weight balls more
// heavily relative to the flat confetti.
const SOCCER_POOL = [
  { ball: true },
  { ball: true },
  { ball: true },
  { ball: true },
  ...CONFETTI_SHAPES,
];

// Deterministic [0, 1) pseudo-random so confetti pieces stay stable across the
// re-renders within a single celebration run (keyed by celebrationId) but vary
// from one run to the next.
const celebrationRandom = seed => {
  const value = Math.sin(seed) * 10000;
  return value - Math.floor(value);
};

// Builds the confetti pieces for one run from the supplied colors, randomizing
// position/size/fall/spin per piece via CSS custom props. "soccer" draws from
// SOCCER_POOL (team-colored balls mixed with flat shapes); otherwise from the
// flat-only CONFETTI_SHAPES.
const buildConfettiPieces = (run, colors, count, shapeMode) => {
  const pool = shapeMode === "soccer" ? SOCCER_POOL : CONFETTI_SHAPES;
  // Sports spreads its confetti into a continuous shower: pieces sit in even
  // columns (no clumping) and enter staggered over ~1.1s rather than bursting
  // together. delay + duration stays under the celebration lifecycle (hold +
  // exit) so every piece still finishes before the overlay unmounts.
  const spread = shapeMode === "soccer";
  return Array.from({ length: count }, (_, i) => {
    const base = (run + 1) * 100 + i;
    const color = colors[i % colors.length];
    const shape = pool[Math.floor(celebrationRandom(base + 6) * pool.length)];
    const isBall = !!shape.ball;
    // Soccer balls are larger and square so the panel pattern reads; flat
    // shapes are smaller thin slivers.
    const width = isBall
      ? Math.round(12 + celebrationRandom(base + 0.5) * 5)
      : Math.round(6 + celebrationRandom(base + 0.5) * 4);
    const height = isBall
      ? width
      : Math.round(width * (1.4 + celebrationRandom(base + 5) * 0.8));
    // Even column placement (with sub-column jitter) for the shower; pure
    // random otherwise. Capped at 98% so wide pieces don't overflow the edge.
    const left = spread
      ? `${Math.min(
          ((i + celebrationRandom(base + 7)) / count) * 100,
          98
        ).toFixed(2)}%`
      : `${(celebrationRandom(base) * 100).toFixed(2)}%`;
    // Staggered entry (random across the run, so no left-to-right wipe) vs the
    // tight 0-350ms burst the other widgets use.
    const delay = spread
      ? `${Math.round(celebrationRandom(base + 1) * 1100)}ms`
      : `${Math.round(celebrationRandom(base + 1) * 350)}ms`;
    // Slow fall, but delay + duration stays under the celebration lifecycle
    // (hold + exit) so pieces finish before the overlay unmounts.
    const duration = spread
      ? `${Math.round(2600 + celebrationRandom(base + 2) * 800)}ms`
      : `${Math.round(3000 + celebrationRandom(base + 2) * 1200)}ms`;
    // Moderate sway + spin for the shower; wider tumble otherwise.
    const rotate = spread
      ? `${Math.round(celebrationRandom(base + 3) * 400 - 200)}deg`
      : `${Math.round(celebrationRandom(base + 3) * 720 - 360)}deg`;
    const drift = spread
      ? `${Math.round(celebrationRandom(base + 4) * 90 - 45)}px`
      : `${Math.round(celebrationRandom(base + 4) * 80 - 40)}px`;
    return {
      id: i,
      ball: isBall,
      color,
      left,
      delay,
      duration,
      rotate,
      drift,
      width: `${width}px`,
      height: `${height}px`,
      radius: isBall ? "50%" : (shape.radius ?? "50%"),
      clip: isBall ? "none" : (shape.clip ?? "none"),
    };
  });
};

// Maps a piece's values onto the CSS custom props its rule reads.
const confettiPieceStyle = piece => ({
  "--confetti-x": piece.left,
  "--confetti-w": piece.width,
  "--confetti-h": piece.height,
  "--confetti-color": piece.color,
  "--confetti-delay": piece.delay,
  "--confetti-duration": piece.duration,
  "--confetti-rotate": piece.rotate,
  "--confetti-drift": piece.drift,
  "--confetti-radius": piece.radius,
  "--confetti-clip": piece.clip,
});

export const WidgetCelebration = ({
  classNamePrefix = "widget-celebration",
  celebrationFrame,
  celebrationId,
  confettiColors,
  confettiCount = DEFAULT_CONFETTI_COUNT,
  confettiShape = "mixed",
  gradientStops = DEFAULT_GRADIENT_STOPS,
  headlineL10nId,
  illustrationSrc,
  onComplete,
  subheadL10nId,
}) => {
  const className = suffix =>
    suffix ? `${classNamePrefix}-${suffix}` : classNamePrefix;
  // Only expose the live region when there's copy to announce; a copy-less
  // celebration (e.g. sports) is purely decorative.
  const hasCopy = !!(headlineL10nId || subheadL10nId);
  // Deterministic, so it's safe to compute on every render without reshuffling.
  const confettiPieces = confettiColors?.length
    ? buildConfettiPieces(
        celebrationId,
        confettiColors,
        confettiCount,
        confettiShape
      )
    : [];
  const ballSymbolId = `${classNamePrefix}-ball-${celebrationId}`;
  const resolvedIllustrationSrc = illustrationSrc?.endsWith(".svg")
    ? `${illustrationSrc}?run=${celebrationId}`
    : illustrationSrc;
  const strokeSize = celebrationFrame.strokeInset * 2;
  const strokeWidth = celebrationFrame.width - strokeSize;
  const strokeHeight = celebrationFrame.height - strokeSize;

  return (
    <div
      className={className()}
      key={celebrationId}
      role={hasCopy ? "status" : undefined}
      aria-live={hasCopy ? "polite" : undefined}
      onAnimationEnd={event => {
        if (
          event.target === event.currentTarget &&
          event.animationName === "widget-celebration-lifecycle"
        ) {
          onComplete?.();
        }
      }}
    >
      <div className={className("effects")} aria-hidden="true">
        <svg
          viewBox={`0 0 ${celebrationFrame.width} ${celebrationFrame.height}`}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient
              id={`${classNamePrefix}-gradient-${celebrationId}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              {gradientStops.map(({ offset, color }) => (
                <stop key={offset} offset={offset} stopColor={color} />
              ))}
            </linearGradient>
          </defs>
          <rect
            className={className("stroke-track")}
            x={celebrationFrame.strokeInset}
            y={celebrationFrame.strokeInset}
            width={strokeWidth}
            height={strokeHeight}
            rx={celebrationFrame.radius}
            ry={celebrationFrame.radius}
            pathLength="100"
          />
          <rect
            className={className("stroke")}
            x={celebrationFrame.strokeInset}
            y={celebrationFrame.strokeInset}
            width={strokeWidth}
            height={strokeHeight}
            rx={celebrationFrame.radius}
            ry={celebrationFrame.radius}
            pathLength="100"
            stroke={`url(#${classNamePrefix}-gradient-${celebrationId})`}
          />
          <rect
            className={className("stroke-orbit")}
            x={celebrationFrame.strokeInset}
            y={celebrationFrame.strokeInset}
            width={strokeWidth}
            height={strokeHeight}
            rx={celebrationFrame.radius}
            ry={celebrationFrame.radius}
            pathLength="100"
          />
        </svg>
      </div>
      {confettiPieces.length ? (
        <div className={className("confetti")} aria-hidden="true">
          {/* Soccer-ball geometry defined once; each ball piece references it
              via <use> and tints the body through currentColor. */}
          <svg className={className("confetti-defs")} aria-hidden="true">
            <symbol id={ballSymbolId} viewBox="0 0 24 24">
              <circle
                cx="12"
                cy="12"
                r="11"
                fill="currentColor"
                stroke="#1c1c1c"
                strokeWidth="1.4"
              />
              <path
                d="M12 8.6 16 11.4 14.4 15.4 9.6 15.4 8 11.4Z"
                fill="#1c1c1c"
              />
              <g stroke="#1c1c1c" strokeWidth="1.1" fill="none">
                <path d="M12 8.6V1.2" />
                <path d="M16 11.4 22.6 8.6" />
                <path d="M14.4 15.4 18.8 21" />
                <path d="M9.6 15.4 5.2 21" />
                <path d="M8 11.4 1.4 8.6" />
              </g>
            </symbol>
          </svg>
          {confettiPieces.map(piece =>
            piece.ball ? (
              <svg
                key={piece.id}
                className={className("confetti-piece")}
                viewBox="0 0 24 24"
                style={confettiPieceStyle(piece)}
              >
                <use href={`#${ballSymbolId}`} />
              </svg>
            ) : (
              <i
                key={piece.id}
                className={className("confetti-piece")}
                style={confettiPieceStyle(piece)}
              />
            )
          )}
        </div>
      ) : null}
      {hasCopy ? (
        <div className={className("copy")}>
          <span
            className={className("headline")}
            data-l10n-id={headlineL10nId}
          />
          <span className={className("subhead")} data-l10n-id={subheadL10nId} />
        </div>
      ) : null}
      {resolvedIllustrationSrc && (
        <img
          alt=""
          aria-hidden="true"
          className={className("illustration")}
          src={resolvedIllustrationSrc}
        />
      )}
    </div>
  );
};

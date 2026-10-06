/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * @backward-compat { version 153 }
 * Everything below tagged with the same marker — the logo-variation
 * registry, `pickVariant`, the hook, and the variation-selection block
 * inside `Logo()` — can be removed after Firefox 153 hits Release, when
 * the 2026 World Cup is over. After cleanup, `Logo()` reverts to its
 * original shape: just the wrapper + `.logo` div + `.wordmark`.
 */
import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { FootballBounce } from "./variants/FootballBounce";
import { RotatingBall } from "./variants/RotatingBall";
import { SpinBallSmall } from "./variants/SpinBallSmall";
import { SpinSmooth } from "./variants/SpinSmooth";
import { WIDGET_REGISTRY, isWidgetEnabled } from "common/WidgetsRegistry.mjs";

/**
 * @backward-compat { version 153 }
 * Pref consulted (after `trainhopConfig.logo.variation`) to choose a logo
 * variation. Empty string disables. Useful for local QA — set it via
 * `about:config` to preview a variation without an experiment.
 */
export const PREF_LOGO_VARIATION = "logo.variation";
const PREF_WIDGETS_ENABLED = "widgets.enabled";

/**
 * @backward-compat { version 153 }
 * Registry of all available logo variations.
 *
 * The key is the variant's string ID — the value that
 * `trainhopConfig.logo.variation` or the pref must equal for this variant
 * to be selected. Adding a new variant means:
 *   1. Implementing a `<Variant />` component under `./variants/`.
 *   2. Adding an entry here with its constraints and fallback target.
 *
 * Each entry has:
 *  - `component`: the React component to render.
 *  - `minViewportWidth`: minimum viewport width in CSS pixels for this
 *      variant to be considered usable. `0` means no width restriction.
 *  - `requiresLTR`: when `true`, this variant is skipped in RTL locales.
 *  - `fallback`: another variant ID to try when this variant's constraints
 *      aren't met, or `null` to fall through to the default newtab logo.
 *
 * Universal constraints that apply to every variant (e.g.
 * `prefers-reduced-motion: reduce` handling) are NOT encoded here; they
 * are handled at the call site or inside the variation component instead.
 */
export const LOGO_VARIATIONS = {
  "spin-ball-small": {
    component: SpinBallSmall,
    minViewportWidth: 0,
    requiresLTR: false,
    fallback: null,
  },
  "spin-smooth": {
    component: SpinSmooth,
    minViewportWidth: 0,
    requiresLTR: false,
    fallback: null,
  },
  "rotating-ball": {
    component: RotatingBall,
    minViewportWidth: 0,
    requiresLTR: false,
    fallback: null,
  },
  "football-bounce": {
    component: FootballBounce,
    minViewportWidth: 0,
    requiresLTR: true,
    fallback: "spin-smooth",
  },
};

const VARIANT_THRESHOLDS = Object.values(LOGO_VARIATIONS).map(
  v => v.minViewportWidth
);

/**
 * @backward-compat { version 153 }
 * Walk the fallback chain starting at `variantId`, returning the first
 * variant whose per-variant constraints are satisfied by the supplied
 * environment, or `null` if none are.
 *
 * Cycle-safe: a fallback chain that loops back on itself terminates as soon
 * as a previously-seen ID is encountered.
 *
 * @param {string|null|undefined} variantId
 *   The variant ID to start walking from (typically the value of the
 *   trainhopConfig or pref). Falsy values short-circuit to `null`.
 * @param {object} env
 *   The current rendering environment.
 * @param {number} env.viewportWidth
 *   The largest `min-width` breakpoint the viewport currently satisfies, in
 *   CSS pixels. A variant passes the width gate when its `minViewportWidth`
 *   is at or below this number.
 * @param {boolean} env.isLTR
 *   `true` if the document direction is LTR. A variant whose `requiresLTR`
 *   is `true` is skipped when this is `false`.
 * @returns {object|null}
 *   The selected variant entry from `LOGO_VARIATIONS`, or `null` when no
 *   variant in the chain is usable (callers should render the default logo).
 */
export function pickVariant(variantId, { viewportWidth, isLTR }) {
  let id = variantId;
  const seen = new Set();
  while (id && !seen.has(id)) {
    seen.add(id);
    const v = LOGO_VARIATIONS[id];
    if (!v) {
      return null;
    }
    const widthOk = viewportWidth >= v.minViewportWidth;
    const dirOk = !v.requiresLTR || isLTR;
    if (widthOk && dirOk) {
      return v;
    }
    id = v.fallback;
  }
  return null;
}

/**
 * @backward-compat { version 153 }
 * Subscribe to a set of `(min-width: Npx)` media queries and return the
 * largest threshold currently matched. Useful for picking a behaviour based
 * on the current viewport size while only re-rendering on breakpoint
 * crossings (not on every `resize` tick).
 *
 * @param {number[]} thresholds
 *   The breakpoints to observe, in CSS pixels. Duplicates are deduplicated.
 *   Pass a stable array reference (e.g. a module-level constant) so the
 *   underlying `MediaQueryList` instances aren't recreated on every render.
 * @returns {number}
 *   The largest threshold in `thresholds` whose query currently matches, or
 *   `0` if none of them do.
 */
function useMaxMatchedMinWidth(thresholds) {
  const queries = useMemo(() => {
    const unique = [...new Set(thresholds)].sort((a, b) => a - b);
    return unique.map(px => ({
      px,
      mql: window.matchMedia(`(min-width: ${px}px)`),
    }));
  }, [thresholds]);

  const computeMax = () => {
    let max = 0;
    for (const { px, mql } of queries) {
      if (mql.matches) {
        max = px;
      }
    }
    return max;
  };

  const [max, setMax] = useState(computeMax);

  useEffect(() => {
    const onChange = () => setMax(computeMax());
    for (const { mql } of queries) {
      mql.addEventListener("change", onChange);
    }
    setMax(computeMax());
    return () => {
      for (const { mql } of queries) {
        mql.removeEventListener("change", onChange);
      }
    };
    // computeMax is recreated each render but closes over the stable
    // `queries` array, so depending on `queries` alone is correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queries]);

  return max;
}

/**
 * The newtab logo. Renders either the default Firefox logo + wordmark, or a
 * registered logo variation when one is selected and its environmental
 * constraints are met.
 *
 * Variant selection priority (first non-empty wins):
 *   1. `prefs.trainhopConfig.logo.variation` (experiment-driven).
 *   2. `prefs[PREF_LOGO_VARIATION]` (user pref — for local testing).
 *   3. None → default logo.
 *
 * Reduced-motion users still get the variant rendered (statically, at its
 * frame-0 keyframe state); the variant's click handler is responsible for
 * not invoking `play()` when motion is suppressed. This keeps the visual
 * presence consistent across users without forcing animation on anyone.
 */
function Logo() {
  // @backward-compat { version 153 }
  // The four lines below (useSelector + useMaxMatchedMinWidth + isLTR +
  // the pickVariant/VariantComponent block) can be removed after Firefox
  // 153 hits Release. Logo() reverts to a plain render of the default
  // logo + wordmark.
  const prefs = useSelector(state => state.Prefs.values);
  const viewportWidth = useMaxMatchedMinWidth(VARIANT_THRESHOLDS);
  const isLTR = document.dir === "ltr";

  const trainhopVariant = prefs.trainhopConfig?.logo?.variation;
  const prefVariant = prefs[PREF_LOGO_VARIATION];
  const variantId = trainhopVariant || prefVariant || null;

  // All logo variations are gated on the Sports Widget being enabled —
  // when the widget is off, the variations are conceptually
  // inapplicable and the standard logo is shown regardless of any
  // trainhopConfig/pref selection.
  const widgetsEnabled = prefs[PREF_WIDGETS_ENABLED];
  const sportsWidget = WIDGET_REGISTRY.find(w => w.id === "sportsWidget");
  const sportsWidgetEnabled = isWidgetEnabled(
    sportsWidget,
    prefs,
    widgetsEnabled
  );

  const variant =
    sportsWidgetEnabled && variantId
      ? pickVariant(variantId, { viewportWidth, isLTR })
      : null;
  const VariantComponent = variant?.component;

  return (
    <h1 className="logo-and-wordmark-wrapper">
      <div
        className="logo-and-wordmark"
        role="img"
        data-l10n-id="newtab-logo-and-wordmark"
      >
        {/** @backward-compat { version 153 } collapse to <div className="logo" /> after Fx 153 hits Release. */}
        {VariantComponent ? <VariantComponent /> : <div className="logo" />}
        <div className="wordmark" />
      </div>
    </h1>
  );
}

export { Logo };

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { useCallback, useState } from "react";

/**
 * Shared widget-celebration lifecycle hook.
 *
 * Usage:
 * 1. Create a ref for the widget root element and pass it to this hook.
 * 2. Render <WidgetCelebration /> only when both `isCelebrating` and
 *    `celebrationFrame` are truthy, and pass `completeCelebration` to the
 *    component's `onComplete` prop.
 * 3. Call `triggerCelebration()` when the widget reaches its completion state.
 *    Returns `false` if the animation was skipped (reduced motion or no
 *    widget ref) so the caller can run its completion handler inline.
 *
 * Example:
 * const widgetRef = useRef(null);
 * const {
 *   celebrationFrame,
 *   celebrationId,
 *   completeCelebration,
 *   isCelebrating,
 *   triggerCelebration,
 * } = useWidgetCelebration(widgetRef);
 *
 * <article ref={widgetRef}>
 *   {isCelebrating && celebrationFrame ? (
 *     <WidgetCelebration
 *       celebrationFrame={celebrationFrame}
 *       celebrationId={celebrationId}
 *       onComplete={completeCelebration}
 *       ...
 *     />
 *   ) : null}
 * </article>
 */
export const useWidgetCelebration = widgetRef => {
  const [celebrationId, setCelebrationId] = useState(0);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [celebrationFrame, setCelebrationFrame] = useState(null);

  const triggerCelebration = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return false;
    }

    const widget = widgetRef.current;

    if (!widget) {
      return false;
    }

    const { width, height } = widget.getBoundingClientRect();
    const strokeInset = 1.5;
    const borderRadius =
      parseFloat(getComputedStyle(widget).borderTopLeftRadius) || 0;
    const frame = {
      height,
      radius: Math.max(0, borderRadius - strokeInset),
      strokeInset,
      width,
    };

    setCelebrationFrame(frame);
    setCelebrationId(currentValue => currentValue + 1);
    setIsCelebrating(true);
    return true;
  }, [widgetRef]);

  const completeCelebration = useCallback(() => {
    setIsCelebrating(false);
  }, []);

  return {
    celebrationFrame,
    celebrationId,
    completeCelebration,
    isCelebrating,
    triggerCelebration,
  };
};

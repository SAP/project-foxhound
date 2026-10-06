/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { useEffect, useState } from "react";
import { actionCreators as ac } from "../../../common/Actions.mjs";
import { PREF_WIDGETS_ORDER } from "common/WidgetsRegistry.mjs";
import { useMouseDnD } from "./useMouseDnD.jsx";

/**
 * Wraps the mouse widget-reorder hook. Owns the optimistic-order snapshot
 * (the local override that renders the user's just-committed order while
 * the pref-write round trip is in flight) and exposes a single set of
 * handlers + preview state for Widgets.jsx.
 */
export function useWidgetDnD({ widgetOrder, prefs, dispatch }) {
  const [optimisticOrder, setOptimisticOrder] = useState(null);

  useEffect(() => {
    if (
      optimisticOrder &&
      prefs[PREF_WIDGETS_ORDER] === optimisticOrder.join(",")
    ) {
      setOptimisticOrder(null);
    }
  }, [prefs, optimisticOrder]);

  const effectiveOrder = optimisticOrder || widgetOrder;

  function commitOrder(newOrder) {
    setOptimisticOrder(newOrder);
    dispatch(ac.SetPref(PREF_WIDGETS_ORDER, newOrder.join(",")));
  }

  const mouse = useMouseDnD({ effectiveOrder, commitOrder });

  const previewOrderMap = mouse.previewOrder
    ? Object.fromEntries(mouse.previewOrder.map((id, i) => [id, i]))
    : null;

  return {
    effectiveOrder,
    draggedId: mouse.draggedId,
    previewOrderMap,
    handleDragStart: mouse.handleDragStart,
    handleDragOver: mouse.handleDragOver,
    handleDrop: mouse.handleDrop,
    handleDragEnd: mouse.handleDragEnd,
    handleMouseDown: mouse.handleMouseDown,
  };
}

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React, { useCallback, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { actionCreators as ac } from "common/Actions.mjs";
import {
  PREF_WIDGETS_ORDER,
  resolveWidgetOrder,
} from "common/WidgetsRegistry.mjs";

// Action is order-based and direction-agnostic: onMoveLeft always swaps with
// the previous item in the order array. The Fluent strings handle the visual
// flip for RTL locales by translating "Left" as "Right" (and vice versa).
export function buildMoveProps(id, order, enabledMap, dispatch) {
  const visible = order.filter(w => enabledMap?.[w]);
  const idx = visible.indexOf(id);
  const swap = delta => () => {
    const target = visible[idx + delta];
    if (!target) {
      return;
    }
    const newOrder = [...order];
    const a = newOrder.indexOf(id);
    const b = newOrder.indexOf(target);
    [newOrder[a], newOrder[b]] = [newOrder[b], newOrder[a]];
    dispatch(ac.SetPref(PREF_WIDGETS_ORDER, newOrder.join(",")));
  };
  return {
    canMoveLeft: visible[idx - 1] !== undefined,
    canMoveRight: visible[idx + 1] !== undefined,
    onMoveLeft: swap(-1),
    onMoveRight: swap(+1),
  };
}

// Submenu panel-list children are moved into the panel-item's shadow DOM
// by the panel-list custom element, so React's synthetic onClick doesn't
// reach them. Listen at the panel-list root and walk composedPath() to
// find the clicked item by its data-move-dir attribute.
export function MoveSubmenu({ widgetId, widgetEnabledMap }) {
  const prefs = useSelector(state => state.Prefs.values);
  const dispatch = useDispatch();
  const moveProps = buildMoveProps(
    widgetId,
    resolveWidgetOrder(prefs),
    widgetEnabledMap,
    dispatch
  );

  // Read the latest moveProps via a ref so the ref callback stays stable and
  // doesn't re-attach the listener every render.
  const movePropsRef = useRef(moveProps);
  useEffect(() => {
    movePropsRef.current = moveProps;
  }, [moveProps]);

  // A ref callback is required because the submenu is gated
  // behind an early return and only mounts once the widget is
  // movable; the callback fires whenever the node attaches.
  const cleanupRef = useRef(null);
  const submenuRef = useCallback(el => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (!el) {
      return;
    }
    const listener = e => {
      const item = e.composedPath().find(n => n.dataset?.moveDir);
      if (!item) {
        return;
      }
      if (item.dataset.moveDir === "left") {
        movePropsRef.current.onMoveLeft();
      } else if (item.dataset.moveDir === "right") {
        movePropsRef.current.onMoveRight();
      }
    };
    el.addEventListener("click", listener);
    cleanupRef.current = () => el.removeEventListener("click", listener);
  }, []);

  if (!moveProps.canMoveLeft && !moveProps.canMoveRight) {
    return null;
  }
  const submenuId = `${widgetId}-move-submenu`;
  return (
    <panel-item submenu={submenuId}>
      <span data-l10n-id="newtab-widget-menu-move"></span>
      <panel-list ref={submenuRef} slot="submenu" id={submenuId}>
        <panel-item
          data-l10n-id="newtab-widget-menu-move-left"
          data-move-dir="left"
          {...(moveProps.canMoveLeft ? {} : { disabled: true })}
        ></panel-item>
        <panel-item
          data-l10n-id="newtab-widget-menu-move-right"
          data-move-dir="right"
          {...(moveProps.canMoveRight ? {} : { disabled: true })}
        ></panel-item>
      </panel-list>
    </panel-item>
  );
}

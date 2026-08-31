/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { useRef, useState } from "react";

// Elements where mousedown should start an interaction, not a widget reorder.
// Anchors are excluded so clicking still navigates, and dragging an anchor
// drags the widget.
const INTERACTIVE_DESCENDANT_SELECTOR = [
  "button",
  "moz-button",
  "moz-checkbox",
  "moz-toggle",
  "moz-radio",
  "moz-select",
  "moz-input-text",
  "moz-input-password",
  "moz-input-search",
  "input",
  "textarea",
  "select",
  "[contenteditable='true']",
  "[role='button']",
  "[role='checkbox']",
  "[role='switch']",
  "[role='textbox']",
].join(", ");

/**
 * Builds a high-DPI drag image clone anchored at the cursor's grab point.
 * Mounting under el.parentElement keeps the CSS cascade applied. scale(1/dpr)
 * compensates for Firefox's setDragImage handling at non-1 device pixel ratios.
 */
function setupDragImage(e, el) {
  const rect = el.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = Math.round(rect.width);
  const cssHeight = Math.round(rect.height);

  const clone = el.cloneNode(true);
  // position:fixed keeps the clone out of grid flow; -9999px hides it until
  // setDragImage captures it.
  clone.style.cssText = `position:fixed;top:-9999px;left:-9999px;width:${cssWidth}px;height:${cssHeight}px;transform:scale(${1 / dpr});transform-origin:top left;pointer-events:none;margin:0`;

  const mountPoint = el.parentElement || document.body;
  mountPoint.appendChild(clone);

  const offsetX = e.clientX - rect.left;
  const offsetY = e.clientY - rect.top;
  e.dataTransfer.setDragImage(
    clone,
    Math.round(offsetX * (1 / dpr)),
    Math.round(offsetY * (1 / dpr))
  );
  requestAnimationFrame(() => clone.remove());
}

/**
 * Captures every slot's bounding rect at drag start, in effectiveOrder order.
 * Rects stay frozen for the whole drag, so cursor (x, y) always maps to the
 * same slot index regardless of how the live preview reflows.
 */
function captureSlotRects(sourceEl, effectiveOrder) {
  const container = sourceEl.parentElement;
  if (!container) {
    return null;
  }
  // data-widget-id is on the slot wrapper, not the inner article.
  const slots = [...container.querySelectorAll("[data-widget-id]")];
  const rectsById = Object.fromEntries(
    slots.map(el => [el.dataset.widgetId, el.getBoundingClientRect()])
  );
  return effectiveOrder.map(id => rectsById[id] || null);
}

/**
 * Returns the slot whose rect contains the cursor, or null if the cursor is
 * in a gap. Null means "no change" so wandering through gaps doesn't snap to
 * the nearest slot. Exported for unit tests.
 */
export function cursorToSlot(slotRects, clientX, clientY) {
  if (!slotRects) {
    return null;
  }
  for (let i = 0; i < slotRects.length; i++) {
    const rect = slotRects[i];
    if (
      rect &&
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      return i;
    }
  }
  return null;
}

/**
 * Mouse-driven widget reorder. Emits a previewOrder for the composer and
 * commits via commitOrder.
 */
export function useMouseDnD({ effectiveOrder, commitOrder }) {
  const [draggedId, setDraggedId] = useState(null);
  // Where the source will land if drop fires. Driven only by cursor position
  // against captured slot rects, no history or hysteresis.
  const [targetSlot, setTargetSlot] = useState(null);
  // dragstart's e.target is the drag source, not the actual mousedowned
  // element. We track mousedown separately for the interactive-descendant
  // guard.
  const mouseDownTargetRef = useRef(null);
  const slotRectsRef = useRef(null);

  let previewOrder = null;
  if (draggedId !== null && targetSlot !== null) {
    const next = effectiveOrder.filter(id => id !== draggedId);
    next.splice(targetSlot, 0, draggedId);
    previewOrder = next;
  }

  function handleMouseDown(e) {
    mouseDownTargetRef.current = e.target;
  }

  function handleDragStart(e, id) {
    // If the drag started on a nested draggable, let it own the drag.
    const closestDraggable = e.target.closest("[draggable='true']");
    if (closestDraggable && closestDraggable !== e.currentTarget) {
      mouseDownTargetRef.current = null;
      return;
    }

    // If mousedown was on an interactive element, abort so a hand twitch
    // between mousedown and mouseup doesn't lose the user's click.
    const mouseDownTarget = mouseDownTargetRef.current;
    mouseDownTargetRef.current = null;
    if (
      mouseDownTarget &&
      mouseDownTarget.closest(INTERACTIVE_DESCENDANT_SELECTOR)
    ) {
      e.preventDefault();
      return;
    }

    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/widget-id", id);

    // Capture rects BEFORE setupDragImage. The clone also has data-widget-id,
    // so capturing after would overwrite source's rect with -9999,-9999.
    slotRectsRef.current = captureSlotRects(e.currentTarget, effectiveOrder);

    setupDragImage(e, e.currentTarget);

    setDraggedId(id);
    setTargetSlot(effectiveOrder.indexOf(id));
  }

  function handleDragOver(e) {
    // Only handle widget reorders; let other drags reach their handlers.
    if (!e.dataTransfer.types.includes("text/widget-id")) {
      return;
    }
    e.preventDefault();
    // Stop propagation so inner DnD (e.g. moz-reorderable-list inside Lists)
    // doesn't also handle this event.
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";

    if (!draggedId) {
      return;
    }
    const slot = cursorToSlot(slotRectsRef.current, e.clientX, e.clientY);
    if (slot !== null && slot !== targetSlot) {
      setTargetSlot(slot);
    }
  }

  function cleanup() {
    setDraggedId(null);
    setTargetSlot(null);
    slotRectsRef.current = null;
  }

  // Commit on `drop`, not `dragend`, so Escape, release-outside, and
  // release-in-gap all cancel (no `drop` fires for those). A window keydown
  // listener for Escape is unreliable because the browser owns the keyboard
  // during a native HTML5 drag.
  function handleDrop(e) {
    if (!e.dataTransfer.types.includes("text/widget-id")) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (draggedId !== null && targetSlot !== null) {
      const sourceIdx = effectiveOrder.indexOf(draggedId);
      if (sourceIdx !== -1 && targetSlot !== sourceIdx) {
        const next = effectiveOrder.filter(id => id !== draggedId);
        next.splice(targetSlot, 0, draggedId);
        commitOrder(next);
      }
    }
  }

  function handleDragEnd() {
    cleanup();
  }

  return {
    draggedId,
    previewOrder,
    handleMouseDown,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
  };
}

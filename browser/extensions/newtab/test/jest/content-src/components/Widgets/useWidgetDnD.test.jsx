/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at https://mozilla.org/MPL/2.0/. */

import { act, renderHook } from "@testing-library/react";
import { useWidgetDnD } from "content-src/components/Widgets/useWidgetDnD.jsx";
import { cursorToSlot } from "content-src/components/Widgets/useMouseDnD.jsx";

const DEFAULT_ORDER = [
  "lists",
  "focusTimer",
  "weather",
  "sportsWidget",
  "clocks",
];

function makeProps(overrides = {}) {
  return {
    widgetOrder: DEFAULT_ORDER,
    prefs: {},
    dispatch: jest.fn(),
    ...overrides,
  };
}

function setup(overrides = {}) {
  const props = makeProps(overrides);
  const { result } = renderHook(() => useWidgetDnD(props));
  return { result, dispatch: props.dispatch, props };
}

function dataTransferStub(types = ["text/widget-id"], data = {}) {
  return {
    types,
    setData: jest.fn((k, v) => {
      data[k] = v;
    }),
    getData: jest.fn(k => data[k] || ""),
    setDragImage: jest.fn(),
    effectAllowed: "",
    dropEffect: "",
  };
}

function makeArticle(widgetId) {
  const el = document.createElement("article");
  el.setAttribute("data-widget-id", widgetId);
  return el;
}

function dragEvent(opts = {}) {
  const types = opts.types ?? ["text/widget-id"];
  const data = opts.data ?? { "text/widget-id": opts.sourceId || "" };
  const target = opts.target || opts.currentTarget;
  const currentTarget = opts.currentTarget || opts.target;
  return {
    dataTransfer: dataTransferStub(types, data),
    clientX: opts.clientX ?? 0,
    clientY: opts.clientY ?? 0,
    target,
    currentTarget,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
  };
}

describe("cursorToSlot", () => {
  const slotRects = [
    { left: 0, right: 200, top: 0, bottom: 100, width: 200, height: 100 },
    { left: 200, right: 400, top: 0, bottom: 100, width: 200, height: 100 },
    { left: 400, right: 600, top: 0, bottom: 100, width: 200, height: 100 },
  ];

  it("returns the slot whose rect contains the cursor", () => {
    expect(cursorToSlot(slotRects, 100, 50)).toBe(0);
    expect(cursorToSlot(slotRects, 300, 50)).toBe(1);
    expect(cursorToSlot(slotRects, 500, 50)).toBe(2);
  });

  it("returns null when the cursor is outside every rect (gaps/empty regions)", () => {
    // Above all rects
    expect(cursorToSlot(slotRects, 100, -10)).toBe(null);
    // Below all rects
    expect(cursorToSlot(slotRects, 100, 200)).toBe(null);
    // Past the rightmost rect
    expect(cursorToSlot(slotRects, 700, 50)).toBe(null);
  });

  it("treats rect edges as inclusive (right and bottom edges hit the slot)", () => {
    expect(cursorToSlot(slotRects, 200, 50)).toBe(0); // first match wins on shared edge
    expect(cursorToSlot(slotRects, 100, 100)).toBe(0);
  });

  it("returns null when slotRects is null (no in-flight drag)", () => {
    expect(cursorToSlot(null, 100, 50)).toBe(null);
  });

  it("skips holes in slotRects", () => {
    const rectsWithHole = [
      { left: 0, right: 200, top: 0, bottom: 100, width: 200, height: 100 },
      null,
      { left: 400, right: 600, top: 0, bottom: 100, width: 200, height: 100 },
    ];
    expect(cursorToSlot(rectsWithHole, 100, 50)).toBe(0);
    expect(cursorToSlot(rectsWithHole, 300, 50)).toBe(null); // hole, no match
    expect(cursorToSlot(rectsWithHole, 500, 50)).toBe(2);
  });
});

describe("useWidgetDnD - mouse drag", () => {
  it("foreign drop (no text/widget-id) does not dispatch", () => {
    const { result, dispatch } = setup();
    const e = dragEvent({ types: ["text/plain"] });
    act(() => {
      result.current.handleDrop(e);
    });
    expect(dispatch).not.toHaveBeenCalled();
    expect(e.preventDefault).not.toHaveBeenCalled();
  });

  it("drop without an active drag does not dispatch", () => {
    const { result, dispatch } = setup();
    const e = dragEvent({
      types: ["text/widget-id"],
      data: { "text/widget-id": "lists" },
    });
    // No prior dragstart — sourceIdx is fine but targetSlot is null.
    act(() => {
      result.current.handleDrop(e);
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("foreign dragover (no text/widget-id) is left alone", () => {
    const { result } = setup();
    const e = dragEvent({ types: ["text/plain"] });
    act(() => {
      result.current.handleDragOver(e);
    });
    expect(e.preventDefault).not.toHaveBeenCalled();
    expect(e.stopPropagation).not.toHaveBeenCalled();
  });
});

describe("useWidgetDnD - interactive descendant guard", () => {
  it("aborts the drag when mousedown was on a button inside the widget", () => {
    const { result } = setup();
    const article = makeArticle("lists");
    const button = document.createElement("button");
    article.appendChild(button);
    document.body.appendChild(article);

    act(() => {
      result.current.handleMouseDown({ target: button });
    });
    const e = dragEvent({ currentTarget: article, target: article });
    act(() => {
      result.current.handleDragStart(e, "lists");
    });
    expect(e.preventDefault).toHaveBeenCalled();
    expect(result.current.draggedId).toBe(null);

    document.body.removeChild(article);
  });

  it("allows the drag when mousedown was on a non-interactive area", () => {
    const { result } = setup();
    const article = makeArticle("lists");
    const inner = document.createElement("div");
    article.appendChild(inner);
    document.body.appendChild(article);

    act(() => {
      result.current.handleMouseDown({ target: inner });
    });
    const e = dragEvent({ currentTarget: article, target: article });
    act(() => {
      result.current.handleDragStart(e, "lists");
    });
    expect(e.preventDefault).not.toHaveBeenCalled();
    expect(result.current.draggedId).toBe("lists");

    document.body.removeChild(article);
  });

  it("does not abort the drag when mousedown was on an anchor (anchors should drag the widget)", () => {
    const { result } = setup();
    const article = makeArticle("weather");
    const anchor = document.createElement("a");
    article.appendChild(anchor);
    document.body.appendChild(article);

    act(() => {
      result.current.handleMouseDown({ target: anchor });
    });
    const e = dragEvent({ currentTarget: article, target: article });
    act(() => {
      result.current.handleDragStart(e, "weather");
    });
    expect(e.preventDefault).not.toHaveBeenCalled();
    expect(result.current.draggedId).toBe("weather");

    document.body.removeChild(article);
  });
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render } from "@testing-library/react";
import { INITIAL_STATE } from "common/Reducers.sys.mjs";
import { WrapWithProvider } from "test/jest/test-utils";
import {
  buildMoveProps,
  MoveSubmenu,
} from "content-src/components/Widgets/MoveSubmenu";
import { PREF_WIDGETS_ORDER } from "common/WidgetsRegistry.mjs";
import { actionTypes as at } from "common/Actions.mjs";

const FULL_ORDER = ["lists", "focusTimer", "weather", "sportsWidget", "clocks"];
const ALL_ENABLED = {
  lists: true,
  focusTimer: true,
  weather: true,
  sportsWidget: true,
  clocks: true,
};

describe("buildMoveProps", () => {
  it("disables left at the start of the visible order", () => {
    const props = buildMoveProps("lists", FULL_ORDER, ALL_ENABLED, jest.fn());
    expect(props.canMoveLeft).toBe(false);
    expect(props.canMoveRight).toBe(true);
  });

  it("disables right at the end of the visible order", () => {
    const props = buildMoveProps("clocks", FULL_ORDER, ALL_ENABLED, jest.fn());
    expect(props.canMoveLeft).toBe(true);
    expect(props.canMoveRight).toBe(false);
  });

  it("enables both directions in the middle", () => {
    const props = buildMoveProps("weather", FULL_ORDER, ALL_ENABLED, jest.fn());
    expect(props.canMoveLeft).toBe(true);
    expect(props.canMoveRight).toBe(true);
  });

  it("disables both directions when only one widget is visible", () => {
    const props = buildMoveProps(
      "weather",
      FULL_ORDER,
      { weather: true },
      jest.fn()
    );
    expect(props.canMoveLeft).toBe(false);
    expect(props.canMoveRight).toBe(false);
  });

  it("disables both directions when widgetEnabledMap is undefined", () => {
    const props = buildMoveProps("weather", FULL_ORDER, undefined, jest.fn());
    expect(props.canMoveLeft).toBe(false);
    expect(props.canMoveRight).toBe(false);
  });

  it("skips disabled widgets when computing neighbors", () => {
    // focusTimer is hidden; "moving lists right" should swap with weather,
    // not the absent focusTimer.
    const enabled = { ...ALL_ENABLED, focusTimer: false };
    const dispatch = jest.fn();
    const props = buildMoveProps("lists", FULL_ORDER, enabled, dispatch);
    expect(props.canMoveRight).toBe(true);
    props.onMoveRight();
    expect(dispatch).toHaveBeenCalledTimes(1);
    const [[action]] = dispatch.mock.calls;
    expect(action.data.name).toBe(PREF_WIDGETS_ORDER);
    expect(action.data.value).toBe(
      "weather,focusTimer,lists,sportsWidget,clocks"
    );
  });

  it("onMoveRight swaps with the next visible widget", () => {
    const dispatch = jest.fn();
    const props = buildMoveProps("weather", FULL_ORDER, ALL_ENABLED, dispatch);
    props.onMoveRight();
    const [[action]] = dispatch.mock.calls;
    expect(action.data.value).toBe(
      "lists,focusTimer,sportsWidget,weather,clocks"
    );
  });

  it("onMoveLeft swaps with the previous visible widget", () => {
    const dispatch = jest.fn();
    const props = buildMoveProps("weather", FULL_ORDER, ALL_ENABLED, dispatch);
    props.onMoveLeft();
    const [[action]] = dispatch.mock.calls;
    expect(action.data.value).toBe(
      "lists,weather,focusTimer,sportsWidget,clocks"
    );
  });

  it("dispatches a SET_PREF action", () => {
    const dispatch = jest.fn();
    const props = buildMoveProps("lists", FULL_ORDER, ALL_ENABLED, dispatch);
    props.onMoveRight();
    const [[action]] = dispatch.mock.calls;
    // SetPref wraps in AlsoToMain for UI code; the inner type is SET_PREF.
    const inner = action.type === at.SET_PREF ? action : action.data;
    expect(inner.type || inner.data?.name).toBeTruthy();
    expect(action.data.name).toBe(PREF_WIDGETS_ORDER);
  });

  it("no-ops when target is missing (out of bounds)", () => {
    const dispatch = jest.fn();
    const props = buildMoveProps("lists", FULL_ORDER, ALL_ENABLED, dispatch);
    // lists is at index 0; calling onMoveLeft should not dispatch
    props.onMoveLeft();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("is direction-agnostic: behavior does not depend on document.dir", () => {
    document.documentElement.dir = "rtl";
    try {
      const dispatch = jest.fn();
      const props = buildMoveProps(
        "weather",
        FULL_ORDER,
        ALL_ENABLED,
        dispatch
      );
      // onMoveLeft always swaps with the previous order item regardless of dir.
      // RTL locales handle the visual flip via translation, not code.
      expect(props.canMoveLeft).toBe(true);
      expect(props.canMoveRight).toBe(true);
      props.onMoveLeft();
      const [[action]] = dispatch.mock.calls;
      expect(action.data.value).toBe(
        "lists,weather,focusTimer,sportsWidget,clocks"
      );
    } finally {
      document.documentElement.dir = "ltr";
    }
  });
});

function makeState(prefOverrides = {}) {
  return {
    ...INITIAL_STATE,
    Prefs: {
      ...INITIAL_STATE.Prefs,
      values: { ...INITIAL_STATE.Prefs.values, ...prefOverrides },
    },
  };
}

describe("<MoveSubmenu>", () => {
  beforeEach(() => {
    document.documentElement.dir = "ltr";
  });

  it("renders nothing when widgetEnabledMap is undefined", () => {
    const { container } = render(
      <WrapWithProvider>
        <MoveSubmenu widgetId="weather" />
      </WrapWithProvider>
    );
    expect(
      container.querySelector("span[data-l10n-id='newtab-widget-menu-move']")
    ).not.toBeInTheDocument();
  });

  it("renders nothing when only one widget is visible", () => {
    const { container } = render(
      <WrapWithProvider>
        <MoveSubmenu widgetId="weather" widgetEnabledMap={{ weather: true }} />
      </WrapWithProvider>
    );
    expect(
      container.querySelector("span[data-l10n-id='newtab-widget-menu-move']")
    ).not.toBeInTheDocument();
  });

  it("renders the move submenu when 2+ widgets are visible", () => {
    const { container } = render(
      <WrapWithProvider
        state={makeState({
          [PREF_WIDGETS_ORDER]: FULL_ORDER.join(","),
        })}
      >
        <MoveSubmenu widgetId="weather" widgetEnabledMap={ALL_ENABLED} />
      </WrapWithProvider>
    );
    expect(
      container.querySelector("span[data-l10n-id='newtab-widget-menu-move']")
    ).toBeInTheDocument();
    expect(
      container.querySelector(
        "panel-item[data-l10n-id='newtab-widget-menu-move-left']"
      )
    ).toBeInTheDocument();
    expect(
      container.querySelector(
        "panel-item[data-l10n-id='newtab-widget-menu-move-right']"
      )
    ).toBeInTheDocument();
  });

  it("disables the left item at the start of the order", () => {
    const { container } = render(
      <WrapWithProvider
        state={makeState({
          [PREF_WIDGETS_ORDER]: FULL_ORDER.join(","),
        })}
      >
        <MoveSubmenu widgetId="lists" widgetEnabledMap={ALL_ENABLED} />
      </WrapWithProvider>
    );
    const left = container.querySelector(
      "panel-item[data-l10n-id='newtab-widget-menu-move-left']"
    );
    const right = container.querySelector(
      "panel-item[data-l10n-id='newtab-widget-menu-move-right']"
    );
    expect(left.hasAttribute("disabled")).toBe(true);
    expect(right.hasAttribute("disabled")).toBe(false);
  });
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { combineReducers, createStore } from "redux";
import { INITIAL_STATE, reducers } from "common/Reducers.sys.mjs";
import { WidgetsSidebar } from "content-src/components/Widgets/WidgetsSidebar";

jest.mock("content-src/components/Widgets/Weather/Weather", () => ({
  Weather: () => <div data-testid="weather-widget" />,
}));

function makeState(prefs = {}) {
  return {
    ...INITIAL_STATE,
    Prefs: {
      ...INITIAL_STATE.Prefs,
      values: { ...INITIAL_STATE.Prefs.values, ...prefs },
    },
  };
}

function renderSidebar(state = INITIAL_STATE) {
  const store = createStore(combineReducers(reducers), state);
  return render(
    <Provider store={store}>
      <WidgetsSidebar dispatch={() => {}} />
    </Provider>
  );
}

const SIDEBAR_PREFS = {
  "widgets.enabled": true,
  "widgets.weather.enabled": true,
  "widgets.weather.size": "small",
  "widgets.system.weather.enabled": true,
  showWeather: true,
};

describe("WidgetsSidebar", () => {
  it("renders nothing when no sidebar widgets are active", () => {
    expect(screen.queryByTestId("weather-widget")).toBeNull();
  });

  it("renders the weather widget when enabled, at small size, with system pref set", () => {
    renderSidebar(makeState(SIDEBAR_PREFS));
    expect(screen.getByTestId("weather-widget")).toBeTruthy();
  });

  it("does not render when size is not small", () => {
    renderSidebar(
      makeState({ ...SIDEBAR_PREFS, "widgets.weather.size": "medium" })
    );
    expect(screen.queryByTestId("weather-widget")).toBeNull();
  });

  it("does not render when the user pref is disabled", () => {
    renderSidebar(
      makeState({ ...SIDEBAR_PREFS, "widgets.weather.enabled": false })
    );
    expect(screen.queryByTestId("weather-widget")).toBeNull();
  });

  it("does not render when showWeather is false", () => {
    renderSidebar(makeState({ ...SIDEBAR_PREFS, showWeather: false }));
    expect(screen.queryByTestId("weather-widget")).toBeNull();
  });

  it("does not render when system weather pref is not set", () => {
    renderSidebar(
      makeState({ ...SIDEBAR_PREFS, "widgets.system.weather.enabled": false })
    );
    expect(screen.queryByTestId("weather-widget")).toBeNull();
  });

  it("renders when trainhop weather config is enabled instead of system pref", () => {
    renderSidebar(
      makeState({
        ...SIDEBAR_PREFS,
        "widgets.system.weather.enabled": false,
        trainhopConfig: { widgets: { weatherEnabled: true } },
      })
    );
    expect(screen.getByTestId("weather-widget")).toBeTruthy();
  });

  it("does not render in sidebar when trainhop overrides hasSidebar to false (widget moves to row)", () => {
    renderSidebar(
      makeState({
        ...SIDEBAR_PREFS,
        trainhopConfig: { widgets: { weatherSidebar: false } },
      })
    );
    expect(screen.queryByTestId("weather-widget")).toBeNull();
  });
});

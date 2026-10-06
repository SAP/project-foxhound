import { render, fireEvent } from "@testing-library/react";
import { WrapWithProvider } from "test/jest/test-utils";
import { Provider } from "react-redux";
import { createStore, combineReducers } from "redux";
import { INITIAL_STATE, reducers } from "common/Reducers.sys.mjs";
import { actionTypes as at } from "common/Actions.mjs";
import { Widgets } from "content-src/components/Widgets/Widgets";
import { BaseContext } from "content-src/lib/BaseContext";

const ENABLED_STATE = {
  ...INITIAL_STATE,
  Prefs: {
    ...INITIAL_STATE.Prefs,
    values: {
      ...INITIAL_STATE.Prefs.values,
      "widgets.enabled": true,
      "widgets.lists.enabled": true,
      "widgets.system.lists.enabled": true,
    },
  },
  ListsWidget: {
    selected: "list-1",
    lists: {
      "list-1": {
        label: "My List",
        tasks: [],
        completed: [],
      },
    },
  },
};

const LEGACY_WEATHER_FORECAST_STATE = {
  ...INITIAL_STATE,
  Prefs: {
    ...INITIAL_STATE.Prefs,
    values: {
      ...INITIAL_STATE.Prefs.values,
      "nova.enabled": false,
      "widgets.enabled": true,
      "widgets.system.weatherForecast.enabled": true,
      "weather.display": "detailed",
      showWeather: true,
      "system.showWeather": true,
    },
  },
  Weather: {
    ...INITIAL_STATE.Weather,
    initialized: true,
  },
};

function renderWidgets(state) {
  const store = createStore(combineReducers(reducers), state);
  jest.spyOn(store, "dispatch");
  const { container } = render(
    <Provider store={store}>
      <Widgets />
    </Provider>
  );
  return { container, store };
}

describe("<Widgets>", () => {
  it("should not render without any enabled widgets", () => {
    const store = createStore(combineReducers(reducers), INITIAL_STATE);
    const { container } = render(
      <Provider store={store}>
        <Widgets />
      </Provider>
    );
    expect(container.querySelector(".widgets-wrapper")).not.toBeInTheDocument();
  });

  it("should render when a widget is enabled", () => {
    const { container } = render(
      <WrapWithProvider state={ENABLED_STATE}>
        <Widgets />
      </WrapWithProvider>
    );
    expect(container.querySelector(".widgets-wrapper")).toBeInTheDocument();
  });
});

describe("<Widgets> hideAllWidgets legacy weather telemetry", () => {
  it("dispatches WIDGETS_ENABLED for weather when !novaEnabled && weatherForecastEnabled", () => {
    const { container, store } = renderWidgets(LEGACY_WEATHER_FORECAST_STATE);
    const hideAllButton = container.querySelector("#hide-all-widgets-button");
    expect(hideAllButton).toBeInTheDocument();

    fireEvent.click(hideAllButton);

    const dispatched = store.dispatch.mock.calls.map(([action]) => action);
    expect(dispatched).toContainEqual(
      expect.objectContaining({
        type: at.WIDGETS_ENABLED,
        data: expect.objectContaining({
          widget_name: "weather",
          widget_source: "widget",
          enabled: false,
        }),
      })
    );
  });

  it("does not dispatch WIDGETS_ENABLED for weather when weatherForecastEnabled is false", () => {
    const state = {
      ...LEGACY_WEATHER_FORECAST_STATE,
      Prefs: {
        ...LEGACY_WEATHER_FORECAST_STATE.Prefs,
        values: {
          ...LEGACY_WEATHER_FORECAST_STATE.Prefs.values,
          "widgets.system.weatherForecast.enabled": false,
          "widgets.lists.enabled": true,
          "widgets.system.lists.enabled": true,
        },
      },
      ListsWidget: {
        selected: "list-1",
        lists: { "list-1": { label: "My List", tasks: [], completed: [] } },
      },
    };
    const { container, store } = renderWidgets(state);
    const hideAllButton = container.querySelector("#hide-all-widgets-button");
    expect(hideAllButton).toBeInTheDocument();

    fireEvent.click(hideAllButton);

    const dispatched = store.dispatch.mock.calls.map(([action]) => action);
    const weatherEnabledCalls = dispatched.filter(
      action =>
        action.type === at.WIDGETS_ENABLED &&
        action.data?.widget_name === "weather" &&
        action.data?.widget_source === "widget"
    );
    expect(weatherEnabledCalls).toHaveLength(0);
  });
});

// Builds the minimum state needed to enable the listed widgets in nova
// mode at the given sizes. Each entry is [widgetId, size].
function makeNovaWidgetState(widgets, extraPrefs = {}) {
  const prefValues = {
    ...INITIAL_STATE.Prefs.values,
    "nova.enabled": true,
    "widgets.enabled": true,
    // Permissive defaults that let the weather widget pass its
    // `weatherData.initialized && showWeather && systemShowWeather`
    // gate when it's enabled by the test. Harmless when it isn't.
    showWeather: true,
    "system.showWeather": true,
    ...extraPrefs,
  };
  // Map widget IDs to their enabled/system/size pref names. Mirrors
  // WIDGET_REGISTRY so the test doesn't depend on registry internals.
  const widgetPrefs = {
    lists: {
      enabled: "widgets.lists.enabled",
      system: "widgets.system.lists.enabled",
      size: "widgets.lists.size",
    },
    focusTimer: {
      enabled: "widgets.focusTimer.enabled",
      system: "widgets.system.focusTimer.enabled",
      size: "widgets.focusTimer.size",
    },
    weather: {
      enabled: "widgets.weather.enabled",
      system: "widgets.system.weather.enabled",
      size: "widgets.weather.size",
    },
    sportsWidget: {
      enabled: "widgets.sportsWidget.enabled",
      system: "widgets.system.sportsWidget.enabled",
      size: "widgets.sportsWidget.size",
    },
    clocks: {
      enabled: "widgets.clocks.enabled",
      system: "widgets.system.clocks.enabled",
      size: "widgets.clocks.size",
    },
  };
  for (const [id, size] of widgets) {
    const prefs = widgetPrefs[id];
    prefValues[prefs.enabled] = true;
    prefValues[prefs.system] = true;
    prefValues[prefs.size] = size;
  }
  return {
    ...INITIAL_STATE,
    Prefs: { ...INITIAL_STATE.Prefs, values: prefValues },
    // ListsWidget needs a valid selected list to render
    ListsWidget: {
      selected: "list-1",
      lists: {
        "list-1": { label: "My List", tasks: [], completed: [] },
      },
    },
    // Weather only renders when initialized; mark it so it can be
    // counted toward widget positions when enabled.
    Weather: { ...INITIAL_STATE.Weather, initialized: true },
  };
}

describe("<Widgets> overflow detection", () => {
  function getSectionContainer(container) {
    return container.querySelector(".widgets-section-container");
  }

  it("sets no overflow attributes when only one widget is enabled", () => {
    const state = makeNovaWidgetState([["lists", "medium"]]);
    const { container } = renderWidgets(state);
    const section = getSectionContainer(container);
    expect(section.hasAttribute("data-overflow-1")).toBe(false);
    expect(section.hasAttribute("data-overflow-2")).toBe(false);
    expect(section.hasAttribute("data-overflow-3")).toBe(false);
    expect(section.hasAttribute("data-overflow-4")).toBe(false);
  });

  it("does not flag any overflow when two mediums fit in one card by pairing", () => {
    const state = makeNovaWidgetState([
      ["lists", "medium"],
      ["focusTimer", "medium"],
    ]);
    const { container } = renderWidgets(state);
    const section = getSectionContainer(container);
    // 2 mediums always pair into 1 card slot, so they fit in any
    // viewport ≥ 1 card column.
    expect(section.hasAttribute("data-overflow-1")).toBe(false);
    expect(section.hasAttribute("data-overflow-2")).toBe(false);
  });

  it("flags overflow-1 (but not -2) when three mediums are enabled", () => {
    const state = makeNovaWidgetState([
      ["lists", "medium"],
      ["focusTimer", "medium"],
      ["sportsWidget", "medium"],
    ]);
    const { container } = renderWidgets(state);
    const section = getSectionContainer(container);
    // 3 mediums need 2 card slots (one pair + one solo). Fits 2-card
    // viewports and up; overflows a 1-card viewport.
    expect(section.hasAttribute("data-overflow-1")).toBe(true);
    expect(section.hasAttribute("data-overflow-2")).toBe(false);
  });

  it("flags overflow-4 when a large is in the 5th position (image #17 case)", () => {
    const state = makeNovaWidgetState([
      ["sportsWidget", "medium"],
      ["clocks", "medium"],
      ["lists", "medium"],
      ["focusTimer", "medium"],
      ["weather", "large"],
    ]);
    const { container } = renderWidgets(state);
    const section = getSectionContainer(container);
    // The large at position 5 can't pair with any first-4 medium, so
    // every cols ≤ 4 view overflows.
    expect(section.hasAttribute("data-overflow-4")).toBe(true);
  });

  it("does not flag overflow when 1 large + 3 mediums fits in 3 cards", () => {
    const state = makeNovaWidgetState([
      ["lists", "large"],
      ["focusTimer", "medium"],
      ["weather", "medium"],
      ["sportsWidget", "medium"],
    ]);
    const { container } = renderWidgets(state);
    const section = getSectionContainer(container);
    // 1 large + 3 mediums = 1 + ceil(3/2) = 3 slots; fits in a 3-card
    // viewport. Mediums in the first 3 positions provide partners for
    // the third medium, so the overflow falls back to fit.
    expect(section.hasAttribute("data-overflow-3")).toBe(false);
    expect(section.hasAttribute("data-overflow-4")).toBe(false);
  });
});

describe("<Widgets> row toggle", () => {
  function novaStateWith(rowExpanded) {
    return makeNovaWidgetState([["lists", "medium"]], {
      "widgets.row.expanded": rowExpanded,
    });
  }

  it("renders the toggle button when nova is enabled", () => {
    const { container } = renderWidgets(novaStateWith(false));
    expect(container.querySelector(".widgets-row-toggle")).toBeInTheDocument();
  });

  it("labels the toggle 'show more' when the row is collapsed", () => {
    const { container } = renderWidgets(novaStateWith(false));
    const toggle = container.querySelector(".widgets-row-toggle");
    expect(toggle.getAttribute("data-l10n-id")).toBe(
      "newtab-widget-section-show-more"
    );
  });

  it("labels the toggle 'show less' when the row is expanded", () => {
    const { container } = renderWidgets(novaStateWith(true));
    const toggle = container.querySelector(".widgets-row-toggle");
    expect(toggle.getAttribute("data-l10n-id")).toBe(
      "newtab-widget-section-show-less"
    );
  });

  it("click flips the pref and dispatches WIDGETS_CONTAINER_ACTION", () => {
    const { container, store } = renderWidgets(novaStateWith(false));
    fireEvent.click(container.querySelector(".widgets-row-toggle"));
    const dispatched = store.dispatch.mock.calls.map(([action]) => action);
    expect(dispatched).toContainEqual(
      expect.objectContaining({
        type: at.SET_PREF,
        data: expect.objectContaining({
          name: "widgets.row.expanded",
          value: true,
        }),
      })
    );
    expect(dispatched).toContainEqual(
      expect.objectContaining({
        type: at.WIDGETS_CONTAINER_ACTION,
        data: expect.objectContaining({ action_value: "expand_row" }),
      })
    );
  });
});

describe("<Widgets> row-collapsed attribute", () => {
  it("is set on the widgets container when nova is enabled and the row is not expanded", () => {
    const state = makeNovaWidgetState([["lists", "medium"]], {
      "widgets.row.expanded": false,
    });
    const { container } = renderWidgets(state);
    const widgetsContainer = container.querySelector("#widgets-container");
    expect(widgetsContainer.hasAttribute("data-row-collapsed")).toBe(true);
  });

  it("is not set when the row is expanded", () => {
    const state = makeNovaWidgetState([["lists", "medium"]], {
      "widgets.row.expanded": true,
    });
    const { container } = renderWidgets(state);
    const widgetsContainer = container.querySelector("#widgets-container");
    expect(widgetsContainer.hasAttribute("data-row-collapsed")).toBe(false);
  });
});

describe("<Widgets> manage widgets menu item", () => {
  it("calls openWidgetsPanel and dispatches SHOW_PERSONALIZE when clicked", () => {
    const novaState = {
      ...ENABLED_STATE,
      Prefs: {
        ...ENABLED_STATE.Prefs,
        values: {
          ...ENABLED_STATE.Prefs.values,
          "nova.enabled": true,
        },
      },
    };
    const store = createStore(combineReducers(reducers), novaState);
    jest.spyOn(store, "dispatch");
    const openWidgetsPanel = jest.fn();
    const { container } = render(
      <Provider store={store}>
        <BaseContext.Provider value={{ openWidgetsPanel }}>
          <Widgets />
        </BaseContext.Provider>
      </Provider>
    );
    const manageItem = container.querySelector(
      "[data-l10n-id='newtab-widget-section-menu-manage']"
    );
    expect(manageItem).toBeInTheDocument();
    fireEvent.click(manageItem);
    expect(openWidgetsPanel).toHaveBeenCalledTimes(1);
    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: at.TELEMETRY_USER_EVENT,
        data: expect.objectContaining({ event: "SHOW_PERSONALIZE" }),
      })
    );
  });
});

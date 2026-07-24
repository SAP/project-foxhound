import React from "react";
import { mount } from "enzyme";
import { Provider } from "react-redux";
import { INITIAL_STATE, reducers } from "common/Reducers.sys.mjs";
import { combineReducers, createStore } from "redux";
import { Weather } from "content-src/components/Weather/Weather";
import { actionTypes as at } from "common/Actions.mjs";

const PREF_SYS_SHOW_WEATHER = "system.showWeather";
const PREF_SYS_SHOW_WEATHER_OPT_IN = "system.showWeatherOptIn";
const PREF_OPT_IN_DISPLAYED = "weather.optInDisplayed";
const PREF_OPT_IN_ACCEPTED = "weather.optInAccepted";
const PREF_STATIC_WEATHER_DATA = "weather.staticData.enabled";

// keeps initialize = true and provides fake suggestion + location data
// so the component skips <WeatherPlaceholder>.
const weatherInit = {
  initialized: true,
  suggestions: [
    {
      forecast: { url: "https://example.com" },
      current_conditions: {
        temperature: { c: 22, f: 72 },
        icon_id: 3,
        summary: "Sunny",
      },
    },
  ],
  locationData: { city: "Testville" },
};

// base mockState for general Weather-rendering tests.
// Opt-in is disabled here since it's only shown in specific locations
const mockState = {
  ...INITIAL_STATE,
  Prefs: {
    ...INITIAL_STATE.Prefs,
    values: {
      ...INITIAL_STATE.Prefs.values,
      [PREF_SYS_SHOW_WEATHER]: true,
      [PREF_SYS_SHOW_WEATHER_OPT_IN]: false,
      "feeds.weatherfeed": true,
    },
  },
  Weather: { ...weatherInit },
};

// mock state for opt-in prompt tests.
// Ensures the opt-in dialog appears by default.
const optInMockState = {
  ...mockState,
  Prefs: {
    ...mockState.Prefs,
    values: {
      ...mockState.Prefs.values,
      showWeather: true,
      [PREF_SYS_SHOW_WEATHER_OPT_IN]: true,
      [PREF_OPT_IN_DISPLAYED]: true,
      [PREF_OPT_IN_ACCEPTED]: false,
      [PREF_STATIC_WEATHER_DATA]: true,
      "weather.locationSearchEnabled": true,
      "weather.display": "simple",
      "weather.temperatureUnits": "c",
    },
  },
};

function WrapWithProvider({ children, state = INITIAL_STATE }) {
  const store = createStore(combineReducers(reducers), state);
  return <Provider store={store}>{children}</Provider>;
}

describe("<Weather>", () => {
  let wrapper;
  let sandbox;
  let dispatch;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    dispatch = sandbox.stub();
  });

  afterEach(() => {
    sandbox.restore();
    wrapper?.unmount();
  });

  it("should render and show <Weather> if the `system.showWeather` pref is enabled", () => {
    wrapper = mount(
      <WrapWithProvider state={mockState}>
        <Weather dispatch={dispatch} />
      </WrapWithProvider>
    );
    assert.ok(wrapper.exists());
    assert.ok(wrapper.find(".weather").exists());
  });

  describe("Opt-in prompt actions", () => {
    it("should dispatch correct actions when user accepts weather opt-in", () => {
      const store = createStore(combineReducers(reducers), optInMockState);
      sinon.spy(store, "dispatch");

      wrapper = mount(
        <Provider store={store}>
          <Weather />
        </Provider>
      );

      const acceptBtn = wrapper.find("#accept-opt-in");
      acceptBtn.simulate("click", { preventDefault() {} });

      const dispatchedActions = store.dispatch
        .getCalls()
        .map(call => call.args[0]);

      // Old events (backward compatibility)
      assert.ok(
        dispatchedActions.some(
          action => action.type === at.WEATHER_USER_OPT_IN_LOCATION
        ),
        "Expected WEATHER_USER_OPT_IN_LOCATION to be dispatched"
      );

      assert.ok(
        dispatchedActions.some(
          action =>
            action.type === at.WEATHER_OPT_IN_PROMPT_SELECTION &&
            action.data === "accepted opt-in"
        ),
        "Expected WEATHER_OPT_IN_PROMPT_SELECTION with accepted opt-in"
      );

      // New unified event
      const unifiedEvent = dispatchedActions.find(
        action => action.type === at.WIDGETS_USER_EVENT
      );
      assert.ok(unifiedEvent, "Expected WIDGETS_USER_EVENT to be dispatched");
      assert.equal(unifiedEvent.data.widget_name, "weather");
      assert.equal(unifiedEvent.data.widget_source, "widget");
      assert.equal(unifiedEvent.data.user_action, "opt_in_accepted");
      assert.equal(unifiedEvent.data.action_value, true);
      assert.equal(unifiedEvent.data.widget_size, "mini");
    });

    it("should dispatch correct actions when user rejects weather opt-in", () => {
      const store = createStore(combineReducers(reducers), optInMockState);
      sinon.spy(store, "dispatch");

      wrapper = mount(
        <Provider store={store}>
          <Weather />
        </Provider>
      );

      const acceptBtn = wrapper.find("#reject-opt-in");
      acceptBtn.simulate("click", { preventDefault() {} });

      const dispatchedActions = store.dispatch
        .getCalls()
        .map(call => call.args[0]);

      // Old event (backward compatibility)
      assert.ok(
        dispatchedActions.some(
          action =>
            action.type === at.WEATHER_OPT_IN_PROMPT_SELECTION &&
            action.data === "rejected opt-in"
        ),
        "Expected WEATHER_OPT_IN_PROMPT_SELECTION with rejected opt-in"
      );

      // New unified event
      const unifiedEvent = dispatchedActions.find(
        action => action.type === at.WIDGETS_USER_EVENT
      );
      assert.ok(unifiedEvent, "Expected WIDGETS_USER_EVENT to be dispatched");
      assert.equal(unifiedEvent.data.widget_name, "weather");
      assert.equal(unifiedEvent.data.widget_source, "widget");
      assert.equal(unifiedEvent.data.user_action, "opt_in_accepted");
      assert.equal(unifiedEvent.data.action_value, false);
      assert.equal(unifiedEvent.data.widget_size, "mini");
    });

    it("should render a shorter context menu when system.showWeatherOptIn is enabled", () => {
      wrapper = mount(
        <WrapWithProvider state={optInMockState}>
          <Weather dispatch={dispatch} />
        </WrapWithProvider>
      );

      // panel-list should render with only the shortened menu items
      const panelList = wrapper.find("panel-list");
      assert.ok(panelList.exists(), "Expected panel-list to render");

      // Check that the correct menu items are present
      assert.ok(
        wrapper.find("#weather-menu-change-location").exists(),
        "ChangeWeatherLocation item should be present"
      );
      assert.ok(
        wrapper.find("#weather-menu-detect-location").exists(),
        "DetectLocation item should be present"
      );
      assert.ok(
        wrapper.find("#weather-menu-hide").exists(),
        "HideWeather item should be present"
      );
      assert.ok(
        wrapper.find("#weather-menu-learn-more").exists(),
        "OpenLearnMoreURL item should be present"
      );

      // Check that temperature/display options are NOT present (shortened menu)
      assert.ok(
        !wrapper.find("#weather-menu-temp-celsius").exists(),
        "Temperature unit option should not be present in shortened menu"
      );
    });

    it("should dispatch correct actions when 'Detect my location' option in context menu is clicked", () => {
      const store = createStore(combineReducers(reducers), optInMockState);
      sinon.spy(store, "dispatch");

      wrapper = mount(
        <Provider store={store}>
          <Weather />
        </Provider>
      );

      // Mock the panel element's hide method
      const weatherInstance = wrapper.find("_Weather").instance();
      weatherInstance.panelElement = { hide: sinon.spy() };

      // Find the detect location panel-item
      const detectLocationBtn = wrapper.find("#weather-menu-detect-location");

      assert.ok(
        detectLocationBtn.exists(),
        "Detect location button should exist"
      );

      detectLocationBtn.simulate("click", { preventDefault() {} });

      const dispatchedActions = store.dispatch
        .getCalls()
        .map(call => call.args[0]);

      // Old event (backward compatibility)
      assert.ok(
        dispatchedActions.some(
          action => action.type === at.WEATHER_USER_OPT_IN_LOCATION
        ),
        "Expected WEATHER_USER_OPT_IN_LOCATION to be dispatched"
      );

      // New unified event
      const unifiedEvent = dispatchedActions.find(
        action => action.type === at.WIDGETS_USER_EVENT
      );
      assert.ok(unifiedEvent, "Expected WIDGETS_USER_EVENT to be dispatched");
      assert.equal(unifiedEvent.data.widget_name, "weather");
      assert.equal(unifiedEvent.data.widget_source, "context_menu");
      assert.equal(unifiedEvent.data.user_action, "detect_location");
      assert.equal(unifiedEvent.data.widget_size, "mini");
    });

    it("should dispatch correct actions when weather display mode is changed", () => {
      const fullMenuState = {
        ...optInMockState,
        Prefs: {
          ...optInMockState.Prefs,
          values: {
            ...optInMockState.Prefs.values,
            [PREF_STATIC_WEATHER_DATA]: false,
          },
        },
      };
      const store = createStore(combineReducers(reducers), fullMenuState);
      sinon.spy(store, "dispatch");

      wrapper = mount(
        <Provider store={store}>
          <Weather />
        </Provider>
      );

      const weatherInstance = wrapper.find("_Weather").instance();
      weatherInstance.panelElement = { hide: sinon.spy() };

      const displayMenuItem = wrapper.find("#weather-menu-display-detailed");
      assert.ok(displayMenuItem.exists(), "Display menu item should exist");

      displayMenuItem.simulate("click", { preventDefault() {} });

      const dispatchedActions = store.dispatch
        .getCalls()
        .map(call => call.args[0]);

      const unifiedEvent = dispatchedActions.find(
        action => action.type === at.WIDGETS_USER_EVENT
      );
      assert.ok(unifiedEvent, "Expected WIDGETS_USER_EVENT to be dispatched");
      assert.equal(unifiedEvent.data.widget_name, "weather");
      assert.equal(unifiedEvent.data.widget_source, "context_menu");
      assert.equal(unifiedEvent.data.user_action, "change_weather_display");
      assert.equal(unifiedEvent.data.action_value, "detailed");
      assert.equal(unifiedEvent.data.widget_size, "mini");
    });

    it("should dispatch correct actions when temperature unit is changed", () => {
      const fullMenuState = {
        ...optInMockState,
        Prefs: {
          ...optInMockState.Prefs,
          values: {
            ...optInMockState.Prefs.values,
            [PREF_STATIC_WEATHER_DATA]: false,
          },
        },
      };
      const store = createStore(combineReducers(reducers), fullMenuState);
      sinon.spy(store, "dispatch");

      wrapper = mount(
        <Provider store={store}>
          <Weather />
        </Provider>
      );

      const weatherInstance = wrapper.find("_Weather").instance();
      weatherInstance.panelElement = { hide: sinon.spy() };

      const tempMenuItem = wrapper.find("#weather-menu-temp-fahrenheit");
      assert.ok(tempMenuItem.exists(), "Temperature menu item should exist");

      tempMenuItem.simulate("click", { preventDefault() {} });

      const dispatchedActions = store.dispatch
        .getCalls()
        .map(call => call.args[0]);

      const unifiedEvent = dispatchedActions.find(
        action => action.type === at.WIDGETS_USER_EVENT
      );
      assert.ok(unifiedEvent, "Expected WIDGETS_USER_EVENT to be dispatched");
      assert.equal(unifiedEvent.data.widget_name, "weather");
      assert.equal(unifiedEvent.data.widget_source, "context_menu");
      assert.equal(unifiedEvent.data.user_action, "change_temperature_units");
      assert.equal(unifiedEvent.data.action_value, "f");
      assert.equal(unifiedEvent.data.widget_size, "mini");
    });
  });
});

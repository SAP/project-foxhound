/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// @nova-cleanup(move-directory): Move to test/unit/content-src/components/CustomizeMenu/ after Nova ships

import React from "react";
import { mount } from "enzyme";
import { Provider } from "react-redux";
import { INITIAL_STATE, reducers } from "common/Reducers.sys.mjs";
import { combineReducers, createStore } from "redux";
import { WIDGET_REGISTRY } from "common/WidgetsRegistry.mjs";
import { WidgetsManagementPanel } from "content-src/components/Nova/CustomizeMenu/WidgetsManagementPanel/WidgetsManagementPanel";

const defaultSizeFor = telemetryName =>
  WIDGET_REGISTRY.find(w => w.telemetryName === telemetryName).defaultSize;

function WrapWithProvider({ children, state = INITIAL_STATE }) {
  const store = createStore(combineReducers(reducers), state);
  return <Provider store={store}>{children}</Provider>;
}

describe("<WidgetsManagementPanel>", () => {
  let wrapper;
  let sandbox;
  let DEFAULT_PROPS;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    DEFAULT_PROPS = {
      onSubpanelToggle: sandbox.stub(),
      togglePanel: sandbox.stub(),
      showPanel: false,
      enabledSections: { weatherEnabled: false },
      enabledWidgets: {
        timerEnabled: false,
        listsEnabled: false,
        widgetsMaximized: false,
        widgetsMayBeMaximized: false,
      },
      mayHaveWeather: true,
      mayHaveTimerWidget: true,
      mayHaveListsWidget: true,
      mayHaveWeatherForecast: false,
      weatherDisplay: "simple",
      setPref: sandbox.stub(),
    };
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
    sandbox.restore();
  });

  it("should render the component", () => {
    wrapper = mount(
      <WrapWithProvider>
        <WidgetsManagementPanel {...DEFAULT_PROPS} />
      </WrapWithProvider>
    );
    assert.ok(wrapper.exists());
  });

  it("should render the manage widgets button", () => {
    wrapper = mount(
      <WrapWithProvider>
        <WidgetsManagementPanel {...DEFAULT_PROPS} />
      </WrapWithProvider>
    );
    assert.ok(wrapper.find("moz-box-button").exists());
  });

  it("should call togglePanel when button is clicked", () => {
    wrapper = mount(
      <WrapWithProvider>
        <WidgetsManagementPanel {...DEFAULT_PROPS} />
      </WrapWithProvider>
    );
    wrapper.find("moz-box-button").simulate("click");
    assert.calledOnce(DEFAULT_PROPS.togglePanel);
  });

  it("should render the panel when showPanel is true", () => {
    wrapper = mount(
      <WrapWithProvider>
        <WidgetsManagementPanel {...DEFAULT_PROPS} showPanel={true} />
      </WrapWithProvider>
    );
    assert.ok(wrapper.find(".widgets-mgmt-panel").exists());
  });

  it("should not render the panel when showPanel is false", () => {
    wrapper = mount(
      <WrapWithProvider>
        <WidgetsManagementPanel {...DEFAULT_PROPS} showPanel={false} />
      </WrapWithProvider>
    );
    assert.isFalse(wrapper.find(".widgets-mgmt-panel").exists());
  });

  it("should call onSubpanelToggle when panel opens", () => {
    wrapper = mount(
      <WrapWithProvider>
        <WidgetsManagementPanel {...DEFAULT_PROPS} showPanel={false} />
      </WrapWithProvider>
    );

    wrapper.setProps({
      children: (
        <WidgetsManagementPanel
          {...DEFAULT_PROPS}
          showPanel={true}
          onSubpanelToggle={DEFAULT_PROPS.onSubpanelToggle}
        />
      ),
    });

    assert.called(DEFAULT_PROPS.onSubpanelToggle);
  });

  it("should call togglePanel when arrow button is clicked", () => {
    wrapper = mount(
      <WrapWithProvider>
        <WidgetsManagementPanel {...DEFAULT_PROPS} showPanel={true} />
      </WrapWithProvider>
    );
    wrapper.find(".arrow-button").simulate("click");
    assert.calledOnce(DEFAULT_PROPS.togglePanel);
  });

  it("should render panel title", () => {
    wrapper = mount(
      <WrapWithProvider>
        <WidgetsManagementPanel {...DEFAULT_PROPS} showPanel={true} />
      </WrapWithProvider>
    );
    const panel = wrapper.find(".widgets-mgmt-panel");
    assert.ok(panel.exists());
    assert.equal(panel.find("h2").length, 1);
  });

  describe("widget toggles", () => {
    it("should render weather toggle when mayHaveWeather is true", () => {
      wrapper = mount(
        <WrapWithProvider>
          <WidgetsManagementPanel {...DEFAULT_PROPS} showPanel={true} />
        </WrapWithProvider>
      );
      assert.ok(wrapper.find("#weather-toggle").exists());
    });

    it("should not render weather toggle when mayHaveWeather is false", () => {
      wrapper = mount(
        <WrapWithProvider>
          <WidgetsManagementPanel
            {...DEFAULT_PROPS}
            showPanel={true}
            mayHaveWeather={false}
          />
        </WrapWithProvider>
      );
      assert.isFalse(wrapper.find("#weather-toggle").exists());
    });

    it("should render timer toggle when mayHaveTimerWidget is true", () => {
      wrapper = mount(
        <WrapWithProvider>
          <WidgetsManagementPanel {...DEFAULT_PROPS} showPanel={true} />
        </WrapWithProvider>
      );
      assert.ok(wrapper.find("#timer-toggle").exists());
    });

    it("should not render timer toggle when mayHaveTimerWidget is false", () => {
      wrapper = mount(
        <WrapWithProvider>
          <WidgetsManagementPanel
            {...DEFAULT_PROPS}
            showPanel={true}
            mayHaveTimerWidget={false}
          />
        </WrapWithProvider>
      );
      assert.isFalse(wrapper.find("#timer-toggle").exists());
    });

    it("should render lists toggle when mayHaveListsWidget is true", () => {
      wrapper = mount(
        <WrapWithProvider>
          <WidgetsManagementPanel {...DEFAULT_PROPS} showPanel={true} />
        </WrapWithProvider>
      );
      assert.ok(wrapper.find("#lists-toggle").exists());
    });

    it("should not render lists toggle when mayHaveListsWidget is false", () => {
      wrapper = mount(
        <WrapWithProvider>
          <WidgetsManagementPanel
            {...DEFAULT_PROPS}
            showPanel={true}
            mayHaveListsWidget={false}
          />
        </WrapWithProvider>
      );
      assert.isFalse(wrapper.find("#lists-toggle").exists());
    });

    it("should reflect weatherEnabled in weather toggle pressed state", () => {
      wrapper = mount(
        <WrapWithProvider>
          <WidgetsManagementPanel
            {...DEFAULT_PROPS}
            showPanel={true}
            enabledSections={{ weatherEnabled: true }}
          />
        </WrapWithProvider>
      );
      assert.isTrue(wrapper.find("#weather-toggle").prop("pressed"));
    });

    it("should reflect timerEnabled in timer toggle pressed state", () => {
      wrapper = mount(
        <WrapWithProvider>
          <WidgetsManagementPanel
            {...DEFAULT_PROPS}
            showPanel={true}
            enabledWidgets={{
              ...DEFAULT_PROPS.enabledWidgets,
              timerEnabled: true,
            }}
          />
        </WrapWithProvider>
      );
      assert.isTrue(wrapper.find("#timer-toggle").prop("pressed"));
    });

    it("should reflect listsEnabled in lists toggle pressed state", () => {
      wrapper = mount(
        <WrapWithProvider>
          <WidgetsManagementPanel
            {...DEFAULT_PROPS}
            showPanel={true}
            enabledWidgets={{
              ...DEFAULT_PROPS.enabledWidgets,
              listsEnabled: true,
            }}
          />
        </WrapWithProvider>
      );
      assert.isTrue(wrapper.find("#lists-toggle").prop("pressed"));
    });
  });

  describe("dispatch on toggle", () => {
    it("should dispatch PREF_CHANGED and WIDGETS_ENABLED when weather toggle is fired", () => {
      const store = createStore(combineReducers(reducers), INITIAL_STATE);
      const dispatchSpy = sandbox.spy(store, "dispatch");

      wrapper = mount(
        <Provider store={store}>
          <WidgetsManagementPanel {...DEFAULT_PROPS} showPanel={true} />
        </Provider>
      );

      wrapper.find("#weather-toggle").prop("ontoggle")({
        target: {
          dataset: { preference: "showWeather", eventSource: "WEATHER" },
          pressed: true,
        },
      });

      assert.calledWith(
        dispatchSpy,
        sinon.match({ type: "TELEMETRY_USER_EVENT" })
      );
      assert.calledWith(dispatchSpy, sinon.match({ type: "WIDGETS_ENABLED" }));
    });

    it("should call setPref when a toggle is fired", () => {
      wrapper = mount(
        <WrapWithProvider>
          <WidgetsManagementPanel {...DEFAULT_PROPS} showPanel={true} />
        </WrapWithProvider>
      );

      wrapper.find("#weather-toggle").prop("ontoggle")({
        target: {
          dataset: { preference: "showWeather", eventSource: "WEATHER" },
          pressed: true,
        },
      });

      assert.calledOnce(DEFAULT_PROPS.setPref);
      assert.calledWith(DEFAULT_PROPS.setPref, "showWeather", true);
    });

    it("should dispatch PREF_CHANGED and WIDGETS_ENABLED when lists toggle is fired", () => {
      const store = createStore(combineReducers(reducers), INITIAL_STATE);
      const dispatchSpy = sandbox.spy(store, "dispatch");

      wrapper = mount(
        <Provider store={store}>
          <WidgetsManagementPanel {...DEFAULT_PROPS} showPanel={true} />
        </Provider>
      );

      wrapper.find("#lists-toggle").prop("ontoggle")({
        target: {
          dataset: {
            preference: "widgets.lists.enabled",
            eventSource: "WIDGET_LISTS",
          },
          pressed: true,
        },
      });

      assert.calledWith(
        dispatchSpy,
        sinon.match({ type: "TELEMETRY_USER_EVENT" })
      );
      assert.calledWith(dispatchSpy, sinon.match({ type: "WIDGETS_ENABLED" }));
    });

    it("should call setPref when lists toggle is fired", () => {
      wrapper = mount(
        <WrapWithProvider>
          <WidgetsManagementPanel {...DEFAULT_PROPS} showPanel={true} />
        </WrapWithProvider>
      );

      wrapper.find("#lists-toggle").prop("ontoggle")({
        target: {
          dataset: {
            preference: "widgets.lists.enabled",
            eventSource: "WIDGET_LISTS",
          },
          pressed: true,
        },
      });

      assert.calledOnce(DEFAULT_PROPS.setPref);
      assert.calledWith(DEFAULT_PROPS.setPref, "widgets.lists.enabled", true);
    });

    it("should dispatch PREF_CHANGED and WIDGETS_ENABLED when timer toggle is fired", () => {
      const store = createStore(combineReducers(reducers), INITIAL_STATE);
      const dispatchSpy = sandbox.spy(store, "dispatch");

      wrapper = mount(
        <Provider store={store}>
          <WidgetsManagementPanel {...DEFAULT_PROPS} showPanel={true} />
        </Provider>
      );

      wrapper.find("#timer-toggle").prop("ontoggle")({
        target: {
          dataset: {
            preference: "widgets.focusTimer.enabled",
            eventSource: "WIDGET_TIMER",
          },
          pressed: true,
        },
      });

      assert.calledWith(
        dispatchSpy,
        sinon.match({ type: "TELEMETRY_USER_EVENT" })
      );
      assert.calledWith(dispatchSpy, sinon.match({ type: "WIDGETS_ENABLED" }));
    });

    it("should call setPref when timer toggle is fired", () => {
      wrapper = mount(
        <WrapWithProvider>
          <WidgetsManagementPanel {...DEFAULT_PROPS} showPanel={true} />
        </WrapWithProvider>
      );

      wrapper.find("#timer-toggle").prop("ontoggle")({
        target: {
          dataset: {
            preference: "widgets.focusTimer.enabled",
            eventSource: "WIDGET_TIMER",
          },
          pressed: true,
        },
      });

      assert.calledOnce(DEFAULT_PROPS.setPref);
      assert.calledWith(
        DEFAULT_PROPS.setPref,
        "widgets.focusTimer.enabled",
        true
      );
    });

    it("should dispatch WIDGETS_ENABLED with enabled: false when toggled off", () => {
      const store = createStore(combineReducers(reducers), INITIAL_STATE);
      const dispatchSpy = sandbox.spy(store, "dispatch");

      wrapper = mount(
        <Provider store={store}>
          <WidgetsManagementPanel {...DEFAULT_PROPS} showPanel={true} />
        </Provider>
      );

      wrapper.find("#weather-toggle").prop("ontoggle")({
        target: {
          dataset: { preference: "showWeather", eventSource: "WEATHER" },
          pressed: false,
        },
      });

      assert.calledWith(
        dispatchSpy,
        sinon.match({
          type: "WIDGETS_ENABLED",
          data: sinon.match({ enabled: false }),
        })
      );
    });

    it("should dispatch WIDGETS_ENABLED with the weather widget's registry default size when no pref is set", () => {
      const store = createStore(combineReducers(reducers), INITIAL_STATE);
      const dispatchSpy = sandbox.spy(store, "dispatch");

      wrapper = mount(
        <Provider store={store}>
          <WidgetsManagementPanel {...DEFAULT_PROPS} showPanel={true} />
        </Provider>
      );

      wrapper.find("#weather-toggle").prop("ontoggle")({
        target: {
          dataset: { preference: "showWeather", eventSource: "WEATHER" },
          pressed: true,
        },
      });

      assert.calledWith(
        dispatchSpy,
        sinon.match({
          type: "WIDGETS_ENABLED",
          data: sinon.match({ widget_size: defaultSizeFor("weather") }),
        })
      );
    });

    it("should reflect a user-set weather size pref in widget_size", () => {
      const state = {
        ...INITIAL_STATE,
        Prefs: {
          ...INITIAL_STATE.Prefs,
          values: {
            ...INITIAL_STATE.Prefs.values,
            "widgets.weather.size": "large",
          },
        },
      };
      const store = createStore(combineReducers(reducers), state);
      const dispatchSpy = sandbox.spy(store, "dispatch");

      wrapper = mount(
        <Provider store={store}>
          <WidgetsManagementPanel {...DEFAULT_PROPS} showPanel={true} />
        </Provider>
      );

      wrapper.find("#weather-toggle").prop("ontoggle")({
        target: {
          dataset: { preference: "showWeather", eventSource: "WEATHER" },
          pressed: true,
        },
      });

      assert.calledWith(
        dispatchSpy,
        sinon.match({
          type: "WIDGETS_ENABLED",
          data: sinon.match({ widget_size: "large" }),
        })
      );
    });

    it("should reflect a trainhopConfig size override when no size pref is set", () => {
      const state = {
        ...INITIAL_STATE,
        Prefs: {
          ...INITIAL_STATE.Prefs,
          values: {
            ...INITIAL_STATE.Prefs.values,
            trainhopConfig: { widgets: { weatherSize: "large" } },
          },
        },
      };
      const store = createStore(combineReducers(reducers), state);
      const dispatchSpy = sandbox.spy(store, "dispatch");

      wrapper = mount(
        <Provider store={store}>
          <WidgetsManagementPanel {...DEFAULT_PROPS} showPanel={true} />
        </Provider>
      );

      wrapper.find("#weather-toggle").prop("ontoggle")({
        target: {
          dataset: { preference: "showWeather", eventSource: "WEATHER" },
          pressed: true,
        },
      });

      assert.calledWith(
        dispatchSpy,
        sinon.match({
          type: "WIDGETS_ENABLED",
          data: sinon.match({ widget_size: "large" }),
        })
      );
    });

    it("should dispatch WIDGETS_ENABLED with the focus timer widget's registry default size when no pref is set", () => {
      const store = createStore(combineReducers(reducers), INITIAL_STATE);
      const dispatchSpy = sandbox.spy(store, "dispatch");

      wrapper = mount(
        <Provider store={store}>
          <WidgetsManagementPanel {...DEFAULT_PROPS} showPanel={true} />
        </Provider>
      );

      wrapper.find("#timer-toggle").prop("ontoggle")({
        target: {
          dataset: {
            preference: "widgets.focusTimer.enabled",
            eventSource: "WIDGET_TIMER",
          },
          pressed: true,
        },
      });

      assert.calledWith(
        dispatchSpy,
        sinon.match({
          type: "WIDGETS_ENABLED",
          data: sinon.match({ widget_size: defaultSizeFor("focus_timer") }),
        })
      );
    });
  });
});

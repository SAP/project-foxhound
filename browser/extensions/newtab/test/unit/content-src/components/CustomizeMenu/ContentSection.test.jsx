import { actionCreators as ac } from "common/Actions.mjs";
import { ContentSection } from "content-src/components/CustomizeMenu/ContentSection/ContentSection";
import { mount } from "enzyme";
import React from "react";

import { INITIAL_STATE, reducers } from "common/Reducers.sys.mjs";
import { combineReducers, createStore } from "redux";
import { Provider } from "react-redux";

const DEFAULT_PROPS = {
  mayHaveWidgets: false,
  mayHaveWeather: true,
  mayHaveTimerWidget: false,
  mayHaveListsWidget: false,
  wallpapersEnabled: false,
  activeWallpaper: null,
  exitEventFired: false,
  enabledSections: {
    topSitesEnabled: true,
    pocketEnabled: true,
    weatherEnabled: true,
    showInferredPersonalizationEnabled: false,
    topSitesRowsCount: 1,
  },
  enabledWidgets: {
    timerEnabled: false,
    listsEnabled: false,
  },
  dispatch: sinon.stub(),
  setPref: sinon.stub(),
  openPreferences: sinon.stub(),
  pocketRegion: "US",
  mayHaveInferredPersonalization: false,
  mayHaveTopicSections: false,
};

function WrapWithProvider({ children, state = INITIAL_STATE }) {
  const store = createStore(combineReducers(reducers), state);
  return <Provider store={store}>{children}</Provider>;
}

describe("ContentSection", () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mount(<ContentSection {...DEFAULT_PROPS} />);
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
      wrapper = null;
    }
  });

  it("should render the component", () => {
    assert.ok(wrapper.exists());
  });

  it("should look for a data-event-source attribute and dispatch an event for INPUT", () => {
    wrapper.instance().onPreferenceSelect({
      target: {
        nodeName: "INPUT",
        checked: true,
        dataset: { preference: "foo", eventSource: "bar" },
      },
    });

    assert.calledWith(
      DEFAULT_PROPS.dispatch,
      ac.UserEvent({
        event: "PREF_CHANGED",
        source: "bar",
        value: { status: true, menu_source: "CUSTOMIZE_MENU" },
      })
    );
    assert.calledWith(DEFAULT_PROPS.setPref, "foo", true);
  });

  it("should have data-event-source attributes on relevant pref changing inputs", () => {
    wrapper = mount(<ContentSection {...DEFAULT_PROPS} />);
    assert.equal(
      wrapper.find("#weather-toggle").prop("data-event-source"),
      "WEATHER"
    );
    assert.equal(
      wrapper.find("#shortcuts-toggle").prop("data-event-source"),
      "TOP_SITES"
    );
    assert.equal(
      wrapper.find("#pocket-toggle").prop("data-event-source"),
      "TOP_STORIES"
    );
  });

  // Bug 1985305 - "Widgets Toggle Section" Layout

  it("renders the Widgets section when mayHaveWidgets = true", () => {
    wrapper = mount(
      <WrapWithProvider>
        <ContentSection {...DEFAULT_PROPS} mayHaveWidgets={true} />
      </WrapWithProvider>
    );
    assert.isTrue(wrapper.find(".widgets-section").exists());
  });

  it("does not render the Widgets section when mayHaveWidgets = false", () => {
    wrapper = mount(
      <WrapWithProvider>
        <ContentSection {...DEFAULT_PROPS} mayHaveWidgets={false} />
      </WrapWithProvider>
    );
    assert.isFalse(wrapper.find(".widgets-section").exists());
  });

  it("places Weather under Widgets when widgets are enabled and doesn't render default Weather placement", () => {
    wrapper = mount(
      <WrapWithProvider>
        <ContentSection
          {...DEFAULT_PROPS}
          mayHaveWidgets={true}
          mayHaveWeather={true}
          enabledSections={{
            ...DEFAULT_PROPS.enabledSections,
            weatherEnabled: true,
          }}
        />
      </WrapWithProvider>
    );

    assert.isTrue(
      wrapper.find(".widgets-section #weather-section #weather-toggle").exists()
    );
    assert.isFalse(wrapper.find(".settings-toggles #weather-section").exists());
  });

  it("places Weather in the default area when widgets are disabled", () => {
    wrapper = mount(
      <WrapWithProvider>
        <ContentSection
          {...DEFAULT_PROPS}
          mayHaveWidgets={false}
          mayHaveWeather={true}
        />
      </WrapWithProvider>
    );

    assert.isTrue(
      wrapper
        .find(".settings-toggles #weather-section #weather-toggle")
        .exists()
    );
    assert.isFalse(wrapper.find(".widgets-section #weather-section").exists());
  });

  it("renders Lists toggle only when mayHaveListsWidget = true in Widgets section", () => {
    wrapper = mount(
      <WrapWithProvider>
        <ContentSection
          {...DEFAULT_PROPS}
          mayHaveWidgets={true}
          mayHaveListsWidget={true}
          enabledWidgets={{
            ...DEFAULT_PROPS.enabledWidgets,
            listsEnabled: true,
          }}
        />
      </WrapWithProvider>
    );

    assert.isTrue(
      wrapper
        .find(".widgets-section #lists-widget-section #lists-toggle")
        .exists()
    );

    wrapper.setProps({
      children: (
        <ContentSection
          {...DEFAULT_PROPS}
          mayHaveWidgets={true}
          mayHaveListsWidget={false}
        />
      ),
    });
    assert.isFalse(wrapper.find("#lists-widget-section").exists());
  });

  it("renders Timer toggle only when mayHaveTimerWidget = true in Widgets section", () => {
    wrapper = mount(
      <WrapWithProvider>
        <ContentSection
          {...DEFAULT_PROPS}
          mayHaveWidgets={true}
          mayHaveTimerWidget={true}
          enabledWidgets={{
            ...DEFAULT_PROPS.enabledWidgets,
            timerEnabled: true,
          }}
        />
      </WrapWithProvider>
    );

    assert.isTrue(
      wrapper
        .find(".widgets-section #timer-widget-section #timer-toggle")
        .exists()
    );

    wrapper.setProps({
      children: (
        <ContentSection
          {...DEFAULT_PROPS}
          mayHaveWidgets={true}
          mayHaveTimerWidget={false}
        />
      ),
    });
    assert.isFalse(wrapper.find("#timer-widget-section").exists());
  });

  it("should dispatch WIDGETS_ENABLED with widget_size=medium when widgetsMayBeMaximized is false", () => {
    const dispatch = sinon.spy();
    wrapper = mount(
      <ContentSection
        {...DEFAULT_PROPS}
        dispatch={dispatch}
        enabledWidgets={{
          listsEnabled: false,
          timerEnabled: false,
          widgetsMaximized: false,
          widgetsMayBeMaximized: false,
        }}
      />
    );

    wrapper.instance().onPreferenceSelect({
      target: {
        nodeName: "INPUT",
        checked: true,
        dataset: {
          preference: "widgets.lists.enabled",
          eventSource: "WIDGET_LISTS",
        },
      },
    });

    const widgetsEnabledCall = dispatch
      .getCalls()
      .find(call => call.args[0].type === "WIDGETS_ENABLED");
    assert.ok(widgetsEnabledCall, "Expected WIDGETS_ENABLED to be dispatched");
    assert.equal(
      widgetsEnabledCall.args[0].data.widget_size,
      "medium",
      "widget_size should be medium when widgets.system.maximized is false"
    );
  });

  it("should dispatch WIDGETS_ENABLED with widget_size=mini for Weather widget", () => {
    const dispatch = sinon.spy();
    wrapper = mount(
      <ContentSection
        {...DEFAULT_PROPS}
        dispatch={dispatch}
        enabledWidgets={{
          widgetsMaximized: false,
          widgetsMayBeMaximized: false,
        }}
      />
    );

    wrapper.instance().onPreferenceSelect({
      target: {
        nodeName: "INPUT",
        checked: true,
        dataset: {
          preference: "showWeather",
          eventSource: "WEATHER",
        },
      },
    });

    const widgetsEnabledCall = dispatch
      .getCalls()
      .find(call => call.args[0].type === "WIDGETS_ENABLED");
    assert.ok(widgetsEnabledCall, "Expected WIDGETS_ENABLED to be dispatched");
    assert.equal(
      widgetsEnabledCall.args[0].data.widget_name,
      "weather",
      "widget_name should be weather"
    );
    assert.equal(
      widgetsEnabledCall.args[0].data.widget_size,
      "mini",
      "widget_size should always be mini for Weather widget"
    );
  });
});

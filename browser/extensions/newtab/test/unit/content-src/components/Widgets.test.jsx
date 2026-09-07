import React from "react";
import { mount } from "enzyme";
import { Provider } from "react-redux";
import { INITIAL_STATE, reducers } from "common/Reducers.sys.mjs";
import { combineReducers, createStore } from "redux";
import {
  Widgets,
  resetTimerToDefaults,
} from "content-src/components/Widgets/Widgets";
import { Lists } from "content-src/components/Widgets/Lists/Lists";
import { actionTypes as at } from "common/Actions.mjs";
import { FocusTimer } from "content-src/components/Widgets/FocusTimer/FocusTimer";
import { BaseContext } from "content-src/lib/BaseContext";

const PREF_WIDGETS_ENABLED = "widgets.enabled";
const PREF_WIDGETS_LISTS_ENABLED = "widgets.lists.enabled";
const PREF_WIDGETS_SYSTEM_LISTS_ENABLED = "widgets.system.lists.enabled";
const PREF_WIDGETS_TIMER_ENABLED = "widgets.focusTimer.enabled";
const PREF_WIDGETS_SYSTEM_TIMER_ENABLED = "widgets.system.focusTimer.enabled";
const PREF_WIDGETS_SPORTS_WIDGET_ENABLED = "widgets.sportsWidget.enabled";
const PREF_WIDGETS_CLOCKS_ENABLED = "widgets.clocks.enabled";
const PREF_WIDGETS_FEEDBACK_ENABLED = "widgets.feedback.enabled";
const PREF_WIDGETS_HIDE_ALL_TOAST_ENABLED = "widgets.hideAllToast.enabled";

function WrapWithProvider({ children, state = INITIAL_STATE }) {
  const store = createStore(combineReducers(reducers), state);
  return <Provider store={store}>{children}</Provider>;
}

describe("<Widgets>", () => {
  it("should render and show <Lists> if list prefs are enabled", () => {
    const state = {
      ...INITIAL_STATE,
      Prefs: {
        ...INITIAL_STATE.Prefs,
        values: {
          ...INITIAL_STATE.Prefs.values,
          [PREF_WIDGETS_ENABLED]: true,
          [PREF_WIDGETS_LISTS_ENABLED]: true,
          [PREF_WIDGETS_SYSTEM_LISTS_ENABLED]: true,
        },
      },
    };
    const wrapper = mount(
      <WrapWithProvider state={state}>
        <Widgets />
      </WrapWithProvider>
    );
    assert.ok(wrapper.exists());
    assert.ok(wrapper.find(".widgets-container").exists());
    assert.ok(wrapper.find(Lists).exists());
  });

  it("should render and show <FocusTimer> if timer prefs are enabled", () => {
    const state = {
      ...INITIAL_STATE,
      Prefs: {
        ...INITIAL_STATE.Prefs,
        values: {
          ...INITIAL_STATE.Prefs.values,
          [PREF_WIDGETS_ENABLED]: true,
          [PREF_WIDGETS_TIMER_ENABLED]: true,
          [PREF_WIDGETS_SYSTEM_TIMER_ENABLED]: true,
        },
      },
    };
    const wrapper = mount(
      <WrapWithProvider state={state}>
        <Widgets />
      </WrapWithProvider>
    );
    assert.ok(wrapper.exists());
    assert.ok(wrapper.find(".widgets-container").exists());
    assert.ok(wrapper.find(FocusTimer).exists());
  });

  it("should render nothing when widgetsEnabled is false, even if individual widget prefs are on", () => {
    const state = {
      ...INITIAL_STATE,
      Prefs: {
        ...INITIAL_STATE.Prefs,
        values: {
          ...INITIAL_STATE.Prefs.values,
          [PREF_WIDGETS_ENABLED]: false,
          [PREF_WIDGETS_LISTS_ENABLED]: true,
          [PREF_WIDGETS_SYSTEM_LISTS_ENABLED]: true,
          [PREF_WIDGETS_TIMER_ENABLED]: true,
          [PREF_WIDGETS_SYSTEM_TIMER_ENABLED]: true,
        },
      },
    };
    const wrapper = mount(
      <WrapWithProvider state={state}>
        <Widgets />
      </WrapWithProvider>
    );
    assert.ok(!wrapper.find(".widgets-wrapper").exists());
    assert.ok(!wrapper.find(Lists).exists());
    assert.ok(!wrapper.find(FocusTimer).exists());
  });

  it("should not render FocusTimer when timer pref is disabled", () => {
    const state = {
      ...INITIAL_STATE,
      Prefs: {
        ...INITIAL_STATE.Prefs,
        values: {
          ...INITIAL_STATE.Prefs.values,
          [PREF_WIDGETS_TIMER_ENABLED]: false,
          [PREF_WIDGETS_SYSTEM_TIMER_ENABLED]: true,
        },
      },
    };
    const wrapper = mount(
      <WrapWithProvider state={state}>
        <Widgets />
      </WrapWithProvider>
    );
    assert.ok(!wrapper.find(FocusTimer).exists());
  });

  describe("resetTimerToDefaults", () => {
    it("should dispatch WIDGETS_TIMER_RESET with focus timer defaults", () => {
      const dispatch = sinon.spy();
      const timerType = "focus";

      resetTimerToDefaults(dispatch, timerType);

      const resetCall = dispatch
        .getCalls()
        .find(call => call.args[0]?.type === at.WIDGETS_TIMER_RESET);
      const setTypeCall = dispatch
        .getCalls()
        .find(call => call.args[0]?.type === at.WIDGETS_TIMER_SET_TYPE);

      assert.ok(resetCall, "should dispatch WIDGETS_TIMER_RESET");
      assert.ok(setTypeCall, "should dispatch WIDGETS_TIMER_SET_TYPE");
      assert.equal(
        resetCall.args[0].data.duration,
        1500,
        "should reset focus to 25 minutes"
      );
      assert.equal(resetCall.args[0].data.initialDuration, 1500);
      assert.equal(resetCall.args[0].data.timerType, "focus");
      assert.equal(setTypeCall.args[0].data.timerType, "focus");
    });

    it("should dispatch WIDGETS_TIMER_RESET with break timer defaults", () => {
      const dispatch = sinon.spy();
      const timerType = "break";

      resetTimerToDefaults(dispatch, timerType);

      const resetCall = dispatch
        .getCalls()
        .find(call => call.args[0]?.type === at.WIDGETS_TIMER_RESET);

      assert.ok(resetCall, "should dispatch WIDGETS_TIMER_RESET");
      assert.equal(
        resetCall.args[0].data.duration,
        300,
        "should reset break to 5 minutes"
      );
      assert.equal(resetCall.args[0].data.initialDuration, 300);
      assert.equal(resetCall.args[0].data.timerType, "break");
    });
  });

  describe("handleHideAllWidgets", () => {
    let wrapper;
    let state;
    let store;

    beforeEach(() => {
      state = {
        ...INITIAL_STATE,
        Prefs: {
          ...INITIAL_STATE.Prefs,
          values: {
            ...INITIAL_STATE.Prefs.values,
            [PREF_WIDGETS_ENABLED]: true,
            [PREF_WIDGETS_LISTS_ENABLED]: true,
            [PREF_WIDGETS_SYSTEM_LISTS_ENABLED]: true,
            [PREF_WIDGETS_TIMER_ENABLED]: true,
            [PREF_WIDGETS_SYSTEM_TIMER_ENABLED]: true,
          },
        },
      };
      store = createStore(combineReducers(reducers), state);
      sinon.spy(store, "dispatch");
      wrapper = mount(
        <Provider store={store}>
          <Widgets />
        </Provider>
      );
    });

    afterEach(() => {
      store.dispatch.restore();
    });

    it("should dispatch SetPref actions when hide button is clicked", () => {
      const hideButton = wrapper.find("#hide-all-widgets-button");
      assert.ok(hideButton.exists(), "hide all button should exist");

      // Get the onClick handler and call it
      const onClickHandler = hideButton.prop("onClick");
      assert.ok(onClickHandler, "onClick handler should exist");
      onClickHandler({ preventDefault: () => {} });

      const allCalls = store.dispatch.getCalls();
      const setPrefCalls = allCalls.filter(
        call => call.args[0]?.type === at.SET_PREF
      );

      assert.equal(
        setPrefCalls.length,
        4,
        `should dispatch four SetPref actions, got ${setPrefCalls.length}.`
      );

      const listsPrefCall = setPrefCalls.find(
        call => call.args[0].data?.name === PREF_WIDGETS_LISTS_ENABLED
      );
      const timerPrefCall = setPrefCalls.find(
        call => call.args[0].data?.name === PREF_WIDGETS_TIMER_ENABLED
      );
      const sportsPrefCall = setPrefCalls.find(
        call => call.args[0].data?.name === PREF_WIDGETS_SPORTS_WIDGET_ENABLED
      );
      const clocksPrefCall = setPrefCalls.find(
        call => call.args[0].data?.name === PREF_WIDGETS_CLOCKS_ENABLED
      );

      assert.ok(listsPrefCall, "should dispatch SetPref for lists");
      assert.equal(
        listsPrefCall.args[0].data.value,
        false,
        "should set lists pref to false"
      );

      assert.ok(timerPrefCall, "should dispatch SetPref for timer");
      assert.equal(
        timerPrefCall.args[0].data.value,
        false,
        "should set timer pref to false"
      );

      assert.ok(sportsPrefCall, "should dispatch SetPref for sports widget");
      assert.equal(
        sportsPrefCall.args[0].data.value,
        false,
        "should set sports widget pref to false"
      );

      assert.ok(clocksPrefCall, "should dispatch SetPref for clocks");
      assert.equal(
        clocksPrefCall.args[0].data.value,
        false,
        "should set clocks pref to false"
      );
    });

    it("should dispatch SetPref actions when Enter key is pressed on hide button", () => {
      const hideButton = wrapper.find("#hide-all-widgets-button");

      // Trigger onKeyDown handler directly with Enter key
      hideButton.prop("onKeyDown")({ key: "Enter", preventDefault: () => {} });

      const setPrefCalls = store.dispatch
        .getCalls()
        .filter(call => call.args[0]?.type === at.SET_PREF);

      assert.equal(
        setPrefCalls.length,
        4,
        "should dispatch four SetPref actions"
      );

      const listsPrefCall = setPrefCalls.find(
        call => call.args[0].data?.name === PREF_WIDGETS_LISTS_ENABLED
      );
      const timerPrefCall = setPrefCalls.find(
        call => call.args[0].data?.name === PREF_WIDGETS_TIMER_ENABLED
      );
      const sportsPrefCall = setPrefCalls.find(
        call => call.args[0].data?.name === PREF_WIDGETS_SPORTS_WIDGET_ENABLED
      );
      const clocksPrefCall = setPrefCalls.find(
        call => call.args[0].data?.name === PREF_WIDGETS_CLOCKS_ENABLED
      );

      assert.ok(listsPrefCall, "should dispatch SetPref for lists");
      assert.equal(
        listsPrefCall.args[0].data.value,
        false,
        "should set lists pref to false"
      );

      assert.ok(timerPrefCall, "should dispatch SetPref for timer");
      assert.equal(
        timerPrefCall.args[0].data.value,
        false,
        "should set timer pref to false"
      );

      assert.ok(sportsPrefCall, "should dispatch SetPref for sports widget");
      assert.equal(
        sportsPrefCall.args[0].data.value,
        false,
        "should set sports widget pref to false"
      );

      assert.ok(clocksPrefCall, "should dispatch SetPref for clocks");
      assert.equal(
        clocksPrefCall.args[0].data.value,
        false,
        "should set clocks pref to false"
      );
    });

    it("should dispatch SetPref actions when Space key is pressed on hide button", () => {
      const hideButton = wrapper.find("#hide-all-widgets-button");

      // Trigger onKeyDown handler directly with Space key
      hideButton.prop("onKeyDown")({ key: " ", preventDefault: () => {} });

      const setPrefCalls = store.dispatch
        .getCalls()
        .filter(call => call.args[0]?.type === at.SET_PREF);

      assert.equal(
        setPrefCalls.length,
        4,
        "should dispatch four SetPref actions"
      );

      const listsPrefCall = setPrefCalls.find(
        call => call.args[0].data?.name === PREF_WIDGETS_LISTS_ENABLED
      );
      const timerPrefCall = setPrefCalls.find(
        call => call.args[0].data?.name === PREF_WIDGETS_TIMER_ENABLED
      );
      const sportsPrefCall = setPrefCalls.find(
        call => call.args[0].data?.name === PREF_WIDGETS_SPORTS_WIDGET_ENABLED
      );
      const clocksPrefCall = setPrefCalls.find(
        call => call.args[0].data?.name === PREF_WIDGETS_CLOCKS_ENABLED
      );

      assert.ok(listsPrefCall, "should dispatch SetPref for lists");
      assert.equal(
        listsPrefCall.args[0].data.value,
        false,
        "should set lists pref to false"
      );

      assert.ok(timerPrefCall, "should dispatch SetPref for timer");
      assert.equal(
        timerPrefCall.args[0].data.value,
        false,
        "should set timer pref to false"
      );

      assert.ok(sportsPrefCall, "should dispatch SetPref for sports widget");
      assert.equal(
        sportsPrefCall.args[0].data.value,
        false,
        "should set sports widget pref to false"
      );

      assert.ok(clocksPrefCall, "should dispatch SetPref for clocks");
      assert.equal(
        clocksPrefCall.args[0].data.value,
        false,
        "should set clocks pref to false"
      );
    });

    it("should not dispatch SetPref actions when other keys are pressed", () => {
      const hideButton = wrapper.find("#hide-all-widgets-button");

      const testKeys = ["Escape", "Tab", "a", "ArrowDown"];

      for (const key of testKeys) {
        store.dispatch.resetHistory();
        // Trigger onKeyDown handler directly
        hideButton.prop("onKeyDown")({ key });

        const setPrefCalls = store.dispatch
          .getCalls()
          .filter(call => call.args[0]?.type === at.SET_PREF);

        assert.equal(
          setPrefCalls.length,
          0,
          `should not dispatch SetPref for key: ${key}`
        );
      }
    });

    it("should dispatch WIDGETS_HIDE_ALL with correct data when hide button is clicked", () => {
      const hideButton = wrapper.find("#hide-all-widgets-button");
      hideButton.prop("onClick")({ preventDefault: () => {} });

      const dispatchedActions = store.dispatch
        .getCalls()
        .map(call => call.args[0]);

      const hideAllAction = dispatchedActions.find(
        action => action.type === at.WIDGETS_HIDE_ALL
      );

      assert.ok(hideAllAction, "should dispatch WIDGETS_HIDE_ALL event");
      assert.equal(
        hideAllAction.data.widget_size,
        "large",
        "widget_size should be large when widgets.system.maximized is false"
      );

      const listsTarget = hideAllAction.data.targets.find(
        t => t.telemetryName === "lists"
      );
      const timerTarget = hideAllAction.data.targets.find(
        t => t.telemetryName === "focus_timer"
      );
      assert.ok(listsTarget, "targets should include lists");
      assert.ok(timerTarget, "targets should include focus_timer");
      assert.equal(listsTarget.active, true);
      assert.equal(timerTarget.active, true);
    });

    it("should dispatch WIDGETS_HIDE_ALL with large size when widgets are maximized", () => {
      const maximizedState = {
        ...state,
        Prefs: {
          ...state.Prefs,
          values: {
            ...state.Prefs.values,
            "widgets.maximized": true,
            "widgets.system.maximized": true,
          },
        },
      };
      const maximizedStore = createStore(
        combineReducers(reducers),
        maximizedState
      );
      sinon.spy(maximizedStore, "dispatch");
      const maximizedWrapper = mount(
        <Provider store={maximizedStore}>
          <Widgets />
        </Provider>
      );

      const hideButton = maximizedWrapper.find("#hide-all-widgets-button");
      hideButton.prop("onClick")({ preventDefault: () => {} });

      const dispatchedActions = maximizedStore.dispatch
        .getCalls()
        .map(call => call.args[0]);

      const hideAllAction = dispatchedActions.find(
        action => action.type === at.WIDGETS_HIDE_ALL
      );

      assert.ok(hideAllAction, "should dispatch WIDGETS_HIDE_ALL");
      assert.equal(
        hideAllAction.data.widget_size,
        "large",
        "should report large size when maximized"
      );
      maximizedStore.dispatch.restore();
    });

    it("should dispatch WIDGETS_HIDE_ALL with active=true only for enabled widgets", () => {
      const hideButton = wrapper.find("#hide-all-widgets-button");
      hideButton.prop("onClick")({ preventDefault: () => {} });

      const dispatchedActions = store.dispatch
        .getCalls()
        .map(call => call.args[0]);

      const hideAllAction = dispatchedActions.find(
        action => action.type === at.WIDGETS_HIDE_ALL
      );

      assert.ok(hideAllAction, "should dispatch WIDGETS_HIDE_ALL");

      const listsTarget = hideAllAction.data.targets.find(
        t => t.telemetryName === "lists"
      );
      const timerTarget = hideAllAction.data.targets.find(
        t => t.telemetryName === "focus_timer"
      );

      assert.ok(listsTarget, "targets should include lists");
      assert.equal(listsTarget.active, true);
      assert.equal(listsTarget.enabledPref, PREF_WIDGETS_LISTS_ENABLED);

      assert.ok(timerTarget, "targets should include focus_timer");
      assert.equal(timerTarget.active, true);
      assert.equal(timerTarget.enabledPref, PREF_WIDGETS_TIMER_ENABLED);
    });

    it("should dispatch WIDGETS_HIDE_ALL with active=false for disabled widgets", () => {
      const partialState = {
        ...state,
        Prefs: {
          ...state.Prefs,
          values: {
            ...state.Prefs.values,
            [PREF_WIDGETS_LISTS_ENABLED]: true,
            [PREF_WIDGETS_SYSTEM_LISTS_ENABLED]: true,
            [PREF_WIDGETS_TIMER_ENABLED]: false,
            [PREF_WIDGETS_SYSTEM_TIMER_ENABLED]: true,
          },
        },
      };
      const partialStore = createStore(combineReducers(reducers), partialState);
      sinon.spy(partialStore, "dispatch");
      const partialWrapper = mount(
        <Provider store={partialStore}>
          <Widgets />
        </Provider>
      );

      const hideButton = partialWrapper.find("#hide-all-widgets-button");
      hideButton.prop("onClick")({ preventDefault: () => {} });

      const hideAllAction = partialStore.dispatch
        .getCalls()
        .map(call => call.args[0])
        .find(action => action.type === at.WIDGETS_HIDE_ALL);

      assert.ok(hideAllAction, "should dispatch WIDGETS_HIDE_ALL");

      const listsTarget = hideAllAction.data.targets.find(
        t => t.telemetryName === "lists"
      );
      const timerTarget = hideAllAction.data.targets.find(
        t => t.telemetryName === "focus_timer"
      );

      assert.ok(listsTarget, "targets should include lists");
      assert.equal(listsTarget.active, true, "lists should be active");

      assert.ok(timerTarget, "targets should include focus_timer");
      assert.equal(timerTarget.active, false, "timer should not be active");

      partialStore.dispatch.restore();
    });

    it("should dispatch WIDGETS_HIDE_ALL with correct widget_size when maximized", () => {
      const maximizedState = {
        ...state,
        Prefs: {
          ...state.Prefs,
          values: {
            ...state.Prefs.values,
            "widgets.maximized": true,
            "widgets.system.maximized": true,
          },
        },
      };
      const maximizedStore = createStore(
        combineReducers(reducers),
        maximizedState
      );
      sinon.spy(maximizedStore, "dispatch");
      const maximizedWrapper = mount(
        <Provider store={maximizedStore}>
          <Widgets />
        </Provider>
      );

      const hideButton = maximizedWrapper.find("#hide-all-widgets-button");
      hideButton.prop("onClick")({ preventDefault: () => {} });

      const hideAllAction = maximizedStore.dispatch
        .getCalls()
        .map(call => call.args[0])
        .find(action => action.type === at.WIDGETS_HIDE_ALL);

      assert.ok(hideAllAction, "should dispatch WIDGETS_HIDE_ALL");
      assert.equal(
        hideAllAction.data.widget_size,
        "large",
        "widget_size should be large when maximized"
      );

      maximizedStore.dispatch.restore();
    });

    it("should dispatch WIDGETS_HIDE_ALL when Enter key is pressed", () => {
      const hideButton = wrapper.find("#hide-all-widgets-button");
      hideButton.prop("onKeyDown")({ key: "Enter", preventDefault: () => {} });

      const hideAllAction = store.dispatch
        .getCalls()
        .map(call => call.args[0])
        .find(action => action.type === at.WIDGETS_HIDE_ALL);

      assert.ok(hideAllAction, "should dispatch WIDGETS_HIDE_ALL");

      const listsTarget = hideAllAction.data.targets.find(
        t => t.telemetryName === "lists"
      );
      const timerTarget = hideAllAction.data.targets.find(
        t => t.telemetryName === "focus_timer"
      );

      assert.ok(listsTarget, "targets should include lists");
      assert.equal(listsTarget.active, true);

      assert.ok(timerTarget, "targets should include focus_timer");
      assert.equal(timerTarget.active, true);
    });
  });

  describe("feedback link", () => {
    let baseState;

    beforeEach(() => {
      baseState = {
        ...INITIAL_STATE,
        Prefs: {
          ...INITIAL_STATE.Prefs,
          values: {
            ...INITIAL_STATE.Prefs.values,
            [PREF_WIDGETS_ENABLED]: true,
            [PREF_WIDGETS_LISTS_ENABLED]: true,
            [PREF_WIDGETS_SYSTEM_LISTS_ENABLED]: true,
          },
        },
      };
    });

    it("should not render the feedback link when feedbackEnabled is not set", () => {
      const wrapper = mount(
        <WrapWithProvider state={baseState}>
          <Widgets />
        </WrapWithProvider>
      );
      assert.ok(!wrapper.find(".widgets-feedback-link").exists());
    });

    it("should not render the feedback link when feedbackEnabled is false", () => {
      const state = {
        ...baseState,
        Prefs: {
          ...baseState.Prefs,
          values: {
            ...baseState.Prefs.values,
            trainhopConfig: { widgets: { feedbackEnabled: false } },
          },
        },
      };
      const wrapper = mount(
        <WrapWithProvider state={state}>
          <Widgets />
        </WrapWithProvider>
      );
      assert.ok(!wrapper.find(".widgets-feedback-link").exists());
    });

    it("should render the feedback link when trainhopConfig feedbackEnabled is true", () => {
      const state = {
        ...baseState,
        Prefs: {
          ...baseState.Prefs,
          values: {
            ...baseState.Prefs.values,
            trainhopConfig: { widgets: { feedbackEnabled: true } },
          },
        },
      };
      const wrapper = mount(
        <WrapWithProvider state={state}>
          <Widgets />
        </WrapWithProvider>
      );
      assert.ok(wrapper.find(".widgets-feedback-link").exists());
    });

    it("should render the feedback link when the pref is true", () => {
      const state = {
        ...baseState,
        Prefs: {
          ...baseState.Prefs,
          values: {
            ...baseState.Prefs.values,
            [PREF_WIDGETS_FEEDBACK_ENABLED]: true,
          },
        },
      };
      const wrapper = mount(
        <WrapWithProvider state={state}>
          <Widgets />
        </WrapWithProvider>
      );
      assert.ok(wrapper.find(".widgets-feedback-link").exists());
    });

    it("should dispatch OPEN_LINK and WIDGETS_CONTAINER_ACTION when feedback link is clicked", () => {
      const state = {
        ...baseState,
        Prefs: {
          ...baseState.Prefs,
          values: {
            ...baseState.Prefs.values,
            trainhopConfig: { widgets: { feedbackEnabled: true } },
          },
        },
      };
      const store = createStore(combineReducers(reducers), state);
      sinon.spy(store, "dispatch");
      const wrapper = mount(
        <Provider store={store}>
          <Widgets />
        </Provider>
      );

      wrapper.find(".widgets-feedback-link").prop("onClick")({
        preventDefault: () => {},
      });

      const dispatched = store.dispatch.getCalls().map(c => c.args[0]);
      const openLink = dispatched.find(a => a.type === at.OPEN_LINK);
      const containerAction = dispatched.find(
        a => a.type === at.WIDGETS_CONTAINER_ACTION
      );

      assert.ok(openLink, "should dispatch OPEN_LINK");
      assert.ok(containerAction, "should dispatch WIDGETS_CONTAINER_ACTION");
      assert.equal(containerAction.data.action_type, "feedback");
      assert.equal(containerAction.data.widget_size, "large");

      store.dispatch.restore();
    });

    it("should use a custom URL from trainhopConfig when provided", () => {
      const customUrl = "https://example.com/custom-feedback";
      const state = {
        ...baseState,
        Prefs: {
          ...baseState.Prefs,
          values: {
            ...baseState.Prefs.values,
            trainhopConfig: {
              widgets: {
                feedbackEnabled: true,
                feedbackUrl: customUrl,
              },
            },
          },
        },
      };
      const store = createStore(combineReducers(reducers), state);
      sinon.spy(store, "dispatch");
      const wrapper = mount(
        <Provider store={store}>
          <Widgets />
        </Provider>
      );

      wrapper.find(".widgets-feedback-link").prop("onClick")({
        preventDefault: () => {},
      });

      const dispatched = store.dispatch.getCalls().map(c => c.args[0]);
      const openLink = dispatched.find(a => a.type === at.OPEN_LINK);

      assert.ok(openLink, "should dispatch OPEN_LINK");
      assert.equal(openLink.data.url, customUrl);

      store.dispatch.restore();
    });
  });

  describe("hide all widgets toast", () => {
    let baseState;

    beforeEach(() => {
      baseState = {
        ...INITIAL_STATE,
        Prefs: {
          ...INITIAL_STATE.Prefs,
          values: {
            ...INITIAL_STATE.Prefs.values,
            [PREF_WIDGETS_ENABLED]: true,
            [PREF_WIDGETS_LISTS_ENABLED]: true,
            [PREF_WIDGETS_SYSTEM_LISTS_ENABLED]: true,
          },
        },
      };
    });

    function clickHideButton(store, wrapper) {
      wrapper.find("#hide-all-widgets-button").prop("onClick")({
        preventDefault: () => {},
      });
      return store.dispatch
        .getCalls()
        .map(c => c.args[0])
        .filter(a => a.type === at.SHOW_TOAST_MESSAGE);
    }

    it("should not dispatch toast when hideAllToastEnabled is not set", () => {
      const store = createStore(combineReducers(reducers), baseState);
      sinon.spy(store, "dispatch");
      const wrapper = mount(
        <Provider store={store}>
          <Widgets />
        </Provider>
      );
      const toastActions = clickHideButton(store, wrapper);
      assert.equal(toastActions.length, 0);
      store.dispatch.restore();
    });

    it("should not dispatch toast when pref is false", () => {
      const state = {
        ...baseState,
        Prefs: {
          ...baseState.Prefs,
          values: {
            ...baseState.Prefs.values,
            [PREF_WIDGETS_HIDE_ALL_TOAST_ENABLED]: false,
          },
        },
      };
      const store = createStore(combineReducers(reducers), state);
      sinon.spy(store, "dispatch");
      const wrapper = mount(
        <Provider store={store}>
          <Widgets />
        </Provider>
      );
      const toastActions = clickHideButton(store, wrapper);
      assert.equal(toastActions.length, 0);
      store.dispatch.restore();
    });

    it("should not dispatch toast when trainhopConfig hideAllToastEnabled is false", () => {
      const state = {
        ...baseState,
        Prefs: {
          ...baseState.Prefs,
          values: {
            ...baseState.Prefs.values,
            trainhopConfig: { widgets: { hideAllToastEnabled: false } },
          },
        },
      };
      const store = createStore(combineReducers(reducers), state);
      sinon.spy(store, "dispatch");
      const wrapper = mount(
        <Provider store={store}>
          <Widgets />
        </Provider>
      );
      const toastActions = clickHideButton(store, wrapper);
      assert.equal(toastActions.length, 0);
      store.dispatch.restore();
    });

    it("should dispatch toast when pref is true", () => {
      const state = {
        ...baseState,
        Prefs: {
          ...baseState.Prefs,
          values: {
            ...baseState.Prefs.values,
            [PREF_WIDGETS_HIDE_ALL_TOAST_ENABLED]: true,
          },
        },
      };
      const store = createStore(combineReducers(reducers), state);
      sinon.spy(store, "dispatch");
      const wrapper = mount(
        <Provider store={store}>
          <Widgets />
        </Provider>
      );
      wrapper.find("#hide-all-widgets-button").prop("onClick")({
        preventDefault: () => {},
      });
      const dispatched = store.dispatch.getCalls().map(c => c.args[0]);
      const toastAction = dispatched.find(
        a => a.data && a.data.toastId === "hideWidgetsToast"
      );
      assert.ok(toastAction, "should dispatch toast action");
      assert.equal(toastAction.data.showNotifications, true);
      store.dispatch.restore();
    });

    it("should dispatch toast when trainhopConfig hideAllToastEnabled is true", () => {
      const state = {
        ...baseState,
        Prefs: {
          ...baseState.Prefs,
          values: {
            ...baseState.Prefs.values,
            trainhopConfig: { widgets: { hideAllToastEnabled: true } },
          },
        },
      };
      const store = createStore(combineReducers(reducers), state);
      sinon.spy(store, "dispatch");
      const wrapper = mount(
        <Provider store={store}>
          <Widgets />
        </Provider>
      );
      wrapper.find("#hide-all-widgets-button").prop("onClick")({
        preventDefault: () => {},
      });
      const dispatched = store.dispatch.getCalls().map(c => c.args[0]);
      const toastAction = dispatched.find(
        a => a.data && a.data.toastId === "hideWidgetsToast"
      );
      assert.ok(toastAction, "should dispatch toast action");
      assert.equal(toastAction.data.showNotifications, true);
      store.dispatch.restore();
    });
  });

  describe("handleToggleMaximize", () => {
    let wrapper;
    let state;
    let store;

    beforeEach(() => {
      state = {
        ...INITIAL_STATE,
        Prefs: {
          ...INITIAL_STATE.Prefs,
          values: {
            ...INITIAL_STATE.Prefs.values,
            [PREF_WIDGETS_ENABLED]: true,
            [PREF_WIDGETS_LISTS_ENABLED]: true,
            [PREF_WIDGETS_SYSTEM_LISTS_ENABLED]: true,
            "widgets.maximized": false,
            "widgets.system.maximized": true,
          },
        },
      };
      store = createStore(combineReducers(reducers), state);
      sinon.spy(store, "dispatch");
      wrapper = mount(
        <Provider store={store}>
          <Widgets />
        </Provider>
      );
    });

    afterEach(() => {
      store.dispatch.restore();
    });

    it("should dispatch SetPref action when toggle button is clicked", () => {
      const toggleButton = wrapper.find("#toggle-widgets-size-button");
      assert.ok(toggleButton.exists(), "toggle button should exist");

      // Get the onClick handler and call it
      const onClickHandler = toggleButton.prop("onClick");
      assert.ok(onClickHandler, "onClick handler should exist");
      onClickHandler({ preventDefault: () => {} });

      const allCalls = store.dispatch.getCalls();
      const setPrefCalls = allCalls.filter(
        call => call.args[0]?.type === at.SET_PREF
      );

      assert.equal(
        setPrefCalls.length,
        1,
        `should dispatch one SetPref action, got ${setPrefCalls.length}.`
      );

      const maximizedPrefCall = setPrefCalls.find(
        call => call.args[0].data?.name === "widgets.maximized"
      );

      assert.ok(maximizedPrefCall, "should dispatch SetPref for maximized");
      assert.equal(
        maximizedPrefCall.args[0].data.value,
        true,
        "should toggle maximized pref to true"
      );
    });

    it("should dispatch SetPref action when Enter key is pressed on toggle button", () => {
      const toggleButton = wrapper.find("#toggle-widgets-size-button");

      // Trigger onKeyDown handler directly with Enter key
      toggleButton.prop("onKeyDown")({
        key: "Enter",
        preventDefault: () => {},
      });

      const setPrefCalls = store.dispatch
        .getCalls()
        .filter(call => call.args[0]?.type === at.SET_PREF);

      assert.equal(
        setPrefCalls.length,
        1,
        "should dispatch one SetPref action"
      );

      const maximizedPrefCall = setPrefCalls.find(
        call => call.args[0].data?.name === "widgets.maximized"
      );

      assert.ok(maximizedPrefCall, "should dispatch SetPref for maximized");
      assert.equal(
        maximizedPrefCall.args[0].data.value,
        true,
        "should toggle maximized pref to true"
      );
    });

    it("should dispatch SetPref action when Space key is pressed on toggle button", () => {
      const toggleButton = wrapper.find("#toggle-widgets-size-button");

      // Trigger onKeyDown handler directly with Space key
      toggleButton.prop("onKeyDown")({ key: " ", preventDefault: () => {} });

      const setPrefCalls = store.dispatch
        .getCalls()
        .filter(call => call.args[0]?.type === at.SET_PREF);

      assert.equal(
        setPrefCalls.length,
        1,
        "should dispatch one SetPref action"
      );

      const maximizedPrefCall = setPrefCalls.find(
        call => call.args[0].data?.name === "widgets.maximized"
      );

      assert.ok(maximizedPrefCall, "should dispatch SetPref for maximized");
      assert.equal(
        maximizedPrefCall.args[0].data.value,
        true,
        "should toggle maximized pref to true"
      );
    });

    it("should not dispatch SetPref actions when other keys are pressed", () => {
      const toggleButton = wrapper.find("#toggle-widgets-size-button");

      const testKeys = ["Escape", "Tab", "a", "ArrowDown"];

      for (const key of testKeys) {
        store.dispatch.resetHistory();
        // Trigger onKeyDown handler directly
        toggleButton.prop("onKeyDown")({ key });

        const setPrefCalls = store.dispatch
          .getCalls()
          .filter(call => call.args[0]?.type === at.SET_PREF);

        assert.equal(
          setPrefCalls.length,
          0,
          `should not dispatch SetPref for key: ${key}`
        );
      }
    });

    it("should toggle from maximized to minimized state", () => {
      // Update state to start with maximized = true
      const maximizedState = {
        ...INITIAL_STATE,
        Prefs: {
          ...INITIAL_STATE.Prefs,
          values: {
            ...INITIAL_STATE.Prefs.values,
            [PREF_WIDGETS_ENABLED]: true,
            [PREF_WIDGETS_LISTS_ENABLED]: true,
            [PREF_WIDGETS_SYSTEM_LISTS_ENABLED]: true,
            "widgets.maximized": true,
            "widgets.system.maximized": true,
          },
        },
      };
      const maximizedStore = createStore(
        combineReducers(reducers),
        maximizedState
      );
      sinon.spy(maximizedStore, "dispatch");
      const maximizedWrapper = mount(
        <Provider store={maximizedStore}>
          <Widgets />
        </Provider>
      );

      const toggleButton = maximizedWrapper.find("#toggle-widgets-size-button");
      toggleButton.prop("onClick")({ preventDefault: () => {} });

      const setPrefCalls = maximizedStore.dispatch
        .getCalls()
        .filter(call => call.args[0]?.type === at.SET_PREF);

      const maximizedPrefCall = setPrefCalls.find(
        call => call.args[0].data?.name === "widgets.maximized"
      );

      assert.ok(maximizedPrefCall, "should dispatch SetPref for maximized");
      assert.equal(
        maximizedPrefCall.args[0].data.value,
        false,
        "should toggle maximized pref to false"
      );

      maximizedStore.dispatch.restore();
    });

    it("should dispatch WIDGETS_CONTAINER_ACTION telemetry when toggle button is clicked", () => {
      const toggleButton = wrapper.find("#toggle-widgets-size-button");
      toggleButton.prop("onClick")({ preventDefault: () => {} });

      const dispatchedActions = store.dispatch
        .getCalls()
        .map(call => call.args[0]);

      const containerAction = dispatchedActions.find(
        action => action.type === at.WIDGETS_CONTAINER_ACTION
      );

      assert.ok(
        containerAction,
        "should dispatch WIDGETS_CONTAINER_ACTION event"
      );
      assert.equal(containerAction.data.action_type, "change_size_all");
      assert.equal(containerAction.data.action_value, "maximize_widgets");
      assert.equal(containerAction.data.widget_size, "large");
    });

    it("should dispatch WIDGETS_CONTAINER_ACTION with correct values when toggling from maximized", () => {
      const maximizedState = {
        ...INITIAL_STATE,
        Prefs: {
          ...INITIAL_STATE.Prefs,
          values: {
            ...INITIAL_STATE.Prefs.values,
            [PREF_WIDGETS_ENABLED]: true,
            [PREF_WIDGETS_LISTS_ENABLED]: true,
            [PREF_WIDGETS_SYSTEM_LISTS_ENABLED]: true,
            "widgets.maximized": true,
            "widgets.system.maximized": true,
          },
        },
      };
      const maximizedStore = createStore(
        combineReducers(reducers),
        maximizedState
      );
      sinon.spy(maximizedStore, "dispatch");
      const maximizedWrapper = mount(
        <Provider store={maximizedStore}>
          <Widgets />
        </Provider>
      );

      const toggleButton = maximizedWrapper.find("#toggle-widgets-size-button");
      toggleButton.prop("onClick")({ preventDefault: () => {} });

      const dispatchedActions = maximizedStore.dispatch
        .getCalls()
        .map(call => call.args[0]);

      const containerAction = dispatchedActions.find(
        action => action.type === at.WIDGETS_CONTAINER_ACTION
      );

      assert.ok(containerAction, "should dispatch WIDGETS_CONTAINER_ACTION");
      assert.equal(containerAction.data.action_type, "change_size_all");
      assert.equal(
        containerAction.data.action_value,
        "minimize_widgets",
        "action_value should indicate minimize widgets"
      );
      assert.equal(
        containerAction.data.widget_size,
        "medium",
        "should report new size (medium) after minimizing"
      );

      maximizedStore.dispatch.restore();
    });

    describe("with Nova enabled", () => {
      const NOVA_STATE = {
        ...INITIAL_STATE,
        Prefs: {
          ...INITIAL_STATE.Prefs,
          values: {
            ...INITIAL_STATE.Prefs.values,
            "nova.enabled": true,
            [PREF_WIDGETS_ENABLED]: true,
            [PREF_WIDGETS_LISTS_ENABLED]: true,
            [PREF_WIDGETS_SYSTEM_LISTS_ENABLED]: true,
            [PREF_WIDGETS_TIMER_ENABLED]: true,
            [PREF_WIDGETS_SYSTEM_TIMER_ENABLED]: true,
            "widgets.system.weather.enabled": true,
            "widgets.system.sportsWidget.enabled": true,
            "widgets.system.clocks.enabled": true,
            "widgets.system.weatherForecast.enabled": true,
            "weather.display": "detailed",
            showWeather: true,
            "system.showWeather": true,
            "widgets.maximized": false,
            "widgets.system.maximized": true,
            "widgets.lists.size": "medium",
            "widgets.focusTimer.size": "medium",
            "widgets.weather.size": "medium",
          },
        },
        Weather: { ...INITIAL_STATE.Weather, initialized: true },
      };

      it("should render the Nova header menu instead of the footer feedback link", () => {
        const feedbackState = {
          ...NOVA_STATE,
          Prefs: {
            ...NOVA_STATE.Prefs,
            values: {
              ...NOVA_STATE.Prefs.values,
              [PREF_WIDGETS_FEEDBACK_ENABLED]: true,
            },
          },
        };
        const novaWrapper = mount(
          <WrapWithProvider state={feedbackState}>
            <Widgets />
          </WrapWithProvider>
        );

        assert.ok(
          novaWrapper.find(".widgets-header-context-menu-button").exists(),
          "should render the widgets header context menu button"
        );
        assert.ok(
          !novaWrapper.find(".widgets-feedback-link").exists(),
          "should not render the legacy footer feedback link in Nova"
        );
      });

      it("should render both Nova header menu items", () => {
        const menuWrapper = mount(
          <WrapWithProvider state={NOVA_STATE}>
            <Widgets />
          </WrapWithProvider>
        );

        const menuButtons = menuWrapper.find(
          "#widgets-header-context-panel panel-item"
        );

        assert.equal(menuButtons.length, 3, "should render three menu items");
      });

      it("should call openWidgetsPanel when the manage widgets menu item is clicked", () => {
        const openWidgetsPanel = sinon.stub();
        const novaStore = createStore(combineReducers(reducers), NOVA_STATE);
        const novaWrapper = mount(
          <BaseContext.Provider value={{ openWidgetsPanel }}>
            <Provider store={novaStore}>
              <Widgets />
            </Provider>
          </BaseContext.Provider>
        );

        novaWrapper
          .find("panel-item[data-l10n-id='newtab-widget-section-menu-manage']")
          .prop("onClick")({
          preventDefault: () => {},
        });

        assert.calledOnce(openWidgetsPanel);
      });

      it("should render the Add widgets button when at least one widget is not enabled", () => {
        const novaWrapper = mount(
          <WrapWithProvider state={NOVA_STATE}>
            <Widgets />
          </WrapWithProvider>
        );
        assert.ok(
          novaWrapper.find(".widgets-add-button").exists(),
          "should render the Add widgets placeholder card"
        );
      });

      it("should not render the Add widgets button when every widget is enabled", () => {
        const allEnabledState = {
          ...NOVA_STATE,
          Prefs: {
            ...NOVA_STATE.Prefs,
            values: {
              ...NOVA_STATE.Prefs.values,
              "widgets.weather.enabled": true,
              "widgets.system.weather.enabled": true,
              "widgets.sportsWidget.enabled": true,
              "widgets.system.sportsWidget.enabled": true,
              "widgets.clocks.enabled": true,
              "widgets.system.clocks.enabled": true,
            },
          },
        };
        const novaWrapper = mount(
          <WrapWithProvider state={allEnabledState}>
            <Widgets />
          </WrapWithProvider>
        );
        assert.ok(
          !novaWrapper.find(".widgets-add-button").exists(),
          "should not render the Add widgets placeholder card"
        );
      });

      it("should not render the Add widgets button when Nova is disabled", () => {
        const noNovaState = {
          ...NOVA_STATE,
          Prefs: {
            ...NOVA_STATE.Prefs,
            values: { ...NOVA_STATE.Prefs.values, "nova.enabled": false },
          },
        };
        const novaWrapper = mount(
          <WrapWithProvider state={noNovaState}>
            <Widgets />
          </WrapWithProvider>
        );
        assert.ok(
          !novaWrapper.find(".widgets-add-button").exists(),
          "should not render the Add widgets placeholder card outside Nova"
        );
      });

      it("should call openWidgetsPanel when the Add widgets button is clicked", () => {
        const openWidgetsPanel = sinon.stub();
        const novaStore = createStore(combineReducers(reducers), NOVA_STATE);
        sinon.spy(novaStore, "dispatch");
        const novaWrapper = mount(
          <BaseContext.Provider value={{ openWidgetsPanel }}>
            <Provider store={novaStore}>
              <Widgets />
            </Provider>
          </BaseContext.Provider>
        );

        novaWrapper.find(".widgets-add-button").prop("onClick")({
          preventDefault: () => {},
        });

        assert.calledOnce(openWidgetsPanel);
        const userEvent = novaStore.dispatch
          .getCalls()
          .map(c => c.args[0])
          .find(
            a =>
              a.type === at.TELEMETRY_USER_EVENT &&
              a.data?.event === "SHOW_PERSONALIZE"
          );
        assert.ok(
          userEvent,
          "should dispatch SHOW_PERSONALIZE telemetry event"
        );
        novaStore.dispatch.restore();
      });

      it("should match the largest current widget size on the Add widgets button", () => {
        const maximizedState = {
          ...NOVA_STATE,
          Prefs: {
            ...NOVA_STATE.Prefs,
            values: {
              ...NOVA_STATE.Prefs.values,
              "widgets.maximized": true,
              "widgets.lists.size": "large",
              "widgets.focusTimer.size": "large",
              "widgets.weather.size": "large",
            },
          },
        };
        const novaWrapper = mount(
          <WrapWithProvider state={maximizedState}>
            <Widgets />
          </WrapWithProvider>
        );
        assert.ok(
          novaWrapper.find(".widgets-add-button.large-widget").exists(),
          "should size the Add widgets button to large when widgets are large"
        );
      });

      it("should dispatch hide widget actions from the Nova header menu", () => {
        const novaStore = createStore(combineReducers(reducers), NOVA_STATE);
        sinon.spy(novaStore, "dispatch");
        const novaWrapper = mount(
          <Provider store={novaStore}>
            <Widgets />
          </Provider>
        );

        novaWrapper
          .find(
            "panel-item[data-l10n-id='newtab-widget-section-menu-hide-all']"
          )
          .prop("onClick")({
          preventDefault: () => {},
        });

        const setPrefCalls = novaStore.dispatch
          .getCalls()
          .filter(call => call.args[0]?.type === at.SET_PREF);

        assert.ok(
          setPrefCalls.find(
            call => call.args[0].data?.name === PREF_WIDGETS_LISTS_ENABLED
          ),
          "should disable the lists widget from the header menu"
        );
        assert.ok(
          setPrefCalls.find(
            call => call.args[0].data?.name === PREF_WIDGETS_TIMER_ENABLED
          ),
          "should disable the timer widget from the header menu"
        );

        novaStore.dispatch.restore();
      });

      it("should dispatch Learn more actions from the Nova header menu", () => {
        const novaStore = createStore(combineReducers(reducers), NOVA_STATE);
        sinon.spy(novaStore, "dispatch");
        const novaWrapper = mount(
          <Provider store={novaStore}>
            <Widgets />
          </Provider>
        );

        novaWrapper
          .find(
            "panel-item[data-l10n-id='newtab-widget-section-menu-learn-more']"
          )
          .prop("onClick")({
          preventDefault: () => {},
        });

        const dispatched = novaStore.dispatch
          .getCalls()
          .map(call => call.args[0]);
        const openLink = dispatched.find(
          action => action.type === at.OPEN_LINK
        );
        const containerAction = dispatched.find(
          action => action.type === at.WIDGETS_CONTAINER_ACTION
        );

        assert.ok(openLink, "should dispatch OPEN_LINK");
        assert.equal(
          openLink.data.url,
          "https://support.mozilla.org/kb/firefox-new-tab-widgets"
        );
        assert.equal(openLink.data.where, "tab");
        assert.ok(containerAction, "should dispatch WIDGETS_CONTAINER_ACTION");
        assert.equal(containerAction.data.action_type, "feedback");

        novaStore.dispatch.restore();
      });

      it("should set all enabled widget size prefs to large when maximizing", () => {
        const novaStore = createStore(combineReducers(reducers), NOVA_STATE);
        sinon.spy(novaStore, "dispatch");
        const novaWrapper = mount(
          <Provider store={novaStore}>
            <Widgets />
          </Provider>
        );

        novaWrapper.find("#toggle-widgets-size-button").prop("onClick")({
          preventDefault: () => {},
        });

        const setPrefCalls = novaStore.dispatch
          .getCalls()
          .filter(call => call.args[0]?.type === at.SET_PREF);

        const listsSizeCall = setPrefCalls.find(
          call => call.args[0].data?.name === "widgets.lists.size"
        );
        const timerSizeCall = setPrefCalls.find(
          call => call.args[0].data?.name === "widgets.focusTimer.size"
        );
        const weatherSizeCall = setPrefCalls.find(
          call => call.args[0].data?.name === "widgets.weather.size"
        );

        assert.equal(listsSizeCall?.args[0].data.value, "large");
        assert.equal(timerSizeCall?.args[0].data.value, "large");
        assert.equal(weatherSizeCall?.args[0].data.value, "large");

        novaStore.dispatch.restore();
      });

      it("should send all row widgets to medium when minimizing", () => {
        const maximizedNovaState = {
          ...NOVA_STATE,
          Prefs: {
            ...NOVA_STATE.Prefs,
            values: {
              ...NOVA_STATE.Prefs.values,
              "widgets.maximized": true,
              "widgets.lists.size": "large",
              "widgets.focusTimer.size": "large",
              "widgets.weather.size": "large",
            },
          },
        };
        const novaStore = createStore(
          combineReducers(reducers),
          maximizedNovaState
        );
        sinon.spy(novaStore, "dispatch");
        const novaWrapper = mount(
          <Provider store={novaStore}>
            <Widgets />
          </Provider>
        );

        novaWrapper.find("#toggle-widgets-size-button").prop("onClick")({
          preventDefault: () => {},
        });

        const setPrefCalls = novaStore.dispatch
          .getCalls()
          .filter(call => call.args[0]?.type === at.SET_PREF);

        const listsSizeCall = setPrefCalls.find(
          call => call.args[0].data?.name === "widgets.lists.size"
        );
        const timerSizeCall = setPrefCalls.find(
          call => call.args[0].data?.name === "widgets.focusTimer.size"
        );
        const weatherSizeCall = setPrefCalls.find(
          call => call.args[0].data?.name === "widgets.weather.size"
        );

        assert.equal(listsSizeCall?.args[0].data.value, "medium");
        assert.equal(timerSizeCall?.args[0].data.value, "medium");
        assert.equal(weatherSizeCall?.args[0].data.value, "medium");

        novaStore.dispatch.restore();
      });

      it("should not update size prefs for lists pinned to small", () => {
        const smallSizeState = {
          ...NOVA_STATE,
          Prefs: {
            ...NOVA_STATE.Prefs,
            values: {
              ...NOVA_STATE.Prefs.values,
              "widgets.maximized": false,
              "widgets.lists.size": "small",
            },
          },
        };
        const novaStore = createStore(
          combineReducers(reducers),
          smallSizeState
        );
        sinon.spy(novaStore, "dispatch");
        const novaWrapper = mount(
          <Provider store={novaStore}>
            <Widgets />
          </Provider>
        );

        novaWrapper.find("#toggle-widgets-size-button").prop("onClick")({
          preventDefault: () => {},
        });

        const setPrefCalls = novaStore.dispatch
          .getCalls()
          .filter(call => call.args[0]?.type === at.SET_PREF);

        const listsSizeCall = setPrefCalls.find(
          call => call.args[0].data?.name === "widgets.lists.size"
        );
        assert.ok(
          !listsSizeCall,
          "should not dispatch SetPref for lists pinned to small"
        );

        novaStore.dispatch.restore();
      });

      it("should update size prefs for disabled widgets", () => {
        const disabledTimerState = {
          ...NOVA_STATE,
          Prefs: {
            ...NOVA_STATE.Prefs,
            values: {
              ...NOVA_STATE.Prefs.values,
              [PREF_WIDGETS_TIMER_ENABLED]: false,
              "widgets.focusTimer.size": "medium",
            },
          },
        };
        const novaStore = createStore(
          combineReducers(reducers),
          disabledTimerState
        );
        sinon.spy(novaStore, "dispatch");
        const novaWrapper = mount(
          <Provider store={novaStore}>
            <Widgets />
          </Provider>
        );

        novaWrapper.find("#toggle-widgets-size-button").prop("onClick")({
          preventDefault: () => {},
        });

        const setPrefCalls = novaStore.dispatch
          .getCalls()
          .filter(call => call.args[0]?.type === at.SET_PREF);

        const timerSizeCall = setPrefCalls.find(
          call => call.args[0].data?.name === "widgets.focusTimer.size"
        );
        assert.ok(timerSizeCall, "should dispatch SetPref for disabled widget");
        assert.equal(
          timerSizeCall.args[0].data.value,
          "large",
          "should update disabled widget size to match new row state"
        );

        novaStore.dispatch.restore();
      });

      it("should not update size prefs for disabled widgets pinned to small", () => {
        const disabledSmallTimerState = {
          ...NOVA_STATE,
          Prefs: {
            ...NOVA_STATE.Prefs,
            values: {
              ...NOVA_STATE.Prefs.values,
              [PREF_WIDGETS_TIMER_ENABLED]: false,
              "widgets.focusTimer.size": "small",
            },
          },
        };
        const novaStore = createStore(
          combineReducers(reducers),
          disabledSmallTimerState
        );
        sinon.spy(novaStore, "dispatch");
        const novaWrapper = mount(
          <Provider store={novaStore}>
            <Widgets />
          </Provider>
        );

        novaWrapper.find("#toggle-widgets-size-button").prop("onClick")({
          preventDefault: () => {},
        });

        const setPrefCalls = novaStore.dispatch
          .getCalls()
          .filter(call => call.args[0]?.type === at.SET_PREF);

        const timerSizeCall = setPrefCalls.find(
          call => call.args[0].data?.name === "widgets.focusTimer.size"
        );
        assert.ok(
          !timerSizeCall,
          "should not dispatch SetPref for disabled widget pinned to small"
        );

        novaStore.dispatch.restore();
      });

      it("should not dispatch individual size prefs when Nova is disabled", () => {
        const noNovaState = {
          ...NOVA_STATE,
          Prefs: {
            ...NOVA_STATE.Prefs,
            values: { ...NOVA_STATE.Prefs.values, "nova.enabled": false },
          },
        };
        const novaStore = createStore(combineReducers(reducers), noNovaState);
        sinon.spy(novaStore, "dispatch");
        const novaWrapper = mount(
          <Provider store={novaStore}>
            <Widgets />
          </Provider>
        );

        novaWrapper.find("#toggle-widgets-size-button").prop("onClick")({
          preventDefault: () => {},
        });

        const setPrefCalls = novaStore.dispatch
          .getCalls()
          .filter(call => call.args[0]?.type === at.SET_PREF);

        const sizePrefCalls = setPrefCalls.filter(call =>
          call.args[0].data?.name?.endsWith(".size")
        );
        assert.equal(
          sizePrefCalls.length,
          0,
          "should not dispatch any size prefs without Nova"
        );

        novaStore.dispatch.restore();
      });
    });
  });

  describe("widget order", () => {
    const PREF_WIDGETS_ORDER = "widgets.order";

    it("should render Lists before FocusTimer with default order (empty pref)", () => {
      const state = {
        ...INITIAL_STATE,
        Prefs: {
          ...INITIAL_STATE.Prefs,
          values: {
            ...INITIAL_STATE.Prefs.values,
            [PREF_WIDGETS_ENABLED]: true,
            [PREF_WIDGETS_LISTS_ENABLED]: true,
            [PREF_WIDGETS_SYSTEM_LISTS_ENABLED]: true,
            [PREF_WIDGETS_TIMER_ENABLED]: true,
            [PREF_WIDGETS_SYSTEM_TIMER_ENABLED]: true,
            [PREF_WIDGETS_ORDER]: "",
          },
        },
      };
      const wrapper = mount(
        <WrapWithProvider state={state}>
          <Widgets />
        </WrapWithProvider>
      );
      const listsNode = wrapper.find(Lists).getDOMNode();
      const timerNode = wrapper.find(FocusTimer).getDOMNode();
      // DOCUMENT_POSITION_FOLLOWING (4): timerNode comes after listsNode
      assert.ok(
        listsNode.compareDocumentPosition(timerNode) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        "Lists should appear before FocusTimer in default order"
      );
    });

    it("should render FocusTimer before Lists when order pref reverses them", () => {
      const state = {
        ...INITIAL_STATE,
        Prefs: {
          ...INITIAL_STATE.Prefs,
          values: {
            ...INITIAL_STATE.Prefs.values,
            [PREF_WIDGETS_ENABLED]: true,
            [PREF_WIDGETS_LISTS_ENABLED]: true,
            [PREF_WIDGETS_SYSTEM_LISTS_ENABLED]: true,
            [PREF_WIDGETS_TIMER_ENABLED]: true,
            [PREF_WIDGETS_SYSTEM_TIMER_ENABLED]: true,
            [PREF_WIDGETS_ORDER]: "focusTimer,lists,weather",
          },
        },
      };
      const wrapper = mount(
        <WrapWithProvider state={state}>
          <Widgets />
        </WrapWithProvider>
      );
      const timerNode = wrapper.find(FocusTimer).getDOMNode();
      const listsNode = wrapper.find(Lists).getDOMNode();
      // DOCUMENT_POSITION_FOLLOWING (4): listsNode comes after timerNode
      assert.ok(
        timerNode.compareDocumentPosition(listsNode) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        "FocusTimer should appear before Lists when order pref says so"
      );
    });

    it("should not dispatch SET_PREF for widgets.order when a widget is disabled", () => {
      const state = {
        ...INITIAL_STATE,
        Prefs: {
          ...INITIAL_STATE.Prefs,
          values: {
            ...INITIAL_STATE.Prefs.values,
            [PREF_WIDGETS_ENABLED]: true,
            [PREF_WIDGETS_LISTS_ENABLED]: true,
            [PREF_WIDGETS_SYSTEM_LISTS_ENABLED]: true,
            [PREF_WIDGETS_TIMER_ENABLED]: true,
            [PREF_WIDGETS_SYSTEM_TIMER_ENABLED]: true,
          },
        },
      };
      const store = createStore(combineReducers(reducers), state);
      sinon.spy(store, "dispatch");
      const wrapper = mount(
        <Provider store={store}>
          <Widgets />
        </Provider>
      );

      wrapper.find("#hide-all-widgets-button").prop("onClick")({
        preventDefault: () => {},
      });

      const orderPrefCalls = store.dispatch
        .getCalls()
        .filter(
          call =>
            call.args[0]?.type === at.SET_PREF &&
            call.args[0]?.data?.name === PREF_WIDGETS_ORDER
        );

      assert.equal(
        orderPrefCalls.length,
        0,
        "hiding widgets should not modify widgets.order"
      );
      store.dispatch.restore();
    });
  });
});

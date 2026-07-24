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

const PREF_WIDGETS_LISTS_ENABLED = "widgets.lists.enabled";
const PREF_WIDGETS_SYSTEM_LISTS_ENABLED = "widgets.system.lists.enabled";
const PREF_WIDGETS_TIMER_ENABLED = "widgets.focusTimer.enabled";
const PREF_WIDGETS_SYSTEM_TIMER_ENABLED = "widgets.system.focusTimer.enabled";

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
        2,
        `should dispatch two SetPref actions, got ${setPrefCalls.length}.`
      );

      const listsPrefCall = setPrefCalls.find(
        call => call.args[0].data?.name === PREF_WIDGETS_LISTS_ENABLED
      );
      const timerPrefCall = setPrefCalls.find(
        call => call.args[0].data?.name === PREF_WIDGETS_TIMER_ENABLED
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
        2,
        "should dispatch two SetPref actions"
      );

      const listsPrefCall = setPrefCalls.find(
        call => call.args[0].data?.name === PREF_WIDGETS_LISTS_ENABLED
      );
      const timerPrefCall = setPrefCalls.find(
        call => call.args[0].data?.name === PREF_WIDGETS_TIMER_ENABLED
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
        2,
        "should dispatch two SetPref actions"
      );

      const listsPrefCall = setPrefCalls.find(
        call => call.args[0].data?.name === PREF_WIDGETS_LISTS_ENABLED
      );
      const timerPrefCall = setPrefCalls.find(
        call => call.args[0].data?.name === PREF_WIDGETS_TIMER_ENABLED
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

    it("should dispatch WIDGETS_CONTAINER_ACTION telemetry when hide button is clicked", () => {
      const hideButton = wrapper.find("#hide-all-widgets-button");
      hideButton.prop("onClick")({ preventDefault: () => {} });

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
      assert.equal(containerAction.data.action_type, "hide_all");
      assert.equal(
        containerAction.data.widget_size,
        "medium",
        "widget_size should be medium when widgets.system.maximized is false"
      );
      assert.equal(
        containerAction.data.action_value,
        undefined,
        "hide_all should not have action_value"
      );
    });

    it("should dispatch WIDGETS_CONTAINER_ACTION with medium size when widgets are maximized", () => {
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

      const containerAction = dispatchedActions.find(
        action => action.type === at.WIDGETS_CONTAINER_ACTION
      );

      assert.ok(containerAction, "should dispatch WIDGETS_CONTAINER_ACTION");
      assert.equal(
        containerAction.data.widget_size,
        "medium",
        "should report medium size when maximized"
      );
      maximizedStore.dispatch.restore();
    });

    it("should dispatch WIDGETS_ENABLED for each enabled widget when hide button is clicked", () => {
      const hideButton = wrapper.find("#hide-all-widgets-button");
      hideButton.prop("onClick")({ preventDefault: () => {} });

      const dispatchedActions = store.dispatch
        .getCalls()
        .map(call => call.args[0]);

      const widgetsEnabledActions = dispatchedActions.filter(
        action => action.type === at.WIDGETS_ENABLED
      );

      assert.equal(
        widgetsEnabledActions.length,
        2,
        "should dispatch WIDGETS_ENABLED for both lists and timer"
      );

      const listsEnabledAction = widgetsEnabledActions.find(
        action => action.data.widget_name === "lists"
      );
      const timerEnabledAction = widgetsEnabledActions.find(
        action => action.data.widget_name === "focus_timer"
      );

      assert.ok(
        listsEnabledAction,
        "should dispatch WIDGETS_ENABLED for lists"
      );
      assert.equal(listsEnabledAction.data.widget_source, "widget");
      assert.equal(listsEnabledAction.data.enabled, false);
      assert.equal(listsEnabledAction.data.widget_size, "medium");

      assert.ok(
        timerEnabledAction,
        "should dispatch WIDGETS_ENABLED for timer"
      );
      assert.equal(timerEnabledAction.data.widget_source, "widget");
      assert.equal(timerEnabledAction.data.enabled, false);
      assert.equal(timerEnabledAction.data.widget_size, "medium");
    });

    it("should dispatch WIDGETS_ENABLED only for enabled widgets", () => {
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

      const widgetsEnabledActions = partialStore.dispatch
        .getCalls()
        .map(call => call.args[0])
        .filter(action => action.type === at.WIDGETS_ENABLED);

      assert.equal(
        widgetsEnabledActions.length,
        1,
        "should only dispatch WIDGETS_ENABLED for lists (timer is already disabled)"
      );

      const listsEnabledAction = widgetsEnabledActions.find(
        action => action.data.widget_name === "lists"
      );

      assert.ok(
        listsEnabledAction,
        "should dispatch WIDGETS_ENABLED for lists"
      );
      assert.equal(listsEnabledAction.data.enabled, false);

      partialStore.dispatch.restore();
    });

    it("should dispatch WIDGETS_ENABLED with correct widget_size when maximized", () => {
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

      const widgetsEnabledActions = maximizedStore.dispatch
        .getCalls()
        .map(call => call.args[0])
        .filter(action => action.type === at.WIDGETS_ENABLED);

      assert.equal(widgetsEnabledActions.length, 2);

      widgetsEnabledActions.forEach(action => {
        assert.equal(
          action.data.widget_size,
          "medium",
          "widget_size should be medium when maximized"
        );
      });

      maximizedStore.dispatch.restore();
    });

    it("should dispatch WIDGETS_ENABLED for each enabled widget when Enter key is pressed", () => {
      const hideButton = wrapper.find("#hide-all-widgets-button");
      hideButton.prop("onKeyDown")({ key: "Enter", preventDefault: () => {} });

      const widgetsEnabledActions = store.dispatch
        .getCalls()
        .map(call => call.args[0])
        .filter(action => action.type === at.WIDGETS_ENABLED);

      assert.equal(
        widgetsEnabledActions.length,
        2,
        "should dispatch WIDGETS_ENABLED for both lists and timer"
      );

      const listsEnabledAction = widgetsEnabledActions.find(
        action => action.data.widget_name === "lists"
      );
      const timerEnabledAction = widgetsEnabledActions.find(
        action => action.data.widget_name === "focus_timer"
      );

      assert.ok(
        listsEnabledAction,
        "should dispatch WIDGETS_ENABLED for lists"
      );
      assert.equal(listsEnabledAction.data.widget_source, "widget");
      assert.equal(listsEnabledAction.data.enabled, false);
      assert.equal(listsEnabledAction.data.widget_size, "medium");

      assert.ok(
        timerEnabledAction,
        "should dispatch WIDGETS_ENABLED for timer"
      );
      assert.equal(timerEnabledAction.data.widget_source, "widget");
      assert.equal(timerEnabledAction.data.enabled, false);
      assert.equal(timerEnabledAction.data.widget_size, "medium");
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
      assert.equal(containerAction.data.widget_size, "medium");
    });

    it("should dispatch WIDGETS_CONTAINER_ACTION with correct values when toggling from maximized", () => {
      const maximizedState = {
        ...INITIAL_STATE,
        Prefs: {
          ...INITIAL_STATE.Prefs,
          values: {
            ...INITIAL_STATE.Prefs.values,
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
        "small",
        "should report new size (small) after minimizing"
      );

      maximizedStore.dispatch.restore();
    });
  });
});

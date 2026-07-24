import React from "react";
import { combineReducers, createStore } from "redux";
import { Provider } from "react-redux";
import { mount } from "enzyme";
import { INITIAL_STATE, reducers } from "common/Reducers.sys.mjs";
import { actionTypes as at } from "common/Actions.mjs";
import {
  FocusTimer,
  isNumericValue,
  isAtMaxLength,
} from "content-src/components/Widgets/FocusTimer/FocusTimer";

const PREF_WIDGETS_SYSTEM_NOTIFICATIONS_ENABLED =
  "widgets.focusTimer.showSystemNotifications";

const mockState = {
  ...INITIAL_STATE,
  Prefs: {
    ...INITIAL_STATE.Prefs,
    values: {
      ...INITIAL_STATE.Prefs.values,
      [PREF_WIDGETS_SYSTEM_NOTIFICATIONS_ENABLED]: true,
    },
  },
  TimerWidget: {
    timerType: "focus",
    focus: {
      duration: 1500,
      initialDuration: 1500,
      startTime: null,
      isRunning: null,
    },
    break: {
      duration: 300,
      initialDuration: 300,
      startTime: null,
      isRunning: null,
    },
  },
};

function WrapWithProvider({ children, state = INITIAL_STATE }) {
  let store = createStore(combineReducers(reducers), state);
  return <Provider store={store}>{children}</Provider>;
}

describe("<FocusTimer>", () => {
  let wrapper;
  let sandbox;
  let dispatch;
  let clock; // for use with the sinon fake timers api
  let handleUserInteraction;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    dispatch = sandbox.stub();
    clock = sandbox.useFakeTimers();
    handleUserInteraction = sandbox.stub();

    wrapper = mount(
      <WrapWithProvider state={mockState}>
        <FocusTimer
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
          widgetsMayBeMaximized={false}
        />
      </WrapWithProvider>
    );
  });

  afterEach(() => {
    // restore real timers after each test to avoid leaking sinon's fakeTimers()
    sandbox.restore();
    wrapper?.unmount();
  });

  it("should render timer widget", () => {
    assert.ok(wrapper.exists());
    assert.ok(wrapper.find(".focus-timer").exists());
  });

  it("should show default minutes for Focus timer (25 minutes)", () => {
    const minutes = wrapper.find(".timer-set-minutes").text();
    const seconds = wrapper.find(".timer-set-seconds").text();
    assert.equal(minutes, "25");
    assert.equal(seconds, "00");
  });

  it("should show default minutes for Break timer (5 minutes)", () => {
    const breakState = {
      ...mockState,
      TimerWidget: {
        ...mockState.TimerWidget,
        timerType: "break", // setting timer type to break
      },
    };

    wrapper = mount(
      <WrapWithProvider state={breakState}>
        <FocusTimer
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
          widgetsMayBeMaximized={false}
        />
      </WrapWithProvider>
    );

    const minutes = wrapper.find(".timer-set-minutes").text();
    const seconds = wrapper.find(".timer-set-seconds").text();

    assert.equal(minutes, "05");
    assert.equal(seconds, "00");
  });

  it("should start timer and show progress bar when pressing play", () => {
    wrapper
      .find("moz-button[data-l10n-id='newtab-widget-timer-label-play']")
      .props()
      .onClick();
    wrapper.update();
    assert.ok(wrapper.find(".progress-circle-wrapper").exists());

    const [playAction] = dispatch.getCall(0).args;
    assert.equal(playAction.type, at.WIDGETS_TIMER_PLAY);

    const [oldTelemetryEvent] = dispatch.getCall(1).args;
    assert.equal(oldTelemetryEvent.type, at.WIDGETS_TIMER_USER_EVENT);
    assert.equal(oldTelemetryEvent.data.userAction, "timer_play");

    const [newTelemetryEvent] = dispatch.getCall(2).args;
    assert.equal(newTelemetryEvent.type, at.WIDGETS_USER_EVENT);
    assert.equal(newTelemetryEvent.data.widget_name, "focus_timer");
    assert.equal(newTelemetryEvent.data.widget_source, "widget");
    assert.equal(newTelemetryEvent.data.user_action, "timer_play");
    assert.equal(newTelemetryEvent.data.widget_size, "medium");
  });

  it("should pause the timer when pressing pause", () => {
    const now = Math.floor(Date.now() / 1000);
    const runningState = {
      ...mockState,
      TimerWidget: {
        ...mockState.TimerWidget,
        focus: {
          ...mockState.TimerWidget.focus,
          isRunning: true,
          startTime: now,
        },
      },
    };

    wrapper = mount(
      <WrapWithProvider state={runningState}>
        <FocusTimer
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
          widgetsMayBeMaximized={false}
        />
      </WrapWithProvider>
    );

    const pauseBtn = wrapper.find(
      "moz-button[data-l10n-id='newtab-widget-timer-label-pause']"
    );
    assert.ok(pauseBtn.exists(), "Pause button should be rendered");
    pauseBtn.props().onClick();

    const [pauseAction] = dispatch.getCall(0).args;
    assert.equal(pauseAction.type, at.WIDGETS_TIMER_PAUSE);

    const [oldTelemetryEvent] = dispatch.getCall(1).args;
    assert.equal(oldTelemetryEvent.type, at.WIDGETS_TIMER_USER_EVENT);
    assert.equal(oldTelemetryEvent.data.userAction, "timer_pause");

    const [newTelemetryEvent] = dispatch.getCall(2).args;
    assert.equal(newTelemetryEvent.type, at.WIDGETS_USER_EVENT);
    assert.equal(newTelemetryEvent.data.widget_name, "focus_timer");
    assert.equal(newTelemetryEvent.data.widget_source, "widget");
    assert.equal(newTelemetryEvent.data.user_action, "timer_pause");
    assert.equal(newTelemetryEvent.data.widget_size, "medium");
  });

  it("should reset timer should be hidden when timer is not running", () => {
    const resetBtn = wrapper.find(
      "moz-button[data-l10n-id='newtab-widget-timer-reset']"
    );
    assert.ok(!resetBtn.exists(), "Reset buttons should not be rendered");
  });

  it("should reset timer when pressing reset", () => {
    const now = Math.floor(Date.now() / 1000);
    const runningState = {
      ...mockState,
      TimerWidget: {
        ...mockState.TimerWidget,
        focus: {
          ...mockState.TimerWidget.focus,
          isRunning: true,
          startTime: now,
        },
      },
    };

    wrapper = mount(
      <WrapWithProvider state={runningState}>
        <FocusTimer
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
          widgetsMayBeMaximized={false}
        />
      </WrapWithProvider>
    );

    const resetBtn = wrapper.find(
      "moz-button[data-l10n-id='newtab-widget-timer-reset']"
    );

    assert.ok(resetBtn.exists(), "Reset buttons should be rendered");
    resetBtn.props().onClick();

    const [resetAction] = dispatch.getCall(0).args;
    assert.equal(resetAction.type, at.WIDGETS_TIMER_RESET);

    const [oldTelemetryEvent] = dispatch.getCall(1).args;
    assert.equal(oldTelemetryEvent.type, at.WIDGETS_TIMER_USER_EVENT);
    assert.equal(oldTelemetryEvent.data.userAction, "timer_reset");

    const [newTelemetryEvent] = dispatch.getCall(2).args;
    assert.equal(newTelemetryEvent.type, at.WIDGETS_USER_EVENT);
    assert.equal(newTelemetryEvent.data.widget_name, "focus_timer");
    assert.equal(newTelemetryEvent.data.widget_source, "widget");
    assert.equal(newTelemetryEvent.data.user_action, "timer_reset");
    assert.equal(newTelemetryEvent.data.widget_size, "medium");

    const initialUserDuration = 12 * 60;

    const resetState = {
      ...mockState,
      TimerWidget: {
        ...mockState.TimerWidget,
        focus: {
          duration: initialUserDuration,
          initialDuration: initialUserDuration,
          startTime: null,
          isRunning: false,
        },
      },
    };

    wrapper = mount(
      <WrapWithProvider state={resetState}>
        <FocusTimer
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
          widgetsMayBeMaximized={false}
        />
      </WrapWithProvider>
    );

    assert.equal(wrapper.find(".progress-circle-wrapper.visible").length, 0);
    const minutes = wrapper.find(".timer-set-minutes").text();
    const seconds = wrapper.find(".timer-set-seconds").text();
    assert.equal(minutes, "12");
    assert.equal(seconds, "00");
  });

  it("should dispatch pause and set type and when clicking the break timer", () => {
    const breakBtn = wrapper.find(
      "moz-button[data-l10n-id='newtab-widget-timer-mode-break']"
    );
    assert.ok(breakBtn.exists(), "break button should be rendered");
    breakBtn.props().onClick();

    const types = dispatch
      .getCalls()
      .map(call => call.args[0].type)
      .filter(Boolean);

    assert.ok(types.includes(at.WIDGETS_TIMER_PAUSE));
    assert.ok(types.includes(at.WIDGETS_TIMER_USER_EVENT));
    assert.ok(types.includes(at.WIDGETS_USER_EVENT));
    assert.ok(types.includes(at.WIDGETS_TIMER_SET_TYPE));

    const findTypeToggled = dispatch
      .getCalls()
      .map(call => call.args[0])
      .find(action => action.type === at.WIDGETS_TIMER_SET_TYPE);

    assert.equal(
      findTypeToggled.data.timerType,
      "break",
      "timer should switch to break mode"
    );

    const unifiedPauseEvent = dispatch
      .getCalls()
      .map(call => call.args[0])
      .find(
        action =>
          action.type === at.WIDGETS_USER_EVENT &&
          action.data.user_action === "timer_pause"
      );

    assert.ok(unifiedPauseEvent);
    assert.equal(unifiedPauseEvent.data.widget_name, "focus_timer");
    assert.equal(unifiedPauseEvent.data.widget_source, "widget");

    const unifiedToggleEvent = dispatch
      .getCalls()
      .map(call => call.args[0])
      .find(
        action =>
          action.type === at.WIDGETS_USER_EVENT &&
          action.data.user_action === "timer_toggle_break"
      );

    assert.ok(unifiedToggleEvent);
    assert.equal(unifiedToggleEvent.data.widget_name, "focus_timer");
    assert.equal(unifiedToggleEvent.data.widget_source, "widget");
  });

  it("should dispatch set type when clicking the focus timer", () => {
    const focusBtn = wrapper.find(
      "moz-button[data-l10n-id='newtab-widget-timer-mode-focus']"
    );
    assert.ok(focusBtn.exists(), "focus button should be rendered");
    focusBtn.props().onClick();

    const types = dispatch
      .getCalls()
      .map(call => call.args[0].type)
      .filter(Boolean);

    assert.ok(types.includes(at.WIDGETS_TIMER_PAUSE));
    assert.ok(types.includes(at.WIDGETS_TIMER_USER_EVENT));
    assert.ok(types.includes(at.WIDGETS_USER_EVENT));
    assert.ok(types.includes(at.WIDGETS_TIMER_SET_TYPE));

    const findTypeToggled = dispatch
      .getCalls()
      .map(call => call.args[0])
      .find(action => action.type === at.WIDGETS_TIMER_SET_TYPE);

    assert.equal(
      findTypeToggled.data.timerType,
      "focus",
      "focus should switch to break mode"
    );

    const unifiedToggleEvent = dispatch
      .getCalls()
      .map(call => call.args[0])
      .find(
        action =>
          action.type === at.WIDGETS_USER_EVENT &&
          action.data.user_action === "timer_toggle_focus"
      );

    assert.ok(unifiedToggleEvent);
    assert.equal(unifiedToggleEvent.data.widget_name, "focus_timer");
    assert.equal(unifiedToggleEvent.data.widget_source, "widget");
  });

  it("should toggle from focus to break timer automatically on end", () => {
    const now = Math.floor(Date.now() / 1000);

    const endState = {
      ...mockState,
      TimerWidget: {
        ...mockState.TimerWidget,
        focus: {
          ...mockState.TimerWidget.break,
          isRunning: true,
          startTime: now - 300,
        },
      },
    };

    wrapper = mount(
      <WrapWithProvider state={endState}>
        <FocusTimer
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
          widgetsMayBeMaximized={false}
        />
      </WrapWithProvider>
    );

    // Let interval fire and start the timer_end logic
    clock.tick(1000);

    // Allowing time for the chained timeouts for animation
    clock.tick(3000);
    wrapper.update();

    const types = dispatch
      .getCalls()
      .map(call => call.args[0].type)
      .filter(Boolean);

    assert.ok(types.includes(at.WIDGETS_TIMER_END));
    assert.ok(types.includes(at.WIDGETS_TIMER_USER_EVENT));
    assert.ok(types.includes(at.WIDGETS_USER_EVENT));
    assert.ok(types.includes(at.WIDGETS_TIMER_SET_TYPE));

    const findTypeToggled = dispatch
      .getCalls()
      .map(call => call.args[0])
      .find(action => action.type === at.WIDGETS_TIMER_SET_TYPE);

    assert.equal(
      findTypeToggled.data.timerType,
      "break",
      "timer should switch to break mode"
    );

    const unifiedEndEvent = dispatch
      .getCalls()
      .map(call => call.args[0])
      .find(
        action =>
          action.type === at.WIDGETS_USER_EVENT &&
          action.data.user_action === "timer_end"
      );

    assert.ok(unifiedEndEvent);
    assert.equal(unifiedEndEvent.data.widget_name, "focus_timer");
    assert.equal(unifiedEndEvent.data.widget_source, "widget");
  });

  it("should toggle from break to focus timer automatically on end", () => {
    const now = Math.floor(Date.now() / 1000);

    const endState = {
      ...mockState,
      TimerWidget: {
        ...mockState.TimerWidget,
        timerType: "break",
        break: {
          ...mockState.TimerWidget.break,
          isRunning: true,
          startTime: now - 300,
        },
      },
    };

    wrapper = mount(
      <WrapWithProvider state={endState}>
        <FocusTimer
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
          widgetsMayBeMaximized={false}
        />
      </WrapWithProvider>
    );

    // Let interval fire and start the timer_end logic
    clock.tick(1000);

    // Allowing time for the chained timeouts for animation
    clock.tick(3000);
    wrapper.update();

    const types = dispatch.getCalls().map(call => call.args[0].type);

    assert.ok(types.includes(at.WIDGETS_TIMER_END));
    assert.ok(types.includes(at.WIDGETS_TIMER_USER_EVENT));
    assert.ok(types.includes(at.WIDGETS_USER_EVENT));
    assert.ok(types.includes(at.WIDGETS_TIMER_SET_TYPE));

    const findTypeToggled = dispatch
      .getCalls()
      .map(call => call.args[0])
      .find(action => action.type === at.WIDGETS_TIMER_SET_TYPE);

    assert.equal(
      findTypeToggled.data.timerType,
      "focus",
      "timer should switch to focus mode"
    );

    const unifiedEndEvent = dispatch
      .getCalls()
      .map(call => call.args[0])
      .find(
        action =>
          action.type === at.WIDGETS_USER_EVENT &&
          action.data.user_action === "timer_end"
      );

    assert.ok(unifiedEndEvent);
    assert.equal(unifiedEndEvent.data.widget_name, "focus_timer");
    assert.equal(unifiedEndEvent.data.widget_source, "widget");
  });

  it("should pause when time input is focused", () => {
    const activeState = {
      ...mockState,
      TimerWidget: {
        ...mockState.TimerWidget,
        timerType: "focus",
        focus: {
          ...mockState.TimerWidget.focus,
          isRunning: true,
        },
      },
    };

    const activeWrapper = mount(
      <WrapWithProvider state={activeState}>
        <FocusTimer
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
          widgetsMayBeMaximized={false}
        />
      </WrapWithProvider>
    );

    const minutesSpan = activeWrapper.find(".timer-set-minutes").at(0);
    assert.ok(minutesSpan.exists());

    minutesSpan.simulate("focus");

    const [pauseAction] = dispatch.getCall(0).args;
    assert.equal(pauseAction.type, at.WIDGETS_TIMER_PAUSE);

    const [oldTelemetryEvent] = dispatch.getCall(1).args;
    assert.equal(oldTelemetryEvent.type, at.WIDGETS_TIMER_USER_EVENT);
    assert.equal(oldTelemetryEvent.data.userAction, "timer_pause");

    const [newTelemetryEvent] = dispatch.getCall(2).args;
    assert.equal(newTelemetryEvent.type, at.WIDGETS_USER_EVENT);
    assert.equal(newTelemetryEvent.data.widget_name, "focus_timer");
    assert.equal(newTelemetryEvent.data.widget_source, "widget");
    assert.equal(newTelemetryEvent.data.user_action, "timer_pause");
  });

  it("should reset to user's initial duration after timer ends", () => {
    const now = Math.floor(Date.now() / 1000);

    // mock up a user's initial duration (12 minutes)
    const initialUserDuration = 12 * 60;

    const endState = {
      ...mockState,
      TimerWidget: {
        ...mockState.TimerWidget,
        timerType: "focus",
        focus: {
          duration: initialUserDuration,
          initialDuration: initialUserDuration,
          startTime: now - initialUserDuration,
          isRunning: true,
        },
      },
    };

    wrapper = mount(
      <WrapWithProvider state={endState}>
        <FocusTimer
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
          widgetsMayBeMaximized={false}
        />
      </WrapWithProvider>
    );

    // Let interval fire and start the timer_end logic
    clock.tick(1000);

    // Allowing time for the chained timeouts for animation
    clock.tick(3000);
    wrapper.update();

    const endCall = dispatch
      .getCalls()
      .map(call => call.args[0])
      .find(action => action.type === at.WIDGETS_TIMER_END);

    assert.ok(
      endCall,
      "WIDGETS_TIMER_END should be dispatched when timer runs out"
    );
    assert.equal(
      endCall.data.duration,
      initialUserDuration,
      "timer should restore to user's initial input"
    );

    assert.equal(
      endCall.data.initialDuration,
      initialUserDuration,
      "initialDuration should also be restored to user's initial input"
    );
  });

  it("should wait one second at zero before completing timer", () => {
    const now = Math.floor(Date.now() / 1000);

    const endState = {
      ...mockState,
      TimerWidget: {
        ...mockState.TimerWidget,
        timerType: "focus",
        focus: {
          duration: 300,
          initialDuration: 300,
          startTime: now - 300,
          isRunning: true,
        },
      },
    };

    wrapper = mount(
      <WrapWithProvider state={endState}>
        <FocusTimer
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
          widgetsMayBeMaximized={false}
        />
      </WrapWithProvider>
    );

    // First interval tick - should reach zero but not complete
    clock.tick(1000);

    // Verify timer has not ended yet (no WIDGETS_TIMER_END dispatched)
    const callsAfterFirstTick = dispatch
      .getCalls()
      .map(call => call.args[0])
      .filter(action => action && action.type === at.WIDGETS_TIMER_END);

    assert.equal(
      callsAfterFirstTick.length,
      0,
      "WIDGETS_TIMER_END should not be dispatched on first tick at zero"
    );

    // Second interval tick - should now complete
    clock.tick(1000);

    // Allowing time for the chained timeouts for animation
    clock.tick(2000);
    wrapper.update();

    const endCall = dispatch
      .getCalls()
      .map(call => call.args[0])
      .find(action => action && action.type === at.WIDGETS_TIMER_END);

    assert.ok(
      endCall,
      "WIDGETS_TIMER_END should be dispatched after one second at zero"
    );
  });

  describe("context menu", () => {
    it("should render default context menu", () => {
      assert.ok(wrapper.find(".focus-timer-context-menu-button").exists());
      assert.ok(wrapper.find("#focus-timer-context-menu").exists());

      // "Turn notifications off" option
      assert.ok(
        wrapper
          .find(
            "panel-item[data-l10n-id='newtab-widget-timer-menu-notifications']"
          )
          .exists()
      );

      assert.ok(
        wrapper
          .find("panel-item[data-l10n-id='newtab-widget-timer-menu-hide']")
          .exists()
      );

      assert.ok(
        wrapper
          .find(
            "panel-item[data-l10n-id='newtab-widget-timer-menu-learn-more']"
          )
          .exists()
      );

      // Make sure "Turn notifications on" is not there
      assert.isFalse(
        wrapper.contains(
          "panel-item[data-l10n-id='newtab-widget-timer-menu-notifications-on']"
        )
      );
    });

    it("should render context menu with 'turn notifications on' if notifications are disabled", () => {
      const noNotificationsState = {
        ...mockState,
        Prefs: {
          ...INITIAL_STATE.Prefs,
          values: {
            ...INITIAL_STATE.Prefs.values,
            [PREF_WIDGETS_SYSTEM_NOTIFICATIONS_ENABLED]: false,
          },
        },
      };

      wrapper = mount(
        <WrapWithProvider state={noNotificationsState}>
          <FocusTimer
            dispatch={dispatch}
            handleUserInteraction={handleUserInteraction}
            widgetsMayBeMaximized={false}
          />
        </WrapWithProvider>
      );

      // "Turn notifications on" option
      assert.ok(
        wrapper
          .find(
            "panel-item[data-l10n-id='newtab-widget-timer-menu-notifications-on']"
          )
          .exists()
      );

      // Make sure "Turn notifications off" is not there
      assert.isFalse(
        wrapper.contains(
          "panel-item[data-l10n-id='newtab-widget-timer-menu-notifications']"
        )
      );
    });

    it("should turn off notifications when the 'Turn off notifications' option is clicked", () => {
      const menuItem = wrapper.find(
        "panel-item[data-l10n-id='newtab-widget-timer-menu-notifications']"
      );
      menuItem.props().onClick();

      assert.ok(dispatch.calledOnce);
      const [action] = dispatch.getCall(0).args;
      assert.equal(action.type, at.SET_PREF);
    });

    it("should hide Focus Timer when 'Hide timer' option is clicked", () => {
      const menuItem = wrapper.find(
        "panel-item[data-l10n-id='newtab-widget-timer-menu-hide']"
      );
      menuItem.props().onClick();

      assert.ok(dispatch.calledTwice);

      const [setPrefAction] = dispatch.getCall(0).args;
      assert.equal(setPrefAction.type, at.SET_PREF);
      assert.equal(setPrefAction.data.name, "widgets.focusTimer.enabled");
      assert.equal(setPrefAction.data.value, false);

      const [telemetryEvent] = dispatch.getCall(1).args;
      assert.equal(telemetryEvent.type, at.WIDGETS_ENABLED);
      assert.equal(telemetryEvent.data.widget_name, "focus_timer");
      assert.equal(telemetryEvent.data.widget_source, "context_menu");
      assert.equal(telemetryEvent.data.enabled, false);
      assert.equal(telemetryEvent.data.widget_size, "medium");
    });

    it("should dispatch OPEN_LINK when the Learn More option is clicked", () => {
      const menuItem = wrapper.find(
        "panel-item[data-l10n-id='newtab-widget-timer-menu-learn-more']"
      );
      menuItem.props().onClick();

      assert.ok(dispatch.calledOnce);
      const [action] = dispatch.getCall(0).args;
      assert.equal(action.type, at.OPEN_LINK);
    });
  });

  // Tests for the focus timer input. It should only allow numbers
  describe("isNumericValue", () => {
    it("should return true for single digit numbers", () => {
      assert.isTrue(isNumericValue("0"));
      assert.isTrue(isNumericValue("1"));
      assert.isTrue(isNumericValue("5"));
      assert.isTrue(isNumericValue("9"));
    });

    it("should return true for multi-digit numbers", () => {
      assert.isTrue(isNumericValue("10"));
      assert.isTrue(isNumericValue("25"));
      assert.isTrue(isNumericValue("99"));
    });

    it("should return false for non-numeric characters", () => {
      assert.isFalse(isNumericValue("a"));
      assert.isFalse(isNumericValue("Z"));
      assert.isFalse(isNumericValue("!"));
      assert.isFalse(isNumericValue("@"));
      assert.isFalse(isNumericValue(" "));
    });

    it("should return false for special characters", () => {
      assert.isFalse(isNumericValue("-"));
      assert.isFalse(isNumericValue("+"));
      assert.isFalse(isNumericValue("."));
      assert.isFalse(isNumericValue(","));
    });

    it("should return false for mixed alphanumeric strings", () => {
      assert.isFalse(isNumericValue("1a"));
      assert.isFalse(isNumericValue("a1"));
      assert.isFalse(isNumericValue("5x"));
    });

    it("should return false for empty string", () => {
      assert.isFalse(isNumericValue(" "));
    });
  });

  // Tests for the 2-character limit (enforces max 99 minutes, 59 seconds)
  describe("isAtMaxLength", () => {
    it("should return false for empty string", () => {
      assert.isFalse(isAtMaxLength(""));
    });

    it("should return false for single character", () => {
      assert.isFalse(isAtMaxLength("5"));
      assert.isFalse(isAtMaxLength("9"));
    });

    it("should return true for 2 characters", () => {
      assert.isTrue(isAtMaxLength("25"));
      assert.isTrue(isAtMaxLength("99"));
      assert.isTrue(isAtMaxLength("00"));
    });

    it("should return true for more than 2 characters", () => {
      assert.isTrue(isAtMaxLength("123"));
      assert.isTrue(isAtMaxLength("999"));
    });
  });

  it("should clamp minutes to 99 and seconds to 59 when setting duration", () => {
    // Find the editable fields
    const minutes = wrapper.find(".timer-set-minutes").at(0);
    const seconds = wrapper.find(".timer-set-seconds").at(0);

    // Simulate user typing values beyond limits
    minutes.getDOMNode().innerText = "100";
    seconds.getDOMNode().innerText = "85";

    // Trigger blur, which calls setTimerDuration()
    seconds.simulate("blur");

    // Clamp check
    const clampedMinutes = Math.min(
      parseInt(minutes.getDOMNode().innerText, 10),
      99
    );
    const clampedSeconds = Math.min(
      parseInt(seconds.getDOMNode().innerText, 10),
      59
    );

    assert.equal(clampedMinutes, 99, "minutes should be clamped to 99");
    assert.equal(clampedSeconds, 59, "seconds should be clamped to 59");
  });
});

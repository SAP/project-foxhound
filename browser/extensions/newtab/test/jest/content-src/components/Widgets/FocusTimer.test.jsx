import { act, fireEvent, render } from "@testing-library/react";
import { INITIAL_STATE } from "common/Reducers.sys.mjs";
import { WrapWithProvider } from "test/jest/test-utils";
import {
  FocusTimer,
  isValidSpinbuttonInput,
} from "content-src/components/Widgets/FocusTimer/FocusTimer";

const defaultProps = {
  dispatch: jest.fn(),
  handleUserInteraction: jest.fn(),
  isMaximized: false,
  widgetsMayBeMaximized: false,
};

function makeState(prefOverrides = {}, timerOverrides = {}) {
  return {
    ...INITIAL_STATE,
    Prefs: {
      ...INITIAL_STATE.Prefs,
      values: { ...INITIAL_STATE.Prefs.values, ...prefOverrides },
    },
    TimerWidget: {
      ...INITIAL_STATE.TimerWidget,
      ...timerOverrides,
      focus: {
        ...INITIAL_STATE.TimerWidget.focus,
        ...(timerOverrides.focus || {}),
      },
      break: {
        ...INITIAL_STATE.TimerWidget.break,
        ...(timerOverrides.break || {}),
      },
    },
  };
}

function novaState(extraPrefs = {}, timerOverrides = {}) {
  return makeState(
    {
      "nova.enabled": true,
      "widgets.focusTimer.size": "large",
      ...extraPrefs,
    },
    timerOverrides
  );
}

function renderTimer({ state, props } = {}) {
  const dispatch = jest.fn();
  const result = render(
    <WrapWithProvider state={state || INITIAL_STATE}>
      <FocusTimer {...defaultProps} {...props} dispatch={dispatch} />
    </WrapWithProvider>
  );
  return { ...result, dispatch };
}

describe("<FocusTimer>", () => {
  it("should render", () => {
    const { container } = renderTimer();
    expect(container.querySelector(".focus-timer")).toBeInTheDocument();
  });

  describe("change-size context menu item", () => {
    it("hides submenu when nova is disabled", () => {
      const { container } = renderTimer({
        state: makeState({ "nova.enabled": false }),
        props: { widgetsMayBeMaximized: true },
      });
      expect(
        container.querySelector(
          "span[data-l10n-id='newtab-widget-menu-change-size']"
        )
      ).not.toBeInTheDocument();
    });

    it("hides submenu when nova is enabled but widgetsMayBeMaximized is false", () => {
      const { container } = renderTimer({
        state: makeState({ "nova.enabled": true }),
        props: { widgetsMayBeMaximized: false },
      });
      expect(
        container.querySelector(
          "span[data-l10n-id='newtab-widget-menu-change-size']"
        )
      ).not.toBeInTheDocument();
    });

    it("shows submenu when nova is enabled and widgetsMayBeMaximized is true", () => {
      const { container } = renderTimer({
        state: makeState({ "nova.enabled": true }),
        props: { widgetsMayBeMaximized: true },
      });
      expect(
        container.querySelector(
          "span[data-l10n-id='newtab-widget-menu-change-size']"
        )
      ).toBeInTheDocument();
    });

    it("disables the small size entry and leaves medium/large enabled", () => {
      const { container } = renderTimer({
        state: novaState(),
        props: { widgetsMayBeMaximized: true },
      });
      const items = container.querySelectorAll(
        "#focus-timer-size-submenu panel-item[type='checkbox']"
      );
      const bySize = Array.from(items).reduce((acc, el) => {
        acc[el.getAttribute("data-size")] = el;
        return acc;
      }, {});
      expect(bySize.small.hasAttribute("disabled")).toBe(true);
      expect(bySize.medium.hasAttribute("disabled")).toBe(false);
      expect(bySize.large.hasAttribute("disabled")).toBe(false);
    });
  });

  describe("Nova layout", () => {
    it("applies the large-widget class for size=large under Nova", () => {
      const { container } = renderTimer({ state: novaState() });
      expect(
        container.querySelector(".focus-timer.large-widget")
      ).toBeInTheDocument();
      expect(
        container.querySelector(".focus-timer.large-widget.col-4")
      ).toBeInTheDocument();
    });

    it("applies the medium-widget class for size=medium under Nova", () => {
      const { container } = renderTimer({
        state: novaState({ "widgets.focusTimer.size": "medium" }),
      });
      expect(
        container.querySelector(".focus-timer.medium-widget")
      ).toBeInTheDocument();
    });

    it("renders the play button inside the circle in Nova", () => {
      const { container } = renderTimer({ state: novaState() });
      expect(
        container.querySelector(
          ".progress-circle-wrapper .focus-timer-play-button"
        )
      ).toBeInTheDocument();
    });

    it("falls back to the legacy markup when nova is disabled", () => {
      const { container } = renderTimer({
        state: makeState({ "nova.enabled": false }),
      });
      expect(container.querySelector(".focus-timer-tabs")).toBeInTheDocument();
      expect(
        container.querySelector(".focus-timer-spinbutton")
      ).not.toBeInTheDocument();
    });
  });

  describe("Nova spinbutton", () => {
    it("exposes the correct ARIA attributes", () => {
      const { container } = renderTimer({ state: novaState() });
      const spinbutton = container.querySelector("[role='spinbutton']");
      expect(spinbutton).toBeInTheDocument();
      expect(spinbutton.getAttribute("aria-valuemin")).toBe("1");
      expect(spinbutton.getAttribute("aria-valuemax")).toBe("99");
      expect(spinbutton.getAttribute("aria-valuenow")).toBe("25");
      expect(spinbutton.getAttribute("data-l10n-id")).toBe(
        "newtab-widget-timer-spinbutton-name"
      );
      expect(JSON.parse(spinbutton.getAttribute("data-l10n-args"))).toEqual({
        minutes: 25,
      });
    });

    it("dispatches WIDGETS_TIMER_SET_DURATION on ArrowUp (+1 minute)", () => {
      const { container, dispatch } = renderTimer({ state: novaState() });
      const spinbutton = container.querySelector("[role='spinbutton']");
      fireEvent.keyDown(spinbutton, { key: "ArrowUp" });

      const setDuration = dispatch.mock.calls.find(
        ([action]) => action.type === "WIDGETS_TIMER_SET_DURATION"
      );
      expect(setDuration).toBeDefined();
      expect(setDuration[0].data.duration).toBe(26 * 60);
    });

    it("dispatches with -1 minute on ArrowDown", () => {
      const { container, dispatch } = renderTimer({ state: novaState() });
      const spinbutton = container.querySelector("[role='spinbutton']");
      fireEvent.keyDown(spinbutton, { key: "ArrowDown" });

      const setDuration = dispatch.mock.calls.find(
        ([action]) => action.type === "WIDGETS_TIMER_SET_DURATION"
      );
      expect(setDuration[0].data.duration).toBe(24 * 60);
    });

    it("PageUp / PageDown adjust by 5 minutes", () => {
      const { container, dispatch } = renderTimer({ state: novaState() });
      const spinbutton = container.querySelector("[role='spinbutton']");
      fireEvent.keyDown(spinbutton, { key: "PageUp" });
      fireEvent.keyDown(spinbutton, { key: "PageDown" });

      const durations = dispatch.mock.calls
        .filter(([action]) => action.type === "WIDGETS_TIMER_SET_DURATION")
        .map(([action]) => action.data.duration);
      expect(durations).toEqual([30 * 60, 20 * 60]);
    });

    it("Home jumps to the minimum (1 min); End jumps to the maximum (99 min)", () => {
      const { container, dispatch } = renderTimer({ state: novaState() });
      const spinbutton = container.querySelector("[role='spinbutton']");
      fireEvent.keyDown(spinbutton, { key: "Home" });
      fireEvent.keyDown(spinbutton, { key: "End" });

      const durations = dispatch.mock.calls
        .filter(([action]) => action.type === "WIDGETS_TIMER_SET_DURATION")
        .map(([action]) => action.data.duration);
      expect(durations).toEqual([1 * 60, 99 * 60]);
    });

    it("clamps adjustments to the [1, 99] range", () => {
      const oneMinState = novaState(
        {},
        { focus: { duration: 60, initialDuration: 60 } }
      );
      const { container, dispatch } = renderTimer({ state: oneMinState });
      const spinbutton = container.querySelector("[role='spinbutton']");
      fireEvent.keyDown(spinbutton, { key: "ArrowDown" });

      // Should not dispatch — already at 1, clamped value === current duration
      const setDuration = dispatch.mock.calls.find(
        ([action]) => action.type === "WIDGETS_TIMER_SET_DURATION"
      );
      expect(setDuration).toBeUndefined();
    });
  });

  describe("isValidSpinbuttonInput", () => {
    it("blocks letters", () => {
      expect(isValidSpinbuttonInput("", "a", 0, 0)).toBe(false);
    });

    it("allows digits", () => {
      expect(isValidSpinbuttonInput("", "1", 0, 0)).toBe(true);
    });

    it("allows a single colon", () => {
      expect(isValidSpinbuttonInput("", ":", 0, 0)).toBe(true);
    });

    it("allows pasting a valid MM:SS string", () => {
      expect(isValidSpinbuttonInput("", "12:34", 0, 0)).toBe(true);
    });

    it("blocks pasted strings that contain letters", () => {
      expect(isValidSpinbuttonInput("", "ab:cd", 0, 0)).toBe(false);
    });

    it("blocks more than 2 digits before the colon", () => {
      expect(isValidSpinbuttonInput("", "123:45", 0, 0)).toBe(false);
    });

    it("blocks more than 2 digits after the colon", () => {
      expect(isValidSpinbuttonInput("", "12:345", 0, 0)).toBe(false);
    });

    it("blocks more than one colon", () => {
      expect(isValidSpinbuttonInput("", "1:2:3", 0, 0)).toBe(false);
    });

    it("blocks adding a 3rd digit before the colon", () => {
      // Current "12", caret at end, type "3" -> "123" -> invalid
      expect(isValidSpinbuttonInput("12", "3", 2, 2)).toBe(false);
    });

    it("allows adding the colon after 2 digits", () => {
      // Current "12", caret at end, type ":" -> "12:" -> valid
      expect(isValidSpinbuttonInput("12", ":", 2, 2)).toBe(true);
    });

    it("allows replacing a selection with a valid value", () => {
      // Current "12:34" fully selected, type "5" -> "5" -> valid
      expect(isValidSpinbuttonInput("12:34", "5", 0, 5)).toBe(true);
    });

    it("does not block deletion (input is null)", () => {
      expect(isValidSpinbuttonInput("12", null, 1, 2)).toBe(true);
    });
  });

  describe("Nova spinbutton commit (padding)", () => {
    it("commits '1' as 60 seconds (1 minute)", () => {
      const { container, dispatch } = renderTimer({ state: novaState() });
      const spinbutton = container.querySelector("[role='spinbutton']");
      spinbutton.innerText = "1";
      fireEvent.blur(spinbutton);
      const setDuration = dispatch.mock.calls.find(
        ([action]) => action.type === "WIDGETS_TIMER_SET_DURATION"
      );
      expect(setDuration[0].data.duration).toBe(60);
    });

    it("commits '1:1' as 61 seconds", () => {
      const { container, dispatch } = renderTimer({ state: novaState() });
      const spinbutton = container.querySelector("[role='spinbutton']");
      spinbutton.innerText = "1:1";
      fireEvent.blur(spinbutton);
      const setDuration = dispatch.mock.calls.find(
        ([action]) => action.type === "WIDGETS_TIMER_SET_DURATION"
      );
      expect(setDuration[0].data.duration).toBe(61);
    });

    it("commits '0:08' as 8 seconds (allows sub-minute values)", () => {
      const { container, dispatch } = renderTimer({ state: novaState() });
      const spinbutton = container.querySelector("[role='spinbutton']");
      spinbutton.innerText = "0:08";
      fireEvent.blur(spinbutton);
      const setDuration = dispatch.mock.calls.find(
        ([action]) => action.type === "WIDGETS_TIMER_SET_DURATION"
      );
      expect(setDuration[0].data.duration).toBe(8);
    });

    it("clamps minutes to 99", () => {
      const { container, dispatch } = renderTimer({ state: novaState() });
      const spinbutton = container.querySelector("[role='spinbutton']");
      spinbutton.innerText = "200:00";
      fireEvent.blur(spinbutton);
      const setDuration = dispatch.mock.calls.find(
        ([action]) => action.type === "WIDGETS_TIMER_SET_DURATION"
      );
      expect(setDuration[0].data.duration).toBe(99 * 60);
    });

    it("floors the total to at least 1 second", () => {
      const { container, dispatch } = renderTimer({ state: novaState() });
      const spinbutton = container.querySelector("[role='spinbutton']");
      spinbutton.innerText = "0:00";
      fireEvent.blur(spinbutton);
      const setDuration = dispatch.mock.calls.find(
        ([action]) => action.type === "WIDGETS_TIMER_SET_DURATION"
      );
      expect(setDuration[0].data.duration).toBe(1);
    });

    it("does not dispatch when the value matches the current duration", () => {
      // Default state: focus.duration = 25*60 = 1500
      const { container, dispatch } = renderTimer({ state: novaState() });
      const spinbutton = container.querySelector("[role='spinbutton']");
      spinbutton.innerText = "25:00";
      fireEvent.blur(spinbutton);
      const setDuration = dispatch.mock.calls.find(
        ([action]) => action.type === "WIDGETS_TIMER_SET_DURATION"
      );
      expect(setDuration).toBeUndefined();
    });

    it("rewrites the visible text to MM:SS when no dispatch is needed", () => {
      const { container } = renderTimer({ state: novaState() });
      const spinbutton = container.querySelector("[role='spinbutton']");
      spinbutton.innerText = "25";
      fireEvent.blur(spinbutton);
      expect(spinbutton.innerText).toBe("25:00");
    });

    it("restores the visible text when input is invalid (NaN minutes)", () => {
      const { container } = renderTimer({ state: novaState() });
      const spinbutton = container.querySelector("[role='spinbutton']");
      spinbutton.innerText = "garbage";
      fireEvent.blur(spinbutton);
      // After mount, useEffect sets timeLeft to duration (1500s = 25:00).
      expect(spinbutton.innerText).toBe("25:00");
    });
  });

  describe("Nova ± buttons", () => {
    it("are excluded from tab order and reference the spinbutton", () => {
      const { container } = renderTimer({ state: novaState() });
      const minus = container.querySelector(".focus-timer-minute-decrement");
      const plus = container.querySelector(".focus-timer-minute-increment");
      expect(minus.getAttribute("tabindex")).toBe("-1");
      expect(plus.getAttribute("tabindex")).toBe("-1");
      expect(minus.getAttribute("aria-controls")).toBe(
        "focus-timer-spinbutton"
      );
      expect(plus.getAttribute("aria-controls")).toBe("focus-timer-spinbutton");
      expect(minus.getAttribute("data-l10n-id")).toBe(
        "newtab-widget-timer-decrease-min"
      );
      expect(plus.getAttribute("data-l10n-id")).toBe(
        "newtab-widget-timer-increase-min"
      );
    });

    it("clicking + dispatches a +1 minute SET_DURATION", () => {
      const { container, dispatch } = renderTimer({ state: novaState() });
      const plus = container.querySelector(".focus-timer-minute-increment");
      fireEvent.click(plus);

      const setDuration = dispatch.mock.calls.find(
        ([action]) => action.type === "WIDGETS_TIMER_SET_DURATION"
      );
      expect(setDuration[0].data.duration).toBe(26 * 60);
    });

    it("clicking − dispatches a -1 minute SET_DURATION", () => {
      const { container, dispatch } = renderTimer({ state: novaState() });
      const minus = container.querySelector(".focus-timer-minute-decrement");
      fireEvent.click(minus);

      const setDuration = dispatch.mock.calls.find(
        ([action]) => action.type === "WIDGETS_TIMER_SET_DURATION"
      );
      expect(setDuration[0].data.duration).toBe(24 * 60);
    });

    it("rounds sub-minute durations down before incrementing (0:01 + 1 -> 1:00)", () => {
      const subMinuteState = novaState(
        {},
        { focus: { duration: 1, initialDuration: 1 } }
      );
      const { container, dispatch } = renderTimer({ state: subMinuteState });
      const plus = container.querySelector(".focus-timer-minute-increment");
      fireEvent.click(plus);

      const setDuration = dispatch.mock.calls.find(
        ([action]) => action.type === "WIDGETS_TIMER_SET_DURATION"
      );
      expect(setDuration[0].data.duration).toBe(60);
    });
  });

  describe("Nova mode radiogroup", () => {
    it("wraps the Focus/Break controls in a radiogroup", () => {
      const { container } = renderTimer({ state: novaState() });
      const group = container.querySelector("[role='radiogroup']");
      expect(group).toBeInTheDocument();
      expect(group.getAttribute("data-l10n-id")).toBe(
        "newtab-widget-timer-mode-group"
      );
      const radios = group.querySelectorAll("[role='radio']");
      expect(radios).toHaveLength(2);
    });

    it("aria-checked and tabindex track the active timerType", () => {
      const { container } = renderTimer({
        state: novaState({}, { timerType: "break" }),
      });
      const radios = container.querySelectorAll(
        "[role='radiogroup'] [role='radio']"
      );
      const focusRadio = Array.from(radios).find(
        r => r.getAttribute("data-l10n-id") === "newtab-widget-timer-mode-focus"
      );
      const breakRadio = Array.from(radios).find(
        r => r.getAttribute("data-l10n-id") === "newtab-widget-timer-mode-break"
      );
      expect(focusRadio.getAttribute("aria-checked")).toBe("false");
      expect(focusRadio.getAttribute("tabindex")).toBe("-1");
      expect(breakRadio.getAttribute("aria-checked")).toBe("true");
      expect(breakRadio.getAttribute("tabindex")).toBe("0");
    });

    it("ArrowRight on the radiogroup toggles timer type", () => {
      const { container, dispatch } = renderTimer({ state: novaState() });
      const group = container.querySelector("[role='radiogroup']");
      fireEvent.keyDown(group, { key: "ArrowRight" });

      const setType = dispatch.mock.calls.find(
        ([action]) => action.type === "WIDGETS_TIMER_SET_TYPE"
      );
      expect(setType).toBeDefined();
      expect(setType[0].data.timerType).toBe("break");
    });
  });

  describe("Nova play/pause accessible name", () => {
    it("is a 'Start <minutes>-minute timer' label when idle", () => {
      const { container } = renderTimer({ state: novaState() });
      const button = container.querySelector(".focus-timer-play-button");
      expect(button.getAttribute("data-l10n-id")).toBe(
        "newtab-widget-timer-start-aria"
      );
      expect(JSON.parse(button.getAttribute("data-l10n-args"))).toEqual({
        minutes: 25,
      });
    });

    it("becomes 'Pause timer' when the timer is running", () => {
      const runningState = novaState(
        {},
        {
          focus: {
            duration: 25 * 60,
            initialDuration: 25 * 60,
            isRunning: true,
          },
        }
      );
      const { container } = renderTimer({ state: runningState });
      const button = container.querySelector(".focus-timer-play-button");
      expect(button.getAttribute("data-l10n-id")).toBe(
        "newtab-widget-timer-pause-aria"
      );
    });
  });

  describe("Nova running-state body swap", () => {
    const runningState = () =>
      novaState(
        {},
        {
          focus: {
            duration: 25 * 60,
            initialDuration: 25 * 60,
            isRunning: true,
          },
        }
      );

    it("swaps the spinbutton for the time + mode label while running", () => {
      const { container } = renderTimer({ state: runningState() });
      expect(container.querySelector(".focus-timer-spinbutton")).toBeNull();
      expect(
        container.querySelector(".focus-timer-time-display")
      ).toBeInTheDocument();
      expect(
        container.querySelector(
          ".focus-timer-time-mode[data-l10n-id='newtab-widget-timer-running-focus']"
        )
      ).toBeInTheDocument();
    });

    it("swaps the radiogroup for the reset button while running (Large)", () => {
      const { container } = renderTimer({ state: runningState() });
      expect(container.querySelector("[role='radiogroup']")).toBeNull();
      expect(
        container.querySelector(".focus-timer-reset-button")
      ).toBeInTheDocument();
    });

    it("hides both radiogroup and reset button while running (Medium)", () => {
      const { container } = renderTimer({
        state: novaState(
          { "widgets.focusTimer.size": "medium" },
          {
            focus: {
              duration: 25 * 60,
              initialDuration: 25 * 60,
              isRunning: true,
            },
          }
        ),
      });
      expect(container.querySelector("[role='radiogroup']")).toBeNull();
      expect(container.querySelector(".focus-timer-reset-button")).toBeNull();
    });
  });

  describe("Nova reset button visibility", () => {
    it("is hidden in idle state (duration === initialDuration, !isRunning)", () => {
      const { container } = renderTimer({ state: novaState() });
      expect(container.querySelector(".focus-timer-reset-button")).toBeNull();
    });

    it("is visible when the timer is paused mid-run (duration < initialDuration)", () => {
      const pausedState = novaState(
        {},
        {
          focus: {
            duration: 12 * 60,
            initialDuration: 25 * 60,
            isRunning: false,
          },
        }
      );
      const { container } = renderTimer({ state: pausedState });
      expect(
        container.querySelector(".focus-timer-reset-button")
      ).toBeInTheDocument();
    });

    it("is hidden in the medium size even when progress exists", () => {
      const pausedMedium = novaState(
        { "widgets.focusTimer.size": "medium" },
        {
          focus: {
            duration: 12 * 60,
            initialDuration: 25 * 60,
            isRunning: false,
          },
        }
      );
      const { container } = renderTimer({ state: pausedMedium });
      expect(container.querySelector(".focus-timer-reset-button")).toBeNull();
    });
  });

  describe("Nova celebration overlay", () => {
    let originalMatchMedia;

    function mockMatchMedia(matches) {
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches,
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }));
    }

    beforeEach(() => {
      originalMatchMedia = window.matchMedia;
      // <WidgetCelebration> bails out under prefers-reduced-motion: reduce
      mockMatchMedia(false);
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
      window.matchMedia = originalMatchMedia;
    });

    function aboutToFinishState(timerOverrides) {
      return novaState(
        {},
        timerOverrides || {
          focus: {
            duration: 1,
            initialDuration: 25 * 60,
            isRunning: true,
            startTime: Math.floor(Date.now() / 1000) - 1,
          },
        }
      );
    }

    function tickToZero() {
      // Two ticks for the existing has-reached-zero gate.
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    }

    function fireLifecycleEnd(overlay) {
      // testing-library's fireEvent.animationEnd doesn't propagate
      // animationName to React's synthetic event in JSDOM, so dispatch
      // a native Event with the property defined manually.
      act(() => {
        const event = new Event("animationend", { bubbles: true });
        Object.defineProperty(event, "animationName", {
          value: "widget-celebration-lifecycle",
        });
        overlay.dispatchEvent(event);
      });
    }

    it("mounts <WidgetCelebration> when the timer ticks to zero", () => {
      const { container } = renderTimer({ state: aboutToFinishState() });

      tickToZero();

      expect(
        container.querySelector(".focus-timer-celebration")
      ).toBeInTheDocument();
      expect(
        container.querySelector(".focus-timer-celebration-headline")
      ).toBeInTheDocument();
    });

    it("fires Focus->Break toggle when the lifecycle animation ends", () => {
      const { container, dispatch } = renderTimer({
        state: aboutToFinishState(),
      });

      tickToZero();
      const overlay = container.querySelector(".focus-timer-celebration");
      expect(overlay).toBeInTheDocument();
      fireLifecycleEnd(overlay);

      const setType = dispatch.mock.calls.find(
        ([action]) => action.type === "WIDGETS_TIMER_SET_TYPE"
      );
      expect(setType).toBeDefined();
      expect(setType[0].data.timerType).toBe("break");
    });

    it("fires Break->Focus toggle on the next celebration too", () => {
      // Guards against ref / closure leaks that would block a second toggle.
      const breakAboutToFinish = makeState(
        { "nova.enabled": true, "widgets.focusTimer.size": "large" },
        {
          timerType: "break",
          break: {
            duration: 1,
            initialDuration: 5 * 60,
            isRunning: true,
            startTime: Math.floor(Date.now() / 1000) - 1,
          },
        }
      );
      const { container, dispatch } = renderTimer({
        state: breakAboutToFinish,
      });

      tickToZero();
      const overlay = container.querySelector(".focus-timer-celebration");
      fireLifecycleEnd(overlay);

      const setType = dispatch.mock.calls.find(
        ([action]) => action.type === "WIDGETS_TIMER_SET_TYPE"
      );
      expect(setType).toBeDefined();
      expect(setType[0].data.timerType).toBe("focus");
    });

    it("dispatches WIDGETS_TIMER_SET_TYPE only once per completion", () => {
      // Guards against the celebration overlay double-firing onAnimationEnd
      // and re-toggling Focus<->Break a second time.
      const { container, dispatch } = renderTimer({
        state: aboutToFinishState(),
      });

      tickToZero();
      const overlay = container.querySelector(".focus-timer-celebration");
      fireLifecycleEnd(overlay);
      fireLifecycleEnd(overlay);

      const setTypeCalls = dispatch.mock.calls.filter(
        ([action]) => action.type === "WIDGETS_TIMER_SET_TYPE"
      );
      expect(setTypeCalls).toHaveLength(1);
    });

    it("falls back to immediate Focus<->Break toggle under reduced motion", () => {
      // Reduced-motion users skip the celebration animation; the toggle
      // and TIMER_TOGGLE_* telemetry must still fire inline.
      mockMatchMedia(true);
      const { container, dispatch } = renderTimer({
        state: aboutToFinishState(),
      });

      tickToZero();

      expect(
        container.querySelector(".focus-timer-celebration")
      ).not.toBeInTheDocument();

      const setType = dispatch.mock.calls.find(
        ([action]) => action.type === "WIDGETS_TIMER_SET_TYPE"
      );
      expect(setType).toBeDefined();
      expect(setType[0].data.timerType).toBe("break");

      const toggleTelemetry = dispatch.mock.calls.find(
        ([action]) =>
          action.type === "WIDGETS_TIMER_USER_EVENT" &&
          action.data?.userAction === "timer_toggle_break"
      );
      expect(toggleTelemetry).toBeDefined();
    });

    it("falls back to immediate Focus<->Break toggle in classic (non-Nova) mode", () => {
      // Classic mode never mounts the overlay; the toggle and telemetry
      // must still fire inline so classic users keep getting auto-flips.
      const classicState = makeState(
        { "nova.enabled": false },
        {
          focus: {
            duration: 1,
            initialDuration: 25 * 60,
            isRunning: true,
            startTime: Math.floor(Date.now() / 1000) - 1,
          },
        }
      );
      const { container, dispatch } = renderTimer({ state: classicState });

      tickToZero();

      expect(
        container.querySelector(".focus-timer-celebration")
      ).not.toBeInTheDocument();

      const setType = dispatch.mock.calls.find(
        ([action]) => action.type === "WIDGETS_TIMER_SET_TYPE"
      );
      expect(setType).toBeDefined();
      expect(setType[0].data.timerType).toBe("break");
    });

    it("ignores ring clicks while the celebration is running", () => {
      // The reducer leaves the timer paused at full duration after
      // WIDGETS_TIMER_END, so an unguarded click would dispatch
      // WIDGETS_TIMER_PLAY and restart the just-finished timer.
      const { container, dispatch } = renderTimer({
        state: aboutToFinishState(),
      });

      tickToZero();

      const wrapper = container.querySelector(".progress-circle-wrapper");
      act(() => {
        fireEvent.click(wrapper);
      });

      const playCalls = dispatch.mock.calls.filter(
        ([action]) => action.type === "WIDGETS_TIMER_PLAY"
      );
      expect(playCalls).toHaveLength(0);
    });

    it("ignores reset-button activation while the celebration is running", () => {
      // The reset button stays in tab-order during celebration in the Large
      // layout. Without the guard, keyboard activation would dispatch
      // WIDGETS_TIMER_RESET and race the pending Focus<->Break toggle.
      const { container, dispatch } = renderTimer({
        state: aboutToFinishState(),
      });

      tickToZero();

      const resetButton = container.querySelector(".focus-timer-reset-button");
      expect(resetButton).toBeInTheDocument();
      act(() => {
        fireEvent.click(resetButton);
      });

      const resetCalls = dispatch.mock.calls.filter(
        ([action]) => action.type === "WIDGETS_TIMER_RESET"
      );
      expect(resetCalls).toHaveLength(0);
    });
  });
});

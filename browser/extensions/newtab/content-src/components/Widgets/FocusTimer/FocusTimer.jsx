/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { actionCreators as ac, actionTypes as at } from "common/Actions.mjs";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSelector, batch } from "react-redux";
import { useIntersectionObserver, useSizeSubmenu } from "../../../lib/utils";
import { WIDGET_REGISTRY, resolveWidgetSize } from "common/WidgetsRegistry.mjs";
import { WidgetCelebration } from "../WidgetCelebration";
import { useWidgetCelebration } from "../useWidgetCelebration";
import { MoveSubmenu } from "../MoveSubmenu";

const FOCUS_TIMER_CELEBRATION_GRADIENT_STOPS = [
  { offset: "0%", color: "var(--timer-celebration-leading)" },
  { offset: "100%", color: "var(--timer-celebration-trailing)" },
];

const USER_ACTION_TYPES = {
  CHANGE_SIZE: "change_size",
  TIMER_SET: "timer_set",
  TIMER_PLAY: "timer_play",
  TIMER_PAUSE: "timer_pause",
  TIMER_RESET: "timer_reset",
  TIMER_END: "timer_end",
  TIMER_TOGGLE_FOCUS: "timer_toggle_focus",
  TIMER_TOGGLE_BREAK: "timer_toggle_break",
};

const PREF_NOVA_ENABLED = "nova.enabled";
const PREF_FOCUS_TIMER_SIZE = "widgets.focusTimer.size";

/**
 * Calculates the remaining time (in seconds) by subtracting elapsed time from the original duration
 *
 * @param duration
 * @param start
 * @returns int
 */
export const calculateTimeRemaining = (duration, start) => {
  const currentTime = Math.floor(Date.now() / 1000);

  // Subtract the elapsed time from initial duration to get time remaining in the timer
  return Math.max(duration - (currentTime - start), 0);
};

/**
 * Converts a number of seconds into a zero-padded MM:SS time string
 *
 * @param seconds
 * @returns string
 */
export const formatTime = seconds => {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
};

/**
 * Validates that the inputs in the timer only allow numerical digits (0-9)
 *
 * @param input - The character being input
 * @returns boolean - true if valid numeric input, false otherwise
 */
export const isNumericValue = input => {
  // Check for null/undefined input or non-numeric characters
  return input && /^\d+$/.test(input);
};

/**
 * Validates if adding a new digit would exceed the 2-character limit
 *
 * @param currentValue - The current value in the field
 * @returns boolean - true if at 2-character limit, false otherwise
 */
export const isAtMaxLength = currentValue => {
  return currentValue.length >= 2;
};

// @nova-cleanup(remove): Drop after Nova ships
/**
 * Validates whether the next state of the Nova spinbutton is acceptable.
 * Allows up to 2 digits, an optional single colon, and up to 2 more digits.
 *
 * @param current - The element's current text content
 * @param input - The string the user is about to insert
 * @param start - The selection start (insertion point) within `current`
 * @param end - The selection end within `current`
 * @returns boolean - true if the resulting string matches the MM:SS pattern
 */
export const isValidSpinbuttonInput = (current, input, start, end) => {
  if (input === null || input === undefined) {
    return true;
  }
  const next = current.slice(0, start) + input + current.slice(end);
  return /^(\d{1,2})?(:\d{0,2})?$/.test(next);
};

/**
 * Converts a polar coordinate (angle on circle) into a percentage-based [x,y] position for clip-path
 *
 * @param cx
 * @param cy
 * @param radius
 * @param angle
 * @returns string
 */
export const polarToPercent = (cx, cy, radius, angle) => {
  const rad = ((angle - 90) * Math.PI) / 180;
  const x = cx + radius * Math.cos(rad);
  const y = cy + radius * Math.sin(rad);
  return `${x}% ${y}%`;
};

/**
 * Generates a clip-path polygon string that represents a pie slice from 0 degrees
 * to the current progress angle
 *
 * @returns string
 * @param progress
 */
export const getClipPath = progress => {
  const cx = 50;
  const cy = 50;
  const radius = 50;
  // Show some progress right at the start - 6 degrees is just enough to paint a dot once the timer is ticking
  const angle = progress > 0 ? Math.max(progress * 360, 6) : 0;
  const points = [`50% 50%`];

  for (let a = 0; a <= angle; a += 2) {
    points.push(polarToPercent(cx, cy, radius, a));
  }

  return `polygon(${points.join(", ")})`;
};

/* eslint-disable complexity, max-statements */
export const FocusTimer = ({
  dispatch,
  handleUserInteraction,
  isMaximized,
  widgetsMayBeMaximized,
  widgetEnabledMap,
}) => {
  const [timeLeft, setTimeLeft] = useState(0);
  // calculated value for the progress circle; 1 = 100%
  const [progress, setProgress] = useState(0);

  const activeMinutesRef = useRef(null);
  const activeSecondsRef = useRef(null);
  const arcRef = useRef(null);
  const impressionFired = useRef(false);

  const timerType = useSelector(state => state.TimerWidget.timerType);
  const timerData = useSelector(state => state.TimerWidget);
  const { duration, initialDuration, startTime, isRunning } =
    timerData[timerType];
  const initialTimerDuration = timerData[timerType].initialDuration;

  const prefs = useSelector(state => state.Prefs.values);
  // @nova-cleanup(remove-pref): Remove novaEnabled and this check; always use resolveWidgetSize directly after Nova ships
  const novaEnabled = prefs[PREF_NOVA_ENABLED];
  const isSmallSize = novaEnabled
    ? false
    : !isMaximized && widgetsMayBeMaximized;
  const timerWidget = WIDGET_REGISTRY.find(w => w.id === "focusTimer");
  let widgetSize;
  if (novaEnabled) {
    widgetSize = resolveWidgetSize(timerWidget, prefs);
  } else {
    widgetSize = isSmallSize ? "small" : "medium";
  }

  // @nova-cleanup(remove-conditional): Inline these for Nova-only after Nova ships
  // Nova spinbutton works in whole minutes; ceil to the next minute so a 4:38
  // remainder reads as "5 minutes" via aria-valuenow / accessible name.
  const minutesValue = Math.max(1, Math.ceil((timeLeft || duration) / 60));
  // For +/- and arrow-key adjustments, treat the integer-minutes part of the
  // current duration as the base so e.g. 0:01 + 1 -> 1:00 (not 2:00).
  const minutesFloor = Math.floor((timeLeft || duration) / 60);
  const hasProgressed = duration < initialDuration || isRunning;
  const isComplete = progress === 1;

  const handleTimerInteraction = useCallback(
    () => handleUserInteraction("focusTimer"),
    [handleUserInteraction]
  );

  const handleIntersection = useCallback(() => {
    if (impressionFired.current) {
      return;
    }
    impressionFired.current = true;
    batch(() => {
      dispatch(
        ac.AlsoToMain({
          type: at.WIDGETS_TIMER_USER_IMPRESSION,
        })
      );

      const telemetryData = {
        widget_name: "focus_timer",
        widget_size: widgetSize,
      };

      dispatch(
        ac.AlsoToMain({
          type: at.WIDGETS_IMPRESSION,
          data: telemetryData,
        })
      );
    });
  }, [dispatch, widgetSize]);

  const timerRef = useIntersectionObserver(handleIntersection);
  const widgetCelebrationRef = useRef(null);
  const {
    celebrationFrame,
    celebrationId,
    completeCelebration,
    isCelebrating,
    triggerCelebration,
  } = useWidgetCelebration(widgetCelebrationRef);
  // Guards against a double-fire that would re-toggle SET_TYPE.
  const celebrationCompletedRef = useRef(false);

  useEffect(() => {
    if (isCelebrating) {
      celebrationCompletedRef.current = false;
    }
  }, [isCelebrating]);

  const resetProgressCircle = useCallback(() => {
    if (arcRef?.current) {
      arcRef.current.style.clipPath = "polygon(50% 50%)";
      arcRef.current.style.webkitClipPath = "polygon(50% 50%)";
    }
    setProgress(0);
    handleTimerInteraction();
  }, [arcRef, handleTimerInteraction]);

  const handleCelebrationComplete = useCallback(() => {
    if (celebrationCompletedRef.current) {
      return;
    }
    celebrationCompletedRef.current = true;
    resetProgressCircle();

    batch(() => {
      dispatch(
        ac.AlsoToMain({
          type: at.WIDGETS_TIMER_SET_TYPE,
          data: { timerType: timerType === "focus" ? "break" : "focus" },
        })
      );

      const userAction =
        timerType === "focus"
          ? USER_ACTION_TYPES.TIMER_TOGGLE_BREAK
          : USER_ACTION_TYPES.TIMER_TOGGLE_FOCUS;

      dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_TIMER_USER_EVENT,
          data: { userAction },
        })
      );

      dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_USER_EVENT,
          data: {
            widget_name: "focus_timer",
            widget_source: "widget",
            user_action: userAction,
            widget_size: widgetSize,
          },
        })
      );
    });

    completeCelebration();
  }, [
    completeCelebration,
    dispatch,
    resetProgressCircle,
    timerType,
    widgetSize,
  ]);

  const showSystemNotifications =
    prefs["widgets.focusTimer.showSystemNotifications"];

  // Held in a ref so the ticker effect below doesn't re-arm whenever
  // timerType / widgetSize / handleCelebrationComplete change. Reassigned
  // each render so the closure captures the latest values at fire time.
  const handleTimerEndRef = useRef(null);
  handleTimerEndRef.current = () => {
    batch(() => {
      dispatch(
        ac.AlsoToMain({
          type: at.WIDGETS_TIMER_END,
          data: {
            timerType,
            duration: initialTimerDuration,
            initialDuration: initialTimerDuration,
          },
        })
      );

      dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_TIMER_USER_EVENT,
          data: { userAction: USER_ACTION_TYPES.TIMER_END },
        })
      );

      dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_USER_EVENT,
          data: {
            widget_name: "focus_timer",
            widget_source: "widget",
            user_action: USER_ACTION_TYPES.TIMER_END,
            widget_size: widgetSize,
          },
        })
      );
    });

    celebrationCompletedRef.current = false;

    // animate the progress circle to turn solid green
    setProgress(1);

    // Classic mode and reduced-motion users skip the animation, so
    // run the completion handler inline so the auto-toggle still fires.
    // @nova-cleanup(remove-conditional): replace with `if (!triggerCelebration())`.
    if (!(novaEnabled && triggerCelebration())) {
      handleCelebrationComplete();
    }
  };

  // Ticker: re-arms only when run-state changes, not on every timerType flip.
  useEffect(() => {
    if (!isRunning || duration <= 0) {
      return undefined;
    }
    let hasReachedZero = false;
    const interval = setInterval(() => {
      const currentTime = Math.floor(Date.now() / 1000);
      const elapsed = currentTime - startTime;
      const remaining = calculateTimeRemaining(duration, startTime);

      // using setTimeLeft to trigger a re-render of the component to show live countdown each second
      setTimeLeft(remaining);
      setProgress((initialDuration - remaining) / initialDuration);

      if (elapsed >= duration && hasReachedZero) {
        clearInterval(interval);
        handleTimerEndRef.current?.();
      } else if (elapsed >= duration) {
        hasReachedZero = true;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, startTime, duration, initialDuration]);

  // Paused-UI sync: shows the correct live time and progress whenever timer
  // state changes (page load, type toggle, pause/resume).
  useEffect(() => {
    setTimeLeft(
      isRunning ? calculateTimeRemaining(duration, startTime) : duration
    );

    if (!isRunning && duration < initialDuration) {
      // Show previously elapsed time
      setProgress((initialDuration - duration) / initialDuration);
    } else if (!isRunning && !isCelebrating) {
      // Don't reset while celebrating — would clear progress=1 mid-animation.
      setProgress(0);
    }
  }, [isRunning, startTime, duration, initialDuration, isCelebrating]);

  // Update the clip-path of the gradient circle to match the current progress value
  useEffect(() => {
    if (arcRef?.current) {
      // Only set clip-path if current timer has been started or is running
      if (progress > 0 || isRunning) {
        arcRef.current.style.clipPath = getClipPath(progress);
      } else {
        arcRef.current.style.clipPath = "";
      }
    }
  }, [progress, isRunning]);

  // set timer function
  const setTimerDuration = () => {
    const minutesEl = activeMinutesRef.current;
    const secondsEl = activeSecondsRef.current;

    const minutesText = minutesEl.innerText.trim() || "0";
    const secondsText = secondsEl.innerText.trim() || "0";

    let minutes = parseInt(minutesText || "0", 10);
    let seconds = parseInt(secondsText || "0", 10);

    // Set a limit of 99 minutes
    minutes = Math.min(minutes, 99);
    // Set a limit of 59 seconds
    seconds = Math.min(seconds, 59);

    const totalSeconds = minutes * 60 + seconds;

    if (
      !Number.isNaN(totalSeconds) &&
      totalSeconds > 0 &&
      totalSeconds !== duration
    ) {
      batch(() => {
        dispatch(
          ac.AlsoToMain({
            type: at.WIDGETS_TIMER_SET_DURATION,
            data: { timerType, duration: totalSeconds },
          })
        );

        dispatch(
          ac.OnlyToMain({
            type: at.WIDGETS_TIMER_USER_EVENT,
            data: { userAction: USER_ACTION_TYPES.TIMER_SET },
          })
        );

        const telemetryData = {
          widget_name: "focus_timer",
          widget_source: "widget",
          user_action: USER_ACTION_TYPES.TIMER_SET,
          widget_size: widgetSize,
        };

        dispatch(
          ac.OnlyToMain({
            type: at.WIDGETS_USER_EVENT,
            data: telemetryData,
          })
        );
      });
    }
    handleTimerInteraction();
  };

  // Pause timer function
  const toggleTimer = () => {
    // Ignore activations during the celebration window so the just-finished
    // timer can't be restarted before Focus<->Break flips.
    if (isCelebrating) {
      return;
    }
    if (!isRunning && duration > 0) {
      batch(() => {
        dispatch(
          ac.AlsoToMain({
            type: at.WIDGETS_TIMER_PLAY,
            data: { timerType },
          })
        );

        dispatch(
          ac.OnlyToMain({
            type: at.WIDGETS_TIMER_USER_EVENT,
            data: { userAction: USER_ACTION_TYPES.TIMER_PLAY },
          })
        );

        const telemetryData = {
          widget_name: "focus_timer",
          widget_source: "widget",
          user_action: USER_ACTION_TYPES.TIMER_PLAY,
          widget_size: widgetSize,
        };

        dispatch(
          ac.OnlyToMain({
            type: at.WIDGETS_USER_EVENT,
            data: telemetryData,
          })
        );
      });
    } else if (isRunning) {
      // calculated to get the new baseline of the timer when it starts or resumes
      const remaining = calculateTimeRemaining(duration, startTime);
      batch(() => {
        dispatch(
          ac.AlsoToMain({
            type: at.WIDGETS_TIMER_PAUSE,
            data: {
              timerType,
              duration: remaining,
            },
          })
        );

        dispatch(
          ac.OnlyToMain({
            type: at.WIDGETS_TIMER_USER_EVENT,
            data: { userAction: USER_ACTION_TYPES.TIMER_PAUSE },
          })
        );

        const telemetryData = {
          widget_name: "focus_timer",
          widget_source: "widget",
          user_action: USER_ACTION_TYPES.TIMER_PAUSE,
          widget_size: widgetSize,
        };

        dispatch(
          ac.OnlyToMain({
            type: at.WIDGETS_USER_EVENT,
            data: telemetryData,
          })
        );
      });
    }
    handleTimerInteraction();
  };

  // reset timer function
  const resetTimer = () => {
    // Same rationale as toggleTimer: don't let the keyboard-reachable
    // reset button restart the cycle while the celebration is running.
    if (isCelebrating) {
      return;
    }
    batch(() => {
      dispatch(
        ac.AlsoToMain({
          type: at.WIDGETS_TIMER_RESET,
          data: {
            timerType,
            duration: initialTimerDuration,
            initialDuration: initialTimerDuration,
          },
        })
      );

      dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_TIMER_USER_EVENT,
          data: { userAction: USER_ACTION_TYPES.TIMER_RESET },
        })
      );

      const telemetryData = {
        widget_name: "focus_timer",
        widget_source: "widget",
        user_action: USER_ACTION_TYPES.TIMER_RESET,
        widget_size: widgetSize,
      };

      dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_USER_EVENT,
          data: telemetryData,
        })
      );
    });

    // Reset progress value and gradient arc on the progress circle
    resetProgressCircle();

    handleTimerInteraction();
  };

  // Toggles between "focus" and "break" timer types
  const toggleType = type => {
    const oldTypeRemaining = calculateTimeRemaining(duration, startTime);

    batch(() => {
      // The type we are toggling away from automatically pauses
      dispatch(
        ac.AlsoToMain({
          type: at.WIDGETS_TIMER_PAUSE,
          data: {
            timerType,
            duration: oldTypeRemaining,
          },
        })
      );

      dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_TIMER_USER_EVENT,
          data: { userAction: USER_ACTION_TYPES.TIMER_PAUSE },
        })
      );

      const pauseTelemetryData = {
        widget_name: "focus_timer",
        widget_source: "widget",
        user_action: USER_ACTION_TYPES.TIMER_PAUSE,
        widget_size: widgetSize,
      };

      dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_USER_EVENT,
          data: pauseTelemetryData,
        })
      );

      // Sets the current timer type so it persists when opening a new tab
      dispatch(
        ac.AlsoToMain({
          type: at.WIDGETS_TIMER_SET_TYPE,
          data: {
            timerType: type,
          },
        })
      );

      const toggleUserAction =
        type === "focus"
          ? USER_ACTION_TYPES.TIMER_TOGGLE_FOCUS
          : USER_ACTION_TYPES.TIMER_TOGGLE_BREAK;

      dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_TIMER_USER_EVENT,
          data: { userAction: toggleUserAction },
        })
      );

      const toggleTelemetryData = {
        widget_name: "focus_timer",
        widget_source: "widget",
        user_action: toggleUserAction,
        widget_size: widgetSize,
      };

      dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_USER_EVENT,
          data: toggleTelemetryData,
        })
      );
    });
    handleTimerInteraction();
  };

  const handleKeyDown = e => {
    if (e.key === "Enter") {
      e.preventDefault();
      setTimerDuration(e);
      handleTimerInteraction();
    }

    if (e.key === "Tab") {
      setTimerDuration(e);
      handleTimerInteraction();
    }
  };

  const handleBeforeInput = e => {
    const input = e.data;
    const values = e.target.innerText.trim();

    // only allow numerical digits 0–9 for time input
    if (!isNumericValue(input)) {
      e.preventDefault();
      return;
    }

    const selection = window.getSelection();
    const selectedText = selection.toString();

    // if entire value is selected, replace it with the new input
    if (selectedText === values) {
      e.preventDefault(); // prevent default typing
      e.target.innerText = input;

      // Places the caret at the end of the content-editable text
      // This is a known problem with content-editable where the caret
      const range = document.createRange();
      range.selectNodeContents(e.target);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }

    // only allow 2 values each for minutes and seconds
    if (isAtMaxLength(values)) {
      e.preventDefault();
    }
  };

  const handleFocus = e => {
    if (isRunning) {
      // calculated to get the new baseline of the timer when it starts or resumes
      const remaining = calculateTimeRemaining(duration, startTime);

      batch(() => {
        dispatch(
          ac.AlsoToMain({
            type: at.WIDGETS_TIMER_PAUSE,
            data: {
              timerType,
              duration: remaining,
            },
          })
        );

        dispatch(
          ac.OnlyToMain({
            type: at.WIDGETS_TIMER_USER_EVENT,
            data: { userAction: USER_ACTION_TYPES.TIMER_PAUSE },
          })
        );

        const telemetryData = {
          widget_name: "focus_timer",
          widget_source: "widget",
          user_action: USER_ACTION_TYPES.TIMER_PAUSE,
          widget_size: widgetSize,
        };

        dispatch(
          ac.OnlyToMain({
            type: at.WIDGETS_USER_EVENT,
            data: telemetryData,
          })
        );
      });
    }

    // highlight entire text when focused on the time.
    // this makes it easier to input the new time instead of backspacing
    const el = e.target;
    if (document.createRange && window.getSelection) {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  function handleLearnMore() {
    dispatch(
      ac.OnlyToMain({
        type: at.OPEN_LINK,
        data: {
          url: "https://support.mozilla.org/kb/firefox-new-tab-widgets",
        },
      })
    );
    handleTimerInteraction();
  }

  function handlePrefUpdate(prefName, prefValue) {
    dispatch(
      ac.OnlyToMain({
        type: at.SET_PREF,
        data: {
          name: prefName,
          value: prefValue,
        },
      })
    );
    handleTimerInteraction();
  }

  const handleChangeSize = useCallback(
    size => {
      batch(() => {
        dispatch(
          ac.OnlyToMain({
            type: at.SET_PREF,
            data: { name: PREF_FOCUS_TIMER_SIZE, value: size },
          })
        );
        dispatch(
          ac.OnlyToMain({
            type: at.WIDGETS_USER_EVENT,
            data: {
              widget_name: "focus_timer",
              widget_source: "context_menu",
              user_action: USER_ACTION_TYPES.CHANGE_SIZE,
              action_value: size,
              widget_size: size,
            },
          })
        );
      });
    },
    [dispatch]
  );

  // @nova-cleanup(remove-conditional): Drop the legacy callers and inline this for Nova
  const setTimerMinutes = useCallback(
    nextMinutes => {
      const clamped = Math.max(1, Math.min(99, nextMinutes));
      const totalSeconds = clamped * 60;
      if (totalSeconds === duration) {
        return;
      }
      batch(() => {
        dispatch(
          ac.AlsoToMain({
            type: at.WIDGETS_TIMER_SET_DURATION,
            data: { timerType, duration: totalSeconds },
          })
        );

        dispatch(
          ac.OnlyToMain({
            type: at.WIDGETS_TIMER_USER_EVENT,
            data: { userAction: USER_ACTION_TYPES.TIMER_SET },
          })
        );

        dispatch(
          ac.OnlyToMain({
            type: at.WIDGETS_USER_EVENT,
            data: {
              widget_name: "focus_timer",
              widget_source: "widget",
              user_action: USER_ACTION_TYPES.TIMER_SET,
              widget_size: widgetSize,
            },
          })
        );
      });
      handleTimerInteraction();
    },
    [dispatch, duration, timerType, widgetSize, handleTimerInteraction]
  );

  // @nova-cleanup(remove-conditional): Inline this once the Nova spinbutton is the only path
  const commitSpinbuttonDuration = useCallback(() => {
    const el = activeMinutesRef.current;
    if (!el) {
      return;
    }
    const text = el.innerText.replace(/\s+/g, "");
    const [mmRaw, ssRaw = "0"] = text.split(":");
    const mm = parseInt(mmRaw, 10);
    const ss = parseInt(ssRaw, 10);
    if (Number.isNaN(mm)) {
      // Invalid input; restore visual to current state by re-rendering
      el.innerText = formatTime(timeLeft);
      return;
    }
    const minutes = Math.min(99, Math.max(0, mm));
    const seconds = Math.min(59, Math.max(0, Number.isNaN(ss) ? 0 : ss));
    const totalSeconds = Math.max(1, minutes * 60 + seconds);
    if (totalSeconds === duration) {
      // No change; rewrite text to clamp display to valid range
      el.innerText = formatTime(totalSeconds);
      return;
    }
    batch(() => {
      dispatch(
        ac.AlsoToMain({
          type: at.WIDGETS_TIMER_SET_DURATION,
          data: { timerType, duration: totalSeconds },
        })
      );

      dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_TIMER_USER_EVENT,
          data: { userAction: USER_ACTION_TYPES.TIMER_SET },
        })
      );

      dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_USER_EVENT,
          data: {
            widget_name: "focus_timer",
            widget_source: "widget",
            user_action: USER_ACTION_TYPES.TIMER_SET,
            widget_size: widgetSize,
          },
        })
      );
    });
    handleTimerInteraction();
  }, [
    dispatch,
    duration,
    timerType,
    widgetSize,
    handleTimerInteraction,
    timeLeft,
  ]);

  // @nova-cleanup(remove-conditional): Remove if the Nova spinbutton is replaced
  const handleSpinBeforeInput = e => {
    const input = e.data;
    if (input === null || input === undefined) {
      return;
    }
    const current = e.target.innerText;
    const selection = window.getSelection();
    const start = selection
      ? Math.min(selection.anchorOffset, selection.focusOffset)
      : current.length;
    const end = selection
      ? Math.max(selection.anchorOffset, selection.focusOffset)
      : current.length;
    if (!isValidSpinbuttonInput(current, input, start, end)) {
      e.preventDefault();
    }
  };

  // @nova-cleanup(remove-conditional): Remove if the Nova spinbutton is replaced
  const handleSpinKeyDown = e => {
    let next = minutesValue;
    switch (e.key) {
      case "Enter":
        e.preventDefault();
        commitSpinbuttonDuration();
        e.target.blur();
        return;
      case "ArrowUp":
        next = minutesFloor + 1;
        break;
      case "ArrowDown":
        next = minutesFloor - 1;
        break;
      case "PageUp":
        next = minutesFloor + 5;
        break;
      case "PageDown":
        next = minutesFloor - 5;
        break;
      case "Home":
        next = 1;
        break;
      case "End":
        next = 99;
        break;
      default:
        return;
    }
    e.preventDefault();
    setTimerMinutes(next);
  };

  // @nova-cleanup(remove-conditional): Remove with the Nova radiogroup
  const handleRadiogroupKeyDown = e => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") {
      return;
    }
    e.preventDefault();
    toggleType(timerType === "focus" ? "break" : "focus");
  };

  const sizeSubmenuRef = useSizeSubmenu(handleChangeSize);

  // Keep the running-state body layout through the celebration so the ring
  // doesn't shift to a third position during the animation.
  const bodyShowsRunningLayout = hasProgressed || isCelebrating || isComplete;

  return timerData ? (
    <article
      // @nova-cleanup(remove-conditional): Remove novaEnabled check; always apply col-4 and size class after Nova ships
      className={`focus-timer widget ${novaEnabled ? `col-4 ${widgetSize}-widget` : ""} ${isSmallSize ? "is-small" : ""} ${isMaximized ? "is-maximized" : ""}${isComplete ? " is-complete" : ""}${isCelebrating ? " is-celebrating" : ""}${hasProgressed && !isComplete ? " is-active" : ""}`}
      ref={el => {
        timerRef.current = [el];
        widgetCelebrationRef.current = el;
      }}
    >
      {
        // @nova-cleanup(remove-conditional): drop the `novaEnabled &&` guard.
        novaEnabled && isCelebrating && celebrationFrame ? (
          <WidgetCelebration
            classNamePrefix="focus-timer-celebration"
            celebrationFrame={celebrationFrame}
            celebrationId={celebrationId}
            gradientStops={FOCUS_TIMER_CELEBRATION_GRADIENT_STOPS}
            headlineL10nId={
              timerType === "focus"
                ? "newtab-widget-timer-celebration-heading-focus"
                : "newtab-widget-timer-celebration-heading-break"
            }
            illustrationSrc={null}
            onComplete={handleCelebrationComplete}
            subheadL10nId={
              timerType === "focus"
                ? "newtab-widget-timer-celebration-message-focus"
                : "newtab-widget-timer-celebration-message-break"
            }
          />
        ) : null
      }
      <div className="newtab-widget-timer-notification-title-wrapper">
        <h2 data-l10n-id="newtab-widget-timer-notification-title"></h2>
        <div className="focus-timer-context-menu-wrapper">
          <moz-button
            className="focus-timer-context-menu-button"
            iconSrc="chrome://global/skin/icons/more.svg"
            menuId="focus-timer-context-menu"
            type="ghost"
          />
          <panel-list id="focus-timer-context-menu">
            <panel-item
              data-l10n-id={
                showSystemNotifications
                  ? "newtab-widget-timer-menu-notifications"
                  : "newtab-widget-timer-menu-notifications-on"
              }
              onClick={() => {
                handlePrefUpdate(
                  "widgets.focusTimer.showSystemNotifications",
                  !showSystemNotifications
                );
              }}
            />
            <panel-item
              // @nova-cleanup(remove-conditional): Drop the ternary and keep
              // newtab-widget-timer-menu-hide once Nova ships.
              data-l10n-id={
                novaEnabled
                  ? "newtab-widget-timer-menu-hide"
                  : "newtab-widget-menu-hide"
              }
              onClick={() => {
                batch(() => {
                  dispatch(
                    ac.OnlyToMain({
                      type: at.SET_PREF,
                      data: {
                        name: "widgets.focusTimer.enabled",
                        value: false,
                      },
                    })
                  );

                  const telemetryData = {
                    widget_name: "focus_timer",
                    widget_source: "context_menu",
                    enabled: false,
                    widget_size: widgetSize,
                  };

                  dispatch(
                    ac.OnlyToMain({
                      type: at.WIDGETS_ENABLED,
                      data: telemetryData,
                    })
                  );
                });
              }}
            />
            {
              // @nova-cleanup(remove-conditional): Remove the `novaEnabled &&` check; keep widgetsMayBeMaximized
              novaEnabled && widgetsMayBeMaximized && (
                <panel-item submenu="focus-timer-size-submenu">
                  <span data-l10n-id="newtab-widget-menu-change-size"></span>
                  <panel-list
                    ref={sizeSubmenuRef}
                    slot="submenu"
                    id="focus-timer-size-submenu"
                  >
                    {["small", "medium", "large"].map(size => (
                      <panel-item
                        key={size}
                        type="checkbox"
                        checked={widgetSize === size || undefined}
                        data-size={size}
                        data-l10n-id={`newtab-widget-size-${size}`}
                        {...(size === "small" ? { disabled: true } : {})}
                      />
                    ))}
                  </panel-list>
                </panel-item>
              )
            }
            <MoveSubmenu
              widgetId="focusTimer"
              widgetEnabledMap={widgetEnabledMap}
            />
            {
              // @nova-cleanup(remove-conditional): Remove the `novaEnabled &&` check; always render the divider.
              novaEnabled && <hr />
            }
            <panel-item
              data-l10n-id="newtab-widget-timer-menu-learn-more"
              onClick={handleLearnMore}
            />
          </panel-list>
        </div>
      </div>
      {
        // @nova-cleanup(remove-conditional): Remove this branch and the legacy block below; keep only the Nova body
        novaEnabled ? (
          <>
            {/*
             * Clicking anywhere inside the circle (including the ring) toggles
             * the timer. The moz-button inside still owns focus and the
             * accessible name; its click handler stops propagation so the
             * wrapper handler doesn't double-fire.
             */}
            <div
              role="progress"
              className={`progress-circle-wrapper${isComplete ? " is-complete" : ""}${hasProgressed ? " is-active" : ""}`}
              onClick={toggleTimer}
            >
              <div
                className={`progress-circle-background${timerType === "break" ? "-break" : ""}`}
              />
              <div
                className={`progress-circle ${timerType === "focus" ? "focus-visible" : "focus-hidden"}`}
                ref={timerType === "focus" ? arcRef : null}
              />
              <div
                className={`progress-circle ${timerType === "break" ? "break-visible" : "break-hidden"}`}
                ref={timerType === "break" ? arcRef : null}
              />
              <div
                className={`progress-circle-complete${isComplete ? " visible" : ""}`}
              />
              {progress > 0 && progress < 1 && (
                <div
                  className={`progress-circle-cap-rotator is-${timerType}`}
                  style={{ "--progress-angle": `${progress * 360}deg` }}
                  aria-hidden="true"
                >
                  <div className="progress-circle-cap" />
                </div>
              )}
              <moz-button
                className="focus-timer-play-button"
                type="icon ghost"
                iconsrc={`chrome://global/skin/media/${isRunning ? "pause" : "play"}-fill.svg`}
                data-l10n-id={
                  isRunning
                    ? "newtab-widget-timer-pause-aria"
                    : "newtab-widget-timer-start-aria"
                }
                data-l10n-args={JSON.stringify({ minutes: minutesValue })}
                onClick={e => {
                  e.stopPropagation();
                  toggleTimer();
                }}
              />
            </div>

            <div className="focus-timer-body">
              <div className="focus-timer-time-slot">
                {bodyShowsRunningLayout && (
                  <div className="focus-timer-time-display">
                    <span className="focus-timer-time-text">
                      {formatTime(timeLeft)}
                    </span>
                    <span
                      className="focus-timer-time-mode"
                      data-l10n-id={
                        timerType === "focus"
                          ? "newtab-widget-timer-running-focus"
                          : "newtab-widget-timer-running-break"
                      }
                    />
                  </div>
                )}
                {!bodyShowsRunningLayout && (
                  <div className="focus-timer-time-row">
                    <moz-button
                      className="focus-timer-minute-decrement"
                      type="icon ghost"
                      iconsrc="chrome://global/skin/icons/minus.svg"
                      data-l10n-id="newtab-widget-timer-decrease-min"
                      aria-controls="focus-timer-spinbutton"
                      tabindex="-1"
                      onClick={() => setTimerMinutes(minutesFloor - 1)}
                    />
                    <span
                      id="focus-timer-spinbutton"
                      className="focus-timer-spinbutton"
                      role="spinbutton"
                      aria-valuemin={1}
                      aria-valuemax={99}
                      aria-valuenow={minutesValue}
                      data-l10n-id="newtab-widget-timer-spinbutton-name"
                      data-l10n-args={JSON.stringify({
                        minutes: minutesValue,
                      })}
                      contentEditable="true"
                      suppressContentEditableWarning={true}
                      tabIndex={0}
                      onKeyDown={handleSpinKeyDown}
                      onBeforeInput={handleSpinBeforeInput}
                      onFocus={handleFocus}
                      onBlur={commitSpinbuttonDuration}
                      ref={activeMinutesRef}
                    >
                      {formatTime(timeLeft)}
                    </span>
                    <moz-button
                      className="focus-timer-minute-increment"
                      type="icon ghost"
                      iconsrc="chrome://global/skin/icons/plus.svg"
                      data-l10n-id="newtab-widget-timer-increase-min"
                      aria-controls="focus-timer-spinbutton"
                      tabindex="-1"
                      onClick={() => setTimerMinutes(minutesFloor + 1)}
                    />
                  </div>
                )}
              </div>

              <div className="focus-timer-bottom-slot">
                {bodyShowsRunningLayout && widgetSize === "large" && (
                  <moz-button
                    className="focus-timer-reset-button"
                    type="icon"
                    iconsrc="chrome://newtab/content/data/content/assets/arrow-clockwise-16.svg"
                    data-l10n-id="newtab-widget-timer-reset"
                    onClick={resetTimer}
                  />
                )}
                {!bodyShowsRunningLayout && (
                  <div
                    className="focus-timer-mode-group"
                    role="radiogroup"
                    data-l10n-id="newtab-widget-timer-mode-group"
                    onKeyDown={handleRadiogroupKeyDown}
                  >
                    <moz-button
                      role="radio"
                      aria-checked={timerType === "focus" ? "true" : "false"}
                      tabindex={timerType === "focus" ? "0" : "-1"}
                      type={timerType === "focus" ? "default" : "ghost"}
                      data-l10n-id="newtab-widget-timer-mode-focus"
                      onClick={() => toggleType("focus")}
                    />
                    <moz-button
                      role="radio"
                      aria-checked={timerType === "break" ? "true" : "false"}
                      tabindex={timerType === "break" ? "0" : "-1"}
                      type={timerType === "break" ? "default" : "ghost"}
                      data-l10n-id="newtab-widget-timer-mode-break"
                      onClick={() => toggleType("break")}
                    />
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="focus-timer-tabs">
              <div className="focus-timer-tabs-buttons">
                <moz-button
                  type={timerType === "focus" ? "default" : "ghost"}
                  data-l10n-id="newtab-widget-timer-mode-focus"
                  size="small"
                  onClick={() => toggleType("focus")}
                />
                <moz-button
                  type={timerType === "break" ? "default" : "ghost"}
                  data-l10n-id="newtab-widget-timer-mode-break"
                  size="small"
                  onClick={() => toggleType("break")}
                />
              </div>
            </div>
            <div
              role="progress"
              className={`progress-circle-wrapper ${
                !showSystemNotifications && !timerData[timerType].isRunning
                  ? "is-small"
                  : ""
              }`}
            >
              <div
                className={`progress-circle-background${timerType === "break" ? "-break" : ""}`}
              />

              <div
                className={`progress-circle ${timerType === "focus" ? "focus-visible" : "focus-hidden"}`}
                ref={timerType === "focus" ? arcRef : null}
              />

              <div
                className={`progress-circle ${timerType === "break" ? "break-visible" : "break-hidden"}`}
                ref={timerType === "break" ? arcRef : null}
              />

              <div
                className={`progress-circle-complete${progress === 1 ? " visible" : ""}`}
              />
              <div role="timer" className="progress-circle-label">
                <EditableTimerFields
                  minutesRef={activeMinutesRef}
                  secondsRef={activeSecondsRef}
                  onKeyDown={handleKeyDown}
                  onBeforeInput={handleBeforeInput}
                  onFocus={handleFocus}
                  timeLeft={timeLeft}
                  onBlur={() => setTimerDuration()}
                />
              </div>
            </div>

            <div className="set-timer-controls-wrapper">
              <div className={`focus-timer-controls timer-running`}>
                <moz-button
                  {...(!isRunning ? { type: "primary" } : {})}
                  iconsrc={`chrome://global/skin/media/${isRunning ? "pause" : "play"}-fill.svg`}
                  data-l10n-id={
                    isRunning
                      ? "newtab-widget-timer-label-pause"
                      : "newtab-widget-timer-label-play"
                  }
                  onClick={toggleTimer}
                />
                {isRunning && (
                  <moz-button
                    type="icon ghost"
                    iconsrc="chrome://newtab/content/data/content/assets/arrow-clockwise-16.svg"
                    data-l10n-id="newtab-widget-timer-reset"
                    onClick={resetTimer}
                  />
                )}
              </div>
            </div>
            {!showSystemNotifications && !timerData[timerType].isRunning && (
              <p
                className="timer-notification-status"
                data-l10n-id="newtab-widget-timer-notification-warning"
              ></p>
            )}
          </>
        )
      }
    </article>
  ) : null;
};
/* eslint-enable complexity, max-statements */

function EditableTimerFields({
  minutesRef,
  secondsRef,
  tabIndex = 0,
  ...props
}) {
  return (
    <>
      <span
        contentEditable="true"
        suppressContentEditableWarning={true}
        ref={minutesRef}
        className="timer-set-minutes"
        onKeyDown={props.onKeyDown}
        onBeforeInput={props.onBeforeInput}
        onFocus={props.onFocus}
        onBlur={props.onBlur}
        tabIndex={tabIndex}
      >
        {formatTime(props.timeLeft).split(":")[0]}
      </span>
      :
      <span
        contentEditable="true"
        suppressContentEditableWarning={true}
        ref={secondsRef}
        className="timer-set-seconds"
        onKeyDown={props.onKeyDown}
        onBeforeInput={props.onBeforeInput}
        onFocus={props.onFocus}
        onBlur={props.onBlur}
        tabIndex={tabIndex}
      >
        {formatTime(props.timeLeft).split(":")[1]}
      </span>
    </>
  );
}

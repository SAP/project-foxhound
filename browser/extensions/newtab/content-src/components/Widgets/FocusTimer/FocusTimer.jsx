/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { actionCreators as ac, actionTypes as at } from "common/Actions.mjs";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSelector, batch } from "react-redux";
import { useIntersectionObserver } from "../../../lib/utils";

const USER_ACTION_TYPES = {
  TIMER_SET: "timer_set",
  TIMER_PLAY: "timer_play",
  TIMER_PAUSE: "timer_pause",
  TIMER_RESET: "timer_reset",
  TIMER_END: "timer_end",
  TIMER_TOGGLE_FOCUS: "timer_toggle_focus",
  TIMER_TOGGLE_BREAK: "timer_toggle_break",
};

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

export const FocusTimer = ({
  dispatch,
  handleUserInteraction,
  isMaximized,
  widgetsMayBeMaximized,
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

  const widgetSize = isMaximized ? "medium" : "small";

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
        widget_size: widgetsMayBeMaximized ? widgetSize : "medium",
      };

      dispatch(
        ac.AlsoToMain({
          type: at.WIDGETS_IMPRESSION,
          data: telemetryData,
        })
      );
    });
  }, [dispatch, widgetsMayBeMaximized, widgetSize]);

  const timerRef = useIntersectionObserver(handleIntersection);

  const resetProgressCircle = useCallback(() => {
    if (arcRef?.current) {
      arcRef.current.style.clipPath = "polygon(50% 50%)";
      arcRef.current.style.webkitClipPath = "polygon(50% 50%)";
    }
    setProgress(0);
    handleTimerInteraction();
  }, [arcRef, handleTimerInteraction]);

  const prefs = useSelector(state => state.Prefs.values);
  const showSystemNotifications =
    prefs["widgets.focusTimer.showSystemNotifications"];

  useEffect(() => {
    // resets default values after timer ends
    let interval;
    let hasReachedZero = false;
    if (isRunning && duration > 0) {
      interval = setInterval(() => {
        const currentTime = Math.floor(Date.now() / 1000);
        const elapsed = currentTime - startTime;
        const remaining = calculateTimeRemaining(duration, startTime);

        // using setTimeLeft to trigger a re-render of the component to show live countdown each second
        setTimeLeft(remaining);
        setProgress((initialDuration - remaining) / initialDuration);

        if (elapsed >= duration && hasReachedZero) {
          clearInterval(interval);

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

            const telemetryData = {
              widget_name: "focus_timer",
              widget_source: "widget",
              user_action: USER_ACTION_TYPES.TIMER_END,
              widget_size: widgetsMayBeMaximized ? widgetSize : "medium",
            };

            dispatch(
              ac.OnlyToMain({
                type: at.WIDGETS_USER_EVENT,
                data: telemetryData,
              })
            );
          });

          // animate the progress circle to turn solid green
          setProgress(1);

          // More transitions after a delay to allow the animation above to complete
          setTimeout(() => {
            // progress circle goes back to default grey
            resetProgressCircle();

            // There's more to see!
            setTimeout(() => {
              // switch over to the other timer type
              // eslint-disable-next-line max-nested-callbacks
              batch(() => {
                dispatch(
                  ac.AlsoToMain({
                    type: at.WIDGETS_TIMER_SET_TYPE,
                    data: {
                      timerType: timerType === "focus" ? "break" : "focus",
                    },
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

                const telemetryData = {
                  widget_name: "focus_timer",
                  widget_source: "widget",
                  user_action: userAction,
                  widget_size: widgetsMayBeMaximized ? widgetSize : "medium",
                };

                dispatch(
                  ac.OnlyToMain({
                    type: at.WIDGETS_USER_EVENT,
                    data: telemetryData,
                  })
                );
              });
            }, 500);
          }, 1000);
        } else if (elapsed >= duration) {
          hasReachedZero = true;
        }
      }, 1000);
    }

    // Shows the correct live time in the UI whenever the timer state changes
    const newTime = isRunning
      ? calculateTimeRemaining(duration, startTime)
      : duration;

    setTimeLeft(newTime);

    // Set progress for paused timers (handles page load and timer type toggling)
    if (!isRunning && duration < initialDuration) {
      // Show previously elapsed time
      setProgress((initialDuration - duration) / initialDuration);
    } else if (!isRunning) {
      // Reset progress for fresh timers
      setProgress(0);
    }

    return () => clearInterval(interval);
  }, [
    isRunning,
    startTime,
    duration,
    initialDuration,
    dispatch,
    resetProgressCircle,
    timerType,
    initialTimerDuration,
    widgetSize,
    widgetsMayBeMaximized,
  ]);

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

    const minutesValue = minutesEl.innerText.trim() || "0";
    const secondsValue = secondsEl.innerText.trim() || "0";

    let minutes = parseInt(minutesValue || "0", 10);
    let seconds = parseInt(secondsValue || "0", 10);

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
          widget_size: widgetsMayBeMaximized ? widgetSize : "medium",
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
          widget_size: widgetsMayBeMaximized ? widgetSize : "medium",
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
          widget_size: widgetsMayBeMaximized ? widgetSize : "medium",
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
        widget_size: widgetsMayBeMaximized ? widgetSize : "medium",
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
        widget_size: widgetsMayBeMaximized ? widgetSize : "medium",
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
        widget_size: widgetsMayBeMaximized ? widgetSize : "medium",
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
          widget_size: widgetsMayBeMaximized ? widgetSize : "medium",
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

  return timerData ? (
    <article
      className={`focus-timer ${isMaximized ? "is-maximized" : ""}`}
      ref={el => {
        timerRef.current = [el];
      }}
    >
      <div className="newtab-widget-timer-notification-title-wrapper">
        <h3 data-l10n-id="newtab-widget-timer-notification-title"></h3>
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
              data-l10n-id="newtab-widget-timer-menu-hide"
              onClick={() => {
                batch(() => {
                  handlePrefUpdate("widgets.focusTimer.enabled", false);

                  const telemetryData = {
                    widget_name: "focus_timer",
                    widget_source: "context_menu",
                    enabled: false,
                    widget_size: widgetsMayBeMaximized ? widgetSize : "medium",
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
            <panel-item
              data-l10n-id="newtab-widget-timer-menu-learn-more"
              onClick={handleLearnMore}
            />
          </panel-list>
        </div>
      </div>
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
    </article>
  ) : null;
};

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

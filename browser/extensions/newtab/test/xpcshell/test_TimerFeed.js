/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";
const lazy = {};

ChromeUtils.defineESModuleGetters(this, {
  actionTypes: "resource://newtab/common/Actions.mjs",
  TimerFeed: "resource://newtab/lib/Widgets/TimerFeed.sys.mjs",
  sinon: "resource://testing-common/Sinon.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "gNewTabStrings", () => {
  return new Localization(["browser/newtab/newtab.ftl"], true);
});

const PREF_TIMER_ENABLED = "widgets.timer.enabled";
const PREF_SYSTEM_TIMER_ENABLED = "widgets.system.timer.enabled";
const PREF_TIMER_SHOW_NOTIFICATIONS =
  "widgets.focusTimer.showSystemNotifications";

add_task(async function test_construction() {
  let feed = new TimerFeed();

  feed.store = {
    getState() {
      return this.state;
    },
    dispatch: sinon.spy(),
    state: {
      Prefs: {
        values: {
          [PREF_SYSTEM_TIMER_ENABLED]: false,
        },
      },
    },
  };

  info("TimerFeed constructor should create initial values");

  Assert.ok(feed, "Could construct a TimerFeed");
  Assert.ok(!feed.loaded, "TimerFeed is not loaded");
  Assert.ok(!feed.enabled);
});

add_task(async function test_onAction_INIT() {
  let feed = new TimerFeed();

  feed.store = {
    getState() {
      return this.state;
    },
    dispatch: sinon.spy(),
    state: {
      Prefs: {
        values: {
          [PREF_TIMER_ENABLED]: true,
          [PREF_SYSTEM_TIMER_ENABLED]: true,
        },
      },
    },
  };

  info("TimerFeed.onAction INIT should set initialized");

  await feed.onAction({
    type: actionTypes.INIT,
  });

  Assert.ok(feed.initialized);
});

add_task(async function test_isEnabled() {
  let feed = new TimerFeed();

  feed.store = {
    getState() {
      return this.state;
    },
    dispatch: sinon.spy(),
    state: {
      Prefs: {
        values: {
          [PREF_TIMER_ENABLED]: true,
          [PREF_SYSTEM_TIMER_ENABLED]: true,
        },
      },
    },
  };

  info("TimerFeed should be enabled via system pref");
  Assert.ok(feed.enabled);
});

add_task(async function test_isEnabled() {
  let feed = new TimerFeed();

  feed.store = {
    getState() {
      return this.state;
    },
    dispatch: sinon.spy(),
    state: {
      Prefs: {
        values: {
          [PREF_TIMER_ENABLED]: true,
          trainhopConfig: {
            widgets: {
              enabled: true,
              listsEnabled: false,
              timerEnabled: true,
            },
          },
        },
      },
    },
  };

  info("TimerFeed should be enabled via trainhopConfig");
  Assert.ok(feed.enabled);
});

add_task(async function test_isEnabled() {
  let feed = new TimerFeed();

  feed.store = {
    getState() {
      return this.state;
    },
    dispatch: sinon.spy(),
    state: {
      Prefs: {
        values: {
          [PREF_TIMER_ENABLED]: true,
          widgetsConfig: {
            enabled: true,
            listsEnabled: false,
            timerEnabled: true,
          },
        },
      },
    },
  };

  info("TimerFeed should be enabled via trainhowidgetsConfigpConfig");
  Assert.ok(feed.enabled);
});

add_task(async function test_system_notification_on_focus_end() {
  const [titleMessage, bodyMessage] = await lazy.gNewTabStrings.formatMessages([
    { id: "newtab-widget-timer-notification-title" },
    { id: "newtab-widget-timer-notification-focus" },
  ]);

  const feed = new TimerFeed();

  feed.store = {
    getState() {
      return this.state;
    },
    dispatch: sinon.spy(),
    state: {
      Prefs: {
        values: {
          [PREF_TIMER_ENABLED]: true,
          [PREF_SYSTEM_TIMER_ENABLED]: true,
          [PREF_TIMER_SHOW_NOTIFICATIONS]: true,
        },
      },
      TimerWidget: {},
    },
  };

  feed.showSystemNotification = sinon.spy();

  await feed.onAction({
    type: actionTypes.WIDGETS_TIMER_END,
    data: { duration: 1500, timerType: "focus" },
  });

  Assert.ok(
    feed.showSystemNotification.calledOnce,
    "TimerFeed WIDGETS_TIMER_END event should show notification"
  );

  const [title, text] = feed.showSystemNotification.firstCall.args;
  Assert.equal(title, titleMessage?.value);
  Assert.equal(text, bodyMessage?.value);
});

add_task(async function test_system_notification_on_break_end() {
  const [titleMessage, bodyMessage] = await lazy.gNewTabStrings.formatMessages([
    { id: "newtab-widget-timer-notification-title" },
    { id: "newtab-widget-timer-notification-break" },
  ]);

  const feed = new TimerFeed();

  feed.store = {
    getState() {
      return this.state;
    },
    dispatch: sinon.spy(),
    state: {
      Prefs: {
        values: {
          [PREF_TIMER_ENABLED]: true,
          [PREF_SYSTEM_TIMER_ENABLED]: true,
          [PREF_TIMER_SHOW_NOTIFICATIONS]: true,
        },
      },
      TimerWidget: {},
    },
  };

  feed.showSystemNotification = sinon.spy();

  await feed.onAction({
    type: actionTypes.WIDGETS_TIMER_END,
    data: { duration: 1500, timerType: "break" },
  });

  Assert.ok(
    feed.showSystemNotification.calledOnce,
    "TimerFeed WIDGETS_TIMER_END event should show notification"
  );

  const [title, text] = feed.showSystemNotification.firstCall.args;
  Assert.equal(title, titleMessage?.value);
  Assert.equal(text, bodyMessage?.value);
});

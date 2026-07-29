/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

do_get_profile();

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  AIWindow:
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindow.sys.mjs",
  ChatStore:
    "moz-src:///browser/components/aiwindow/ui/modules/ChatStore.sys.mjs",
  sinon: "resource://testing-common/Sinon.sys.mjs",
});

add_task(function test_AIWindow_handlePlacesEvents_history_cleared_event() {
  const sandbox = lazy.sinon.createSandbox();
  try {
    sandbox.stub(lazy.ChatStore, "deleteAllUrlsFromMessages");

    // Test history-cleared PlacesEvent
    const events = [{ type: "history-cleared" }];
    lazy.AIWindow.handlePlacesEvents(events);

    Assert.ok(
      lazy.ChatStore.deleteAllUrlsFromMessages.called,
      "deleteAllUrlsFromMessages should have been called"
    );
  } finally {
    sandbox.restore();
  }
});

add_task(function test_AIWindow_handlePlacesEvents_page_removed_event() {
  const sandbox = lazy.sinon.createSandbox();
  try {
    sandbox.stub(lazy.ChatStore, "deleteUrlFromMessages");

    // Test single page-removed PlacesEvent
    const events = [
      {
        type: "page-removed",
        reason: PlacesVisitRemoved.REASON_DELETED,
        url: "https://site.com",
      },
    ];
    lazy.AIWindow.handlePlacesEvents(events);

    Assert.ok(
      lazy.ChatStore.deleteUrlFromMessages.calledWith("https://site.com"),
      "deleteUrlFromMessages should have been called with https://site.com"
    );
  } finally {
    sandbox.restore();
  }
});

add_task(
  function test_AIWindow_handlePlacesEvents_page_removed_multiple_events_and_unrelated() {
    const sandbox = lazy.sinon.createSandbox();
    try {
      sandbox.stub(lazy.ChatStore, "deleteUrlFromMessages");

      // Test multiple page-removed PlacesEvent
      const events = [
        {
          type: "page-removed",
          reason: PlacesVisitRemoved.REASON_DELETED,
          url: "https://site.com",
        },

        {
          type: "page-removed",
          reason: PlacesVisitRemoved.REASON_EXPIRED,
          url: "https://uninteresting.com",
        },

        {
          type: "page-removed",
          reason: PlacesVisitRemoved.REASON_DELETED,
          url: "https://othersite.com",
        },
      ];
      lazy.AIWindow.handlePlacesEvents(events);

      Assert.ok(
        lazy.ChatStore.deleteUrlFromMessages.calledWith("https://site.com"),
        "deleteUrlFromMessages should have been called with https://site.com"
      );

      Assert.ok(
        lazy.ChatStore.deleteUrlFromMessages.calledWith(
          "https://othersite.com"
        ),
        "deleteUrlFromMessages should have been called with https://othersite.com"
      );

      Assert.ok(
        !lazy.ChatStore.deleteUrlFromMessages.calledWith(
          "https://uninteresting.com"
        ),
        "deleteUrlFromMessages should not have been called with https://uninteresting.com"
      );
    } finally {
      sandbox.restore();
    }
  }
);

"use strict";

/* exported MockAlertsService */

function mockServicesChromeScript() {
  const MOCK_ALERTS_CID = Components.ID(
    "{48068bc2-40ab-4904-8afd-4cdfb3a385f3}"
  );
  const SYSTEM_CID = Components.ID("{a0ccaaf8-09da-44d8-b250-9ac3e93c8117}");
  const ALERTS_SERVICE_CONTRACT_ID = "@mozilla.org/alerts-service;1";

  const BinaryInputStream = Components.Constructor(
    "@mozilla.org/binaryinputstream;1",
    "nsIBinaryInputStream",
    "setInputStream"
  );

  const { setTimeout } = ChromeUtils.importESModule(
    "resource://gre/modules/Timer.sys.mjs"
  );
  const registrar = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);

  let activeNotifications = Object.create(null);

  let throwHistory = false;
  let history = [];

  const mockAlertsService = {
    showAlert(alert, listener) {
      activeNotifications[alert.name] = {
        listener,
        cookie: alert.cookie,
        title: alert.title,
        image: alert.image,
      };

      // fake async alert show event
      if (listener) {
        setTimeout(() => {
          if (this.mockFailure) {
            listener.observe(null, "alertfinished", alert.cookie);
            return;
          }

          listener.observe(null, "alertshow", alert.cookie);
          if (this.autoClick) {
            let subject;
            if (typeof this.autoClick === "string") {
              subject = alert.actions.filter(
                ac => ac.action === this.autoClick
              )[0];
            }
            listener.observe(subject, "alertclickcallback", alert.cookie);
          }
        }, 100);
      }
    },

    closeAlert(name) {
      let alertNotification = activeNotifications[name];
      if (alertNotification) {
        if (alertNotification.listener) {
          alertNotification.listener.observe(
            null,
            "alertfinished",
            alertNotification.cookie
          );
        }
        delete activeNotifications[name];
      }
    },

    getHistory() {
      if (throwHistory) {
        throw new Error("no history, sorry");
      }
      return history;
    },

    QueryInterface: ChromeUtils.generateQI(["nsIAlertsService"]),

    createInstance(iid) {
      return this.QueryInterface(iid);
    },

    // Some existing mochitests expect the mock to click the notification.
    // The state here is specific to each caller as register() uses
    // SpecialPowers.loadChromeScript that ensures evaluating on each call
    // without caching objects.
    autoClick: false,
  };

  registrar.registerFactory(
    MOCK_ALERTS_CID,
    "alerts service",
    ALERTS_SERVICE_CONTRACT_ID,
    mockAlertsService
  );

  function clickNotifications(doClose) {
    // Until we need to close a specific notification, just click them all.
    for (let [name, notification] of Object.entries(activeNotifications)) {
      let { listener, cookie } = notification;
      listener.observe(null, "alertclickcallback", cookie);
      if (doClose) {
        mockAlertsService.closeAlert(name);
      }
    }
  }

  function closeAllNotifications() {
    for (let alertName of Object.keys(activeNotifications)) {
      mockAlertsService.closeAlert(alertName);
    }
  }

  const { addMessageListener, sendAsyncMessage } = this;

  addMessageListener("mock-alert-service:unregister", () => {
    closeAllNotifications();
    activeNotifications = null;
    registrar.unregisterFactory(MOCK_ALERTS_CID, mockAlertsService);
    // Revive the system one
    registrar.registerFactory(SYSTEM_CID, "", ALERTS_SERVICE_CONTRACT_ID, null);
    sendAsyncMessage("mock-alert-service:unregistered");
  });

  addMessageListener(
    "mock-alert-service:click-notifications",
    clickNotifications
  );

  addMessageListener(
    "mock-alert-service:close-notifications",
    closeAllNotifications
  );

  addMessageListener("mock-alert-service:close-notification", alertName =>
    mockAlertsService.closeAlert(alertName)
  );

  addMessageListener("mock-alert-service:enable-autoclick", action => {
    mockAlertsService.autoClick = action || true;
  });

  addMessageListener("mock-alert-service:mock-failure", action => {
    mockAlertsService.mockFailure = action || true;
  });

  addMessageListener("mock-alert-service:get-notification-ids", () =>
    Object.keys(activeNotifications)
  );

  addMessageListener("mock-alert-service:get-icon-image", id => {
    let image = activeNotifications[id].image;
    if (!image) {
      return null;
    }

    const imgTools = Cc["@mozilla.org/image/tools;1"].getService(Ci.imgITools);
    let stream = imgTools.encodeImage(image, "image/png");
    let binaryStream = new BinaryInputStream(stream);

    let count = stream.available();
    let arrayBuffer = new ArrayBuffer(count);
    let actuallyRead = binaryStream.readArrayBuffer(count, arrayBuffer);
    if (actuallyRead != count) {
      throw Error("Did not read whole stream");
    }

    return arrayBuffer;
  });

  addMessageListener("mock-alert-service:set-history", value => {
    history = value;
  });

  addMessageListener("mock-alert-service:set-throw-history", value => {
    throwHistory = value;
  });

  sendAsyncMessage("mock-alert-service:registered");
}

const MockAlertsService = {
  async register() {
    if (this._chromeScript) {
      throw new Error("MockAlertsService already registered");
    }
    this._chromeScript = SpecialPowers.loadChromeScript(
      mockServicesChromeScript
    );
    // Make sure every registration will unregister automatically at test end
    SimpleTest.registerCleanupFunction(async () => {
      await MockAlertsService.unregister();
    });
    await this._chromeScript.promiseOneMessage("mock-alert-service:registered");
  },
  async unregister() {
    if (!this._chromeScript) {
      throw new Error("MockAlertsService not registered");
    }
    this._chromeScript.sendAsyncMessage("mock-alert-service:unregister");
    return this._chromeScript
      .promiseOneMessage("mock-alert-service:unregistered")
      .then(() => {
        this._chromeScript.destroy();
        this._chromeScript = null;
      });
  },
  async clickNotifications() {
    // Most implementations of the nsIAlertsService automatically close upon click.
    await this._chromeScript.sendQuery(
      "mock-alert-service:click-notifications",
      true
    );
  },
  async clickNotificationsWithoutClose() {
    // The implementation on macOS does not automatically close the notification.
    await this._chromeScript.sendQuery(
      "mock-alert-service:click-notifications",
      false
    );
  },
  async closeNotifications() {
    await this._chromeScript.sendQuery(
      "mock-alert-service:close-notifications"
    );
  },
  async closeNotification(alertName) {
    await this._chromeScript.sendQuery(
      "mock-alert-service:close-notification",
      alertName
    );
  },
  async enableAutoClick(action) {
    await this._chromeScript.sendQuery(
      "mock-alert-service:enable-autoclick",
      action
    );
  },
  async mockFailure(action) {
    await this._chromeScript.sendQuery(
      "mock-alert-service:mock-failure",
      action
    );
  },
  async getNotificationIds() {
    return await this._chromeScript.sendQuery(
      "mock-alert-service:get-notification-ids"
    );
  },
  async getIconImage(id) {
    return await this._chromeScript.sendQuery(
      "mock-alert-service:get-icon-image",
      id
    );
  },
  async setHistory(ids) {
    return await this._chromeScript.sendQuery(
      "mock-alert-service:set-history",
      ids
    );
  },
  async setThrowHistory(throws) {
    return await this._chromeScript.sendQuery(
      "mock-alert-service:set-throw-history",
      throws
    );
  },
};

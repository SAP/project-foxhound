/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/** @type {lazy} */
const lazy = {};

ChromeUtils.defineLazyGetter(lazy, "console", () => {
  return console.createInstance({
    prefix: "CaptchaDetectionParent",
    maxLogLevelPref: "captchadetection.loglevel",
  });
});

ChromeUtils.defineESModuleGetters(lazy, {
  CaptchaDetectionPingUtils:
    "resource://gre/modules/CaptchaDetectionPingUtils.sys.mjs",
  CaptchaResponseObserver:
    "resource://gre/modules/CaptchaResponseObserver.sys.mjs",
});

/**
 * Holds the state of each tab.
 * The state is an object with the following structure:
 * [key: tabId]: typeof ReturnType<TabState.#defaultValue()>
 */
class TabState {
  #state;

  constructor() {
    this.#state = new Map();
  }

  /**
   * @param {number} tabId - The tab id.
   * @returns {Map<any, any>} - The state of the tab.
   */
  get(tabId) {
    return this.#state.get(tabId);
  }

  static #defaultValue() {
    return new Map();
  }

  /**
   * @param {number} tabId - The tab id.
   * @param {(state: ReturnType<TabState['get']>) => void} updateFunction - The function to update the state.
   */
  update(tabId, updateFunction) {
    if (!this.#state.has(tabId)) {
      this.#state.set(tabId, TabState.#defaultValue());
    }
    updateFunction(this.#state.get(tabId));
  }

  /**
   * @param {number} tabId - The tab id.
   */
  clear(tabId) {
    this.#state.delete(tabId);
  }
}

const tabState = new TabState();

/**
 * This actor parent is responsible for recording the state of captchas
 * or communicating with parent browsing context.
 */
class CaptchaDetectionParent extends JSWindowActorParent {
  #responseObserver;

  actorCreated() {
    lazy.console.debug("actorCreated");
  }

  actorDestroy() {
    lazy.console.debug("actorDestroy()");

    if (this.#responseObserver) {
      this.#responseObserver.unregister();
    }
  }

  /** @type {CaptchaStateUpdateFunction} */
  #updateGRecaptchaV2State({ tabId, isPBM, state: { type, changes } }) {
    lazy.console.debug("updateGRecaptchaV2State", changes);

    if (changes === "ImagesShown") {
      tabState.update(tabId, state => {
        state.set(type + changes, true);
      });

      // We don't call maybeSubmitPing here because we might end up
      // submitting the ping without the "GotCheckmark" event.
      // maybeSubmitPing will be called when "GotCheckmark" event is
      // received, or when the daily maybeSubmitPing is called.
      const shownMetric = "googleRecaptchaV2Ps" + (isPBM ? "Pbm" : "");
      Glean.captchaDetection[shownMetric].add(1);
    } else if (changes === "GotCheckmark") {
      const autoCompleted = !tabState.get(tabId)?.has(type + "ImagesShown");
      lazy.console.debug(
        "GotCheckmark" +
          (autoCompleted ? " (auto-completed)" : " (manually-completed)")
      );
      const resultMetric =
        "googleRecaptchaV2" +
        (autoCompleted ? "Ac" : "Pc") +
        (isPBM ? "Pbm" : "");
      Glean.captchaDetection[resultMetric].add(1);
      this.#onMetricSet();
    }
  }

  /** @type {CaptchaStateUpdateFunction} */
  #recordCFTurnstileResult({ isPBM, state: { result } }) {
    lazy.console.debug("recordCFTurnstileResult", result);
    const resultMetric =
      "cloudflareTurnstile" +
      (result === "Succeeded" ? "Cc" : "Cf") +
      (isPBM ? "Pbm" : "");
    Glean.captchaDetection[resultMetric].add(1);
    this.#onMetricSet();
  }

  async #datadomeInit() {
    const parent = this.browsingContext.parentWindowContext;
    if (!parent) {
      lazy.console.error("Datadome captcha loaded in a top-level window?");
      return;
    }

    let actor = null;
    try {
      actor = parent.getActor("CaptchaDetectionCommunication");
      if (!actor) {
        lazy.console.error("CaptchaDetection actor not found in parent window");
        return;
      }
    } catch (e) {
      lazy.console.error("Error getting actor", e);
      return;
    }

    await actor.sendQuery("Datadome:AddMessageListener");
  }

  /** @type {CaptchaStateUpdateFunction} */
  #recordDatadomeEvent({ isPBM, state: { event, ...payload } }) {
    lazy.console.debug("recordDatadomeEvent", event, payload);
    const suffix = isPBM ? "Pbm" : "";
    if (event === "load") {
      if (payload.captchaShown) {
        Glean.captchaDetection["datadomePs" + suffix].add(1);
      } else if (payload.blocked) {
        Glean.captchaDetection["datadomeBl" + suffix].add(1);
      }
    } else if (event === "passed") {
      Glean.captchaDetection["datadomePc" + suffix].add(1);
    }

    this.#onMetricSet(0);
  }

  /** @type {CaptchaStateUpdateFunction} */
  #recordHCaptchaState({ isPBM, tabId, state: { type, changes } }) {
    lazy.console.debug("recordHCaptchaEvent", changes);

    if (changes === "shown") {
      // I don't think HCaptcha supports auto-completion, but we act
      // as if it does just in case.
      tabState.update(tabId, state => {
        state.set(type + changes, true);
      });

      // We don't call maybeSubmitPing here because we might end up
      // submitting the ping without the "passed" event.
      // maybeSubmitPing will be called when "passed" event is
      // received, or when the daily maybeSubmitPing is called.
      const shownMetric = "hcaptchaPs" + (isPBM ? "Pbm" : "");
      Glean.captchaDetection[shownMetric].add(1);
    } else if (changes === "passed") {
      const autoCompleted = !tabState.get(tabId)?.has(type + "shown");
      const resultMetric =
        "hcaptcha" + (autoCompleted ? "Ac" : "Pc") + (isPBM ? "Pbm" : "");
      Glean.captchaDetection[resultMetric].add(1);
      this.#onMetricSet();
    }
  }

  /** @type {CaptchaStateUpdateFunction} */
  #recordArkoseLabsEvent({
    isPBM,
    state: { event, solved, solutionsSubmitted },
  }) {
    if (event === "shown") {
      // We don't call maybeSubmitPing here because we might end up
      // submitting the ping without the "completed" event.
      // maybeSubmitPing will be called when "completed" event is
      // received, or when the daily maybeSubmitPing is called.
      const shownMetric = "arkoselabsPs" + (isPBM ? "Pbm" : "");
      Glean.captchaDetection[shownMetric].add(1);
    } else if (event === "completed") {
      const suffix = isPBM ? "Pbm" : "";
      const resultMetric = "arkoselabs" + (solved ? "Pc" : "Pf") + suffix;
      Glean.captchaDetection[resultMetric].add(1);

      const solutionsRequiredMetric =
        Glean.captchaDetection["arkoselabsSolutionsRequired" + suffix];
      solutionsRequiredMetric.accumulateSingleSample(solutionsSubmitted);

      this.#onMetricSet();
    }
  }

  async #arkoseLabsInit() {
    let solutionsSubmitted = 0;
    this.#responseObserver = new lazy.CaptchaResponseObserver(
      channel =>
        channel.loadInfo?.browsingContextID === this.browsingContext.id &&
        channel.URI &&
        (Cu.isInAutomation
          ? channel.URI.filePath.endsWith("arkose_labs_api.sjs")
          : channel.URI.spec === "https://client-api.arkoselabs.com/fc/ca/"),
      (_channel, statusCode, responseBody) => {
        if (statusCode !== Cr.NS_OK) {
          return;
        }

        let body;
        try {
          body = JSON.parse(responseBody);
          if (!body) {
            lazy.console.debug(
              "ResponseObserver:ResponseBody",
              "Failed to parse JSON"
            );
            return;
          }
        } catch (e) {
          lazy.console.debug(
            "ResponseObserver:ResponseBody",
            "Failed to parse JSON",
            e,
            responseBody
          );
          return;
        }

        // Check for the presence of the expected keys
        if (["response", "solved"].some(key => !body.hasOwnProperty(key))) {
          lazy.console.debug(
            "ResponseObserver:ResponseBody",
            "Missing keys",
            body
          );
          return;
        }

        solutionsSubmitted++;
        if (body.solved === null) {
          return;
        }

        this.#recordArkoseLabsEvent({
          isPBM: this.browsingContext.usePrivateBrowsing,
          state: {
            event: "completed",
            solved: body.solved,
            solutionsSubmitted,
          },
        });

        solutionsSubmitted = 0;
      }
    );
    this.#responseObserver.register();
  }

  #onTabClosed(tabId) {
    tabState.clear(tabId);

    if (this.#responseObserver) {
      this.#responseObserver.unregister();
    }
  }

  async #onMetricSet(parentDepth = 1) {
    lazy.CaptchaDetectionPingUtils.maybeSubmitPing();
    if (Cu.isInAutomation) {
      await this.#notifyTestMetricIsSet(parentDepth);
    }
  }

  /**
   * Notify the `parentDepth`'nth parent browsing context that the test metric is set.
   *
   * @param {number} parentDepth - The depth of the parent window context.
   * The reason we need this param is because Datadome calls this method
   * not from the captcha iframe, but its parent browsing context. So
   * it overrides the depth to 0.
   */
  async #notifyTestMetricIsSet(parentDepth = 1) {
    if (!Cu.isInAutomation) {
      throw new Error("This method should only be called in automation");
    }

    let parent = this.browsingContext.currentWindowContext;
    for (let i = 0; i < parentDepth; i++) {
      parent = parent.parentWindowContext;
      if (!parent) {
        lazy.console.error("No parent window context");
        return;
      }
    }

    let actor = null;
    try {
      actor = parent.getActor("CaptchaDetectionCommunication");
      if (!actor) {
        lazy.console.error("CaptchaDetection actor not found in parent window");
        return;
      }
    } catch (e) {
      lazy.console.error("Error getting actor", e);
      return;
    }

    await actor.sendQuery("Testing:MetricIsSet");
  }

  async receiveMessage(message) {
    lazy.console.debug("receiveMessage", message);

    switch (message.name) {
      case "CaptchaState:Update":
        switch (message.data.state.type) {
          case "g-recaptcha-v2":
            this.#updateGRecaptchaV2State(message.data);
            break;
          case "cf-turnstile":
            this.#recordCFTurnstileResult(message.data);
            break;
          case "datadome":
            this.#recordDatadomeEvent(message.data);
            break;
          case "hCaptcha":
            this.#recordHCaptchaState(message.data);
            break;
        }
        break;
      case "TabState:Closed":
        // message.name === "TabState:Closed"
        // => message.data = {
        //   tabId: number,
        // }
        this.#onTabClosed(message.data.tabId);
        break;
      case "CaptchaDetection:Init":
        // message.name === "CaptchaDetection:Init"
        // => message.data = {
        //   type: string,
        // }
        switch (message.data.type) {
          case "datadome":
            return this.#datadomeInit();
          case "arkoseLabs":
            return this.#arkoseLabsInit();
        }
        break;
      default:
        lazy.console.error("Unknown message", message);
    }
    return null;
  }
}

export {
  CaptchaDetectionParent,
  CaptchaDetectionParent as CaptchaDetectionCommunicationParent,
};

/**
 * @typedef lazy
 * @type {object}
 * @property {ConsoleInstance} console - console instance.
 * @property {typeof import("./CaptchaDetectionPingUtils.sys.mjs").CaptchaDetectionPingUtils} CaptchaDetectionPingUtils - CaptchaDetectionPingUtils module.
 * @property {typeof import("./CaptchaResponseObserver.sys.mjs").CaptchaResponseObserver} CaptchaResponseObserver - CaptchaResponseObserver module.
 */

/**
 * @typedef CaptchaStateUpdateMessageData
 * @property {number} tabId - The tab id.
 * @property {boolean} isPBM - Whether the tab is in PBM.
 * @property {object} state - The state of the captcha.
 * @property {string} state.type - The type of the captcha.
 *
 * @typedef {(message: CaptchaStateUpdateMessageData) => void} CaptchaStateUpdateFunction
 */

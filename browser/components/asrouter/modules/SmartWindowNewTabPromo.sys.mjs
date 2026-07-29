/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  ASRouter: "resource:///modules/asrouter/ASRouter.sys.mjs",
  RemoteL10n: "resource:///modules/asrouter/RemoteL10n.sys.mjs",
  SpecialMessageActions:
    "resource://messaging-system/lib/SpecialMessageActions.sys.mjs",
});

const PROMO_LISTENERS = new WeakMap();

export const SMARTWINDOW_PROMO_EVENTS = Object.freeze({
  PRIMARY: "SmartWindowPromo:PrimaryAction",
  CLOSE: "SmartWindowPromo:Close",
  IMPRESSION: "SmartWindowPromo:Impression",
});

export const SmartWindowNewTabPromo = {
  TEMPLATE: "smart_window_newtab_promo",

  async showPromo(browser, message, _trigger, _force) {
    if (!browser) {
      return;
    }
    const aiWindow = browser.contentDocument?.querySelector("ai-window");
    if (!aiWindow?.documentGlobal || !message?.id) {
      return;
    }

    const content = message?.content ?? {};
    const primaryButton = content.primary_button ?? {};
    const additionalButton = content.additional_button ?? {};

    const promoContent = {
      type: content.type,
      heading: await this.resolveText(content.heading),
      message: await this.resolveText(content.message),
      imageSrc: content.imageSrc,
      imageAlignment: content.imageAlignment,
      imageWidth: content.imageWidth,
      imageDisplay: content.imageDisplay,
      primaryActionText: await this.resolveText(primaryButton.label),
      secondaryActionText: await this.resolveText(additionalButton.label),
    };

    this.detachListeners(aiWindow);

    const ac = new AbortController();
    const { signal } = ac;

    aiWindow.addEventListener(
      SMARTWINDOW_PROMO_EVENTS.IMPRESSION,
      () => {
        const impressionMessage = lazy.ASRouter.getMessageById(message.id);
        lazy.ASRouter.addImpression(impressionMessage);
        this.recordTelemetry("IMPRESSION", message.id);
      },
      { signal, once: true }
    );

    aiWindow.addEventListener(
      SMARTWINDOW_PROMO_EVENTS.PRIMARY,
      () => {
        this.recordTelemetry("CLICK", message.id);
        if (primaryButton.action) {
          lazy.SpecialMessageActions.handleAction(
            primaryButton.action,
            browser
          );
        }
        this.hide(aiWindow);
      },
      { signal }
    );

    aiWindow.addEventListener(
      SMARTWINDOW_PROMO_EVENTS.CLOSE,
      () => {
        this.recordTelemetry("DISMISS", message.id);
        if (additionalButton.action) {
          lazy.SpecialMessageActions.handleAction(
            additionalButton.action,
            browser
          );
        }
        this.hide(aiWindow);
      },
      { signal }
    );

    PROMO_LISTENERS.set(aiWindow, ac);

    aiWindow.promoMessage = promoContent;
  },

  hide(aiWindow) {
    if (!aiWindow) {
      return;
    }
    this.detachListeners(aiWindow);
    aiWindow.promoMessage = null;
  },

  recordTelemetry(event, messageId) {
    lazy.ASRouter.dispatchCFRAction({
      type: "SMART_WINDOW_PROMO_TELEMETRY",
      data: {
        action: "smart_window_promo_user_event",
        message_id: messageId,
        event,
      },
    });
  },

  detachListeners(aiWindow) {
    const ac = PROMO_LISTENERS.get(aiWindow);
    if (ac) {
      ac.abort();
      PROMO_LISTENERS.delete(aiWindow);
    }
  },

  async resolveText(value) {
    if (value === null || value === undefined) {
      return "";
    }
    if (typeof value === "string") {
      return value;
    }
    return lazy.RemoteL10n.formatLocalizableText(value);
  },
};

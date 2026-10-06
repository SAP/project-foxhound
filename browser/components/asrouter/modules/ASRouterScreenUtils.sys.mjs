/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  ASRouter: "resource:///modules/asrouter/ASRouter.sys.mjs",
  ASRouterTargeting: "resource:///modules/asrouter/ASRouterTargeting.sys.mjs",
  SpecialMessageActions:
    "resource://messaging-system/lib/SpecialMessageActions.sys.mjs",
});

export const ASRouterScreenUtils = {
  /**
   * Filter the given screens in place with a predicate.
   *
   * @param {object[]} screens - The screens to filter.
   * @param {Function} callback - The predicate for filtering the screens.
   */
  async removeScreens(screens, callback) {
    for (let i = 0; i < screens?.length; i++) {
      if (await callback(screens[i], i)) {
        screens.splice(i--, 1);
      }
    }
  },
  /**
   * Given a JEXL expression, returns the evaluation of the expression or returns
   * true if the expression did not evaluate successfully. This is also used for
   * attribute targeting for the checklist feature.
   *
   * @param {string} targeting - The JEXL expression that will be evaluated
   * @returns {boolean}
   */
  async evaluateScreenTargeting(targeting) {
    const result = await lazy.ASRouter.evaluateExpression({
      expression: targeting,
      context: lazy.ASRouterTargeting.Environment,
    });
    if (result?.evaluationStatus?.success) {
      return result.evaluationStatus.result;
    }

    return true;
  },
  /**
   * Returns the string identifier of an unhandled campaign action, if
   * applicable otherwise false.
   *
   * @returns {string|boolean}
   */
  async getUnhandledCampaignAction() {
    const UNHANDLED_CAMPAIGN_ACTION_TARGETING = "unhandledCampaignAction";
    let result = await lazy.ASRouter.evaluateExpression({
      expression: UNHANDLED_CAMPAIGN_ACTION_TARGETING,
      context: lazy.ASRouterTargeting.Environment,
    });
    return result?.evaluationStatus?.result || false;
  },
  /**
   * Filter out screens whose targeting do not match.
   *
   * Given an array of screens, each screen will have it's `targeting` property
   * evaluated, and removed if it's targeting evaluates to false
   *
   * @param {object[]} screens - An array of screens that will be looped
   * through to be evaluated for removal
   * @returns {object[]} - A new array containing the screens that were not removed
   */
  async evaluateTargetingAndRemoveScreens(screens) {
    const filteredScreens = [...screens];
    await this.removeScreens(filteredScreens, async screen => {
      if (screen.targeting === undefined) {
        // Don't remove the screen if we don't have a targeting property
        return false;
      }

      const result = await this.evaluateScreenTargeting(screen.targeting);
      // Flipping the value because a true evaluation means we
      // don't want to remove the screen, while false means we do
      return !result;
    });

    return filteredScreens;
  },

  async addScreenImpression(screen) {
    await lazy.ASRouter.addScreenImpression(screen);
  },

  /**
   * Whether the given screen has already recorded an impression.
   *
   * @param {string} screenId - The id of the screen to check.
   * @returns {boolean}
   */
  async hasSeenScreen(screenId) {
    return Boolean(lazy.ASRouter.state.screenImpressions?.[screenId]);
  },

  /**
   * Whether a special message action is allowed to fire automatically on screen
   * impression. A MULTI_ACTION is allowed only when every nested action is
   * itself an allowed action.
   *
   * @param {object} action - The special message action to validate.
   * @returns {boolean}
   */
  isAllowedImpressionAction(action) {
    const ALLOWED_IMPRESSION_ACTIONS = [
      "PIN_FIREFOX_TO_TASKBAR",
      "PIN_FIREFOX_TO_START_MENU",
    ];
    if (!action) {
      return false;
    }
    if (action.type === "MULTI_ACTION") {
      const actions = action.data?.actions;
      return (
        Array.isArray(actions) &&
        !!actions.length &&
        actions.every(nestedAction =>
          ALLOWED_IMPRESSION_ACTIONS.includes(nestedAction?.type)
        )
      );
    }
    return ALLOWED_IMPRESSION_ACTIONS.includes(action.type);
  },

  /**
   * Handle a special message action fired automatically when a screen is first
   * shown, rather than by a button click. Only allowed actions (see
   * `isAllowedImpressionAction`) may fire on impression. When the action sets
   * `once`, it is skipped if the screen has already been seen.
   *
   * @param {object} data
   * @param {object} data.action - The special message action to run.
   * @param {boolean} [data.action.once] - Only fire on the screen's first view.
   * @param {string} data.screen_id - The id of the screen firing the action.
   * @param {Browser} browser - The xul:browser rendering the page.
   * @returns {Promise<boolean>} Whether the action was dispatched. False when
   *   rejected by the allowlist or suppressed by `once`.
   */
  async handleImpressionAction(data, browser) {
    const { action, screen_id } = data;
    if (!this.isAllowedImpressionAction(action)) {
      return false;
    }
    if (action.once && (await this.hasSeenScreen(screen_id))) {
      return false;
    }
    lazy.SpecialMessageActions.handleAction(
      { type: action.type, data: action.data },
      browser
    );
    return true;
  },
};

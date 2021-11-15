/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @ts-check

/**
 * @typedef {{}} Props - This is an empty object.
 */

/**
 * @typedef {Object} State
 * @property {boolean} isOnboardingEnabled
 */

/**
 * @typedef {import("../@types/perf").PanelWindow} PanelWindow
 */

"use strict";

const { PureComponent } = require("devtools/client/shared/vendor/react");
const {
  b,
  button,
  div,
  p,
} = require("devtools/client/shared/vendor/react-dom-factories");

const Services = require("Services");
const { openDocLink } = require("devtools/client/shared/link");

const LEARN_MORE_URL =
  "https://developer.mozilla.org/docs/Mozilla/Performance/Profiling_with_the_Built-in_Profiler";
const ONBOARDING_PREF = "devtools.performance.new-panel-onboarding";

/**
 * This component provides a temporary onboarding message for users migrating
 * from the old DevTools performance panel.
 * @extends {React.PureComponent<Props>}
 */
class OnboardingMessage extends PureComponent {
  /**
   * @param {Props} props
   */
  constructor(props) {
    super(props);

    // The preference has no default value for new profiles.
    // If it is missing, default to true to show the message by default.
    const isOnboardingEnabled = Services.prefs.getBoolPref(
      ONBOARDING_PREF,
      true
    );

    /** @type {State} */
    this.state = { isOnboardingEnabled };
  }

  componentDidMount() {
    Services.prefs.addObserver(ONBOARDING_PREF, this.onPreferenceUpdated);
  }

  componentWillUnmount() {
    Services.prefs.removeObserver(ONBOARDING_PREF, this.onPreferenceUpdated);
  }

  handleCloseIconClick = () => {
    Services.prefs.setBoolPref(ONBOARDING_PREF, false);
  };

  handleLearnMoreClick = () => {
    openDocLink(LEARN_MORE_URL, {});
  };

  handleSettingsClick = () => {
    /** @type {any} */
    const anyWindow = window;
    /** @type {PanelWindow} - Coerce the window into the PanelWindow. */
    const { gToolbox } = anyWindow;
    gToolbox.selectTool("options");
  };

  /**
   * Update the state whenever the devtools.performance.new-panel-onboarding
   * preference is updated.
   */
  onPreferenceUpdated = () => {
    const value = Services.prefs.getBoolPref(ONBOARDING_PREF, true);
    this.setState({ isOnboardingEnabled: value });
  };

  render() {
    const { isOnboardingEnabled } = this.state;
    if (!isOnboardingEnabled) {
      return null;
    }

    const learnMoreLink = button(
      {
        className: "perf-external-link",
        onClick: this.handleLearnMoreClick,
      },
      "Learn more"
    );

    const settingsLink = button(
      {
        className: "perf-external-link",
        onClick: this.handleSettingsClick,
      },
      "Settings > Advanced"
    );

    const closeButton = button({
      "aria-label": "Close the onboarding message",
      className:
        "perf-onboarding-close-button perf-photon-button perf-photon-button-ghost",
      onClick: this.handleCloseIconClick,
    });

    return div(
      { className: "perf-onboarding" },
      div(
        { className: "perf-onboarding-message" },
        p(
          { className: "perf-onboarding-message-row" },
          b({}, "New"),
          ": Firefox Profiler is now integrated into Developer Tools. ",
          learnMoreLink,
          " about this powerful new tool."
        ),
        p(
          { className: "perf-onboarding-message-row" },
          "(For a limited time, you can access the original Performance panel via ",
          settingsLink,
          ")"
        )
      ),
      closeButton
    );
  }
}

module.exports = OnboardingMessage;

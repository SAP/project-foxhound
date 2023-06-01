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

const {
  PureComponent,
  createFactory,
} = require("resource://devtools/client/shared/vendor/react.js");
const {
  b,
  button,
  div,
  p,
} = require("resource://devtools/client/shared/vendor/react-dom-factories.js");
const Localized = createFactory(
  require("resource://devtools/client/shared/vendor/fluent-react.js").Localized
);

const { openDocLink } = require("resource://devtools/client/shared/link.js");

const LEARN_MORE_URL = "https://profiler.firefox.com/docs";
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

    /** @type {any} */
    const anyWindow = window;

    // If gToolbox is not defined on window, the component is rendered in
    // about:debugging, and no onboarding message should be displayed.
    if (!anyWindow.gToolbox) {
      return null;
    }

    const learnMoreLink = button({
      className: "perf-external-link",
      onClick: this.handleLearnMoreClick,
    });

    const closeButton = Localized(
      {
        id: "perftools-onboarding-close-button",
        attrs: { "aria-label": true },
      },
      button({
        className:
          "perf-onboarding-close-button perf-photon-button perf-photon-button-ghost",
        onClick: this.handleCloseIconClick,
      })
    );

    return div(
      { className: "perf-onboarding" },
      div(
        { className: "perf-onboarding-message" },
        Localized(
          {
            id: "perftools-onboarding-message",
            b: b(),
            a: learnMoreLink,
          },
          p({ className: "perf-onboarding-message-row" })
        )
      ),
      closeButton
    );
  }
}

module.exports = OnboardingMessage;

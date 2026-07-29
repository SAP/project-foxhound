/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {
  PureComponent,
} = require("resource://devtools/client/shared/vendor/react.mjs");
const dom = require("resource://devtools/client/shared/vendor/react-dom-factories.js");
const PropTypes = require("resource://devtools/client/shared/vendor/react-prop-types.mjs");

const {
  getFormatStr,
} = require("resource://devtools/client/inspector/animation/utils/l10n.js");

const OPTIONS = [0.01, 0.1, 0.25, 0.5, 1, 2, 5, 10];

class PlaybackRateSelector extends PureComponent {
  static get propTypes() {
    return {
      playBackRateMultiplier: PropTypes.number.isRequired,
      setAnimationsPlaybackRateMultiplier: PropTypes.func.isRequired,
    };
  }

  onChange(e) {
    const { setAnimationsPlaybackRateMultiplier } = this.props;

    if (!e.target.value) {
      return;
    }

    setAnimationsPlaybackRateMultiplier(Number(e.target.value));
  }

  render() {
    return dom.select(
      {
        className: "playback-rate-selector devtools-button",
        onChange: this.onChange.bind(this),
      },
      OPTIONS.map(option => {
        return dom.option(
          {
            value: option,
            selected: option === this.props.playBackRateMultiplier,
          },
          getFormatStr("player.playbackRateLabel", option)
        );
      })
    );
  }
}

module.exports = PlaybackRateSelector;

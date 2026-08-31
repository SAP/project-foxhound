/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {
  createElement,
  createFactory,
  Fragment,
  PureComponent,
} = require("resource://devtools/client/shared/vendor/react.mjs");
const dom = require("resource://devtools/client/shared/vendor/react-dom-factories.js");
const PropTypes = require("resource://devtools/client/shared/vendor/react-prop-types.mjs");

const CurrentTimeLabel = createFactory(
  require("resource://devtools/client/inspector/animation/components/CurrentTimeLabel.js")
);
const PauseResumeButton = createFactory(
  require("resource://devtools/client/inspector/animation/components/PauseResumeButton.js")
);
const PlaybackRateSelector = createFactory(
  require("resource://devtools/client/inspector/animation/components/PlaybackRateSelector.js")
);
const RewindButton = createFactory(
  require("resource://devtools/client/inspector/animation/components/RewindButton.js")
);

class AnimationToolbar extends PureComponent {
  static get propTypes() {
    return {
      addAnimationsCurrentTimeListener: PropTypes.func.isRequired,
      animations: PropTypes.arrayOf(PropTypes.object).isRequired,
      playBackRateMultiplier: PropTypes.number.isRequired,
      removeAnimationsCurrentTimeListener: PropTypes.func.isRequired,
      rewindAnimationsCurrentTime: PropTypes.func.isRequired,
      setAnimationsPlaybackRateMultiplier: PropTypes.func.isRequired,
      setAnimationsPlayState: PropTypes.func.isRequired,
      timeScale: PropTypes.object.isRequired,
    };
  }

  render() {
    const {
      addAnimationsCurrentTimeListener,
      animations,
      playBackRateMultiplier,
      removeAnimationsCurrentTimeListener,
      rewindAnimationsCurrentTime,
      setAnimationsPlaybackRateMultiplier,
      setAnimationsPlayState,
      timeScale,
    } = this.props;

    return dom.div(
      {
        className: "animation-toolbar devtools-toolbar",
      },
      PlaybackRateSelector({
        playBackRateMultiplier,
        setAnimationsPlaybackRateMultiplier,
      }),
      animations.length
        ? createElement(
            Fragment,
            null,
            RewindButton({
              rewindAnimationsCurrentTime,
            }),
            PauseResumeButton({
              animations,
              setAnimationsPlayState,
            }),
            CurrentTimeLabel({
              addAnimationsCurrentTimeListener,
              removeAnimationsCurrentTimeListener,
              timeScale,
            })
          )
        : null
    );
  }
}

module.exports = AnimationToolbar;

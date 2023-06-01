/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* globals browser */

let AVAILABLE_PIP_OVERRIDES;

{
  // See PictureInPictureControls.sys.mjs for these values.
  // eslint-disable-next-line no-unused-vars
  const TOGGLE_POLICIES = browser.pictureInPictureChild.getPolicies();

  AVAILABLE_PIP_OVERRIDES = {
    // The keys of this object are match patterns for URLs, as documented in
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns
    //
    // Example:
    //  const KEYBOARD_CONTROLS = browser.pictureInPictureChild.getKeyboardControls();
    //
    //
    // "https://*.youtube.com/*": {
    //   policy: TOGGLE_POLICIES.THREE_QUARTERS,
    //   keyboardControls: KEYBOARD_CONTROLS.PLAY_PAUSE | KEYBOARD_CONTROLS.VOLUME,
    // },
    // "https://*.twitch.tv/mikeconley_dot_ca/*": {
    //   policy: TOGGLE_POLICIES.TOP,
    //   keyboardControls: KEYBOARD_CONTROLS.NONE,
    // },

    tests: {
      // FOR TESTS ONLY!
      "https://mochitest.youtube.com/*browser/browser/extensions/pictureinpicture/tests/browser/test-mock-wrapper.html": {
        videoWrapperScriptPath: "video-wrappers/mock-wrapper.js",
      },
      "https://mochitest.youtube.com/*browser/browser/extensions/pictureinpicture/tests/browser/test-toggle-visibility.html": {
        videoWrapperScriptPath: "video-wrappers/mock-wrapper.js",
      },
    },

    abcnews: {
      "https://*.abcnews.go.com/*": {
        videoWrapperScriptPath: "video-wrappers/videojsWrapper.js",
      },
    },

    airmozilla: {
      "https://*.mozilla.hosted.panopto.com/*": {
        videoWrapperScriptPath: "video-wrappers/airmozilla.js",
      },
    },

    bbc: {
      "https://*.bbc.com/*": {
        videoWrapperScriptPath: "video-wrappers/bbc.js",
      },
      "https://*.bbc.co.uk/*": {
        videoWrapperScriptPath: "video-wrappers/bbc.js",
      },
    },

    brightcove: {
      "https://*.brightcove.com/*": {
        videoWrapperScriptPath: "video-wrappers/videojsWrapper.js",
      },
    },

    dailymotion: {
      "https://*.dailymotion.com/*": {
        videoWrapperScriptPath: "video-wrappers/dailymotion.js",
      },
    },

    disneyplus: {
      "https://*.disneyplus.com/*": {
        videoWrapperScriptPath: "video-wrappers/disneyplus.js",
      },
    },

    frontendMasters: {
      "https://*.frontendmasters.com/*": {
        videoWrapperScriptPath: "video-wrappers/videojsWrapper.js",
      },
    },

    funimation: {
      "https://*.funimation.com/*": {
        videoWrapperScriptPath: "video-wrappers/videojsWrapper.js",
      },
    },

    hbomax: {
      "https://play.hbomax.com/page/*": { policy: TOGGLE_POLICIES.HIDDEN },
      "https://play.hbomax.com/player/*": {
        videoWrapperScriptPath: "video-wrappers/hbomax.js",
      },
    },

    hotstar: {
      "https://*.hotstar.com/*": {
        videoWrapperScriptPath: "video-wrappers/hotstar.js",
      },
    },

    hulu: {
      "https://www.hulu.com/watch/*": {
        videoWrapperScriptPath: "video-wrappers/hulu.js",
      },
    },

    instagram: {
      "https://www.instagram.com/*": { policy: TOGGLE_POLICIES.ONE_QUARTER },
    },

    laracasts: {
      "https://*.laracasts.com/*": { policy: TOGGLE_POLICIES.ONE_QUARTER },
    },

    mxplayer: {
      "https://*.mxplayer.in/*": {
        videoWrapperScriptPath: "video-wrappers/videojsWrapper.js",
      },
    },

    nebula: {
      "https://*.nebula.app/*": {
        videoWrapperScriptPath: "video-wrappers/videojsWrapper.js",
      },
    },

    netflix: {
      "https://*.netflix.com/*": {
        videoWrapperScriptPath: "video-wrappers/netflix.js",
      },
      "https://*.netflix.com/browse*": { policy: TOGGLE_POLICIES.HIDDEN },
      "https://*.netflix.com/latest*": { policy: TOGGLE_POLICIES.HIDDEN },
      "https://*.netflix.com/Kids*": { policy: TOGGLE_POLICIES.HIDDEN },
      "https://*.netflix.com/title*": { policy: TOGGLE_POLICIES.HIDDEN },
      "https://*.netflix.com/notification*": { policy: TOGGLE_POLICIES.HIDDEN },
      "https://*.netflix.com/search*": { policy: TOGGLE_POLICIES.HIDDEN },
    },

    pbs: {
      "https://*.pbs.org/*": {
        videoWrapperScriptPath: "video-wrappers/videojsWrapper.js",
      },
      "https://*.pbskids.org/*": {
        videoWrapperScriptPath: "video-wrappers/videojsWrapper.js",
      },
    },

    piped: {
      "https://*.piped.kavin.rocks/*": {
        videoWrapperScriptPath: "video-wrappers/piped.js",
      },
      "https://*.piped.silkky.cloud/*": {
        videoWrapperScriptPath: "video-wrappers/piped.js",
      },
    },

    sonyliv: {
      "https://*.sonyliv.com/*": {
        videoWrapperScriptPath: "video-wrappers/videojsWrapper.js",
      },
    },

    tubi: {
      "https://*.tubitv.com/*": {
        videoWrapperScriptPath: "video-wrappers/tubi.js",
      },
    },

    twitch: {
      "https://*.twitch.tv/*": { policy: TOGGLE_POLICIES.ONE_QUARTER },
      "https://*.twitch.tech/*": { policy: TOGGLE_POLICIES.ONE_QUARTER },
      "https://*.twitch.a2z.com/*": { policy: TOGGLE_POLICIES.ONE_QUARTER },
    },

    udemy: {
      "https://*.udemy.com/*": { policy: TOGGLE_POLICIES.ONE_QUARTER },
    },

    voot: {
      "https://*.voot.com/*": {
        videoWrapperScriptPath: "video-wrappers/voot.js",
      },
    },

    wired: {
      "https://*.wired.com/*": {
        videoWrapperScriptPath: "video-wrappers/videojsWrapper.js",
      },
    },

    youtube: {
      /**
       * The threshold of 0.7 is so that users can click on the "Skip Ads"
       * button on the YouTube site player without accidentally triggering
       * PiP.
       */
      "https://*.youtube.com/*": {
        visibilityThreshold: 0.7,
        videoWrapperScriptPath: "video-wrappers/youtube.js",
      },
      "https://*.youtube-nocookie.com/*": {
        visibilityThreshold: 0.9,
        videoWrapperScriptPath: "video-wrappers/youtube.js",
      },
    },

    washingtonpost: {
      "https://*.washingtonpost.com/*": {
        videoWrapperScriptPath: "video-wrappers/washingtonpost.js",
      },
    },

    primeVideo: {
      "https://*.primevideo.com/*": {
        visibilityThreshold: 0.9,
        videoWrapperScriptPath: "video-wrappers/primeVideo.js",
      },
      "https://*.amazon.com/*": {
        visibilityThreshold: 0.9,
        videoWrapperScriptPath: "video-wrappers/primeVideo.js",
      },
    },
  };
}

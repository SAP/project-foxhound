/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { PictureInPicture } = ChromeUtils.importESModule(
  "resource://gre/modules/PictureInPicture.sys.mjs"
);
const { ShortcutUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/ShortcutUtils.sys.mjs"
);
const { DeferredTask } = ChromeUtils.importESModule(
  "resource://gre/modules/DeferredTask.sys.mjs"
);
const { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs"
);

const AUDIO_TOGGLE_ENABLED_PREF =
  "media.videocontrols.picture-in-picture.audio-toggle.enabled";
const KEYBOARD_CONTROLS_ENABLED_PREF =
  "media.videocontrols.picture-in-picture.keyboard-controls.enabled";
const CAPTIONS_ENABLED_PREF =
  "media.videocontrols.picture-in-picture.display-text-tracks.enabled";
const CAPTIONS_TOGGLE_ENABLED_PREF =
  "media.videocontrols.picture-in-picture.display-text-tracks.toggle.enabled";
const TEXT_TRACK_FONT_SIZE_PREF =
  "media.videocontrols.picture-in-picture.display-text-tracks.size";
const IMPROVED_CONTROLS_ENABLED_PREF =
  "media.videocontrols.picture-in-picture.improved-video-controls.enabled";

// Time to fade the Picture-in-Picture video controls after first opening.
const CONTROLS_FADE_TIMEOUT_MS = 3000;
const RESIZE_DEBOUNCE_RATE_MS = 500;

/**
Quadrants!
* 2 | 1
* 3 | 4
*/
const TOP_RIGHT_QUADRANT = 1;
const TOP_LEFT_QUADRANT = 2;
const BOTTOM_LEFT_QUADRANT = 3;
const BOTTOM_RIGHT_QUADRANT = 4;

/**
 * Public function to be called from PictureInPicture.jsm. This is the main
 * entrypoint for initializing the player window.
 *
 * @param {Number} id
 *   A unique numeric ID for the window, used for Telemetry Events.
 * @param {WindowGlobalParent} wgp
 *   The WindowGlobalParent that is hosting the originating video.
 * @param {ContentDOMReference} videoRef
 *    A reference to the video element that a Picture-in-Picture window
 *    is being created for
 */
function setupPlayer(id, wgp, videoRef) {
  Player.init(id, wgp, videoRef);
}

/**
 * Public function to be called from PictureInPicture.jsm. This update the
 * controls based on whether or not the video is playing.
 *
 * @param {Boolean} isPlaying
 *   True if the Picture-in-Picture video is playing.
 */
function setIsPlayingState(isPlaying) {
  Player.isPlaying = isPlaying;
}

/**
 * Public function to be called from PictureInPicture.jsm. This update the
 * controls based on whether or not the video is muted.
 *
 * @param {Boolean} isMuted
 *   True if the Picture-in-Picture video is muted.
 */
function setIsMutedState(isMuted) {
  Player.isMuted = isMuted;
}

function enableSubtitlesButton() {
  Player.enableSubtitlesButton();
}

function disableSubtitlesButton() {
  Player.disableSubtitlesButton();
}

function setScrubberPosition(position) {
  Player.setScrubberPosition(position);
}

function setTimestamp(timeString) {
  Player.setTimestamp(timeString);
}

/**
 * The Player object handles initializing the player, holds state, and handles
 * events for updating state.
 */
let Player = {
  WINDOW_EVENTS: [
    "click",
    "contextmenu",
    "dblclick",
    "keydown",
    "mouseup",
    "mousemove",
    "MozDOMFullscreen:Entered",
    "MozDOMFullscreen:Exited",
    "resize",
    "unload",
    "draggableregionleftmousedown",
  ],
  actor: null,
  /**
   * Used for resizing Telemetry to avoid recording an event for every resize
   * event. Instead, we wait until RESIZE_DEBOUNCE_RATE_MS has passed since the
   * last resize event before recording.
   */
  resizeDebouncer: null,
  /**
   * Used for Telemetry to identify the window.
   */
  id: -1,

  /**
   * When set to a non-null value, a timer is scheduled to hide the controls
   * after CONTROLS_FADE_TIMEOUT_MS milliseconds.
   */
  showingTimeout: null,

  /**
   * Used to determine old window location when mouseup-ed for corner
   * snapping drag vector calculation
   */
  oldMouseUpWindowX: window.screenX,
  oldMouseUpWindowY: window.screenY,

  /**
   * Used to determine if hovering the mouse cursor over the pip window or not.
   * Gets updated whenever a new hover state is detected.
   */
  isCurrentHover: false,

  /**
   * Initializes the player browser, and sets up the initial state.
   *
   * @param {Number} id
   *   A unique numeric ID for the window, used for Telemetry Events.
   * @param {WindowGlobalParent} wgp
   *   The WindowGlobalParent that is hosting the originating video.
   * @param {ContentDOMReference} videoRef
   *    A reference to the video element that a Picture-in-Picture window
   *    is being created for
   */
  init(id, wgp, videoRef) {
    this.id = id;

    // State for whether or not we are adjusting the time via the scrubber
    this.scrubbing = false;

    let holder = document.querySelector(".player-holder");
    let browser = document.getElementById("browser");
    browser.remove();

    browser.setAttribute("nodefaultsrc", "true");

    let closeButton = document.getElementById("close");
    let closeShortcut = document.getElementById("closeShortcut");
    document.l10n.setAttributes(closeButton, "pictureinpicture-close-btn", {
      shortcut: ShortcutUtils.prettifyShortcut(closeShortcut),
    });

    // Set the specific remoteType and browsingContextGroupID to use for the
    // initial about:blank load. The combination of these two properties will
    // ensure that the browser loads in the same process as our originating
    // browser.
    browser.setAttribute("remoteType", wgp.domProcess.remoteType);
    browser.setAttribute(
      "initialBrowsingContextGroupId",
      wgp.browsingContext.group.id
    );
    holder.appendChild(browser);

    this.actor = browser.browsingContext.currentWindowGlobal.getActor(
      "PictureInPicture"
    );
    this.actor.sendAsyncMessage("PictureInPicture:SetupPlayer", {
      videoRef,
    });

    PictureInPicture.weakPipToWin.set(this.actor, window);

    for (let eventType of this.WINDOW_EVENTS) {
      addEventListener(eventType, this);
    }

    this.controls.addEventListener("mouseleave", () => {
      this.onMouseLeave();
    });
    this.controls.addEventListener("mouseenter", () => {
      this.onMouseEnter();
    });

    this.scrubber.addEventListener("input", event => {
      this.handleScrubbing(event);
    });
    this.scrubber.addEventListener("change", event => {
      this.handleScrubbingDone(event);
    });

    for (let radio of document.querySelectorAll(
      'input[type=radio][name="cc-size"]'
    )) {
      radio.addEventListener("change", event => {
        this.onSubtitleChange(event.target.id);
      });
    }

    document
      .querySelector("#subtitles-toggle")
      .addEventListener("change", () => {
        this.onToggleChange();
      });

    // If the content process hosting the video crashes, let's
    // just close the window for now.
    browser.addEventListener("oop-browser-crashed", this);

    this.revealControls(false);

    if (Services.prefs.getBoolPref(AUDIO_TOGGLE_ENABLED_PREF, false)) {
      const audioButton = document.getElementById("audio");
      audioButton.hidden = false;
    }

    if (Services.prefs.getBoolPref(CAPTIONS_ENABLED_PREF, false)) {
      const closedCaptionButton = document.getElementById("closed-caption");
      closedCaptionButton.hidden = false;
    }

    if (Services.prefs.getBoolPref(IMPROVED_CONTROLS_ENABLED_PREF, false)) {
      const fullscreenButton = document.getElementById("fullscreen");
      fullscreenButton.hidden = false;

      const seekBackwardButton = document.getElementById("seekBackward");
      seekBackwardButton.hidden = false;

      const seekForwardButton = document.getElementById("seekForward");
      seekForwardButton.hidden = false;

      this.scrubber.hidden = false;
      this.timestamp.hidden = false;

      const controlsBottomGradient = document.getElementById(
        "controls-bottom-gradient"
      );
      controlsBottomGradient.hidden = false;
    }

    this.alignEndControlsButtonTooltips();

    this.resizeDebouncer = new DeferredTask(() => {
      this.alignEndControlsButtonTooltips();
      this.recordEvent("resize", {
        width: window.outerWidth.toString(),
        height: window.outerHeight.toString(),
      });
    }, RESIZE_DEBOUNCE_RATE_MS);

    this.computeAndSetMinimumSize(window.outerWidth, window.outerHeight);

    // alwaysontop windows are not focused by default, so we have to do it
    // ourselves. We use requestAnimationFrame since we have to wait until the
    // window is visible before it can focus.
    window.requestAnimationFrame(() => {
      window.focus();
    });

    let fontSize = Services.prefs.getCharPref(
      TEXT_TRACK_FONT_SIZE_PREF,
      "medium"
    );

    // fallback to medium if the pref value is not a valid option
    if (fontSize === "small" || fontSize === "large") {
      document.querySelector(`#${fontSize}`).checked = "true";
    } else {
      document.querySelector("#medium").checked = "true";
    }
  },

  uninit() {
    this.resizeDebouncer.disarm();
    PictureInPicture.unload(window, this.actor);
  },

  handleEvent(event) {
    switch (event.type) {
      case "click": {
        // Don't run onClick if middle or right click is pressed respectively
        if (event.button !== 1 && event.button !== 2) {
          this.onClick(event);
          this.controls.removeAttribute("keying");
        }
        break;
      }

      case "contextmenu": {
        event.preventDefault();
        break;
      }

      case "dblclick": {
        this.onDblClick(event);
        break;
      }

      case "keydown": {
        if (event.keyCode == KeyEvent.DOM_VK_TAB) {
          this.controls.setAttribute("keying", true);
          this.actor.sendAsyncMessage("PictureInPicture:ShowVideoControls", {
            isFullscreen: this.isFullscreen,
            isVideoControlsShowing: true,
            playerBottomControlsDOMRect: this.controlsBottom.getBoundingClientRect(),
            isScrubberShowing: !this.scrubber.hidden,
          });
        } else if (event.keyCode == KeyEvent.DOM_VK_ESCAPE) {
          event.preventDefault();
          if (this.isFullscreen) {
            // We handle the ESC key, in fullscreen modus as intent to leave only the fullscreen mode
            document.exitFullscreen();
          } else {
            // We handle the ESC key, as an intent to leave the picture-in-picture modus
            this.onClose();
          }
        } else if (
          Services.prefs.getBoolPref(KEYBOARD_CONTROLS_ENABLED_PREF, false) &&
          (event.keyCode != KeyEvent.DOM_VK_SPACE || !event.target.id)
        ) {
          // Pressing "space" fires a "keydown" event which can also trigger a control
          // button's "click" event. Handle the "keydown" event only when the event did
          // not originate from a control button and it is not a "space" keypress.
          this.onKeyDown(event);
        }

        break;
      }

      case "mouseup": {
        this.onMouseUp(event);
        break;
      }

      case "mousemove": {
        this.onMouseMove();
        break;
      }

      // Normally, the DOMFullscreenParent / DOMFullscreenChild actors
      // would take care of firing the `fullscreen-painted` notification,
      // however, those actors are only ever instantiated when a <browser>
      // is fullscreened, and not a <body> element in a parent-process
      // chrome privileged DOM window.
      //
      // Rather than trying to re-engineer JSWindowActors to be re-usable for
      // this edge-case, we do the work of firing fullscreen-painted when
      // transitioning in and out of fullscreen ourselves here.
      case "MozDOMFullscreen:Entered":
      // Intentional fall-through
      case "MozDOMFullscreen:Exited": {
        let { lastTransactionId } = window.windowUtils;
        window.addEventListener("MozAfterPaint", function onPainted(event) {
          if (event.transactionId > lastTransactionId) {
            window.removeEventListener("MozAfterPaint", onPainted);
            Services.obs.notifyObservers(window, "fullscreen-painted");
          }
        });

        // Sets the title for fullscreen button when PIP is in Enter Fullscreen mode and Exit Fullscreen mode
        const fullscreenButton = document.getElementById("fullscreen");
        let strId = this.isFullscreen
          ? `pictureinpicture-exit-fullscreen-btn`
          : `pictureinpicture-fullscreen-btn`;
        document.l10n.setAttributes(fullscreenButton, strId);

        if (this.isFullscreen) {
          window.focus();
          this.actor.sendAsyncMessage("PictureInPicture:EnterFullscreen", {
            isFullscreen: true,
            isVideoControlsShowing: null,
            playerBottomControlsDOMRect: null,
          });
        } else {
          this.actor.sendAsyncMessage("PictureInPicture:ExitFullscreen", {
            isFullscreen: this.isFullscreen,
            isVideoControlsShowing:
              !!this.controls.getAttribute("showing") ||
              !!this.controls.getAttribute("keying"),
            playerBottomControlsDOMRect: this.controlsBottom.getBoundingClientRect(),
          });
        }
        // The subtitles settings panel gets selected when entering/exiting fullscreen even though
        // user-select is set to none. I don't know why this happens or how to prevent so we just
        // remove the selection when fullscreen is entered/exited.
        let selection = window.getSelection();
        selection.removeAllRanges();
        break;
      }

      case "oop-browser-crashed": {
        this.closePipWindow({ reason: "browser-crash" });
        break;
      }

      case "resize": {
        this.onResize(event);
        break;
      }

      case "unload": {
        this.uninit();
        break;
      }

      case "draggableregionleftmousedown": {
        document.querySelector("#settings").classList.add("hide");
        break;
      }
    }
  },

  /**
   * This function handles when the scrubber is being scrubbed by the mouse
   * because if we get an input event from the keyboard, onKeyDown will set
   * this.preventNextInputEvent to true.
   * This function is called by input events on the scrubber
   * @param {Event} event The input event
   */
  handleScrubbing(event) {
    // When using the keyboard to scrub, we get both a keydown and an input
    // event. The input event is fired after the keydown and we have already
    // handle the keydown event in onKeyDown and we don't want to handle it twice
    if (this.preventNextInputEvent) {
      this.preventNextInputEvent = false;
      return;
    }
    if (!this.scrubbing) {
      this.wasPlaying = this.isPlaying;
      if (this.isPlaying) {
        this.actor.sendAsyncMessage("PictureInPicture:Pause");
      }
      this.scrubbing = true;
    }
    let scrubberPosition = this.getScrubberPositionFromEvent(event);
    this.setVideoTime(scrubberPosition);
  },

  /**
   * This function handles setting the scrubbing state to false and playing
   * the video if we paused it before scrubbing.
   * @param {Event} event The change event
   */
  handleScrubbingDone(event) {
    if (!this.scrubbing) {
      return;
    }
    let scrubberPosition = this.getScrubberPositionFromEvent(event);
    this.setVideoTime(scrubberPosition);
    if (this.wasPlaying) {
      this.actor.sendAsyncMessage("PictureInPicture:Play");
    }
    this.scrubbing = false;
  },

  getScrubberPositionFromEvent(event) {
    return event.target.value;
  },

  setVideoTime(scrubberPosition) {
    let wasPlaying = this.scrubbing ? this.wasPlaying : this.isPlaying;
    this.setScrubberPosition(scrubberPosition);
    this.actor.sendAsyncMessage("PictureInPicture:SetVideoTime", {
      scrubberPosition,
      wasPlaying,
    });
  },

  setScrubberPosition(value) {
    this.scrubber.value = value;
    this.scrubber.hidden = value === undefined;

    // Also hide the seek buttons when we hide the scrubber
    this.seekBackward.hidden = value === undefined;
    this.seekForward.hidden = value === undefined;
  },

  setTimestamp(timestamp) {
    this.timestamp.textContent = timestamp;
    this.timestamp.hidden = timestamp === undefined;
  },

  closePipWindow(closeData) {
    // Set the subtitles font size prefs
    Services.prefs.setBoolPref(
      CAPTIONS_TOGGLE_ENABLED_PREF,
      document.querySelector("#subtitles-toggle").checked
    );
    for (let radio of document.querySelectorAll(
      'input[type=radio][name="cc-size"]'
    )) {
      if (radio.checked) {
        Services.prefs.setCharPref(TEXT_TRACK_FONT_SIZE_PREF, radio.id);
        break;
      }
    }
    const { reason } = closeData;
    PictureInPicture.closeSinglePipWindow({ reason, actorRef: this.actor });
  },

  onDblClick(event) {
    if (event.target.id == "controls") {
      this.fullscreenModeToggle();
      event.preventDefault();
    }
  },

  onClick(event) {
    switch (event.target.id) {
      case "audio": {
        if (this.isMuted) {
          this.actor.sendAsyncMessage("PictureInPicture:Unmute");
        } else {
          this.actor.sendAsyncMessage("PictureInPicture:Mute");
        }
        break;
      }

      case "close": {
        this.onClose();
        break;
      }

      case "playpause": {
        if (!this.isPlaying) {
          this.actor.sendAsyncMessage("PictureInPicture:Play");
          this.revealControls(false);
        } else {
          this.actor.sendAsyncMessage("PictureInPicture:Pause");
          this.revealControls(true);
        }

        break;
      }

      case "seekBackward": {
        this.actor.sendAsyncMessage("PictureInPicture:SeekBackward");
        break;
      }

      case "seekForward": {
        this.actor.sendAsyncMessage("PictureInPicture:SeekForward");
        break;
      }

      case "unpip": {
        PictureInPicture.focusTabAndClosePip(window, this.actor);
        break;
      }

      case "closed-caption": {
        let settingsPanel = document.querySelector("#settings");
        let settingsPanelVisible = !settingsPanel.classList.contains("hide");
        if (settingsPanelVisible) {
          settingsPanel.classList.add("hide");
          this.controls.removeAttribute("donthide");
        } else {
          settingsPanel.classList.remove("hide");
          this.controls.setAttribute("donthide", true);
        }
        // Early return to prevent hiding the panel below
        return;
      }

      case "fullscreen": {
        this.fullscreenModeToggle();
        break;
      }
    }
    // If the click came from a element that is not inside the subtitles settings panel
    // then we want to hide the panel
    let settingsPanel = document.querySelector("#settings");
    if (!settingsPanel.contains(event.target)) {
      document.querySelector("#settings").classList.add("hide");
    }
  },

  onClose() {
    this.actor.sendAsyncMessage("PictureInPicture:Pause", {
      reason: "pip-closed",
    });
    this.closePipWindow({ reason: "close-button" });
  },

  fullscreenModeToggle() {
    if (this.isFullscreen) {
      document.exitFullscreen();
    } else {
      document.body.requestFullscreen();
    }
  },

  onKeyDown(event) {
    // We don't want to send a keydown event if the event target was one of the
    // font sizes in the settings panel
    if (
      event.target.parentElement?.parentElement?.classList?.contains(
        "font-size-selection"
      )
    ) {
      return;
    }

    let eventKeys = {
      altKey: event.altKey,
      shiftKey: event.shiftKey,
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
      keyCode: event.keyCode,
    };

    // If the up or down arrow is pressed while the scrubber is focused then we
    // want to hijack these keydown events to act as left or right arrow
    // respectively to correctly seek the video.
    if (
      event.target.id === "scrubber" &&
      event.keyCode === window.KeyEvent.DOM_VK_UP
    ) {
      eventKeys.keyCode = window.KeyEvent.DOM_VK_RIGHT;
    } else if (
      event.target.id === "scrubber" &&
      event.keyCode === window.KeyEvent.DOM_VK_DOWN
    ) {
      eventKeys.keyCode = window.KeyEvent.DOM_VK_LEFT;
    }

    // If the keydown event was one of the arrow keys and the scrubber was
    // focused then we will also get an input event that will overwrite the
    // keydown event if we dont' prevent the input event.
    if (
      event.target.id === "scrubber" &&
      [
        window.KeyEvent.DOM_VK_LEFT,
        window.KeyEvent.DOM_VK_RIGHT,
        window.KeyEvent.DOM_VK_UP,
        window.KeyEvent.DOM_VK_DOWN,
      ].includes(event.keyCode)
    ) {
      this.preventNextInputEvent = true;
    }

    this.actor.sendAsyncMessage("PictureInPicture:KeyDown", eventKeys);
  },

  onSubtitleChange(size) {
    Services.prefs.setCharPref(TEXT_TRACK_FONT_SIZE_PREF, size);

    this.actor.sendAsyncMessage("PictureInPicture:ChangeFontSizeTextTracks");
  },

  onToggleChange() {
    // The subtitles toggle has been click in the settings panel so we toggle
    // the overlay above the font sizes and send a message to toggle the
    // visibility of the subtitles and set the toggle pref
    document
      .querySelector(".font-size-selection")
      .classList.toggle("font-size-overlay");
    this.actor.sendAsyncMessage("PictureInPicture:ToggleTextTracks");

    this.captionsToggleEnabled = !this.captionsToggleEnabled;
    Services.prefs.setBoolPref(
      CAPTIONS_TOGGLE_ENABLED_PREF,
      this.captionsToggleEnabled
    );
  },

  /**
   * PiP Corner Snapping Helper Function
   * Determines the quadrant the PiP window is currently in.
   */
  determineCurrentQuadrant() {
    // Determine center coordinates of window.
    let windowCenterX = window.screenX + window.innerWidth / 2;
    let windowCenterY = window.screenY + window.innerHeight / 2;
    let quadrant = null;
    let halfWidth = window.screen.availLeft + window.screen.availWidth / 2;
    let halfHeight = window.screen.availTop + window.screen.availHeight / 2;

    let leftHalf = windowCenterX < halfWidth;
    let rightHalf = windowCenterX > halfWidth;
    let topHalf = windowCenterY < halfHeight;
    let bottomHalf = windowCenterY > halfHeight;

    if (leftHalf && topHalf) {
      quadrant = TOP_LEFT_QUADRANT;
    } else if (rightHalf && topHalf) {
      quadrant = TOP_RIGHT_QUADRANT;
    } else if (leftHalf && bottomHalf) {
      quadrant = BOTTOM_LEFT_QUADRANT;
    } else if (rightHalf && bottomHalf) {
      quadrant = BOTTOM_RIGHT_QUADRANT;
    }
    return quadrant;
  },

  /**
   * Helper function to actually move/snap the PiP window.
   * Moves the PiP window to the top right.
   */
  moveToTopRight() {
    window.moveTo(
      window.screen.availLeft + window.screen.availWidth - window.innerWidth,
      window.screen.availTop
    );
  },

  /**
   * Moves the PiP window to the top left.
   */
  moveToTopLeft() {
    window.moveTo(window.screen.availLeft, window.screen.availTop);
  },

  /**
   * Moves the PiP window to the bottom right.
   */
  moveToBottomRight() {
    window.moveTo(
      window.screen.availLeft + window.screen.availWidth - window.innerWidth,
      window.screen.availTop + window.screen.availHeight - window.innerHeight
    );
  },

  /**
   * Moves the PiP window to the bottom left.
   */
  moveToBottomLeft() {
    window.moveTo(
      window.screen.availLeft,
      window.screen.availTop + window.screen.availHeight - window.innerHeight
    );
  },

  /**
   * Uses the PiP window's change in position to determine which direction
   * the window has been moved in.
   */
  determineDirectionDragged() {
    // Determine change in window location.
    let deltaX = this.oldMouseUpWindowX - window.screenX;
    let deltaY = this.oldMouseUpWindowY - window.screenY;
    let dragDirection = "";

    if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < 0) {
      dragDirection = "draggedRight";
    } else if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 0) {
      dragDirection = "draggedLeft";
    } else if (Math.abs(deltaX) < Math.abs(deltaY) && deltaY < 0) {
      dragDirection = "draggedDown";
    } else if (Math.abs(deltaX) < Math.abs(deltaY) && deltaY > 0) {
      dragDirection = "draggedUp";
    }
    return dragDirection;
  },

  /**
   * Event handler for "mouseup" events on the PiP window.
   *
   * @param {Event} event
   *  Event context details
   */
  onMouseUp(event) {
    // Corner snapping changes start here.
    // Check if metakey pressed and macOS
    let quadrant = this.determineCurrentQuadrant();
    let dragAction = this.determineDirectionDragged();

    if (event.metaKey && AppConstants.platform == "macosx" && dragAction) {
      // Moving logic based on current quadrant and direction of drag.
      switch (quadrant) {
        case TOP_RIGHT_QUADRANT:
          switch (dragAction) {
            case "draggedRight":
              this.moveToTopRight();
              break;
            case "draggedLeft":
              this.moveToTopLeft();
              break;
            case "draggedDown":
              this.moveToBottomRight();
              break;
            case "draggedUp":
              this.moveToTopRight();
              break;
          }
          break;
        case TOP_LEFT_QUADRANT:
          switch (dragAction) {
            case "draggedRight":
              this.moveToTopRight();
              break;
            case "draggedLeft":
              this.moveToTopLeft();
              break;
            case "draggedDown":
              this.moveToBottomLeft();
              break;
            case "draggedUp":
              this.moveToTopLeft();
              break;
          }
          break;
        case BOTTOM_LEFT_QUADRANT:
          switch (dragAction) {
            case "draggedRight":
              this.moveToBottomRight();
              break;
            case "draggedLeft":
              this.moveToBottomLeft();
              break;
            case "draggedDown":
              this.moveToBottomLeft();
              break;
            case "draggedUp":
              this.moveToTopLeft();
              break;
          }
          break;
        case BOTTOM_RIGHT_QUADRANT:
          switch (dragAction) {
            case "draggedRight":
              this.moveToBottomRight();
              break;
            case "draggedLeft":
              this.moveToBottomLeft();
              break;
            case "draggedDown":
              this.moveToBottomRight();
              break;
            case "draggedUp":
              this.moveToTopRight();
              break;
          }
          break;
      } // Switch close.
    } // Metakey close.
    this.oldMouseUpWindowX = window.screenX;
    this.oldMouseUpWindowY = window.screenY;
  },

  /**
   * Event handler for mousemove the PiP Window
   */
  onMouseMove() {
    if (this.isFullscreen) {
      this.revealControls(false);
    }
  },

  onMouseEnter() {
    if (!this.isFullscreen) {
      this.isCurrentHover = true;
      this.actor.sendAsyncMessage("PictureInPicture:ShowVideoControls", {
        isFullscreen: this.isFullscreen,
        isVideoControlsShowing: true,
        playerBottomControlsDOMRect: this.controlsBottom.getBoundingClientRect(),
        isScrubberShowing: !this.scrubber.hidden,
      });
    }
  },

  onMouseLeave() {
    if (!this.isFullscreen && !this.controls.getAttribute("donthide")) {
      this.isCurrentHover = false;
      if (
        !this.controls.getAttribute("showing") &&
        !this.controls.getAttribute("keying")
      ) {
        this.actor.sendAsyncMessage("PictureInPicture:HideVideoControls", {
          isFullscreen: this.isFullscreen,
          isVideoControlsShowing: false,
          playerBottomControlsDOMRect: null,
        });
      }
    }
  },

  enableSubtitlesButton() {
    let closedCaptionButton = document.getElementById("closed-caption");
    closedCaptionButton.disabled = false;

    this.alignEndControlsButtonTooltips();
    this.captionsToggleEnabled = true;
    // If the CAPTIONS_TOGGLE_ENABLED_PREF pref is false then we will click
    // the UI toggle to change the toggle to unchecked. This will call
    // onToggleChange where this.captionsToggleEnabled will be updated
    if (!Services.prefs.getBoolPref(CAPTIONS_TOGGLE_ENABLED_PREF, true)) {
      document.querySelector("#subtitles-toggle").click();
    }
  },

  disableSubtitlesButton() {
    let closedCaptionButton = document.getElementById("closed-caption");
    closedCaptionButton.disabled = true;

    this.alignEndControlsButtonTooltips();
  },

  /**
   * Sets focus state inline end tooltip for rightmost playback controls
   */
  alignEndControlsButtonTooltips() {
    let audioBtn = document.getElementById("audio");
    let width = window.outerWidth;

    if (300 < width && width <= 400) {
      audioBtn.classList.replace("center-tooltip", "inline-end-tooltip");
    } else {
      audioBtn.classList.replace("inline-end-tooltip", "center-tooltip");
    }
  },

  /**
   * Event handler for resizing the PiP Window
   *
   * @param {Event} event
   *  Event context data object
   */
  onResize(event) {
    this.resizeDebouncer.disarm();
    this.resizeDebouncer.arm();
  },

  /**
   * Event handler for user issued commands
   *
   * @param {Event} event
   *  Event context data object
   */
  onCommand(event) {
    this.closePipWindow({ reason: "player-shortcut" });
  },

  get controls() {
    delete this.controls;
    return (this.controls = document.getElementById("controls"));
  },

  get scrubber() {
    delete this.scrubber;
    return (this.scrubber = document.getElementById("scrubber"));
  },

  get timestamp() {
    delete this.timestamp;
    return (this.timestamp = document.getElementById("timestamp"));
  },

  get controlsBottom() {
    delete this.controlsBottom;
    return (this.controlsBottom = document.getElementById("controls-bottom"));
  },

  get seekBackward() {
    delete this.seekBackward;
    return (this.seekBackward = document.getElementById("seekBackward"));
  },

  get seekForward() {
    delete this.seekForward;
    return (this.seekForward = document.getElementById("seekForward"));
  },

  _isPlaying: false,
  /**
   * GET isPlaying returns true if the video is currently playing.
   *
   * SET isPlaying to true if the video is playing, false otherwise. This will
   * update the internal state and displayed controls.
   *
   * @type {Boolean}
   */
  get isPlaying() {
    return this._isPlaying;
  },

  set isPlaying(isPlaying) {
    this._isPlaying = isPlaying;
    this.controls.classList.toggle("playing", isPlaying);
    const playButton = document.getElementById("playpause");
    let strId = isPlaying
      ? `pictureinpicture-pause-btn`
      : `pictureinpicture-play-btn`;
    document.l10n.setAttributes(playButton, strId);
  },

  _isMuted: false,
  /**
   * GET isMuted returns true if the video is currently muted.
   *
   * SET isMuted to true if the video is muted, false otherwise. This will
   * update the internal state and displayed controls.
   *
   * @type {Boolean}
   */
  get isMuted() {
    return this._isMuted;
  },

  set isMuted(isMuted) {
    this._isMuted = isMuted;
    this.controls.classList.toggle("muted", isMuted);
    const audioButton = document.getElementById("audio");
    let strId = isMuted
      ? `pictureinpicture-unmute-btn`
      : `pictureinpicture-mute-btn`;
    let shortcutId = isMuted ? "unMuteShortcut" : "muteShortcut";
    let shortcut = document.getElementById(shortcutId);
    document.l10n.setAttributes(audioButton, strId, {
      shortcut: ShortcutUtils.prettifyShortcut(shortcut),
    });
  },

  /**
   * GET isFullscreen returns true if the video is running in fullscreen mode
   *
   * @returns {boolean}
   */
  get isFullscreen() {
    return document.fullscreenElement == document.body;
  },

  /**
   * Used for recording telemetry in Picture-in-Picture.
   *
   * @param {string} type
   *   The type of PiP event being recorded.
   * @param {object} args
   *   The data to pass to telemetry when the event is recorded.
   */
  recordEvent(type, args) {
    Services.telemetry.recordEvent(
      "pictureinpicture",
      type,
      "player",
      this.id,
      args
    );
  },

  /**
   * Makes the player controls visible.
   *
   * @param {Boolean} revealIndefinitely
   *   If false, this will hide the controls again after
   *   CONTROLS_FADE_TIMEOUT_MS milliseconds has passed. If true, the controls
   *   will remain visible until revealControls is called again with
   *   revealIndefinitely set to false.
   */
  revealControls(revealIndefinitely) {
    clearTimeout(this.showingTimeout);
    this.showingTimeout = null;

    this.controls.setAttribute("showing", true);

    if (!this.isFullscreen) {
      // revealControls() is called everytime we hover over fullscreen pip window.
      // Only communicate with pipchild when not in fullscreen mode for performance reasons.
      this.actor.sendAsyncMessage("PictureInPicture:ShowVideoControls", {
        isFullscreen: false,
        isVideoControlsShowing: true,
        playerBottomControlsDOMRect: this.controlsBottom.getBoundingClientRect(),
        isScrubberShowing: !this.scrubber.hidden,
      });
    }

    if (!revealIndefinitely && !this.controls.getAttribute("donthide")) {
      this.showingTimeout = setTimeout(() => {
        this.controls.removeAttribute("showing");

        if (
          !this.isFullscreen &&
          !this.isCurrentHover &&
          !this.controls.getAttribute("keying")
        ) {
          this.actor.sendAsyncMessage("PictureInPicture:HideVideoControls", {
            isFullscreen: false,
            isVideoControlsShowing: false,
            playerBottomControlsDOMRect: null,
          });
        }
      }, CONTROLS_FADE_TIMEOUT_MS);
    }
  },

  /**
   * Given a width and height for a video, computes the minimum dimensions for
   * the player window, and then sets them on the root element.
   *
   * This is currently only used on Linux GTK, where the OS doesn't already
   * impose a minimum window size. For other platforms, this function is a
   * no-op.
   *
   * @param {Number} width
   *   The width of the video being played.
   * @param {Number} height
   *   The height of the video being played.
   */
  computeAndSetMinimumSize(width, height) {
    if (!AppConstants.MOZ_WIDGET_GTK) {
      return;
    }

    // Using inspection, these seem to be the right minimums for each dimension
    // so that the controls don't get too crowded.
    const MIN_WIDTH = 120;
    const MIN_HEIGHT = 80;

    let resultWidth = width;
    let resultHeight = height;
    let aspectRatio = width / height;

    // Take the smaller of the two dimensions, and set it to the minimum.
    // Then calculate the other dimension using the aspect ratio to get
    // both minimums.
    if (width < height) {
      resultWidth = MIN_WIDTH;
      resultHeight = Math.round(MIN_WIDTH / aspectRatio);
    } else {
      resultHeight = MIN_HEIGHT;
      resultWidth = Math.round(MIN_HEIGHT * aspectRatio);
    }

    document.documentElement.style.minWidth = resultWidth + "px";
    document.documentElement.style.minHeight = resultHeight + "px";
  },
};

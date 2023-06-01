/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { getFilename } from "chrome://browser/content/screenshots/fileHelpers.mjs";
import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  Downloads: "resource://gre/modules/Downloads.sys.mjs",
  FileUtils: "resource://gre/modules/FileUtils.sys.mjs",
  PrivateBrowsingUtils: "resource://gre/modules/PrivateBrowsingUtils.sys.mjs",
});

XPCOMUtils.defineLazyServiceGetters(lazy, {
  AlertsService: ["@mozilla.org/alerts-service;1", "nsIAlertsService"],
});

XPCOMUtils.defineLazyGetter(lazy, "screenshotsLocalization", () => {
  return new Localization(["browser/screenshots.ftl"], true);
});

const PanelPosition = "bottomright topright";
const PanelOffsetX = -33;
const PanelOffsetY = -8;
// The max dimension for a canvas is defined https://searchfox.org/mozilla-central/rev/f40d29a11f2eb4685256b59934e637012ea6fb78/gfx/cairo/cairo/src/cairo-image-surface.c#62.
// The max number of pixels for a canvas is 124925329 or 11177 x 11177.
// We have to limit screenshots to these dimensions otherwise it will cause an error.
const MAX_CAPTURE_DIMENSION = 32767;
const MAX_CAPTURE_AREA = 124925329;

export class ScreenshotsComponentParent extends JSWindowActorParent {
  async receiveMessage(message) {
    let browser = message.target.browsingContext.topFrameElement;
    switch (message.name) {
      case "Screenshots:CancelScreenshot":
        await ScreenshotsUtils.closePanel(browser);
        break;
      case "Screenshots:CopyScreenshot":
        await ScreenshotsUtils.closePanel(browser);
        let copyBox = message.data;
        ScreenshotsUtils.copyScreenshotFromRegion(copyBox, browser);
        break;
      case "Screenshots:DownloadScreenshot":
        await ScreenshotsUtils.closePanel(browser);
        let { title, downloadBox } = message.data;
        ScreenshotsUtils.downloadScreenshotFromRegion(
          title,
          downloadBox,
          browser
        );
        break;
      case "Screenshots:ShowPanel":
        ScreenshotsUtils.createOrDisplayButtons(browser);
        break;
      case "Screenshots:HidePanel":
        ScreenshotsUtils.closePanel(browser);
        break;
    }
  }

  didDestroy() {
    // When restoring a crashed tab the browser is null
    let browser = this.browsingContext.topFrameElement;
    if (browser) {
      ScreenshotsUtils.closePanel(browser);
    }
  }
}

export var ScreenshotsUtils = {
  initialized: false,
  initialize() {
    if (!this.initialized) {
      if (
        !Services.prefs.getBoolPref(
          "screenshots.browser.component.enabled",
          false
        )
      ) {
        return;
      }
      Services.obs.addObserver(this, "menuitem-screenshot");
      Services.obs.addObserver(this, "screenshots-take-screenshot");
      this.initialized = true;
      if (Cu.isInAutomation) {
        Services.obs.notifyObservers(null, "screenshots-component-initialized");
      }
    }
  },
  uninitialize() {
    if (this.initialized) {
      Services.obs.removeObserver(this, "menuitem-screenshot");
      Services.obs.removeObserver(this, "screenshots-take-screenshot");
      this.initialized = false;
    }
  },
  handleEvent(event) {
    if (event.type === "keydown" && event.key === "Escape") {
      this.closePanel(event.view.gBrowser.selectedBrowser, true);
    }
  },
  observe(subj, topic, data) {
    let { gBrowser } = subj;
    let browser = gBrowser.selectedBrowser;

    switch (topic) {
      case "menuitem-screenshot":
        let success = this.closeDialogBox(browser);
        if (!success || data === "retry") {
          // only toggle the buttons if no dialog box is found because
          // if dialog box is found then the buttons are hidden and we return early
          // else no dialog box is found and we need to toggle the buttons
          // or if retry because the dialog box was closed and we need to show the panel
          this.togglePanelAndOverlay(browser);
        }
        break;
      case "screenshots-take-screenshot":
        // need to close the preview because screenshot was taken
        this.closePanel(browser, true);

        // init UI as a tab dialog box
        let dialogBox = gBrowser.getTabDialogBox(browser);

        let { dialog } = dialogBox.open(
          `chrome://browser/content/screenshots/screenshots.html?browsingContextId=${browser.browsingContext.id}`,
          {
            features: "resizable=no",
            sizeTo: "available",
            allowDuplicateDialogs: false,
          }
        );
        this.doScreenshot(browser, dialog, data);
    }
    return null;
  },
  /**
   * Notify screenshots when screenshot command is used.
   * @param window The current window the screenshot command was used.
   * @param type The type of screenshot taken. Used for telemetry.
   */
  notify(window, type) {
    if (Services.prefs.getBoolPref("screenshots.browser.component.enabled")) {
      Services.obs.notifyObservers(
        window.event.currentTarget.ownerGlobal,
        "menuitem-screenshot"
      );
    } else {
      Services.obs.notifyObservers(null, "menuitem-screenshot-extension", type);
    }
  },
  /**
   * Creates and returns a Screenshots actor.
   * @param browser The current browser.
   * @returns JSWindowActor The screenshot actor.
   */
  getActor(browser) {
    let actor = browser.browsingContext.currentWindowGlobal.getActor(
      "ScreenshotsComponent"
    );
    return actor;
  },
  /**
   * Open the panel buttons and call child actor to open the overlay
   * @param browser The current browser
   */
  openPanel(browser) {
    let actor = this.getActor(browser);
    actor.sendQuery("Screenshots:ShowOverlay");
    this.createOrDisplayButtons(browser);
  },
  /**
   * Close the panel and call child actor to close the overlay
   * @param browser The current browser
   * @param {bool} closeOverlay Whether or not to
   * send a message to the child to close the overly.
   * Defaults to false. Will be false when called from didDestroy.
   */
  async closePanel(browser, closeOverlay = false) {
    let buttonsPanel = browser.ownerDocument.querySelector(
      "#screenshotsPagePanel"
    );
    if (buttonsPanel && buttonsPanel.state !== "closed") {
      buttonsPanel.hidePopup();
    }
    buttonsPanel?.ownerDocument.removeEventListener("keydown", this);
    if (closeOverlay) {
      let actor = this.getActor(browser);
      await actor.sendQuery("Screenshots:HideOverlay");
    }
  },
  /**
   * If the buttons panel exists and is open we will hide both the panel
   * and the overlay. If the overlay is showing, we will hide the overlay.
   * Otherwise create or display the buttons.
   * @param browser The current browser.
   */
  async togglePanelAndOverlay(browser) {
    let buttonsPanel = browser.ownerDocument.querySelector(
      "#screenshotsPagePanel"
    );
    let isOverlayShowing = await this.getActor(browser).sendQuery(
      "Screenshots:isOverlayShowing"
    );
    if (buttonsPanel && (isOverlayShowing || buttonsPanel.state !== "closed")) {
      buttonsPanel.hidePopup();
      let actor = this.getActor(browser);
      return actor.sendQuery("Screenshots:HideOverlay");
    }
    let actor = this.getActor(browser);
    actor.sendQuery("Screenshots:ShowOverlay");
    return this.createOrDisplayButtons(browser);
  },
  /**
   * Gets the screenshots dialog box
   * @param browser The selected browser
   * @returns Screenshots dialog box if it exists otherwise null
   */
  getDialog(browser) {
    let currTabDialogBox = browser.tabDialogBox;
    let browserContextId = browser.browsingContext.id;
    if (currTabDialogBox) {
      currTabDialogBox.getTabDialogManager();
      let manager = currTabDialogBox.getTabDialogManager();
      let dialogs = manager.hasDialogs && manager.dialogs;
      if (dialogs.length) {
        for (let dialog of dialogs) {
          if (
            dialog._openedURL.endsWith(
              `browsingContextId=${browserContextId}`
            ) &&
            dialog._openedURL.includes("screenshots.html")
          ) {
            return dialog;
          }
        }
      }
    }
    return null;
  },
  /**
   * Closes the dialog box it it exists
   * @param browser The selected browser
   */
  closeDialogBox(browser) {
    let dialog = this.getDialog(browser);
    if (dialog) {
      dialog.close();
      return true;
    }
    return false;
  },
  /**
   * If the buttons panel does not exist then we will replace the buttons
   * panel template with the buttons panel then open the buttons panel and
   * show the screenshots overaly.
   * @param browser The current browser.
   */
  createOrDisplayButtons(browser) {
    let doc = browser.ownerDocument;
    let buttonsPanel = doc.querySelector("#screenshotsPagePanel");
    if (!buttonsPanel) {
      let template = doc.querySelector("#screenshotsPagePanelTemplate");
      let clone = template.content.cloneNode(true);
      template.replaceWith(clone);
      buttonsPanel = doc.querySelector("#screenshotsPagePanel");
    }

    buttonsPanel.ownerDocument.addEventListener("keydown", this);

    let anchor = doc.querySelector("#navigator-toolbox");
    buttonsPanel.openPopup(anchor, PanelPosition, PanelOffsetX, PanelOffsetY);
  },
  /**
   * Gets the full page bounds from the screenshots child actor.
   * @param browser The current browser.
   * @returns { object }
   *    Contains the full page bounds from the screenshots child actor.
   */
  fetchFullPageBounds(browser) {
    let actor = this.getActor(browser);
    return actor.sendQuery("Screenshots:getFullPageBounds");
  },
  /**
   * Gets the visible bounds from the screenshots child actor.
   * @param browser The current browser.
   * @returns { object }
   *    Contains the visible bounds from the screenshots child actor.
   */
  fetchVisibleBounds(browser) {
    let actor = this.getActor(browser);
    return actor.sendQuery("Screenshots:getVisibleBounds");
  },
  showAlertMessage(title, message) {
    lazy.AlertsService.showAlertNotification(null, title, message);
  },
  /**
   * The max one dimesion for a canvas is 32767 and the max canvas area is
   * 124925329. If the width or height is greater than 32767 we will crop the
   * screenshot to the max width. If the area is still too large for the canvas
   * we will adjust the height so we can successfully capture the screenshot.
   * @param {Object} rect The dimensions of the screenshot. The rect will be
   * modified in place
   */
  cropScreenshotRectIfNeeded(rect) {
    let cropped = false;
    let width = rect.width * rect.devicePixelRatio;
    let height = rect.height * rect.devicePixelRatio;

    if (width > MAX_CAPTURE_DIMENSION) {
      width = MAX_CAPTURE_DIMENSION;
      cropped = true;
    }
    if (height > MAX_CAPTURE_DIMENSION) {
      height = MAX_CAPTURE_DIMENSION;
      cropped = true;
    }
    if (width * height > MAX_CAPTURE_AREA) {
      height = Math.floor(MAX_CAPTURE_AREA / width);
      cropped = true;
    }

    rect.width = Math.floor(width / rect.devicePixelRatio);
    rect.height = Math.floor(height / rect.devicePixelRatio);

    if (cropped) {
      let [
        errorTitle,
        errorMessage,
      ] = lazy.screenshotsLocalization.formatMessagesSync([
        { id: "screenshots-too-large-error-title" },
        { id: "screenshots-too-large-error-details" },
      ]);
      this.showAlertMessage(errorTitle.value, errorMessage.value);
    }
  },
  /**
   * Add screenshot-ui to the dialog box and then take the screenshot
   * @param browser The current browser.
   * @param dialog The dialog box to show the screenshot preview.
   * @param type The type of screenshot taken.
   */
  async doScreenshot(browser, dialog, type) {
    await dialog._dialogReady;
    let screenshotsUI = dialog._frame.contentDocument.createElement(
      "screenshots-ui"
    );
    dialog._frame.contentDocument.body.appendChild(screenshotsUI);

    let rect;
    if (type === "full-page") {
      rect = await this.fetchFullPageBounds(browser);
    } else {
      rect = await this.fetchVisibleBounds(browser);
    }
    return this.takeScreenshot(browser, dialog, rect);
  },
  /**
   * Take the screenshot and add the image to the dialog box
   * @param browser The current browser.
   * @param dialog The dialog box to show the screenshot preview.
   * @param rect DOMRect containing bounds of the screenshot.
   */
  async takeScreenshot(browser, dialog, rect) {
    this.cropScreenshotRectIfNeeded(rect);

    let { canvas, snapshot } = await this.createCanvas(rect, browser);

    let newImg = dialog._frame.contentDocument.createElement("img");
    let url = canvas.toDataURL();

    newImg.id = "placeholder-image";

    newImg.src = url;
    dialog._frame.contentDocument
      .getElementById("preview-image-div")
      .appendChild(newImg);

    if (Cu.isInAutomation) {
      Services.obs.notifyObservers(null, "screenshots-preview-ready");
    }

    snapshot.close();
  },
  /**
   * Creates a canvas and draws a snapshot of the screenshot on the canvas
   * @param box The bounds of screenshots
   * @param browser The current browser
   * @returns The canvas and snapshot in an object
   */
  async createCanvas(box, browser) {
    let rect = new DOMRect(box.x1, box.y1, box.width, box.height);
    let { devicePixelRatio } = box;

    let browsingContext = BrowsingContext.get(browser.browsingContext.id);

    let snapshot = await browsingContext.currentWindowGlobal.drawSnapshot(
      rect,
      devicePixelRatio,
      "rgb(255,255,255)"
    );

    let canvas = browser.ownerDocument.createElementNS(
      "http://www.w3.org/1999/xhtml",
      "html:canvas"
    );
    let context = canvas.getContext("2d");

    canvas.width = snapshot.width;
    canvas.height = snapshot.height;

    context.drawImage(snapshot, 0, 0);

    return { canvas, snapshot };
  },
  /**
   * Copy the screenshot
   * @param region The bounds of the screenshots
   * @param browser The current browser
   */
  async copyScreenshotFromRegion(region, browser) {
    let { canvas, snapshot } = await this.createCanvas(region, browser);

    let url = canvas.toDataURL();

    this.copyScreenshot(url, browser);

    snapshot.close();
  },
  /**
   * Copy the image to the clipboard
   * @param dataUrl The image data
   */
  copyScreenshot(dataUrl) {
    // Guard against missing image data.
    if (!dataUrl) {
      return;
    }

    const imageTools = Cc["@mozilla.org/image/tools;1"].getService(
      Ci.imgITools
    );

    const base64Data = dataUrl.replace("data:image/png;base64,", "");

    const image = atob(base64Data);
    const imgDecoded = imageTools.decodeImageFromBuffer(
      image,
      image.length,
      "image/png"
    );

    const transferable = Cc[
      "@mozilla.org/widget/transferable;1"
    ].createInstance(Ci.nsITransferable);
    transferable.init(null);
    transferable.addDataFlavor("image/png");
    transferable.setTransferData("image/png", imgDecoded);

    Services.clipboard.setData(
      transferable,
      null,
      Services.clipboard.kGlobalClipboard
    );
  },
  /**
   * Download the screenshot
   * @param title The title of the current page
   * @param box The bounds of the screenshot
   * @param browser The current browser
   */
  async downloadScreenshotFromRegion(title, box, browser) {
    let { canvas, snapshot } = await this.createCanvas(box, browser);

    let dataUrl = canvas.toDataURL();

    await this.downloadScreenshot(title, dataUrl, browser);

    snapshot.close();
  },
  /**
   * Download the screenshot
   * @param title The title of the current page or null and getFilename will get the title
   * @param dataUrl The image data
   * @param browser The current browser
   */
  async downloadScreenshot(title, dataUrl, browser) {
    // Guard against missing image data.
    if (!dataUrl) {
      return;
    }

    let filename = await getFilename(title, browser);

    const targetFile = new lazy.FileUtils.File(filename);

    // Create download and track its progress.
    try {
      const download = await lazy.Downloads.createDownload({
        source: dataUrl,
        target: targetFile,
      });

      let isPrivate = lazy.PrivateBrowsingUtils.isWindowPrivate(
        browser.ownerGlobal
      );
      const list = await lazy.Downloads.getList(
        isPrivate ? lazy.Downloads.PRIVATE : lazy.Downloads.PUBLIC
      );
      // add the download to the download list in the Downloads list in the Browser UI
      list.add(download);

      // Await successful completion of the save via the download manager
      await download.start();
    } catch (ex) {}
  },
};

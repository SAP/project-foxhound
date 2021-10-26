/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const {
  gBrowser,
  PrintUtils,
  Services,
  AppConstants,
} = window.docShell.chromeEventHandler.ownerGlobal;

ChromeUtils.defineModuleGetter(
  this,
  "DownloadPaths",
  "resource://gre/modules/DownloadPaths.jsm"
);
ChromeUtils.defineModuleGetter(
  this,
  "DeferredTask",
  "resource://gre/modules/DeferredTask.jsm"
);

const INPUT_DELAY_MS = 500;
const MM_PER_POINT = 25.4 / 72;
const INCHES_PER_POINT = 1 / 72;
const ourBrowser = window.docShell.chromeEventHandler;
const PSSVC = Cc["@mozilla.org/gfx/printsettings-service;1"].getService(
  Ci.nsIPrintSettingsService
);

var logger = (function() {
  const getMaxLogLevel = () =>
    Services.prefs.getBoolPref("print.debug", false) ? "all" : "warn";

  let { ConsoleAPI } = ChromeUtils.import("resource://gre/modules/Console.jsm");
  // Create a new instance of the ConsoleAPI so we can control the maxLogLevel with a pref.
  let _logger = new ConsoleAPI({
    prefix: "printUI",
    maxLogLevel: getMaxLogLevel(),
  });

  function onPrefChange() {
    if (_logger) {
      _logger.maxLogLevel = getMaxLogLevel();
    }
  }
  // Watch for pref changes and the maxLogLevel for the logger
  Services.prefs.addObserver("print.debug", onPrefChange);
  window.addEventListener("unload", () => {
    Services.prefs.removeObserver("print.debug", onPrefChange);
  });
  return _logger;
})();

function serializeSettings(settings, logPrefix) {
  let re = /^(k[A-Z]|resolution)/; // accessing settings.resolution throws an exception?
  let types = new Set(["string", "boolean", "number", "undefined"]);
  let nameValues = {};
  for (let key in settings) {
    try {
      if (!re.test(key) && types.has(typeof settings[key])) {
        nameValues[key] = settings[key];
      }
    } catch (e) {
      logger.warn("Exception accessing setting: ", key, e);
    }
  }
  return nameValues;
}

let printPending = false;
let deferredTasks = [];
function createDeferredTask(fn, timeout) {
  let task = new DeferredTask(fn, timeout);
  deferredTasks.push(task);
  return task;
}

function cancelDeferredTasks() {
  for (let task of deferredTasks) {
    task.disarm();
  }
  PrintEventHandler._updatePrintPreviewTask?.disarm();
  deferredTasks = [];
}

async function finalizeDeferredTasks() {
  await Promise.all(deferredTasks.map(task => task.finalize()));
  printPending = true;
  await PrintEventHandler._updatePrintPreviewTask.finalize();
}

document.addEventListener(
  "DOMContentLoaded",
  e => {
    window._initialized = PrintEventHandler.init();
    ourBrowser.setAttribute("flex", "0");
    ourBrowser.classList.add("printSettingsBrowser");
    ourBrowser.closest(".dialogBox")?.classList.add("printDialogBox");
  },
  { once: true }
);

window.addEventListener("dialogclosing", () => {
  PrintEventHandler.unload();
  cancelDeferredTasks();
});

window.addEventListener(
  "unload",
  e => {
    document.textContent = "";
  },
  { once: true }
);

var PrintEventHandler = {
  settings: null,
  defaultSettings: null,
  allPaperSizes: {},
  _nonFlaggedChangedSettings: {},
  _userChangedSettings: {},
  settingFlags: {
    margins: Ci.nsIPrintSettings.kInitSaveMargins,
    customMargins: Ci.nsIPrintSettings.kInitSaveMargins,
    orientation: Ci.nsIPrintSettings.kInitSaveOrientation,
    paperId:
      Ci.nsIPrintSettings.kInitSavePaperSize |
      Ci.nsIPrintSettings.kInitSaveUnwriteableMargins,
    printInColor: Ci.nsIPrintSettings.kInitSaveInColor,
    scaling: Ci.nsIPrintSettings.kInitSaveScaling,
    shrinkToFit: Ci.nsIPrintSettings.kInitSaveShrinkToFit,
    printDuplex: Ci.nsIPrintSettings.kInitSaveDuplex,
    printFootersHeaders:
      Ci.nsIPrintSettings.kInitSaveHeaderLeft |
      Ci.nsIPrintSettings.kInitSaveHeaderCenter |
      Ci.nsIPrintSettings.kInitSaveHeaderRight |
      Ci.nsIPrintSettings.kInitSaveFooterLeft |
      Ci.nsIPrintSettings.kInitSaveFooterCenter |
      Ci.nsIPrintSettings.kInitSaveFooterRight,
    printBackgrounds:
      Ci.nsIPrintSettings.kInitSaveBGColors |
      Ci.nsIPrintSettings.kInitSaveBGImages,
  },
  originalSourceContentTitle: null,
  originalSourceCurrentURI: null,
  previewBrowser: null,

  // These settings do not have an associated pref value or flag, but
  // changing them requires us to update the print preview.
  _nonFlaggedUpdatePreviewSettings: new Set(["pageRanges"]),

  async init() {
    Services.telemetry.scalarAdd("printing.preview_opened_tm", 1);

    // Do not keep a reference to source browser, it may mutate after printing
    // is initiated and the print preview clone must be a snapshot from the
    // time that the print was started.
    let sourceBrowsingContext = this.getSourceBrowsingContext();
    this.previewBrowser = PrintUtils.createPreviewBrowser(
      sourceBrowsingContext,
      ourBrowser
    );

    // Get the temporary browser that will previously have been created for the
    // platform code to generate the static clone printing doc into if this
    // print is for a window.print() call.  In that case we steal the browser's
    // docshell to get the static clone, then discard it.
    let args = window.arguments[0];
    this.printSelectionOnly = args.getProperty("printSelectionOnly");
    let existingBrowser = args.getProperty("previewBrowser");
    if (existingBrowser) {
      sourceBrowsingContext = existingBrowser.browsingContext;
      this.previewBrowser.swapDocShells(existingBrowser);
      existingBrowser.remove();
    }

    this.originalSourceContentTitle =
      sourceBrowsingContext.currentWindowContext.documentTitle;
    this.originalSourceCurrentURI =
      sourceBrowsingContext.currentWindowContext.documentURI.spec;

    this.printForm = document.getElementById("print");

    // Let the dialog appear before doing any potential main thread work.
    await ourBrowser._dialogReady;

    // First check the available destinations to ensure we get settings for an
    // accessible printer.
    let destinations,
      defaultSystemPrinter,
      fallbackPaperList,
      selectedPrinter,
      printersByName;
    try {
      ({
        destinations,
        defaultSystemPrinter,
        fallbackPaperList,
        selectedPrinter,
        printersByName,
      } = await this.getPrintDestinations());
    } catch (e) {
      this.reportPrintingError("PRINT_DESTINATIONS");
      throw e;
    }
    PrintSettingsViewProxy.availablePrinters = printersByName;
    PrintSettingsViewProxy.fallbackPaperList = fallbackPaperList;
    PrintSettingsViewProxy.defaultSystemPrinter = defaultSystemPrinter;

    logger.debug("availablePrinters: ", Object.keys(printersByName));
    logger.debug("defaultSystemPrinter: ", defaultSystemPrinter);

    document.addEventListener("print", async () => {
      let didPrint = await this.print();
      if (!didPrint) {
        // Re-enable elements of the form if the user cancels saving
        this.printForm.enable();
      }
    });
    document.addEventListener("update-print-settings", e =>
      this.onUserSettingsChange(e.detail)
    );
    document.addEventListener("cancel-print", () => this.cancelPrint());
    document.addEventListener("open-system-dialog", async () => {
      // This file in only used if pref print.always_print_silent is false, so
      // no need to check that here.

      // Hide the dialog box before opening system dialog
      // We cannot close the window yet because the browsing context for the
      // print preview browser is needed to print the page.
      let sourceBrowser = this.getSourceBrowsingContext().top.embedderElement;
      let dialogBoxManager = gBrowser
        .getTabDialogBox(sourceBrowser)
        .getManager();
      dialogBoxManager.hideDialog(sourceBrowser);

      // Use our settings to prepopulate the system dialog.
      // The system print dialog won't recognize our internal save-to-pdf
      // pseudo-printer.  We need to pass it a settings object from any
      // system recognized printer.
      let settings =
        this.settings.printerName == PrintUtils.SAVE_TO_PDF_PRINTER
          ? PrintUtils.getPrintSettings(this.viewSettings.defaultSystemPrinter)
          : this.settings.clone();
      settings.showPrintProgress = true;
      // We set the title so that if the user chooses save-to-PDF from the
      // system dialog the title will be used to generate the prepopulated
      // filename in the file picker.
      settings.title = this.previewBrowser.browsingContext.embedderElement.contentTitle;
      const PRINTPROMPTSVC = Cc[
        "@mozilla.org/embedcomp/printingprompt-service;1"
      ].getService(Ci.nsIPrintingPromptService);
      try {
        Services.telemetry.scalarAdd(
          "printing.dialog_opened_via_preview_tm",
          1
        );
        await this._showPrintDialog(PRINTPROMPTSVC, window, settings);
      } catch (e) {
        if (e.result == Cr.NS_ERROR_ABORT) {
          Services.telemetry.scalarAdd(
            "printing.dialog_via_preview_cancelled_tm",
            1
          );
          window.close();
          return; // user cancelled
        }
        throw e;
      }
      await this.print(settings);
    });

    let settingsToChange = await this.refreshSettings(selectedPrinter.value);
    await this.updateSettings(settingsToChange, true);

    // Kick off the initial print preview with the source browsing context.
    let initialPreviewDone = this._updatePrintPreview(sourceBrowsingContext);
    // We don't need the sourceBrowsingContext anymore, get rid of it.
    sourceBrowsingContext = undefined;

    // Use a DeferredTask for updating the preview. This will ensure that we
    // only have one update running at a time.
    this._updatePrintPreviewTask = new DeferredTask(async () => {
      await initialPreviewDone;
      await this._updatePrintPreview();
      document.dispatchEvent(new CustomEvent("preview-updated"));
    }, 0);

    document.dispatchEvent(
      new CustomEvent("available-destinations", {
        detail: destinations,
      })
    );

    document.dispatchEvent(
      new CustomEvent("print-settings", {
        detail: this.viewSettings,
      })
    );

    await document.l10n.translateElements([this.previewBrowser]);

    document.body.removeAttribute("loading");

    await new Promise(resolve => window.requestAnimationFrame(resolve));

    // Now that we're showing the form, select the destination select.
    window.focus();
    let fm = Services.focus;
    fm.setFocus(document.getElementById("printer-picker"), fm.FLAG_SHOWRING);

    await initialPreviewDone;
  },

  unload() {
    this.previewBrowser.frameLoader.exitPrintPreview();
  },

  async print(systemDialogSettings) {
    // Disable the form when a print is in progress
    this.printForm.disable();

    let settings = systemDialogSettings || this.settings;

    if (settings.printerName == PrintUtils.SAVE_TO_PDF_PRINTER) {
      try {
        settings.toFileName = await pickFileName(
          this.originalSourceContentTitle,
          this.originalSourceCurrentURI
        );
      } catch (e) {
        return false;
      }
    }

    await window._initialized;

    await finalizeDeferredTasks();

    // This seems like it should be handled automatically but it isn't.
    Services.prefs.setStringPref("print_printer", settings.printerName);

    try {
      // The print progress dialog is causing an uncaught exception in tests.
      // Only show it to users.
      this.settings.showPrintProgress = !Cu.isInAutomation;
      let bc = this.previewBrowser.browsingContext;
      await this._doPrint(bc, settings);
    } catch (e) {
      Cu.reportError(e);
    }

    window.close();
    return true;
  },

  cancelPrint() {
    Services.telemetry.scalarAdd("printing.preview_cancelled_tm", 1);
    window.close();
  },

  async refreshSettings(printerName) {
    let currentPrinter;
    try {
      currentPrinter = await PrintSettingsViewProxy.resolvePropertiesForPrinter(
        printerName
      );
    } catch (e) {
      this.reportPrintingError("PRINTER_PROPERTIES");
      throw e;
    }
    this.settings = currentPrinter.settings;
    this.defaultSettings = currentPrinter.defaultSettings;

    this.settings.printSelectionOnly = this.printSelectionOnly;

    logger.debug("currentPrinter name: ", printerName);
    logger.debug("settings:", serializeSettings(this.settings));

    // Some settings are only used by the UI
    // assigning new values should update the underlying settings
    this.viewSettings = new Proxy(this.settings, PrintSettingsViewProxy);
    return this.getSettingsToUpdate();
  },

  getSettingsToUpdate() {
    // Get the previously-changed settings we want to try to use on this printer
    let settingsToUpdate = Object.assign({}, this._userChangedSettings);

    // Ensure the color option is correct, if either of the supportsX flags are
    // false then the user cannot change the value through the UI.
    if (!this.viewSettings.supportsColor) {
      settingsToUpdate.printInColor = false;
    } else if (!this.viewSettings.supportsMonochrome) {
      settingsToUpdate.printInColor = true;
    }

    if (
      settingsToUpdate.printInColor != this._userChangedSettings.printInColor
    ) {
      delete this._userChangedSettings.printInColor;
    }

    // See if the paperId needs to change.
    let paperId = settingsToUpdate.paperId || this.viewSettings.paperId;

    logger.debug("Using paperId: ", paperId);
    logger.debug(
      "Available paper sizes: ",
      PrintSettingsViewProxy.availablePaperSizes
    );
    let matchedPaper =
      paperId && PrintSettingsViewProxy.availablePaperSizes[paperId];
    if (!matchedPaper) {
      let paperWidth, paperHeight, paperSizeUnit;
      if (settingsToUpdate.paperId) {
        // The user changed paperId in this instance and session,
        // We should have details on the paper size from the previous printer
        paperId = settingsToUpdate.paperId;
        let cachedPaperWrapper = this.allPaperSizes[paperId];
        // for the purposes of finding a best-size match, we'll use mm
        paperWidth = cachedPaperWrapper.paper.width * MM_PER_POINT;
        paperHeight = cachedPaperWrapper.paper.height * MM_PER_POINT;
        paperSizeUnit = PrintEventHandler.settings.kPaperSizeMillimeters;
      } else {
        paperId = this.viewSettings.paperId;
        paperWidth = this.viewSettings.paperWidth;
        paperHeight = this.viewSettings.paperHeight;
        paperSizeUnit = this.viewSettings.paperSizeUnit;
      }
      matchedPaper = PrintSettingsViewProxy.getBestPaperMatch(
        paperWidth,
        paperHeight,
        paperSizeUnit
      );
    }
    if (!matchedPaper) {
      // We didn't find a good match. Take the first paper size
      matchedPaper = Object.values(
        PrintSettingsViewProxy.availablePaperSizes
      )[0];
      delete this._userChangedSettings.paperId;
    }
    if (matchedPaper.id !== paperId) {
      // The exact paper id doesn't exist for this printer
      logger.log(
        `Requested paperId: "${paperId}" missing on this printer, using: ${matchedPaper.id} instead`
      );
      delete this._userChangedSettings.paperId;
    }
    // Always write paper details back to settings
    settingsToUpdate.paperId = matchedPaper.id;

    return settingsToUpdate;
  },

  async onUserSettingsChange(changedSettings = {}) {
    for (let [setting, value] of Object.entries(changedSettings)) {
      Services.telemetry.keyedScalarAdd(
        "printing.settings_changed",
        setting,
        1
      );
      // Update the list of user-changed settings, which we attempt to maintain
      // across printer changes.
      this._userChangedSettings[setting] = value;
    }
    if (changedSettings.printerName) {
      logger.debug(
        "onUserSettingsChange, changing to printerName:",
        changedSettings.printerName
      );
      // Treat a printerName change separately, because it involves a settings
      // object switch and we don't want to set the new name on the old settings.
      changedSettings = await this.refreshSettings(changedSettings.printerName);
    } else {
      changedSettings = this.getSettingsToUpdate();
    }

    let shouldPreviewUpdate = await this.updateSettings(
      changedSettings,
      !!changedSettings.printerName
    );

    if (shouldPreviewUpdate && !printPending) {
      // We do not need to arm the preview task if the user has already printed
      // and finalized any deferred tasks.
      this.updatePrintPreview();
    }
    document.dispatchEvent(
      new CustomEvent("print-settings", {
        detail: this.viewSettings,
      })
    );
  },

  async updateSettings(changedSettings = {}, printerChanged = false) {
    let updatePreviewWithoutFlag = false;
    let flags = 0;
    logger.debug("updateSettings ", changedSettings, printerChanged);

    if (printerChanged || changedSettings.paperId) {
      // The paper's margin properties are async,
      // so resolve those now before we update the settings
      try {
        let paperWrapper = await PrintSettingsViewProxy.fetchPaperMargins(
          changedSettings.paperId || this.viewSettings.paperId
        );

        // See if we also need to change the custom margin values

        let paperHeightInInches = paperWrapper.paper.height * INCHES_PER_POINT;
        let paperWidthInInches = paperWrapper.paper.width * INCHES_PER_POINT;
        let height =
          (changedSettings.orientation || this.viewSettings.orientation) == 0
            ? paperHeightInInches
            : paperWidthInInches;
        let width =
          (changedSettings.orientation || this.viewSettings.orientation) == 0
            ? paperWidthInInches
            : paperHeightInInches;

        if (
          parseFloat(this.viewSettings.customMargins.marginTop) +
            parseFloat(this.viewSettings.customMargins.marginBottom) >
            height -
              paperWrapper.unwriteableMarginTop -
              paperWrapper.unwriteableMarginBottom ||
          this.viewSettings.customMargins.marginTop < 0 ||
          this.viewSettings.customMargins.marginBottom < 0
        ) {
          let { marginTop, marginBottom } = this.viewSettings.defaultMargins;
          changedSettings.marginTop = changedSettings.customMarginTop = marginTop;
          changedSettings.marginBottom = changedSettings.customMarginBottom = marginBottom;
          delete this._userChangedSettings.customMargins;
        }

        if (
          parseFloat(this.viewSettings.customMargins.marginRight) +
            parseFloat(this.viewSettings.customMargins.marginLeft) >
            width -
              paperWrapper.unwriteableMarginRight -
              paperWrapper.unwriteableMarginLeft ||
          this.viewSettings.customMargins.marginLeft < 0 ||
          this.viewSettings.customMargins.marginRight < 0
        ) {
          let { marginLeft, marginRight } = this.viewSettings.defaultMargins;
          changedSettings.marginLeft = changedSettings.customMarginLeft = marginLeft;
          changedSettings.marginRight = changedSettings.customMarginRight = marginRight;
          delete this._userChangedSettings.customMargins;
        }
      } catch (e) {
        this.reportPrintingError("PAPER_MARGINS");
        throw e;
      }
    }

    for (let [setting, value] of Object.entries(changedSettings)) {
      // Always write paper changes back to settings as pref-derived values could be bad
      if (
        this.viewSettings[setting] != value ||
        (printerChanged && setting == "paperId")
      ) {
        this.viewSettings[setting] = value;

        if (
          setting in this.settingFlags &&
          setting in this._userChangedSettings
        ) {
          flags |= this.settingFlags[setting];
        }
        updatePreviewWithoutFlag |= this._nonFlaggedUpdatePreviewSettings.has(
          setting
        );
      }
    }

    let shouldPreviewUpdate =
      flags || printerChanged || updatePreviewWithoutFlag;
    logger.debug(
      "updateSettings, calculated flags:",
      flags,
      "shouldPreviewUpdate:",
      shouldPreviewUpdate
    );
    if (flags) {
      this.saveSettingsToPrefs(flags);
    }
    return shouldPreviewUpdate;
  },

  saveSettingsToPrefs(flags) {
    PSSVC.savePrintSettingsToPrefs(this.settings, true, flags);
  },

  /**
   * Queue a task to update the print preview. It will start immediately or when
   * the in progress update completes.
   */
  async updatePrintPreview() {
    // Make sure the rendering state is set so we don't visibly update the
    // sheet count with incomplete data.
    this._showRenderingIndicator();
    this._updatePrintPreviewTask.arm();
  },

  /**
   * Create a print preview for the provided source browsingContext, or refresh
   * the preview with new settings when omitted.
   *
   * @param sourceBrowsingContext {BrowsingContext} [optional]
   *        The source BrowsingContext (the one associated with a tab or
   *        subdocument) that should be previewed.
   *
   * @return {Promise} Resolves when the preview has been updated.
   */
  async _updatePrintPreview(sourceBrowsingContext) {
    let { previewBrowser, settings } = this;

    // We never want the progress dialog to show
    settings.showPrintProgress = false;

    this._showRenderingIndicator();

    let sourceWinId;
    if (sourceBrowsingContext) {
      sourceWinId = sourceBrowsingContext.currentWindowGlobal.outerWindowId;
    }

    const isFirstCall = !this.printInitiationTime;
    if (isFirstCall) {
      let params = new URLSearchParams(location.search);
      this.printInitiationTime = parseInt(
        params.get("printInitiationTime"),
        10
      );
      const elapsed = Date.now() - this.printInitiationTime;
      Services.telemetry
        .getHistogramById("PRINT_INIT_TO_PLATFORM_SENT_SETTINGS_MS")
        .add(elapsed);
    }

    let totalPageCount, sheetCount, hasSelection;
    try {
      // This resolves with a PrintPreviewSuccessInfo dictionary.
      ({
        totalPageCount,
        sheetCount,
        hasSelection,
      } = await previewBrowser.frameLoader.printPreview(settings, sourceWinId));
    } catch (e) {
      this.reportPrintingError("PRINT_PREVIEW");
      throw e;
    }

    // Update the settings print options on whether there is a selection.
    settings.isPrintSelectionRBEnabled = hasSelection;

    document.dispatchEvent(
      new CustomEvent("page-count", {
        detail: { sheetCount, totalPages: totalPageCount },
      })
    );

    this._hideRenderingIndicator();

    if (isFirstCall) {
      const elapsed = Date.now() - this.printInitiationTime;
      Services.telemetry
        .getHistogramById("PRINT_INIT_TO_PREVIEW_DOC_SHOWN_MS")
        .add(elapsed);
    }
  },

  _showRenderingIndicator() {
    let stack = this.previewBrowser.parentElement;
    stack.setAttribute("rendering", true);
    document.body.setAttribute("rendering", true);
  },

  _hideRenderingIndicator() {
    let stack = this.previewBrowser.parentElement;
    stack.removeAttribute("rendering");
    document.body.removeAttribute("rendering");
  },

  getSourceBrowsingContext() {
    let params = new URLSearchParams(location.search);
    let browsingContextId = params.get("browsingContextId");
    if (!browsingContextId) {
      return null;
    }
    return BrowsingContext.get(browsingContextId);
  },

  async getPrintDestinations() {
    const printerList = Cc["@mozilla.org/gfx/printerlist;1"].createInstance(
      Ci.nsIPrinterList
    );
    let printers;

    if (Cu.isInAutomation) {
      printers = await Promise.resolve(window._mockPrinters || []);
    } else {
      try {
        printers = await printerList.printers;
      } catch (e) {
        this.reportPrintingError("PRINTER_LIST");
        throw e;
      }
    }

    let fallbackPaperList;
    try {
      fallbackPaperList = await printerList.fallbackPaperList;
    } catch (e) {
      this.reportPrintingError("FALLBACK_PAPER_LIST");
      throw e;
    }

    let lastUsedPrinterName;
    try {
      lastUsedPrinterName = PSSVC.lastUsedPrinterName;
    } catch (e) {
      this.reportPrintingError("LAST_USED_PRINTER");
      throw e;
    }
    const defaultPrinterName = printerList.systemDefaultPrinterName;
    const printersByName = {};

    let lastUsedPrinter;
    let defaultSystemPrinter;

    let saveToPdfPrinter = {
      nameId: "printui-destination-pdf-label",
      value: PrintUtils.SAVE_TO_PDF_PRINTER,
    };
    printersByName[PrintUtils.SAVE_TO_PDF_PRINTER] = {
      supportsColor: true,
      supportsMonochrome: false,
      name: PrintUtils.SAVE_TO_PDF_PRINTER,
    };

    if (lastUsedPrinterName == PrintUtils.SAVE_TO_PDF_PRINTER) {
      lastUsedPrinter = saveToPdfPrinter;
    }

    let destinations = [
      saveToPdfPrinter,
      ...printers.map(printer => {
        printer.QueryInterface(Ci.nsIPrinter);
        const { name } = printer;
        printersByName[printer.name] = { printer };
        const destination = { name, value: name };

        if (name == lastUsedPrinterName) {
          lastUsedPrinter = destination;
        }
        if (name == defaultPrinterName) {
          defaultSystemPrinter = destination;
        }

        return destination;
      }),
    ];

    let selectedPrinter =
      lastUsedPrinter || defaultSystemPrinter || saveToPdfPrinter;

    return {
      destinations,
      fallbackPaperList,
      selectedPrinter,
      printersByName,
      defaultSystemPrinter,
    };
  },

  getMarginPresets(marginSize, paper) {
    switch (marginSize) {
      case "minimum":
        return {
          marginTop: paper.unwriteableMarginTop,
          marginLeft: paper.unwriteableMarginLeft,
          marginBottom: paper.unwriteableMarginBottom,
          marginRight: paper.unwriteableMarginRight,
        };
      case "none":
        return {
          marginTop: 0,
          marginLeft: 0,
          marginBottom: 0,
          marginRight: 0,
        };
      case "custom":
        return {
          marginTop:
            PrintSettingsViewProxy._lastCustomMarginValues.marginTop ??
            this.settings.marginTop,
          marginBottom:
            PrintSettingsViewProxy._lastCustomMarginValues.marginBottom ??
            this.settings.marginBottom,
          marginLeft:
            PrintSettingsViewProxy._lastCustomMarginValues.marginLeft ??
            this.settings.marginLeft,
          marginRight:
            PrintSettingsViewProxy._lastCustomMarginValues.marginRight ??
            this.settings.marginRight,
        };
      default: {
        let minimum = this.getMarginPresets("minimum", paper);
        return {
          marginTop: !isNaN(minimum.marginTop)
            ? Math.max(minimum.marginTop, this.defaultSettings.marginTop)
            : this.defaultSettings.marginTop,
          marginRight: !isNaN(minimum.marginRight)
            ? Math.max(minimum.marginRight, this.defaultSettings.marginRight)
            : this.defaultSettings.marginRight,
          marginBottom: !isNaN(minimum.marginBottom)
            ? Math.max(minimum.marginBottom, this.defaultSettings.marginBottom)
            : this.defaultSettings.marginBottom,
          marginLeft: !isNaN(minimum.marginLeft)
            ? Math.max(minimum.marginLeft, this.defaultSettings.marginLeft)
            : this.defaultSettings.marginLeft,
        };
      }
    }
  },

  reportPrintingError(aMessage) {
    Services.telemetry.keyedScalarAdd("printing.error", aMessage, 1);
  },

  /**
   * Prints the window. This method has been abstracted into a helper for
   * testing purposes.
   */
  _doPrint(aBrowsingContext, aSettings) {
    return aBrowsingContext.top.embedderElement.print(
      aBrowsingContext.currentWindowGlobal.outerWindowId,
      aSettings
    );
  },

  /**
   * Shows the system dialog. This method has been abstracted into a helper for
   * testing purposes. The showPrintDialog() call blocks until the dialog is
   * closed, so we mark it as async to allow us to reject from the test.
   */
  async _showPrintDialog(aPrintingPromptService, aWindow, aSettings) {
    return aPrintingPromptService.showPrintDialog(aWindow, aSettings);
  },
};

var PrintSettingsViewProxy = {
  get defaultHeadersAndFooterValues() {
    const defaultBranch = Services.prefs.getDefaultBranch("");
    let settingValues = {};
    for (let [name, pref] of Object.entries(this.headerFooterSettingsPrefs)) {
      settingValues[name] = defaultBranch.getStringPref(pref);
    }
    // We only need to retrieve these defaults once and they will not change
    Object.defineProperty(this, "defaultHeadersAndFooterValues", {
      value: settingValues,
    });
    return settingValues;
  },

  headerFooterSettingsPrefs: {
    footerStrCenter: "print.print_footercenter",
    footerStrLeft: "print.print_footerleft",
    footerStrRight: "print.print_footerright",
    headerStrCenter: "print.print_headercenter",
    headerStrLeft: "print.print_headerleft",
    headerStrRight: "print.print_headerright",
  },

  // Custom margins are not saved by a pref, so we need to keep track of them
  // in order to save the value.
  _lastCustomMarginValues: {
    marginTop: null,
    marginBottom: null,
    marginLeft: null,
    marginRight: null,
  },

  // This list was taken from nsDeviceContextSpecWin.cpp which records telemetry on print target type
  knownSaveToFilePrinters: new Set([
    "Microsoft Print to PDF",
    "Adobe PDF",
    "Bullzip PDF Printer",
    "CutePDF Writer",
    "doPDF",
    "Foxit Reader PDF Printer",
    "Nitro PDF Creator",
    "novaPDF",
    "PDF-XChange",
    "PDF24 PDF",
    "PDFCreator",
    "PrimoPDF",
    "Soda PDF",
    "Solid PDF Creator",
    "Universal Document Converter",
    "Microsoft XPS Document Writer",
  ]),

  getBestPaperMatch(paperWidth, paperHeight, paperSizeUnit) {
    let paperSizes = Object.values(this.availablePaperSizes);
    if (!(paperWidth && paperHeight)) {
      return null;
    }
    // first try to match on the paper dimensions using the current units
    let unitsPerPoint;
    let altUnitsPerPoint;
    if (paperSizeUnit == PrintEventHandler.settings.kPaperSizeMillimeters) {
      unitsPerPoint = MM_PER_POINT;
      altUnitsPerPoint = INCHES_PER_POINT;
    } else {
      unitsPerPoint = INCHES_PER_POINT;
      altUnitsPerPoint = MM_PER_POINT;
    }
    // equality to 1pt.
    const equal = (a, b) => Math.abs(a - b) < 1;
    const findMatch = (widthPts, heightPts) =>
      paperSizes.find(paperWrapper => {
        // the dimensions on the nsIPaper object are in points
        let result =
          equal(widthPts, paperWrapper.paper.width) &&
          equal(heightPts, paperWrapper.paper.height);
        return result;
      });
    // Look for a paper with matching dimensions, using the current printer's
    // paper size unit, then the alternate unit
    let matchedPaper =
      findMatch(paperWidth / unitsPerPoint, paperHeight / unitsPerPoint) ||
      findMatch(paperWidth / altUnitsPerPoint, paperHeight / altUnitsPerPoint);

    if (matchedPaper) {
      return matchedPaper;
    }
    return null;
  },

  async fetchPaperMargins(paperId) {
    // resolve any async and computed properties we need on the paper
    let paperWrapper = this.availablePaperSizes[paperId];
    if (!paperWrapper) {
      throw new Error("Can't fetchPaperMargins: " + paperId);
    }
    if (paperWrapper._resolved) {
      // We've already resolved and calculated these values
      return paperWrapper;
    }
    let margins;
    try {
      margins = await paperWrapper.paper.unwriteableMargin;
    } catch (e) {
      this.reportPrintingError("UNWRITEABLE_MARGIN");
      throw e;
    }
    margins.QueryInterface(Ci.nsIPaperMargin);

    // margin dimensions are given on the paper in points, setting values need to be in inches
    paperWrapper.unwriteableMarginTop = margins.top * INCHES_PER_POINT;
    paperWrapper.unwriteableMarginRight = margins.right * INCHES_PER_POINT;
    paperWrapper.unwriteableMarginBottom = margins.bottom * INCHES_PER_POINT;
    paperWrapper.unwriteableMarginLeft = margins.left * INCHES_PER_POINT;
    // No need to re-resolve static properties
    paperWrapper._resolved = true;
    return paperWrapper;
  },

  async resolvePropertiesForPrinter(printerName) {
    // resolve any async properties we need on the printer
    let printerInfo = this.availablePrinters[printerName];
    if (printerInfo._resolved) {
      // Store a convenience reference
      this.availablePaperSizes = printerInfo.availablePaperSizes;
      return printerInfo;
    }

    // Await the async printer data.
    if (printerInfo.printer) {
      let basePrinterInfo;
      try {
        [
          printerInfo.supportsDuplex,
          printerInfo.supportsColor,
          printerInfo.supportsMonochrome,
          basePrinterInfo,
        ] = await Promise.all([
          printerInfo.printer.supportsDuplex,
          printerInfo.printer.supportsColor,
          printerInfo.printer.supportsMonochrome,
          printerInfo.printer.printerInfo,
        ]);
      } catch (e) {
        this.reportPrintingError("PRINTER_SETTINGS");
        throw e;
      }
      basePrinterInfo.QueryInterface(Ci.nsIPrinterInfo);
      basePrinterInfo.defaultSettings.QueryInterface(Ci.nsIPrintSettings);

      printerInfo.paperList = basePrinterInfo.paperList;
      printerInfo.defaultSettings = basePrinterInfo.defaultSettings;
    } else if (printerName == PrintUtils.SAVE_TO_PDF_PRINTER) {
      // The Mozilla PDF pseudo-printer has no actual nsIPrinter implementation
      printerInfo.defaultSettings = PSSVC.newPrintSettings;
      printerInfo.defaultSettings.printerName = printerName;
      printerInfo.defaultSettings.toFileName = "";
      printerInfo.defaultSettings.outputFormat =
        Ci.nsIPrintSettings.kOutputFormatPDF;
      printerInfo.defaultSettings.printToFile = true;
      printerInfo.paperList = this.fallbackPaperList;
    }
    printerInfo.settings = printerInfo.defaultSettings.clone();
    // Apply any previously persisted user values
    let flags = printerInfo.settings.kInitSaveAll;
    if (printerName == PrintUtils.SAVE_TO_PDF_PRINTER) {
      // Don't apply potentially-bad printToFile setting that may be in some user's prefs.
      flags ^= printerInfo.settings.kInitSavePrintToFile;
    }
    PSSVC.initPrintSettingsFromPrefs(printerInfo.settings, true, flags);
    // We set `isInitializedFromPrinter` to make sure that that's set on the
    // SAVE_TO_PDF_PRINTER settings.  The naming is poor, but that tells the
    // platform code that the settings object is complete.
    printerInfo.settings.isInitializedFromPrinter = true;

    printerInfo.settings.toFileName = "";

    // prepare the available paper sizes for this printer
    if (!printerInfo.paperList?.length) {
      logger.warn(
        "Printer has empty paperList: ",
        printerInfo.printer.id,
        "using fallbackPaperList"
      );
      printerInfo.paperList = this.fallbackPaperList;
    }
    // don't trust the settings to provide valid paperSizeUnit values
    let sizeUnit =
      printerInfo.settings.paperSizeUnit ==
      printerInfo.settings.kPaperSizeMillimeters
        ? printerInfo.settings.kPaperSizeMillimeters
        : printerInfo.settings.kPaperSizeInches;
    let papersById = (printerInfo.availablePaperSizes = {});
    // Store a convenience reference
    this.availablePaperSizes = papersById;

    for (let paper of printerInfo.paperList) {
      paper.QueryInterface(Ci.nsIPaper);
      // Bug 1662239: I'm seeing multiple duplicate entries for each paper size
      // so ensure we have one entry per name
      if (!papersById[paper.id]) {
        papersById[paper.id] = {
          paper,
          id: paper.id,
          name: paper.name,
          // XXXsfoster: Eventually we want to get the unit from the nsIPaper object
          sizeUnit,
        };
      }
    }
    // Update our cache of all the paper sizes by name
    Object.assign(PrintEventHandler.allPaperSizes, papersById);

    // The printer properties don't change, mark this as resolved for next time
    printerInfo._resolved = true;
    return printerInfo;
  },

  get(target, name) {
    switch (name) {
      case "currentPaper": {
        let paperId = this.get(target, "paperId");
        return paperId && this.availablePaperSizes[paperId];
      }

      case "marginPresets":
        let paperWrapper = this.get(target, "currentPaper");
        return {
          none: PrintEventHandler.getMarginPresets("none", paperWrapper),
          minimum: PrintEventHandler.getMarginPresets("minimum", paperWrapper),
          default: PrintEventHandler.getMarginPresets("default", paperWrapper),
          custom: PrintEventHandler.getMarginPresets("custom", paperWrapper),
        };

      case "marginOptions": {
        let allMarginPresets = this.get(target, "marginPresets");
        let uniqueMargins = new Set();
        let marginsEnabled = {};
        for (let name of ["none", "default", "minimum", "custom"]) {
          let {
            marginTop,
            marginLeft,
            marginBottom,
            marginRight,
          } = allMarginPresets[name];
          let key = [marginTop, marginLeft, marginBottom, marginRight].join(
            ","
          );
          // Custom margins are initialized to default margins
          marginsEnabled[name] = !uniqueMargins.has(key) || name == "custom";
          uniqueMargins.add(key);
        }
        return marginsEnabled;
      }

      case "margins":
        let marginSettings = {
          marginTop: target.marginTop,
          marginLeft: target.marginLeft,
          marginBottom: target.marginBottom,
          marginRight: target.marginRight,
        };
        // see if they match the none, minimum, or default margin values
        let allMarginPresets = this.get(target, "marginPresets");
        for (let presetName of ["none", "minimum", "default"]) {
          let marginPresets = allMarginPresets[presetName];
          if (
            Object.keys(marginSettings).every(
              name =>
                marginSettings[name].toFixed(2) ==
                marginPresets[name].toFixed(2)
            )
          ) {
            return presetName;
          }
        }

        // Fall back to custom for other values
        return "custom";

      case "defaultMargins":
        return PrintEventHandler.getMarginPresets(
          "default",
          this.get(target, "currentPaper")
        );

      case "customMargins":
        return PrintEventHandler.getMarginPresets(
          "custom",
          this.get(target, "currentPaper")
        );

      case "paperSizes":
        return Object.values(this.availablePaperSizes)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(paper => {
            return {
              name: paper.name,
              value: paper.id,
            };
          });

      case "supportsDuplex":
        return this.availablePrinters[target.printerName].supportsDuplex;

      case "printDuplex":
        return target.duplex;

      case "printBackgrounds":
        return target.printBGImages || target.printBGColors;

      case "printFootersHeaders":
        // if any of the footer and headers settings have a non-empty string value
        // we consider that "enabled"
        return Object.keys(this.headerFooterSettingsPrefs).some(
          name => !!target[name]
        );

      case "supportsColor":
        return this.availablePrinters[target.printerName].supportsColor;

      case "willSaveToFile":
        return (
          target.outputFormat == Ci.nsIPrintSettings.kOutputFormatPDF ||
          this.knownSaveToFilePrinters.has(target.printerName)
        );
      case "supportsMonochrome":
        return this.availablePrinters[target.printerName].supportsMonochrome;
      case "defaultSystemPrinter":
        return (
          this.defaultSystemPrinter?.value ||
          Object.getOwnPropertyNames(this.availablePrinters).find(
            name => name != PrintUtils.SAVE_TO_PDF_PRINTER
          )
        );

      case "numCopies":
        return this.get(target, "willSaveToFile") ? 1 : target.numCopies;
    }
    return target[name];
  },

  set(target, name, value) {
    switch (name) {
      case "margins":
        if (!["default", "minimum", "none", "custom"].includes(value)) {
          logger.warn("Unexpected margin preset name: ", value);
          value = "default";
        }
        let paperWrapper = this.get(target, "currentPaper");
        let marginPresets = PrintEventHandler.getMarginPresets(
          value,
          paperWrapper
        );
        for (let [settingName, presetValue] of Object.entries(marginPresets)) {
          target[settingName] = presetValue;
        }
        break;

      case "paperId": {
        let paperId = value;
        let paperWrapper = this.availablePaperSizes[paperId];
        // Dimensions on the paper object are in pts.
        // We convert to the printer's specified unit when updating settings
        let unitsPerPoint =
          paperWrapper.sizeUnit == target.kPaperSizeMillimeters
            ? MM_PER_POINT
            : INCHES_PER_POINT;
        // paperWidth and paperHeight are calculated values that we always treat as suspect and
        // re-calculate whenever the paperId changes
        target.paperSizeUnit = paperWrapper.sizeUnit;
        target.paperWidth = paperWrapper.paper.width * unitsPerPoint;
        target.paperHeight = paperWrapper.paper.height * unitsPerPoint;
        // Unwriteable margins were pre-calculated from their async values when the paper size
        // was selected. They are always in inches
        target.unwriteableMarginTop = paperWrapper.unwriteableMarginTop;
        target.unwriteableMarginRight = paperWrapper.unwriteableMarginRight;
        target.unwriteableMarginBottom = paperWrapper.unwriteableMarginBottom;
        target.unwriteableMarginLeft = paperWrapper.unwriteableMarginLeft;
        target.paperId = paperWrapper.paper.id;
        // pull new margin values for the new paper size
        this.set(target, "margins", this.get(target, "margins"));
        break;
      }

      case "printBackgrounds":
        target.printBGImages = value;
        target.printBGColors = value;
        break;

      case "printDuplex":
        target.duplex = value
          ? Ci.nsIPrintSettings.kDuplexHorizontal
          : Ci.nsIPrintSettings.kSimplex;
        break;

      case "printFootersHeaders":
        // To disable header & footers, set them all to empty.
        // To enable, restore default values for each of the header & footer settings.
        for (let [settingName, defaultValue] of Object.entries(
          this.defaultHeadersAndFooterValues
        )) {
          target[settingName] = value ? defaultValue : "";
        }
        break;

      case "customMargins":
        if (value != null) {
          for (let [settingName, newVal] of Object.entries(value)) {
            target[settingName] = newVal;
            this._lastCustomMarginValues[settingName] = newVal;
          }
        }
        break;

      case "customMarginTop":
      case "customMarginBottom":
      case "customMarginLeft":
      case "customMarginRight":
        let customMarginName = "margin" + name.substring(12);
        this.set(
          target,
          "customMargins",
          Object.assign({}, this.get(target, "customMargins"), {
            [customMarginName]: value,
          })
        );
        break;

      default:
        target[name] = value;
    }
  },
};

/*
 * Custom elements ----------------------------------------------------
 */

function PrintUIControlMixin(superClass) {
  return class PrintUIControl extends superClass {
    connectedCallback() {
      this.initialize();
      this.render();
    }

    initialize() {
      if (this._initialized) {
        return;
      }
      this._initialized = true;
      if (this.templateId) {
        let template = this.ownerDocument.getElementById(this.templateId);
        let templateContent = template.content;
        this.appendChild(templateContent.cloneNode(true));
      }

      document.addEventListener("print-settings", ({ detail: settings }) => {
        this.update(settings);
      });

      this.addEventListener("change", this);
    }

    render() {}

    update(settings) {}

    dispatchSettingsChange(changedSettings) {
      this.dispatchEvent(
        new CustomEvent("update-print-settings", {
          bubbles: true,
          detail: changedSettings,
        })
      );
    }

    handleKeypress(e) {
      let char = String.fromCharCode(e.charCode);
      let acceptedChar = e.target.step.includes(".")
        ? char.match(/^[0-9.]$/)
        : char.match(/^[0-9]$/);
      if (!acceptedChar && !char.match("\x00") && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
      }
    }

    handlePaste(e) {
      let paste = (e.clipboardData || window.clipboardData)
        .getData("text")
        .trim();
      let acceptedChars = e.target.step.includes(".")
        ? paste.match(/^[0-9.]*$/)
        : paste.match(/^[0-9]*$/);
      if (!acceptedChars) {
        e.preventDefault();
      }
    }

    handleEvent(event) {}
  };
}

class PrintSettingSelect extends PrintUIControlMixin(HTMLSelectElement) {
  initialize() {
    super.initialize();
    this.addEventListener("keypress", this);
  }

  connectedCallback() {
    this.settingName = this.dataset.settingName;
    super.connectedCallback();
  }

  setOptions(optionValues = []) {
    this.textContent = "";
    for (let optionData of optionValues) {
      let opt = new Option(
        optionData.name,
        "value" in optionData ? optionData.value : optionData.name
      );
      if (optionData.nameId) {
        document.l10n.setAttributes(opt, optionData.nameId);
      }
      // option selectedness is set via update() and assignment to this.value
      this.options.add(opt);
    }
  }

  update(settings) {
    if (this.settingName) {
      this.value = settings[this.settingName];
    }
  }

  handleEvent(e) {
    if (e.type == "change" && this.settingName) {
      this.dispatchSettingsChange({
        [this.settingName]: e.target.value,
      });
    } else if (e.type == "keypress") {
      if (
        e.key == "Enter" &&
        (!e.metaKey || AppConstants.platform == "macosx")
      ) {
        this.form.requestPrint();
      }
    }
  }
}
customElements.define("setting-select", PrintSettingSelect, {
  extends: "select",
});

class DestinationPicker extends PrintSettingSelect {
  initialize() {
    super.initialize();
    document.addEventListener("available-destinations", this);
  }

  update(settings) {
    super.update(settings);
    let isPdf = settings.outputFormat == Ci.nsIPrintSettings.kOutputFormatPDF;
    this.setAttribute("output", isPdf ? "pdf" : "paper");
  }

  handleEvent(e) {
    super.handleEvent(e);

    if (e.type == "available-destinations") {
      this.setOptions(e.detail);
    }
  }
}
customElements.define("destination-picker", DestinationPicker, {
  extends: "select",
});

class ColorModePicker extends PrintSettingSelect {
  update(settings) {
    this.value = settings[this.settingName] ? "color" : "bw";
    let canSwitch = settings.supportsColor && settings.supportsMonochrome;
    this.toggleAttribute("disallowed", !canSwitch);
    this.disabled = !canSwitch;
  }

  handleEvent(e) {
    if (e.type == "change") {
      // turn our string value into the expected boolean
      this.dispatchSettingsChange({
        [this.settingName]: this.value == "color",
      });
    }
  }
}
customElements.define("color-mode-select", ColorModePicker, {
  extends: "select",
});

class PaperSizePicker extends PrintSettingSelect {
  initialize() {
    super.initialize();
    this._printerName = null;
  }

  update(settings) {
    if (settings.printerName !== this._printerName) {
      this._printerName = settings.printerName;
      this.setOptions(settings.paperSizes);
    }
    this.value = settings.paperId;
  }
}
customElements.define("paper-size-select", PaperSizePicker, {
  extends: "select",
});

class OrientationInput extends PrintUIControlMixin(HTMLElement) {
  get templateId() {
    return "orientation-template";
  }

  update(settings) {
    for (let input of this.querySelectorAll("input")) {
      input.checked = settings.orientation == input.value;
    }
  }

  handleEvent(e) {
    this.dispatchSettingsChange({
      orientation: e.target.value,
    });
  }
}
customElements.define("orientation-input", OrientationInput);

class CopiesInput extends PrintUIControlMixin(HTMLInputElement) {
  initialize() {
    super.initialize();
    this.addEventListener("input", this);
    this.addEventListener("keypress", this);
    this.addEventListener("paste", this);
  }

  update(settings) {
    this.value = settings.numCopies;
  }

  handleEvent(e) {
    if (e.type == "keypress") {
      this.handleKeypress(e);
      return;
    }

    if (e.type === "paste") {
      this.handlePaste(e);
    }

    if (this.checkValidity()) {
      this.dispatchSettingsChange({
        numCopies: e.target.value,
      });
    }
  }
}
customElements.define("copy-count-input", CopiesInput, {
  extends: "input",
});

class PrintUIForm extends PrintUIControlMixin(HTMLFormElement) {
  initialize() {
    super.initialize();

    this.addEventListener("change", this);
    this.addEventListener("submit", this);
    this.addEventListener("click", this);
    this.addEventListener("input", this);
    this.addEventListener("revalidate", this);

    this._printerDestination = this.querySelector("#destination");

    this.printButton = this.querySelector("#print-button");
    if (AppConstants.platform != "win") {
      // Move the Print button to the end if this isn't Windows.
      this.printButton.parentElement.append(this.printButton);
    }
  }

  requestPrint() {
    this.requestSubmit(this.printButton);
  }

  update(settings) {
    // If there are no default system printers available and we are not on mac,
    // we should hide the system dialog because it won't be populated with
    // the correct settings. Mac and Gtk support save to pdf functionality
    // in the native dialog, so it can be shown regardless.
    this.querySelector("#system-print").hidden =
      AppConstants.platform === "win" && !settings.defaultSystemPrinter;

    this.querySelector("#copies").hidden = settings.willSaveToFile;

    this.querySelector("#two-sided-printing").hidden = !settings.supportsDuplex;
  }

  enable() {
    for (let element of this.elements) {
      if (!element.hasAttribute("disallowed")) {
        element.disabled = false;
      }
    }
  }

  disable() {
    for (let element of this.elements) {
      element.disabled = element.name != "cancel";
    }
  }

  handleEvent(e) {
    if (e.target.id == "open-dialog-link") {
      this.dispatchEvent(new Event("open-system-dialog", { bubbles: true }));
      return;
    }

    if (e.type == "submit") {
      e.preventDefault();
      if (e.submitter.name == "print" && this.checkValidity()) {
        this.dispatchEvent(new Event("print", { bubbles: true }));
      }
    } else if (
      e.type == "change" ||
      e.type == "input" ||
      e.type == "revalidate"
    ) {
      let isValid = this.checkValidity();
      let section = e.target.closest(".section-block");
      document.body.toggleAttribute("invalid", !isValid);
      if (isValid) {
        // aria-describedby will usually cause the first value to be reported.
        // Unfortunately, screen readers don't pick up description changes from
        // dialogs, so we must use a live region. To avoid double reporting of
        // the first value, we don't set aria-live initially. We only set it for
        // subsequent updates.
        // aria-live is set on the parent because sheetCount itself might be
        // hidden and then shown, and updates are only reported for live
        // regions that were already visible.
        document
          .querySelector("#sheet-count")
          .parentNode.setAttribute("aria-live", "polite");
      } else {
        // We're hiding the sheet count and aria-describedby includes the
        // content of hidden elements, so remove aria-describedby.
        document.body.removeAttribute("aria-describedby");
      }
      for (let element of this.elements) {
        // If we're valid, enable all inputs.
        // Otherwise, disable the valid inputs other than the cancel button and the elements
        // in the invalid section.
        element.disabled =
          element.hasAttribute("disallowed") ||
          (!isValid &&
            element.validity.valid &&
            element.name != "cancel" &&
            element.closest(".section-block") != this._printerDestination &&
            element.closest(".section-block") != section);
      }
    }
  }
}
customElements.define("print-form", PrintUIForm, { extends: "form" });

class ScaleInput extends PrintUIControlMixin(HTMLElement) {
  get templateId() {
    return "scale-template";
  }

  initialize() {
    super.initialize();

    this._percentScale = this.querySelector("#percent-scale");
    this._shrinkToFitChoice = this.querySelector("#fit-choice");
    this._scaleChoice = this.querySelector("#percent-scale-choice");
    this._scaleError = this.querySelector("#error-invalid-scale");

    this._percentScale.addEventListener("input", this);
    this._percentScale.addEventListener("keypress", this);
    this._percentScale.addEventListener("paste", this);
    this.addEventListener("input", this);

    this._updateScaleTask = createDeferredTask(
      () => this.updateScale(),
      INPUT_DELAY_MS
    );
  }

  updateScale() {
    this.dispatchSettingsChange({
      scaling: Number(this._percentScale.value / 100),
    });
  }

  update(settings) {
    let { scaling, shrinkToFit, printerName } = settings;
    this._shrinkToFitChoice.checked = shrinkToFit;
    this._scaleChoice.checked = !shrinkToFit;
    this._percentScale.disabled = shrinkToFit;
    this._percentScale.toggleAttribute("disallowed", shrinkToFit);
    if (!this.printerName) {
      this.printerName = printerName;
    }

    // If the user had an invalid input and switches back to "fit to page",
    // we repopulate the scale field with the stored, valid scaling value.
    let isValid = this._percentScale.checkValidity();
    if (
      !this._percentScale.value ||
      (this._shrinkToFitChoice.checked && !isValid) ||
      (this.printerName != printerName && !isValid)
    ) {
      // Only allow whole numbers. 0.14 * 100 would have decimal places, etc.
      this._percentScale.value = parseInt(scaling * 100, 10);
      this.printerName = printerName;
      if (!isValid) {
        this.dispatchEvent(new Event("revalidate", { bubbles: true }));
        this._scaleError.hidden = true;
      }
    }
  }

  handleEvent(e) {
    if (e.type == "change") {
      // We listen to input events, no need for change too.
      return;
    }

    if (e.type == "keypress") {
      this.handleKeypress(e);
      return;
    }

    if (e.type === "paste") {
      this.handlePaste(e);
    }

    this._updateScaleTask.disarm();

    if (e.target == this._shrinkToFitChoice || e.target == this._scaleChoice) {
      if (!this._percentScale.checkValidity()) {
        this._percentScale.value = 100;
      }
      let scale =
        e.target == this._shrinkToFitChoice
          ? 1
          : Number(this._percentScale.value / 100);
      this.dispatchSettingsChange({
        shrinkToFit: this._shrinkToFitChoice.checked,
        scaling: scale,
      });
      this._scaleError.hidden = true;
    } else if (e.type == "input") {
      if (this._percentScale.checkValidity()) {
        this._updateScaleTask.arm();
      }
    }

    window.clearTimeout(this.showErrorTimeoutId);
    if (this._percentScale.validity.valid) {
      this._scaleError.hidden = true;
    } else {
      this.showErrorTimeoutId = window.setTimeout(() => {
        this._scaleError.hidden = false;
      }, INPUT_DELAY_MS);
    }
  }
}
customElements.define("scale-input", ScaleInput);

class PageRangeInput extends PrintUIControlMixin(HTMLElement) {
  initialize() {
    super.initialize();

    this._startRange = this.querySelector("#custom-range-start");
    this._endRange = this.querySelector("#custom-range-end");
    this._rangePicker = this.querySelector("#range-picker");
    this._rangeError = this.querySelector("#error-invalid-range");
    this._startRangeOverflowError = this.querySelector(
      "#error-invalid-start-range-overflow"
    );

    this._updatePageRangeTask = createDeferredTask(
      () => this.updatePageRange(),
      INPUT_DELAY_MS
    );

    this.addEventListener("input", this);
    this.addEventListener("keypress", this);
    this.addEventListener("paste", this);
    document.addEventListener("page-count", this);
  }

  get templateId() {
    return "page-range-template";
  }

  updatePageRange() {
    this.dispatchSettingsChange({
      pageRanges: this._rangePicker.value
        ? [this._startRange.value, this._endRange.value]
        : [],
    });
  }

  update(settings) {
    this.toggleAttribute("all-pages", !settings.pageRanges.length);
  }

  handleEvent(e) {
    if (e.type == "keypress") {
      if (e.target == this._startRange || e.target == this._endRange) {
        this.handleKeypress(e);
      }
      return;
    }

    if (
      e.type === "paste" &&
      (e.target == this._startRange || e.target == this._endRange)
    ) {
      this.handlePaste(e);
    }

    this._updatePageRangeTask.disarm();

    if (e.type == "page-count") {
      let { totalPages } = e.detail;
      this._startRange.max = this._endRange.max = this._totalPages = totalPages;
      this._startRange.disabled = this._endRange.disabled = false;
      let isChanged = false;

      // Changing certain settings (like orientation, scale or printer) can
      // change the number of pages. We need to update the start and end rages
      // if their values are no longer valid.
      if (!this._startRange.checkValidity()) {
        this._startRange.value = this._totalPages;
        isChanged = true;
      }
      if (!this._endRange.checkValidity()) {
        this._endRange.value = this._totalPages;
        isChanged = true;
      }
      if (isChanged) {
        window.clearTimeout(this.showErrorTimeoutId);
        this._startRange.max = Math.min(this._endRange.value, totalPages);
        this._endRange.min = Math.max(this._startRange.value, 1);

        this.dispatchEvent(new Event("revalidate", { bubbles: true }));

        if (this._startRange.validity.valid && this._endRange.validity.valid) {
          this.dispatchSettingsChange({
            pageRanges: [this._startRange.value, this._endRange.value],
          });
          this._rangeError.hidden = true;
          this._startRangeOverflowError.hidden = true;
        }
      }
      return;
    }

    if (e.target == this._rangePicker) {
      let printAll = e.target.value == "all";
      this._startRange.required = this._endRange.required = !printAll;
      this.querySelector(".range-group").hidden = printAll;
      this._startRange.value = 1;
      this._endRange.value = this._totalPages || 1;

      this.updatePageRange();

      window.clearTimeout(this.showErrorTimeoutId);
      this._rangeError.hidden = true;
      this._startRangeOverflowError.hidden = true;
      return;
    }

    if (e.target == this._startRange || e.target == this._endRange) {
      if (this._startRange.checkValidity()) {
        this._endRange.min = this._startRange.value;
      }
      if (this._endRange.checkValidity()) {
        this._startRange.max = this._endRange.value;
      }
      if (this._startRange.checkValidity() && this._endRange.checkValidity()) {
        if (this._startRange.value && this._endRange.value) {
          // Update the page range after a short delay so we don't update
          // multiple times as the user types a multi-digit number or uses
          // up/down/mouse wheel.
          this._updatePageRangeTask.arm();
        }
      }
    }
    document.l10n.setAttributes(
      this._rangeError,
      "printui-error-invalid-range",
      {
        numPages: this._totalPages,
      }
    );

    window.clearTimeout(this.showErrorTimeoutId);
    let hasShownOverflowError = false;
    let startValidity = this._startRange.validity;
    let endValidity = this._endRange.validity;

    // Display the startRangeOverflowError if the start range exceeds
    // the end range. This means either the start range is greater than its
    // max constraint, whiich is determined by the end range, or the end range
    // is less than its minimum constraint, determined by the start range.
    if (
      !(
        (startValidity.rangeOverflow && endValidity.valid) ||
        (endValidity.rangeUnderflow && startValidity.valid)
      )
    ) {
      this._startRangeOverflowError.hidden = true;
    } else {
      hasShownOverflowError = true;
      this.showErrorTimeoutId = window.setTimeout(() => {
        this._startRangeOverflowError.hidden = false;
      }, INPUT_DELAY_MS);
    }

    // Display the generic error if the startRangeOverflowError is not already
    // showing and a range input is invalid.
    if (hasShownOverflowError || (startValidity.valid && endValidity.valid)) {
      this._rangeError.hidden = true;
    } else {
      this.showErrorTimeoutId = window.setTimeout(() => {
        this._rangeError.hidden = false;
      }, INPUT_DELAY_MS);
    }
  }
}
customElements.define("page-range-input", PageRangeInput);

class MarginsPicker extends PrintUIControlMixin(HTMLElement) {
  initialize() {
    super.initialize();

    this._marginPicker = this.querySelector("#margins-picker");
    this._customTopMargin = this.querySelector("#custom-margin-top");
    this._customBottomMargin = this.querySelector("#custom-margin-bottom");
    this._customLeftMargin = this.querySelector("#custom-margin-left");
    this._customRightMargin = this.querySelector("#custom-margin-right");
    this._marginError = this.querySelector("#error-invalid-margin");

    this._updateCustomMarginsTask = createDeferredTask(
      () => this.updateCustomMargins(),
      INPUT_DELAY_MS
    );

    this.addEventListener("input", this);
    this.addEventListener("keypress", this);
    this.addEventListener("paste", this);
  }

  get templateId() {
    return "margins-template";
  }

  updateCustomMargins() {
    let newMargins = {
      marginTop: this._customTopMargin.value,
      marginBottom: this._customBottomMargin.value,
      marginLeft: this._customLeftMargin.value,
      marginRight: this._customRightMargin.value,
    };

    this.dispatchSettingsChange({
      margins: "custom",
      customMargins: newMargins,
    });
    this._marginError.hidden = true;
  }

  updateMaxValues() {
    this._customTopMargin.max =
      this._maxHeight - this._customBottomMargin.value;
    this._customBottomMargin.max =
      this._maxHeight - this._customTopMargin.value;
    this._customLeftMargin.max = this._maxWidth - this._customRightMargin.value;
    this._customRightMargin.max = this._maxWidth - this._customLeftMargin.value;
  }

  formatMargin(target) {
    if (target.value.includes(".")) {
      if (target.value.split(".")[1].length > 2) {
        let dotIndex = target.value.indexOf(".");
        target.value = target.value.slice(0, dotIndex + 3);
      }
    }
  }

  setAllMarginValues(settings) {
    this._customTopMargin.value = parseFloat(
      settings.customMargins.marginTop
    ).toFixed(2);
    this._customBottomMargin.value = parseFloat(
      settings.customMargins.marginBottom
    ).toFixed(2);
    this._customLeftMargin.value = parseFloat(
      settings.customMargins.marginLeft
    ).toFixed(2);
    this._customRightMargin.value = parseFloat(
      settings.customMargins.marginRight
    ).toFixed(2);
  }

  update(settings) {
    // Re-evaluate which margin options should be enabled whenever the printer or paper changes
    if (
      settings.paperId !== this._paperId ||
      settings.printerName !== this._printerName ||
      settings.orientation !== this._orientation
    ) {
      let enabledMargins = settings.marginOptions;
      for (let option of this._marginPicker.options) {
        option.hidden = !enabledMargins[option.value];
      }
      this._paperId = settings.paperId;
      this._printerName = settings.printerName;
      this._orientation = settings.orientation;

      let height =
        this._orientation == 0 ? settings.paperHeight : settings.paperWidth;
      let width =
        this._orientation == 0 ? settings.paperWidth : settings.paperHeight;

      this._maxHeight =
        height -
        settings.unwriteableMarginTop -
        settings.unwriteableMarginBottom;
      this._maxWidth =
        width -
        settings.unwriteableMarginLeft -
        settings.unwriteableMarginRight;

      this._defaultPresets = settings.defaultMargins;
      // The values in custom fields should be initialized to custom margin values
      // and must be overriden if they are no longer valid.
      this.setAllMarginValues(settings);

      this.dispatchEvent(new Event("revalidate", { bubbles: true }));
      this._marginError.hidden = true;
    }

    // We need to ensure we don't override the value if the value should be custom.
    if (this._marginPicker.value != "custom") {
      // Reset the custom margin values if they are not valid and revalidate the form
      if (
        !this._customTopMargin.checkValidity() ||
        !this._customBottomMargin.checkValidity() ||
        !this._customLeftMargin.checkValidity() ||
        !this._customRightMargin.checkValidity()
      ) {
        window.clearTimeout(this.showErrorTimeoutId);
        this.setAllMarginValues(settings);
        this.dispatchEvent(new Event("revalidate", { bubbles: true }));
        this._marginError.hidden = true;
      }
      if (settings.margins == "custom") {
        // Ensure that we display the custom margin boxes
        this.querySelector(".margin-group").hidden = false;
      }
      this._marginPicker.value = settings.margins;
    }

    this.updateMaxValues();
  }

  handleEvent(e) {
    if (e.type == "change") {
      // We handle input events rather than change events, make sure we only
      // dispatch one settings change per user change.
      return;
    }

    if (e.type == "keypress") {
      this.handleKeypress(e);
      return;
    }

    if (e.type === "paste") {
      this.handlePaste(e);
    }

    this._updateCustomMarginsTask.disarm();

    if (e.target == this._marginPicker) {
      let customMargin = e.target.value == "custom";
      this.querySelector(".margin-group").hidden = !customMargin;
      if (customMargin) {
        // Update the custom margin values to ensure consistency
        this.updateCustomMargins();
        return;
      }

      this.dispatchSettingsChange({
        margins: e.target.value,
        customMargins: null,
      });
    }

    if (
      e.target == this._customTopMargin ||
      e.target == this._customBottomMargin ||
      e.target == this._customLeftMargin ||
      e.target == this._customRightMargin
    ) {
      if (e.target.checkValidity()) {
        this.updateMaxValues();
      }
      if (
        this._customTopMargin.validity.valid &&
        this._customBottomMargin.validity.valid &&
        this._customLeftMargin.validity.valid &&
        this._customRightMargin.validity.valid
      ) {
        this.formatMargin(e.target);
        this._updateCustomMarginsTask.arm();
      } else if (e.target.validity.stepMismatch) {
        // If this is the third digit after the decimal point, we should
        // truncate the string.
        this.formatMargin(e.target);
      }
    }

    window.clearTimeout(this.showErrorTimeoutId);
    if (
      this._customTopMargin.validity.valid &&
      this._customBottomMargin.validity.valid &&
      this._customLeftMargin.validity.valid &&
      this._customRightMargin.validity.valid
    ) {
      this._marginError.hidden = true;
    } else {
      this.showErrorTimeoutId = window.setTimeout(() => {
        this._marginError.hidden = false;
      }, INPUT_DELAY_MS);
    }
  }
}
customElements.define("margins-select", MarginsPicker);

class PrintSettingNumber extends PrintUIControlMixin(HTMLInputElement) {
  connectedCallback() {
    this.type = "number";
    this.settingName = this.dataset.settingName;
    super.connectedCallback();
  }
  update(settings) {
    this.value = settings[this.settingName];
  }

  handleEvent(e) {
    this.dispatchSettingsChange({
      [this.settingName]: this.value,
    });
  }
}
customElements.define("setting-number", PrintSettingNumber, {
  extends: "input",
});

class PrintSettingCheckbox extends PrintUIControlMixin(HTMLInputElement) {
  connectedCallback() {
    this.type = "checkbox";
    this.settingName = this.dataset.settingName;
    super.connectedCallback();
  }

  update(settings) {
    this.checked = settings[this.settingName];
  }

  handleEvent(e) {
    this.dispatchSettingsChange({
      [this.settingName]: this.checked,
    });
  }
}
customElements.define("setting-checkbox", PrintSettingCheckbox, {
  extends: "input",
});

class TwistySummary extends PrintUIControlMixin(HTMLElement) {
  get isOpen() {
    return this.closest("details")?.hasAttribute("open");
  }

  get templateId() {
    return "twisty-summary-template";
  }

  initialize() {
    if (this._initialized) {
      return;
    }
    super.initialize();
    this.label = this.querySelector(".label");

    this.addEventListener("click", this);
    this.updateSummary();
  }

  handleEvent(e) {
    let willOpen = !this.isOpen;
    this.updateSummary(willOpen);
  }

  updateSummary(open = false) {
    document.l10n.setAttributes(
      this.label,
      open
        ? this.getAttribute("data-open-l10n-id")
        : this.getAttribute("data-closed-l10n-id")
    );
  }
}
customElements.define("twisty-summary", TwistySummary);

class PageCount extends PrintUIControlMixin(HTMLElement) {
  initialize() {
    super.initialize();
    document.addEventListener("page-count", this);
  }

  update(settings) {
    this.numCopies = settings.numCopies;
    this.render();
  }

  render() {
    if (!this.numCopies || !this.sheetCount) {
      return;
    }
    document.l10n.setAttributes(this, "printui-sheets-count", {
      sheetCount: this.sheetCount * this.numCopies,
    });

    // The loading attribute must be removed on first render
    if (this.hasAttribute("loading")) {
      this.removeAttribute("loading");
    }

    if (this.id) {
      // We're showing the sheet count, so let it describe the dialog.
      document.body.setAttribute("aria-describedby", this.id);
    }
  }

  handleEvent(e) {
    this.sheetCount = e.detail.sheetCount;
    this.render();
  }
}
customElements.define("page-count", PageCount);

class PrintButton extends PrintUIControlMixin(HTMLButtonElement) {
  update(settings) {
    let l10nId =
      settings.printerName == PrintUtils.SAVE_TO_PDF_PRINTER
        ? "printui-primary-button-save"
        : "printui-primary-button";
    document.l10n.setAttributes(this, l10nId);
  }
}
customElements.define("print-button", PrintButton, { extends: "button" });

class CancelButton extends HTMLButtonElement {
  constructor() {
    super();
    this.addEventListener("click", () => {
      this.dispatchEvent(new Event("cancel-print", { bubbles: true }));
    });
  }
}
customElements.define("cancel-button", CancelButton, { extends: "button" });

async function pickFileName(contentTitle, currentURI) {
  let picker = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
  let [title] = await document.l10n.formatMessages([
    { id: "printui-save-to-pdf-title" },
  ]);
  title = title.value;

  let filename;
  if (contentTitle != "") {
    filename = contentTitle;
  } else {
    let url = new URL(currentURI);
    let path = decodeURIComponent(url.pathname);
    path = path.replace(/\/$/, "");
    filename = path.split("/").pop();
    if (filename == "") {
      filename = url.hostname;
    }
  }
  if (!filename.endsWith(".pdf")) {
    // macOS and linux don't set the extension based on the default extension.
    // Windows won't add the extension a second time, fortunately.
    // If it already ends with .pdf though, adding it again isn't needed.
    filename += ".pdf";
  }
  filename = DownloadPaths.sanitize(filename);

  picker.init(
    window.docShell.chromeEventHandler.ownerGlobal,
    title,
    Ci.nsIFilePicker.modeSave
  );
  picker.appendFilter("PDF", "*.pdf");
  picker.defaultExtension = "pdf";
  picker.defaultString = filename;

  let retval = await new Promise(resolve => picker.open(resolve));

  if (retval == 1) {
    throw new Error({ reason: "cancelled" });
  } else {
    // OK clicked (retval == 0) or replace confirmed (retval == 2)

    // Workaround: When trying to replace an existing file that is open in another application (i.e. a locked file),
    // the print progress listener is never called. This workaround ensures that a correct status is always returned.
    try {
      let fstream = Cc[
        "@mozilla.org/network/file-output-stream;1"
      ].createInstance(Ci.nsIFileOutputStream);
      fstream.init(picker.file, 0x2a, 0o666, 0); // ioflags = write|create|truncate, file permissions = rw-rw-rw-
      fstream.close();
    } catch (e) {
      throw new Error({ reason: retval == 0 ? "not_saved" : "not_replaced" });
    }
  }

  return picker.file.path;
}

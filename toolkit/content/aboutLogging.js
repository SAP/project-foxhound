/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";
const { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
);
const gDashboard = Cc["@mozilla.org/network/dashboard;1"].getService(
  Ci.nsIDashboard
);
const gDirServ = Cc["@mozilla.org/file/directory_service;1"].getService(
  Ci.nsIDirectoryServiceProvider
);

const { ProfilerMenuButton } = ChromeUtils.import(
  "resource://devtools/client/performance-new/popup/menu-button.jsm.js"
);
const { CustomizableUI } = ChromeUtils.import(
  "resource:///modules/CustomizableUI.jsm"
);

XPCOMUtils.defineLazyGetter(this, "ProfilerPopupBackground", function() {
  return ChromeUtils.import(
    "resource://devtools/client/performance-new/popup/background.jsm.js"
  );
});

const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

function fileEnvVarPresent() {
  return Services.env.get("MOZ_LOG_FILE") || Services.env.get("NSPR_LOG_FILE");
}

function moduleEnvVarPresent() {
  return Services.env.get("MOZ_LOG") || Services.env.get("NSPR_LOG");
}

/**
 * All the information associated with a logging presets:
 * - `modules` is the list of log modules and option, the same that would have
 *   been set as a MOZ_LOG environment variable
 * - l10nIds.label and l10nIds.description are the Ids of the strings that
 *   appear in the dropdown selector, and a one-liner describing the purpose of
 *   a particular logging preset
 * - profilerPreset is the name of a Firefox Profiler preset [1]. In general,
 *   the profiler preset will have the correct set of threads for a particular
 *   logging preset, so that all logging statements are recorded in the profile
 *   as markers.
 *
 * [1]: The keys of https://searchfox.org/mozilla-central/rev/88f285c5163f73abd209d4f73cfa476660351982/devtools/client/performance-new/popup/background.jsm.js#119
 */
const gLoggingPresets = {
  networking: {
    modules:
      "timestamp,sync,nsHttp:5,cache2:5,nsSocketTransport:5,nsHostResolver:5",
    l10nIds: {
      label: "about-logging-preset-networking-label",
      description: "about-logging-preset-networking-description",
    },
    profilerPreset: "networking",
  },
  "media-playback": {
    modules:
      "cubeb:5,PlatformDecoderModule:5,AudioSink:5,AudioSinkWrapper:5,MediaDecoderStateMachine:4,MediaDecoder:4",
    l10nIds: {
      label: "about-logging-preset-media-playback-label",
      description: "about-logging-preset-media-playback-description",
    },
    profilerPreset: "media",
  },
  custom: {
    modules: "",
    l10nIds: {
      label: "about-logging-preset-custom-label",
      description: "about-logging-preset-custom-description",
    },
  },
};

const gLoggingSettings = {
  // Possible values: "profiler" and "file".
  loggingOutputType: "profiler",
  running: false,
  // If non-null, the profiler preset to use. If null, the preset selected in
  // the dropdown is going to be used. It is also possible to use a "custom"
  // preset and an explicit list of modules.
  loggingPreset: null,
  // If non-null, the profiler preset to use. If a logging preset is being used,
  // and this is null, the profiler preset associated to the logging preset is
  // going to be used. Otherwise, a generic profiler preset is going to be used
  // ("firefox-platform").
  profilerPreset: null,
  // If non-null, the threads that will be recorded by the Firefox Profiler. If
  // null, the threads from the profiler presets are going to be used.
  profilerThreads: null,
};

// When the profiler has been started, this holds the promise the
// Services.profiler.StartProfiler returns, to ensure the profiler has
// effectively started.
let gProfilerPromise = null;

function presets() {
  return gLoggingPresets;
}

function settings() {
  return gLoggingSettings;
}

function profilerPromise() {
  return gProfilerPromise;
}

function populatePresets() {
  let dropdown = $("#logging-preset-dropdown");
  for (let presetName in gLoggingPresets) {
    let preset = gLoggingPresets[presetName];
    let option = document.createElement("option");
    document.l10n.setAttributes(option, preset.l10nIds.label);
    option.value = presetName;
    dropdown.appendChild(option);
    if (option.value === gLoggingSettings.loggingPreset) {
      option.setAttribute("selected", true);
    }
  }

  function setPresetAndDescription(preset) {
    document.l10n.setAttributes(
      $("#logging-preset-description"),
      gLoggingPresets[preset].l10nIds.description
    );
    gLoggingSettings.loggingPreset = preset;
  }

  dropdown.onchange = function() {
    // When switching to custom, leave the existing module list, to allow
    // editing.
    if (dropdown.value != "custom") {
      $("#log-modules").value = gLoggingPresets[dropdown.value].modules;
    }
    setPresetAndDescription(dropdown.value);
    setLogModules();
    Services.prefs.setCharPref("logging.config.preset", dropdown.value);
  };

  $("#log-modules").value = gLoggingPresets[dropdown.value].modules;
  setPresetAndDescription(dropdown.value);
  // When changing the list switch to custom.
  $("#log-modules").oninput = e => {
    dropdown.value = "custom";
  };
}

function updateLoggingOutputType(profilerOutputType) {
  gLoggingSettings.loggingOutputType = profilerOutputType;

  if (gLoggingSettings.loggingOutputType === "profiler") {
    // hide options related to file output for clarity
    $("#log-file-configuration").hidden = true;
  } else if (gLoggingSettings.loggingOutputType === "file") {
    $("#log-file-configuration").hidden = false;
    $("#no-log-file").hidden = !!$("#current-log-file").innerText.length;
  }

  Services.prefs.setCharPref(
    "logging.config.output_type",
    gLoggingSettings.loggingOutputType
  );
}

function displayErrorMessage(error) {
  var err = $("#error");
  err.hidden = false;

  var errorDescription = $("#error-description");
  document.l10n.setAttributes(errorDescription, error.l10nId, {
    k: error.key,
    v: error.value,
  });
}

class ParseError extends Error {
  constructor(l10nId, key, value) {
    super(name);
    this.l10nId = l10nId;
    this.key = key;
    this.value = value;
  }
  name = "ParseError";
  l10nId;
  key;
  value;
}

function parseURL() {
  let options = new URL(document.location.href).searchParams;

  if (!options) {
    return;
  }

  let modulesOverriden = null,
    outputTypeOverriden = null,
    loggingPresetOverriden = null,
    threadsOverriden = null,
    profilerPresetOverriden = null;
  try {
    for (let [k, v] of options) {
      switch (k) {
        case "modules":
        case "module":
          modulesOverriden = v;
          break;
        case "output":
        case "output-type":
          if (v !== "profiler" && v !== "file") {
            throw new ParseError("about-logging-invalid-output", k, v);
          }
          outputTypeOverriden = v;
          break;
        case "preset":
        case "logging-preset":
          if (!Object.keys(gLoggingPresets).includes(v)) {
            throw new ParseError("about-logging-unknown-logging-preset", k, v);
          }
          loggingPresetOverriden = v;
          break;
        case "threads":
        case "thread":
          threadsOverriden = v;
          break;
        case "profiler-preset":
          if (!Object.keys(ProfilerPopupBackground.presets).includes(v)) {
            throw new Error(["about-logging-unknown-profiler-preset", k, v]);
          }
          profilerPresetOverriden = v;
          break;
        default:
          throw new ParseError("about-logging-unknown-option", k, v);
      }
    }
  } catch (e) {
    displayErrorMessage(e);
    return;
  }

  // Detect combinations that don't make sense
  if (
    (profilerPresetOverriden || threadsOverriden) &&
    outputTypeOverriden == "file"
  ) {
    displayErrorMessage(
      new ParseError("about-logging-file-and-profiler-override")
    );
    return;
  }

  // Configuration is deemed at least somewhat valid, override each setting in
  // turn
  let someElementsDisabled = false;

  if (modulesOverriden || loggingPresetOverriden) {
    // Don't allow changing those if set by the URL
    let logModules = $("#log-modules");
    var dropdown = $("#logging-preset-dropdown");
    if (loggingPresetOverriden) {
      dropdown.value = loggingPresetOverriden;
      dropdown.onchange();
    }
    if (modulesOverriden) {
      logModules.value = modulesOverriden;
      dropdown.value = "custom";
      dropdown.onchange();
      dropdown.disabled = true;
      someElementsDisabled = true;
    }
    logModules.disabled = true;
    $("#set-log-modules-button").disabled = true;
    $("#logging-preset-dropdown").disabled = true;
    someElementsDisabled = true;
    setLogModules();
    updateLogModules();
  }
  if (outputTypeOverriden) {
    $$("input[type=radio]").forEach(e => {
      e.setAttribute("disabled", true);
      someElementsDisabled = true;
      e.checked = e.value == outputTypeOverriden;
    });
  }
  if (loggingPresetOverriden) {
    gLoggingSettings.loggingPreset = loggingPresetOverriden;
  }
  if (profilerPresetOverriden) {
    gLoggingSettings.profilerPreset = profilerPresetOverriden;
  }
  if (threadsOverriden) {
    gLoggingSettings.profilerThreads = threadsOverriden;
  }

  $("#some-elements-unavailable").hidden = !someElementsDisabled;
}

let gInited = false;
function init() {
  if (gInited) {
    return;
  }
  gInited = true;
  gDashboard.enableLogging = true;

  populatePresets();
  parseURL();

  let setLogButton = $("#set-log-file-button");
  setLogButton.addEventListener("click", setLogFile);

  let setModulesButton = $("#set-log-modules-button");
  setModulesButton.addEventListener("click", setLogModules);

  let toggleLoggingButton = $("#toggle-logging-button");
  toggleLoggingButton.addEventListener("click", startStopLogging);

  $$("input[type=radio]").forEach(radio => {
    radio.onchange = e => {
      updateLoggingOutputType(e.target.value);
    };
  });

  try {
    let loggingOutputType = Services.prefs.getCharPref(
      "logging.config.output_type"
    );
    if (loggingOutputType.length) {
      updateLoggingOutputType(loggingOutputType);
    }
  } catch {
    updateLoggingOutputType("profiler");
  }

  try {
    let loggingPreset = Services.prefs.getCharPref("logging.config.preset");
    gLoggingSettings.loggingPreset = loggingPreset;
  } catch {}

  try {
    let running = Services.prefs.getBoolPref("logging.config.running");
    gLoggingSettings.running = running;
    $("#toggle-logging-button").setAttribute(
      "data-l10n-id",
      `about-logging-${gLoggingSettings.running ? "stop" : "start"}-logging`
    );
  } catch {}

  try {
    let file = gDirServ.getFile("TmpD", {});
    file.append("log.txt");
    $("#log-file").value = file.path;
  } catch (e) {
    console.error(e);
  }

  // Update the value of the log file.
  updateLogFile();

  // Update the active log modules
  updateLogModules();

  // If we can't set the file and the modules at runtime,
  // the start and stop buttons wouldn't really do anything.
  if (
    (setLogButton.disabled || setModulesButton.disabled) &&
    moduleEnvVarPresent()
  ) {
    $("#buttons-disabled").hidden = false;
    toggleLoggingButton.disabled = true;
  }
}

function updateLogFile(file) {
  let logPath = "";

  // Try to get the environment variable for the log file
  logPath =
    Services.env.get("MOZ_LOG_FILE") || Services.env.get("NSPR_LOG_FILE");
  let currentLogFile = $("#current-log-file");
  let setLogFileButton = $("#set-log-file-button");

  // If the log file was set from an env var, we disable the ability to set it
  // at runtime.
  if (logPath.length) {
    currentLogFile.innerText = logPath;
    setLogFileButton.disabled = true;
  } else if (gDashboard.getLogPath() != ".moz_log") {
    // There may be a value set by a pref.
    currentLogFile.innerText = gDashboard.getLogPath();
  } else if (file !== undefined) {
    currentLogFile.innerText = file;
  } else {
    try {
      let file = gDirServ.getFile("TmpD", {});
      file.append("log.txt");
      $("#log-file").value = file.path;
    } catch (e) {
      console.error(e);
    }
    // Fall back to the temp dir
    currentLogFile.innerText = $("#log-file").value;
  }

  let openLogFileButton = $("#open-log-file-button");
  openLogFileButton.disabled = true;

  if (currentLogFile.innerText.length) {
    let file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
    file.initWithPath(currentLogFile.innerText);

    if (file.exists()) {
      openLogFileButton.disabled = false;
      openLogFileButton.onclick = function(e) {
        file.reveal();
      };
    }
  }
  $("#no-log-file").hidden = !!currentLogFile.innerText.length;
  $("#current-log-file").hidden = !currentLogFile.innerText.length;
}

function updateLogModules() {
  // Try to get the environment variable for the log file
  let logModules =
    Services.env.get("MOZ_LOG") ||
    Services.env.get("MOZ_LOG_MODULES") ||
    Services.env.get("NSPR_LOG_MODULES");
  let currentLogModules = $("#current-log-modules");
  let setLogModulesButton = $("#set-log-modules-button");
  if (logModules.length) {
    currentLogModules.innerText = logModules;
    // If the log modules are set by an environment variable at startup, do not
    // allow changing them throught a pref. It would be difficult to figure out
    // which ones are enabled and which ones are not. The user probably knows
    // what he they are doing.
    setLogModulesButton.disabled = true;
  } else {
    let activeLogModules = [];
    try {
      if (Services.prefs.getBoolPref("logging.config.add_timestamp")) {
        activeLogModules.push("timestamp");
      }
    } catch (e) {}
    try {
      if (Services.prefs.getBoolPref("logging.config.sync")) {
        activeLogModules.push("sync");
      }
    } catch (e) {}
    try {
      if (Services.prefs.getBoolPref("logging.config.profilerstacks")) {
        activeLogModules.push("profilerstacks");
      }
    } catch (e) {}

    let children = Services.prefs.getBranch("logging.").getChildList("");

    for (let pref of children) {
      if (pref.startsWith("config.")) {
        continue;
      }

      try {
        let value = Services.prefs.getIntPref(`logging.${pref}`);
        activeLogModules.push(`${pref}:${value}`);
      } catch (e) {
        console.error(e);
      }
    }

    if (activeLogModules.length !== 0) {
      currentLogModules.innerText = activeLogModules.join(",");
      currentLogModules.hidden = false;
      $("#no-log-modules").hidden = true;
    } else {
      currentLogModules.innerText = "";
      currentLogModules.hidden = true;
      $("#no-log-modules").hidden = false;
    }
  }
}

function setLogFile() {
  let setLogButton = $("#set-log-file-button");
  if (setLogButton.disabled) {
    // There's no point trying since it wouldn't work anyway.
    return;
  }
  let logFile = $("#log-file").value.trim();
  Services.prefs.setCharPref("logging.config.LOG_FILE", logFile);
  updateLogFile(logFile);
}

function clearLogModules() {
  // Turn off all the modules.
  let children = Services.prefs.getBranch("logging.").getChildList("");
  for (let pref of children) {
    if (!pref.startsWith("config.")) {
      Services.prefs.clearUserPref(`logging.${pref}`);
    }
  }
  Services.prefs.clearUserPref("logging.config.add_timestamp");
  Services.prefs.clearUserPref("logging.config.sync");
  updateLogModules();
}

function setLogModules() {
  if (moduleEnvVarPresent()) {
    // The modules were set via env var, so we shouldn't try to change them.
    return;
  }

  let modules = $("#log-modules").value.trim();

  // Clear previously set log modules.
  clearLogModules();

  if (modules.length !== 0) {
    let logModules = modules.split(",");
    for (let module of logModules) {
      if (module == "timestamp") {
        Services.prefs.setBoolPref("logging.config.add_timestamp", true);
      } else if (module == "rotate") {
        // XXX: rotate is not yet supported.
      } else if (module == "append") {
        // XXX: append is not yet supported.
      } else if (module == "sync") {
        Services.prefs.setBoolPref("logging.config.sync", true);
      } else if (module == "profilerstacks") {
        Services.prefs.setBoolPref("logging.config.profilerstacks", true);
      } else {
        let lastColon = module.lastIndexOf(":");
        let key = module.slice(0, lastColon);
        let value = parseInt(module.slice(lastColon + 1), 10);
        Services.prefs.setIntPref(`logging.${key}`, value);
      }
    }
  }

  updateLogModules();
}

function isLogging() {
  try {
    return Services.prefs.getBoolPref("logging.config.running");
  } catch {
    return false;
  }
}

function startStopLogging() {
  if (isLogging()) {
    document.l10n.setAttributes(
      $("#toggle-logging-button"),
      "about-logging-start-logging"
    );
    stopLogging();
  } else {
    document.l10n.setAttributes(
      $("#toggle-logging-button"),
      "about-logging-stop-logging"
    );
    startLogging();
  }
}

function startLogging() {
  setLogModules();
  if (gLoggingSettings.loggingOutputType === "profiler") {
    const pageContext = "aboutlogging";
    const supportedFeatures = Services.profiler.GetFeatures();
    if (gLoggingSettings.loggingPreset != "custom") {
      // Change the preset before starting the profiler, so that the
      // underlying profiler code picks up the right configuration.
      const profilerPreset =
        gLoggingPresets[gLoggingSettings.loggingPreset].profilerPreset;
      ProfilerPopupBackground.changePreset(
        "aboutlogging",
        profilerPreset,
        supportedFeatures
      );
    } else {
      // a baseline set of threads, and possibly others, overriden by the URL
      ProfilerPopupBackground.changePreset(
        "aboutlogging",
        "firefox-platform",
        supportedFeatures
      );
    }
    let {
      entries,
      interval,
      features,
      threads,
      duration,
    } = ProfilerPopupBackground.getRecordingSettings(
      pageContext,
      Services.profiler.GetFeatures()
    );

    if (gLoggingSettings.profilerThreads) {
      threads.push(...gLoggingSettings.profilerThreads.split(","));
      // Small hack: if cubeb is being logged, it's almost always necessary (and
      // never harmful) to enable audio callback tracing, otherwise, no log
      // statements will be recorded from real-time threads.
      if (gLoggingSettings.profilerThreads.includes("cubeb")) {
        features.push("audiocallbacktracing");
      }
    }
    const win = Services.wm.getMostRecentWindow("navigator:browser");
    const windowid = win?.gBrowser?.selectedBrowser?.browsingContext?.browserId;

    // Force displaying the profiler button in the navbar if not preset, so
    // that there is a visual indication profiling is in progress.
    if (!ProfilerMenuButton.isInNavbar()) {
      // Ensure the widget is enabled.
      Services.prefs.setBoolPref(
        "devtools.performance.popup.feature-flag",
        true
      );
      // Enable the profiler menu button.
      ProfilerMenuButton.addToNavbar();
      // Dispatch the change event manually, so that the shortcuts will also be
      // added.
      CustomizableUI.dispatchToolboxEvent("customizationchange");
    }

    gProfilerPromise = Services.profiler.StartProfiler(
      entries,
      interval,
      features,
      threads,
      windowid,
      duration
    );
  } else {
    setLogFile();
  }
  Services.prefs.setBoolPref("logging.config.running", true);
}

async function stopLogging() {
  if (gLoggingSettings.loggingOutputType === "profiler") {
    await ProfilerPopupBackground.captureProfile("aboutlogging");
  } else {
    Services.prefs.clearUserPref("logging.config.LOG_FILE");
    updateLogFile();
  }
  Services.prefs.setBoolPref("logging.config.running", false);
  clearLogModules();
}

// We use the pageshow event instead of onload. This is needed because sometimes
// the page is loaded via session-restore/bfcache. In such cases we need to call
// init() to keep the page behaviour consistent with the ticked checkboxes.
// Mostly the issue is with the autorefresh checkbox.
window.addEventListener("pageshow", function() {
  init();
});

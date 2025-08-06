// -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at https://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  HiddenBrowserManager: "resource://gre/modules/HiddenFrame.sys.mjs",
  Preferences: "resource://gre/modules/Preferences.sys.mjs",
  setTimeout: "resource://gre/modules/Timer.sys.mjs",
  clearTimeout: "resource://gre/modules/Timer.sys.mjs",
  ProcessType: "resource://gre/modules/ProcessType.sys.mjs",
});

import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";

ChromeUtils.defineLazyGetter(lazy, "console", () => {
  return console.createInstance({
    prefix: "UserCharacteristicsPage",
    maxLogLevelPref: "toolkit.telemetry.user_characteristics_ping.logLevel",
  });
});

ChromeUtils.defineLazyGetter(lazy, "contentPrefs", () => {
  return Cc["@mozilla.org/content-pref/service;1"].getService(
    Ci.nsIContentPrefService2
  );
});

export class UserCharacteristicsPageService {
  classId = Components.ID("{ce3e9659-e311-49fb-b18b-7f27c6659b23}");
  QueryInterface = ChromeUtils.generateQI([
    "nsIUserCharacteristicsPageService",
  ]);

  _initialized = false;
  _isParentProcess = false;

  /**
   * A map of hidden browsers to a resolve function that should be passed the
   * actor that was created for the browser.
   *
   * @type {WeakMap<Browser, function(PageDataParent): void>}
   */
  _backgroundBrowsers = new WeakMap();

  constructor() {
    lazy.console.debug("Init");

    if (
      Services.appinfo.processType !== Services.appinfo.PROCESS_TYPE_DEFAULT
    ) {
      throw new Error(
        "Shouldn't init UserCharacteristicsPage in content processes."
      );
    }

    // Return if we have initiated.
    if (this._initialized) {
      lazy.console.warn("preventing re-initilization...");
      return;
    }
    this._initialized = true;
    this.handledErrors = [];
  }

  shutdown() {}

  createContentPage(principal) {
    lazy.console.debug("called createContentPage");

    lazy.console.debug("Registering actor");
    ChromeUtils.registerWindowActor("UserCharacteristics", {
      parent: {
        esModuleURI: "resource://gre/actors/UserCharacteristicsParent.sys.mjs",
      },
      child: {
        esModuleURI: "resource://gre/actors/UserCharacteristicsChild.sys.mjs",
        events: {
          UserCharacteristicsDataDone: { wantUntrusted: true },
        },
      },
      matches: ["about:fingerprintingprotection"],
      remoteTypes: ["privilegedabout"],
    });

    return lazy.HiddenBrowserManager.withHiddenBrowser(async browser => {
      lazy.console.debug(`In withHiddenBrowser`);
      try {
        let { promise, resolve } = Promise.withResolvers();
        this._backgroundBrowsers.set(browser, resolve);

        let loadURIOptions = {
          triggeringPrincipal: principal,
        };

        let userCharacteristicsPageURI = Services.io.newURI(
          "about:fingerprintingprotection" +
            (Cu.isInAutomation ? "#automation" : "")
        );

        browser.loadURI(userCharacteristicsPageURI, loadURIOptions);

        let data = await promise;
        if (data.debug) {
          lazy.console.debug(`Debugging Output:`);
          for (let line of data.debug) {
            lazy.console.debug(line);
          }
          lazy.console.debug(`(debugging output done)`);
        }
        lazy.console.debug(`Data:`, data.output);

        lazy.console.debug("Populating Glean metrics...");

        await this.populateAndCollectErrors(browser, data);

        // Notify test observers that the data has been populated.
        Services.obs.notifyObservers(
          null,
          "user-characteristics-populating-data-done"
        );
      } finally {
        lazy.console.debug("Unregistering actors");
        this.cleanUp();
        lazy.console.debug("Cleanup done");
        this._backgroundBrowsers.delete(browser);
        lazy.console.debug("Background browser removed");
      }
    });
  }

  cleanUp() {
    ChromeUtils.unregisterWindowActor("UserCharacteristics");
    // unregisterWindowActor doesn't throw if the actor is not registered.
    // (Do note it console.error's but doesn't throw)
    // We can safely double unregister. We do this to handle the case where
    // the actor was registered but the function it was registered timed out.
    ChromeUtils.unregisterWindowActor("UserCharacteristicsWindowInfo");
    ChromeUtils.unregisterWindowActor("UserCharacteristicsCanvasRendering");
  }

  async populateAndCollectErrors(browser, data) {
    // List of functions to populate Glean metrics
    const populateFuncs = [
      [this.populateIntlLocale, []],
      [this.populateZoomPrefs, []],
      [this.populateDevicePixelRatio, [browser.ownerGlobal]],
      [this.populateDisabledMediaPrefs, []],
      [this.populateMathOps, []],
      [this.populateMappableData, [data.output]],
      [this.populateGamepads, [data.output.gamepads]],
      [this.populateClientInfo, []],
      [this.populateCPUInfo, []],
      [this.populateWindowInfo, []],
      [
        this.populateWebGlInfo,
        [browser.ownerGlobal, browser.ownerDocument, false],
      ],
      [
        this.populateWebGlInfo,
        [browser.ownerGlobal, browser.ownerDocument, true],
      ],
      [this.populateCanvasData, []],
    ];
    // Bind them to the class and run them in parallel.
    // Timeout if any of them takes too long (5 minutes).
    const results = await Promise.allSettled(
      populateFuncs.map(([f, args]) =>
        timeoutPromise(f.bind(this)(...args), 5 * 60 * 1000)
      )
    );

    // data?.output?.jsErrors is previous errors that happened in usercharacteristics.js
    const errors = JSON.parse(data?.output?.jsErrors ?? "[]");
    for (const [i, [func]] of populateFuncs.entries()) {
      if (results[i].status == "rejected") {
        const error = `${func.name}: ${await stringifyError(
          results[i].reason
        )}`;
        errors.push(error);
        lazy.console.debug(error);
      }
    }

    errors.push(...this.handledErrors);

    Glean.characteristics.jsErrors.set(JSON.stringify(errors));
  }

  async collectGleanMetricsFromMap(
    data,
    { prefix = "", suffix = "", operation = "set" } = {}
  ) {
    for (const [key, value] of Object.entries(data)) {
      Glean.characteristics[prefix + key + suffix][operation](value);
    }
  }

  async populateWindowInfo() {
    // We use two different methods to get any loaded document.
    // First one is, DOMContentLoaded event. If the user loads
    // a new document after actor registration, we will get it.
    // Second one is, we iterate over all open windows and tabs
    // and try to get the screen info from them.
    // The reason we do both is, for DOMContentLoaded, we can't
    // guarantee that all the documents were not loaded before the
    // actor registration.
    // We could only use the second method and add a load event
    // listener, but that assumes the user won't close already
    // existing tabs and continue on a new one before the page
    // is loaded. This is a rare case, but we want to cover it.

    if (Cu.isInAutomation) {
      // To safeguard against any possible weird empty
      // documents, we check if the document is empty. If it is
      // we wait for a valid document to be loaded.
      // During testing, we load empty.html which doesn't
      // have any body. So, we end up waiting forever.
      // Because of this, we skip this part during automation.
      return;
    }

    const { promise: screenInfoPromise, resolve: screenInfoResolve } =
      Promise.withResolvers();
    const { promise: pointerInfoPromise, resolve: pointerInfoResolve } =
      Promise.withResolvers();

    Services.obs.addObserver(function observe(_subject, topic, data) {
      Services.obs.removeObserver(observe, topic);
      screenInfoResolve(JSON.parse(data));
    }, "user-characteristics-screen-info-done");

    Services.obs.addObserver(function observe(_subject, topic, data) {
      Services.obs.removeObserver(observe, topic);
      pointerInfoResolve(JSON.parse(data));
    }, "user-characteristics-pointer-info-done");

    Services.obs.addObserver(function observe(_subject, topic, _data) {
      Services.obs.removeObserver(observe, topic);
      ChromeUtils.unregisterWindowActor("UserCharacteristicsWindowInfo");
    }, "user-characteristics-window-info-done");

    ChromeUtils.registerWindowActor("UserCharacteristicsWindowInfo", {
      parent: {
        esModuleURI: "resource://gre/actors/UserCharacteristicsParent.sys.mjs",
      },
      child: {
        esModuleURI:
          "resource://gre/actors/UserCharacteristicsWindowInfoChild.sys.mjs",
        events: {
          DOMContentLoaded: {},
        },
      },
    });

    for (const win of Services.wm.getEnumerator("navigator:browser")) {
      if (!win.closed) {
        for (const tab of win.gBrowser.tabs) {
          const actor = await promiseTry(() =>
            tab.linkedBrowser.browsingContext?.currentWindowGlobal.getActor(
              "UserCharacteristicsWindowInfo"
            )
          ).catch(async e => {
            lazy.console.error("Error getting actor", e);
            this.handledErrors.push(await stringifyError(e));
          });

          if (!actor) {
            continue;
          }

          actor.sendAsyncMessage("WindowInfo:PopulateFromDocument");
        }
      }
    }

    const screenResult = await screenInfoPromise;
    this.collectGleanMetricsFromMap(screenResult);

    const pointerResult = await pointerInfoPromise;
    this.collectGleanMetricsFromMap(pointerResult);
  }

  async populateCanvasData() {
    const actorName = "UserCharacteristicsCanvasRendering";
    ChromeUtils.registerWindowActor(actorName, {
      parent: {
        esModuleURI: "resource://gre/actors/UserCharacteristicsParent.sys.mjs",
      },
      child: {
        esModuleURI:
          "resource://gre/actors/UserCharacteristicsCanvasRenderingChild.sys.mjs",
      },
    });

    let data = {};
    // Returns true if we need to try again
    const attemptRender = async allowSoftwareRenderer => {
      const diagnostics = {
        winCount: 0,
        tabCount: 0,
        closed: 0,
        noActor: 0,
        noDebugInfo: 0,
        notHW: 0,
        remoteTypes: [],
      };
      // Try to find a window that supports hardware rendering
      let acceleratedActor = null;
      let fallbackActor = null;
      for (const win of Services.wm.getEnumerator("navigator:browser")) {
        diagnostics.winCount++;
        if (win.closed) {
          diagnostics.closed++;
          continue;
        }

        for (const tab of win.gBrowser.tabs) {
          diagnostics.tabCount++;
          diagnostics.remoteTypes.push(
            sanitizeRemoteType(tab.linkedBrowser.remoteType)
          );

          const actor = await promiseTry(() =>
            tab.linkedBrowser.browsingContext?.currentWindowGlobal.getActor(
              actorName
            )
          ).catch(async e => {
            lazy.console.error("Error getting actor", e);
            this.handledErrors.push(await stringifyError(e));
          });

          if (!actor) {
            diagnostics.noActor++;
            continue;
          }

          // Example data: {"backendType":3,"drawTargetType":0,"isAccelerated":false,"isShared":true}
          const debugInfo = await timeoutPromise(
            actor.sendQuery("CanvasRendering:GetDebugInfo"),
            5000
          ).catch(async e => {
            lazy.console.error("Canvas rendering debug info failed", e);
            this.handledErrors.push(await stringifyError(e));
          });
          if (!debugInfo) {
            diagnostics.noDebugInfo++;
            continue;
          }

          lazy.console.debug("Canvas rendering debug info", debugInfo);

          fallbackActor = actor;
          if (debugInfo.isAccelerated) {
            acceleratedActor = actor;
            break;
          }
          diagnostics.notHW++;
        }
      }

      // If we didn't find a hardware accelerated window, we use the last one
      const actor = acceleratedActor || fallbackActor;

      if (!actor) {
        lazy.console.error("No actor found for canvas rendering");
        // There's no actor/window to render canvases
        return { error: { message: "NO_ACTOR", diagnostics }, retry: false };
      }

      // We have an actor, hw accelerated or not
      // Ask it to render the canvases.
      // Timeout after 1 minute to give multiple
      // chances to render canvases.
      if (allowSoftwareRenderer || acceleratedActor) {
        try {
          data = await timeoutPromise(
            actor.sendQuery("CanvasRendering:Render", {
              hwRenderingExpected: !!acceleratedActor,
            }),
            1 * 60 * 1000
          );
        } catch (e) {
          lazy.console.error(
            "Canvas rendering timed out or actor was destroyed (tab closed etc.)",
            e
          );
          return {
            error: { message: await stringifyError(e), diagnostics },
            retry: true,
          };
        }

        // Successfully rendered at least some canvases, maybe all of them
        lazy.console.debug(
          `Canvases rendered because ${
            acceleratedActor
              ? "we found a hardware accelerated window"
              : "we allowed software rendering"
          }`
        );
        return {
          error: null,
          retry: false,
        };
      }

      // We have a fallback actor, but we don't want to use it for software rendering
      lazy.console.error(
        "No hardware accelerated windows found and software rendering is not allowed"
      );
      return { error: { message: "NO_HW_ACTOR", diagnostics }, retry: true };
    };

    // Try to render canvases
    let result = null;
    let tries = 1;
    while (
      (result = await attemptRender(tries === 5 || Cu.isInAutomation)).retry
    ) {
      // We either don't have hardware accelerated windows or we failed to render canvases.
      this.handledErrors.push(result.error);
      // We allow software rendering on the fifth try.
      tries++;
      // Rendering might fail if the user closes the tab before we render the canvases.
      // Wait for a bit before trying again
      await new Promise(resolve => lazy.setTimeout(resolve, 10 * 1000));
    }

    if (!result.retry && result.error) {
      this.handledErrors.push(result.error);
    }

    // We may have HW + SW, or only SW rendered canvases - populate the metrics with what we have
    this.collectGleanMetricsFromMap(data.renderings);

    ChromeUtils.unregisterWindowActor(actorName);

    // Record the errors
    if (data.errors?.length) {
      this.handledErrors.push(...data.errors);
    }
  }

  async populateZoomPrefs() {
    const zoomPrefsCount = await new Promise(resolve => {
      lazy.contentPrefs.getByName("browser.content.full-zoom", null, {
        _result: 0,
        handleResult(_) {
          this._result++;
        },
        handleCompletion() {
          resolve(this._result);
        },
      });
    });

    Glean.characteristics.zoomCount.set(zoomPrefsCount);
  }

  async populateDevicePixelRatio(window) {
    Glean.characteristics.pixelRatio.set(
      (window.browsingContext.overrideDPPX || window.devicePixelRatio) * 100
    );
  }

  async populateIntlLocale() {
    const locale = new Intl.DisplayNames(undefined, {
      type: "region",
    }).resolvedOptions().locale;
    Glean.characteristics.intlLocale.set(locale);
  }

  async populateGamepads(gamepads) {
    for (let gamepad of gamepads) {
      Glean.characteristics.gamepads.add(gamepad);
    }
  }

  async populateMappableData(data) {
    // We set data from usercharacteristics.js
    // We could do Object.keys(data), but this
    // is more explicit and provides better
    // readability and control.
    // Keys must match to data returned from
    // usercharacteristics.js and the metric defined
    const metrics = {
      set: [
        "canvasdata11Webgl",
        "canvasdata11Webglsoftware",
        "voicesCount",
        "voicesLocalCount",
        "voicesDefault",
        "voicesSample",
        "voicesSha1",
        "voicesAllSsdeep",
        "voicesLocalSsdeep",
        "voicesNonlocalSsdeep",
        "mediaCapabilitiesUnsupported",
        "mediaCapabilitiesNotSmooth",
        "mediaCapabilitiesNotEfficient",
        "mediaCapabilitiesH264",
        "audioFingerprint",
        "jsErrors",
        "pointerType",
        "anyPointerType",
        "iceSd",
        "iceOrder",
        "motionDecimals",
        "orientationDecimals",
        "orientationabsDecimals",
        "motionFreq",
        "orientationFreq",
        "orientationabsFreq",
        "mathml1",
        "mathml2",
        "mathml3",
        "mathml4",
        "mathml5",
        "mathml6",
        "mathml7",
        "mathml8",
        "mathml9",
        "mathml10",
        "monochrome",
        "oscpu",
        "pdfViewer",
        "platform",
        "audioFrames",
        "audioRate",
        "audioChannels",
      ],
    };

    for (const type in metrics) {
      for (const metric of metrics[type]) {
        Glean.characteristics[metric][type](data[metric]);
      }
    }
  }

  async populateMathOps() {
    // Taken from https://github.com/fingerprintjs/fingerprintjs/blob/da64ad07a9c1728af595068e4a306a4151c5d503/src/sources/math.ts
    // At the time, fingerprintjs was licensed under MIT. Slightly modified to reduce payload size.
    const ops = [
      // Native
      [Math.acos, 0.123124234234234242],
      [Math.acosh, 1e308],
      [Math.asin, 0.123124234234234242],
      [Math.asinh, 1],
      [Math.atanh, 0.5],
      [Math.atan, 0.5],
      [Math.sin, -1e300],
      [Math.sinh, 1],
      [Math.cos, 10.000000000123],
      [Math.cosh, 1],
      [Math.tan, -1e300],
      [Math.tanh, 1],
      [Math.exp, 1],
      [Math.expm1, 1],
      [Math.log1p, 10],
      // Polyfills (I'm not sure if we need polyfills since firefox seem to have all of these operations, but I'll leave it here just in case they yield different values due to chaining)
      [value => Math.pow(Math.PI, value), -100],
      [value => Math.log(value + Math.sqrt(value * value - 1)), 1e154],
      [value => Math.log(value + Math.sqrt(value * value + 1)), 1],
      [value => Math.log((1 + value) / (1 - value)) / 2, 0.5],
      [value => Math.exp(value) - 1 / Math.exp(value) / 2, 1],
      [value => (Math.exp(value) + 1 / Math.exp(value)) / 2, 1],
      [value => Math.exp(value) - 1, 1],
      [value => (Math.exp(2 * value) - 1) / (Math.exp(2 * value) + 1), 1],
      [value => Math.log(1 + value), 10],
    ].map(([op, value]) => [op || (() => 0), value]);

    Glean.characteristics.mathOps.set(
      JSON.stringify(ops.map(([op, value]) => op(value)))
    );
  }

  async populateClientInfo() {
    const buildID = Services.appinfo.appBuildID;
    const buildDate =
      new Date(
        buildID.slice(0, 4),
        buildID.slice(4, 6) - 1,
        buildID.slice(6, 8),
        buildID.slice(8, 10),
        buildID.slice(10, 12),
        buildID.slice(12, 14)
      ).getTime() / 1000;

    Glean.characteristics.version.set(Services.appinfo.version);
    Glean.characteristics.channel.set(AppConstants.MOZ_UPDATE_CHANNEL);
    Glean.characteristics.osName.set(Services.appinfo.OS);
    Glean.characteristics.osVersion.set(
      Services.sysinfo.getProperty("version")
    );
    Glean.characteristics.buildDate.set(buildDate);
  }

  async populateCPUInfo() {
    Glean.characteristics.cpuModel.set(
      await Services.sysinfo.processInfo.then(r => r.name)
    );
  }

  async populateWebGlInfo(window, document, forceSoftwareRendering) {
    const results = {
      glVersion: 2,
      parameters: {
        v1: [],
        v2: [],
        extensions: [],
      },
      shaderPrecision: {
        FRAGMENT_SHADER: {},
        VERTEX_SHADER: {},
      },
      debugShaders: {},
      debugParams: {},
    };

    const canvas = document.createElement("canvas");
    let gl = canvas.getContext("webgl2", { forceSoftwareRendering });
    if (!gl) {
      gl = canvas.getContext("webgl", { forceSoftwareRendering });
      results.glVersion = 1;
    }
    if (!gl) {
      lazy.console.error(
        "Unable to initialize WebGL. Your browser or machine may not support it."
      );
      Glean.characteristics.glVersion.set(results.glVersion);
      return;
    }

    // Some parameters are removed because they need to binded/set first.
    // We are only interested in fingerprintable parameters.
    // See https://phabricator.services.mozilla.com/D216337 for removed parameters.
    const PARAMS = {
      v1: [
        "ALIASED_LINE_WIDTH_RANGE",
        "ALIASED_POINT_SIZE_RANGE",
        "MAX_COMBINED_TEXTURE_IMAGE_UNITS",
        "MAX_CUBE_MAP_TEXTURE_SIZE",
        "MAX_FRAGMENT_UNIFORM_VECTORS",
        "MAX_RENDERBUFFER_SIZE",
        "MAX_TEXTURE_IMAGE_UNITS",
        "MAX_TEXTURE_SIZE",
        "MAX_VARYING_VECTORS",
        "MAX_VERTEX_ATTRIBS",
        "MAX_VERTEX_TEXTURE_IMAGE_UNITS",
        "MAX_VERTEX_UNIFORM_VECTORS",
        "MAX_VIEWPORT_DIMS",
        "SHADING_LANGUAGE_VERSION",
      ],
      v2: [
        "MAX_3D_TEXTURE_SIZE",
        "MAX_ARRAY_TEXTURE_LAYERS",
        "MAX_CLIENT_WAIT_TIMEOUT_WEBGL",
        "MAX_COLOR_ATTACHMENTS",
        "MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS",
        "MAX_COMBINED_UNIFORM_BLOCKS",
        "MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS",
        "MAX_DRAW_BUFFERS",
        "MAX_ELEMENT_INDEX",
        "MAX_ELEMENTS_INDICES",
        "MAX_ELEMENTS_VERTICES",
        "MAX_FRAGMENT_INPUT_COMPONENTS",
        "MAX_FRAGMENT_UNIFORM_BLOCKS",
        "MAX_FRAGMENT_UNIFORM_COMPONENTS",
        "MAX_PROGRAM_TEXEL_OFFSET",
        "MAX_SAMPLES",
        "MAX_SERVER_WAIT_TIMEOUT",
        "MAX_TEXTURE_LOD_BIAS",
        "MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS",
        "MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS",
        "MAX_TRANSFORM_FEEDBACK_SEPARATE_COMPONENTS",
        "MAX_UNIFORM_BLOCK_SIZE",
        "MAX_UNIFORM_BUFFER_BINDINGS",
        "MAX_VARYING_COMPONENTS",
        "MAX_VERTEX_OUTPUT_COMPONENTS",
        "MAX_VERTEX_UNIFORM_BLOCKS",
        "MAX_VERTEX_UNIFORM_COMPONENTS",
        "MIN_PROGRAM_TEXEL_OFFSET",
        "UNIFORM_BUFFER_OFFSET_ALIGNMENT",
      ],
      extensions: {
        EXT_texture_filter_anisotropic: ["MAX_TEXTURE_MAX_ANISOTROPY_EXT"],
        WEBGL_draw_buffers: [
          "MAX_COLOR_ATTACHMENTS_WEBGL",
          "MAX_DRAW_BUFFERS_WEBGL",
        ],
        EXT_disjoint_timer_query: ["TIMESTAMP_EXT"],
        OVR_multiview2: ["MAX_VIEWS_OVR"],
      },
    };

    const attemptToArray = value => {
      if (ArrayBuffer.isView(value)) {
        return Array.from(value);
      }
      return value;
    };
    function getParam(param, ext = gl) {
      const constant = ext[param];
      const value = attemptToArray(gl.getParameter(constant));
      return value;
    }

    // Get all parameters available in WebGL1
    if (results.glVersion >= 1) {
      for (const parameter of PARAMS.v1) {
        results.parameters.v1.push(getParam(parameter));
      }
    }

    // Get all parameters available in WebGL2
    if (results.glVersion === 2) {
      for (const parameter of PARAMS.v2) {
        results.parameters.v2.push(getParam(parameter));
      }
    }

    // Get all extension parameters
    for (const extension in PARAMS.extensions) {
      const ext = gl.getExtension(extension);
      if (!ext) {
        results.parameters.extensions.push(null);
        continue;
      }
      results.parameters.extensions.push(
        PARAMS.extensions[extension].map(param => getParam(param, ext))
      );
    }

    for (const shaderType of ["FRAGMENT_SHADER", "VERTEX_SHADER"]) {
      for (const precisionType of [
        "LOW_FLOAT",
        "MEDIUM_FLOAT",
        "HIGH_FLOAT",
        "LOW_INT",
        "MEDIUM_INT",
        "HIGH_INT",
      ]) {
        let { rangeMin, rangeMax, precision } = gl.getShaderPrecisionFormat(
          gl[shaderType],
          gl[precisionType]
        );
        results.shaderPrecision[shaderType][precisionType] = {
          rangeMin,
          rangeMax,
          precision,
        };
      }
    }

    const mozDebugExt = gl.getExtension("MOZ_debug");
    const debugExt = gl.getExtension("WEBGL_debug_renderer_info");

    results.debugParams = {
      versionRaw: mozDebugExt.getParameter(gl.VERSION),
      vendorRaw: mozDebugExt.getParameter(gl.VENDOR),
      rendererRaw: mozDebugExt.getParameter(gl.RENDERER),
      extensions: gl.getSupportedExtensions().join(" "),
      extensionsRaw: mozDebugExt.getParameter(mozDebugExt.EXTENSIONS),
      vendorDebugInfo: gl.getParameter(debugExt.UNMASKED_VENDOR_WEBGL),
      rendererDebugInfo: gl.getParameter(debugExt.UNMASKED_RENDERER_WEBGL),
      contextType: mozDebugExt.getParameter(mozDebugExt.CONTEXT_TYPE),
    };

    if (gl.getExtension("WEBGL_debug_shaders")) {
      // WEBGL_debug_shaders.getTranslatedShaderSource() produces GPU fingerprintable information

      // Taken from https://github.com/mdn/dom-examples/blob/b12b3a9e85747d3432135e6efa5bbc6581fc0774/webgl-examples/tutorial/sample3/webgl-demo.js#L29
      const vsSource = `
        attribute vec4 aVertexPosition;
        attribute vec4 aVertexColor;

        uniform mat4 uModelViewMatrix;
        uniform mat4 uProjectionMatrix;

        varying lowp vec4 vColor;

        void main(void) {
          gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
          vColor = aVertexColor;
        }
      `;

      // Taken from https://github.com/mdn/content/blob/acfe8c9f1f4145f77653a2bc64a9744b001358dc/files/en-us/web/api/webgl_api/tutorial/adding_2d_content_to_a_webgl_context/index.md?plain=1#L89
      const fsSource = `
        void main() {
          gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
        }
      `;

      const minimalSource = `void main() {}`;

      // To keep the payload small, we'll hash vsSource and fsSource, but keep minimalSource as is.
      const translationExt = gl.getExtension("WEBGL_debug_shaders");

      const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fragmentShader, fsSource);
      gl.compileShader(fragmentShader);

      const vertexShader = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vertexShader, vsSource);
      gl.compileShader(vertexShader);

      const minimalShader = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(minimalShader, minimalSource);
      gl.compileShader(minimalShader);

      async function sha1(message) {
        const msgUint8 = new TextEncoder().encode(message);
        const hashBuffer = await window.crypto.subtle.digest("SHA-1", msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray
          .map(b => b.toString(16).padStart(2, "0"))
          .join("");
        return hashHex;
      }

      results.debugShaders = {
        fs: await sha1(
          translationExt.getTranslatedShaderSource(fragmentShader)
        ),
        vs: await sha1(translationExt.getTranslatedShaderSource(vertexShader)),
        ms: translationExt.getTranslatedShaderSource(minimalShader),
      };
    }

    const map = {
      // General
      glVersion: results.glVersion,
      // Debug Params
      glExtensions: results.debugParams.extensions,
      glExtensionsRaw: results.debugParams.extensionsRaw,
      glRenderer: results.debugParams.rendererDebugInfo,
      glRendererRaw: results.debugParams.rendererRaw,
      glVendor: results.debugParams.vendorDebugInfo,
      glVendorRaw: results.debugParams.vendorRaw,
      glVersionRaw: results.debugParams.versionRaw,
      glContextType: results.debugParams.contextType,
      // Debug Shaders
      glFragmentShader: results.debugShaders.fs,
      glVertexShader: results.debugShaders.vs,
      glMinimalSource: results.debugShaders.ms,
      // Parameters
      glParamsExtensions: JSON.stringify(results.parameters.extensions),
      glParamsV1: JSON.stringify(results.parameters.v1),
      glParamsV2: JSON.stringify(results.parameters.v2),
      // Shader Precision
      glPrecisionFragment: JSON.stringify(
        results.shaderPrecision.FRAGMENT_SHADER
      ),
      glPrecisionVertex: JSON.stringify(results.shaderPrecision.VERTEX_SHADER),
    };

    this.collectGleanMetricsFromMap(map, {
      suffix: forceSoftwareRendering ? "Software" : "",
    });
  }

  async pageLoaded(browsingContext, data) {
    lazy.console.debug(
      `pageLoaded browsingContext=${browsingContext} data=${data}`
    );

    let browser = browsingContext.embedderElement;

    let backgroundResolve = this._backgroundBrowsers.get(browser);
    if (backgroundResolve) {
      backgroundResolve(data);
      return;
    }
    throw new Error(`No backround resolve for ${browser} found`);
  }

  async populateDisabledMediaPrefs() {
    const PREFS = [
      "media.wave.enabled",
      "media.ogg.enabled",
      "media.opus.enabled",
      "media.mp4.enabled",
      "media.wmf.hevc.enabled",
      "media.webm.enabled",
      "media.av1.enabled",
      "media.encoder.webm.enabled",
      "media.mediasource.enabled",
      "media.mediasource.mp4.enabled",
      "media.mediasource.webm.enabled",
      "media.mediasource.vp9.enabled",
    ];

    const defaultPrefs = new lazy.Preferences({ defaultBranch: true });
    const changedPrefs = {};
    for (const pref of PREFS) {
      const value = lazy.Preferences.get(pref);
      if (lazy.Preferences.isSet(pref) && defaultPrefs.get(pref) !== value) {
        const key = pref.substring(6).substring(0, pref.length - 8 - 6);
        changedPrefs[key] = value;
      }
    }
    Glean.characteristics.changedMediaPrefs.set(JSON.stringify(changedPrefs));
  }
}

// =============================================================
// Utility Functions

async function stringifyError(error) {
  if (error instanceof Error) {
    const stack = (error.stack ?? "").replaceAll(
      /@chrome.+?UserCharacteristicsPageService.sys.mjs:/g,
      ""
    );
    return `${error.toString()} ${stack}`;
  }
  // A hacky attempt to extract as much as info from error
  const errStr = await (async () => {
    const asStr = await (async () => error.toString())().catch(() => "");
    const asJson = await (async () => JSON.stringify(error))().catch(() => "");
    return asStr.length > asJson.len ? asStr : asJson;
  })();
  return errStr;
}

function timeoutPromise(promise, ms) {
  return new Promise((resolve, reject) => {
    const timeoutId = lazy.setTimeout(() => {
      reject(new Error("TIMEOUT"));
    }, ms);

    promise.then(
      value => {
        lazy.clearTimeout(timeoutId);
        resolve(value);
      },
      error => {
        lazy.clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

function promiseTry(func) {
  return new Promise((resolve, reject) => {
    try {
      resolve(func());
    } catch (error) {
      reject(error);
    }
  });
}

// Remote type may include current site url, which is not needed.
// We only need the remote type.
// See https://firefox-source-docs.mozilla.org/dom/ipc/process_model.html
// and search for $SITE for processes that have site information.
// We return unknown if it isn't one of the known types.
function sanitizeRemoteType(remoteTypeStr) {
  if (!remoteTypeStr) {
    return "null";
  }

  const remoteTypes = remoteTypeStr.split("=");
  if (remoteTypes.length >= 2) {
    return isValidRemoteType(remoteTypes[0]) ? remoteTypes[0] : "unknown";
  }

  return isValidRemoteType(remoteTypeStr) ? remoteTypeStr : "unknown";
}

function isValidRemoteType(sanitizedRemoteType) {
  return (
    lazy.ProcessType.fluentNameFromProcessTypeString(sanitizedRemoteType) !==
    lazy.ProcessType.kFallback
  );
}

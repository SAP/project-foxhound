/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// Defined by gl-matrix.js
/* global mat4 */

// Defined by ssdeep.js
/* global ssdeep */

// =============================================================
// Utility Functions

var debugMsgs = [];
function debug(...args) {
  let msg = "";
  if (!args.length) {
    debugMsgs.push("");
    return;
  }

  const stringify = o => {
    if (typeof o == "string") {
      return o;
    }
    return JSON.stringify(o);
  };

  const stringifiedArgs = args.map(stringify);
  msg += stringifiedArgs.join(" ");
  debugMsgs.push(msg);

  // Also echo it locally
  /* eslint-disable-next-line no-console */
  console.log(msg);
}

function sha1(message) {
  const msgUint8 = new TextEncoder().encode(message);
  return sha1Uint8Array(msgUint8);
}

async function sha1Uint8Array(bytes) {
  const hashBuffer = await crypto.subtle.digest("SHA-1", bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

async function stringifyError(error) {
  if (error instanceof Error) {
    const stack = (error.stack ?? "").replaceAll(
      /@chrome.+?usercharacteristics.js:/g,
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

function sample(array, count) {
  const range = array.length - 1;
  if (range <= count) {
    return array;
  }

  const samples = [];
  const step = Math.floor(range / count);
  for (let i = 0; i < range; i += step) {
    samples.push(array[i]);
  }
  return samples;
}

function mean(array) {
  if (array.length === 0) {
    return 0;
  }
  return array.reduce((a, b) => a + b) / array.length;
}

function standardDeviation(array) {
  const m = mean(array);
  return Math.sqrt(mean(array.map(x => Math.pow(x - m, 2))));
}

// Returns the number of decimal places num has. Useful for
// collecting precision of values reported by the hardware.
function decimalPlaces(num) {
  // Omit - sign if num is negative.
  const str = num >= 0 ? num.toString() : num.toString().substr(1);
  // Handle scientific notation numbers such as 1e-15.
  const dashI = str.indexOf("-");
  if (dashI !== -1) {
    return +str.substr(dashI + 1);
  }

  // Handle numbers separated by . such as 1.0000015
  const dotI = str.indexOf(".");
  if (dotI !== -1) {
    return str.length - dotI - 1;
  }

  // Handle numbers separated by , such as 1,0000015
  const commaI = str.indexOf(",");
  if (commaI !== -1) {
    return str.length - commaI - 1;
  }

  return 0;
}

function timeoutPromise(promise, ms) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("TIMEOUT"));
    }, ms);

    promise.then(
      value => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      error => {
        clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

// =======================================================================
// WebGL Canvases

function populateWebGLCanvases(contextOptions = {}) {
  // The following WebGL code came from https://github.com/mdn/dom-examples/blob/4f305d21de796432dac2e9f2961591e4b7f913c0/webgl-examples/tutorial/sample3/webgl-demo.js
  // with some minor modifications

  const data = {};
  const suffix = contextOptions.forceSoftwareRendering ? "Software" : "";

  // --------------------------------------------------------------------
  // initBuffers
  //
  // Initialize the buffers we'll need. For this demo, we just
  // have one object -- a simple two-dimensional square.
  //
  function initBuffers(gl) {
    // Create a buffer for the square's positions.

    const positionBuffer = gl.createBuffer();

    // Select the positionBuffer as the one to apply buffer
    // operations to from here out.

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Now create an array of positions for the square.

    const positions = [1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0];

    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer.

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // Now set up the colors for the vertices

    var colors = [
      1.0,
      1.0,
      1.0,
      1.0, // white
      1.0,
      0.0,
      0.0,
      1.0, // red
      0.0,
      1.0,
      0.0,
      1.0, // green
      0.0,
      0.0,
      1.0,
      1.0, // blue
    ];

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    return {
      position: positionBuffer,
      color: colorBuffer,
    };
  }

  // --------------------------------------------------------------------
  // Draw the scene.
  function drawScene(gl, programInfo, buffers) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
    gl.clearDepth(1.0); // Clear everything
    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things

    // Clear the canvas before we start drawing on it.

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Create a perspective matrix, a special matrix that is
    // used to simulate the distortion of perspective in a camera.
    // Our field of view is 45 degrees, with a width/height
    // ratio that matches the display size of the canvas
    // and we only want to see objects between 0.1 units
    // and 100 units away from the camera.

    const fieldOfView = (45 * Math.PI) / 180; // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();

    // note: glmatrix.js always has the first argument
    // as the destination to receive the result.
    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    const modelViewMatrix = mat4.create();

    var squareRotation = 1.0;

    // Now move the drawing position a bit to where we want to
    // start drawing the square.

    mat4.translate(
      modelViewMatrix, // destination matrix
      modelViewMatrix, // matrix to translate
      [-0.0, 0.0, -6.0]
    ); // amount to translate
    mat4.rotate(
      modelViewMatrix, // destination matrix
      modelViewMatrix, // matrix to rotate
      squareRotation, // amount to rotate in radians
      [0, 0, 1]
    ); // axis to rotate around

    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute
    {
      const numComponents = 2;
      const type = gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
      gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset
      );
      gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    }

    // Tell WebGL how to pull out the colors from the color buffer
    // into the vertexColor attribute.
    {
      const numComponents = 4;
      const type = gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
      gl.vertexAttribPointer(
        programInfo.attribLocations.vertexColor,
        numComponents,
        type,
        normalize,
        stride,
        offset
      );
      gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
    }

    // Tell WebGL to use our program when drawing

    gl.useProgram(programInfo.program);

    // Set the shader uniforms

    gl.uniformMatrix4fv(
      programInfo.uniformLocations.projectionMatrix,
      false,
      projectionMatrix
    );
    gl.uniformMatrix4fv(
      programInfo.uniformLocations.modelViewMatrix,
      false,
      modelViewMatrix
    );

    {
      const offset = 0;
      const vertexCount = 4;
      gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    }
  }

  // --------------------------------------------------------------------
  // Initialize a shader program, so WebGL knows how to draw our data
  function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    // Create the shader program

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      alert(
        "Unable to initialize the shader program: " +
          gl.getProgramInfoLog(shaderProgram)
      );
      return null;
    }

    return shaderProgram;
  }

  // --------------------------------------------------------------------
  //
  // creates a shader of the given type, uploads the source and
  // compiles it.
  //
  function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    // Send the source to the shader object
    gl.shaderSource(shader, source);

    // Compile the shader program
    gl.compileShader(shader);

    // See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert(
        "An error occurred compiling the shaders: " +
          gl.getShaderInfoLog(shader)
      );
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  // --------------------------------------------------------------------
  const canvas = document.getElementById("glcanvas" + suffix);
  const gl = canvas.getContext("webgl", contextOptions);

  // If we don't have a GL context, give up now

  if (!gl) {
    alert(
      "Unable to initialize WebGL. Your browser or machine may not support it."
    );
    return {};
  }

  // Vertex shader program

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

  // Fragment shader program

  const fsSource = `
    varying lowp vec4 vColor;

    void main(void) {
      gl_FragColor = vColor;
    }
  `;

  // Initialize a shader program; this is where all the lighting
  // for the vertices and so forth is established.
  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

  // Collect all the info needed to use the shader program.
  // Look up which attributes our shader program is using
  // for aVertexPosition, aVevrtexColor and also
  // look up uniform locations.
  const programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
      vertexColor: gl.getAttribLocation(shaderProgram, "aVertexColor"),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(
        shaderProgram,
        "uProjectionMatrix"
      ),
      modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
    },
  };

  // Here's where we call the routine that builds all the
  // objects we'll be drawing.
  const buffers = initBuffers(gl);

  // Draw the scene
  drawScene(gl, programInfo, buffers);

  // Write to the fields
  const pixels = new Uint8Array(
    gl.drawingBufferWidth * gl.drawingBufferHeight * 4
  );
  gl.readPixels(
    0,
    0,
    gl.drawingBufferWidth,
    gl.drawingBufferHeight,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    pixels
  );
  data["canvasdata11Webgl" + suffix] = sha1Uint8Array(pixels);
  data["canvasdata11Webgl" + suffix + "Raw"] = btoa(
    String.fromCharCode.apply(null, pixels)
  );

  return data;
}

// ==============================================================
// Speech Synthesis Voices
async function populateVoiceList() {
  // Replace long prefixes with short ones to reduce the size of the output.
  const uriPrefixes = [
    [/(?:urn:)?moz-tts:.*?:/, "#m:"],
    [/com\.apple\.speech\.synthesis\.voice\./, "#as:"],
    [/com\.apple\.voice\.compact./, "#ac:"],
    [/com\.apple\.eloquence\./, "#ap:"],
    // Populate with more prefixes as needed.
  ];

  function trimVoiceURI(uri) {
    for (const [re, replacement] of uriPrefixes) {
      uri = uri.replace(re, replacement);
    }
    return uri;
  }

  async function processVoices(voices) {
    voices = voices
      .map(voice => ({
        voiceURI: trimVoiceURI(voice.voiceURI),
        default: voice.default,
        localService: voice.localService,
      }))
      .sort((a, b) => a.voiceURI.localeCompare(b.voiceURI));

    const [localServices, nonLocalServices] = voices.reduce(
      (acc, voice) => {
        if (voice.localService) {
          acc[0].push(voice.voiceURI);
        } else {
          acc[1].push(voice.voiceURI);
        }
        return acc;
      },
      [[], []]
    );
    const defaultVoice = voices.find(voice => voice.default);

    voices = voices.map(voice => voice.voiceURI).sort();

    return {
      voicesCount: voices.length,
      voicesLocalCount: localServices.length,
      voicesDefault: defaultVoice ? defaultVoice.voiceURI : null,
      voicesSample: sample(voices, 5).join(","),
      voicesSha1: await sha1(voices.join("|")),
      voicesAllSsdeep: ssdeep.digest(voices.join("|")),
      voicesLocalSsdeep: ssdeep.digest(localServices.join("|")),
      voicesNonlocalSsdeep: ssdeep.digest(nonLocalServices.join("|")),
    };
  }

  function fetchVoices() {
    const promise = new Promise(resolve => {
      speechSynthesis.addEventListener("voiceschanged", function () {
        resolve(speechSynthesis.getVoices());
      });

      if (speechSynthesis.getVoices().length !== 0) {
        resolve(speechSynthesis.getVoices());
      }
    });

    const timeout = new Promise(resolve => {
      setTimeout(() => {
        resolve([]);
      }, 5000);
    });

    return Promise.race([promise, timeout]);
  }

  return fetchVoices().then(processVoices);
}

async function populateMediaCapabilities() {
  // Decoding: MP4 and WEBM are PDM dependant, while the other types are not, so for MP4 and WEBM we manually check for mimetypes.
  // We also don't make an extra check for media-source as both file and media-source end up calling the same code path except for
  // some prefs that block some mime types but we collect them.
  // Encoding: It isn't dependant on hardware, so we just skip it, but collect media.encoder.webm.enabled pref.
  const mimeTypes = [
    // WEBM
    "video/webm; codecs=vp9",
    "video/webm; codecs=vp8",
    "video/webm; codecs=av1",
    // MP4
    "video/mp4; codecs=vp9",
    "video/mp4; codecs=vp8",
    "video/mp4; codecs=hev1.1.0.L30.b0",
    "video/mp4; codecs=avc1.42000A",
  ];

  const videoConfig = {
    type: "file",
    video: {
      width: 1280,
      height: 720,
      bitrate: 10000,
      framerate: 30,
    },
  };

  // Generates a list of h264 codecs, then checks if they are supported.
  // Returns the highest supported level for each profile.
  async function h264CodecsSupported() {
    // Generate hex values for x.0, x.1, x.2 for x in [4, 6]
    const levels = [...Array(3).keys()]
      .map(i => [
        ((i + 4) * 10).toString(16),
        ((i + 4) * 10 + 1).toString(16),
        ((i + 4) * 10 + 2).toString(16),
      ])
      .flat();

    // Contains profiles without levels. They will be added
    // later in the loop.
    const profiles = ["avc1.4200", "avc1.4d00", "avc1.6e00", "avc1.7a00"];

    const supportLevels = {};
    for (const profile of profiles) {
      for (const level of levels) {
        const mimeType = `video/mp4; codecs=${profile}${level}`;
        videoConfig.video.contentType = mimeType;
        const capability =
          await navigator.mediaCapabilities.decodingInfo(videoConfig);

        if (capability.supported) {
          supportLevels[profile] = level;
        }
      }
    }

    return supportLevels;
  }

  async function getCapabilities() {
    const capabilities = {
      unsupported: [],
      notSmooth: [],
      notPowerEfficient: [],
      h264: await h264CodecsSupported(),
    };

    for (const mime of mimeTypes) {
      videoConfig.video.contentType = mime;
      const capability =
        await navigator.mediaCapabilities.decodingInfo(videoConfig);
      const shortMime = mime.split("=")[1];
      if (!capability.supported) {
        capabilities.unsupported.push(shortMime);
      } else {
        if (!capability.smooth) {
          capabilities.notSmooth.push(shortMime);
        }
        if (!capability.powerEfficient) {
          capabilities.notPowerEfficient.push(shortMime);
        }
      }
    }

    return capabilities;
  }

  const capabilities = await getCapabilities();

  return {
    mediaCapabilitiesUnsupported: JSON.stringify(capabilities.unsupported),
    mediaCapabilitiesNotSmooth: JSON.stringify(capabilities.notSmooth),
    mediaCapabilitiesNotEfficient: JSON.stringify(
      capabilities.notPowerEfficient
    ),
    mediaCapabilitiesH264: JSON.stringify(capabilities.h264),
  };
}

async function populateAudioFingerprint() {
  // Trimmed down version of https://github.com/fingerprintjs/fingerprintjs/blob/c463ca034747df80d95cc96a0a9c686d8cd001a5/src/sources/audio.ts
  // At that time, fingerprintjs was licensed with MIT.
  // Extended with detailed metrics from CreepJS audio fingerprinting
  const hashFromIndex = 4500;
  const hashToIndex = 5000;
  const context = new window.OfflineAudioContext(1, hashToIndex, 44100);

  const oscillator = context.createOscillator();
  oscillator.type = "triangle";
  oscillator.frequency.value = 10000;

  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -50;
  compressor.knee.value = 40;
  compressor.ratio.value = 12;
  compressor.attack.value = 0;
  compressor.release.value = 0.25;

  // Create analyser for frequency/time domain data
  const analyser = context.createAnalyser();

  // Connect audio graph: oscillator → compressor → analyser → destination
  oscillator.connect(compressor);
  compressor.connect(analyser);
  compressor.connect(context.destination);
  oscillator.start(0);

  const [renderPromise, finishRendering] = startRenderingAudio(context);
  const fingerprintPromise = renderPromise.then(
    buffer => getHash(buffer.getChannelData(0).subarray(hashFromIndex)),
    error => {
      if (error === "TIMEOUT" || error.name === "SUSPENDED") {
        return "TIMEOUT";
      }
      throw error;
    }
  );

  // Collect detailed metrics from analyser and compressor
  const detailedMetricsPromise = renderPromise.then(
    buffer => {
      const bins = buffer.getChannelData(0);

      // 1. Compressor Gain Reduction
      const compressorGainReduction = String(
        compressor.reduction?.value ?? compressor.reduction ?? 0
      );

      // 2. Float Frequency Data Sum
      const floatFrequencyData = new Float32Array(analyser.frequencyBinCount);
      analyser.getFloatFrequencyData(floatFrequencyData);
      const floatFrequencySum = String(
        [...floatFrequencyData].reduce((acc, n) => acc + Math.abs(n), 0)
      );

      // 3. Float Time Domain Data Sum
      let floatTimeDomainSum = "0";
      if ("getFloatTimeDomainData" in analyser) {
        const floatTimeDomainData = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(floatTimeDomainData);
        floatTimeDomainSum = String(
          [...floatTimeDomainData].reduce((acc, n) => acc + Math.abs(n), 0)
        );
      }

      // 4. Sample Snapshot Hash (100 samples from 4500-4600)
      const sampleSnapshot = [...bins].slice(4500, 4600);
      const sampleHash = hashAudioSamples(sampleSnapshot);

      // 5. Unique Sample Count
      const uniqueSamples = new Set(bins).size;

      return {
        audioCompressorGainReduction: compressorGainReduction,
        audioFloatFrequencySum: floatFrequencySum,
        audioFloatTimeDomainSum: floatTimeDomainSum,
        audioFingerprint2: sampleHash,
        audioUniqueSamples: uniqueSamples,
      };
    },
    _error => {
      // Return empty values on error
      return {
        audioCompressorGainReduction: "0",
        audioFloatFrequencySum: "0",
        audioFloatTimeDomainSum: "0",
        audioFingerprint2: "00000000",
        audioUniqueSamples: 0,
      };
    }
  );

  /**
   * Starts rendering the audio context.
   * When the returned function is called, the render process starts finishing.
   */
  function startRenderingAudio(context) {
    const renderTryMaxCount = 3;
    const renderRetryDelay = 500;
    const runningMaxAwaitTime = 500;
    const runningSufficientTime = 5000;
    let finalize = () => undefined;

    const resultPromise = new Promise((resolve, reject) => {
      let isFinalized = false;
      let renderTryCount = 0;
      let startedRunningAt = 0;

      context.oncomplete = event => resolve(event.renderedBuffer);

      const startRunningTimeout = () => {
        setTimeout(
          () => reject("TIMEMOUT"),
          Math.min(
            runningMaxAwaitTime,
            startedRunningAt + runningSufficientTime - Date.now()
          )
        );
      };

      const tryRender = () => {
        try {
          context.startRendering();

          switch (context.state) {
            case "running":
              startedRunningAt = Date.now();
              if (isFinalized) {
                startRunningTimeout();
              }
              break;

            // Sometimes the audio context doesn't start after calling `startRendering` (in addition to the cases where
            // audio context doesn't start at all). A known case is starting an audio context when the browser tab is in
            // background on iPhone. Retries usually help in this case.
            case "suspended":
              // The audio context can reject starting until the tab is in foreground. Long fingerprint duration
              // in background isn't a problem, therefore the retry attempts don't count in background. It can lead to
              // a situation when a fingerprint takes very long time and finishes successfully. FYI, the audio context
              // can be suspended when `document.hidden === false` and start running after a retry.
              if (!document.hidden) {
                renderTryCount++;
              }
              if (isFinalized && renderTryCount >= renderTryMaxCount) {
                reject("SUSPENDED");
              } else {
                setTimeout(tryRender, renderRetryDelay);
              }
              break;
          }
        } catch (error) {
          reject(error);
        }
      };

      tryRender();

      finalize = () => {
        if (!isFinalized) {
          isFinalized = true;
          if (startedRunningAt > 0) {
            startRunningTimeout();
          }
        }
      };
    });

    return [resultPromise, finalize];
  }

  function getHash(signal) {
    let hash = 0;
    for (let i = 0; i < signal.length; ++i) {
      hash += Math.abs(signal[i]);
    }
    // 10e13 is the maximum safe number we can use.
    // 10e14 is over Number.MAX_SAFE_INTEGER, techinically it isn't but
    // 35.x * 10e14 is over Number.MAX_SAFE_INTEGER. We are losing one digit
    // of precision but it should hopefully be enough.
    return hash * 10e13;
  }

  function hashAudioSamples(samples) {
    // Sum absolute values of samples (matching CreepJS approach), then convert to hex
    const sum = samples.reduce((acc, n) => acc + Math.abs(n), 0);
    const hash = Math.floor(sum * 1000000)
      .toString(16)
      .substring(0, 8);
    return hash;
  }

  finishRendering();

  // Wait for both promises and merge results
  const combinedPromise = Promise.all([
    fingerprintPromise,
    detailedMetricsPromise,
  ]).then(([fingerprint, detailedMetrics]) => ({
    audioFingerprint: fingerprint,
    ...detailedMetrics,
  }));

  return combinedPromise;
}

async function populateCSSQueries() {
  return {
    monochrome: matchMedia("(monochrome)").matches,
  };
}

async function populateCSSSystemColors() {
  const systemColors = [
    "Canvas",
    "CanvasText",
    "LinkText",
    "VisitedText",
    "ActiveText",
    "ButtonFace",
    "ButtonText",
    "ButtonBorder",
    "ButtonHighlight",
    "Field",
    "FieldText",
    "Highlight",
    "HighlightText",
    "SelectedItem",
    "SelectedItemText",
    "AccentColor",
    "AccentColorText",
    "Mark",
    "MarkText",
    "GrayText",
    "ActiveBorder",
    "ActiveCaption",
    "AppWorkspace",
    "Background",
    "ButtonShadow",
    "CaptionText",
    "InactiveBorder",
    "InactiveCaption",
    "InactiveCaptionText",
    "InfoBackground",
    "InfoText",
    "Menu",
    "MenuText",
    "Scrollbar",
    "ThreeDDarkShadow",
    "ThreeDFace",
    "ThreeDHighlight",
    "ThreeDLightShadow",
    "ThreeDShadow",
    "Window",
    "WindowFrame",
    "WindowText",
  ];

  const rgbToHex = rgb => {
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) {
      return rgb;
    }
    const [, r, g, b] = match;
    return [r, g, b]
      .map(x => parseInt(x, 10).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  };

  const div = document.createElement("div");
  document.body.appendChild(div);

  const results = [];
  for (const colorName of systemColors) {
    div.style.backgroundColor = "";
    div.style.backgroundColor = colorName;
    if (!div.style.backgroundColor) {
      results.push({ [colorName]: null });
    } else {
      results.push({
        [colorName]: rgbToHex(getComputedStyle(div).backgroundColor),
      });
    }
  }

  document.body.removeChild(div);

  return {
    cssSystemColors: JSON.stringify(results),
  };
}

async function populateCSSSystemFonts() {
  const systemFonts = [
    "caption",
    "icon",
    "menu",
    "message-box",
    "small-caption",
    "status-bar",
    "serif",
    "sans-serif",
    "monospace",
    "cursive",
    "fantasy",
    "system-ui",
    "Arial",
    "Helvetica",
    "Times New Roman",
    "Courier New",
    "Verdana",
    "Georgia",
  ];

  const div = document.createElement("div");
  div.textContent = "Test";
  document.body.appendChild(div);

  const results = [];
  for (const fontName of systemFonts) {
    div.style.fontFamily = fontName;
    const computed = getComputedStyle(div);
    const value = computed.fontSize + " " + computed.fontFamily;
    results.push({ [fontName]: value });
  }

  document.body.removeChild(div);

  return {
    cssSystemFonts: JSON.stringify(results),
  };
}

async function populateClientRects() {
  function serializeDOMRect(rect) {
    if (!rect) {
      return null;
    }
    return {
      b: rect.bottom,
      h: rect.height,
      l: rect.left,
      r: rect.right,
      t: rect.top,
      w: rect.width,
      x: rect.x,
      y: rect.y,
    };
  }

  const container = document.createElement("div");
  container.style.cssText = "position: absolute; left: -9999px; width: 100px;";
  document.body.appendChild(container);

  const testElements = [
    { border: "2.715px", padding: "3.98px", marginLeft: "12.12px" },
    { border: "5px", padding: "10px", marginLeft: "20px" },
    { border: "1.5px", padding: "2.5px", marginLeft: "5.5px" },
    { border: "3px", padding: "7px", marginLeft: "15px" },
    { border: "4.25px", padding: "6.75px", marginLeft: "10.5px" },
    { border: "2px", padding: "5px", marginLeft: "8px" },
    { border: "6px", padding: "12px", marginLeft: "25px" },
    { border: "1px", padding: "1px", marginLeft: "3px" },
    { border: "3.5px", padding: "8.5px", marginLeft: "18.5px" },
    { border: "4px", padding: "9px", marginLeft: "22px" },
    { border: "2.25px", padding: "4.25px", marginLeft: "7.25px" },
    { border: "5.5px", padding: "11.5px", marginLeft: "28.5px" },
  ];

  const elementMeasurements = [];
  for (let i = 0; i < testElements.length; i++) {
    const elem = document.createElement("div");
    const style = testElements[i];
    elem.style.cssText = `
      border: ${style.border} solid red;
      padding: ${style.padding};
      margin-left: ${style.marginLeft};
      width: 50px;
      height: 20px;
    `;
    elem.textContent = "test";
    container.appendChild(elem);
    elementMeasurements.push(elem);
  }

  const results = {};

  for (let i = 0; i < elementMeasurements.length; i++) {
    const elem = elementMeasurements[i];
    const metricNum = String(i + 1).padStart(2, "0");

    const elemGCR = elem.getClientRects()[0];
    results[`clientrectsElementGcr${metricNum}`] = JSON.stringify(
      serializeDOMRect(elemGCR)
    );

    const elemGBCR = elem.getBoundingClientRect();
    results[`clientrectsElementGbcr${metricNum}`] = JSON.stringify(
      serializeDOMRect(elemGBCR)
    );

    const range = document.createRange();
    range.selectNodeContents(elem);
    const rangeGCR = range.getClientRects()[0];
    results[`clientrectsRangeGcr${metricNum}`] = JSON.stringify(
      serializeDOMRect(rangeGCR)
    );

    const rangeNode = document.createRange();
    rangeNode.selectNode(elem);
    const rangeNodeGBCR = rangeNode.getBoundingClientRect();
    results[`clientrectsRangeGbcr${metricNum}`] = JSON.stringify(
      serializeDOMRect(rangeNodeGBCR)
    );
  }

  const knownElement = document.createElement("div");
  knownElement.style.cssText =
    "width: 100px; height: 100px; border: 10px solid red;";
  knownElement.textContent = "known";
  container.appendChild(knownElement);
  const knownRect = knownElement.getBoundingClientRect();
  results.clientrectsKnownDimensions = JSON.stringify(
    serializeDOMRect(knownRect)
  );

  const ghostElement = document.createElement("div");
  ghostElement.style.cssText = "width: 0; height: 0;";
  container.appendChild(ghostElement);
  const ghostRect = ghostElement.getBoundingClientRect();
  results.clientrectsGhostDimensions = JSON.stringify(
    serializeDOMRect(ghostRect)
  );

  results.clientrectsTextFontFamily = getComputedStyle(knownElement).fontFamily;

  const emojiDiv = document.createElement("div");
  emojiDiv.style.cssText = "font-size: 200px;";
  container.appendChild(emojiDiv);

  const emojis = ["👾", "🤖", "🦄", "🎃", "🎨", "🌈"];

  for (let i = 0; i < emojis.length; i++) {
    emojiDiv.textContent = emojis[i];
    const rect = emojiDiv.getBoundingClientRect();
    const metricNum = String(i + 1).padStart(2, "0");
    results[`clientrectsEmoji${metricNum}`] = JSON.stringify(
      serializeDOMRect(rect)
    );
  }
  results.clientrectsEmojiFontFamily = getComputedStyle(emojiDiv).fontFamily;

  document.body.removeChild(container);

  return results;
}

async function populateSVGRect() {
  const SVG_NS = "http://www.w3.org/2000/svg";

  const EMOJIS = [
    "\u{1F600}",
    "\u263A",
    "\u{1F9D5}\u200D\u2642\uFE0F",
    "\u2670",
    "\u2638",
    "\u26A7",
    "\u2049",
    "\u2139",
    "\u{1F3F3}\uFE0F\u200D\u26A7\uFE0F",
    "\u{1F972}",
    "\u2639",
    "\u2620",
    "\u{1F9D1}\u200D\u{1F9B0}",
    "\u{1F9CF}\u200D\u2642\uFE0F",
    "\u26F7",
    "\u{1F9D1}\u200D\u{1F91D}\u200D\u{1F9D1}",
    "\u2618",
    "\u26F0",
    "\u26E9",
    "\u26F4",
    "\u2708",
    "\u23F1",
    "\u26C8",
    "\u26C2",
    "\u26F1",
    "\u26C3",
    "\u26C4",
    "\u26F8",
    "\u264F",
    "\u26D1",
    "\u2328",
    "\u26F9",
    "\u270F",
  ];

  const CSS_FONT_FAMILY = `
    'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol',
    'Noto Color Emoji', 'EmojiOne Color', 'Android Emoji',
    sans-serif
  `.trim();

  const container = document.createElement("div");
  container.id = "svg-container";
  container.style.cssText = "position: absolute; left: -9999px; height: auto;";
  document.body.appendChild(container);

  const svg = document.createElementNS(SVG_NS, "svg");
  const g = document.createElementNS(SVG_NS, "g");
  g.id = "svgBox";
  svg.appendChild(g);

  const textElements = [];
  for (const emoji of EMOJIS) {
    const text = document.createElementNS(SVG_NS, "text");
    text.setAttribute("x", "32");
    text.setAttribute("y", "32");
    text.setAttribute("class", "svgrect-emoji");
    text.style.cssText = `
      font-family: ${CSS_FONT_FAMILY};
      font-size: 200px;
      position: absolute;
      transform: scale(1.000999);
    `;
    text.textContent = emoji;
    g.appendChild(text);
    textElements.push(text);
  }

  container.appendChild(svg);

  function serializeSVGRect(rect) {
    if (!rect) {
      return null;
    }
    return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
  }

  const results = {};

  try {
    const bbox = g.getBBox();
    results.svgBbox = JSON.stringify(serializeSVGRect(bbox));
  } catch {
    results.svgBbox = null;
  }

  try {
    results.svgComputedTextLength = textElements[0]
      .getComputedTextLength()
      .toString();
  } catch {
    results.svgComputedTextLength = null;
  }

  try {
    const extent = textElements[0].getExtentOfChar(0);
    results.svgExtentOfChar = JSON.stringify(serializeSVGRect(extent));
  } catch {
    results.svgExtentOfChar = null;
  }

  try {
    const numChars = textElements[0].getNumberOfChars();
    results.svgSubstringLength = textElements[0]
      .getSubStringLength(0, Math.min(10, numChars))
      .toString();
  } catch {
    results.svgSubstringLength = null;
  }

  const pattern = new Set();
  const emojiSet = [];
  for (let i = 0; i < textElements.length; i++) {
    try {
      const dimensions = String(textElements[i].getComputedTextLength());
      if (!pattern.has(dimensions)) {
        pattern.add(dimensions);
        emojiSet.push(EMOJIS[i]);
      }
    } catch {
      // Skip failed measurements
    }
  }
  results.svgEmojiSet = JSON.stringify(emojiSet);

  document.body.removeChild(container);

  return results;
}

async function populateNavigatorProperties() {
  return {
    oscpu: navigator.oscpu,
    pdfViewer: navigator.pdfViewerEnabled,
    platform: navigator.platform,
  };
}

async function populatePointerInfo() {
  const capabilities = {
    None: 0,
    Coarse: 1 << 0,
    Fine: 1 << 1,
  };

  const q = {
    isCoarse: matchMedia("(pointer: coarse)").matches,
    isFine: matchMedia("(pointer: fine)").matches,
    isAnyCoarse: matchMedia("(any-pointer: coarse)").matches,
    isAnyFine: matchMedia("(any-pointer: fine)").matches,
  };

  // Pointer media query matches for primary pointer. So, it can be
  // only one of coarse/fine/none.
  let pointerType;
  if (q.isCoarse) {
    pointerType = capabilities.Coarse;
  } else {
    pointerType = q.isFine ? capabilities.Fine : capabilities.None;
  }

  // Any-pointer media query matches for any pointer available. So, it
  // can be both coarse and fine value, be one of them, or none.
  const anyPointerType =
    (q.isAnyCoarse && capabilities.Coarse) | (q.isAnyFine && capabilities.Fine);

  return {
    pointerType,
    anyPointerType,
  };
}

async function populateICEFoundations() {
  // ICE Foundations timeout on CI, so we skip them for automation.
  if (window.location.hash === "#automation") {
    debug("Skipping ICE Foundations for automation");
    return {};
  }

  function getFoundationsAndLatencies() {
    const { promise, resolve, reject } = Promise.withResolvers();

    // With no other peers, we wouldn't get prflx candidates.
    // Relay type of candidates require a turn server.
    // srflx candidates require a stun server.
    // So, we'll only get host candidates.
    const result = {
      latencies: [],
      foundations: [],
    };

    let lastTime;
    function calculateLatency() {
      const now = window.performance.now();
      const latency = window.performance.now() - lastTime;
      lastTime = now;
      return latency;
    }

    const pc = new RTCPeerConnection();
    pc.onicecandidate = e => {
      const latency = calculateLatency();
      if (e.candidate && e.candidate.candidate !== "") {
        result.latencies.push(latency);
        result.foundations.push(e.candidate.foundation);
      }
    };
    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState !== "complete") {
        return;
      }
      pc.close();
      resolve(result);
    };

    pc.createOffer({ offerToReceiveAudio: 1 })
      .then(desc => {
        pc.setLocalDescription(desc);
        lastTime = window.performance.now();
      })
      .catch(reject);

    // Add timeout to prevent hanging indefinitely
    const timeout = setTimeout(() => {
      pc.close();
      resolve(result);
    }, 5000);

    return promise.then(res => {
      clearTimeout(timeout);
      return res;
    });
  }

  // Run get candidates multiple times to see if foundation order changes
  // and calculate standard deviation of latencies
  const latencies = [];
  const foundations = {};
  for (let i = 0; i < 10; i++) {
    const result = await getFoundationsAndLatencies();

    latencies.push(result.latencies);

    const hostFoundations = result.foundations.join("");
    if (hostFoundations) {
      foundations[hostFoundations] = (foundations[hostFoundations] ?? 0) + 1;
    }
  }

  const sdLatencies = [];
  for (let i = 0; i < (latencies?.[0]?.length ?? 0); i++) {
    sdLatencies.push(standardDeviation(latencies.map(a => a[i])));
  }

  const sd =
    sdLatencies.length > 1
      ? (sdLatencies.reduce((acc, val) => acc + val, 0) / sdLatencies.length) *
        1000
      : 0;

  return {
    iceSd: sd,
    iceOrder: Object.keys(foundations).length,
  };
}

async function populateSDPCodecList() {
  if (!window.RTCPeerConnection) {
    return {};
  }
  if (window.location.hash === "#automation") {
    return {};
  }

  const pc = new RTCPeerConnection({ iceServers: [] });
  pc.createDataChannel("fp");

  const offer = await pc.createOffer();
  pc.close();

  // Extract codec-related SDP lines (strip session-specific values)
  const lines = offer.sdp.split("\r\n");
  const codecLines = lines.filter(
    l =>
      l.startsWith("m=") ||
      l.startsWith("a=rtpmap:") ||
      l.startsWith("a=fmtp:") ||
      l.startsWith("a=rtcp-fb:")
  );

  return { sdpCodecList: JSON.stringify(codecLines) };
}

async function populateWebAuthnCapabilities() {
  if (!window.PublicKeyCredential) {
    return {};
  }
  if (!PublicKeyCredential.getClientCapabilities) {
    return {};
  }

  const caps = await PublicKeyCredential.getClientCapabilities();
  return { webauthnCapabilities: JSON.stringify(caps) };
}

async function populateStorageQuota() {
  if (!navigator.storage || !navigator.storage.estimate) {
    return {};
  }

  const estimate = await navigator.storage.estimate();
  return { storageQuota: Math.round(estimate.quota / 1048576) };
}

async function populateSensorInfo() {
  const { promise, resolve } = Promise.withResolvers();

  const events = {
    devicemotion: 0,
    deviceorientation: 0,
    deviceorientationabsolute: 0,
  };
  const results = {
    frequency: { ...events },
    decPlaces: { ...events },
  };

  const eventCounter = { ...events };
  const eventDecPlaces = { ...events };
  const eventStarts = { ...events };

  const processEvent = eventName => e => {
    eventCounter[eventName] += 1;

    // Weird behaviour for devicemotion event, probably a bug.
    // First devicemotion event has accelerationIncludingGravity but not acceleration.
    const property =
      e.acceleration?.x || e.alpha || e.accelerationIncludingGravity?.x;
    if (!property) {
      return;
    }
    const decPlaces = decimalPlaces(property);
    eventDecPlaces[eventName] =
      eventDecPlaces[eventName] > decPlaces
        ? eventDecPlaces[eventName]
        : decPlaces;
  };
  const processResult = eventName => {
    const elapsed = (window.performance.now() - eventStarts[eventName]) / 1000;
    results.frequency[eventName] = Math.round(
      eventCounter[eventName] / elapsed
    );
    results.decPlaces[eventName] = eventDecPlaces[eventName];
  };

  const listeners = [];
  for (const eventName in events) {
    eventStarts[eventName] = window.performance.now();
    const listener = processEvent(eventName);
    window.addEventListener(eventName, listener);
    listeners.push([eventName, listener]);
    setTimeout(() => processResult(eventName), 10 * 1000);
  }

  // A whole extra second to process results
  setTimeout(() => {
    for (const [eventName, listener] of listeners) {
      window.removeEventListener(eventName, listener);
    }
    resolve({
      motionDecimals: results.decPlaces.devicemotion,
      orientationDecimals: results.decPlaces.deviceorientation,
      orientationabsDecimals: results.decPlaces.deviceorientationabsolute,
      motionFreq: results.frequency.devicemotion,
      orientationFreq: results.frequency.deviceorientation,
      orientationabsFreq: results.frequency.deviceorientationabsolute,
    });
  }, 11 * 1000);

  return promise;
}

async function populateMathML() {
  // We only collect width of the math elements.
  // FPJS reports that height of elements fluctuates.
  // https://github.com/fingerprintjs/fingerprintjs/blob/143479cba3d4bfd6f2cd773c61c26e8e74a70c06/src/sources/font_preferences.ts#L128-L132
  // We use getBoundingClientRect().width and not offsetWidth as math elements don't have a offsetWidth property.

  // Old metrics: collect elements with numeric IDs (1-10)
  const oldMathElements = [...document.querySelectorAll("math[id]")].filter(
    el => /^\d+$/.test(el.id)
  );
  const oldMetrics = oldMathElements.reduce((acc, el) => {
    acc["mathml" + el.id] = el.getBoundingClientRect().width.toString();
    return acc;
  }, {});

  // New metrics: collect elements with "new-" prefix as an array
  const newMathElements = [...document.querySelectorAll("math[id^='new-']")];
  const mathmlValues = newMathElements.map(
    el => el.getBoundingClientRect().width
  );

  // Get the actual font-family being used for MathML rendering
  const firstMathElement = document.querySelector("math");
  const mathmlFontFamily = firstMathElement
    ? getComputedStyle(firstMathElement).fontFamily
    : "";

  return {
    ...oldMetrics,
    mathmlDiagValues: mathmlValues,
    mathmlDiagFontFamily: mathmlFontFamily,
  };
}

async function populateAudioDeviceProperties() {
  const ctx = new AudioContext();

  try {
    // Add a timeout to prevent hanging indefinitely if the user has no audio hardware
    await Promise.race([
      ctx.resume(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("AudioContext.resume() timeout")),
          5000
        )
      ),
    ]);
  } catch (e) {
    throw new Error(
      "AudioContext.resume error, probably a timeout, user may not have audio hardware"
    );
  }

  // Give firefox some time to calculate latency
  await new Promise(resolve => setTimeout(resolve, 2000));

  // All the other properties (min/max decibels, smoothingTimeConstant,
  // fftSize, frequencyBinCount, baseLatency) are hardcoded.
  const result = {
    audioFrames: ctx.outputLatency * ctx.sampleRate,
    audioRate: ctx.sampleRate,
    audioChannels: ctx.destination.maxChannelCount,
  };
  return result;
}

async function populateTimezoneWeb() {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = new Date().getTimezoneOffset();
    return {
      timezoneWeb: timezone || "",
      timezoneOffsetWeb: String(offset),
    };
  } catch (e) {
    return {
      timezoneWeb: "",
      timezoneOffsetWeb: "0",
    };
  }
}

// A helper function to generate an array of asynchronous functions to populate
// canvases using both software and hardware rendering.
function getCanvasSources() {
  const canvasSources = [populateWebGLCanvases];

  // Create a source with both software and hardware rendering
  return canvasSources
    .map(source => {
      const functions = [
        async () => source({ forceSoftwareRendering: true }),
        async () => source({ forceSoftwareRendering: false }),
      ];

      // Using () => {} renames the function, so we rename them again.
      // This is needed for error collection.
      Object.defineProperty(functions[0], "name", {
        value: source.name + "Software",
      });
      Object.defineProperty(functions[1], "name", {
        value: source.name,
      });
      return functions;
    })
    .flat();
}

// =======================================================================
// Setup & Populating

/* Pick any local font, we just don't want to needlessly increase binary size */
const LocalFiraSans = new FontFace(
  "LocalFiraSans",
  "url('chrome://global/content/usercharacteristics/usercharacteristics.woff') format('woff')"
);

if (document.readyState === "loading") {
  window.addEventListener("load", startPopulating);
} else {
  startPopulating();
}

async function startPopulating() {
  const errors = [];

  await LocalFiraSans.load()
    .then(font => document.fonts.add(font))
    .catch(async e => {
      // Fail silently
      errors.push(`LocalFiraSans: ${await stringifyError(e)}`);
    });

  // Data contains key: (Promise<any> | any) pairs. The keys are identifiers
  // for the data and the values are either a promise that returns a value,
  // or a value. Promises are awaited and values are resolved immediately.
  const data = {};
  const sources = [
    ...getCanvasSources(),
    populateVoiceList,
    populateMediaCapabilities,
    populateAudioFingerprint,
    populatePointerInfo,
    populateICEFoundations,
    populateSDPCodecList,
    populateWebAuthnCapabilities,
    populateStorageQuota,
    populateSensorInfo,
    populateMathML,
    populateCSSQueries,
    populateCSSSystemColors,
    populateCSSSystemFonts,
    populateClientRects,
    populateSVGRect,
    populateNavigatorProperties,
    populateAudioDeviceProperties,
    populateTimezoneWeb,
  ];
  // Catches errors in promise-creating functions. E.g. if populateVoiceList
  // throws an error before returning any of its `key: (Promise<any> | any)`
  // pairs, we catch it here. This also catches non-async function errors
  for (const source of sources) {
    try {
      Object.assign(data, await timeoutPromise(source(), 5 * 60 * 1000));
    } catch (error) {
      errors.push(`${source.name}: ${await stringifyError(error)}`);
    }
  }

  debug("Awaiting", Object.keys(data).length, "data promises.");
  await Promise.allSettled(Object.values(data));

  debug("Sizes of extractions:");
  const output = new Map();
  for (const key in data) {
    try {
      let outputValue = await data[key];
      output.set(key, outputValue);
      debug(key, output.get(key) ? output.get(key).length : "null");
    } catch (e) {
      debug("Promise rejected for", key, "Error:", e);
      errors.push(`${key}: ${await stringifyError(e)}`);
    }
  }
  output.jsErrors = JSON.stringify(errors);

  document.dispatchEvent(
    new CustomEvent("UserCharacteristicsDataDone", {
      bubbles: true,
      detail: {
        debug: debugMsgs,
        output,
      },
    })
  );
}

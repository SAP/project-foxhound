/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-*/
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

/**
 * Imports necessary modules from ChromeUtils.
 */
const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  DownloadUtils: "resource://gre/modules/DownloadUtils.sys.mjs",
  HttpInference: "chrome://global/content/ml/HttpInference.sys.mjs",
  IndexedDBCache: "chrome://global/content/ml/ModelHub.sys.mjs",
  ModelHub: "chrome://global/content/ml/ModelHub.sys.mjs",
  getInferenceProcessInfo: "chrome://global/content/ml/Utils.sys.mjs",
});

const { ExecutionPriority, EngineProcess, PipelineOptions } =
  ChromeUtils.importESModule(
    "chrome://global/content/ml/EngineProcess.sys.mjs"
  );

/**
 * Preferences for machine learning enablement and model hub configuration.
 */
const MODEL_HUB_ROOT_URL = Services.prefs.getStringPref(
  "browser.ml.modelHubRootUrl"
);
const MODEL_HUB_URL_TEMPLATE = Services.prefs.getStringPref(
  "browser.ml.modelHubUrlTemplate"
);
const THIRTY_SECONDS = 30 * 1000;

let modelHub = null;
let modelCache = null;

const TASKS = [
  "text-classification",
  "token-classification",
  "question-answering",
  "fill-mask",
  "summarization",
  "translation",
  "text2text-generation",
  "text-generation",
  "zero-shot-classification",
  "audio-classification",
  "zero-shot-audio-classification",
  "automatic-speech-recognition",
  "text-to-audio",
  "image-to-text",
  "image-classification",
  "image-segmentation",
  "zero-shot-image-classification",
  "object-detection",
  "zero-shot-object-detection",
  "document-question-answering",
  "image-to-image",
  "depth-estimation",
  "feature-extraction",
  "image-feature-extraction",
];

const DTYPE = ["fp32", "fp16", "q8", "int8", "uint8", "q4", "bnb4", "q4f16"];
const NUM_THREADS = Array.from(
  { length: navigator.hardwareConcurrency || 4 },
  (_, i) => i + 1
);
let engineParent = null;

/**
 * Presets for the pad
 */
const INFERENCE_PAD_PRESETS = {
  "image-to-text": {
    inputArgs: [
      "https://huggingface.co/datasets/mishig/sample_images/resolve/main/football-match.jpg",
    ],
    runOptions: {},
    task: "image-to-text",
    modelId: "mozilla/distilvit",
    modelRevision: "main",
    modelHub: "huggingface",
    dtype: "q8",
    device: "wasm",
  },
  ner: {
    inputArgs: ["Sarah lives in the United States of America"],
    runOptions: {},
    task: "token-classification",
    modelId: "Xenova/bert-base-NER",
    modelRevision: "main",
    modelHub: "huggingface",
    dtype: "q8",
    device: "wasm",
  },
  summary: {
    inputArgs: [
      "The tower is 324 metres (1,063 ft) tall, about the same height as an 81-storey building, and the tallest structure in Paris. Its base is square, measuring 125 metres (410 ft) on each side. During its construction, the Eiffel Tower surpassed the Washington Monument to become the tallest man-made structure in the world, a title it held for 41 years until the Chrysler Building in New York City was finished in 1930. It was the first structure to reach a height of 300 metres. Due to the addition of a broadcasting aerial at the top of the tower in 1957, it is now taller than the Chrysler Building by 5.2 metres (17 ft). Excluding transmitters, the Eiffel Tower is the second tallest free-standing structure in France after the Millau Viaduct.",
    ],
    runOptions: {
      max_new_tokens: 100,
    },
    task: "summarization",
    modelId: "Xenova/long-t5-tglobal-base-16384-book-summary",
    modelRevision: "main",
    modelHub: "huggingface",
    dtype: "q8",
    device: "wasm",
  },
  zero: {
    inputArgs: [
      "Last week I upgraded my iOS version and ever since then my phone has been overheating whenever I use your app.",
      ["mobile", "billing", "website", "account access"],
    ],
    runOptions: {},
    task: "zero-shot-classification",
    modelId: "Xenova/mobilebert-uncased-mnli",
    modelRevision: "main",
    modelHub: "huggingface",
    dtype: "q8",
    device: "wasm",
  },
  feature: {
    inputArgs: [["This is an example sentence", "Each sentence is converted"]],
    runOptions: { pooling: "mean", normalize: true },
    task: "feature-extraction",
    modelId: "Xenova/all-MiniLM-L6-v2",
    modelRevision: "main",
    modelHub: "huggingface",
    dtype: "q8",
    device: "wasm",
  },
};

const PREDEFINED = Object.keys(INFERENCE_PAD_PRESETS);

/**
 * Gets an instance of ModelHub. Initializes it if it doesn't already exist.
 *
 * @returns {ModelHub} The ModelHub instance.
 */
function getModelHub() {
  if (!modelHub) {
    modelHub = new lazy.ModelHub({
      rootUrl: MODEL_HUB_ROOT_URL,
      urlTemplate: MODEL_HUB_URL_TEMPLATE,
    });
  }
  return modelHub;
}

/**
 * Formats a number of bytes into a human-readable string.
 *
 * @param {number} bytes - The number of bytes to format.
 * @returns {string} The formatted string.
 */
function formatBytes(bytes) {
  const size = lazy.DownloadUtils.convertByteUnits(bytes);
  return `${size[0]} ${size[1]}`;
}

let updateStatusInterval = null;

/**
 * Displays engines info in a table.
 *
 * @async
 */

async function updateStatus() {
  if (!engineParent) {
    return;
  }

  let info;

  // Fetch the engine status info
  try {
    info = await engineParent.getStatus();
  } catch (e) {
    engineParent = null; // let's re-create it on errors.
    info = new Map();
  }

  // Get the container where the table will be displayed
  let tableContainer = document.getElementById("statusTableContainer");

  // Clear the container if the map is empty
  if (info.size === 0) {
    tableContainer.innerHTML = ""; // Clear any existing table
    if (updateStatusInterval) {
      clearInterval(updateStatusInterval); // Clear the interval if it exists
      updateStatusInterval = null; // Reset the interval variable
    }
    return; // Exit the function early if there's no data to display
  }

  // Create the fragment for the table content
  let fragment = document.createDocumentFragment();

  // Create the table element
  let table = document.createElement("table");
  table.border = "1";

  // Create the header of the table
  let thead = document.createElement("thead");
  let headerRow = document.createElement("tr");

  let columns = [
    "Engine ID",
    "Status",
    "Model ID",
    "Quantization",
    "Device",
    "Timeout",
  ];

  columns.forEach(col => {
    let th = document.createElement("th");
    th.textContent = col;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create the body of the table
  let tbody = document.createElement("tbody");

  // Iterate over the info map
  for (let [engineId, engineInfo] of info.entries()) {
    let row = document.createElement("tr");

    // Create a cell for each piece of data
    let engineIdCell = document.createElement("td");
    engineIdCell.textContent = engineId;
    row.appendChild(engineIdCell);

    let statusCell = document.createElement("td");
    statusCell.textContent = engineInfo.status;
    row.appendChild(statusCell);

    let modelIdCell = document.createElement("td");
    modelIdCell.textContent = engineInfo.options?.modelId || "N/A";
    row.appendChild(modelIdCell);

    let dtypeCell = document.createElement("td");
    dtypeCell.textContent = engineInfo.options?.dtype || "N/A";
    row.appendChild(dtypeCell);

    let deviceCell = document.createElement("td");
    deviceCell.textContent = engineInfo.options?.device || "N/A";
    row.appendChild(deviceCell);

    let timeoutCell = document.createElement("td");
    timeoutCell.textContent = engineInfo.options?.timeoutMS || "N/A";
    row.appendChild(timeoutCell);

    // Append the row to the table body
    tbody.appendChild(row);
  }

  table.appendChild(tbody);
  fragment.appendChild(table);

  // Replace the old table with the new one
  tableContainer.innerHTML = "";
  tableContainer.appendChild(fragment);

  // If no interval exists, set it to update the table periodically
  if (!updateStatusInterval) {
    updateStatusInterval = setInterval(updateStatus, 1000); // Update every second
  }
}

let updateInterval;

/**
 * Displays process information in a table. Only includes processes of type "inference".
 *
 * @async
 */
async function updateProcInfo() {
  let info = await lazy.getInferenceProcessInfo();
  let tableContainer = document.getElementById("procInfoTableContainer");
  let fragment = document.createDocumentFragment();
  let table = document.createElement("table");
  table.border = "1";
  let thead = document.createElement("thead");
  let headerRow = document.createElement("tr");
  let th1 = document.createElement("th");
  document.l10n.setAttributes(th1, "about-inference-pid");
  headerRow.appendChild(th1);
  let th2 = document.createElement("th");
  document.l10n.setAttributes(th2, "about-inference-memory");
  headerRow.appendChild(th2);

  thead.appendChild(headerRow);
  table.appendChild(thead);

  let foundInference = "pid" in info;
  let tbody = document.createElement("tbody");

  if (foundInference) {
    let row = document.createElement("tr");

    let pidCell = document.createElement("td");
    pidCell.textContent = info.pid;
    row.appendChild(pidCell);

    let memoryCell = document.createElement("td");
    memoryCell.textContent = formatBytes(info.memory);
    row.appendChild(memoryCell);

    tbody.appendChild(row);
  }

  table.appendChild(tbody);

  if (foundInference) {
    table.appendChild(tbody);
    fragment.appendChild(table);

    if (!updateInterval) {
      // If the interval hasn't been set yet, set it
      updateInterval = setInterval(updateProcInfo, 5000);
    }
  } else {
    let noneLabel = document.createElement("div");
    document.l10n.setAttributes(noneLabel, "about-inference-no-processes");
    fragment.appendChild(noneLabel);

    // If no inference processes are found, stop the interval
    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null; // Reset the interval variable
    }
  }

  tableContainer.innerHTML = "";
  tableContainer.appendChild(fragment);
}

async function updateModels() {
  let cache = await lazy.IndexedDBCache.init();
  let models = await cache.listModels();
  let modelFilesDiv = document.getElementById("modelFiles");

  // Use DocumentFragment to avoid reflows
  let fragment = document.createDocumentFragment();

  for (const { name: model, revision } of models) {
    let files = await cache.listFiles({ model, revision });

    // Create a new table for the current model
    let table = document.createElement("table");

    // caption block
    let caption = document.createElement("caption");
    let modelInfo = document.createElement("div");
    modelInfo.textContent = `${model} (${revision})`;
    let deleteButton = document.createElement("button");
    document.l10n.setAttributes(deleteButton, "about-inference-delete-button");
    deleteButton.onclick = async () => {
      await cache.deleteModels({ model, revision });
      modelFilesDiv.removeChild(table); // Remove the table from the DOM
    };

    modelInfo.appendChild(deleteButton);
    caption.appendChild(modelInfo);
    table.appendChild(caption);

    // Create table headers
    let thead = document.createElement("thead");
    let headerRow = document.createElement("tr");
    let thFile = document.createElement("th");
    document.l10n.setAttributes(thFile, "about-inference-file");
    headerRow.appendChild(thFile);
    thFile = document.createElement("th");
    document.l10n.setAttributes(thFile, "about-inference-size");
    headerRow.appendChild(thFile);
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body
    let tbody = document.createElement("tbody");
    let totalSize = 0;

    for (const file of files) {
      let row = document.createElement("tr");
      let tdFile = document.createElement("td");
      tdFile.textContent = file.path;
      row.appendChild(tdFile);
      const fileSize = parseInt(
        file.headers.fileSize || file.headers["Content-Length"] || 0
      );

      tdFile = document.createElement("td");
      tdFile.textContent = formatBytes(fileSize);
      row.appendChild(tdFile);
      tbody.appendChild(row);
      totalSize += fileSize;
    }

    // Append the total line
    let totalRow = document.createElement("tr");
    let tdTotalLabel = document.createElement("td");
    document.l10n.setAttributes(tdTotalLabel, "about-inference-total");
    totalRow.appendChild(tdTotalLabel);

    let tdTotalValue = document.createElement("td");
    tdTotalValue.textContent = formatBytes(totalSize);
    totalRow.appendChild(tdTotalValue);
    tbody.appendChild(totalRow);

    table.appendChild(tbody);
    fragment.appendChild(table);
  }

  modelFilesDiv.innerHTML = "";
  modelFilesDiv.appendChild(fragment);
}

async function refreshPage() {
  const ml_enable = Services.prefs.getBoolPref("browser.ml.enable");
  const gpu_enabled =
    Services.prefs.getBoolPref("dom.webgpu.enabled") &&
    Services.prefs.getBoolPref("dom.webgpu.workers.enabled") &&
    Services.prefs.getBoolPref("gfx.webgpu.force-enabled");

  const content = document.getElementById("content");
  const warning = document.getElementById("warning");

  if (!ml_enable) {
    content.style.display = "none";
  } else {
    content.style.display = "block";
  }

  if (!ml_enable || !gpu_enabled) {
    let text = [];
    if (!ml_enable) {
      text =
        "browser.ml.enable is set to False ! Toggle it to activate local inference.";
    } else if (!gpu_enabled) {
      text =
        "WebGPU is not enabled, set dom.webgpu.enabled, dom.webgpu.workers.enabled and gfx.webgpu.force-enabled to true.";
    }

    warning.setAttribute("message", text);
    warning.style.display = "block";
  } else {
    warning.style.display = "none";
  }
  await updateModels();
  await updateProcInfo();
  await updateStatus();
}

/**
 * Displays information about the machine learning models and process info.
 *
 * @async
 */
async function displayInfo() {
  await refreshPage();
}

function setSelectOption(selectId, optionValue) {
  const selectElement = document.getElementById(selectId);
  if (!selectElement) {
    console.error(`No select element found with ID: ${selectId}`);
    return;
  }

  const options = selectElement.options;
  if (!options) {
    console.error(`No options found for select element with ID: ${selectId}`);
    return;
  }

  for (let i = 0; i < options.length; i++) {
    if (options[i].value === optionValue) {
      selectElement.selectedIndex = i;
      return;
    }
  }

  console.warn(`No option found with value: ${optionValue}`);
}

function loadExample(name) {
  const textarea = document.getElementById("inferencePad");
  textarea.value = 0;

  let data = INFERENCE_PAD_PRESETS[name];
  let padContent = { inputArgs: data.inputArgs, runOptions: data.runOptions };
  document.getElementById("inferencePad").value = JSON.stringify(
    padContent,
    null,
    2
  );
  setSelectOption("taskName", data.task);
  document.getElementById("modelId").value = data.modelId;
  document.getElementById("modelRevision").value = data.modelRevision;
  setSelectOption("modelHub", data.modelHub);
  setSelectOption("dtype", data.dtype);
  setSelectOption("device", data.device);
}

function findMaxMemory(metrics) {
  return metrics.reduce((max, metric) => {
    return metric.memory > max ? metric.memory : max;
  }, 0);
}

function findTotalTime(metrics) {
  // Create an object to store arrays of time differences for each name
  const timeMapping = {};

  metrics.forEach(metricStart => {
    if (metricStart.name.includes("Start")) {
      // Find all corresponding metricEnd for the same name
      const metricEnd = metrics.find(
        metric =>
          metric.name === metricStart.name.replace("Start", "End") &&
          metric.when > metricStart.when
      );

      if (metricEnd) {
        const timeDifference = metricEnd.when - metricStart.when;
        const baseName = metricStart.name.replace("Start", "");

        // Initialize an array if it doesn't exist for this baseName
        if (!timeMapping[baseName]) {
          timeMapping[baseName] = [];
        }

        // Push the time difference to the array
        timeMapping[baseName].push(timeDifference);
      }
    }
  });

  return timeMapping;
}

async function runInference() {
  document.getElementById("console").value = "";
  const inferencePadValue = document.getElementById("inferencePad").value;
  const modelId = document.getElementById("modelId").value;
  const modelRevision = document.getElementById("modelRevision").value;
  const taskName = document.getElementById("taskName").value;
  const dtype = document.getElementById("dtype").value;
  const device = document.getElementById("device").value;
  const numThreads = parseInt(document.getElementById("numThreads").value);
  const numRuns = parseInt(document.getElementById("numRuns").value);
  const modelHub = document.getElementById("modelHub").value;

  let inputData;
  try {
    inputData = JSON.parse(inferencePadValue);
  } catch (error) {
    alert("Invalid JSON input");
    return;
  }

  const initData = {
    modelId,
    modelRevision,
    tokenizerRevision: modelRevision,
    processorRevision: modelRevision,
    tokenizerId: modelId,
    processorId: modelId,
    taskName,
    engineId: "about-inference",
    modelHub,
    device,
    dtype,
    numThreads,
    timeoutMS: THIRTY_SECONDS,
    executionPriority: ExecutionPriority.LOW,
  };

  appendTextConsole("Creating engine if needed");
  let engine;
  try {
    const pipelineOptions = new PipelineOptions(initData);
    const engineParent = await getEngineParent();

    engine = await engineParent.getEngine(pipelineOptions, progressData => {
      engineNotification(progressData).catch(err => {
        console.error("Error in engineNotification:", err);
      });
    });
  } catch (e) {
    appendTextConsole(e);
    throw e;
  }

  appendTextConsole("Running inference request");

  const request = { args: inputData.inputArgs, options: inputData.runOptions };

  let res;
  for (let i = 0; i < numRuns; i++) {
    try {
      res = await engine.run(request);
    } catch (e) {
      appendTextConsole(e);
      if (
        e.message.includes("Invalid model hub root url: https://huggingface.co")
      ) {
        appendTextConsole(
          "Make sure you started Firefox with MOZ_ALLOW_EXTERNAL_ML_HUB=1"
        );
      }
      engineParent = null; // let's re-create it on errors.
      throw e;
    }

    const results_filter = (key, value) => {
      if (key === "metrics") {
        return undefined;
      }
      return value;
    };

    appendTextConsole(`Results: ${JSON.stringify(res, results_filter, 2)}`);
  }

  appendTextConsole(`Metrics: ${JSON.stringify(res.metrics, null, 2)}`);
  const maxMemory = findMaxMemory(res.metrics);
  appendTextConsole(
    `Resident Set Size (RSS) approximative peak usage: ${formatBytes(
      maxMemory
    )}`
  );
  appendTextConsole(
    `Timers: ${JSON.stringify(findTotalTime(res.metrics), null, 2)}`
  );
  await refreshPage();
}

function updateDownloadProgress(data) {
  const downloadsContainer = document.getElementById("downloads");

  const progressPercentage = Math.round(data.progress) || 100;
  let progressBarContainer = document.getElementById(data.id);

  // does not exist, we add it.
  if (!progressBarContainer) {
    // Create a new progress bar container
    progressBarContainer = document.createElement("div");
    progressBarContainer.id = data.id;
    progressBarContainer.className = "progress-bar-container";

    // Create the label
    const label = document.createElement("div");
    label.textContent = data.metadata.file;
    progressBarContainer.appendChild(label);

    // Create the progress bar
    const progressBar = document.createElement("div");
    progressBar.className = "progress-bar";

    const progressBarFill = document.createElement("div");
    progressBarFill.className = "progress-bar-fill";
    progressBarFill.style.width = `${progressPercentage}%`;
    progressBarFill.textContent = `${progressPercentage}%`;
    progressBar.appendChild(progressBarFill);
    progressBarContainer.appendChild(progressBar);
    // Add the progress bar container to the downloads div
    downloadsContainer.appendChild(progressBarContainer);
  } else {
    // Update the existing progress bar
    const progressBarFill =
      progressBarContainer.querySelector(".progress-bar-fill");
    progressBarFill.style.width = `${progressPercentage}%`;
    progressBarFill.textContent = `${progressPercentage}%`;
  }

  if (progressBarContainer && progressPercentage === 100) {
    downloadsContainer.removeChild(progressBarContainer);
  }
}

async function engineNotification(data) {
  let text;
  const textarea = document.getElementById("console");
  switch (data.type) {
    case "loading_from_cache":
      text = `Loading ${data.metadata.file} from cache`;
      break;
    case "downloading":
      updateDownloadProgress(data);
      return;
    default:
      text = JSON.stringify(data);
  }
  textarea.value += (textarea.value ? "\n" : "") + text;
  await refreshPage();
}

function appendTextConsole(text) {
  const textarea = document.getElementById("console");
  textarea.value += (textarea.value ? "\n" : "") + text;
  textarea.scrollTop = textarea.scrollHeight;
}

async function runHttpInference() {
  const output = document.getElementById("http.output");
  output.value = "…";
  output.value = await lazy.HttpInference.completion(
    ["bearer", "endpoint", "model", "prompt"].reduce(
      (config, key) => {
        config[key] = document.getElementById("http." + key).value;
        return config;
      },
      { onStream: val => (output.value = val) }
    ),
    await updateHttpContext()
  );
}

async function updateHttpContext() {
  const limit = document.getElementById("http.limit").value;
  const { AboutNewTab, gBrowser, isBlankPageURL } =
    window.browsingContext.topChromeWindow;
  const recentTabs = gBrowser.tabs
    .filter(
      tab =>
        !isBlankPageURL(tab.linkedBrowser.currentURI.spec) &&
        tab != gBrowser.selectedTab
    )
    .toSorted((a, b) => b.lastSeenActive - a.lastSeenActive)
    .slice(0, limit)
    .map(tab => tab.label);
  const context = {
    recentTabs,
    stories: Object.values(
      AboutNewTab.activityStream.store.getState().DiscoveryStream.feeds.data
    )[0]
      ?.data.recommendations.slice(0, limit)
      .map(rec => rec.title),
    tabTitle: recentTabs[0],
  };

  const output = document.getElementById("http.context");
  output.innerHTML = "";
  const table = output.appendChild(document.createElement("table"));
  Object.entries(context).forEach(([key, val]) => {
    const tr = table.appendChild(document.createElement("tr"));
    tr.appendChild(document.createElement("td")).textContent = `%${key}%`;
    tr.appendChild(document.createElement("td")).textContent = val;
  });

  return context;
}

var selectedHub;
var selectedPreset;

function fillSelect(elementId, values) {
  const selectElement = document.getElementById(elementId);
  values.forEach(function (task) {
    const option = document.createElement("option");
    option.value = task;
    option.text = task;
    selectElement.appendChild(option);
  });
}

function showTab(button) {
  let current_tab = document.querySelector(".active");
  let category = button.getAttribute("id").substring("category-".length);
  let content = document.getElementById(category);
  if (current_tab == content) {
    return;
  }
  current_tab.classList.remove("active");
  current_tab.hidden = true;
  content.classList.add("active");
  content.hidden = false;
  let current_button = document.querySelector("[selected=true]");
  current_button.removeAttribute("selected");
  button.setAttribute("selected", "true");
}

async function getEngineParent() {
  if (!engineParent) {
    engineParent = await EngineProcess.getMLEngineParent();
  }
  return engineParent;
}

/**
 * Initializes the pad on window load.
 *
 * @async
 */
window.onload = async function () {
  let menu = document.getElementById("categories");
  menu.addEventListener("click", function click(e) {
    if (e.target && e.target.parentNode == menu) {
      showTab(e.target);
    }
  });

  showTab(document.getElementById("category-local-inference"));

  fillSelect("dtype", DTYPE);
  fillSelect("taskName", TASKS);
  fillSelect("numThreads", NUM_THREADS);
  fillSelect("predefined", PREDEFINED);

  document.getElementById("predefined").value = "summary";
  loadExample("summary");
  document.getElementById("console").value = "";

  document
    .getElementById("inferenceButton")
    .addEventListener("click", runInference);
  document.getElementById("modelHub").addEventListener("change", function () {
    var selectedOption = this.options[this.selectedIndex];
    selectedHub = selectedOption.value;
  });
  document.getElementById("predefined").addEventListener("change", function () {
    var selectedOption = this.options[this.selectedIndex];
    selectedPreset = selectedOption.value;
    loadExample(selectedPreset);
  });

  document
    .getElementById("http.button")
    .addEventListener("click", runHttpInference);
  document
    .getElementById("http.limit")
    .addEventListener("change", updateHttpContext);

  updateHttpContext();
  await refreshPage();
};

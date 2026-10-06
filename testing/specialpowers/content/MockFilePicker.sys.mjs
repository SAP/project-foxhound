/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  FileUtils: "resource://gre/modules/FileUtils.sys.mjs",
  WrapPrivileged: "resource://testing-common/WrapPrivileged.sys.mjs",
});

const Cm = Components.manager;

const CONTRACT_ID = "@mozilla.org/filepicker;1";

if (import.meta.url.includes("specialpowers")) {
  Cu.crashIfNotInAutomation();
}

var registrar = Cm.QueryInterface(Ci.nsIComponentRegistrar);
var oldClassID;
var newClassID = Services.uuid.generateUUID();
var newFactory = function () {
  return {
    createInstance(aIID) {
      return new MockFilePickerInstance().QueryInterface(aIID);
    },
    QueryInterface: ChromeUtils.generateQI(["nsIFactory"]),
  };
};

export var MockFilePicker = {
  returnOK: Ci.nsIFilePicker.returnOK,
  returnCancel: Ci.nsIFilePicker.returnCancel,
  returnReplace: Ci.nsIFilePicker.returnReplace,

  filterAll: Ci.nsIFilePicker.filterAll,
  filterHTML: Ci.nsIFilePicker.filterHTML,
  filterText: Ci.nsIFilePicker.filterText,
  filterImages: Ci.nsIFilePicker.filterImages,
  filterXML: Ci.nsIFilePicker.filterXML,
  filterXUL: Ci.nsIFilePicker.filterXUL,
  filterApps: Ci.nsIFilePicker.filterApps,
  filterAllowURLs: Ci.nsIFilePicker.filterAllowURLs,
  filterAudio: Ci.nsIFilePicker.filterAudio,
  filterVideo: Ci.nsIFilePicker.filterVideo,

  init() {
    if (registrar.isCIDRegistered(newClassID)) {
      this.cleanup();
    } else {
      this.reset();
    }

    this.factory = newFactory();
    oldClassID = registrar.contractIDToCID(CONTRACT_ID);
    registrar.registerFactory(newClassID, "", CONTRACT_ID, this.factory);
  },

  reset() {
    this.appendFilterCallback = null;
    this.appendFiltersCallback = null;
    this.displayDirectory = null;
    this.displaySpecialDirectory = "";
    this.filterIndex = 0;
    this.mode = null;
    this.returnData = [];
    this.returnValue = null;
    this.returnDataForWebKitDirs = [];
    this.showCallback = null;
    this.afterOpenCallback = null;
    this.shown = false;
    this.showing = false;
  },

  cleanup() {
    var previousFactory = this.factory;
    this.reset();
    this.factory = null;
    if (oldClassID) {
      registrar.unregisterFactory(newClassID, previousFactory);
      registrar.registerFactory(oldClassID, "", CONTRACT_ID, null);
    }
  },

  // returnData entries are descriptors. DOM objects are created lazily by the
  // MockFilePickerInstance in the correct global at open() time.
  //
  // Possible shapes:
  //   { blobFile: true }
  //   { nsIFile: <nsIFile> }
  //   { domFile: <File> }
  //   { directoryPath: <string>, nsIFile: <nsIFile> }

  useAnyFile() {
    var file = lazy.FileUtils.getDir("TmpD", []);
    file.append("testfile");
    file.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0o644);
    this.returnData = [{ nsIFile: file }];
    return Promise.resolve(file);
  },

  useBlobFile() {
    this.returnData = [{ blobFile: true }];
  },

  useDirectory(aPath) {
    var file = new lazy.FileUtils.File(aPath);
    this.returnData = [{ directoryPath: aPath, nsIFile: file }];
    this.returnDataForWebKitDirs = [];

    if (AppConstants.platform === "android") {
      for (const filename of ["/foo.txt", "/subdir/bar.txt"]) {
        this.returnDataForWebKitDirs.push({
          nsIFile: lazy.FileUtils.File(aPath + filename),
        });
      }
    }
  },

  setFiles(files) {
    this.returnData = [];

    for (let file of files) {
      if (ChromeUtils.getClassName(file) === "File") {
        this.returnData.push({ domFile: file });
      } else {
        this.returnData.push({ nsIFile: file });
      }
    }
  },

  getNsIFile() {
    if (this.returnData.length >= 1) {
      return this.returnData[0].nsIFile;
    }
    return null;
  },
};

function MockFilePickerInstance() {
  this.showCallback = null;
  this.showCallbackWrapped = null;
  this.window = null;
  this._domResults = [];
  this._domWebKitDirs = [];
}
MockFilePickerInstance.prototype = {
  QueryInterface: ChromeUtils.generateQI(["nsIFilePicker"]),
  init(aBrowsingContext, aTitle, aMode, aRelevantGlobal) {
    this.mode = aMode;
    this.filterIndex = MockFilePicker.filterIndex;
    this.window = aRelevantGlobal || aBrowsingContext?.window || globalThis;
  },
  appendFilter(aTitle, aFilter) {
    if (typeof MockFilePicker.appendFilterCallback == "function") {
      MockFilePicker.appendFilterCallback(this, aTitle, aFilter);
    }
  },
  appendFilters(aFilterMask) {
    if (typeof MockFilePicker.appendFiltersCallback == "function") {
      MockFilePicker.appendFiltersCallback(this, aFilterMask);
    }
  },
  defaultString: "",
  defaultExtension: "",
  window: null,
  filterIndex: 0,
  displayDirectory: null,
  displaySpecialDirectory: "",
  get file() {
    if (MockFilePicker.returnData.length >= 1) {
      return MockFilePicker.returnData[0].nsIFile;
    }

    return null;
  },

  // Create a DOM File from a descriptor using this.window as the global.
  async _toDomFile(descriptor) {
    if (descriptor.blobFile) {
      return new this.window.File(
        [new this.window.Blob([])],
        "helloworld.txt",
        { type: "plain/text" }
      );
    }
    if (descriptor.domFile) {
      if (Cu.getGlobalForObject(descriptor.domFile) === this.window) {
        return descriptor.domFile;
      }
      return new this.window.File(
        [descriptor.domFile],
        descriptor.domFile.name,
        {
          type: descriptor.domFile.type,
        }
      );
    }
    if (descriptor.nsIFile) {
      try {
        return await this.window.File.createFromNsIFile(descriptor.nsIFile, {
          existenceCheck: false,
        });
      } catch {
        return null;
      }
    }
    return null;
  },

  // Materialize all returnData descriptors into DOM objects in this.window's
  // global. Called from open() before notifying the caller.
  async _materializeDomObjects() {
    this._domResults = [];
    for (let descriptor of MockFilePicker.returnData) {
      if (descriptor.directoryPath) {
        this._domResults.push(
          new this.window.Directory(descriptor.directoryPath)
        );
      } else {
        this._domResults.push(await this._toDomFile(descriptor));
      }
    }
    this._domWebKitDirs = [];
    for (let descriptor of MockFilePicker.returnDataForWebKitDirs) {
      let f = await this._toDomFile(descriptor);
      if (f) {
        this._domWebKitDirs.push(f);
      }
    }
  },

  get domFileOrDirectory() {
    return this._domResults[0] || null;
  },
  get fileURL() {
    if (
      MockFilePicker.returnData.length >= 1 &&
      MockFilePicker.returnData[0].nsIFile
    ) {
      return Services.io.newFileURI(MockFilePicker.returnData[0].nsIFile);
    }

    return null;
  },
  *getFiles(asDOM) {
    for (let i = 0; i < MockFilePicker.returnData.length; i++) {
      if (asDOM) {
        yield this._domResults[i];
      } else if (MockFilePicker.returnData[i].nsIFile) {
        yield MockFilePicker.returnData[i].nsIFile;
      } else {
        throw Components.Exception("", Cr.NS_ERROR_FAILURE);
      }
    }
  },
  get files() {
    return this.getFiles(false);
  },
  get domFileOrDirectoryEnumerator() {
    return this.getFiles(true);
  },
  *getDomFilesInWebKitDirectory() {
    for (let f of this._domWebKitDirs) {
      yield f;
    }
  },
  get domFilesInWebKitDirectory() {
    if (AppConstants.platform !== "android") {
      throw Components.Exception("", Cr.NS_ERROR_FAILURE);
    }

    return this.getDomFilesInWebKitDirectory();
  },
  open(aFilePickerShownCallback) {
    MockFilePicker.showing = true;
    Services.tm.dispatchToMainThread(async () => {
      MockFilePicker.displayDirectory = this.displayDirectory;
      MockFilePicker.displaySpecialDirectory = this.displaySpecialDirectory;
      MockFilePicker.shown = true;

      var result = MockFilePicker.returnValue ?? Ci.nsIFilePicker.returnOK;
      try {
        // Note that the callback can result in some additional results.
        if (typeof MockFilePicker.showCallback == "function") {
          if (MockFilePicker.showCallback != this.showCallback) {
            this.showCallback = MockFilePicker.showCallback;
            if (Cu.isXrayWrapper(this.window)) {
              this.showCallbackWrapped = lazy.WrapPrivileged.wrapCallback(
                MockFilePicker.showCallback,
                this.window
              );
            } else {
              this.showCallbackWrapped = this.showCallback;
            }
          }
          var returnValue = await this.showCallbackWrapped(this);
          if (typeof returnValue != "undefined") {
            result = returnValue;
          }
        }

        // Create DOM File/Directory objects in the correct global.
        await this._materializeDomObjects();
      } catch (ex) {
        result = Ci.nsIFilePicker.returnCancel;
      }
      if (aFilePickerShownCallback) {
        aFilePickerShownCallback.done(result);
      }
      if (typeof MockFilePicker.afterOpenCallback == "function") {
        Services.tm.dispatchToMainThread(() => {
          MockFilePicker.afterOpenCallback(this);
        });
      }
    });
  },
};

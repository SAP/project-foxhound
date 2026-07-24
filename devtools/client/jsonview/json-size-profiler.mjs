/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Parses a JSON string and creates a Firefox profiler profile describing
 * which parts of the JSON use up how many bytes.
 */

// Categories for different JSON types
const JSON_CATEGORIES = {
  OBJECT: { name: "Object", color: "grey" },
  ARRAY: { name: "Array", color: "grey" },
  NULL: { name: "Null", color: "yellow" },
  BOOL: { name: "Bool", color: "brown" },
  NUMBER: { name: "Number", color: "green" },
  STRING: { name: "String", color: "blue" },
  PROPERTY_KEY: { name: "Property Key", color: "lightblue" },
};

const MAX_SAMPLE_COUNT = 100000;

class JsonSizeProfiler {
  /**
   * @param {string} jsonString - The JSON string to profile.
   * @param {string} [filename] - Optional filename for the profile metadata.
   */
  constructor(jsonString, filename) {
    this.jsonString = jsonString;
    this.filename = filename;
    this.pos = 0;
    this.bytePos = 0;
    this.lastAdvancedBytePos = 0;
    this.scopeStack = [];

    // Caching structures
    this.stringTable = new Map();
    this.stringTableArray = [];
    this.stackCache = new Map();
    this.frameCache = new Map();
    this.nodeCache = new Map();

    // Profile tables - stored in final array format
    this.frameTable = {
      func: [],
      category: [],
    };
    this.stackTable = {
      frame: [],
      prefix: [],
    };

    // Aggregation state
    this.topStackHandle = null;
    const totalBytes = new TextEncoder().encode(jsonString).length;
    this.bytesPerSample = Math.max(
      1,
      Math.min(1000000, Math.floor(totalBytes / MAX_SAMPLE_COUNT))
    );
    this.sampleCount = 0;
    this.aggregationMap = new Map();
    this.aggregationStartPos = 0;
    this.samples = {
      stack: [],
      time: [],
      cpuDelta: [],
      weight: [],
    };

    // Categories initialization
    this.categories = [];
    this.categoryMap = new Map();
    for (const [key, value] of Object.entries(JSON_CATEGORIES)) {
      const catIndex = this.categories.length;
      this.categories.push(value);
      this.categoryMap.set(key, catIndex);
    }
  }

  /**
   * Interns a string into the string table, returning its index.
   *
   * @param {string} str - The string to intern.
   * @returns {number} The index of the string in the string table.
   */
  internString(str) {
    if (!this.stringTable.has(str)) {
      const index = this.stringTableArray.length;
      this.stringTableArray.push(str);
      this.stringTable.set(str, index);
    }
    return this.stringTable.get(str);
  }

  /**
   * Gets or creates a frame in the frame table.
   *
   * @param {string} funcName - The function name for the frame.
   * @param {number} category - The category index for the frame.
   * @returns {number} The frame index.
   */
  getOrCreateFrame(funcName, category) {
    const funcIndex = this.internString(funcName);
    const cacheKey = `${funcIndex}:${category}`;
    if (this.frameCache.has(cacheKey)) {
      return this.frameCache.get(cacheKey);
    }

    const frameIndex = this.frameTable.func.length;
    this.frameTable.func.push(funcIndex);
    this.frameTable.category.push(category);
    this.frameCache.set(cacheKey, frameIndex);
    return frameIndex;
  }

  /**
   * Gets or creates a stack in the stack table.
   *
   * @param {number} frameIndex - The frame index for this stack entry.
   * @param {number|null} prefix - The parent stack index, or null for root.
   * @returns {number} The stack index.
   */
  getOrCreateStack(frameIndex, prefix) {
    const cacheKey = `${frameIndex}:${prefix === null ? "null" : prefix}`;
    if (this.stackCache.has(cacheKey)) {
      return this.stackCache.get(cacheKey);
    }

    const stackIndex = this.stackTable.frame.length;
    this.stackTable.frame.push(frameIndex);
    this.stackTable.prefix.push(prefix);
    this.stackCache.set(cacheKey, stackIndex);
    return stackIndex;
  }

  /**
   * Gets a stack handle for a given path and JSON type.
   *
   * @param {number|null} parentStackHandle - The parent stack handle.
   * @param {string} path - The path in the JSON structure.
   * @param {string} jsonType - The JSON type (OBJECT, ARRAY, STRING, etc.).
   * @returns {number} The stack handle.
   */
  getStack(parentStackHandle, path, jsonType) {
    const cacheKey = `${parentStackHandle === null ? "null" : parentStackHandle}:${path}:${jsonType}`;
    if (this.nodeCache.has(cacheKey)) {
      return this.nodeCache.get(cacheKey);
    }

    const category = this.categoryMap.get(jsonType);
    const frameIndex = this.getOrCreateFrame(path, category);
    const stackHandle = this.getOrCreateStack(frameIndex, parentStackHandle);
    this.nodeCache.set(cacheKey, stackHandle);
    return stackHandle;
  }

  /**
   * Moves position forward, updating both character and byte positions.
   *
   * This function tracks both character positions (in the UTF-16 string) and
   * byte positions (in the original UTF-8 file) because:
   * 1. The original JSON file contained bytes which formed a UTF-8 string.
   * 2. When the JSON viewer loaded the JSON, these bytes were parsed into a
   *    UTF-16 string (or "potentially ill-formed UTF-16" aka WTF-16), which
   *    means all characters now take 2 bytes in memory even though most
   *    originally only took 1 byte in the UTF-8 file.
   * 3. this.jsonString.charCodeAt() indexes into the UTF-16 string.
   * 4. By examining the UTF-16 code unit value, we "recover" how many bytes
   *    this character originally occupied in the UTF-8 file.
   *
   * Note: this.pos will never stop in the middle of a surrogate pair.
   * When this function returns, this.pos >= newCharPos.
   *
   * @param {number} newCharPos - The new character position to move to.
   */
  advanceToPos(newCharPos) {
    while (this.pos < newCharPos) {
      const code = this.jsonString.charCodeAt(this.pos);
      if (code >= 0xd800 && code <= 0xdbff) {
        // Surrogate pair - always 4 bytes in UTF-8
        this.bytePos += 4;
        this.pos += 2;
      } else {
        // Single UTF-16 code unit - calculate UTF-8 byte length
        if (code <= 0x7f) {
          this.bytePos += 1;
        } else if (code <= 0x7ff) {
          this.bytePos += 2;
        } else {
          // 3-byte UTF-8 characters (U+0800 to U+FFFF)
          // Examples: CJK characters like "中", symbols like "€", etc.
          this.bytePos += 3;
        }
        this.pos++;
      }
    }
  }

  /**
   * Moves position forward by a number of ASCII characters (1 byte each).
   *
   * @param {number} count - The number of ASCII characters to advance.
   */
  advanceByAsciiChars(count) {
    this.pos += count;
    this.bytePos += count;
  }

  /**
   * Parses a primitive value with stack tracking.
   *
   * @param {string} path - The path to the value in the JSON structure.
   * @param {string} typeName - The type name (STRING, NUMBER, BOOL, NULL).
   * @param {Function} parseFunc - The function to call to parse the value.
   */
  parsePrimitive(path, typeName, parseFunc) {
    this.recordBytesConsumed();

    const scope = this.getCurrentScope();
    const stackHandle = this.getStack(
      scope.stackHandle,
      `${path} (${typeName.toLowerCase()})`,
      typeName
    );
    this.topStackHandle = stackHandle;

    parseFunc();

    this.recordBytesConsumed();
    this.topStackHandle = scope.stackHandle;
  }

  /**
   * Exits the current scope (object or array).
   */
  exitScope() {
    this.recordBytesConsumed();
    this.scopeStack.pop();
    const prevScope = this.getCurrentScope();
    this.topStackHandle = prevScope.stackHandle;
  }

  /**
   * Records bytes consumed since the last call.
   *
   * This method accumulates byte counts in aggregationMap instead of immediately
   * creating profile samples. This aggregation limits the total sample count to
   * approximately MAX_SAMPLE_COUNT (100,000), which keeps the Firefox Profiler
   * UI responsive even for very large JSON files.
   *
   * For small files (< 100KB), bytesPerSample = 1, so samples are created
   * frequently. For large files, bytesPerSample scales proportionally
   * (e.g., 100 for a 10MB file), so samples are batched more aggressively.
   *
   * Samples are flushed when we have accumulated multiple stacks and have
   * consumed enough bytes to justify creating new samples.
   */
  recordBytesConsumed() {
    if (this.bytePos === 0 && this.lastAdvancedBytePos === 0) {
      return;
    }
    if (this.bytePos < this.lastAdvancedBytePos) {
      throw new Error(
        `Cannot advance backwards: ${this.lastAdvancedBytePos} -> ${this.bytePos}`
      );
    }
    if (this.bytePos === this.lastAdvancedBytePos) {
      return;
    }

    const byteDelta = this.bytePos - this.lastAdvancedBytePos;
    const stackHandle = this.topStackHandle;
    if (stackHandle !== null) {
      const current = this.aggregationMap.get(stackHandle) || 0;
      this.aggregationMap.set(stackHandle, current + byteDelta);
    }

    this.lastAdvancedBytePos = this.bytePos;

    // Flush accumulated samples when we have multiple stacks and enough bytes
    const aggregatedStackCount = this.aggregationMap.size;
    if (aggregatedStackCount > 1) {
      const sampleCountIfWeFlush = this.sampleCount + aggregatedStackCount;
      const allowedSampleCount = Math.floor(
        this.lastAdvancedBytePos / this.bytesPerSample
      );
      if (sampleCountIfWeFlush <= allowedSampleCount) {
        this.recordSamples();
      }
    }
  }

  /**
   * Flushes accumulated byte counts to the samples table.
   */
  recordSamples() {
    let synthLastPos = this.aggregationStartPos;

    for (const [stackHandle, accDelta] of this.aggregationMap.entries()) {
      const synthPos = synthLastPos + accDelta;

      // First sample at start position
      this.samples.stack.push(stackHandle);
      this.samples.time.push(synthLastPos);
      this.samples.cpuDelta.push(0);
      this.samples.weight.push(0);

      // Second sample at end position with size
      this.samples.stack.push(stackHandle);
      this.samples.time.push(synthPos);
      this.samples.cpuDelta.push(accDelta * 1000);
      this.samples.weight.push(accDelta);

      synthLastPos = synthPos;
      this.sampleCount += 1;
    }

    this.aggregationStartPos = this.lastAdvancedBytePos;
    this.aggregationMap.clear();
  }

  /**
   * Gets the current scope from the scope stack.
   *
   * @returns {object} An object with stackHandle, path, and arrayDepth.
   */
  getCurrentScope() {
    if (this.scopeStack.length === 0) {
      return {
        stackHandle: null,
        path: "json",
        arrayDepth: 0,
      };
    }

    const scope = this.scopeStack[this.scopeStack.length - 1];
    return {
      stackHandle: scope.stackHandle,
      path: scope.pathForValue || scope.pathForElems || scope.path,
      arrayDepth: scope.arrayDepth,
    };
  }

  /**
   * Skips whitespace characters in the JSON string.
   */
  skipWhitespace() {
    while (this.pos < this.jsonString.length) {
      const ch = this.jsonString[this.pos];
      if (ch !== " " && ch !== "\t" && ch !== "\n" && ch !== "\r") {
        break;
      }
      this.advanceByAsciiChars(1); // Whitespace is always ASCII (1 byte each)
    }
  }

  /**
   * Parses a JSON value at the current position.
   *
   * @param {string} path - The path to this value in the JSON structure.
   */
  parseValue(path) {
    this.skipWhitespace();

    if (this.pos >= this.jsonString.length) {
      throw new Error("Unexpected end of JSON");
    }

    const ch = this.jsonString[this.pos];

    if (ch === "{") {
      this.parseObject(path);
    } else if (ch === "[") {
      this.parseArray(path);
    } else if (ch === '"') {
      this.parseString(path);
    } else if (ch === "t" || ch === "f") {
      this.parseBool(path);
    } else if (ch === "n") {
      this.parseNull(path);
    } else {
      this.parseNumber(path);
    }
  }

  /**
   * Parses a JSON object at the current position.
   *
   * @param {string} path - The path to this object in the JSON structure.
   */
  parseObject(path) {
    this.recordBytesConsumed();

    const parentScope = this.getCurrentScope();
    const stackHandle = this.getStack(
      parentScope.stackHandle,
      `${path} (object)`,
      "OBJECT"
    );

    this.scopeStack.push({
      type: "object",
      stackHandle,
      path,
      pathForValue: null,
      arrayDepth: parentScope.arrayDepth,
    });
    this.topStackHandle = stackHandle;

    this.advanceByAsciiChars(1); // skip '{'

    let first = true;
    while (this.pos < this.jsonString.length) {
      this.skipWhitespace();

      if (this.jsonString[this.pos] === "}") {
        this.advanceByAsciiChars(1); // skip '}'
        break;
      }

      if (!first) {
        if (this.jsonString[this.pos] !== ",") {
          throw new Error(`Expected ',' at position ${this.pos}`);
        }
        this.advanceByAsciiChars(1); // skip ','
        this.skipWhitespace();
      }
      first = false;

      // Parse property key
      if (this.jsonString[this.pos] !== '"') {
        throw new Error(`Expected property key at position ${this.pos}`);
      }

      this.recordBytesConsumed();

      const key = this.parseStringValue();
      const propertyPath = `${path}.${key}`;

      const propKeyStack = this.getStack(
        stackHandle,
        `${propertyPath} (property key)`,
        "PROPERTY_KEY"
      );
      this.topStackHandle = propKeyStack;

      // Update scope with current property path
      this.scopeStack[this.scopeStack.length - 1].pathForValue = propertyPath;

      this.skipWhitespace();
      if (this.jsonString[this.pos] !== ":") {
        throw new Error(`Expected ':' at position ${this.pos}`);
      }
      this.advanceByAsciiChars(1); // skip ':'

      // Parse property value
      this.parseValue(propertyPath);
    }

    this.exitScope();
  }

  /**
   * Parses a JSON array at the current position.
   *
   * @param {string} path - The path to this array in the JSON structure.
   */
  parseArray(path) {
    this.recordBytesConsumed();

    const parentScope = this.getCurrentScope();

    const INDEXER_CHARS = "ijklmnopqrstuvwxyz";
    const indexer =
      INDEXER_CHARS[parentScope.arrayDepth % INDEXER_CHARS.length];
    const pathForElems = `${path}[${indexer}]`;

    const stackHandle = this.getStack(
      parentScope.stackHandle,
      `${path} (array)`,
      "ARRAY"
    );

    this.topStackHandle = stackHandle;
    this.scopeStack.push({
      type: "array",
      stackHandle,
      pathForElems,
      arrayDepth: parentScope.arrayDepth + 1,
    });

    this.advanceByAsciiChars(1); // skip '['

    let first = true;
    while (this.pos < this.jsonString.length) {
      this.skipWhitespace();

      if (this.jsonString[this.pos] === "]") {
        this.advanceByAsciiChars(1); // skip ']'
        break;
      }

      if (!first) {
        if (this.jsonString[this.pos] !== ",") {
          throw new Error(`Expected ',' at position ${this.pos}`);
        }
        this.advanceByAsciiChars(1); // skip ','
        this.skipWhitespace();
      }
      first = false;

      this.parseValue(pathForElems);
    }

    this.exitScope();
  }

  /**
   * Parses a JSON string at the current position.
   *
   * @param {string} path - The path to this string in the JSON structure.
   */
  parseString(path) {
    this.parsePrimitive(path, "STRING", () => this.parseStringValue());
  }

  /**
   * Parses a JSON string value and returns it.
   *
   * @returns {string} The parsed string value.
   */
  parseStringValue() {
    this.advanceByAsciiChars(1); // skip opening quote (ASCII)
    let value = "";

    while (this.pos < this.jsonString.length) {
      const ch = this.jsonString[this.pos];

      if (ch === '"') {
        this.advanceByAsciiChars(1); // closing quote (ASCII)
        break;
      } else if (ch === "\\") {
        this.advanceByAsciiChars(1); // backslash (ASCII)
        if (this.pos >= this.jsonString.length) {
          throw new Error("Unexpected end of JSON in string");
        }
        const escaped = this.jsonString[this.pos];
        if (escaped === '"' || escaped === "\\" || escaped === "/") {
          value += escaped;
        } else if (escaped === "b") {
          value += "\b";
        } else if (escaped === "f") {
          value += "\f";
        } else if (escaped === "n") {
          value += "\n";
        } else if (escaped === "r") {
          value += "\r";
        } else if (escaped === "t") {
          value += "\t";
        } else if (escaped === "u") {
          // Unicode escape - \uXXXX (all ASCII)
          this.advanceByAsciiChars(1);
          const hex = this.jsonString.slice(this.pos, this.pos + 4);
          value += String.fromCharCode(parseInt(hex, 16));
          this.advanceByAsciiChars(3); // skip the 4 hex digits (already moved 1)
        }
        this.advanceByAsciiChars(1); // escaped char (ASCII)
      } else {
        // Regular character - may be multi-byte UTF-8
        value += ch;
        this.advanceToPos(this.pos + 1);
      }
    }

    return value;
  }

  /**
   * Parses a JSON number at the current position.
   *
   * @param {string} path - The path to this number in the JSON structure.
   */
  parseNumber(path) {
    this.parsePrimitive(path, "NUMBER", () => {
      // Skip all number characters: digits, decimal point, exponent, signs
      while (this.pos < this.jsonString.length) {
        const ch = this.jsonString[this.pos];
        if (
          (ch >= "0" && ch <= "9") ||
          ch === "." ||
          ch === "e" ||
          ch === "E" ||
          ch === "+" ||
          ch === "-"
        ) {
          this.advanceByAsciiChars(1);
        } else {
          break;
        }
      }
    });
  }

  /**
   * Parses a JSON boolean at the current position.
   *
   * @param {string} path - The path to this boolean in the JSON structure.
   */
  parseBool(path) {
    this.parsePrimitive(path, "BOOL", () => {
      if (this.jsonString.slice(this.pos, this.pos + 4) === "true") {
        this.advanceByAsciiChars(4);
      } else if (this.jsonString.slice(this.pos, this.pos + 5) === "false") {
        this.advanceByAsciiChars(5);
      } else {
        throw new Error(`Expected boolean at position ${this.pos}`);
      }
    });
  }

  /**
   * Parses a JSON null at the current position.
   *
   * @param {string} path - The path to this null in the JSON structure.
   */
  parseNull(path) {
    this.parsePrimitive(path, "NULL", () => {
      if (this.jsonString.slice(this.pos, this.pos + 4) === "null") {
        this.advanceByAsciiChars(4);
      } else {
        throw new Error(`Expected null at position ${this.pos}`);
      }
    });
  }

  /**
   * Parses the JSON string and generates a Firefox profiler profile.
   *
   * @returns {object} A Firefox profiler profile object.
   */
  parse() {
    this.parseValue("json");

    // Move to end of string to account for any trailing content
    const remaining = this.jsonString.length - this.pos;
    if (remaining > 0) {
      this.advanceByAsciiChars(remaining);
    }

    // Advance to final position
    if (this.bytePos !== this.lastAdvancedBytePos) {
      this.recordBytesConsumed();
    }

    this.recordSamples();

    const frameCount = this.frameTable.func.length;
    const funcCount = this.stringTableArray.length;
    const sampleCount = this.samples.stack.length;
    // Convert absolute times to deltas in place
    for (let i = sampleCount - 1; i > 0; i--) {
      this.samples.time[i] = this.samples.time[i] - this.samples.time[i - 1];
    }
    // First element stays as-is (it's already a delta from 0)

    const meta = {
      version: 56,
      preprocessedProfileVersion: 56,
      startTime: 0,
      fileSize: this.lastAdvancedBytePos,
      processType: 0,
      product: "JSON Size Profile",
      interval: this.bytesPerSample,
      markerSchema: [],
      symbolicationNotSupported: true,
      usesOnlyOneStackType: true,
      categories: this.categories.map(cat => ({
        name: cat.name,
        color: cat.color,
        subcategories: ["Other"],
      })),
      sampleUnits: {
        time: "bytes",
        eventDelay: "ms",
        threadCPUDelta: "µs",
      },
    };

    if (this.filename) {
      meta.fileName = this.filename;
    }

    const profile = {
      meta,
      libs: [],
      threads: [
        {
          processType: "default",
          processStartupTime: 0,
          processShutdownTime: null,
          registerTime: 0,
          unregisterTime: null,
          pausedRanges: [],
          name: "Bytes",
          isMainThread: true,
          pid: "0",
          tid: "0",
          samples: {
            length: sampleCount,
            stack: this.samples.stack,
            timeDeltas: this.samples.time,
            weight: this.samples.weight,
            weightType: "bytes",
            threadCPUDelta: this.samples.cpuDelta,
          },
          markers: {
            length: 0,
            category: [],
            data: [],
            endTime: [],
            name: [],
            phase: [],
            startTime: [],
          },
          stackTable: {
            length: this.stackTable.frame.length,
            prefix: this.stackTable.prefix,
            frame: this.stackTable.frame,
          },
          frameTable: {
            length: frameCount,
            address: new Array(frameCount).fill(-1),
            category: this.frameTable.category,
            subcategory: new Array(frameCount).fill(0),
            func: this.frameTable.func,
            nativeSymbol: new Array(frameCount).fill(null),
            innerWindowID: new Array(frameCount).fill(0),
            line: new Array(frameCount).fill(null),
            column: new Array(frameCount).fill(null),
            inlineDepth: new Array(frameCount).fill(0),
          },
          funcTable: {
            length: funcCount,
            name: Array.from({ length: funcCount }, (_, i) => i),
            isJS: new Array(funcCount).fill(false),
            relevantForJS: new Array(funcCount).fill(false),
            resource: new Array(funcCount).fill(-1),
            fileName: new Array(funcCount).fill(null),
            lineNumber: new Array(funcCount).fill(null),
            columnNumber: new Array(funcCount).fill(null),
          },
          resourceTable: {
            length: 0,
            lib: [],
            name: [],
            host: [],
            type: [],
          },
          nativeSymbols: {
            length: 0,
            address: [],
            functionSize: [],
            libIndex: [],
            name: [],
          },
        },
      ],
      profilingLog: [],
      shared: {
        stringArray: this.stringTableArray,
      },
    };

    return profile;
  }
}

/**
 * Creates a Firefox profiler profile from a JSON string.
 *
 * @param {string} jsonString - The JSON string to profile
 * @param {string} filename - Optional filename to include in the profile
 * @returns {object} A Firefox profiler profile object
 */
export function createSizeProfile(jsonString, filename) {
  const profiler = new JsonSizeProfiler(jsonString, filename);
  return profiler.parse();
}

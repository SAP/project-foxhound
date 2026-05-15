/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const JSVAL_TYPE_DOUBLE = 0x00;
const JSVAL_TYPE_INT32 = 0x01;
const JSVAL_TYPE_BOOLEAN = 0x02;
const JSVAL_TYPE_UNDEFINED = 0x03;
const JSVAL_TYPE_NULL = 0x04;
const JSVAL_TYPE_MAGIC = 0x05;
const JSVAL_TYPE_STRING = 0x06;
const JSVAL_TYPE_SYMBOL = 0x07;
const JSVAL_TYPE_BIGINT = 0x09;
const JSVAL_TYPE_OBJECT = 0x0c;

const GETTER_SETTER_MAGIC = 0xf0;

const GENERIC_OBJECT_HAS_DENSE_ELEMENTS = 1;

const NUMBER_IS_OUT_OF_LINE_MAGIC = 0xf;
const MIN_INLINE_INT = -1;
const MAX_INLINE_INT = 13;

const STRING_ENCODING_LATIN1 = 0;

const OBJECT_KIND_ARRAY_LIKE = 1;
const OBJECT_KIND_MAP_LIKE = 2;
const OBJECT_KIND_FUNCTION = 3;
const OBJECT_KIND_WRAPPED_PRIMITIVE_OBJECT = 4;
const OBJECT_KIND_GENERIC_OBJECT = 5;
const OBJECT_KIND_PROXY_OBJECT = 6;
const OBJECT_KIND_EXTERNAL = 7;

const MAX_COLLECTION_VALUES = 16;

class BufferReader {
  #view;
  #index;

  constructor(buffer, index = 0) {
    this.#view = new DataView(buffer);
    this.#index = index;
  }

  getIndex() {
    return this.#index;
  }

  peekUint8() {
    return this.#view.getUint8(this.#index);
  }

  readUint8() {
    let result = this.#view.getUint8(this.#index);
    this.#index += 1;
    return result;
  }

  readUint16() {
    let result = this.#view.getUint16(this.#index, true);
    this.#index += 2;
    return result;
  }

  readUint32() {
    let result = this.#view.getUint32(this.#index, true);
    this.#index += 4;
    return result;
  }

  readInt8() {
    let result = this.#view.getInt8(this.#index);
    this.#index += 1;
    return result;
  }

  readInt16() {
    let result = this.#view.getInt16(this.#index, true);
    this.#index += 2;
    return result;
  }

  readInt32() {
    let result = this.#view.getInt32(this.#index, true);
    this.#index += 4;
    return result;
  }

  readFloat64() {
    let result = this.#view.getFloat64(this.#index, true);
    this.#index += 8;
    return result;
  }

  readString() {
    let encodingAndLength = this.readUint16();
    let length = encodingAndLength & ~(0b11 << 14);
    let encoding = encodingAndLength >> 14;
    if (length == 0) {
      return "";
    }

    // This assertion is just for simplicity in testing. Other values can occur
    // in the wild
    Assert.equal(encoding, STRING_ENCODING_LATIN1);
    let result = String.fromCharCode(
      ...new Uint8Array(
        this.#view.buffer.slice(this.#index, this.#index + length)
      )
    );

    this.#index += length;
    return result;
  }
}

/**
 * Test the JS Tracing feature.
 */
add_task(async function test_profile_feature_jstracing() {
  Assert.ok(
    !Services.profiler.IsActive(),
    "The profiler is not currently active"
  );

  await ProfilerTestUtils.startProfiler({ features: ["tracing"] });

  const url = BASE_URL_HTTPS + "tracing_values.html";
  await BrowserTestUtils.withNewTab(url, async contentBrowser => {
    const contentPid = await SpecialPowers.spawn(
      contentBrowser,
      [],
      () => Services.appinfo.processID
    );

    {
      const { contentThread } = await stopProfilerNowAndGetThreads(contentPid);
      const tracedValuesBuffer = Uint8Array.fromBase64(
        contentThread.tracedValues
      ).buffer;
      const shapes = contentThread.tracedObjectShapes;

      // First lookup for all our expected symbols in the string table
      const functionRunStringIndex = contentThread.stringTable.indexOf(
        `run (${url}:7:17)`
      );
      Assert.greater(
        functionRunStringIndex,
        0,
        "Found string for 'run' method call"
      );

      // Then lookup for the matching frame, based on the string index
      const { frameTable } = contentThread;
      const FRAME_LOCATION_SLOT = frameTable.schema.location;
      const functionRunFrameIndex = frameTable.data.findIndex(
        frame => frame[FRAME_LOCATION_SLOT] == functionRunStringIndex
      );
      Assert.greater(
        functionRunFrameIndex,
        0,
        "Found frame for 'run' method call"
      );

      // Finally, assert that the stacks are correct.
      // Each symbol's frame is visible in a stack, and the stack tree is valid
      const { stackTable } = contentThread;
      const STACK_FRAME_SLOT = stackTable.schema.frame;
      const functionRunStack = stackTable.data.findIndex(
        stack => stack[STACK_FRAME_SLOT] == functionRunFrameIndex
      );

      function testSingleArgument(index, cb) {
        const { samples } = contentThread;
        const SAMPLE_STACK_SLOT = contentThread.samples.schema.stack;
        const functionRunSample = samples.data.filter(
          sample => sample[SAMPLE_STACK_SLOT] == functionRunStack
        )[index];

        Assert.notEqual(
          functionRunSample,
          undefined,
          "Found sample for 'run' method call"
        );

        const SAMPLE_ARGUMENT_VALUES_SLOT =
          contentThread.samples.schema.argumentValues;

        let reader = new BufferReader(
          tracedValuesBuffer,
          functionRunSample[SAMPLE_ARGUMENT_VALUES_SLOT]
        );

        // Array.prototype.map's callback is called with 3 args: element, index, array
        Assert.equal(reader.readUint32(), 1);

        cb(reader);
      }

      testSingleArgument(0, reader => {
        Assert.equal(
          reader.readUint8(),
          JSVAL_TYPE_INT32 | (NUMBER_IS_OUT_OF_LINE_MAGIC << 4)
        );
        Assert.equal(reader.readInt32(), 42);
      });

      testSingleArgument(1, reader => {
        Assert.equal(reader.readUint8(), JSVAL_TYPE_OBJECT);
        Assert.equal(reader.readUint8(), OBJECT_KIND_EXTERNAL);

        let shape = shapes[reader.readUint32()];
        Assert.equal(shape.length, 1);
        Assert.equal(shape[0], "HTMLDivElement");
      });
    }
  });
});

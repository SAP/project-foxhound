/*
 * Copyright (c) 2018 Deepak Kumar
 *
 * MIT License
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * https://github.com/stomp-js/stompjs
 * https://github.com/stomp-js/stompjs/blob/develop/src/parser.ts
 */

"use strict";

/**
 * @internal
 */
const NULL = 0;
/**
 * @internal
 */
const LF = 10;
/**
 * @internal
 */
const CR = 13;
/**
 * @internal
 */
const COLON = 58;
/**
 * This is an evented, rec descent parser.
 * A stream of Octets can be passed and whenever it recognizes
 * a complete Frame or an incoming ping it will invoke the registered callbacks.
 *
 * All incoming Octets are fed into #onByte function.
 * Depending on current state the #onByte function keeps changing.
 * Depending on the state it keeps accumulating into #token and #results.
 * State is indicated by current value of #onByte, all states are named as #collect.
 *
 * STOMP standards https://stomp.github.io/stomp-specification-1.2.html
 * imply that all lengths are considered in bytes (instead of string lengths).
 * So, before actual parsing, if the incoming data is String it is converted to Octets.
 * This allows faithful implementation of the protocol and allows NULL Octets to be present in the body.
 *
 * There is no peek function on the incoming data.
 * When a state change occurs based on an Octet without consuming the Octet,
 * the Octet, after state change, is fed again (#reinjectByte).
 * This became possible as the state change can be determined by inspecting just one Octet.
 *
 * There are two modes to collect the body, if content-length header is there then it by counting Octets
 * otherwise it is determined by NULL terminator.
 *
 * Following the standards, the command and headers are converted to Strings
 * and the body is returned as Octets.
 * Headers are returned as an array and not as Hash - to allow multiple occurrence of an header.
 *
 * This parser does not use Regular Expressions as that can only operate on Strings.
 *
 * It handles if multiple STOMP frames are given as one chunk, a frame is split into multiple chunks, or
 * any combination there of. The parser remembers its state (any partial frame) and continues when a new chunk
 * is pushed.
 *
 * Typically the higher level function will convert headers to Hash, handle unescaping of header values
 * (which is protocol version specific), and convert body to text.
 *
 * Check the parser.spec.js to understand cases that this parser is supposed to handle.
 *
 * Part of `@stomp/stompjs`.
 *
 * @internal
 */
class Parser {
  #bodyBytesRemaining;
  #decoder;
  #encoder;
  #headerKey;
  #onByte;
  #results;
  #token;

  constructor(onFrame, onIncomingPing) {
    this.onFrame = onFrame;
    this.onIncomingPing = onIncomingPing;
    this.#encoder = new TextEncoder();
    this.#decoder = new TextDecoder();
    this.#token = [];
    this.#initState();
  }
  parseChunk(segment, appendMissingNULLonIncoming = false) {
    let chunk;
    if (segment instanceof ArrayBuffer) {
      chunk = new Uint8Array(segment);
    } else {
      chunk = this.#encoder.encode(segment);
    }
    // See https://github.com/stomp-js/stompjs/issues/89
    // Remove when underlying issue is fixed.
    //
    // Send a NULL byte, if the last byte of a Text frame was not NULL.F
    if (appendMissingNULLonIncoming && chunk[chunk.length - 1] !== 0) {
      const chunkWithNull = new Uint8Array(chunk.length + 1);
      chunkWithNull.set(chunk, 0);
      chunkWithNull[chunk.length] = 0;
      chunk = chunkWithNull;
    }
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < chunk.length; i++) {
      const byte = chunk[i];
      this.#onByte(byte);
    }
  }
  // The following implements a simple Rec Descent Parser.
  // The grammar is simple and just one byte tells what should be the next state
  #collectFrame(byte) {
    if (byte === NULL) {
      // Ignore
      return;
    }
    if (byte === CR) {
      // Ignore CR
      return;
    }
    if (byte === LF) {
      // Incoming Ping
      this.onIncomingPing();
      return;
    }
    this.#onByte = this.#collectCommand;
    this.#reinjectByte(byte);
  }
  #collectCommand(byte) {
    if (byte === CR) {
      // Ignore CR
      return;
    }
    if (byte === LF) {
      this.#results.command = this.#consumeTokenAsUTF8();
      this.#onByte = this.#collectHeaders;
      return;
    }
    this.#consumeByte(byte);
  }
  #collectHeaders(byte) {
    if (byte === CR) {
      // Ignore CR
      return;
    }
    if (byte === LF) {
      this.#setupCollectBody();
      return;
    }
    this.#onByte = this.#collectHeaderKey;
    this.#reinjectByte(byte);
  }
  #reinjectByte(byte) {
    this.#onByte(byte);
  }
  #collectHeaderKey(byte) {
    if (byte === COLON) {
      this.#headerKey = this.#consumeTokenAsUTF8();
      this.#onByte = this.#collectHeaderValue;
      return;
    }
    this.#consumeByte(byte);
  }
  #collectHeaderValue(byte) {
    if (byte === CR) {
      // Ignore CR
      return;
    }
    if (byte === LF) {
      this.#results.headers.push([this.#headerKey, this.#consumeTokenAsUTF8()]);
      this.#headerKey = undefined;
      this.#onByte = this.#collectHeaders;
      return;
    }
    this.#consumeByte(byte);
  }
  #setupCollectBody() {
    const contentLengthHeader = this.#results.headers.filter(header => {
      return header[0] === "content-length";
    })[0];
    if (contentLengthHeader) {
      this.#bodyBytesRemaining = parseInt(contentLengthHeader[1], 10);
      this.#onByte = this.#collectBodyFixedSize;
    } else {
      this.#onByte = this.#collectBodyNullTerminated;
    }
  }
  #collectBodyNullTerminated(byte) {
    if (byte === NULL) {
      this.#retrievedBody();
      return;
    }
    this.#consumeByte(byte);
  }
  #collectBodyFixedSize(byte) {
    // It is post decrement, so that we discard the trailing NULL octet
    if (this.#bodyBytesRemaining-- === 0) {
      this.#retrievedBody();
      return;
    }
    this.#consumeByte(byte);
  }
  #retrievedBody() {
    this.#results.binaryBody = this.#consumeTokenAsRaw();
    this.onFrame(this.#results);
    this.#initState();
  }
  // Rec Descent Parser helpers
  #consumeByte(byte) {
    this.#token.push(byte);
  }
  #consumeTokenAsUTF8() {
    return this.#decoder.decode(this.#consumeTokenAsRaw());
  }
  #consumeTokenAsRaw() {
    const rawResult = new Uint8Array(this.#token);
    this.#token = [];
    return rawResult;
  }
  #initState() {
    this.#results = {
      command: undefined,
      headers: [],
      binaryBody: undefined,
    };
    this.#token = [];
    this.#headerKey = undefined;
    this.#onByte = this.#collectFrame;
  }
}

module.exports = { Parser };

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const ArrayBufferInputStream = Components.Constructor(
  "@mozilla.org/io/arraybuffer-input-stream;1",
  "nsIArrayBufferInputStream"
);
const BinaryInputStream = Components.Constructor(
  "@mozilla.org/binaryinputstream;1",
  "nsIBinaryInputStream",
  "setInputStream"
);

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = {};

XPCOMUtils.defineLazyServiceGetter(
  lazy,
  "gActivityDistributor",
  "@mozilla.org/network/http-activity-distributor;1",
  "nsIHttpActivityDistributor"
);

ChromeUtils.defineESModuleGetters(lazy, {
  setTimeout: "resource://gre/modules/Timer.sys.mjs",
});

class NetworkThrottleListener {
  #activities;
  #offset;
  #originalListener;
  #pendingData;
  #pendingException;
  #queue;
  #responseStarted;

  /**
   * Construct a new nsIStreamListener that buffers data and provides a
   * method to notify another listener when data is available.  This is
   * used to throttle network data on a per-channel basis.
   *
   * After construction, @see setOriginalListener must be called on the
   * new object.
   *
   * @param {NetworkThrottleQueue} queue the NetworkThrottleQueue to
   *        which status changes should be reported
   */
  constructor(queue) {
    this.#activities = {};
    this.#offset = 0;
    this.#pendingData = [];
    this.#pendingException = null;
    this.#queue = queue;
    this.#responseStarted = false;
  }

  /**
   * Set the original listener for this object.  The original listener
   * will receive requests from this object when the queue allows data
   * through.
   *
   * @param {nsIStreamListener} originalListener the original listener
   *        for the channel, to which all requests will be sent
   */
  setOriginalListener(originalListener) {
    this.#originalListener = originalListener;
  }

  /**
   * @see nsIStreamListener.onStartRequest.
   */
  onStartRequest(request) {
    this.#originalListener.onStartRequest(request);
    this.#queue.start(this);
  }

  /**
   * @see nsIStreamListener.onStopRequest.
   */
  onStopRequest(request, statusCode) {
    this.#pendingData.push({ request, statusCode });
    this.#queue.dataAvailable(this);
  }

  /**
   * @see nsIStreamListener.onDataAvailable.
   */
  onDataAvailable(request, inputStream, offset, count) {
    if (this.#pendingException) {
      throw this.#pendingException;
    }

    const bin = new BinaryInputStream(inputStream);
    const bytes = new ArrayBuffer(count);
    bin.readArrayBuffer(count, bytes);

    const stream = new ArrayBufferInputStream();
    stream.setData(bytes, 0, count);

    this.#pendingData.push({ request, stream, count });
    this.#queue.dataAvailable(this);
  }

  /**
   * Allow some buffered data from this object to be forwarded to this
   * object's originalListener.
   *
   * @param {Number} bytesPermitted The maximum number of bytes
   *        permitted to be sent.
   * @return {Object} an object of the form {length, done}, where
   *         |length| is the number of bytes actually forwarded, and
   *         |done| is a boolean indicating whether this particular
   *         request has been completed.  (A NetworkThrottleListener
   *         may be queued multiple times, so this does not mean that
   *         all available data has been sent.)
   */
  sendSomeData(bytesPermitted) {
    if (this.#pendingData.length === 0) {
      // Shouldn't happen.
      return { length: 0, done: true };
    }

    const { request, stream, count, statusCode } = this.#pendingData[0];

    if (statusCode !== undefined) {
      this.#pendingData.shift();
      this.#originalListener.onStopRequest(request, statusCode);
      return { length: 0, done: true };
    }

    if (bytesPermitted > count) {
      bytesPermitted = count;
    }

    try {
      this.#originalListener.onDataAvailable(
        request,
        stream,
        this.#offset,
        bytesPermitted
      );
    } catch (e) {
      this.#pendingException = e;
    }

    let done = false;
    if (bytesPermitted === count) {
      this.#pendingData.shift();
      done = true;
    } else {
      this.#pendingData[0].count -= bytesPermitted;
    }

    this.#offset += bytesPermitted;
    // Maybe our state has changed enough to emit an event.
    this.#maybeEmitEvents();

    return { length: bytesPermitted, done };
  }

  /**
   * Return the number of pending data requests available for this
   * listener.
   */
  pendingCount() {
    return this.#pendingData.length;
  }

  /**
   * This is called when an http activity event is delivered.  This
   * object delays the event until the appropriate moment.
   */
  addActivityCallback(
    callback,
    httpActivity,
    channel,
    activityType,
    activitySubtype,
    timestamp,
    extraSizeData,
    extraStringData
  ) {
    const datum = {
      callback,
      httpActivity,
      channel,
      activityType,
      activitySubtype,
      extraSizeData,
      extraStringData,
    };
    this.#activities[activitySubtype] = datum;

    if (
      activitySubtype ===
      lazy.gActivityDistributor.ACTIVITY_SUBTYPE_RESPONSE_COMPLETE
    ) {
      this.totalSize = extraSizeData;
    }

    this.#maybeEmitEvents();
  }

  /**
   * This is called for a download throttler when the latency timeout
   * has ended.
   */
  responseStart() {
    this.#responseStarted = true;
    this.#maybeEmitEvents();
  }

  /**
   * Check our internal state and emit any http activity events as
   * needed.  Note that we wait until both our internal state has
   * changed and we've received the real http activity event from
   * platform.  This approach ensures we can both pass on the correct
   * data from the original event, and update the reported time to be
   * consistent with the delay we're introducing.
   */
  #maybeEmitEvents() {
    if (this.#responseStarted) {
      this.#maybeEmit(
        lazy.gActivityDistributor.ACTIVITY_SUBTYPE_RESPONSE_START
      );
      this.#maybeEmit(
        lazy.gActivityDistributor.ACTIVITY_SUBTYPE_RESPONSE_HEADER
      );
    }

    if (this.totalSize !== undefined && this.#offset >= this.totalSize) {
      this.#maybeEmit(
        lazy.gActivityDistributor.ACTIVITY_SUBTYPE_RESPONSE_COMPLETE
      );
      this.#maybeEmit(
        lazy.gActivityDistributor.ACTIVITY_SUBTYPE_TRANSACTION_CLOSE
      );
    }
  }

  /**
   * Emit an event for |code|, if the appropriate entry in
   * |activities| is defined.
   */
  #maybeEmit(code) {
    if (this.#activities[code] !== undefined) {
      const {
        callback,
        httpActivity,
        channel,
        activityType,
        activitySubtype,
        extraSizeData,
        extraStringData,
      } = this.#activities[code];
      const now = Date.now() * 1000;
      callback(
        httpActivity,
        channel,
        activityType,
        activitySubtype,
        now,
        extraSizeData,
        extraStringData
      );
      this.#activities[code] = undefined;
    }
  }

  QueryInterface = ChromeUtils.generateQI([
    "nsIStreamListener",
    "nsIInterfaceRequestor",
  ]);
}

class NetworkThrottleQueue {
  #downloadQueue;
  #latencyMax;
  #latencyMean;
  #maxBPS;
  #meanBPS;
  #pendingRequests;
  #previousReads;
  #pumping;

  /**
   * Construct a new queue that can be used to throttle the network for
   * a group of related network requests.
   *
   * meanBPS {Number} Mean bytes per second.
   * maxBPS {Number} Maximum bytes per second.
   * latencyMean {Number} Mean latency in milliseconds.
   * latencyMax {Number} Maximum latency in milliseconds.
   */
  constructor(meanBPS, maxBPS, latencyMean, latencyMax) {
    this.#meanBPS = meanBPS;
    this.#maxBPS = maxBPS;
    this.#latencyMean = latencyMean;
    this.#latencyMax = latencyMax;

    this.#pendingRequests = new Set();
    this.#downloadQueue = [];
    this.#previousReads = [];

    this.#pumping = false;
  }

  /**
   * A helper function that lets the indicating listener start sending
   * data.  This is called after the initial round trip time for the
   * listener has elapsed.
   */
  #allowDataFrom(throttleListener) {
    throttleListener.responseStart();
    this.#pendingRequests.delete(throttleListener);
    const count = throttleListener.pendingCount();
    for (let i = 0; i < count; ++i) {
      this.#downloadQueue.push(throttleListener);
    }
    this.#pump();
  }

  /**
   * An internal function that permits individual listeners to send
   * data.
   */
  #pump() {
    // A redirect will cause two NetworkThrottleListeners to be on a
    // listener chain.  In this case, we might recursively call into
    // this method.  Avoid infinite recursion here.
    if (this.#pumping) {
      return;
    }
    this.#pumping = true;

    const now = Date.now();
    const oneSecondAgo = now - 1000;

    while (
      this.#previousReads.length &&
      this.#previousReads[0].when < oneSecondAgo
    ) {
      this.#previousReads.shift();
    }

    const totalBytes = this.#previousReads.reduce((sum, elt) => {
      return sum + elt.numBytes;
    }, 0);

    let thisSliceBytes = this.#random(this.#meanBPS, this.#maxBPS);
    if (totalBytes < thisSliceBytes) {
      thisSliceBytes -= totalBytes;
      let readThisTime = 0;
      while (thisSliceBytes > 0 && this.#downloadQueue.length) {
        const { length, done } = this.#downloadQueue[0].sendSomeData(
          thisSliceBytes
        );
        thisSliceBytes -= length;
        readThisTime += length;
        if (done) {
          this.#downloadQueue.shift();
        }
      }
      this.#previousReads.push({ when: now, numBytes: readThisTime });
    }

    // If there is more data to download, then schedule ourselves for
    // one second after the oldest previous read.
    if (this.#downloadQueue.length) {
      const when = this.#previousReads[0].when + 1000;
      lazy.setTimeout(this.#pump.bind(this), when - now);
    }

    this.#pumping = false;
  }

  /**
   * A helper function that, given a mean and a maximum, returns a
   * random integer between (mean - (max - mean)) and max.
   */
  #random(mean, max) {
    return mean - (max - mean) + Math.floor(2 * (max - mean) * Math.random());
  }

  /**
   * Notice a new listener object.  This is called by the
   * NetworkThrottleListener when the request has started.  Initially
   * a new listener object is put into a "pending" state, until the
   * round-trip time has elapsed.  This is used to simulate latency.
   *
   * @param {NetworkThrottleListener} throttleListener the new listener
   */
  start(throttleListener) {
    this.#pendingRequests.add(throttleListener);
    const delay = this.#random(this.#latencyMean, this.#latencyMax);
    if (delay > 0) {
      lazy.setTimeout(() => this.#allowDataFrom(throttleListener), delay);
    } else {
      this.#allowDataFrom(throttleListener);
    }
  }

  /**
   * Note that new data is available for a given listener.  Each time
   * data is available, the listener will be re-queued.
   *
   * @param {NetworkThrottleListener} throttleListener the listener
   *        which has data available.
   */
  dataAvailable(throttleListener) {
    if (!this.#pendingRequests.has(throttleListener)) {
      this.#downloadQueue.push(throttleListener);
      this.#pump();
    }
  }
}

/**
 * Construct a new object that can be used to throttle the network for
 * a group of related network requests.
 *
 * @param {Object} An object with the following attributes:
 * latencyMean {Number} Mean latency in milliseconds.
 * latencyMax {Number} Maximum latency in milliseconds.
 * downloadBPSMean {Number} Mean bytes per second for downloads.
 * downloadBPSMax {Number} Maximum bytes per second for downloads.
 * uploadBPSMean {Number} Mean bytes per second for uploads.
 * uploadBPSMax {Number} Maximum bytes per second for uploads.
 *
 * Download throttling will not be done if downloadBPSMean and
 * downloadBPSMax are <= 0.  Upload throttling will not be done if
 * uploadBPSMean and uploadBPSMax are <= 0.
 */
export class NetworkThrottleManager {
  #downloadQueue;

  constructor({
    latencyMean,
    latencyMax,
    downloadBPSMean,
    downloadBPSMax,
    uploadBPSMean,
    uploadBPSMax,
  }) {
    if (downloadBPSMax <= 0 && downloadBPSMean <= 0) {
      this.#downloadQueue = null;
    } else {
      this.#downloadQueue = new NetworkThrottleQueue(
        downloadBPSMean,
        downloadBPSMax,
        latencyMean,
        latencyMax
      );
    }
    if (uploadBPSMax <= 0 && uploadBPSMean <= 0) {
      this.uploadQueue = null;
    } else {
      this.uploadQueue = Cc[
        "@mozilla.org/network/throttlequeue;1"
      ].createInstance(Ci.nsIInputChannelThrottleQueue);
      this.uploadQueue.init(uploadBPSMean, uploadBPSMax);
    }
  }

  /**
   * Create a new NetworkThrottleListener for a given channel and
   * install it using |setNewListener|.
   *
   * @param {nsITraceableChannel} channel the channel to manage
   * @return {NetworkThrottleListener} the new listener, or null if
   *         download throttling is not being done.
   */
  manage(channel) {
    if (this.#downloadQueue) {
      const listener = new NetworkThrottleListener(this.#downloadQueue);
      const originalListener = channel.setNewListener(listener);
      listener.setOriginalListener(originalListener);
      return listener;
    }
    return null;
  }

  /**
   * Throttle uploads taking place on the given channel.
   *
   * @param {nsITraceableChannel} channel the channel to manage
   */
  manageUpload(channel) {
    if (this.uploadQueue) {
      channel = channel.QueryInterface(Ci.nsIThrottledInputChannel);
      channel.throttleQueue = this.uploadQueue;
    }
  }
}

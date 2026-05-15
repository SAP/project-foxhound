/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Bug 1913599 - Sites that depend on legacy createEncodedStreams()
 *
 * Several websites that offer end-to-end encrypted communication in
 * Chrome fail to work in Firefox, either ghosting the button that
 * offers this feature or erroring with a message like "Voice/Video
 * calling is not supported on this browser".
 *
 * These webpages rely on the older Chrome-only createEncodedStreams()
 * API instead of the standard RTCRtpScriptTransform API now available
 * in all browsers. The following shims the former using the latter.
 *
 * Note: this shim has inherent performance limitations being on
 * main thread. Websites are encouraged to upgrade to the standard
 * worker-based API directly for optimal performance in Firefox.
 */

if (!window.RTCRtpSender.prototype.createEncodedStreams) {
  console.info(
    "createEncodedStreams() is being shimmed for compatibility reasons. Please consider updating to the RTCRtpScriptTransform API for optimal performance! See https://bugzil.la/1913599 for details."
  );

  window.RTCRtpSender.prototype.createEncodedStreams =
    window.RTCRtpReceiver.prototype.createEncodedStreams =
      function createEncodedStreams() {
        let onrtctransform; // appease linter
        function work() {
          const originals = [];
          onrtctransform = async ({ transformer: { readable, writable } }) => {
            const diverter = new TransformStream({
              transform: (original, controller) => {
                originals.push(original);
                controller.enqueue(original);
              },
            });
            const reinserter = new TransformStream({
              transform: (frame, controller) => {
                const original = originals.shift();
                original.data = frame.data;
                controller.enqueue(original);
              },
            });
            self.postMessage(
              { readable: diverter.readable, writable: reinserter.writable },
              { transfer: [diverter.readable, reinserter.writable] }
            );
            await readable
              .pipeThrough({
                writable: diverter.writable,
                readable: reinserter.readable,
              })
              .pipeTo(writable);
          };
        }
        this._worker = new Worker(
          `data:text/javascript,(${work.toString()})()`
        );
        this.transform = new window.RTCRtpScriptTransform(this._worker);
        this._dummy = onrtctransform; // appease linter
        const readableNow = new TransformStream();
        const writableNow = new TransformStream();
        const haveData = new Promise(
          r => (this._worker.onmessage = e => r(e.data))
        );
        haveData
          .then(({ readable }) => readable.pipeTo(readableNow.writable))
          .catch(e => readableNow.writable.abort(e));
        haveData
          .then(({ writable }) => writableNow.readable.pipeTo(writable))
          .catch(e => writableNow.readable.cancel(e));
        return {
          readable: readableNow.readable,
          writable: writableNow.writable,
        };
      };
}

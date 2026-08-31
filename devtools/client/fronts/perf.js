/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * @typedef {import("perf").BulkReceiving} BulkReceiving
 */

const {
  FrontClassWithSpec,
  registerFront,
} = require("resource://devtools/shared/protocol.js");
const { perfSpec } = require("resource://devtools/shared/specs/perf.js");

class PerfFront extends FrontClassWithSpec(perfSpec) {
  constructor(client, targetFront, parentFront) {
    super(client, targetFront, parentFront);

    // Attribute name from which to retrieve the actorID out of the target actor's form
    this.formAttributeName = "perfActor";
  }

  async getProfileAndStopProfiler() {
    const handle = await this.startCaptureAndStopProfiler();

    // Start both calls in parallel
    const profilePromise = this.getPreviouslyCapturedProfileDataBulk(handle);
    const additionalInformationPromise =
      this.getPreviouslyRetrievedAdditionalInformation(handle);

    // But make sure we wait until the end of both calls even in case of an error.
    const [profileResult, additionalInformationResult] =
      await Promise.allSettled([profilePromise, additionalInformationPromise]);

    if (profileResult.status === "rejected") {
      throw profileResult.reason;
    }

    if (additionalInformationResult.status === "rejected") {
      throw additionalInformationResult.reason;
    }

    return {
      profile: profileResult.value,
      additionalInformation: additionalInformationResult.value,
    };
  }

  /**
   * This implements the retrieval of the profile data using the bulk protocol.
   *
   * @param {number} handle THe handle returned by startCaptureAndStopProfiler
   */
  async getPreviouslyCapturedProfileDataBulk(handle) {
    /**
     * @typedef {BulkReceiving}
     */
    const profileResult = await super.getPreviouslyCapturedProfileDataBulk(
      handle
    );

    if (!profileResult) {
      throw new Error(
        "this.conn.request returns null or undefined, this is unexpected."
      );
    }

    if (!profileResult.length) {
      throw new Error(
        "The profile result is an empty buffer, this is unexpected."
      );
    }

    // We need to copy the data out of the stream we get using the bulk API.
    // Note that the profile data is gzipped, but the profiler's frontend code
    // knows how to deal with it.
    const buffer = new ArrayBuffer(profileResult.length);
    await profileResult.copyToBuffer(buffer);
    return buffer;
  }
}

registerFront(PerfFront);

/**
 * Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

import { RequestError } from "resource://testing-common/dom/quota/test/modules/RequestError.sys.mjs";

export const SimpleDBUtils = {
  createConnection(principal) {
    const connection = Cc["@mozilla.org/dom/sdb-connection;1"].createInstance(
      Ci.nsISDBConnection
    );

    connection.init(principal);

    return connection;
  },

  /**
   * Handles the completion of a request, awaiting the callback to be called
   * before proceeding.
   *
   * This function is designed to handle requests of the type `nsISDBRequest`
   *
   * These requests are typically returned by the connection.
   *
   * @param {Object} request
   *   The request object, which must have a callback property and
   *   result-related properties (e.g., resultCode, resultName).
   * @returns {Promise}
   *   Resolves with the request's result when the operation is successful.
   * @throws {RequestError}
   *   If the request's resultCode is not `Cr.NS_OK`, indicating an error in
   *   the request.
   */
  async requestFinished(request) {
    await new Promise(function (resolve) {
      request.callback = function () {
        resolve();
      };
    });

    if (request.resultCode !== Cr.NS_OK) {
      throw new RequestError(request.resultCode, request.resultName);
    }

    return request.result;
  },
};

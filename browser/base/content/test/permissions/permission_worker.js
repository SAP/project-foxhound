/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Worker script for browser_temporary_permissions_worker.js

self.onmessage = async function (e) {
  if (e.data === "query") {
    try {
      let status = await navigator.permissions.query({ name: "geolocation" });
      self.postMessage({ type: "state", state: status.state });
    } catch (ex) {
      self.postMessage({ type: "error", message: ex.message });
    }
  }
};

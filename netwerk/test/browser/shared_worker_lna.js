/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

self.onconnect = function (e) {
  const port = e.ports[0];
  port.onmessage = async function (ev) {
    const { type, rand } = ev.data;
    const url = `http://localhost:21555/?type=${type}&rand=${rand}`;

    try {
      if (type === "shared-worker-xhr") {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.onload = () => {
          port.postMessage({ status: xhr.status === 200 ? "OK" : "FAIL" });
        };
        xhr.onerror = () => {
          port.postMessage({ status: "FAIL" });
        };
        xhr.send();
      } else {
        const res = await fetch(url);
        if (res.ok) {
          port.postMessage({ status: "OK" });
        } else {
          port.postMessage({ status: "FAIL" });
        }
      }
    } catch (ex) {
      port.postMessage({ status: "FAIL", error: ex.message });
    }
  };
};

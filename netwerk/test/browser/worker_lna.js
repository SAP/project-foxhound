/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

self.onmessage = async function (e) {
  const { type, rand } = e.data;
  const url = `http://localhost:21555/?type=${type}&rand=${rand}`;

  try {
    if (type === "xhr" || type === "worker-xhr") {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.onload = () => {
        self.postMessage({ status: xhr.status === 200 ? "OK" : "FAIL" });
      };
      xhr.onerror = () => {
        self.postMessage({ status: "FAIL" });
      };
      xhr.send();
    } else {
      const res = await fetch(url);
      if (res.ok) {
        self.postMessage({ status: "OK" });
      } else {
        self.postMessage({ status: "FAIL" });
      }
    }
  } catch (ex) {
    self.postMessage({ status: "FAIL", error: ex.message });
  }
};

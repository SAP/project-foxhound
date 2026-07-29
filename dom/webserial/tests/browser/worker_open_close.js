/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

self.onmessage = async function (e) {
  try {
    if (e.data === "open") {
      const ports = await navigator.serial.getPorts();
      if (!ports.length) {
        self.postMessage({ type: "error", message: "No ports available" });
        return;
      }
      const port = ports[0];
      await port.open({ baudRate: 9600 });
      self.postMessage({ type: "opened" });
    } else if (e.data === "close") {
      const ports = await navigator.serial.getPorts();
      if (!ports.length) {
        self.postMessage({ type: "error", message: "No ports available" });
        return;
      }
      const port = ports[0];
      await port.close();
      self.postMessage({ type: "closed" });
    }
  } catch (ex) {
    self.postMessage({
      type: "error",
      message: `${ex.name}: ${ex.message}`,
    });
  }
};

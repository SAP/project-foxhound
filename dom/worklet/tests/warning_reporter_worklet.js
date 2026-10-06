let caught = false;
try {
  // This reports:
  //   * a warning for the unreachable code
  //   * an error for a garbage after the function body
  new Function("return 0; 1;}");
} catch (e) {
  caught = true;
}

class WarningWorkletProcessor extends AudioWorkletProcessor {
  constructor(...args) {
    super(...args);
    this.port.postMessage({ type: "finish", caught });
  }

  process() {
    // Do nothing, output silence
    return true;
  }
}

registerProcessor("warning", WarningWorkletProcessor);

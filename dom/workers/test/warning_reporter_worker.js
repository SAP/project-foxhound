let caught = false;
try {
  // This reports:
  //   * a warning for the unreachable code
  //   * an error for a garbage after the function body
  new Function("return 0; 1;}");
} catch (e) {
  caught = true;
}

postMessage({ type: "finish", caught });

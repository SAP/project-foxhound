// Note: the test will fail if the expression below evaluates to `false`.
setInterruptCallback(`
  // These functions should be available.
  typeof ArrayBuffer === "function" &&
  typeof gc === "function" &&
  typeof enableGeckoProfilingWithSlowAssertions === "function" &&
  typeof disableGeckoProfiling === "function" &&
  typeof readGeckoProfilingStack === "function" &&

  // These shouldn't be available.
  typeof getBacktrace === "undefined" &&
  typeof newGlobal === "undefined" &&
  typeof getSharedArrayBuffer === "undefined" &&
  typeof drainJobQueue === "undefined" &&
  typeof oomTest === "undefined" &&
  typeof Debugger === "undefined"
`);
interruptIf(true);
for (var i = 0; i < 10; i++) {}

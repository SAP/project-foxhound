/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

// This test checks that the various console log methods create messages when
// used with a logger with a matching maxLogLevel.

const TESTS = [
  { method: "trace", methodLevel: "Trace" },
  { method: "debug", methodLevel: "Debug" },
  { method: "count", methodLevel: "Info" },
  { method: "countReset", methodLevel: "Info" },
  { method: "dir", methodLevel: "Info" },
  { method: "dirxml", methodLevel: "Info" },
  {
    method: "group",
    callMethodFn: (logger, msg) => {
      logger.group(msg);
      logger.groupEnd();
    },
    methodLevel: "Info",
  },
  { method: "info", methodLevel: "Info" },
  { method: "log", methodLevel: "Info" },
  { method: "table", methodLevel: "Info" },
  {
    method: "TimeEnd",
    callMethodFn: (logger, msg) => {
      logger.time(msg);
      logger.timeEnd(msg);
    },
    methodLevel: "Info",
  },
  {
    method: "timeLog",
    callMethodFn: (logger, msg) => {
      logger.time(msg);
      logger.timeLog(msg);
    },
    methodLevel: "Info",
  },
  { method: "warn", methodLevel: "Warn" },
  {
    method: "assert",
    callMethodFn: (logger, msg) => logger.assert(false, msg),
    methodLevel: "Error",
  },
  { method: "error", methodLevel: "Error" },
  { method: "exception", methodLevel: "Error" },
];

// @see WebIDLLogLevelToInteger
const levelToInteger = {
  Error: 1,
  Warn: 2,
  Info: 3,
  Debug: 4,
  Trace: 5,
};

// This message will be logged as an error in all tests to avoid waiting
// indefinitely for messages that will not be logged.
const CANARY = "canary-error-message";

add_task(async function test_AssertMethod_levels() {
  for (const test of TESTS) {
    const { method, methodLevel } = test;
    const callMethodFn =
      test.callMethodFn || ((logger, msg) => logger[method](msg));

    for (const level of Object.keys(levelToInteger)) {
      const ci = console.createInstance({ maxLogLevel: level });

      const logExpected = levelToInteger[level] >= levelToInteger[methodLevel];

      const expectedMessage = method + "-" + level;
      const onMessage = waitForMessage(expectedMessage);
      callMethodFn(ci, expectedMessage);
      ci.error(CANARY);
      const messageReceived = await onMessage;

      Assert.equal(
        messageReceived,
        logExpected,
        `The message for method ${method} should be ${logExpected ? "LOGGED" : "SKIPPED"} for level ${level}`
      );
    }
  }
});

/**
 * Wait for a message with the provided expectedContent.
 *
 * @param {string} expectedContent
 *        A substring which should be found in the logged message.
 *
 * @return A promise which resolves to true if the message was received, false
 *         otherwise.
 */
function waitForMessage(expectedContent) {
  return new Promise(r => {
    function consoleListener() {
      addConsoleStorageListener(this);
    }

    consoleListener.prototype = {
      observe(aSubject) {
        let obj = aSubject.wrappedJSObject;

        // Received the expected message, remove listener and resolve true.
        if (obj.arguments[0].includes(expectedContent)) {
          removeConsoleStorageListener(this);
          r(true);
        }

        // Received the canary, meaning we missed the expected message.
        // Remove listener and resolve false.
        if (obj.arguments[0].includes(CANARY)) {
          removeConsoleStorageListener(this);
          r(false);
        }
      },
    };

    new consoleListener();
  });
}

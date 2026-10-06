/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * @todo Bug 2005403
 * Move this to main assert module, could look like:
 * await Assert.continueOnAssert(async function() {
 *   Assert.ok();
 *   await Assert.rejects();
 *   ...
 * });
 */
function SoftAssert() {
  this.failures = [];
}

SoftAssert.prototype._recordFailure = function (err, context) {
  this.failures.push({
    message: err.message,
    name: err.name,
    stack: err.stack,
    context,
  });
};

SoftAssert.prototype.throws = function (
  block,
  expectedError,
  message = "throws failed"
) {
  try {
    Assert.throws(block, expectedError, message);

    this._recordFailure(new Error("Did not throw"), {
      type: "throws",
      expectedError,
      message,
    });
  } catch {}
};

SoftAssert.prototype.ok = function (condition, message = "ok failed") {
  try {
    Assert.ok(condition, message);
  } catch (err) {
    this._recordFailure(err, { type: "ok", condition, message });
  }
};

SoftAssert.prototype.equal = function (
  actual,
  expected,
  message = "equal failed"
) {
  try {
    Assert.equal(actual, expected, message);
  } catch (err) {
    this._recordFailure(err, { type: "equal", actual, expected, message });
  }
};

SoftAssert.prototype.notEqual = function (
  actual,
  expected,
  message = "notEqual failed"
) {
  try {
    Assert.notEqual(actual, expected, message);
  } catch (err) {
    this._recordFailure(err, { type: "notEqual", actual, expected, message });
  }
};

SoftAssert.prototype.deepEqual = function (
  actual,
  expected,
  message = "deepEqual failed"
) {
  try {
    Assert.deepEqual(actual, expected, message);
  } catch (err) {
    this._recordFailure(err, { type: "deepEqual", actual, expected, message });
  }
};

SoftAssert.prototype.notDeepEqual = function (
  actual,
  expected,
  message = "notDeepEqual failed"
) {
  try {
    Assert.notDeepEqual(actual, expected, message);
  } catch (err) {
    this._recordFailure(err, {
      type: "notDeepEqual",
      actual,
      expected,
      message,
    });
  }
};

SoftAssert.prototype.strictEqual = function (
  actual,
  expected,
  message = "strictEqual failed"
) {
  try {
    Assert.strictEqual(actual, expected, message);
  } catch (err) {
    this._recordFailure(err, {
      type: "strictEqual",
      actual,
      expected,
      message,
    });
  }
};

SoftAssert.prototype.notStrictEqual = function (
  actual,
  expected,
  message = "notStrictEqual failed"
) {
  try {
    Assert.notStrictEqual(actual, expected, message);
  } catch (err) {
    this._recordFailure(err, {
      type: "notStrictEqual",
      actual,
      expected,
      message,
    });
  }
};

SoftAssert.prototype.rejects = async function (
  actual,
  expected,
  message = "rejects failed"
) {
  try {
    await Assert.rejects(actual, expected, message);
  } catch (err) {
    this._recordFailure(err, { type: "rejects", actual, expected, message });
  }
};

SoftAssert.prototype.greater = function (
  actual,
  expected,
  message = "greater failed"
) {
  try {
    Assert.greater(actual, expected, message);
  } catch (err) {
    this._recordFailure(err, { type: "greater", actual, expected, message });
  }
};

SoftAssert.prototype.greaterOrEqual = function (
  actual,
  expected,
  message = "greaterOrEqual failed"
) {
  try {
    Assert.greaterOrEqual(actual, expected, message);
  } catch (err) {
    this._recordFailure(err, {
      type: "greaterOrEqual",
      actual,
      expected,
      message,
    });
  }
};

SoftAssert.prototype.less = function (
  actual,
  expected,
  message = "less failed"
) {
  try {
    Assert.less(actual, expected, message);
  } catch (err) {
    this._recordFailure(err, { type: "less", actual, expected, message });
  }
};

SoftAssert.prototype.lessOrEqual = function (
  actual,
  expected,
  message = "lessOrEqual failed"
) {
  try {
    Assert.lessOrEqual(actual, expected, message);
  } catch (err) {
    this._recordFailure(err, {
      type: "lessOrEqual",
      actual,
      expected,
      message,
    });
  }
};

// Call this at the end to fail the test if any soft asserts failed.
SoftAssert.prototype.assertAll = function (label = "Soft assertion failures") {
  if (!this.failures.length) {
    return;
  }

  let details = `${label} (${this.failures.length}):\n`;
  for (let i = 0; i < this.failures.length; i++) {
    const f = this.failures[i];
    details += `\n[${i + 1}] ${f.message}\n`;
    if (f.context) {
      details += `   Context: ${JSON.stringify(f.context)}\n`;
    }
    if (f.stack) {
      details += `   Stack: ${f.stack}\n`;
    }
  }

  // One combined failure at the end:
  throw new Error(details);
};

function softAssertions(Assert) {
  /**
   * Provides a way to execute multiple assertions without exiting
   * a test after the first assertion failure. All assertions in the
   * provided callback will run even if some assertions fail. If an
   * assertion fails, the test will fail and provide details on the
   * failed assertion(s).
   *
   * @example
   * Assert.withSoftAssertions(function(soft) {
   *   // Use usual Assert functions via `soft` reference:
   *   soft.equal(conversation.id.length, 12);
   *   soft.ok(Array.isArray(conversation.messages));
   *   soft.ok(!isNaN(conversation.createdDate));
   * });
   *
   * @param {Function} tests - A callback that acceps a `soft` object to run assertions with.
   */
  Assert.withSoftAssertions = function (tests) {
    const soft = new SoftAssert();
    tests(soft);
    soft.assertAll();
  };
}

softAssertions(Assert);

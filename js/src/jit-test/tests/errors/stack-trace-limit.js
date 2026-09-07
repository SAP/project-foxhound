// |jit-test| --enable-error-stack-trace-limit; skip-if: !Error.stackTraceLimit

load(libdir + "asserts.js");

// This is defined in ErrorObject.h and is the the default value
// for Error.stackTraceLimit.
const MAX_REPORTED_STACK_DEPTH = 128;
assertEq(Error.stackTraceLimit, MAX_REPORTED_STACK_DEPTH);

const desc = Object.getOwnPropertyDescriptor(Error, "stackTraceLimit");
assertEq(typeof desc.value, "number");
assertEq(desc.writable, true);
assertEq(desc.enumerable, true);
assertEq(desc.configurable, true);
assertEq(desc.get, undefined);
assertEq(desc.set, undefined);

function rec(a) {
    if (a === MAX_REPORTED_STACK_DEPTH + 10) {
      throw new Error();
    }
    rec(a + 1);
}

function countFrames(error) {
    return error.stack.split("\n").filter(line => line.length > 0).length;
}

const obj = {};
Error.stackTraceLimit = obj;
assertEq(Error.stackTraceLimit, obj);
try { rec(0); } catch (e) { assertEq(countFrames(e), 0); }

Error.stackTraceLimit = "not a number";
assertEq(Error.stackTraceLimit, "not a number");
try { rec(0); } catch (e) { assertEq(countFrames(e), 0); }

Error.stackTraceLimit = NaN;
assertEq(Error.stackTraceLimit, NaN);
try { rec(0); } catch (e) { assertEq(countFrames(e), 0); }

Error.stackTraceLimit = -Infinity;
assertEq(Error.stackTraceLimit, -Infinity);
try { rec(0); } catch (e) { assertEq(countFrames(e), 0); }

Error.stackTraceLimit = true;
assertEq(Error.stackTraceLimit, true);
try { rec(0); } catch (e) { assertEq(countFrames(e), 0); }

Error.stackTraceLimit = false;
assertEq(Error.stackTraceLimit, false);
try { rec(0); } catch (e) { assertEq(countFrames(e), 0); }

const sym = Symbol("hello");
Error.stackTraceLimit = sym;
assertEq(Error.stackTraceLimit, sym);
try { rec(0); } catch (e) { assertEq(countFrames(e), 0); }

const arr = [1, 2, 3];
Error.stackTraceLimit = arr;
assertEq(Error.stackTraceLimit, arr);
try { rec(0); } catch (e) { assertEq(countFrames(e), 0); }

const valObj = { valueOf() { return 5; } };
Error.stackTraceLimit = valObj;
assertEq(Error.stackTraceLimit, valObj);
try { rec(0); } catch (e) { assertEq(countFrames(e), 0); }

Error.stackTraceLimit = undefined;
assertEq(Error.stackTraceLimit, undefined);
try { rec(0); } catch (e) {
  assertEq(typeof e.stack, "undefined");
  assertEq("stack" in e, true);
}
assertEq(typeof new Error("test").stack, "undefined");
assertEq("stack" in new Error("test"), true);
const captureObj = {};
Error.captureStackTrace(captureObj);
assertEq(typeof captureObj.stack, "undefined");
assertEq("stack" in captureObj, true);

Error.stackTraceLimit = -0;
assertEq(Error.stackTraceLimit, -0);
try { rec(0); } catch (e) { assertEq(countFrames(e), 0); }

Error.stackTraceLimit = 0;
assertEq(Error.stackTraceLimit, 0);
try { rec(0); } catch (e) { assertEq(countFrames(e), 0); }

Error.stackTraceLimit = 3;
assertEq(Error.stackTraceLimit, 3);
try { rec(0); } catch (e) { assertEq(countFrames(e), 3); }

Error.stackTraceLimit = 10;
assertEq(Error.stackTraceLimit, 10);
try { rec(0); } catch (e) { assertEq(countFrames(e), 10); }

Error.stackTraceLimit = 25.9;
assertEq(Error.stackTraceLimit, 25.9);
try { rec(0); } catch (e) { assertEq(countFrames(e), 25); }

Error.stackTraceLimit = MAX_REPORTED_STACK_DEPTH;
assertEq(Error.stackTraceLimit, MAX_REPORTED_STACK_DEPTH);
try { rec(0); } catch (e) { assertEq(countFrames(e), MAX_REPORTED_STACK_DEPTH); }

Error.stackTraceLimit = MAX_REPORTED_STACK_DEPTH + 1;
assertEq(Error.stackTraceLimit, MAX_REPORTED_STACK_DEPTH + 1);
try { rec(0); } catch (e) { assertEq(countFrames(e), MAX_REPORTED_STACK_DEPTH); }

Error.stackTraceLimit = 1e12;
assertEq(Error.stackTraceLimit, 1e12);
try { rec(0); } catch (e) { assertEq(countFrames(e), MAX_REPORTED_STACK_DEPTH); }

Error.stackTraceLimit = Infinity;
assertEq(Error.stackTraceLimit, Infinity);
try { rec(0); } catch (e) { assertEq(countFrames(e), MAX_REPORTED_STACK_DEPTH); }

Error.stackTraceLimit = 3;
function deep(n) {
    if (n === 0) {
        var o = {};
        Error.captureStackTrace(o, caller);
        return o;
    }
    return deep(n - 1);
}
function caller() { return deep(5); }
assertEq(countFrames(caller()), 1);

// With stackTraceLimit=1 and a constructorOpt that skips the topmost
// JS frame, we must still capture one frame (the global frame).
Error.stackTraceLimit = 1;
function smallLimitCaller() {
    const target = {};
    Error.captureStackTrace(target, smallLimitCaller);
    return target;
}
assertEq(countFrames(smallLimitCaller()), 1);

delete Error.stackTraceLimit;
assertEq("stackTraceLimit" in Error, false);
try { rec(0); } catch (e) { assertEq(typeof e.stack, "undefined"); }

let getterCalled = false;
Object.defineProperty(Error, "stackTraceLimit", {
    get: () => { getterCalled = true; throw new RangeError("limit error"); },
    enumerable: true, configurable: true
});
assertThrowsInstanceOf(() => Error.stackTraceLimit, RangeError);
assertEq(getterCalled, true);
getterCalled = false;
try { rec(0); } catch (e) { assertEq(countFrames(e), MAX_REPORTED_STACK_DEPTH); }
assertEq(getterCalled, false);

getterCalled = false;
new Error("test");
assertEq(getterCalled, false);

getterCalled = false;
Error.captureStackTrace({});
assertEq(getterCalled, false);

Object.defineProperty(Error, "stackTraceLimit", {
    value: 3, writable: true, enumerable: true, configurable: true
});

// Exercise JSContext::setPendingException's stack capture path with
// non-Error throws across different stackTraceLimit values. The realm
// captures stacks for the first ~50 throws, so these all go through
// CaptureStack with the resolved limit.
Error.stackTraceLimit = undefined;
try { throw "string error"; } catch (e) { assertEq(e, "string error"); }
try { throw 42; } catch (e) { assertEq(e, 42); }
try { throw null; } catch (e) { assertEq(e, null); }
try { throw { value: 1 }; } catch (e) { assertEq(e.value, 1); }

Error.stackTraceLimit = 0;
try { throw "string error"; } catch (e) { assertEq(e, "string error"); }

Error.stackTraceLimit = 5;
try { throw "string error"; } catch (e) { assertEq(e, "string error"); }

Error.stackTraceLimit = 3;
Error = "";
try { rec(0); } catch (e) { assertEq(countFrames(e), 3); }

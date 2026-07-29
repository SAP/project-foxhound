// |reftest| shell-option(--enable-iterator-chunking) skip-if(!Iterator.prototype.hasOwnProperty('windows'))

/*---
features: [Iterator.windows]
---*/

// Invalid windowSize parameter types with default value for undersized
assertThrowsInstanceOf(() => Iterator.prototype.windows('1'), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(null), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(undefined), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows({}), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows([]), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(true), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(Symbol()), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(() => {}), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(10n), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(-10n), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(BigInt(10)), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(BigInt(-10)), RangeError);

// NaN and Infinity windowSize parameter types with default value for undersized
assertThrowsInstanceOf(() => Iterator.prototype.windows(NaN), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(Infinity), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(-Infinity), RangeError);

// Out of range windowSize parameter types with default value for undersized
assertThrowsInstanceOf(() => Iterator.prototype.windows(0), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(3.25), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(-1), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(2 ** 32), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(2 ** 32 + 1), RangeError);

// Invalid windowSize parameter types with allow-partial undersized
assertThrowsInstanceOf(() => Iterator.prototype.windows('1', "allow-partial"), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(null, "allow-partial"), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(undefined, "allow-partial"), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows({}, "allow-partial"), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows([], "allow-partial"), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(true, "allow-partial"), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(Symbol(), "allow-partial"), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(() => {}, "allow-partial"), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(10n, "allow-partial"), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(-10n, "allow-partial"), RangeError);

// NaN and Infinity windowSize parameter types with allow-partial undersized
assertThrowsInstanceOf(() => Iterator.prototype.windows(NaN, "allow-partial"), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(Infinity, "allow-partial"), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(-Infinity, "allow-partial"), RangeError);

// Out of range windowSize parameter types with allow-partial undersized
assertThrowsInstanceOf(() => Iterator.prototype.windows(0, "allow-partial"), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(3.25, "allow-partial"), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(-1, "allow-partial"), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(2 ** 32, "allow-partial"), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(2 ** 32 + 1, "allow-partial"), RangeError);

// Invalid windowSize parameter types with only-full undersized
assertThrowsInstanceOf(() => Iterator.prototype.windows('1', "only-full"), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(null, "only-full"), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(undefined, "only-full"), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows({}, "only-full"), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows([], "only-full"), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(true, "only-full"), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(Symbol(), "only-full"), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(() => {}, "only-full"), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(10n, "only-full"), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(-10n, "only-full"), RangeError);

// NaN and Infinity windowSize parameter types with only-full undersized
assertThrowsInstanceOf(() => Iterator.prototype.windows(NaN, "only-full"), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(Infinity, "only-full"), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(-Infinity, "only-full"), RangeError);

// Out of range windowSize parameter types with only-full undersized
assertThrowsInstanceOf(() => Iterator.prototype.windows(0, "only-full"), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(3.25, "only-full"), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(-1, "only-full"), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(2 ** 32, "only-full"), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(2 ** 32 + 1, "only-full"), RangeError);

// Invalid undersized parameter types
assertThrowsInstanceOf(() => Iterator.prototype.windows(2, 1), TypeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(2, 10n), TypeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(2, -10n), TypeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(2, null), TypeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(2, {}), TypeError);
assertThrowsInstanceOf(() => Iterator.prototype.windows(2, "invalid-option"), TypeError);

// Verify no side effect happens if you pass a non-number value as windowSize parameter
// with default value for undersized
var toPrimitiveCalled = false;
var valueOfCalled = false;
var toStringCalled = false;
const testToPrimitiveObj = {
  get [Symbol.toPrimitive]() {
    toPrimitiveCalled = true;
  }
};
const testValueOfObj = {
  get valueOf() {
    valueOfCalled = true;
  }
};
const testToStringObj = {
  get toString() {
    toStringCalled = true;
  }
};
assertThrowsInstanceOf(() =>[1, 2, 3, 4][Symbol.iterator]().windows(testToPrimitiveObj, "allow-partial"), RangeError);
assertEq(toPrimitiveCalled, false);
assertThrowsInstanceOf(() =>[1, 2, 3, 4][Symbol.iterator]().windows(testValueOfObj, "allow-partial"), RangeError);
assertEq(valueOfCalled, false);
assertThrowsInstanceOf(() =>[1, 2, 3, 4][Symbol.iterator]().windows(testToStringObj, "allow-partial"), RangeError);
assertEq(toStringCalled, false);

// Verify no side effect happens if you pass a non-number value as windowSize parameter
// with only-full undersized
var toPrimitiveCalled = false;
var valueOfCalled = false;
var toStringCalled = false;
const testFullToPrimitiveObj = {
  get [Symbol.toPrimitive]() {
    toPrimitiveCalled = true;
  }
};
const testFullValueOfObj = {
  get valueOf() {
    valueOfCalled = true;
  }
};
const testFullToStringObj = {
  get toString() {
    toStringCalled = true;
  }
};

assertThrowsInstanceOf(() =>[1, 2, 3, 4][Symbol.iterator]().windows(testFullToPrimitiveObj, "only-full"), RangeError);
assertEq(toPrimitiveCalled, false);
assertThrowsInstanceOf(() =>[1, 2, 3, 4][Symbol.iterator]().windows(testFullValueOfObj, "only-full"), RangeError);
assertEq(valueOfCalled, false);
assertThrowsInstanceOf(() =>[1, 2, 3, 4][Symbol.iterator]().windows(testFullToStringObj, "only-full"), RangeError);
assertEq(toStringCalled, false);


// Verify no side effect happens if you pass a valid number value as windowSize parameter
// with invalid undersized
var toPrimitiveCalled = false;
var valueOfCalled = false;
var toStringCalled = false;
const testInvalidToPrimitiveObj = {
  get [Symbol.toPrimitive]() {
    toPrimitiveCalled = true;
  }
};
const testInvalidValueOfObj = {
  get valueOf() {
    valueOfCalled = true;
  }
};
const testInvalidToStringObj = {
  get toString() {
    toStringCalled = true;
  }
};
assertThrowsInstanceOf(() =>[1, 2, 3, 4][Symbol.iterator]().windows(2, testInvalidToPrimitiveObj), TypeError);
assertEq(toPrimitiveCalled, false);
assertThrowsInstanceOf(() =>[1, 2, 3, 4][Symbol.iterator]().windows(2, testInvalidValueOfObj), TypeError);
assertEq(valueOfCalled, false);
assertThrowsInstanceOf(() =>[1, 2, 3, 4][Symbol.iterator]().windows(2, testInvalidToStringObj), TypeError);
assertEq(toStringCalled, false);

// Valid windowing test with default value for undersized
testFunc = () => {};
testObj = {key: "value"};
const mixedTypewindows = [testFunc, 1, "two", null, undefined, testObj].values().windows(3);
result = mixedTypewindows.next();
assertEq(result.done, false);
var window = result.value;
assertEq(Array.isArray(window), true);
assertEq(window[0], testFunc);
assertEq(window[1], 1);
assertEq(window[2], "two");
assertEq(window.length, 3);

result = mixedTypewindows.next();
assertEq(result.done, false);
var window = result.value;
assertEq(window[0], 1);
assertEq(window[1], "two");
assertEq(window[2], null);
assertEq(window.length, 3);

result = mixedTypewindows.next();
assertEq(result.done, false);
var window = result.value;
assertEq(Array.isArray(window), true);
assertEq(window[0], "two");
assertEq(window[1], null);
assertEq(window[2], undefined);
assertEq(window.length, 3);

result = mixedTypewindows.next();
assertEq(result.done, false);
var window = result.value;
assertEq(Array.isArray(window), true);
assertEq(window[0], null);
assertEq(window[1], undefined);
assertEq(window[2], testObj);
assertEq(window.length, 3);

result = mixedTypewindows.next();
assertEq(result.done, true);
assertEq(result.value, undefined);

// Valid windowing test with default value for undersized
const windows = [1, 2, 3, 4, 5].values().windows(2);
var result = windows.next();
assertEq(result.done, false);
var window = result.value;
assertEq(Array.isArray(window), true);
assertEq(window[0], 1);
assertEq(window[1], 2);
assertEq(window.length, 2);

result = windows.next();
assertEq(result.done, false);
var window = result.value;
assertEq(Array.isArray(window), true);
assertEq(window[0], 2);
assertEq(window[1], 3);
assertEq(window.length, 2);

result = windows.next();
assertEq(result.done, false);
var window = result.value;
assertEq(Array.isArray(window), true);
assertEq(window[0], 3);
assertEq(window[1], 4);
assertEq(window.length, 2);

result = windows.next();
assertEq(result.done, false);
var window = result.value;
assertEq(Array.isArray(window), true);
assertEq(window[0], 4);
assertEq(window[1], 5);
assertEq(window.length, 2);

result = windows.next();
assertEq(result.done, true);
assertEq(result.value, undefined);

// Valid windowing test with allow-partial undersized
const partialWindows = [1, 2, 3].values().windows(4, "allow-partial");
var result = partialWindows.next();
assertEq(result.done, false);
var window = result.value;
assertEq(Array.isArray(window), true);
assertEq(window[0], 1);
assertEq(window[1], 2);
assertEq(window[2], 3);
assertEq(window.length, 3);

result = partialWindows.next();
assertEq(result.done, true);
var window = result.value;
assertEq(Array.isArray(window), false);

// Valid windowing test with only-full undersized
const fullWindows = [1, 2, 3].values().windows(4, "only-full");
var result = fullWindows.next();
assertEq(result.done, true);
var window = result.value;
assertEq(Array.isArray(window), false);

// Test that the array returned by the generator doesn't get modified when getting the next value
const immutableTest = [1, 2, 3, 4, 5].values().windows(3);
var firstWindow = immutableTest.next().value;
assertEq(firstWindow[0], 1);
assertEq(firstWindow[1], 2);
assertEq(firstWindow[2], 3);

var secondWindow = immutableTest.next().value;
assertEq(secondWindow[0], 2);
assertEq(secondWindow[1], 3);
assertEq(secondWindow[2], 4);

assertEq(firstWindow[0], 1);
assertEq(firstWindow[1], 2);
assertEq(firstWindow[2], 3);

var thirdWindow = immutableTest.next().value;
assertEq(thirdWindow[0], 3);
assertEq(thirdWindow[1], 4);
assertEq(thirdWindow[2], 5);

assertEq(firstWindow[0], 1);
assertEq(firstWindow[1], 2);
assertEq(firstWindow[2], 3);
assertEq(secondWindow[0], 2);
assertEq(secondWindow[1], 3);
assertEq(secondWindow[2], 4);

// Adding getters/setters on the array returned by the generator aren't called when getting the next value
var getterCalled = 0;
var setterCalled = 0;
const observableTest = [10, 20, 30, 40].values().windows(2);

var result1 = observableTest.next();
var arr1 = result1.value;

Object.defineProperty(arr1, 0, {
  get() {
    getterCalled++;
  },
  set(v) {
    setterCalled++;
  }
});

Object.defineProperty(arr1, 1, {
  get() {
    getterCalled++;
  },
  set(v) {
    setterCalled++;
  }
});

var result2 = observableTest.next();
assertEq(result2.value[0], 20);
assertEq(result2.value[1], 30);
assertEq(getterCalled, 0);
assertEq(setterCalled, 0);

if (typeof reportCompare === 'function')
    reportCompare(0, 0);

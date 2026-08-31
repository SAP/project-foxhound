// |reftest| shell-option(--enable-iterator-chunking) skip-if(!Iterator.prototype.hasOwnProperty('chunks'))

/*---
features: [Iterator.chunks]
---*/

// Invalid parameter types
assertThrowsInstanceOf(() => Iterator.prototype.chunks('1'), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.chunks(null), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.chunks(undefined), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.chunks({}), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.chunks([]), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.chunks(true), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.chunks(Symbol()), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.chunks(() => {}), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.chunks(10n), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.chunks(-10n), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.chunks(BigInt(10)), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.chunks(BigInt(-10)), RangeError);

// NaN and Infinity tests
assertThrowsInstanceOf(() => Iterator.prototype.chunks(NaN), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.chunks(Infinity), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.chunks(-Infinity), RangeError);

// Out of range values
assertThrowsInstanceOf(() => Iterator.prototype.chunks(0), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.chunks(3.25), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.chunks(-1), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.chunks(2 ** 32), RangeError);
assertThrowsInstanceOf(() => Iterator.prototype.chunks(2 ** 32 + 1), RangeError);

// Verify no side effect happens if you pass a non-number value
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
assertThrowsInstanceOf(() =>[1, 2, 3, 4][Symbol.iterator]().chunks(testToPrimitiveObj), RangeError);
assertEq(toPrimitiveCalled, false);
assertThrowsInstanceOf(() =>[1, 2, 3, 4][Symbol.iterator]().chunks(testValueOfObj), RangeError);
assertEq(valueOfCalled, false);
assertThrowsInstanceOf(() =>[1, 2, 3, 4][Symbol.iterator]().chunks(testToStringObj), RangeError);
assertEq(toStringCalled, false);

// Valid chunking test
const chunks = [1, 2, 3, 4, 5].values().chunks(2);
var result = chunks.next();
assertEq(result.done, false);
var chunk = result.value;
assertEq(Array.isArray(chunk), true);
assertEq(chunk[0], 1);
assertEq(chunk[1], 2);
assertEq(chunk.length, 2);

result = chunks.next();
assertEq(result.done, false);
var chunk = result.value;
assertEq(Array.isArray(chunk), true);
assertEq(chunk[0], 3);
assertEq(chunk[1], 4);
assertEq(chunk.length, 2);

result = chunks.next();
assertEq(result.done, false);
var chunk = result.value;
assertEq(Array.isArray(chunk), true);
assertEq(chunk[0], 5);
assertEq(chunk.length, 1);

result = chunks.next();
assertEq(result.done, true);
assertEq(result.value, undefined);

// Valid chunking test
testFunc = () => {};
testObj = {key: "value"};
const mixedTypeChunks = [testFunc, 1, "two", null, undefined, testObj].values().chunks(3);
result = mixedTypeChunks.next();
assertEq(result.done, false);
var chunk = result.value;
assertEq(Array.isArray(chunk), true);
assertEq(chunk[0], testFunc);
assertEq(chunk[1], 1);
assertEq(chunk[2], "two");
assertEq(chunk.length, 3);

result = mixedTypeChunks.next();
assertEq(result.done, false);
var chunk = result.value;
assertEq(chunk[0], null);
assertEq(chunk[1], undefined);
assertEq(chunk[2], testObj);
assertEq(chunk.length, 3);

result = mixedTypeChunks.next();
assertEq(result.done, true);
assertEq(result.value, undefined);

if (typeof reportCompare === 'function')
    reportCompare(0, 0);

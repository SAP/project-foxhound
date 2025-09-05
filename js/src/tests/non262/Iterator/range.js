// |reftest| shell-option(--enable-iterator-range) skip-if(!Iterator.hasOwnProperty('range'))

/*---
features: [Iterator.range]
---*/

// Invalid start parameter types
assertThrowsInstanceOf(() => Iterator.range('1'), TypeError);
assertThrowsInstanceOf(() => Iterator.range(null), TypeError);
assertThrowsInstanceOf(() => Iterator.range(undefined), TypeError);
assertThrowsInstanceOf(() => Iterator.range({}), TypeError);
assertThrowsInstanceOf(() => Iterator.range([]), TypeError);
assertThrowsInstanceOf(() => Iterator.range(true), TypeError);
assertThrowsInstanceOf(() => Iterator.range(Symbol()), TypeError);

// Invalid end parameter types
assertThrowsInstanceOf(() => Iterator.range(0, '1'), TypeError);
assertThrowsInstanceOf(() => Iterator.range(0, null), TypeError);
assertThrowsInstanceOf(() => Iterator.range(0, undefined), TypeError);
assertThrowsInstanceOf(() => Iterator.range(0, {}), TypeError);
assertThrowsInstanceOf(() => Iterator.range(0, []), TypeError);
assertThrowsInstanceOf(() => Iterator.range(0, true), TypeError);
assertThrowsInstanceOf(() => Iterator.range(0, Symbol()), TypeError);

// Invalid step parameter types
assertThrowsInstanceOf(() => Iterator.range(0, 10, '1'), TypeError);
assertThrowsInstanceOf(() => Iterator.range(0, 10, true), TypeError);
assertThrowsInstanceOf(() => Iterator.range(0, 10, Symbol()), TypeError);

// NaN and Infinity tests
assertThrowsInstanceOf(() => Iterator.range(NaN), RangeError);
assertThrowsInstanceOf(() => Iterator.range(0, NaN), RangeError);
assertThrowsInstanceOf(() => Iterator.range(Infinity), TypeError);

// Step type and value tests
assertThrowsInstanceOf(() => Iterator.range(0, 10, NaN), RangeError);
assertThrowsInstanceOf(() => Iterator.range(0, 10, Infinity), RangeError);

// Zero step tests
assertThrowsInstanceOf(() => Iterator.range(0, 10, 0), RangeError);
Iterator.range(0, 0, 0);

// Step configuration object tests
Iterator.range(0, 10, { step: 2 });
Iterator.range(0, 10, { step: -1 });
Iterator.range(0, 10, { inclusiveEnd: true });
assertThrowsInstanceOf(() => Iterator.range(0, 10, { step: '2' }), TypeError);

// Basic number inputs
Iterator.range(0, 10);
Iterator.range(0, 10, 2);


// Basic sequences with increasing steps of 1
const result1 = Array.from(Iterator.range(0, 10));
assertDeepEq(result1, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

const result2 = Array.from(Iterator.range(2, 6));
assertDeepEq(result2, [2, 3, 4, 5]);

// Test empty range
const result3 = Array.from(Iterator.range(0, 0));
assertDeepEq(result3, []);

const result4 = Array.from(Iterator.range(5, 5));
assertDeepEq(result4, []);

// testing reverse range
const result5 = Array.from(Iterator.range(10, 0, -2));
assertDeepEq(result5, [10, 8, 6, 4, 2]);

// inclusive end
const result6 = Array.from(Iterator.range(0, 10, { step: 2, inclusiveEnd: true }));
assertDeepEq(result6, [0, 2, 4, 6, 8, 10]);

// overlapping step with range limits
const result7 = Array.from(Iterator.range(0, 10, 15));
assertDeepEq(result7, [0]);

// negative numbers in the range
const result8 = Array.from(Iterator.range(-10, 0));
assertDeepEq(result8, [-10, -9, -8, -7, -6, -5, -4, -3, -2, -1]);

// floating point
const resultFloat1 = Array.from(Iterator.range(0.5, 3.5));
assertDeepEq(resultFloat1, [0.5, 1.5, 2.5]);

const resultFloat3 = Array.from(Iterator.range(0, 0.3, 0.1));
assertDeepEq(resultFloat3, [0, 0.1, 0.2]);


// floating point precision
function approximatelyEqual(a, b) {
    // If inputs are arrays, compare each element
    if (Array.isArray(a) && Array.isArray(b)) {
        assertEq(a.length, b.length);
        // Compare each element
        for (let i = 0; i < a.length; i++) {
            approximatelyEqual(a[i], b[i]);
        }
        return true;
    }

    // For single numbers
    var r = (a != a && b != b) || Math.abs(a - b) < 0.001;
    if (!r) {
        print('Got', a, ', to be approximately equal to', b);
        assertEq(false, true);
    }
    return true;
}

const resultFloat2 = Array.from(Iterator.range(0, 1, 0.2));
approximatelyEqual(resultFloat2, [0, 0.2, 0.4, 0.6, 0.8]);

const resultStep2 = Array.from(Iterator.range(0, 10, 3.3));
approximatelyEqual(resultStep2, [0, 3.3, 6.6, 9.9]);

// invalid mixed-type parameters
assertThrowsInstanceOf(() => Iterator.range(0, 10, { step: NaN, inclusiveEnd: true }), RangeError);

// bigint
Iterator.range(0n, 10n);
Iterator.range(0n, 10n, 2n);

const bigintResult1 = Array.from(Iterator.range(0n, 5n));
assertDeepEq(bigintResult1, [0n, 1n, 2n, 3n, 4n]);

const bigintResult2 = Array.from(Iterator.range(0n, 10n, 2n));
assertDeepEq(bigintResult2, [0n, 2n, 4n, 6n, 8n]);

// inclusive end with BigInt
const bigintResult3 = Array.from(Iterator.range(0n, 5n, { step: 2n, inclusiveEnd: true }));
assertDeepEq(bigintResult3, [0n, 2n, 4n]);

// empty BigInt range
const bigintResult4 = Array.from(Iterator.range(0n, 0n));
assertDeepEq(bigintResult4, []);

// negative step with BigInt
const bigintResult5 = Array.from(Iterator.range(5n, 0n, -1n));
assertDeepEq(bigintResult5, [5n, 4n, 3n, 2n, 1n]);


// test invalid this
const invalidValues = [
    null,
    undefined,
    42,
    'string',
    true,
    {},
    Symbol('test'),
    [],
    new Date()
];

const iterator = Iterator.range(0, 10);

invalidValues.forEach(value => {
    assertThrowsInstanceOf(() => {
        iterator.next.call(value);
    }, TypeError, `Should throw TypeError for ${typeof value}`);
});

// this value is a valid iterator object from another compartment
const g = newGlobal({ newCompartment: true });
const localIterator = Iterator.range(0, 10);
const otherIterator = g.eval("Iterator.range(0, 10)");

const result = localIterator.next.call(otherIterator);

assertEq(typeof result, 'object');
assertEq(result.value, 0);
assertEq(result.done, false);

// infinite tests for iterator sequences
const infiniteRange = Iterator.range(0, Infinity);
assertEq(typeof infiniteRange.next, 'function');

const first = infiniteRange.next();
assertEq(first.value, 0);
assertEq(infiniteRange.next().value, 1);
assertEq(first.done, false);

// negative infinity
const negativeInfiniteRange = Iterator.range(0, -Infinity, -1);
assertEq(negativeInfiniteRange.next().value, 0);
assertEq(negativeInfiniteRange.next().value, -1);
assertEq(negativeInfiniteRange.next().value, -2);

// steps
const stepRange = Iterator.range(0, Infinity, 2);
assertEq(stepRange.next().value, 0);
assertEq(stepRange.next().value, 2);
assertEq(stepRange.next().value, 4);

// test with an option object
const options = Iterator.range(0, Infinity, { step: 3 });
assertEq(options.next().value, 0);
assertEq(options.next().value, 3);
assertEq(options.next().value, 6);

// test that inclusive end is ignored for infinite ranges
const infiniteRangeInclusive = Iterator.range(0, Infinity, { inclusiveEnd: true });
assertEq(infiniteRangeInclusive.next().value, 0);
assertEq(infiniteRangeInclusive.next().value, 1);

// test negative infinity with inclusive end
const negativeInfiniteRangeInclusive = Iterator.range(0, -Infinity, -1, { inclusiveEnd: true });
assertEq(negativeInfiniteRangeInclusive.next().value, 0);
assertEq(negativeInfiniteRangeInclusive.next().value, -1);
assertEq(negativeInfiniteRangeInclusive.next().value, -2);

// test negative infinity with step and inclusive end
const negativeInfiniteRangeStepInclusive = Iterator.range(0, -Infinity, -2, { inclusiveEnd: true });
assertEq(negativeInfiniteRangeStepInclusive.next().value, 0);
assertEq(negativeInfiniteRangeStepInclusive.next().value, -2);

// bigint and infinite range
assertThrowsInstanceOf(() => Iterator.range(0n, Infinity), TypeError);
assertThrowsInstanceOf(() => Iterator.range(0n, -Infinity), TypeError);
assertThrowsInstanceOf(() => Iterator.range(0, Infinity, 2n), TypeError);
assertThrowsInstanceOf(() => Iterator.range(0, 10, Infinity), RangeError);


if (typeof reportCompare === 'function')
    reportCompare(0, 0);

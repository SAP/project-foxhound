// During the development of number tainting, some JavaScript features got
// broken. This led to some pages not loading correctly.
// In an effort to fixe these errors, this test explicity tests the currently
// or previously broken functionality to ensure it does not get broken again.

// Test a function using a primitive, a tainted number (object) and an untainted
// number object
function testPrimitiveTaintedObject(numberValue, expectedPrimitive, expectedTainted, expectedNumber, testFunc) {
  let primitive = numberValue
  let tainted = taint(numberValue)
  let number = new Number(numberValue)
  testFunc(primitive, expectedPrimitive)
  testFunc(tainted, expectedTainted)
  testFunc(number, expectedNumber)
}


function numberTaintingBreakingFeatures() {

  var a = taint(42);
  var b = taint(13.37);

  // Addition using arrays
  assertEq([1] + 1, '11')
  assertEq([12345] + 6789, '123456789')


  // Is Integer
  testPrimitiveTaintedObject(123, true, true, false, (value, expected) => {
    assertEq(Number.isInteger(value), expected)
  })

  testPrimitiveTaintedObject(123.456, false, false, false, (value, expected) => {
    assertEq(Number.isInteger(value), expected)
  })


  // IsSafeInteger
  testPrimitiveTaintedObject(123, true, true, false, (value, expected) => {
    assertEq(Number.isSafeInteger(value), expected)
  })

  testPrimitiveTaintedObject(2 ** 53 - 1, true, true, false, (value, expected) => {
    assertEq(Number.isSafeInteger(value), expected)
  })

  testPrimitiveTaintedObject(NaN, false, false, false, (value, expected) => {
    assertEq(Number.isSafeInteger(value), expected)
  })

  testPrimitiveTaintedObject(Infinity, false, false, false, (value, expected) => {
    assertEq(Number.isSafeInteger(value), expected)
  })

  testPrimitiveTaintedObject("3", false, false, false, (value, expected) => {
    assertEq(Number.isSafeInteger(value), expected)
  })

  testPrimitiveTaintedObject(3.1, false, false, false, (value, expected) => {
    assertEq(Number.isSafeInteger(value), expected)
  })


  // IsFinite
  testPrimitiveTaintedObject(2531,true,true,false,(value,expected)=>{
    assertEq(Number.isFinite(value), expected)
  })

  testPrimitiveTaintedObject(Infinity, false, false, false, (value, expected) => {
    assertEq(Number.isFinite(value), expected)
  })

  testPrimitiveTaintedObject(NaN, false, false, false, (value, expected) => {
    assertEq(Number.isFinite(value), expected)
  })

  testPrimitiveTaintedObject(-Infinity, false, false, false, (value, expected) => {
    assertEq(Number.isFinite(value), expected)
  })


  // IsNaN
  testPrimitiveTaintedObject(NaN,true,true,false,(value,expected)=>{
    assertEq(Number.isNaN(value), expected)
  })

  testPrimitiveTaintedObject(Number.NaN,true,true,false,(value,expected)=>{
    assertEq(Number.isNaN(value), expected)
  })

  testPrimitiveTaintedObject(2531, false, false, false, (value, expected) => {
    assertEq(Number.isNaN(value), expected)
  })

  // typeof
  testPrimitiveTaintedObject(2531, 'number', 'number', 'object', (value, expected) => {
    assertEq(typeof value, expected)
  })

  testPrimitiveTaintedObject(2531, 'number', 'number', 'object', (value, expected) => {
    assertEq(typeof(value), expected)
  })

  testPrimitiveTaintedObject(1, 'number', 'number', 'object', (value, expected) => {
    assertEq(typeof(value), expected)
  })




}

runTaintTest(numberTaintingBreakingFeatures);

if (typeof reportCompare === 'function')
  reportCompare(true, true);

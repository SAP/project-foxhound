// During the development of number tainting, some JavaScript features got
// broken. This led to some pages not loading correctly.
// In an effort to fixe these errors, this test explicity tests the currently
// or previously broken functionality to ensure it does not get broken again.


function numberTaintingBreakingFeatures() {

  var a = taint(42);
  var b = taint(13.37);

  // Addition using arrays
  assertEq([1] + 1, '11')
  assertEq([12345] + 6789, '123456789')


  // Number.isInteger()
  assertEq(Number.isInteger(a), True)
  assertEq(Number.isInteger(b), False)
  assertEq(Number.isInteger(45542), True)
  assertEq(Number.isInteger(4525.123), False)


}

runTaintTest(numberTaintingBreakingFeatures);

if (typeof reportCompare === 'function')
  reportCompare(true, true);

function indexOfTestTaintedValue() {
  let tnum = taint(42);
  let nums_t = [1,tnum,3];
  let nums_ut = [1,42,3];
  let idx_t = nums_t.indexOf(42);
  let idx_ut = nums_ut.indexOf(42);
  assertEq(idx_ut, idx_t);
}

function indexOfTestTaintedKey() {
  let tnum = taint(42);
  let nums = [1,42,3];
  let idx_t = nums.indexOf(tnum);
  let idx_ut = nums.indexOf(42);
  assertEq(idx_ut, idx_t);
}

function includesTestTaintedKey() {
  let tnum = taint(42);
  let nums = [1,42,3];
  let inc_t = nums.includes(tnum);
  let inc_ut = nums.includes(42);
  assertEq(inc_ut, inc_t);
}

function includesTestTaintedValue() {
  let tnum = taint(42);
  let nums = [1,tnum,3];
  let inc_t = nums.includes(tnum);
  let inc_ut = nums.includes(42);
  assertEq(inc_ut, inc_t);
}

runTaintTest(indexOfTestTaintedValue);
runTaintTest(indexOfTestTaintedKey);
runTaintTest(includesTestTaintedKey);
runTaintTest(includesTestTaintedValue);


if (typeof reportCompare === 'function')
  reportCompare(true, true);

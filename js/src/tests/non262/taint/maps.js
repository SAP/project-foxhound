function mapNumberObjectKeyTest() {
  let map = new Map();
  let tainted = new Number(42);
  let untainted = 42;
  let value = "foo";
  map.set(untainted, value);
  let ret_val_untainted = map.get(untainted)
  let ret_val_tainted = map.get(tainted)
  // Rather unintuitively, Number object and primitive keys are treated differently in JavaScript
  assertNotEq(ret_val_tainted, ret_val_untainted);
}

function mapTaintedKeyTest() {
  let map = new Map(); 
  let tainted = taint(42);
  let untainted = 42;
  let value = "foo";
  map.set(tainted, value);
  let ret_val_untainted = map.get(untainted)
  let ret_val_tainted = map.get(tainted)
  assertEq(ret_val_tainted, ret_val_untainted);
}

function mapUntaintedKeyTest() {
  let map = new Map(); 
  let tainted = taint(42);
  let untainted = 42;
  let value = "foo";
  map.set(untainted, value);
  let ret_val_untainted = map.get(untainted)
  let ret_val_tainted = map.get(tainted)
  assertEq(ret_val_tainted, ret_val_untainted);
}

runTaintTest(mapNumberObjectKeyTest);
runTaintTest(mapTaintedKeyTest);
runTaintTest(mapUntaintedKeyTest);


if (typeof reportCompare === 'function')
  reportCompare(true, true);


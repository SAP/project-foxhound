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

runTaintTest(mapTaintTest);
runTaintTest(mapUntaintedKeyTest);


if (typeof reportCompare === 'function')
  reportCompare(true, true);


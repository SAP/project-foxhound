
// Promise microtask queue smoke tests
// Test basic promise resolution and microtask ordering

// Test 1: Basic promise resolution
let resolved = false;
Promise.resolve(42).then(value => {
  assertEq(value, 42);
  resolved = true;
});
assertEq(resolved, false); // Should not be resolved synchronously
drainJobQueue();
assertEq(resolved, true); // Should be resolved after draining

// Test 2: Promise rejection
let rejected = false;
let rejectionValue = null;
Promise.reject("error").catch(err => {
  rejectionValue = err;
  rejected = true;
});
drainJobQueue();
assertEq(rejected, true);
assertEq(rejectionValue, "error");

// Test 3: Chained promises
let chainResult = [];
Promise.resolve(1)
  .then(x => {
    chainResult.push(x);
    return x + 1;
  })
  .then(x => {
    chainResult.push(x);
    return x * 2;
  })
  .then(x => {
    chainResult.push(x);
  });
drainJobQueue();
assertEq(chainResult.length, 3);
assertEq(chainResult[0], 1);
assertEq(chainResult[1], 2);
assertEq(chainResult[2], 4);

// Test 4: Multiple independent promises
let results = [];
Promise.resolve("A").then(x => results.push(x));
Promise.resolve("B").then(x => results.push(x));
Promise.resolve("C").then(x => results.push(x));
drainJobQueue();
assertEq(results.length, 3);
assertEq(results.includes("A"), true);
assertEq(results.includes("B"), true);
assertEq(results.includes("C"), true);

// Test 5: Promise.all
let allResolved = false;
let allResults = null;
Promise.all([
  Promise.resolve(10),
  Promise.resolve(20),
  Promise.resolve(30)
]).then(values => {
  allResults = values;
  allResolved = true;
});
drainJobQueue();
assertEq(allResolved, true);
assertEq(allResults.length, 3);
assertEq(allResults[0], 10);
assertEq(allResults[1], 20);
assertEq(allResults[2], 30);

// Test 6: Promise.race
let raceWinner = null;
Promise.race([
  Promise.resolve("first"),
  Promise.resolve("second")
]).then(winner => {
  raceWinner = winner;
});
drainJobQueue();
assertEq(raceWinner, "first");

// Test 7: Mixed sync/async execution order
let executionOrder = [];
executionOrder.push("sync1");
Promise.resolve().then(() => executionOrder.push("async1"));
executionOrder.push("sync2");
Promise.resolve().then(() => executionOrder.push("async2"));
executionOrder.push("sync3");
drainJobQueue();
assertEq(executionOrder[0], "sync1");
assertEq(executionOrder[1], "sync2");
assertEq(executionOrder[2], "sync3");
assertEq(executionOrder[3], "async1");
assertEq(executionOrder[4], "async2");

// Test 8: Nested promise creation
let nestedResults = [];
Promise.resolve().then(() => {
  nestedResults.push("outer");
  Promise.resolve().then(() => {
    nestedResults.push("inner");
  });
});
drainJobQueue();
assertEq(nestedResults.length, 2);
assertEq(nestedResults[0], "outer");
assertEq(nestedResults[1], "inner");

// Test 9: Error handling in chains
let errorCaught = false;
let errorMessage = null;
Promise.resolve()
  .then(() => {
    throw new Error("test error");
  })
  .catch(e => {
    errorCaught = true;
    errorMessage = e.message;
  });
drainJobQueue();
assertEq(errorCaught, true);
assertEq(errorMessage, "test error");

// Test 10: Promise constructor execution
let constructorExecuted = false;
let constructorResolve = null;
new Promise((resolve, reject) => {
  constructorExecuted = true;
  constructorResolve = resolve;
});
assertEq(constructorExecuted, true);

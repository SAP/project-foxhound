/**
 * Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

function* testSteps() {
  const invalidOrigin = {
    url: "ws://ws.invalid.origin",
    path: "storage/default/ws+++ws.invalid.origin",
  };

  info("Persisting an invalid origin");

  let invalidPrincipal = getPrincipal(invalidOrigin.url);

  let request = persist(invalidPrincipal, continueToNextStepSync);
  yield undefined;

  Assert.strictEqual(
    request.resultCode,
    NS_ERROR_FAILURE,
    "Persist() failed because of the invalid origin"
  );
  Assert.strictEqual(request.result, null, "The request result is null");

  let originDir = getRelativeFile(invalidOrigin.path);
  let exists = originDir.exists();
  ok(!exists, "Directory for invalid origin doesn't exist");

  request = persisted(invalidPrincipal, continueToNextStepSync);
  yield undefined;

  Assert.strictEqual(request.resultCode, NS_OK, "Persisted() succeeded");
  ok(!request.result, "The origin isn't persisted since the operation failed");

  finishTest();
}

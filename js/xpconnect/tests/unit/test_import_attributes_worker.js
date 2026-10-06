/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

add_task(async function testJsonImportAttributeInWorker() {
  let worker = new ChromeWorker("resource://test/import_attributes_worker.js");
  let { promise, resolve } = Promise.withResolvers();
  worker.onmessage = event => {
    resolve(event.data);
  };
  worker.postMessage("");

  const result = await promise;
  Assert.equal(result.value, 42);
});

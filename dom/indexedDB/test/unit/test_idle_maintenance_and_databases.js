/**
 * Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

/* exported testSteps */
async function testSteps() {
  info("Creating databases");

  for (let originIndex = 0; originIndex < 3; originIndex++) {
    const principal = getPrincipal(
      "https://www.example" + originIndex + ".com"
    );

    for (let databaseIndex = 0; databaseIndex < 5; databaseIndex++) {
      const dbName = "foo-" + databaseIndex;

      const request = indexedDB.openForPrincipal(principal, dbName, 1);

      {
        const event = await expectingUpgrade(request);

        const database = event.target.result;

        const objectStore = database.createObjectStore("foo");

        // Add lots of data...
        for (let i = 0; i < 100; i++) {
          objectStore.add("abcdefghijklmnopqrstuvwxyz0123456789", i);
        }

        // And then clear it so that maintenance has some space to reclaim.
        objectStore.clear();
      }

      const event = await expectingSuccess(request);

      const database = event.target.result;

      database.close();
    }
  }

  info("Starting idle maintenance");

  const indexedDatabaseManager = Cc[
    "@mozilla.org/dom/indexeddb/manager;1"
  ].getService(Ci.nsIIndexedDatabaseManager);

  const maintenancePromise = indexedDatabaseManager.doMaintenance();

  info("Getting databases");

  // Getting databases while idle daily maintenance is running should be delayed
  // and only processed after the maintenance is done.
  const completePromises = (function () {
    let promises = [];

    for (let index = 0; index < 10; index++) {
      async function sandboxScript() {
        await indexedDB.databases();
      }

      const sandbox = new Cu.Sandbox(
        getPrincipal("https://www.example" + index + ".org"),
        {
          wantGlobalProperties: ["indexedDB"],
        }
      );

      const promise = new Promise(function (resolve, reject) {
        sandbox.resolve = resolve;
        sandbox.reject = reject;
      });

      Cu.evalInSandbox(
        sandboxScript.toSource() + " sandboxScript().then(resolve, reject);",
        sandbox
      );

      promises.push(promise);
    }

    return promises;
  })();

  info("Waiting for maintenance to finish");

  await maintenancePromise;

  info("Waiting for databases operation to finish");

  await Promise.all(completePromises);
}

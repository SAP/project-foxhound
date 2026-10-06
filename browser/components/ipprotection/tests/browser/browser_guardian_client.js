/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { GuardianClient } = ChromeUtils.importESModule(
  "moz-src:///toolkit/components/ipprotection/fxa/GuardianClient.sys.mjs"
);
function makeGuardianServer(
  arg = {
    enroll: (_request, _response) => {},
  }
) {
  const callbacks = {
    enroll: (_request, _response) => {},
    ...arg,
  };
  const server = new HttpServer();
  server.registerPathHandler("/api/v1/fpn/auth", callbacks.enroll);
  server.start(-1);
  return server;
}

const testcases = [
  {
    name: "Successful enrollment",
    responseURL: "/oauth/success?code=abc123",
    expects: {
      ok: true,
      error: undefined,
    },
    experimentType: "alpha",
  },
  {
    name: "Successful enrollment with custom experiment",
    responseURL: "/oauth/success?code=abc123",
    expects: {
      ok: true,
      error: undefined,
    },
    experimentType: "beta",
  },
  {
    name: "Failed enrollment - error in success URL",
    responseURL: "/oauth/success?error=generic_error",
    expects: {
      ok: false,
      error: "generic_error",
    },
    experimentType: "alpha",
  },
];

// Run each test case as a separate task to ensure clean state
testcases
  .map(({ name, responseURL, expects, experimentType }) => {
    return async () => {
      requestLongerTimeout(2); // Increase timeout for this test case
      info(`Running test case: ${name}`);

      const server = makeGuardianServer({
        enroll: (request, response) => {
          info(`Handling enroll request, redirecting to ${responseURL}`);

          // Assert that the experiment query parameter is present
          const queryParams = new URLSearchParams(request.queryString);
          Assert.ok(
            queryParams.has("experiment"),
            "Request should include 'experiment' query parameter"
          );
          Assert.equal(
            queryParams.get("experiment"),
            experimentType,
            `Experiment type should be '${experimentType}'`
          );

          // Set up a proper HTTP redirect
          response.setStatusLine(request.httpVersion, 302, "Found");

          // Set the location header to redirect to our test URL
          const redirectURL = `http://localhost:${server.identity.primaryPort}${responseURL}`;
          response.setHeader("Location", redirectURL, false);

          // No body needed for redirect
          response.write("");
        },
      });

      const serverOrigin = `http://localhost:${server.identity.primaryPort}`;
      await SpecialPowers.pushPrefEnv({
        set: [
          ["browser.ipProtection.guardian.endpoint", serverOrigin],
          ["identity.fxaccounts.remote.root", serverOrigin],
        ],
      });

      const client = new GuardianClient();

      try {
        const result = await client.enrollWithFxa(experimentType);

        Assert.equal(
          result.ok,
          expects.ok,
          `${name}: ok should be ${expects.ok}`
        );

        if (expects.error) {
          Assert.equal(
            result.error,
            expects.error,
            `${name}: error should be ${expects.error}`
          );
        } else {
          Assert.equal(
            result.error,
            undefined,
            `${name}: error should be undefined`
          );
        }
      } finally {
        await SpecialPowers.popPrefEnv();
        server.stop();
      }
    };
  })
  .forEach(test => add_task(test));

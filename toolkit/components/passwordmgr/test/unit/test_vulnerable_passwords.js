/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_setup(async () => {
  await Services.logins.initializationPromise;
});

add_task(async function test_vulnerable_password_methods() {
  const logins = TestData.loginList();
  Assert.greater(logins.length, 0, "Initial logins length should be > 0.");

  for (const loginInfo of logins) {
    await Services.logins.addLoginAsync(loginInfo);
    Assert.ok(
      !(await Services.logins.isPotentiallyVulnerablePassword(loginInfo)),
      "No logins should be vulnerable until addVulnerablePasswords is called."
    );
  }

  const vulnerableLogin = logins.shift();
  await Services.logins.addPotentiallyVulnerablePassword(vulnerableLogin);

  Assert.ok(
    await Services.logins.isPotentiallyVulnerablePassword(vulnerableLogin),
    "Login should be vulnerable after calling addVulnerablePassword."
  );
  for (const loginInfo of logins) {
    Assert.ok(
      !(await Services.logins.isPotentiallyVulnerablePassword(loginInfo)),
      "No other logins should be vulnerable when addVulnerablePassword is called" +
        " with a single argument"
    );
  }

  await Services.logins.clearAllPotentiallyVulnerablePasswords();

  for (const loginInfo of logins) {
    Assert.ok(
      !(await Services.logins.isPotentiallyVulnerablePassword(loginInfo)),
      "No logins should be vulnerable when clearAllPotentiallyVulnerablePasswords is called."
    );
  }
});

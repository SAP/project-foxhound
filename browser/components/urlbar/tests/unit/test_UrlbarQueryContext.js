/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(function test_constructor() {
  Assert.throws(
    () => new UrlbarQueryContext({}),
    /Missing or empty allowAutofill provided to UrlbarQueryContext/,
    "Should throw with no arguments"
  );

  Assert.throws(
    () =>
      new UrlbarQueryContext({
        allowAutofill: true,
        isPrivate: false,
        searchString: "foo",
      }),
    /Missing or empty maxResults provided to UrlbarQueryContext/,
    "Should throw with a missing maxResults parameter"
  );

  Assert.throws(
    () =>
      new UrlbarQueryContext({
        allowAutofill: true,
        maxResults: 1,
        searchString: "foo",
      }),
    /Missing or empty isPrivate provided to UrlbarQueryContext/,
    "Should throw with a missing isPrivate parameter"
  );

  Assert.throws(
    () =>
      new UrlbarQueryContext({
        isPrivate: false,
        maxResults: 1,
        searchString: "foo",
      }),
    /Missing or empty allowAutofill provided to UrlbarQueryContext/,
    "Should throw with a missing allowAutofill parameter"
  );

  Assert.throws(
    () =>
      new UrlbarQueryContext({
        allowAutofill: true,
        isPrivate: false,
        maxResults: 1,
        searchString: "foo",
      }),
    /Missing or empty sapName provided to UrlbarQueryContext/,
    "Should throw with a missing sapName parameter"
  );

  let qc = new UrlbarQueryContext({
    allowAutofill: false,
    isPrivate: true,
    maxResults: 1,
    sapName: "foo",
    searchString: "bar",
  });

  Assert.strictEqual(
    qc.allowAutofill,
    false,
    "Should have saved the correct value for allowAutofill"
  );
  Assert.strictEqual(
    qc.isPrivate,
    true,
    "Should have saved the correct value for isPrivate"
  );
  Assert.equal(
    qc.maxResults,
    1,
    "Should have saved the correct value for maxResults"
  );
  Assert.equal(
    qc.sapName,
    "foo",
    "Should have saved the correct value for searchString"
  );
  Assert.equal(
    qc.searchString,
    "bar",
    "Should have saved the correct value for searchString"
  );
});

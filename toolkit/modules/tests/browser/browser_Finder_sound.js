/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

var MockSound = SpecialPowers.MockSound;

add_setup(() => {
  MockSound.init();
  registerCleanupFunction(() => MockSound.cleanup());
});

add_task(async function test_notfound_sound() {
  const url =
    "data:text/html;base64," + btoa('<body><iframe srcdoc="foo"/></iframe>');
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, url);

  let finder = tab.linkedBrowser.finder;
  let listener = {
    onFindResult() {
      ok(false, "callback wasn't replaced");
    },
  };
  finder.addResultListener(listener);

  let promiseFind, findResult;

  function waitForFind() {
    return new Promise(resolve => {
      listener.onFindResult = resolve;
    });
  }

  const steps = [
    ["foo", "FIND_FOUND", []],
    ["fox", "FIND_NOTFOUND", []], // silent if searchString has not increased its length
    ["foxx", "FIND_NOTFOUND", ["beep"]],
  ];

  for (let index = 0; index < steps.length; index++) {
    const [searchString, result, expectedPlayed] = steps[index];
    MockSound.reset();
    promiseFind = waitForFind();
    finder.fastFind(searchString, false, false);
    findResult = await promiseFind;
    is(
      findResult.result,
      Ci.nsITypeAheadFind[result],
      `Step ${index + 1}, find "${searchString}"`
    );
    SimpleTest.isDeeply(
      MockSound.played,
      expectedPlayed,
      `Step ${index + 1}, Not-found sound`
    );
  }

  // Extra step for testing entireWord
  finder.entireWord = true;

  MockSound.reset();
  promiseFind = waitForFind();
  finder.fastFind("foxxx", false, false);
  findResult = await promiseFind;
  is(
    findResult.result,
    Ci.nsITypeAheadFind.FIND_NOTFOUND,
    'String "foxxx" not found'
  );
  SimpleTest.isDeeply(MockSound.played, [], "No sound when entireWord is on");

  gBrowser.removeTab(tab);
});

add_task(async function test_notfound_sound_in_remote_findbar() {
  const url = "about:about";
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, url);

  let finder = tab.linkedBrowser.finder;
  let listener = {
    onFindResult() {
      ok(false, "callback wasn't replaced");
    },
  };
  finder.addResultListener(listener);

  let promiseFind, findResult;

  function waitForFind() {
    return new Promise(resolve => {
      listener.onFindResult = resolve;
    });
  }

  const steps = [
    ["config", "FIND_FOUND", []],
    ["confoo", "FIND_NOTFOUND", []], // silent if searchString has not increased its length
    ["confool", "FIND_NOTFOUND", ["beep"]],
  ];

  for (let index = 0; index < steps.length; index++) {
    const [searchString, result, expectedPlayed] = steps[index];
    MockSound.reset();
    promiseFind = waitForFind();
    finder.fastFind(searchString, false, false);
    findResult = await promiseFind;
    is(
      findResult.result,
      Ci.nsITypeAheadFind[result],
      `Step ${index + 1}, find "${searchString}"`
    );
    SimpleTest.isDeeply(
      MockSound.played,
      expectedPlayed,
      `Step ${index + 1}, Not-found sound for ${searchString}`
    );
  }

  // Extra step for testing entireWord
  finder.entireWord = true;

  MockSound.reset();
  promiseFind = waitForFind();
  finder.fastFind("confoobar", false, false);
  findResult = await promiseFind;
  is(
    findResult.result,
    Ci.nsITypeAheadFind.FIND_NOTFOUND,
    'String "confoobar" not found'
  );
  SimpleTest.isDeeply(MockSound.played, [], "No sound when entireWord is on");

  gBrowser.removeTab(tab);
});

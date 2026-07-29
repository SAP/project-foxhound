/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test that keyframe rules and gutters are displayed correctly in the
// rule view.

const TEST_URI = URL_ROOT + "doc_keyframeanimation.html";

add_task(async function () {
  await addTab(TEST_URI);
  const { inspector, view } = await openRuleView();
  await testPacman(inspector, view);
  await testBoxy(inspector, view);
  await testMoxy(inspector, view);
});

async function testPacman(inspector, view) {
  info("Test content and gutter in the keyframes rule of #pacman");

  await assertKeyframeRules("#pacman", inspector, view, {
    elementRulesNb: 2,
    keyframeRulesNb: 2,
    keyframesRules: ["pacman", "pacman"],
    keyframeRules: ["100%", "100%"],
  });

  // See bug 1042036 and Bug 1894873 we are showing all keyframes with the same name.
  assertRuleViewHeaders(view, ["Keyframes pacman", "Keyframes pacman"]);
}

async function testBoxy(inspector, view) {
  info("Test content and gutter in the keyframes rule of #boxy");

  await assertKeyframeRules("#boxy", inspector, view, {
    elementRulesNb: 3,
    keyframeRulesNb: 3,
    keyframesRules: ["boxy", "boxy", "boxy"],
    keyframeRules: ["10%", "20%", "100%"],
  });

  assertRuleViewHeaders(view, ["Keyframes boxy"]);
}

async function testMoxy(inspector, view) {
  info("Test content and gutter in the keyframes rule of #moxy");

  await assertKeyframeRules("#moxy", inspector, view, {
    elementRulesNb: 3,
    keyframeRulesNb: 4,
    keyframesRules: ["boxy", "boxy", "boxy", "moxy"],
    keyframeRules: ["10%", "20%", "100%", "100%"],
  });

  assertRuleViewHeaders(view, ["Keyframes boxy", "Keyframes moxy"]);
}

async function assertKeyframeRules(selector, inspector, view, expected) {
  await selectNode(selector, inspector);
  const elementStyle = view.elementStyle;

  const rules = {
    elementRules: elementStyle.rules.filter(rule => !rule.keyframes),
    keyframeRules: elementStyle.rules.filter(rule => rule.keyframes),
  };

  is(
    rules.elementRules.length,
    expected.elementRulesNb,
    selector + " has the correct number of non keyframe element rules"
  );
  is(
    rules.keyframeRules.length,
    expected.keyframeRulesNb,
    selector + " has the correct number of keyframe rules"
  );

  let i = 0;
  for (const keyframeRule of rules.keyframeRules) {
    Assert.equal(
      keyframeRule.keyframes.name,
      expected.keyframesRules[i],
      keyframeRule.keyframes.name + " has the correct keyframes name"
    );
    Assert.equal(
      keyframeRule.domRule.keyText,
      expected.keyframeRules[i],
      keyframeRule.domRule.keyText + " selector heading is correct"
    );
    i++;
  }
}

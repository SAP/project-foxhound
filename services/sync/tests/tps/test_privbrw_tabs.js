/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/*
 * The list of phases mapped to their corresponding profiles.  The object
 * here must be in strict JSON format, as it will get parsed by the Python
 * testrunner (no single quotes, extra comma's, etc).
 */
EnableEngines(["tabs"]);

var phases = {
  phase1: "profile1",
  phase2: "profile2",
  phase3: "profile1",
  phase4: "profile2",
};

/*
 * Tabs data
 */

var tabs1 = [
  { uri: "https://example.com/", title: "Example Domain", profile: "profile1" },
  { uri: "https://example.org/", title: "Example Domain", profile: "profile1" },
  { uri: "https://example.net/", title: "Example Domain", profile: "profile1" },
];

var tabs2 = [
  {
    uri: "https://www.mozilla.com",
    title: "Get Firefox -- Firefox.com",
    profile: "profile2",
  },
  { uri: "https://example.com/fox", title: "IETF", profile: "profile2" },
];

var tabs3 = [
  { uri: "https://example.com/jetpack", title: "Jetpack", profile: "profile1" },
  {
    uri: "https://example.com/selenium",
    title: "Selenium",
    profile: "profile1",
  },
];

/*
 * Test phases
 */

Phase("phase1", [[Tabs.add, tabs1], [Sync]]);

Phase("phase2", [[Sync], [Tabs.verify, tabs1], [Tabs.add, tabs2], [Sync]]);

Phase("phase3", [
  [Sync],
  [Windows.add, { private: true }],
  [Tabs.add, tabs3],
  [Sync],
]);

Phase("phase4", [[Sync], [Tabs.verifyNot, tabs3]]);

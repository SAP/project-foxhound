# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import json

from marionette_harness import MarionetteTestCase


class ContentScriptsAreCorrectlyPersistedTest(MarionetteTestCase):
    def setUp(self):
        super().setUp()
        self.marionette.enforce_gecko_prefs({
            "extensions.background.idle.timeout": 300000,
        })

    def tearDown(self):
        try:
            # Make sure subsequent tests get a clean profile
            self.marionette.restart(in_app=False, clean=True)
        finally:
            super().tearDown()

    def testContentScriptsAreCorrectlyPersisted(self):
        # We check that as the addon starts up, the expected content scripts are all
        # started up as well, and in the expected way (either being registered, or
        # being already registered as they are marked as persistentAcrossSessions.

        # We also check that if the list of interventions/shims changes (for instance
        # in a new version of the addon), any no-longer-needed content scripts which
        # are not in its list of interventions or shims are properly unregsitered,
        # so they do not persist.

        # First see what happens on first start-up. All content scripts ought to be
        # registered by the compat addon, rather than already being there.
        lastUpdateInfo, interventionContentScriptPath, shimContentScriptPath = (
            self.wait_until_webcompat_addon_is_ready().values()
        )
        self.assertEqual(
            lastUpdateInfo["alreadyRegisteredContentScripts"],
            [],
            "no content scripts were already registered on first startup",
        )
        self.assertEqual(
            lastUpdateInfo["oldContentScriptsToUnregister"],
            [],
            "no content scripts were unregistered on first startup",
        )
        defaultContentScriptCount = len(lastUpdateInfo["newContentScriptsToRegister"])
        self.assertTrue(
            defaultContentScriptCount > 0,
            "the addon registerd some content scripts on first startup",
        )
        self.assertTrue(
            len(interventionContentScriptPath) > 0,
            "sanity check: we have an intervention content script to test with",
        )
        self.assertTrue(
            len(shimContentScriptPath) > 0,
            "sanity check: we have a shim content script to test with",
        )

        # Restart Firefox and confirm that the content scripts were all registered
        # already before the addon started up (because they are persistent)
        self.marionette.restart(in_app=True)
        lastUpdateInfo, _, _ = self.wait_until_webcompat_addon_is_ready().values()
        self.assertEqual(
            len(lastUpdateInfo["alreadyRegisteredContentScripts"]),
            defaultContentScriptCount,
            "all of the content scripts were already registered on second boot",
        )
        self.assertEqual(
            lastUpdateInfo["oldContentScriptsToUnregister"],
            [],
            "no content scripts were unregistered on second boot",
        )
        self.assertEqual(
            lastUpdateInfo["newContentScriptsToRegister"],
            [],
            "no new content scripts were registered on second boot",
        )

        # First we prepare a few intervention and shim configurations with content scripts
        # to use for the remaining tests. (Note that we need to grab one of the content scripts
        # actually in the addon right now, hence the sanity checks above).
        bug1 = self.buildInterventionConfig("bug1", interventionContentScriptPath)
        bug2 = self.buildInterventionConfig("bug2", interventionContentScriptPath)
        bug3 = self.buildInterventionConfig("bug3", interventionContentScriptPath)

        def getInterventionScriptId(bug):
            return self.marionette.execute_script(
                """
                    const config = arguments[0];
                    const bgWin = window.wrappedJSObject.browser.extension.getBackgroundPage();
                    const { id } =
                      bgWin.interventions.buildContentScriptRegistrations(
                        config.label,
                        config.interventions[0],
                        bgWin.interventions.getBlocksAndMatchesFor(config).matches
                      )[0];
                      return id;
              """,
                [bug],
            )

        expectedBug1ScriptId = getInterventionScriptId(bug1)
        expectedBug2ScriptId = getInterventionScriptId(bug2)
        expectedBug3ScriptId = getInterventionScriptId(bug3)

        shim1 = self.buildShimConfig("bug1", shimContentScriptPath)
        shim2 = self.buildShimConfig("bug2", shimContentScriptPath)
        shim3 = self.buildShimConfig("bug3", shimContentScriptPath)

        def getShimScriptId(bug):
            return f"""SmartBlock shim for {bug}: {{"js":["/shims/{shimContentScriptPath}"],"matches":["*://example.com/*"],"runAt":"document_start"}}"""

        expectedShim1ScriptId = getShimScriptId("bug1")
        expectedShim2ScriptId = getShimScriptId("bug2")
        expectedShim3ScriptId = getShimScriptId("bug3")

        # Now we simulate a few addon updates to see if things work as expected.
        # first across addon-restarts, and then with our RemoteSettings update client.
        def runTests(whichMethod):
            # Now we simulate a few addon updates to see what happens. First we simulate
            # an update with no interventions or shims, to see if they're all unregistered.
            lastUpdateInfo, _, _ = self.rebootWithInterventionsAndShims({}, []).values()
            self.verifyBootupContentScripts(lastUpdateInfo, [], [])

            # Now restart with one intervention and one shim, and confirm that both
            # content scripts were newly registered.
            lastUpdateInfo, _, _ = whichMethod({"bug1": bug1}, [shim1]).values()
            self.verifyBootupContentScripts(
                lastUpdateInfo, [expectedBug1ScriptId, expectedShim1ScriptId], []
            )

            # Now restart with one different intervention and shim, and
            # confirm that bug1 was unregistered (since it's no longer in the new
            # update's config), and that the new bug2's was registered.
            lastUpdateInfo, _, _ = whichMethod({"bug2": bug2}, [shim2]).values()
            self.verifyBootupContentScripts(
                lastUpdateInfo,
                [expectedBug2ScriptId, expectedShim2ScriptId],
                [expectedBug1ScriptId, expectedShim1ScriptId],
            )

            # Now restart with both an already-existing intervention and shim (to see
            # if it is already started before the addon does), and a new intervention
            # and shim, to confirm that it's also registered.
            lastUpdateInfo, _, _ = whichMethod(
                {"bug2": bug2, "bug3": bug3}, [shim2, shim3]
            ).values()
            self.verifyBootupContentScripts(
                lastUpdateInfo,
                [
                    expectedBug2ScriptId,
                    expectedBug3ScriptId,
                    expectedShim2ScriptId,
                    expectedShim3ScriptId,
                ],
                [],
            )

        # First run the tests simulating an addon-update.
        runTests(self.rebootWithInterventionsAndShims)
        self.marionette.clear_pref("extensions.webcompat.test_interventions")
        self.marionette.clear_pref("extensions.webcompat.test_shims")

        # Now re-run the same tests with RemoteSettings client updates.
        self.nextRemoteSettingsUpdateVersion = 9000
        runTests(self.simulateRemoteSettingsUpdate)

    def rebootWithInterventionsAndShims(self, interventions, shims):
        self.marionette.set_pref(
            "extensions.webcompat.test_interventions", json.dumps(interventions)
        )
        self.marionette.set_pref("extensions.webcompat.test_shims", json.dumps(shims))
        self.marionette.restart(in_app=True)
        return self.wait_until_webcompat_addon_is_ready()

    def simulateRemoteSettingsUpdate(self, interventions, shims):
        version = f"9999.9999.9999.{self.nextRemoteSettingsUpdateVersion}"
        self.nextRemoteSettingsUpdateVersion += 1
        with self.marionette.using_context("chrome"):
            self.marionette.execute_async_script(
                """
                const [version, interventions, shims, done] = arguments;
                const { RemoteSettings } = ChromeUtils.importESModule(
                  "resource://services-settings/remote-settings.sys.mjs"
                );
                const client = RemoteSettings("webcompat-interventions");
                const update = {
                    id: 1, // RemoteSettings record id",
                    last_modified: 1368273600000,
                    version,
                    interventions,
                    shims,
                };
                client.emit("sync", { data: { current: [update] } }).then(done);
            """,
                script_args=(version, interventions, shims),
            )
        return self.wait_until_webcompat_addon_is_ready(version)

    def wait_until_webcompat_addon_is_ready(self, updateVersion=None):
        self.marionette.navigate("about:compat")
        return self.marionette.execute_async_script(
            """
                const [updateVersion, done] = arguments;
                const bg = window.wrappedJSObject.browser.extension.getBackgroundPage();
                const updateDone = !updateVersion ? Promise.resolve() : new Promise(updated => {
                    const updateCheck = setInterval(() => {
                        if (bg.latestUpdate == updateVersion) {
                            clearInterval(updateCheck);
                            updated();
                        }
                    }, 100);
                });
                Promise.allSettled([
                    bg.interventions.allSettled(),
                    bg.shims.ready(),
                    updateDone,
                ]).then(() => {
                    const lastUpdateInfo = {};
                    for (const type of ["interventions", "shims"]) {
                        for (const [key, value] of Object.entries(
                            bg[type]._lastEnabledInfo
                        )) {
                            lastUpdateInfo[key] = [
                                lastUpdateInfo[key] ?? [],
                                value.map(script => script.id),
                            ].flat();
                        }
                    }

                    const interventionContentScriptPath = bg.interventions?.getAvailableInterventions()
                        .find(i => i.interventions.find(v => v.content_scripts.js))
                        ?.interventions.find(v => v.content_scripts.js).content_scripts.js[0];

                    const shimContentScriptPath = bg.shims?.shims.values().find(s => s?.contentScripts.length)?.contentScripts[0].js[0].replace("/shims/", "");

                    return {
                        lastUpdateInfo,
                        interventionContentScriptPath,
                        shimContentScriptPath,
                    };
               }).then(done);
        """,
            script_args=(updateVersion,),
        )

    def verifyBootupContentScripts(
        self, infoOnBoot, expectAddedOrPresent, expectNotAddedOrPresent
    ):
        registeredContentScripts = set(
            infoOnBoot["alreadyRegisteredContentScripts"]
            + infoOnBoot["newContentScriptsToRegister"]
        )

        self.assertEqual(
            len(registeredContentScripts),
            len(expectAddedOrPresent),
            "only expected content scripts are registered",
        )

        for wantedScript in expectAddedOrPresent:
            self.assertTrue(
                wantedScript in registeredContentScripts,
                f"content script is active: {wantedScript}",
            )

        notRegisteredContentScripts = set(infoOnBoot["oldContentScriptsToUnregister"])
        for unwantedScript in expectNotAddedOrPresent:
            self.assertTrue(
                (unwantedScript in notRegisteredContentScripts)
                or not (unwantedScript in registeredContentScripts),
                f"content script is NOT active: {unwantedScript}",
            )

    def buildInterventionConfig(self, id, jsContentScriptPath):
        return {
            "id": id,
            "label": id,
            "bugs": {"issue1": {"matches": ["*://example.com/*"]}},
            "interventions": [
                {"platforms": ["all"], "content_scripts": {"js": [jsContentScriptPath]}}
            ],
        }

    def buildShimConfig(self, id, jsContentScriptPath):
        return {
            "id": id,
            "bug": id,
            "platform": "all",
            "name": id,
            "matches": ["*://example.com/*"],
            "contentScripts": [
                {
                    "js": jsContentScriptPath,
                    "matches": ["*://example.com/*"],
                    "runAt": "document_start",
                }
            ],
        }

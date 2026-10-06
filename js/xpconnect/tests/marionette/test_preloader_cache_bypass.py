# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

"""
Tests that the ScriptPreloader and StartupCache don't serve stale bytecode
when JAR files from system add-ons installed in the profile directory are
updated.

This test simulates a system add-on being updated by:
1. Creating a JAR file with an ES module that exports a test value
2. Registering it via resource:// URI substitution
3. Loading the module and waiting for caches to be written
4. Replacing the JAR with a new version that exports a different value
5. Restarting and verifying the new value is loaded (not the cached old value)

Without the fix, the ScriptPreloader would serve stale bytecode from the
previous JAR version. With the fix, scripts from non-omni.ja JARs bypass
the cache and are always compiled fresh.
"""

import os
import tempfile
import zipfile

from marionette_harness import MarionetteTestCase


class PreloaderCacheBypassTestCase(MarionetteTestCase):
    def setUp(self):
        super().setUp()
        self.temp_dir = tempfile.mkdtemp()
        self.marionette.set_pref("javascript.options.force_preloader_active", True)

    def tearDown(self):
        import shutil

        if hasattr(self, "temp_dir") and os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
        super().tearDown()

    def create_jar(self, export_value):
        module_content = f"""
export const TEST_VALUE = "{export_value}";
"""

        jar_path = os.path.join(self.temp_dir, "test.jar")
        with zipfile.ZipFile(jar_path, "w", zipfile.ZIP_DEFLATED) as jar:
            jar.writestr("test.sys.mjs", module_content)

        return jar_path

    def setup_substitution(self, jar_path):
        script = """
        let jarPath = arguments[0];
        let resolve = arguments[arguments.length - 1];

        try {
            let jarFile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
            jarFile.initWithPath(jarPath);

            let jarURI = Services.io.newFileURI(jarFile);
            let uri = Services.io.newURI("jar:" + jarURI.spec + "!/");

            Services.io
                .getProtocolHandler("resource")
                .QueryInterface(Ci.nsIResProtocolHandler)
                .setSubstitutionWithFlags(
                    "test-cache-addon",
                    uri,
                    Ci.nsIResProtocolHandler.ALLOW_CONTENT_ACCESS
                );

            resolve(true);
        } catch (e) {
            resolve({ error: e.toString(), stack: e.stack || "no stack" });
        }
        """

        with self.marionette.using_context("chrome"):
            result = self.marionette.execute_async_script(
                script, script_args=[jar_path]
            )
        if isinstance(result, dict) and "error" in result:
            raise Exception(
                f"Script error: {result['error']}\n{result.get('stack', '')}"
            )
        return result

    def load_module(self):
        script = """
        try {
            const { TEST_VALUE } = ChromeUtils.importESModule(
                "resource://test-cache-addon/test.sys.mjs"
            );
            return { success: true, value: TEST_VALUE };
        } catch (e) {
            return { success: false, reason: e.toString() };
        }
        """

        with self.marionette.using_context("chrome"):
            return self.marionette.execute_script(script)

    def wait_for_idle_tasks_finished(self):
        script = """
        let resolve = arguments[arguments.length - 1];

        (async function() {
            await window.gBrowserInit.idleTasksFinished;
            await new Promise(r => Services.tm.dispatchToMainThread(r));
            resolve();
        })();
        """

        with self.marionette.using_context("chrome"):
            self.marionette.execute_async_script(script)

    def test_preloader_cache_bypassed_for_profile_jars(self):
        jar_path = self.create_jar("value_from_v1")

        self.marionette.restart(in_app=True)
        self.setup_substitution(jar_path)

        result1 = self.load_module()
        self.assertTrue(
            result1["success"],
            f"Should successfully load first module. Error: {result1.get('reason', 'unknown')}",
        )
        self.assertEqual(
            result1["value"],
            "value_from_v1",
            "Should load value from first jar version",
        )

        self.wait_for_idle_tasks_finished()

        self.marionette.quit(in_app=True)
        jar_path = self.create_jar("value_from_v2")
        self.marionette.start_session()

        self.setup_substitution(jar_path)

        result2 = self.load_module()
        self.assertTrue(
            result2["success"],
            f"Should successfully load second module. Error: {result2.get('reason', 'unknown')}",
        )
        self.assertEqual(
            result2["value"],
            "value_from_v2",
            "Should load value from second jar version, not cached value from first",
        )

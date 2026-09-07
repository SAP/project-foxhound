# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import textwrap

from marionette_harness.marionette_test import MarionetteTestCase


class TestEnginesOnRestart(MarionetteTestCase):
    def setUp(self):
        super().setUp()
        self.marionette.enforce_gecko_prefs({
            "browser.search.log": True,
        })

    def get_default_search_engine(self):
        """Retrieve the identifier of the default search engine."""

        script = """\
        let [resolve] = arguments;
        let { SearchService } = ChromeUtils.importESModule(
            "moz-src:///toolkit/components/search/SearchService.sys.mjs"
        );
        return SearchService.init().then(function () {
          resolve(SearchService.defaultEngine.id);
        });
        """

        with self.marionette.using_context(self.marionette.CONTEXT_CHROME):
            return self.marionette.execute_async_script(textwrap.dedent(script))

    def test_engines(self):
        self.assertEqual(self.get_default_search_engine(), "google")
        self.marionette.set_pref("intl.locale.requested", "kk_KZ")
        self.marionette.restart(clean=False, in_app=True)
        self.assertEqual(self.get_default_search_engine(), "google")

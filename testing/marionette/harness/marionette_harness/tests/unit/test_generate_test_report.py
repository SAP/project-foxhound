from marionette_harness import MarionetteTestCase


class TestGenerateTestReport(MarionetteTestCase):
    def setUp(self):
        MarionetteTestCase.setUp(self)
        self.prefsToSet = ["dom.reporting.enabled", "dom.reporting.testing.enabled"]
        for pref in self.prefsToSet:
            self.marionette.set_pref(pref, True)

    def tearDown(self):
        for pref in self.prefsToSet:
            self.marionette.clear_pref(pref)

    def test_generate_test_report(self):
        self.marionette.generate_test_report("Test")

    def test_generate_test_report_different_group(self):
        self.marionette.generate_test_report("Test", "different")

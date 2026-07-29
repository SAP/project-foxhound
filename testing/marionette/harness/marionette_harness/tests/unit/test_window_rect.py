# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette_harness import MarionetteTestCase


class TestWindowRect(MarionetteTestCase):

    def test_get_window_rect_types(self):
        rect = self.marionette.window_rect

        self.assertIn("x", rect)
        self.assertIn("y", rect)
        self.assertIn("height", rect)
        self.assertIn("width", rect)
        self.assertIsInstance(rect["x"], int)
        self.assertIsInstance(rect["y"], int)
        self.assertIsInstance(rect["height"], int)
        self.assertIsInstance(rect["width"], int)

    def test_set_window_rect(self):
        original_rect = self.marionette.window_rect

        self.marionette.set_window_rect(
            x=original_rect["x"],
            y=original_rect["y"],
            height=original_rect["height"],
            width=original_rect["width"],
        )

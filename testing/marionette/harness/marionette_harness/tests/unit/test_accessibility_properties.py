# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from six.moves.urllib.parse import quote

from marionette_driver import By, errors
from marionette_harness import MarionetteTestCase


def inline(doc):
    return "data:text/html;charset=utf-8,{}".format(quote(doc))


class TestGetAccessibilityPropertiesForElement(MarionetteTestCase):
    def test_can_get_accessibility_properties(self):
        self.marionette.navigate(inline("<button id=a>btn</button>"))
        acc_props = self.marionette.find_element(By.ID, "a").accessibility_properties
        self.assertEqual(acc_props["role"], "button")
        self.assertEqual(acc_props["label"], "btn")

    def test_get_accessibility_properties_no_such_element(self):
        self.marionette.navigate(inline("<div id=a>"))
        element = self.marionette.find_element(By.ID, "a")
        element.id = "b"
        with self.assertRaises(errors.NoSuchElementException):
            element.accessibility_properties


class TestGetAccessibilityPropertiesForAccessibilityNode(MarionetteTestCase):
    def setUp(self):
        super(TestGetAccessibilityPropertiesForAccessibilityNode, self).setUp()
        self.marionette.navigate(
            inline('<div id="listbox" role="listbox"><div role="option">a</div></div>')
        )
        listbox = self.marionette.find_element(By.ID, "listbox")
        self.listbox_acc_props = listbox.accessibility_properties

    def test_can_get_accessibility_properties(self):
        id = self.listbox_acc_props["children"][0]
        acc_props = self.marionette.get_accessibility_properties_for_accessibility_node(id)
        self.assertEqual(acc_props["role"], "option")

    def test_get_accessibility_properties_no_such_node(self):
        acc_props = self.marionette.get_accessibility_properties_for_accessibility_node("nonexistent")
        self.assertEqual(acc_props, None)

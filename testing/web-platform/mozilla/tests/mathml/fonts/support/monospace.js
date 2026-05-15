"use strict";

function assert_whether_monospace(textElement, epsilon, expectsMonoSpace) {
  // To verify that the text element is monospace, we compare its width against
  // the its length times the width of a period character.
  const text = textElement.textContent;
  textElement.textContent = ".";
  const charWidth = textElement.getBoundingClientRect().width;
  textElement.textContent = text;
  const textWidth = textElement.getBoundingClientRect().width;
  if (expectsMonoSpace) {
    assert_approx_equals(textWidth, text.length * charWidth, epsilon);
  } else {
    assert_greater_than(Math.abs(textWidth - text.length * charWidth), epsilon);
  }
}

function assert_is_monospace(textElement, epsilon) {
  assert_whether_monospace(textElement, epsilon, true);
}

function assert_is_not_monospace(textElement, epsilon) {
  assert_whether_monospace(textElement, epsilon, false);
}

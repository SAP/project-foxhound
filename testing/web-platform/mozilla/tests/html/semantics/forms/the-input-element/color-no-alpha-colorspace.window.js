promise_test(async () => {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["dom.forms.alpha.enabled", true],
      ["dom.forms.colorspace.enabled", false],
    ]
  });

  const input = document.createElement("input");
  input.type = "color";
  input.setAttribute("value", "black");
  assert_equals(input.value, "#000000");
  input.setAttribute("colorspace", "display-p3");
  assert_equals(input.value, "#000000");
  input.setAttribute("alpha", "");
  assert_equals(input.value, "color(srgb 0 0 0)");
}, "colorspace should not affect value when disabled");

promise_test(async () => {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["dom.forms.alpha.enabled", false],
      ["dom.forms.colorspace.enabled", true],
    ]
  });

  const input = document.createElement("input");
  input.type = "color";
  input.setAttribute("value", "color(srgb 0 0 0 / 0.5)");
  assert_equals(input.value, "#000000");
  input.setAttribute("colorspace", "display-p3");
  assert_equals(input.value, "color(display-p3 0 0 0)");
  input.setAttribute("alpha", "");
  assert_equals(input.value, "color(display-p3 0 0 0)");
}, "alpha should not affect value when disabled");

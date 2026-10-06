const PAGE = `
<!doctype html>
<select>
  <option>ABC</option>
  <option style="display: inherit">DEF</option>
</select>
`;

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["test.wait300msAfterTabSwitch", true]],
  });
});

add_task(async function () {
  const url = "data:text/html," + encodeURI(PAGE);
  await BrowserTestUtils.withNewTab({ gBrowser, url }, async function () {
    let popup = await openSelectPopup("click");
    is(popup.children.length, 2, "Both options should appear in the popup");
    is(popup.children[0].textContent, "ABC", "First option shows up");
    is(
      popup.children[1].textContent,
      "DEF",
      "Option with display:inherit shows up"
    );
  });
});

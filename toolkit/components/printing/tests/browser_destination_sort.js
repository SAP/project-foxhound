/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const PDF_PRINTER = "Mozilla Save to PDF";

function getDestinationNames(helper) {
  let picker = helper.get("printer-picker");
  return Array.from(picker.options).map(o => o.value);
}

add_task(async function testAutoDiscoveredPrintersSortedToBottom() {
  await PrintHelper.withTestPage(async helper => {
    // Add printers in a deliberately interleaved order to verify sorting is
    // applied (not just preserving insertion order).
    helper.addMockPrinter({ name: "Zebra Local", sortAfterLocal: false });
    helper.addMockPrinter({ name: "Bonjour HP", sortAfterLocal: true });
    helper.addMockPrinter({ name: "Apple Local", sortAfterLocal: false });
    helper.addMockPrinter({ name: "Brother Network", sortAfterLocal: true });

    await helper.startPrint();

    let names = getDestinationNames(helper);
    Assert.deepEqual(
      names,
      [
        PDF_PRINTER,
        "Apple Local",
        "Zebra Local",
        "Bonjour HP",
        "Brother Network",
      ],
      "Save-to-PDF first, then manually-added (alpha), then auto-discovered (alpha)"
    );

    await helper.closeDialog();
  });
});

add_task(async function testSaveToPdfStaysFirstWhenAllAutoDiscovered() {
  await PrintHelper.withTestPage(async helper => {
    helper.addMockPrinter({ name: "Network A", sortAfterLocal: true });
    helper.addMockPrinter({ name: "Network B", sortAfterLocal: true });

    await helper.startPrint();

    let names = getDestinationNames(helper);
    Assert.deepEqual(
      names,
      [PDF_PRINTER, "Network A", "Network B"],
      "Save-to-PDF remains at index 0"
    );

    await helper.closeDialog();
  });
});

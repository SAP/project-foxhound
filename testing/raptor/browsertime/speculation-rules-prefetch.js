/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global require, module */

const { logTest } = require("./utils/profiling");

module.exports = logTest(
  "speculation rules prefetch",
  async function (context, commands) {
    const serverUrl = context.options.browsertime.server_url;
    if (!serverUrl) {
      throw new Error(
        "speculation-rules-prefetch: missing --browsertime.server_url; " +
          "is support_class=speculation_rules.py wired in?"
      );
    }

    const buttonId = context.options.browsertime.button_id || "btn-a";
    // Covers the ~200 ms moderate-eagerness trigger + 500 ms backend stall.
    const dwellMs = Number(context.options.browsertime.dwell_ms ?? 1000);

    context.log.info(
      `speculation-rules-prefetch: button=${buttonId}, dwell_ms=${dwellMs}`
    );

    await commands.navigate(`${serverUrl}/landing.html`);
    await commands.wait.byTime(250);

    await commands.measure.start();
    await commands.mouse.moveTo.bySelector(`#${buttonId}`);
    await commands.wait.byTime(dwellMs);
    await commands.mouse.singleClick.bySelector(`#${buttonId}`);
    await commands.wait.byTime(2500);
    await commands.measure.stop();

    const navInfo = await commands.js.run(`
      const nav = performance.getEntriesByType('navigation')[0];
      return nav ? {
        deliveryType: nav.deliveryType || "",
        type: nav.type,
        duration: nav.duration,
        responseStart: nav.responseStart,
        domContentLoadedEventEnd: nav.domContentLoadedEventEnd,
        loadEventEnd: nav.loadEventEnd,
        href: location.href,
      } : null;
    `);
    context.log.info(
      `speculation-rules-prefetch: navigation entry = ${JSON.stringify(navInfo)}`
    );

    if (!navInfo) {
      throw new Error(
        "speculation-rules-prefetch: no navigation entry found on target page"
      );
    }

    await commands.measure.addObject({
      custom_data: {
        delivery_type: navInfo.deliveryType,
        navigation_duration: navInfo.duration,
        response_start: navInfo.responseStart,
      },
    });

    return true;
  }
);

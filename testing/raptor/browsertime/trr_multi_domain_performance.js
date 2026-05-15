/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global require, module */

const { logTest } = require("./utils/profiling");

module.exports = logTest(
  "multi-domain dns lookup pageload",
  async function (context, commands) {
    context.log.info(
      "Starting multi-domain pageload to measure DNS lookup time"
    );

    const testType = `${context.options.browsertime.test_type}`;
    context.log.info("testType: " + testType);

    const url =
      "https://mozilla-necko.github.io/tests/dns/trr_multi_domain.html";

    await commands.navigate("about:blank");

    // Idle to allow for confirmation
    await commands.wait.byTime(5000);

    if (testType === "trr_warm") {
      // Ensure the trr connection has been warmed up by making an arbitrary request
      await commands.navigate("https://www.w3.org");
      await commands.wait.byTime(2000);
    }

    // Start measuring
    await commands.measure.start();
    await commands.navigate(url);

    // Wait for all domains to load (or fail)
    await commands.wait.byTime(10000);

    await commands.measure.stop();

    // Get pageload time
    let pageload_time = await commands.js.run(`
      return (window.performance.timing.loadEventEnd - window.performance.timing.navigationStart);
    `);

    // Extract timing data from the page
    let timing_data = await commands.js.run(`
      const entries = window.performance.getEntriesByType('resource');

      let totalDNS = 0;
      let maxDNS = 0;
      let minDNS = Infinity;
      let dnsCount = 0;
      const dnsTimings = [];

      let totalConnect = 0;
      let maxConnect = 0;
      let minConnect = Infinity;
      let connectCount = 0;
      const connectTimings = [];

      let totalCompletion = 0;
      let maxCompletion = 0;
      let minCompletion = Infinity;
      let completionCount = 0;
      const completionTimings = [];

      entries.forEach(entry => {
        const dnsTime = entry.domainLookupEnd - entry.domainLookupStart;
        if (dnsTime > 0) {
          totalDNS += dnsTime;
          maxDNS = Math.max(maxDNS, dnsTime);
          minDNS = Math.min(minDNS, dnsTime);
          dnsCount++;
          dnsTimings.push({ url: entry.name, dns_time: dnsTime });
        }

        const connectTime = entry.connectEnd - entry.connectStart;
        if (connectTime > 0) {
          totalConnect += connectTime;
          maxConnect = Math.max(maxConnect, connectTime);
          minConnect = Math.min(minConnect, connectTime);
          connectCount++;
          connectTimings.push({ url: entry.name, connect_time: connectTime });
        }

        const completionTime = entry.responseEnd - entry.startTime;
        if (completionTime > 0) {
          totalCompletion += completionTime;
          maxCompletion = Math.max(maxCompletion, completionTime);
          minCompletion = Math.min(minCompletion, completionTime);
          completionCount++;
          completionTimings.push({ url: entry.name, completion_time: completionTime });
        }
      });

      function median(values) {
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      }

      function r2(v) { return Math.round(v * 100) / 100; }

      const dnsValues = dnsTimings.map(t => t.dns_time);
      const connectValues = connectTimings.map(t => t.connect_time);
      const completionValues = completionTimings.map(t => t.completion_time);

      return {
        total_resource_entries: entries.length,

        avg_dns_lookup_time: r2(dnsCount > 0 ? totalDNS / dnsCount : 0),
        median_dns_lookup_time: r2(median(dnsValues)),
        total_dns_lookup_time: r2(totalDNS),
        dns_entries_count: dnsCount,
        max_dns_lookup_time: r2(maxDNS === 0 ? 0 : maxDNS),
        min_dns_lookup_time: r2(minDNS === Infinity ? 0 : minDNS),
        dns_timings: dnsTimings,

        avg_connect_time: r2(connectCount > 0 ? totalConnect / connectCount : 0),
        median_connect_time: r2(median(connectValues)),
        total_connect_time: r2(totalConnect),
        connect_entries_count: connectCount,
        max_connect_time: r2(maxConnect === 0 ? 0 : maxConnect),
        min_connect_time: r2(minConnect === Infinity ? 0 : minConnect),
        connect_timings: connectTimings,

        avg_completion_time: r2(completionCount > 0 ? totalCompletion / completionCount : 0),
        median_completion_time: r2(median(completionValues)),
        total_completion_time: r2(totalCompletion),
        completion_entries_count: completionCount,
        max_completion_time: r2(maxCompletion === 0 ? 0 : maxCompletion),
        min_completion_time: r2(minCompletion === Infinity ? 0 : minCompletion),
        completion_timings: completionTimings,
      };
    `);

    context.log.info("pageload_time: " + pageload_time);
    context.log.info(
      "total_resource_entries: " + timing_data.total_resource_entries
    );
    context.log.info("dns_entries_count: " + timing_data.dns_entries_count);
    context.log.info("avg_dns_lookup_time: " + timing_data.avg_dns_lookup_time);
    context.log.info(
      "median_dns_lookup_time: " + timing_data.median_dns_lookup_time
    );
    context.log.info(
      "total_dns_lookup_time: " + timing_data.total_dns_lookup_time
    );
    context.log.info("max_dns_lookup_time: " + timing_data.max_dns_lookup_time);
    context.log.info("min_dns_lookup_time: " + timing_data.min_dns_lookup_time);
    context.log.info(
      "connect_entries_count: " + timing_data.connect_entries_count
    );
    context.log.info("avg_connect_time: " + timing_data.avg_connect_time);
    context.log.info("median_connect_time: " + timing_data.median_connect_time);
    context.log.info("max_connect_time: " + timing_data.max_connect_time);
    context.log.info("min_connect_time: " + timing_data.min_connect_time);
    context.log.info(
      "completion_entries_count: " + timing_data.completion_entries_count
    );
    context.log.info("avg_completion_time: " + timing_data.avg_completion_time);
    context.log.info(
      "median_completion_time: " + timing_data.median_completion_time
    );
    context.log.info("max_completion_time: " + timing_data.max_completion_time);
    context.log.info("min_completion_time: " + timing_data.min_completion_time);

    await commands.measure.addObject({
      custom_data: {
        pageload_time,
        total_resource_entries: timing_data.total_resource_entries,
        dns_entries_count: timing_data.dns_entries_count,
        avg_dns_lookup_time: timing_data.avg_dns_lookup_time,
        median_dns_lookup_time: timing_data.median_dns_lookup_time,
        total_dns_lookup_time: timing_data.total_dns_lookup_time,
        max_dns_lookup_time: timing_data.max_dns_lookup_time,
        min_dns_lookup_time: timing_data.min_dns_lookup_time,
        dns_timings: timing_data.dns_timings,
        connect_entries_count: timing_data.connect_entries_count,
        avg_connect_time: timing_data.avg_connect_time,
        median_connect_time: timing_data.median_connect_time,
        total_connect_time: timing_data.total_connect_time,
        max_connect_time: timing_data.max_connect_time,
        min_connect_time: timing_data.min_connect_time,
        connect_timings: timing_data.connect_timings,
        completion_entries_count: timing_data.completion_entries_count,
        avg_completion_time: timing_data.avg_completion_time,
        median_completion_time: timing_data.median_completion_time,
        total_completion_time: timing_data.total_completion_time,
        max_completion_time: timing_data.max_completion_time,
        min_completion_time: timing_data.min_completion_time,
        completion_timings: timing_data.completion_timings,
      },
    });

    context.log.info("Multi-domain DNS lookup test finished.");
    return true;
  }
);

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { logTest, logTask } = require("./utils/profiling");
const { pullJitMarkerFiles } = require("./utils/simpleperf");

module.exports = logTest(
  "speedometer 3 test",

  async function (context, commands) {
    context.log.info("Profiling Speedometer 3 Workloads with Simpleperf");

    const page_cycle_delay = context.options.browsertime.page_cycle_delay;
    const post_startup_delay = context.options.browsertime.post_startup_delay;
    const page_timeout = context.options.timeouts.pageLoad;
    const iteration_count = context.options.browsertime.iteration_count;

    const suites = [
      "TodoMVC-JavaScript-ES5",
      "TodoMVC-JavaScript-ES6-Webpack-Complex-DOM",
      "TodoMVC-WebComponents",
      "TodoMVC-React-Complex-DOM",
      "TodoMVC-React-Redux",
      "TodoMVC-Backbone",
      "TodoMVC-Angular-Complex-DOM",
      "TodoMVC-Vue",
      "TodoMVC-jQuery",
      "TodoMVC-Preact-Complex-DOM",
      "TodoMVC-Svelte-Complex-DOM",
      "TodoMVC-Lit-Complex-DOM",
      "NewsSite-Next",
      "NewsSite-Nuxt",
      "Editor-CodeMirror",
      "Editor-TipTap",
      "Charts-observable-plot",
      "Charts-chartjs",
      "React-Stockcharts-SVG",
      "Perf-Dashboard",
    ];

    // Browser cycle count determines which suite to run
    const suiteCount = context.index - 1;
    const suite = suites[suiteCount];
    const url = `${context.options.browsertime.url}&suite=${suite}&iterationCount=${iteration_count}`;

    // Post startup delay
    context.log.info(
      "Waiting for %d ms (post_startup_delay)",
      post_startup_delay
    );
    await commands.wait.byTime(post_startup_delay);

    await logTask(context, `Suite: ${suite}`, async function () {
      // Wait page_cycle_delay
      await commands.navigate("about:blank");
      context.log.info(
        "Waiting for %d ms (page_cycle_delay)",
        page_cycle_delay
      );
      await commands.wait.byTime(page_cycle_delay);

      // Navigate first so Speedometer 3 content processes exist before Simpleperf
      // attaches (when using app mode, Simpleperf only profiles processes already
      // running at start). This ensures the marker file's mmap event is captured
      // and the markers are assigned to the correct thread in the Firefox Profiler
      // profile; if missed, the markers end up assigned to the main (i.e. wrong)
      // thread.

      await commands.navigate(url);

      await commands.simpleperf.start(
        ["-nb"],
        undefined,
        `${suite.toLowerCase()}`
      );

      // Start benchmark. Run the sp3 test suite iteration_count iterations
      await commands.measure.start(url);

      context.log.info(
        `Running ${suite} for ${iteration_count} internal iterations`
      );
      await commands.js.runAndWait(`this.benchmarkClient.start();`);

      // Wait for iterations of test suite to finish. Error if timeout exceeded
      let data_exists = false;
      let starttime = await commands.js.run(`return performance.now();`);
      while (
        !data_exists &&
        (await commands.js.run(`return performance.now();`)) - starttime <
          page_timeout
      ) {
        let wait_time = 3000;
        context.log.info(
          "Waiting %d ms for data from speedometer...",
          wait_time
        );
        await commands.wait.byTime(wait_time);
        data_exists = await commands.js.run(
          "return !(this.benchmarkClient._isRunning)"
        );
      }
      await commands.simpleperf.stop();
      await pullJitMarkerFiles(
        context,
        commands,
        `${suite.toLowerCase()}-${context.index}`
      );

      if (
        !data_exists &&
        (await commands.js.run(`return performance.now();`)) - starttime >=
          page_timeout
      ) {
        context.log.error("Benchmark timed out. Aborting...");
        return false;
      }

      // Output results
      let internal_data = await commands.js.run(
        `return this.benchmarkClient._measuredValuesList;`
      );
      context.log.info(
        "Value of internal benchmark iterations: ",
        internal_data
      );
      let data = await commands.js
        .run(`const values = this.benchmarkClient._computeResults(this.benchmarkClient._measuredValuesList, "ms");
                                          const score = this.benchmarkClient._computeResults(this.benchmarkClient._measuredValuesList, "score");
                                          return {
                                            score,
                                            values: values.formattedMean,
                                          };`);
      commands.measure.addObject({ s3: data, s3_internal: internal_data });
      return true;
    });

    return true;
  }
);

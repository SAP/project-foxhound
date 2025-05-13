/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint-env node */
/* eslint-disable mozilla/avoid-Date-timing */

const fs = require("fs");
const os = require("os");
const { exec } = require("node:child_process");

function logCommands(commands, logger, command, printFirstArg) {
  let object = commands;
  let path = command.split(".");
  while (path.length > 1) {
    object = object[path.shift()];
  }
  let methodName = path[0];
  let originalFun = object[methodName];
  object[methodName] = async function () {
    let logString = ": " + command;
    if (printFirstArg && arguments.length) {
      logString += ": " + arguments[0];
    }
    logger.info("BEGIN" + logString);
    let rv = await originalFun.apply(object, arguments);
    logger.info("END" + logString);
    return rv;
  };
}

async function logTask(context, logString, task) {
  context.log.info("BEGIN: " + logString);
  let rv = await task();
  context.log.info("END: " + logString);

  return rv;
}

function logTest(name, test) {
  return async function wrappedTest(context, commands) {
    let testTimes = [];

    let start;
    let originalStart = commands.measure.start;
    commands.measure.start = function () {
      start = Date.now();
      return originalStart.apply(commands.measure, arguments);
    };
    let originalStop = commands.measure.stop;
    commands.measure.stop = function () {
      testTimes.push([start, Date.now()]);
      return originalStop.apply(commands.measure, arguments);
    };

    for (let [commandName, printFirstArg] of [
      ["addText.bySelector", true],
      ["android.shell", true],
      ["click.byXpath", true],
      ["click.byXpathAndWait", true],
      ["js.run", false],
      ["js.runAndWait", false],
      ["js.runPrivileged", false],
      ["measure.add", true],
      ["measure.addObject", false],
      ["measure.start", true],
      ["measure.stop", false],
      ["mouse.doubleClick.bySelector", true],
      ["mouse.doubleClick.byXpath", true],
      ["mouse.singleClick.bySelector", true],
      ["navigate", true],
      ["profiler.start", false],
      ["profiler.stop", false],
      ["trace.start", false],
      ["trace.stop", false],
      ["wait.byTime", true],
    ]) {
      logCommands(commands, context.log, commandName, printFirstArg);
    }

    let canPowerProfile =
      os.type() == "Windows_NT" &&
      /10.0.2[2-9]/.test(os.release()) &&
      process.env.XPCSHELL_PATH;
    let profilePath = process.env.MOZ_UPLOAD_DIR + "/profile_power.json";
    let childPromise, child;
    if (canPowerProfile) {
      childPromise = new Promise(resolve => {
        child = exec(
          process.env.XPCSHELL_PATH,
          {
            env: {
              MOZ_PROFILER_STARTUP: "1",
              MOZ_PROFILER_STARTUP_FEATURES:
                "power,nostacksampling,notimerresolutionchange",
              MOZ_PROFILER_SHUTDOWN: profilePath,
            },
          },
          (error, stdout, stderr) => {
            if (error) {
              console.log("DEBUG ERROR", error);
            }
            if (stderr) {
              console.log("DEBUG stderr", error);
            }
            resolve(stdout);
          }
        );
      });
    }

    let iterationName = "iteration";
    if (
      context.options.firefox.geckoProfiler ||
      context.options.browsertime.expose_profiler === "true"
    ) {
      iterationName = "profiling iteration";
    }
    let logString = `: ${iterationName} ${context.index}: ${name}`;
    context.log.info("BEGIN" + logString);
    let rv = await test(context, commands);
    context.log.info("END" + logString);

    if (canPowerProfile) {
      child.stdin.end("quit()");
      await childPromise;

      let power_data = {
        cpu_cores: [],
        cpu_package: [],
        gpu: [],
      };

      let profile = null;
      try {
        profile = JSON.parse(await fs.readFileSync(profilePath, "utf8"));
      } catch (err) {
        throw Error(`Failed to read the profile file: ${err}`);
      }
      for (let [start, end] of testTimes) {
        start -= profile.meta.startTime;
        end -= profile.meta.startTime;
        for (let counter of profile.counters) {
          let field = "";
          if (counter.name == "Power: iGPU") {
            field = "gpu";
          } else if (counter.name == "Power: CPU package") {
            field = "cpu_package";
          } else if (counter.name == "Power: CPU cores") {
            field = "cpu_cores";
          } else {
            continue;
          }

          let accumulatedPower = 0;
          for (let i = 0; i < counter.samples.data.length; ++i) {
            let time = counter.samples.data[i][counter.samples.schema.time];
            if (time < start) {
              continue;
            }
            if (time > end) {
              break;
            }
            accumulatedPower +=
              counter.samples.data[i][counter.samples.schema.count];
          }
          power_data[field].push(accumulatedPower);
        }
      }

      commands.measure.addObject({ power_data });
    }

    return rv;
  };
}

module.exports = {
  logTest,
  logTask,
};

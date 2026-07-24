# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import os
import posixpath
import shutil
import sys
import tempfile
import traceback
import uuid

sys.path.insert(0, os.path.abspath(os.path.realpath(os.path.dirname(__file__))))

import mozcrash
import mozinfo
from mochitest_options import MochitestArgumentParser, build_obj
from mozdevice.ios import IosDevice
from runtests import MessageLogger, MochitestDesktop

SCRIPT_DIR = os.path.abspath(os.path.realpath(os.path.dirname(__file__)))


class MochiRemoteIos(MochitestDesktop):
    localProfile = None
    logMessages = []

    def __init__(self, options):
        MochitestDesktop.__init__(self, options.flavor, vars(options))

        # Fixme - support non-simulator devices.
        self.isSimulator = True

        if hasattr(options, "log"):
            delattr(options, "log")

        self.certdbNew = True
        self.chromePushed = False

        self.device = IosDevice.select_device(self.isSimulator)

        if options.remoteTestRoot is None:
            options.remoteTestRoot = self.device.test_root(options.remoteappname)
        options.dumpOutputDirectory = options.remoteTestRoot

        self.remoteLogFile = posixpath.join(
            options.remoteTestRoot, "logs", "mochitest.log"
        )
        logParent = posixpath.dirname(self.remoteLogFile)
        self.device.rm(logParent, recursive=True)
        self.device.mkdir(logParent, parents=True)

        self.remoteProfile = posixpath.join(options.remoteTestRoot, "profile")
        self.device.rm(self.remoteProfile, force=True, recursive=True)

        self.message_logger = MessageLogger(logger=None)
        self.message_logger.logger = self.log

        # FIXME: There doesn't appear to be a way to check if an app is
        # installed on an iOS device?

        self.remoteModulesDir = posixpath.join(options.remoteTestRoot, "modules/")

        self.remoteCache = posixpath.join(options.remoteTestRoot, "cache/")
        self.device.rm(self.remoteCache, force=True, recursive=True)

        # move necko cache to a location that can be cleaned up
        options.extraPrefs += [
            f"browser.cache.disk.parent_directory={self.remoteCache}"
        ]

        self.remoteMozLog = posixpath.join(options.remoteTestRoot, "mozlog")
        self.device.rm(self.remoteMozLog, force=True, recursive=True)
        self.device.mkdir(self.remoteMozLog, parents=True)

        self.remoteChromeTestDir = posixpath.join(options.remoteTestRoot, "chrome")
        self.device.rm(self.remoteChromeTestDir, force=True, recursive=True)
        self.device.mkdir(self.remoteChromeTestDir, parents=True)

        self.appName = options.remoteappname
        self.device.stop_application(self.appName)

        mozinfo.info["is_emulator"] = self.isSimulator

    def cleanup(self, options, final=False):
        if final:
            self.device.rm(self.remoteChromeTestDir, force=True, recursive=True)
            self.chromePushed = False
            uploadDir = os.environ.get("MOZ_UPLOAD_DIR", None)
            if uploadDir and self.device.is_dir(self.remoteMozLog):
                self.device.pull(self.remoteMozLog, uploadDir)
        self.device.rm(self.remoteLogFile, force=True)
        self.device.rm(self.remoteProfile, force=True, recursive=True)
        self.device.rm(self.remoteCache, force=True, recursive=True)
        MochitestDesktop.cleanup(self, options, final)
        self.localProfile = None

    def dumpScreen(self, utilityPath):
        self.log.info("Would take a screenshot, but not implemented for iOS")

    def findPath(self, paths, filename=None):
        for path in paths:
            p = path
            if filename:
                p = os.path.join(p, filename)
            if os.path.exists(self.getFullPath(p)):
                return path
        return None

    # This seems kludgy, but this class uses paths from the remote host in the
    # options, except when calling up to the base class, which doesn't
    # understand the distinction.  This switches out the remote values for local
    # ones that the base class understands.  This is necessary for the web
    # server, SSL tunnel and profile building functions.
    def switchToLocalPaths(self, options):
        """Set local paths in the options, return a function that will restore remote values"""
        remoteXrePath = options.xrePath
        remoteProfilePath = options.profilePath
        remoteUtilityPath = options.utilityPath

        paths = [
            options.xrePath,
        ]
        if build_obj:
            paths.append(os.path.join(build_obj.topobjdir, "dist", "bin"))
        options.xrePath = self.findPath(paths)
        if options.xrePath is None:
            self.log.error(
                f"unable to find xulrunner path for {os.name}, please specify with --xre-path"
            )
            sys.exit(1)

        xpcshell = "xpcshell"
        if os.name == "nt":
            xpcshell += ".exe"

        if options.utilityPath:
            paths = [options.utilityPath, options.xrePath]
        else:
            paths = [options.xrePath]
        options.utilityPath = self.findPath(paths, xpcshell)

        if options.utilityPath is None:
            self.log.error(
                f"unable to find utility path for {os.name}, please specify with --utility-path"
            )
            sys.exit(1)

        if self.localProfile:
            options.profilePath = self.localProfile
        else:
            options.profilePath = None

        def fixup():
            options.xrePath = remoteXrePath
            options.utilityPath = remoteUtilityPath
            options.profilePath = remoteProfilePath

        return fixup

    def startServers(self, options, debuggerInfo, public=None):
        """Create the servers on the host and start them up"""
        restoreRemotePaths = self.switchToLocalPaths(options)
        MochitestDesktop.startServers(self, options, debuggerInfo, public=True)
        restoreRemotePaths()

    def buildProfile(self, options):
        restoreRemotePaths = self.switchToLocalPaths(options)
        if options.testingModulesDir:
            try:
                self.device.push(options.testingModulesDir, self.remoteModulesDir)
                self.device.chmod(self.remoteModulesDir, recursive=True)
            except Exception:
                self.log.error(
                    "Automation Error: Unable to copy test modules to device."
                )
                raise
            savedTestingModulesDir = options.testingModulesDir
            options.testingModulesDir = self.remoteModulesDir
        else:
            savedTestingModulesDir = None
        manifest = MochitestDesktop.buildProfile(self, options)
        if savedTestingModulesDir:
            options.testingModulesDir = savedTestingModulesDir
        self.localProfile = options.profilePath

        restoreRemotePaths()
        options.profilePath = self.remoteProfile
        return manifest

    def buildURLOptions(self, options, env):
        saveLogFile = options.logFile
        options.logFile = self.remoteLogFile
        options.profilePath = self.localProfile
        env["MOZ_HIDE_RESULTS_TABLE"] = "1"
        retVal = MochitestDesktop.buildURLOptions(self, options, env)

        # we really need testConfig.js (for browser chrome)
        try:
            self.device.push(options.profilePath, self.remoteProfile)
            self.device.chmod(self.remoteProfile, recursive=True)
        except Exception:
            self.log.error("Automation Error: Unable to copy profile to device.")
            raise

        options.profilePath = self.remoteProfile
        options.logFile = saveLogFile
        return retVal

    def getChromeTestDir(self, options):
        local = super().getChromeTestDir(options)
        remote = self.remoteChromeTestDir
        if options.flavor == "chrome" and not self.chromePushed:
            self.log.info(f"pushing {local} to {remote} on device...")
            local = os.path.join(local, "chrome")
            self.device.push(local, remote)
            self.chromePushed = True
        return remote

    def getLogFilePath(self, logFile):
        return logFile

    def getGMPPluginPath(self, options):
        # TODO: bug 1149374
        return None

    def environment(self, env=None, crashreporter=True, **kwargs):
        # Since running remote, do not mimic the local env: do not copy os.environ
        if env is None:
            env = {}

        if crashreporter:
            env["MOZ_CRASHREPORTER_NO_REPORT"] = "1"
            env["MOZ_CRASHREPORTER"] = "1"
            env["MOZ_CRASHREPORTER_SHUTDOWN"] = "1"
        else:
            env["MOZ_CRASHREPORTER_DISABLE"] = "1"

        # Crash on non-local network connections by default.
        # MOZ_DISABLE_NONLOCAL_CONNECTIONS can be set to "0" to temporarily
        # enable non-local connections for the purposes of local testing.
        # Don't override the user's choice here.  See bug 1049688.
        env.setdefault("MOZ_DISABLE_NONLOCAL_CONNECTIONS", "1")

        # Send an env var noting that we are in automation. Passing any
        # value except the empty string will declare the value to exist.
        #
        # This may be used to disabled network connections during testing, e.g.
        # Switchboard & telemetry uploads.
        env.setdefault("MOZ_IN_AUTOMATION", "1")

        # Set WebRTC logging in case it is not set yet.
        env.setdefault("R_LOG_LEVEL", "6")
        env.setdefault("R_LOG_DESTINATION", "stderr")
        env.setdefault("R_LOG_VERBOSE", "1")

        return env

    def buildBrowserEnv(self, options, debugger=False):
        browserEnv = MochitestDesktop.buildBrowserEnv(self, options, debugger=debugger)
        # remove desktop environment not used on device
        if "XPCOM_MEM_BLOAT_LOG" in browserEnv:
            del browserEnv["XPCOM_MEM_BLOAT_LOG"]
        if self.mozLogs:
            browserEnv["MOZ_LOG_FILE"] = os.path.join(
                self.remoteMozLog, f"moz-pid=%PID-uid={str(uuid.uuid4())}.log"
            )
        if options.dmd:
            browserEnv["DMD"] = "1"
        # Contents of remoteMozLog will be pulled from device and copied to the
        # host MOZ_UPLOAD_DIR, to be made available as test artifacts. Make
        # MOZ_UPLOAD_DIR available to the browser environment so that tests
        # can use it as though they were running on the host.
        browserEnv["MOZ_UPLOAD_DIR"] = self.remoteMozLog
        return browserEnv

    def runApp(
        self,
        testUrl,
        env,
        app,
        profile,
        extraArgs,
        utilityPath,
        debuggerInfo=None,
        valgrindPath=None,
        valgrindArgs=None,
        valgrindSuppFiles=None,
        symbolsPath=None,
        timeout=-1,
        detectShutdownLeaks=False,
        screenshotOnFail=False,
        bisectChunk=None,
        restartAfterFailure=False,
        marionette_args=None,
        e10s=True,
        runFailures=False,
        crashAsPass=False,
        currentManifest=None,
    ):
        """
        Run the app, log the duration it took to execute, return the status code.
        Kill the app if it outputs nothing for |timeout| seconds.
        """

        if timeout == -1:
            timeout = self.DEFAULT_TIMEOUT

        status = 0
        profileDirectory = self.remoteProfile + "/"
        args = []
        args.extend(extraArgs)
        args.extend(("-no-remote", "-profile", profileDirectory))

        environ = self.environment(env=env, crashreporter=not debuggerInfo)
        environ["MOZ_TEST_URL"] = testUrl

        # create an instance to process the output
        outputHandler = self.OutputHandler(
            harness=self,
            utilityPath=utilityPath,
            symbolsPath=symbolsPath,
            dump_screen_on_timeout=not debuggerInfo,
            dump_screen_on_fail=screenshotOnFail,
            shutdownLeaks=None,
            lsanLeaks=None,
            bisectChunk=bisectChunk,
            restartAfterFailure=restartAfterFailure,
        )

        proc = self.device.launch_process(
            self.appName, args, env=environ, processOutputLine=[outputHandler]
        )
        proc.run(None, timeout)

        status = proc.wait()
        if status is None:
            self.log.warning(
                "runtestsremoteios.py | Failed to get app exit code - running/crashed?"
            )
            # must report an integer to process_exit()
            status = 0
        self.log.process_exit("Main app process", status)

        # finalize output handler
        outputHandler.finish()

        lastTestSeen = currentManifest or "Main app process exited normally"

        crashed = self.check_for_crashes(symbolsPath, lastTestSeen)
        if crashed:
            status = 1

        return status, lastTestSeen

    def check_for_crashes(self, symbols_path, last_test_seen):
        """
        Pull any minidumps from remote profile and log any associated crashes.
        """
        try:
            dump_dir = tempfile.mkdtemp()
            remote_crash_dir = posixpath.join(self.remoteProfile, "minidumps")
            if not self.device.is_dir(remote_crash_dir):
                return False
            self.device.pull(remote_crash_dir, dump_dir)
            crashed = mozcrash.log_crashes(
                self.log, dump_dir, symbols_path, test=last_test_seen
            )
        finally:
            try:
                shutil.rmtree(dump_dir)
            except Exception as e:
                self.log.warning(f"unable to remove directory {dump_dir}: {str(e)}")
        return crashed

    # Override for the desktop output handler - used for simctl tests.
    class OutputHandler(MochitestDesktop.OutputHandler):
        # Disable the stack fixer, as there currently isn't one for iOS.
        def stackFixer(self):
            return None


def run_test_harness(parser, options):
    parser.validate(options)

    if options is None:
        raise ValueError(
            "Invalid options specified, use --help for a list of valid options"
        )

    options.runByManifest = True

    mochitest = MochiRemoteIos(options)

    try:
        if options.verify:
            retVal = mochitest.verifyTests(options)
        else:
            retVal = mochitest.runTests(options)
    except Exception:
        mochitest.log.error("Automation Error: Exception caught while running tests")
        traceback.print_exc()
        try:
            mochitest.cleanup(options)
        except Exception:
            # device error cleaning up... oh well!
            traceback.print_exc()
        retVal = 1

    mochitest.archiveMozLogs()
    mochitest.message_logger.finish()

    return retVal


def main(args=sys.argv[1:]):
    parser = MochitestArgumentParser(app="ios")
    options = parser.parse_args(args)

    return run_test_harness(parser, options)


if __name__ == "__main__":
    sys.exit(main())

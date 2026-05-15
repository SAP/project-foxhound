# -*- Mode: python; c-basic-offset: 4; indent-tabs-mode: nil; tab-width: 40 -*-
# vim: set filetype=python:
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import os
import re
import signal
import subprocess
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), "eslint"))
from eslint import prettier_utils, setup_helper
from mozbuild.nodeutil import find_node_executable
from mozlint import result

TYPESCRIPT_ERROR_MESSAGE = """
An error occurred running typescript. Please check the following error messages:

{}
""".strip()

TYPESCRIPT_NOT_FOUND_MESSAGE = """
Could not find typescript!  We looked at the --binary option, at the TYPESCRIPT
environment variable, and then at your local node_modules path. Please install
eslint, typescript and needed plugins with:

mach eslint --setup

and try again.
""".strip()

TYPESCRIPT_FORMAT_REGEX = re.compile(r"(.*)\((\d+),(\d+)\): (\w*) (.*)")


def lint(paths, config, binary=None, setup=None, **lintargs):
    """Run TypeScript."""
    log = lintargs["log"]

    setup_helper.set_project_root(lintargs["root"])
    module_path = setup_helper.get_project_root()

    # We currently use the list of included directories from the configuration
    # for figuring out where the project files are.
    included_projects = []
    for project_file in config["include"]:
        included_projects.append(
            os.path.abspath(os.path.join(module_path, project_file))
        )

    # Now we know where the projects are reduce the list of paths down to the
    # set of projects that we know about.
    project_paths = set()
    for path in paths:
        for included_project in included_projects:
            if os.path.commonpath([included_project, path]) == included_project:
                project_paths.add(included_project)

    # Valid binaries are:
    #  - Any provided by the binary argument.
    #  - Any pointed at by the TYPESCRIPT environmental variable.
    #  - Those provided by |mach lint --setup|.

    if not binary:
        binary, _ = find_node_executable()

    if not binary:
        print(TYPESCRIPT_NOT_FOUND_MESSAGE)
        return 1

    extra_args = lintargs.get("extra_args") or []

    cmd_args = [
        binary,
        os.path.join(module_path, "node_modules", "typescript", "bin", "tsc"),
    ] + extra_args

    results = []
    # Iterate of the appropriate project files to get the list of errors.
    for project in project_paths:
        results.extend(run(cmd_args, project, config, log))

    return {"results": results, "fixed": 0}


def run(cmd_args, project, config, log):
    shell = False
    if prettier_utils.is_windows():
        # The TypeScript binary needs to be run from a shell with msys
        shell = True
    encoding = "utf-8"

    full_args = [*cmd_args, "--project", project]

    log.debug("TypeScript command: {}".format(" ".join(full_args)))

    orig = signal.signal(signal.SIGINT, signal.SIG_IGN)
    proc = subprocess.Popen(
        full_args, shell=shell, stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )
    signal.signal(signal.SIGINT, orig)

    try:
        output, errors = proc.communicate()
    except KeyboardInterrupt:
        proc.kill()
        return []

    if output:
        output = output.decode(encoding, "replace")
    if errors:
        errors = errors.decode(encoding, "replace")

    # 0 is success, 2 is there was at least 1 rule violation. Anything else
    # is more serious.
    if proc.returncode not in {0, 2}:
        print(TYPESCRIPT_ERROR_MESSAGE.format(errors))
        return 1

    if not output and not errors:
        return []

    if len(errors):
        print(TYPESCRIPT_ERROR_MESSAGE.format(errors))
        return 1

    results = []
    for line in output.split("\n"):
        if len(line.strip()) == 0:
            continue

        try:
            match = TYPESCRIPT_FORMAT_REGEX.match(line)
            abspath, lineno, _, type, msg = match.groups()
        except AttributeError:
            print(f"Unable to match regex against output: {line}")
            continue

        res = {
            "path": abspath,
            "message": msg,
            "level": type,
            "lineno": lineno,
        }
        results.append(result.from_config(config, **res))

    return results

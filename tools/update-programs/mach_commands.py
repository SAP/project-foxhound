# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

r"""Make it easy to serve updates for testing.

Serve a local file like:
```
$ ./mach update serve -v /path/to/update.mar
```

Serve a redirect to a URL like:
```
$ ./mach update serve -v https://archive.mozilla.org/pub/firefox/candidates/135.0-candidates/build1/update/mac/en-CA/firefox-135.0.complete.mar
```
"""

import json
import logging
import os
import xml.etree.ElementTree as ET
from urllib.parse import urlparse

import requests
from mach.decorators import (
    Command,
    CommandArgument,
    SubCommand,
)
from mozbuild.util import (
    ensureParentDir,
)
from wptserve import (
    handlers,
    server,
)


class TemporaryPoliciesJSON:
    """Create or update a `policies.json` file, cleaning up afterwards."""

    def __init__(
        self,
        path,
        data,
        log=None,
    ):
        self._path = path
        self._data = data
        self._orig = None
        self._log = log

    def log(self, *args, **kwargs):
        if self._log:
            self._log(*args, **kwargs)

    def __enter__(self):
        if not self._path:
            return

        action = "create"
        ensureParentDir(self._path)
        try:
            self._orig = open(self._path, "rb").read()
            action = "update"
        except FileNotFoundError:
            pass
        except Exception as e:
            self.log(
                logging.DEBUG,
                "policies",
                {"policies": self._path, "exception": repr(e)},
                "Could not back up policies file {policies}: {exception}",
            )

        json.dump(self._data, open(self._path, "w"))
        self.log(
            logging.DEBUG,
            "policies",
            {"policies": self._path, "action": action},
            "Did {action} policies file {policies}",
        )

    def __exit__(self, type, value, traceback):
        if not self._path:
            return

        try:
            if self._orig is not None:
                action = "restore backed up"
                open(self._path, "wb").write(self._orig)
            else:
                action = "delete created"
                os.remove(self._path)

            self.log(
                logging.DEBUG,
                "policies",
                {"policies": self._path, "action": action},
                "Did {action} policies file {policies}",
            )
        except Exception as e:
            self.log(
                logging.DEBUG,
                "policies",
                {"policies": self._path, "action": action, "exception": repr(e)},
                "Could not {action} policies file {policies}: {exception}",
            )


def update_xml(
    output_path,
    output_size,
    buildID,
    update_type="minor",
    patch_type="complete",
    version="2000.0a1",
    host="localhost",
    port=8000,
):
    """
    <?xml version="1.0" encoding="UTF-8"?>
    <updates>
        <update type="minor" buildID="21181002100236"
                displayVersion="2000.0a1" appVersion="2000.0a1" platformVersion="2000.0a1">
            <patch type="complete" URL="http://127.0.0.1:8000/<mar name>" size="<size>"/>
        </update>
    </updates>
    """
    updates = ET.Element("updates")
    update = ET.SubElement(updates, "update")
    update.set("type", update_type)
    update.set("displayVersion", version)
    update.set("appVersion", version)
    update.set("platformVersion", version)
    update.set("buildID", str(buildID))

    patch = ET.SubElement(update, "patch")
    patch.set("type", patch_type)
    URL = f"http://{host}:{port}/{os.path.basename(output_path)}"
    patch.set("URL", URL)
    patch.set("size", str(output_size))

    return ET.tostring(updates, encoding="utf-8")


@Command("update", category="testing", description="Test the update cycle.")
def update(command_context):
    pass


@SubCommand("update", "serve", description="Serve updates.")
@CommandArgument("-v", "--verbose", action="store_true", help="Verbose output.")
@CommandArgument(
    "--port", type=int, default=8000, help="Port to run server on (default=8000)"
)
@CommandArgument(
    "--host",
    default="localhost",
    help='Host address to run server on (default="localhost")',
)
@CommandArgument(
    "-p",
    "--policies",
    dest="policiesPath",
    default=None,
    help="Write policies JSON to the given path (default=policies JSON dumped to stdout)",
)
@CommandArgument(
    "--buildID",
    default="22221010555555",
    help="Build ID to advertise (default=22221010555555, the far future)",
)
@CommandArgument(
    "--update-type",
    choices=("major", "minor"),
    default="major",
    help='Type of update patch to serve (default="major")',
)
@CommandArgument(
    "--patch-type",
    choices=("complete", "partial"),
    default="complete",
    help='Type of update patch to serve (default="complete")',
)
@CommandArgument(
    "mar",
    help="URL or path to MAR file to serve",
)
def serve(
    command_context,
    mar,
    verbose=False,
    port=8000,
    host="localhost",
    policiesPath=None,
    buildID="22221010555555",
    update_type="major",
    patch_type="complete",
):
    command_context._set_log_level(verbose)
    log = command_context.log

    mar_size = None
    url = None
    try:
        url = urlparse(mar)
    except ValueError:
        pass
    if url and url.scheme in ("http", "https"):
        with requests.get(mar, stream=True) as req:
            mar_size = req.headers["Content-Length"]
    else:
        url = None

    if not mar_size:
        mar_size = os.stat(mar).st_size

    @handlers.handler
    def update_xml_handler(request, response):
        log(
            logging.DEBUG,
            "httpd",
            {
                "request": repr(request)
            },  # N.b.: including request itself causes problems.
            "Serving update.xml for: {request}",
        )

        response.status = 200
        response.content = update_xml(
            mar,
            mar_size,
            buildID,
            update_type=update_type,
            patch_type=patch_type,
            host=host,
            port=port,
        )
        response.headers.set(b"Content-Type", b"text/xml")

    class MarFileHandler(handlers.FileHandler):
        def __init__(self, log):
            super().__init__()
            self._log = log

        def get_headers(self, request, path):
            rv = super().get_headers(request, path)

            if "Range" not in request.headers:
                if not any(key.lower() == b"content-length" for (key, _) in rv):
                    file_size = os.stat(path).st_size
                    rv.append(("content-length", file_size))

            return rv

        def __call__(self, request, response):
            self._log(
                logging.DEBUG,
                "httpd",
                {"request": repr(request)},
                "Serving MAR file for: {request}",
            )

            ret = super().__call__(request, response)
            return ret

    @handlers.handler
    def redirect_handler(request, response):
        log(
            logging.DEBUG,
            "httpd",
            {
                "request": repr(request)
            },  # N.b.: including request itself causes problems.
            "Serving MAR redirect for: {request}",
        )

        response.status = 302
        response.headers.set(b"Location", mar.encode("utf-8"))

    routes = [
        ("GET", "/update.xml", update_xml_handler),
    ]
    if not url:
        routes += [
            ("GET", "*", MarFileHandler(log)),
        ]
    else:
        routes += [
            ("GET", "*", redirect_handler),
        ]

    httpd = server.WebTestHttpd(
        host=host, port=port, doc_root=os.path.dirname(mar), routes=routes
    )

    URL = f"http://{host}:{port}/update.xml"
    policiesJSON = {"policies": {"AppUpdateURL": URL}}

    with TemporaryPoliciesJSON(policiesPath, policiesJSON, log=log):
        try:
            log(
                logging.DEBUG,
                "serve",
                {"host": host, "port": port, "policies": policiesJSON},
                "Serving updates on {host}:{port}",
            )

            if not policiesPath:
                print(json.dumps(policiesJSON))

            httpd.start()

            httpd.server_thread.join()
        except KeyboardInterrupt:
            httpd.stop()
            log(
                logging.DEBUG,
                "serve",
                {"host": host, "port": port},
                "Stopped serving updates on {host}:{port}",
            )

    return 0

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from mozunit import main
from wpt_path_utils import (
    parse_wpt_path,
    resolve_wpt_path,
)


def test_resolve_wpt_path():
    """Test resolve_wpt_path function"""

    # Test short paths that need resolution
    assert (
        resolve_wpt_path("/css/test.html") == "testing/web-platform/tests/css/test.html"
    )

    # Test mozilla-specific paths
    assert (
        resolve_wpt_path("/_mozilla/test.html")
        == "testing/web-platform/mozilla/tests/test.html"
    )

    # Test infrastructure paths
    assert (
        resolve_wpt_path("/infrastructure/test.html")
        == "testing/web-platform/tests/infrastructure/test.html"
    )

    # Test already-resolved paths (should be returned as-is)
    assert (
        resolve_wpt_path("testing/web-platform/tests/css/test.html")
        == "testing/web-platform/tests/css/test.html"
    )


def test_parse_wpt_path():
    """Test parse_wpt_path function"""

    # Test simple path without query parameters
    path, manifest, query, anyjs = parse_wpt_path("/css/test.html")
    assert path == "testing/web-platform/tests/css/test.html"
    assert manifest == "testing/web-platform/meta/css/test.html.ini"
    assert query is None
    assert anyjs is None

    # Test path with query parameters
    path, manifest, query, anyjs = parse_wpt_path("/css/test.html?param=value")
    assert path == "testing/web-platform/tests/css/test.html"
    assert manifest == "testing/web-platform/meta/css/test.html.ini"
    assert query == "?param=value"
    assert anyjs is None

    # Test .any.html transformation
    path, manifest, query, anyjs = parse_wpt_path("/css/test.any.html")
    assert path == "testing/web-platform/tests/css/test.any.js"
    assert manifest == "testing/web-platform/meta/css/test.any.js.ini"
    assert query is None
    assert anyjs == {"testing/web-platform/tests/css/test.any.html": False}

    # Test .window.html transformation
    path, manifest, query, anyjs = parse_wpt_path("/css/test.window.html")
    assert path == "testing/web-platform/tests/css/test.window.js"
    assert manifest == "testing/web-platform/meta/css/test.window.js.ini"
    assert query is None
    assert anyjs == {"testing/web-platform/tests/css/test.window.html": False}

    # Test .worker.html transformation
    path, manifest, query, anyjs = parse_wpt_path("/css/test.worker.html")
    assert path == "testing/web-platform/tests/css/test.worker.js"
    assert manifest == "testing/web-platform/meta/css/test.worker.js.ini"
    assert query is None
    assert anyjs == {"testing/web-platform/tests/css/test.worker.html": False}

    # Test with query parameters and special file type
    path, manifest, query, anyjs = parse_wpt_path("/css/test.any.html?param=value")
    assert path == "testing/web-platform/tests/css/test.any.js"
    assert manifest == "testing/web-platform/meta/css/test.any.js.ini"
    assert query == "?param=value"
    assert anyjs == {"testing/web-platform/tests/css/test.any.html": False}

    # Test infrastructure path with parse_wpt_path
    path, manifest, query, anyjs = parse_wpt_path("/infrastructure/test.html")
    assert path == "testing/web-platform/tests/infrastructure/test.html"
    assert manifest == "testing/web-platform/meta/infrastructure/test.html.ini"


def test_parse_wpt_path_with_isdir():
    """Test parse_wpt_path with directory checking function"""

    def mock_isdir(path):
        # Mock function that treats paths ending with .html as files
        return not path.endswith((".html", ".js"))

    # Test that directory paths don't get .ini extension
    path, manifest, query, anyjs = parse_wpt_path("/css/", mock_isdir)
    assert path == "testing/web-platform/tests/css/"
    assert manifest == "testing/web-platform/meta/css/"
    assert query is None
    assert anyjs is None

    # Test that file paths get .ini extension
    path, manifest, query, anyjs = parse_wpt_path("/css/test.html", mock_isdir)
    assert path == "testing/web-platform/tests/css/test.html"
    assert manifest == "testing/web-platform/meta/css/test.html.ini"
    assert query is None
    assert anyjs is None


if __name__ == "__main__":
    main()

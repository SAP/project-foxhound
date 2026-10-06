# META: timeout=long

import base64
import os
import tempfile
from copy import deepcopy
from pathlib import Path

import pytest
import pytest_asyncio
from support.addons import get_internal_addon_id
from tests.support.classic.asserts import assert_error, assert_success
from tests.support.helpers import get_base64_for_extension_file
from tests.support.sync import Poll

from ..addon_install import install_addon, uninstall_addon
from . import navigate_to

ABOUT_URL = "about:about"
RESOURCE_URL = "resource://gre/modules/AppConstants.sys.mjs"

EXTENSION_NEW_TAB_XPI = os.path.join(
    os.path.abspath(os.path.dirname(__file__)),
    "..",
    "..",
    "support",
    "webextensions",
    "extension_new_tab.xpi",
)


@pytest.fixture
def chrome_url(session):
    if session.capabilities["platformName"] == "android":
        return "chrome://geckoview/content/geckoview.xhtml"
    return "chrome://browser/content/browser.xhtml"


@pytest.fixture
def install_new_tab_extension(session):
    """Install an extension that opens a page on install, wait for the page
    to load, and return its moz-extension:// URL. Cleans up on teardown."""
    original_handles = session.handles

    with open(EXTENSION_NEW_TAB_XPI, "rb") as f:
        xpi_base64 = base64.b64encode(f.read()).decode("utf-8")

    response = install_addon(session, "addon", xpi_base64, True)
    addon_id = assert_success(response)

    original_handle = session.window_handle

    def find_extension_tab(_):
        for handle in session.handles:
            if handle in original_handles:
                continue

            session.window_handle = handle
            url = session.url

            if url.startswith("moz-extension://"):
                return handle, url

        return False

    wait = Poll(session, timeout=5)
    ext_handle, ext_url = wait.until(find_extension_tab)

    session.window_handle = original_handle

    yield ext_handle, ext_url

    uninstall_addon(session, addon_id)


@pytest_asyncio.fixture
async def parent_process_session(session, configuration, geckodriver):
    """Start a new geckodriver session with about:about opened via command
    line argument and return the session. Stops the driver on teardown."""
    session.end()

    config = deepcopy(configuration)
    config["capabilities"]["moz:firefoxOptions"]["args"].append("about:about")
    config["capabilities"]["moz:firefoxOptions"]["androidIntentArguments"] = [
        "-d",
        "about:about",
    ]

    driver = geckodriver(config=config)
    driver.new_session()

    assert driver.session.url == "about:about"

    yield driver.session

    await driver.stop()


# To minimize Firefox restarts, run tests requiring system access first,
# followed by those that don’t; so only one restart is needed.


@pytest.mark.allow_system_access
def test_about_url_with_system_access(session, new_tab_classic):
    response = navigate_to(session, ABOUT_URL)
    assert_success(response)
    assert session.url == ABOUT_URL


@pytest.mark.allow_system_access
def test_chrome_url_with_system_access(session, chrome_url, new_tab_classic):
    response = navigate_to(session, chrome_url)
    assert_success(response)
    assert session.url == chrome_url


@pytest.mark.allow_system_access
def test_moz_extension_url_with_system_access(session, new_tab_classic):
    response = install_addon(
        session, "addon", get_base64_for_extension_file("firefox/unsigned.xpi"), False
    )
    addon_id = assert_success(response)

    try:
        internal_id = get_internal_addon_id(session, addon_id)
        ext_url = f"moz-extension://{internal_id}/manifest.json"

        response = navigate_to(session, ext_url)
        assert_success(response)
        assert session.url == ext_url
    finally:
        uninstall_addon(session, addon_id)


@pytest.mark.allow_system_access
def test_resource_url_with_system_access(session, new_tab_classic):
    response = navigate_to(session, RESOURCE_URL)
    assert_success(response)
    assert session.url == RESOURCE_URL


@pytest.mark.allow_system_access
@pytest.mark.parametrize(
    "url",
    ["data:text/html,<h1>test</h1>", "javascript:void(0)"],
    ids=["data", "javascript"],
)
def test_inherit_principal_url_in_parent_process_context_with_system_access(
    session, new_tab_classic, url
):
    response = navigate_to(session, "about:about")
    assert_success(response)

    response = navigate_to(session, url)
    assert_success(response)


def test_about_url_without_system_access(session):
    response = navigate_to(session, ABOUT_URL)
    assert_error(response, "unsupported operation")


def test_chrome_url_without_system_access(session, chrome_url):
    response = navigate_to(session, chrome_url)
    assert_error(response, "unsupported operation")


def test_moz_extension_url_without_system_access(session, install_new_tab_extension):
    _, url = install_new_tab_extension

    response = navigate_to(session, url)
    assert_error(response, "unsupported operation")


def test_resource_url_without_system_access(session):
    response = navigate_to(session, RESOURCE_URL)
    assert_error(response, "unsupported operation")


@pytest.mark.parametrize("protocol", ["http", "https"], ids=["http", "https"])
def test_web_safe_url_in_parent_process_context_without_system_access(
    parent_process_session, inline, protocol
):
    page = inline("<p>foo", protocol=protocol)
    response = navigate_to(parent_process_session, page)
    assert_success(response)
    assert parent_process_session.url == page


def test_file_url_in_parent_process_context_without_system_access(
    parent_process_session,
):
    # Bug 2040913: Reduce page load timeout to prevent hangs on Android
    parent_process_session.timeouts.page_load = 3

    with tempfile.NamedTemporaryFile(suffix=".html", delete=False) as f:
        f.write(b"<p>foo")
        file_url = Path(f.name).as_uri()

    response = navigate_to(parent_process_session, file_url)
    assert_success(response)
    assert parent_process_session.url == file_url


def test_blob_url_in_parent_process_context_without_system_access(
    parent_process_session,
):
    # Create a new tab to get a content process context for creating a blob URL.
    original_handle = parent_process_session.window_handle
    new_handle = parent_process_session.new_window(type_hint="tab")
    parent_process_session.window_handle = new_handle

    blob_url = parent_process_session.execute_script(
        """return URL.createObjectURL(
            new Blob(['<h1>test</h1>'], {type: 'text/html'})
        )"""
    )

    parent_process_session.window_handle = original_handle

    response = navigate_to(parent_process_session, blob_url)
    assert_success(response)


@pytest.mark.parametrize(
    "url",
    ["data:text/html,<h1>test</h1>", "javascript:void(0)"],
    ids=["data", "javascript"],
)
def test_inherit_principal_url_in_parent_process_context_without_system_access(
    parent_process_session, url
):
    response = navigate_to(parent_process_session, url)
    assert_error(response, "unsupported operation")


@pytest.mark.parametrize(
    "url",
    ["data:text/html,<h1>test</h1>", "javascript:void(0)"],
    ids=["data", "javascript"],
)
def test_inherit_principal_url_in_extension_process_context_without_system_access(
    session, install_new_tab_extension, url
):
    handle, _ = install_new_tab_extension

    session.window_handle = handle
    assert session.url.startswith("moz-extension://")

    response = navigate_to(session, url)
    assert_error(response, "unsupported operation")

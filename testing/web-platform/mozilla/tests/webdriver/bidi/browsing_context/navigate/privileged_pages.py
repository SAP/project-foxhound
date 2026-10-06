# META: timeout=long

import base64
import os
import tempfile
from copy import deepcopy
from pathlib import Path

import pytest
import pytest_asyncio
from support.addons import get_internal_addon_id
from tests.support.sync import AsyncPoll
from webdriver.bidi.error import UnsupportedOperationException
from webdriver.bidi.modules.script import ContextTarget

pytestmark = pytest.mark.asyncio

ABOUT_URL = "about:about"
RESOURCE_URL = "resource://gre/modules/AppConstants.sys.mjs"

EXTENSION_NEW_TAB_XPI = os.path.join(
    os.path.abspath(os.path.dirname(__file__)),
    "..",
    "..",
    "..",
    "support",
    "webextensions",
    "extension_new_tab.xpi",
)


@pytest.fixture
def chrome_url(current_session):
    if current_session.capabilities["platformName"] == "android":
        return "chrome://geckoview/content/geckoview.xhtml"
    return "chrome://browser/content/browser.xhtml"


@pytest_asyncio.fixture
async def install_new_tab_extension(bidi_session, install_webextension):
    """Install an extension that opens a page on install, wait for the page
    to load, and return its context id and moz-extension:// URL."""
    with open(EXTENSION_NEW_TAB_XPI, "rb") as f:
        xpi_base64 = base64.b64encode(f.read()).decode("utf-8")

    original_contexts = await bidi_session.browsing_context.get_tree(max_depth=0)
    original_context_ids = {ctx["context"] for ctx in original_contexts}

    await install_webextension(extension_data={"type": "base64", "value": xpi_base64})

    async def find_extension_context(_):
        contexts = await bidi_session.browsing_context.get_tree(max_depth=0)
        for ctx in contexts:
            if ctx["context"] not in original_context_ids and ctx["url"].startswith(
                "moz-extension://"
            ):
                return ctx["context"], ctx["url"]
        return False

    wait = AsyncPoll(bidi_session, timeout=5)
    ext_context_id, ext_url = await wait.until(find_extension_context)

    yield ext_context_id, ext_url


@pytest_asyncio.fixture
async def parent_process_context(configuration, current_session, geckodriver):
    """Start a geckodriver session with about:about opened via command line
    argument and return the BiDi session and the parent process context id.

    Note: This uses geckodriver instead of the browser/new_session fixture
    because the browser fixture doesn't support Android yet (bug 2040886).
    """
    current_session.end()

    config = deepcopy(configuration)
    config["capabilities"]["moz:firefoxOptions"]["args"].append("about:about")
    config["capabilities"]["moz:firefoxOptions"]["androidIntentArguments"] = [
        "-d",
        "about:about",
    ]
    config["capabilities"]["webSocketUrl"] = True

    driver = geckodriver(config=config)

    try:
        driver.new_session()
        driver.session.timeouts.page_load = 3

        bidi_session = driver.session.bidi_session
        await bidi_session.start()

        contexts = await bidi_session.browsing_context.get_tree(max_depth=0)
        page_context = next(
            (ctx for ctx in contexts if ctx["url"] == "about:about"), None
        )
        assert page_context is not None, "No context found with URL about:about"

        yield bidi_session, page_context["context"]

    finally:
        await driver.stop()


# To minimize Firefox restarts, run tests requiring system access first,
# followed by those that don't; so only one restart is needed.


@pytest.mark.allow_system_access
async def test_about_pages_with_system_access(bidi_session, new_tab):
    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=ABOUT_URL, wait="complete"
    )

    contexts = await bidi_session.browsing_context.get_tree(
        root=new_tab["context"], max_depth=0
    )
    assert contexts[0]["url"] == ABOUT_URL


@pytest.mark.allow_system_access
async def test_chrome_url_with_system_access(bidi_session, chrome_url, new_tab):
    """Bug 2040978: Disabled because it crashes Firefox debug builds."""

    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=chrome_url, wait="complete"
    )

    contexts = await bidi_session.browsing_context.get_tree(
        root=new_tab["context"], max_depth=0
    )
    assert contexts[0]["url"] == chrome_url


@pytest.mark.allow_system_access
async def test_moz_extension_url_with_system_access(
    bidi_session, current_session, extension_data, install_webextension, new_tab
):
    addon_id = await install_webextension(
        extension_data={"type": "base64", "value": extension_data["base64"]}
    )

    internal_id = get_internal_addon_id(current_session, addon_id)
    ext_url = f"moz-extension://{internal_id}/manifest.json"

    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=ext_url, wait="complete"
    )

    contexts = await bidi_session.browsing_context.get_tree(
        root=new_tab["context"], max_depth=0
    )
    assert contexts[0]["url"] == ext_url


@pytest.mark.allow_system_access
async def test_resource_url_with_system_access(bidi_session, new_tab):
    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=RESOURCE_URL, wait="complete"
    )

    contexts = await bidi_session.browsing_context.get_tree(
        root=new_tab["context"], max_depth=0
    )
    assert contexts[0]["url"] == RESOURCE_URL


@pytest.mark.allow_system_access
@pytest.mark.parametrize(
    "url",
    [
        "data:text/html,<h1>test</h1>",
        # https://github.com/w3c/webdriver-bidi/issues/1123
        # "javascript:void(0)",
    ],
    ids=[
        "data",
        # "javascript",
    ],
)
async def test_inherit_principal_url_in_parent_process_context_with_system_access(
    bidi_session, new_tab, url
):
    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url="about:about", wait="complete"
    )

    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=url, wait="complete"
    )


async def test_about_pages_without_system_access(bidi_session, top_context):
    with pytest.raises(UnsupportedOperationException):
        await bidi_session.browsing_context.navigate(
            context=top_context["context"], url=ABOUT_URL, wait="complete"
        )


async def test_chrome_url_without_system_access(bidi_session, chrome_url, top_context):
    with pytest.raises(UnsupportedOperationException):
        await bidi_session.browsing_context.navigate(
            context=top_context["context"], url=chrome_url, wait="complete"
        )


async def test_moz_extension_url_without_system_access(
    bidi_session, top_context, install_new_tab_extension
):
    _, url = install_new_tab_extension

    with pytest.raises(UnsupportedOperationException):
        await bidi_session.browsing_context.navigate(
            context=top_context["context"],
            url=url,
            wait="complete",
        )


async def test_resource_url_without_system_access(bidi_session, top_context):
    with pytest.raises(UnsupportedOperationException):
        await bidi_session.browsing_context.navigate(
            context=top_context["context"], url=RESOURCE_URL, wait="complete"
        )


@pytest.mark.parametrize("protocol", ["http", "https"], ids=["http", "https"])
async def test_web_safe_url_in_parent_process_context_without_system_access(
    parent_process_context, inline, protocol
):
    bidi_session, context_id = parent_process_context

    page = inline("<p>foo", protocol=protocol)
    await bidi_session.browsing_context.navigate(
        context=context_id, url=page, wait="complete"
    )

    contexts = await bidi_session.browsing_context.get_tree(
        root=context_id, max_depth=0
    )
    assert contexts[0]["url"] == page


async def test_file_url_in_parent_process_context_without_system_access(
    parent_process_context,
):
    bidi_session, context_id = parent_process_context

    with tempfile.NamedTemporaryFile(suffix=".html", delete=False) as f:
        f.write(b"<p>foo")
        file_url = Path(f.name).as_uri()

    await bidi_session.browsing_context.navigate(
        context=context_id, url=file_url, wait="complete"
    )

    contexts = await bidi_session.browsing_context.get_tree(
        root=context_id, max_depth=0
    )
    assert contexts[0]["url"] == file_url


async def test_blob_url_in_parent_process_context_without_system_access(
    parent_process_context,
):
    bidi_session, context_id = parent_process_context

    # Create a new tab to get a content process context for creating a blob URL.
    new_tab = await bidi_session.browsing_context.create(type_hint="tab")

    result = await bidi_session.script.evaluate(
        expression="""URL.createObjectURL(
            new Blob(['<h1>test</h1>'], {type: 'text/html'})
        )""",
        target=ContextTarget(new_tab["context"]),
        await_promise=False,
    )
    blob_url = result["value"]

    await bidi_session.browsing_context.navigate(
        context=context_id, url=blob_url, wait="complete"
    )


@pytest.mark.parametrize(
    "url",
    ["data:text/html,<h1>test</h1>", "javascript:void(0)"],
    ids=["data", "javascript"],
)
async def test_inherit_principal_url_in_parent_process_context_without_system_access(
    parent_process_context, url
):
    bidi_session, context_id = parent_process_context

    with pytest.raises(UnsupportedOperationException):
        await bidi_session.browsing_context.navigate(
            context=context_id, url=url, wait="complete"
        )


@pytest.mark.parametrize(
    "url",
    ["data:text/html,<h1>test</h1>", "javascript:void(0)"],
    ids=["data", "javascript"],
)
async def test_inherit_principal_url_in_extension_process_context_without_system_access(
    bidi_session, install_new_tab_extension, url
):
    context_id, _ = install_new_tab_extension

    with pytest.raises(UnsupportedOperationException):
        await bidi_session.browsing_context.navigate(
            context=context_id, url=url, wait="complete"
        )

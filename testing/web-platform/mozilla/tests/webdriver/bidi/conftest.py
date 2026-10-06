import pytest
import pytest_asyncio
from webdriver.bidi.client import BidiSession
from webdriver.bidi.modules.script import ContextTarget

from bidi.support.preferences import get_pref, set_pref


@pytest.fixture
def match_capabilities(add_browser_capabilities):
    def match_capabilities(match_type, capability_key, capability_value):
        capability = {}
        capability[capability_key] = capability_value
        capabilities = add_browser_capabilities(capability)
        if match_type == "firstMatch":
            capabilities = [capabilities]

        capabilities_params = {}
        capabilities_params[match_type] = capabilities

        return capabilities_params

    return match_capabilities


@pytest_asyncio.fixture
async def bidi_client():
    bidi_session = None

    async def bidi_client(current_browser, capabilities={}):
        nonlocal bidi_session

        bidi_session = BidiSession.bidi_only(
            current_browser.websocket_url,
            requested_capabilities=capabilities,
        )
        bidi_session.current_browser = current_browser

        await bidi_session.start_transport()

        return bidi_session

    yield bidi_client

    if bidi_session is not None:
        await bidi_session.end()


@pytest_asyncio.fixture
async def new_session(bidi_client, browser):
    """Start bidi client and create a new session.
    At the moment, it throws an error if the session was already started,
    since multiple sessions are not supported.
    """
    bidi_session = None

    async def new_session(capabilities, browser_args=None):
        nonlocal bidi_session

        browser_args = browser_args or {}
        current_browser = browser(use_bidi=True, **browser_args)

        bidi_session = await bidi_client(current_browser, capabilities=capabilities)
        await bidi_session.start()

        return bidi_session

    yield new_session

    # Check if the browser, the session or websocket connection was not closed already.
    if (
        bidi_session is not None
        and bidi_session.current_browser.is_running is True
        and bidi_session.session_id is not None
        and bidi_session.transport.connection.closed is False
    ):
        await bidi_session.session.end()


@pytest.fixture(name="add_browser_capabilities")
def fixture_add_browser_capabilities(configuration):
    def add_browser_capabilities(capabilities):
        # Make sure there aren't keys in common.
        assert not set(configuration["capabilities"]).intersection(set(capabilities))
        result = dict(configuration["capabilities"])
        result.update(capabilities)

        return result

    return add_browser_capabilities


@pytest_asyncio.fixture
async def chrome_context(bidi_session):
    parent_contexts = await bidi_session.browsing_context.get_tree(
        max_depth=0, _extension_params={"moz:scope": "chrome"}
    )

    assert len(parent_contexts) > 0

    return parent_contexts[0]


@pytest_asyncio.fixture
async def set_full_zoom(bidi_session, chrome_context):
    async def _set_full_zoom(context, value):
        await bidi_session.script.call_function(
            function_declaration="""(navigableId, value) => {
                const { NavigableManager } = ChromeUtils.importESModule(
                    "chrome://remote/content/shared/NavigableManager.sys.mjs"
                );

                const context = NavigableManager.getBrowsingContextById(navigableId);
                if (context === null) {
                    throw new Error(`Browsing Context with id ${navigableId} not found`);
                }

                context.fullZoom = value;
            }
            """,
            arguments=[
                {"type": "string", "value": context},
                {"type": "number", "value": value},
            ],
            await_promise=False,
            target=ContextTarget(chrome_context["context"]),
        )

        result = await bidi_session.script.evaluate(
            expression="""window.devicePixelRatio""",
            target=ContextTarget(context),
            await_promise=False,
        )
        return result["value"]

    return _set_full_zoom


@pytest_asyncio.fixture
async def use_pref(bidi_session, chrome_context):
    """Set a specific pref value."""
    reset_values = {}

    async def _use_pref(pref_name, pref_value):
        if pref_name not in reset_values:
            reset_values[pref_name] = await get_pref(
                bidi_session, chrome_context, pref_name
            )

        await set_pref(bidi_session, chrome_context, pref_name, pref_value)

    yield _use_pref

    for pref, reset_value in reset_values.items():
        await set_pref(bidi_session, chrome_context, pref, reset_value)

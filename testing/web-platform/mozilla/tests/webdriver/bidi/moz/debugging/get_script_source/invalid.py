import pytest
from tests.bidi import get_invalid_cases
from webdriver.bidi import error

pytestmark = pytest.mark.asyncio


@pytest.mark.parametrize("value", get_invalid_cases("string"))
async def test_params_context_invalid_type(bidi_session, value):
    with pytest.raises(error.InvalidArgumentException):
        await bidi_session.moz.debugging.get_script_source(
            context=value, script_url="https://example.com/script.js"
        )


@pytest.mark.parametrize("value", ["", "unknown-context"])
async def test_params_context_invalid_value(bidi_session, value):
    with pytest.raises(error.NoSuchFrameException):
        await bidi_session.moz.debugging.get_script_source(
            context=value, script_url="https://example.com/script.js"
        )


@pytest.mark.parametrize("value", get_invalid_cases("string"))
async def test_params_script_url_invalid_type(bidi_session, new_tab, value):
    with pytest.raises(error.InvalidArgumentException):
        await bidi_session.moz.debugging.get_script_source(
            context=new_tab["context"], script_url=value
        )


async def test_params_script_url_non_existent_script(
    bidi_session, new_tab, enable_debugging, inline
):
    await enable_debugging(contexts=[new_tab["context"]])

    url = inline("<div>No scripts here</div>")
    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=url, wait="complete"
    )

    with pytest.raises(error.InvalidArgumentException):
        await bidi_session.moz.debugging.get_script_source(
            context=new_tab["context"],
            script_url="https://example.com/nonexistent.js",
        )


async def test_get_script_source_disabled(bidi_session, new_tab, inline):
    url = inline("<script>function foo() { return 42; }</script>")
    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=url, wait="complete"
    )

    with pytest.raises(error.UnsupportedOperationException):
        await bidi_session.moz.debugging.get_script_source(
            context=new_tab["context"], script_url=url
        )

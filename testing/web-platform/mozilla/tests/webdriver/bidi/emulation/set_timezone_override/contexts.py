import pytest

pytestmark = pytest.mark.asyncio

pytest_plugins = "tests.bidi.emulation.conftest"


@pytest.mark.capabilities({
    "moz:firefoxOptions": {
        "prefs": {
            "dom.ipc.processCount": 1,
        },
    },
})
async def test_timezone_override_isolated_in_browsing_context(
    bidi_session, get_current_timezone, some_timezone, another_timezone
):
    context_in_process_1 = await bidi_session.browsing_context.create(type_hint="tab")

    await bidi_session.emulation.set_timezone_override(
        contexts=[context_in_process_1["context"]], timezone=some_timezone
    )

    # Create one more context which should share the process
    # with the previously created context.
    context_in_process_2 = await bidi_session.browsing_context.create(type_hint="tab")
    await bidi_session.emulation.set_timezone_override(
        contexts=[context_in_process_2["context"]], timezone=another_timezone
    )

    # Make sure that the timezone override didn't override inappropriate context.
    assert await get_current_timezone(context_in_process_1) == some_timezone
    assert await get_current_timezone(context_in_process_2) == another_timezone

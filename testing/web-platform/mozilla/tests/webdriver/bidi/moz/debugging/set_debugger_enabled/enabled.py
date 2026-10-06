import asyncio

import pytest
from webdriver.bidi.modules.script import ContextTarget

pytestmark = pytest.mark.asyncio

from .. import PAUSED_EVENT, RESUMED_EVENT

INLINE_SCRIPT = """<script>
function test() {
    const z = 42;
    return z;
}
</script>"""


async def test_enable(
    bidi_session,
    new_tab,
    inline,
    subscribe_events,
    assert_pause_and_resume,
    set_breakpoint,
):
    await subscribe_events([PAUSED_EVENT, RESUMED_EVENT])
    await bidi_session.moz.debugging.set_debugger_enabled(enabled=True)

    url = inline(INLINE_SCRIPT)

    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=url, wait="complete"
    )

    await set_breakpoint(location={"url": url, "line": 6})

    result = await assert_pause_and_resume(new_tab, expression="test()", line=6)
    assert result["type"] == "number"
    assert result["value"] == 42

    await bidi_session.moz.debugging.set_debugger_enabled(enabled=None)


async def test_enable_then_disable(
    bidi_session,
    new_tab,
    inline,
    subscribe_events,
    assert_pause_and_resume,
    set_breakpoint,
):
    await subscribe_events([PAUSED_EVENT, RESUMED_EVENT])

    events = []

    async def on_event(method, data):
        events.append(data)

    remove_paused_listener = bidi_session.add_event_listener(PAUSED_EVENT, on_event)
    remove_resumed_listener = bidi_session.add_event_listener(RESUMED_EVENT, on_event)

    await bidi_session.moz.debugging.set_debugger_enabled(enabled=True)

    url = inline(INLINE_SCRIPT)

    await set_breakpoint(location={"url": url, "line": 6})
    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=url, wait="complete"
    )

    # Disable debugging before invoking the test() method
    await bidi_session.moz.debugging.set_debugger_enabled(enabled=None)

    # evaluate command should not be blocked
    result = await bidi_session.script.evaluate(
        expression="test()",
        target=ContextTarget(new_tab["context"]),
        await_promise=False,
    )

    assert result["type"] == "number"
    assert result["value"] == 42

    # No debugging event should have been received.
    assert len(events) == 0

    remove_paused_listener()
    remove_resumed_listener()


async def test_disable_resumes_debugger(
    bidi_session,
    new_tab,
    inline,
    subscribe_events,
    wait_for_event,
    set_breakpoint,
):
    await subscribe_events([PAUSED_EVENT, RESUMED_EVENT])
    await bidi_session.moz.debugging.set_debugger_enabled(enabled=True)

    url = inline(INLINE_SCRIPT)

    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=url, wait="complete"
    )

    await set_breakpoint(location={"url": url, "line": 6})

    on_paused = wait_for_event(PAUSED_EVENT)
    eval_task = asyncio.create_task(
        bidi_session.script.evaluate(
            expression="test()",
            target=ContextTarget(new_tab["context"]),
            await_promise=False,
        )
    )
    await on_paused

    # Breakpoint should be automatically resumed when debugging is disabled.
    on_resumed = wait_for_event(RESUMED_EVENT)
    await bidi_session.moz.debugging.set_debugger_enabled(enabled=None)
    await on_resumed

    result = await eval_task
    assert result["type"] == "number"
    assert result["value"] == 42


async def test_several_contexts_and_user_contexts(
    bidi_session,
    create_user_context,
    inline,
    subscribe_events,
    assert_pause_and_resume,
    set_breakpoint,
):
    await subscribe_events([PAUSED_EVENT, RESUMED_EVENT])

    await bidi_session.moz.debugging.set_debugger_enabled(enabled=True)

    user_context_1 = await create_user_context()
    user_context_2 = await create_user_context()

    context_1 = await bidi_session.browsing_context.create(
        user_context=user_context_1, type_hint="tab"
    )
    context_2 = await bidi_session.browsing_context.create(
        user_context=user_context_2, type_hint="tab"
    )

    url = inline(INLINE_SCRIPT)

    await bidi_session.browsing_context.navigate(
        context=context_1["context"], url=url, wait="complete"
    )
    await bidi_session.browsing_context.navigate(
        context=context_2["context"], url=url, wait="complete"
    )

    await set_breakpoint(location={"url": url, "line": 6})

    result = await assert_pause_and_resume(context_1, expression="test()", line=6)
    assert result["type"] == "number"
    assert result["value"] == 42

    result = await assert_pause_and_resume(context_2, expression="test()", line=6)
    assert result["type"] == "number"
    assert result["value"] == 42

    await bidi_session.moz.debugging.set_debugger_enabled(enabled=None)

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


async def test_single_context_no_breakpoint(bidi_session, new_tab, inline):
    url = inline(INLINE_SCRIPT)
    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=url, wait="complete"
    )

    await bidi_session.moz.debugging.set_debugger_enabled(
        contexts=[new_tab["context"]], enabled=True
    )

    result = await bidi_session.script.evaluate(
        expression="test()",
        target=ContextTarget(new_tab["context"]),
        await_promise=False,
    )
    assert result["type"] == "number"
    assert result["value"] == 42

    await bidi_session.moz.debugging.set_debugger_enabled(
        contexts=[new_tab["context"]], enabled=None
    )


async def test_single_context_with_breakpoint(
    bidi_session,
    new_tab,
    inline,
    subscribe_events,
    assert_pause_and_resume,
    set_breakpoint,
):
    await subscribe_events([PAUSED_EVENT, RESUMED_EVENT])

    await bidi_session.moz.debugging.set_debugger_enabled(
        contexts=[new_tab["context"]], enabled=True
    )

    url = inline(INLINE_SCRIPT)

    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=url, wait="complete"
    )

    await set_breakpoint(location={"url": url, "line": 6})

    result = await assert_pause_and_resume(new_tab, expression="test()", line=6)
    assert result["type"] == "number"
    assert result["value"] == 42

    await bidi_session.moz.debugging.set_debugger_enabled(
        contexts=[new_tab["context"]], enabled=None
    )

    result = await bidi_session.script.evaluate(
        expression="test()",
        target=ContextTarget(new_tab["context"]),
        await_promise=False,
    )

    assert result["type"] == "number"
    assert result["value"] == 42


async def test_single_context_enabled(
    bidi_session,
    inline,
    subscribe_events,
    assert_pause_and_resume,
    set_breakpoint,
):
    await subscribe_events([PAUSED_EVENT, RESUMED_EVENT])

    context_1 = await bidi_session.browsing_context.create(type_hint="tab")
    context_2 = await bidi_session.browsing_context.create(type_hint="tab")

    await bidi_session.moz.debugging.set_debugger_enabled(
        enabled=True, contexts=[context_1["context"]]
    )

    url = inline(INLINE_SCRIPT)

    await bidi_session.browsing_context.navigate(
        context=context_1["context"], url=url, wait="complete"
    )
    await bidi_session.browsing_context.navigate(
        context=context_2["context"], url=url, wait="complete"
    )

    await set_breakpoint(location={"url": url, "line": 6})

    # In context_1, debugger is enabled, the breakpoint should hit.
    result = await assert_pause_and_resume(context_1, expression="test()", line=6)
    assert result["type"] == "number"
    assert result["value"] == 42

    # In context_2, debugger is not enabled, the breakpoint should not hit.
    result = await bidi_session.script.evaluate(
        expression="test()",
        target=ContextTarget(context_2["context"]),
        await_promise=False,
    )

    assert result["type"] == "number"
    assert result["value"] == 42

    await bidi_session.moz.debugging.set_debugger_enabled(
        enabled=None, contexts=[context_1["context"]]
    )


async def test_several_contexts(
    bidi_session,
    inline,
    subscribe_events,
    assert_pause_and_resume,
    set_breakpoint,
):
    await subscribe_events([PAUSED_EVENT, RESUMED_EVENT])

    context_1 = await bidi_session.browsing_context.create(type_hint="tab")
    context_2 = await bidi_session.browsing_context.create(type_hint="tab")

    await bidi_session.moz.debugging.set_debugger_enabled(
        enabled=True, contexts=[context_1["context"], context_2["context"]]
    )

    url = inline(INLINE_SCRIPT)

    await bidi_session.browsing_context.navigate(
        context=context_1["context"], url=url, wait="complete"
    )
    await bidi_session.browsing_context.navigate(
        context=context_2["context"], url=url, wait="complete"
    )

    await set_breakpoint(location={"url": url, "line": 6})

    # In context_1 and context_2, debugger is enabled, the breakpoint should hit.
    result = await assert_pause_and_resume(context_1, expression="test()", line=6)
    assert result["type"] == "number"
    assert result["value"] == 42

    result = await assert_pause_and_resume(context_2, expression="test()", line=6)
    assert result["type"] == "number"
    assert result["value"] == 42

    await bidi_session.moz.debugging.set_debugger_enabled(
        enabled=None, contexts=[context_1["context"], context_2["context"]]
    )

    result = await bidi_session.script.evaluate(
        expression="test()",
        target=ContextTarget(context_1["context"]),
        await_promise=False,
    )

    assert result["type"] == "number"
    assert result["value"] == 42

    result = await bidi_session.script.evaluate(
        expression="test()",
        target=ContextTarget(context_2["context"]),
        await_promise=False,
    )

    assert result["type"] == "number"
    assert result["value"] == 42

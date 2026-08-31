import pytest
from webdriver.bidi.modules.script import ContextTarget

from .. import PAUSED_EVENT, RESUMED_EVENT

pytestmark = pytest.mark.asyncio

INLINE_SCRIPT = """<script>
function test() {
    const z = 42;
    return z;
}
</script>"""


async def test_single_user_context_no_breakpoint(
    bidi_session, inline, create_user_context
):
    user_context = await create_user_context()
    context = await bidi_session.browsing_context.create(
        user_context=user_context, type_hint="tab"
    )
    url = inline(INLINE_SCRIPT)
    await bidi_session.browsing_context.navigate(
        context=context["context"], url=url, wait="complete"
    )

    await bidi_session.moz.debugging.set_debugger_enabled(
        user_contexts=[user_context], enabled=True
    )

    result = await bidi_session.script.evaluate(
        expression="test()",
        target=ContextTarget(context["context"]),
        await_promise=False,
    )
    assert result["type"] == "number"
    assert result["value"] == 42
    await bidi_session.moz.debugging.set_debugger_enabled(
        user_contexts=[user_context], enabled=None
    )


async def test_single_user_context_with_breakpoint(
    bidi_session,
    create_user_context,
    inline,
    subscribe_events,
    assert_pause_and_resume,
    set_breakpoint,
):
    await subscribe_events([PAUSED_EVENT, RESUMED_EVENT])

    user_context = await create_user_context()

    await bidi_session.moz.debugging.set_debugger_enabled(
        user_contexts=[user_context], enabled=True
    )

    context = await bidi_session.browsing_context.create(
        user_context=user_context, type_hint="tab"
    )

    url = inline(INLINE_SCRIPT)

    await bidi_session.browsing_context.navigate(
        context=context["context"], url=url, wait="complete"
    )

    await set_breakpoint(location={"url": url, "line": 6})

    result = await assert_pause_and_resume(context, expression="test()", line=6)
    assert result["type"] == "number"
    assert result["value"] == 42

    await bidi_session.moz.debugging.set_debugger_enabled(
        user_contexts=[user_context], enabled=None
    )

    result = await bidi_session.script.evaluate(
        expression="test()",
        target=ContextTarget(context["context"]),
        await_promise=False,
    )
    assert result["type"] == "number"
    assert result["value"] == 42


async def test_single_user_context_enabled(
    bidi_session,
    create_user_context,
    inline,
    subscribe_events,
    assert_pause_and_resume,
    set_breakpoint,
):
    await subscribe_events([PAUSED_EVENT, RESUMED_EVENT])

    debugged_user_context = await create_user_context()
    other_user_context = await create_user_context()

    await bidi_session.moz.debugging.set_debugger_enabled(
        user_contexts=[debugged_user_context], enabled=True
    )

    debugged_context = await bidi_session.browsing_context.create(
        user_context=debugged_user_context, type_hint="tab"
    )
    other_context = await bidi_session.browsing_context.create(
        user_context=other_user_context, type_hint="tab"
    )

    url = inline(INLINE_SCRIPT)

    await bidi_session.browsing_context.navigate(
        context=debugged_context["context"], url=url, wait="complete"
    )
    await bidi_session.browsing_context.navigate(
        context=other_context["context"], url=url, wait="complete"
    )

    await set_breakpoint(location={"url": url, "line": 6})

    # In debugged_context, should pause
    result = await assert_pause_and_resume(
        debugged_context, expression="test()", line=6
    )
    assert result["type"] == "number"
    assert result["value"] == 42

    # In other_context, should execute immediately
    result = await bidi_session.script.evaluate(
        expression="test()",
        target=ContextTarget(other_context["context"]),
        await_promise=False,
    )
    assert result["type"] == "number"
    assert result["value"] == 42

    await bidi_session.moz.debugging.set_debugger_enabled(
        user_contexts=[debugged_user_context], enabled=None
    )


async def test_multiple_user_contexts(
    bidi_session,
    create_user_context,
    inline,
    subscribe_events,
    assert_pause_and_resume,
    set_breakpoint,
):
    await subscribe_events([PAUSED_EVENT, RESUMED_EVENT])

    user_context_1 = await create_user_context()
    user_context_2 = await create_user_context()

    await bidi_session.moz.debugging.set_debugger_enabled(
        user_contexts=[user_context_1, user_context_2], enabled=True
    )

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

    await bidi_session.moz.debugging.set_debugger_enabled(
        user_contexts=[user_context_1, user_context_2], enabled=None
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

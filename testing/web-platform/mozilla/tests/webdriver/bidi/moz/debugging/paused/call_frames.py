import asyncio

import pytest
from webdriver.bidi.modules.script import ContextTarget

pytestmark = pytest.mark.asyncio

from .. import PAUSED_EVENT, RESUMED_EVENT


async def test_paused_event_includes_call_frames(
    bidi_session,
    new_tab,
    enable_debugging,
    inline,
    subscribe_events,
    wait_for_event,
    set_breakpoint,
):
    await subscribe_events([PAUSED_EVENT, RESUMED_EVENT])
    await enable_debugging(contexts=[new_tab["context"]])

    url = inline(
        """<script>
function calculate() {
    const a = 10;
    let b = 20;
    const sum = a + b;
    return sum;
}
</script>"""
    )

    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=url, wait="complete"
    )

    await set_breakpoint(location={"url": url, "line": 7})

    on_paused = wait_for_event(PAUSED_EVENT)

    eval_task = asyncio.create_task(
        bidi_session.script.evaluate(
            expression="calculate()",
            target=ContextTarget(new_tab["context"]),
            await_promise=False,
        )
    )

    paused_event = await on_paused

    assert paused_event["context"] == new_tab["context"]
    assert paused_event["line"] == 7

    assert "callFrames" in paused_event
    assert isinstance(paused_event["callFrames"], list)
    assert len(paused_event["callFrames"]) > 0

    top_frame = paused_event["callFrames"][0]
    assert "callFrameId" in top_frame
    assert "functionName" in top_frame
    assert top_frame["functionName"] == "calculate"

    assert "location" in top_frame
    assert top_frame["location"]["url"] == url
    assert top_frame["location"]["line"] == 7

    assert "scopeChain" in top_frame
    assert isinstance(top_frame["scopeChain"], list)
    assert len(top_frame["scopeChain"]) > 0

    lexical_scope = None
    for scope in top_frame["scopeChain"]:
        if scope["type"] == "function lexical":
            lexical_scope = scope
            break

    assert lexical_scope is not None, "Should have a function lexical scope"
    assert "variables" in lexical_scope
    assert isinstance(lexical_scope["variables"], dict)

    assert "a" in lexical_scope["variables"]
    assert "b" in lexical_scope["variables"]

    a_value = lexical_scope["variables"]["a"]
    assert a_value["type"] == "number"
    assert a_value["value"] == 10

    b_value = lexical_scope["variables"]["b"]
    assert b_value["type"] == "number"
    assert b_value["value"] == 20

    assert "sum" in lexical_scope["variables"]
    sum_value = lexical_scope["variables"]["sum"]
    assert sum_value["type"] == "uninitialized"

    await bidi_session.moz.debugging.resume(context=new_tab["context"])

    result = await eval_task
    assert result["type"] == "number"
    assert result["value"] == 30


async def test_call_frames_nested_functions(
    bidi_session,
    new_tab,
    enable_debugging,
    inline,
    subscribe_events,
    wait_for_event,
    set_breakpoint,
):
    await subscribe_events([PAUSED_EVENT, RESUMED_EVENT])
    await enable_debugging(contexts=[new_tab["context"]])

    url = inline(
        """<script>
function outer(x) {
    const outerVar = x * 2;
    return inner(outerVar);
}

function inner(y) {
    const innerVar = y + 10;
    return innerVar;
}
</script>"""
    )

    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=url, wait="complete"
    )

    await set_breakpoint(location={"url": url, "line": 11})

    on_paused = wait_for_event(PAUSED_EVENT)

    eval_task = asyncio.create_task(
        bidi_session.script.evaluate(
            expression="outer(5)",
            target=ContextTarget(new_tab["context"]),
            await_promise=False,
        )
    )

    paused_event = await on_paused

    assert "callFrames" in paused_event
    call_frames = paused_event["callFrames"]
    assert len(call_frames) >= 2, "Should have at least inner and outer frames"

    inner_frame = call_frames[0]
    assert inner_frame["functionName"] == "inner"

    outer_frame = call_frames[1]
    assert outer_frame["functionName"] == "outer"

    inner_lexical_scope = None
    inner_function_scope = None
    for scope in inner_frame["scopeChain"]:
        if scope["type"] == "function lexical":
            inner_lexical_scope = scope
        elif scope["type"] == "function":
            inner_function_scope = scope

    assert inner_lexical_scope is not None
    assert "innerVar" in inner_lexical_scope["variables"]
    assert inner_lexical_scope["variables"]["innerVar"]["value"] == 20

    assert inner_function_scope is not None
    assert "y" in inner_function_scope["variables"]
    assert inner_function_scope["variables"]["y"]["value"] == 10

    outer_lexical_scope = None
    outer_function_scope = None
    for scope in outer_frame["scopeChain"]:
        if scope["type"] == "function lexical":
            outer_lexical_scope = scope
        elif scope["type"] == "function":
            outer_function_scope = scope

    assert outer_lexical_scope is not None
    assert "outerVar" in outer_lexical_scope["variables"]
    assert outer_lexical_scope["variables"]["outerVar"]["value"] == 10

    assert outer_function_scope is not None
    assert "x" in outer_function_scope["variables"]
    assert outer_function_scope["variables"]["x"]["value"] == 5

    await bidi_session.moz.debugging.resume(context=new_tab["context"])

    result = await eval_task
    assert result["type"] == "number"
    assert result["value"] == 20

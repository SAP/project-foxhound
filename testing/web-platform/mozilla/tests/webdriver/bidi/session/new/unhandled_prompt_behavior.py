# META: timeout=long

import asyncio

import pytest
from webdriver.bidi.modules.input import Actions
from webdriver.bidi.modules.script import ContextTarget

pytestmark = pytest.mark.asyncio


USER_PROMPT_CLOSED_EVENT = "browsingContext.userPromptClosed"
USER_PROMPT_OPENED_EVENT = "browsingContext.userPromptOpened"


# Test WebDriver BiDi only session to make sure that prompts are also handled in this case,
# since in case of mixed session (WebDriver Classic + BiDi) it can be handled by Marionette.
# These tests can be moved to cross-browser wdspec test when the BiDi-only sessions are supported
# (see https://bugzilla.mozilla.org/show_bug.cgi?id=1836785).


@pytest.mark.parametrize("prompt_type", ["alert", "confirm", "prompt"])
@pytest.mark.parametrize("prompt_behavior", ["accept", "dismiss", "ignore"])
async def test_unhandled_prompt_behavior(
    match_capabilities,
    new_session,
    event_loop,
    wait_for_future_safe,
    prompt_type,
    prompt_behavior,
):
    unhandled_prompt_behavior = {}
    unhandled_prompt_behavior[prompt_type] = prompt_behavior
    capabilities = match_capabilities(
        "alwaysMatch", "unhandledPromptBehavior", unhandled_prompt_behavior
    )

    bidi_session = await new_session(capabilities=capabilities)

    contexts = await bidi_session.browsing_context.get_tree(max_depth=0)
    top_context = contexts[0]

    await bidi_session.session.subscribe(
        events=[
            USER_PROMPT_CLOSED_EVENT,
            USER_PROMPT_OPENED_EVENT,
        ]
    )

    future_for_opened_event = event_loop.create_future()
    future_for_closed_event = event_loop.create_future()

    async def on_opened_event(_, data):
        future_for_opened_event.set_result(data)

    async def on_closed_event(_, data):
        future_for_closed_event.set_result(data)

    remove_listener_for_opened_event = bidi_session.add_event_listener(
        USER_PROMPT_OPENED_EVENT, on_opened_event
    )
    remove_listener_for_closed_event = bidi_session.add_event_listener(
        USER_PROMPT_CLOSED_EVENT, on_closed_event
    )

    asyncio.create_task(
        bidi_session.script.evaluate(
            expression=f"window.{prompt_type}('test')",
            target=ContextTarget(top_context["context"]),
            await_promise=False,
        )
    )

    # Wait for prompt to appear.
    open_event = await wait_for_future_safe(future_for_opened_event)
    test_event = {
        "context": top_context["context"],
        "handler": prompt_behavior,
        "message": "test",
        "type": prompt_type,
    }

    if prompt_type == "prompt":
        test_event["defaultValue"] = ""

    assert open_event == test_event

    if prompt_behavior == "ignore":
        await bidi_session.browsing_context.handle_user_prompt(
            context=top_context["context"], accept=True
        )

    # Wait for prompt to be closed.
    close_event = await wait_for_future_safe(future_for_closed_event)

    assert close_event == {
        "accepted": prompt_type == "alert" or prompt_behavior in {"accept", "ignore"},
        "context": top_context["context"],
        "type": prompt_type,
    }

    await bidi_session.session.unsubscribe(
        events=[USER_PROMPT_CLOSED_EVENT, USER_PROMPT_OPENED_EVENT]
    )

    remove_listener_for_opened_event()
    remove_listener_for_closed_event()


@pytest.mark.parametrize("prompt_behavior", ["ignore", "accept", "dismiss"])
async def test_unhandled_prompt_behavior_for_beforeunload(
    match_capabilities,
    new_session,
    event_loop,
    wait_for_future_safe,
    url,
    inline,
    prompt_behavior,
):
    capabilities = match_capabilities(
        "alwaysMatch", "unhandledPromptBehavior", {"beforeUnload": prompt_behavior}
    )
    bidi_session = await new_session(capabilities=capabilities)

    contexts = await bidi_session.browsing_context.get_tree(max_depth=0)
    top_context = contexts[0]

    await bidi_session.session.subscribe(
        events=[
            USER_PROMPT_CLOSED_EVENT,
            USER_PROMPT_OPENED_EVENT,
        ]
    )

    future_for_opened_event = event_loop.create_future()
    future_for_closed_event = event_loop.create_future()

    async def on_opened_event(_, data):
        future_for_opened_event.set_result(data)

    async def on_closed_event(_, data):
        future_for_closed_event.set_result(data)

    remove_listener_for_opened_event = bidi_session.add_event_listener(
        USER_PROMPT_OPENED_EVENT, on_opened_event
    )
    remove_listener_for_closed_event = bidi_session.add_event_listener(
        USER_PROMPT_CLOSED_EVENT, on_closed_event
    )

    page_url = url("/webdriver/tests/support/html/beforeunload.html")
    await bidi_session.browsing_context.navigate(
        context=top_context["context"], url=page_url, wait="complete"
    )

    # Focus the input
    await bidi_session.script.evaluate(
        expression="""
            const input = document.querySelector("input");
            input.focus();
        """,
        target=ContextTarget(top_context["context"]),
        await_promise=False,
    )

    actions = Actions()
    actions.add_key().send_keys("foo")
    await bidi_session.input.perform_actions(
        actions=actions, context=top_context["context"]
    )

    url_after = inline("<div>foo</div>")

    task = asyncio.create_task(
        bidi_session.browsing_context.navigate(
            context=top_context["context"], url=url_after, wait="complete"
        )
    )

    # Wait for prompt to appear.
    open_event = await wait_for_future_safe(future_for_opened_event)

    assert open_event == {
        "context": top_context["context"],
        "handler": prompt_behavior,
        "message": "This page is asking you to confirm that you want to leave — information you’ve entered may not be saved.",
        "type": "beforeunload",
    }

    if prompt_behavior == "ignore":
        await bidi_session.browsing_context.handle_user_prompt(
            context=top_context["context"], accept=True
        )

    # Wait for prompt to be closed.
    close_event = await wait_for_future_safe(future_for_closed_event)

    assert close_event == {
        "accepted": prompt_behavior != "dismiss",
        "context": top_context["context"],
        "type": "beforeunload",
    }

    if prompt_behavior != "dismiss":
        await task

    await bidi_session.session.unsubscribe(
        events=[USER_PROMPT_CLOSED_EVENT, USER_PROMPT_OPENED_EVENT]
    )

    remove_listener_for_opened_event()
    remove_listener_for_closed_event()

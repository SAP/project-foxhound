import asyncio

import pytest_asyncio
from webdriver.bidi.modules.script import ContextTarget
from webdriver.bidi.undefined import UNDEFINED

from bidi.support.moz import Moz

from . import PAUSED_EVENT, RESUMED_EVENT


@pytest_asyncio.fixture(autouse=True)
async def setup_moz_bidi(bidi_session):
    bidi_session.moz = Moz(bidi_session)
    yield


@pytest_asyncio.fixture
async def assert_pause_and_resume(bidi_session, wait_for_event):
    async def _assert_pause_and_resume(context, expression, line):
        on_paused = wait_for_event(PAUSED_EVENT)

        eval_task = asyncio.create_task(
            bidi_session.script.evaluate(
                expression=expression,
                target=ContextTarget(context["context"]),
                await_promise=False,
            )
        )

        paused_event = await on_paused
        assert paused_event["context"] == context["context"]
        assert paused_event["line"] == line

        on_resumed = wait_for_event(RESUMED_EVENT)
        await bidi_session.moz.debugging.resume(context=context["context"])

        resumed_event = await on_resumed
        assert resumed_event["context"] == context["context"]

        result = await eval_task
        return result

    return _assert_pause_and_resume


@pytest_asyncio.fixture
async def enable_debugging(bidi_session):
    debugging_contexts = []
    debugging_user_contexts = []
    debugging_global = False

    async def _enable_debugging(contexts=UNDEFINED, user_contexts=UNDEFINED):
        nonlocal debugging_contexts, debugging_user_contexts, debugging_global
        await bidi_session.moz.debugging.set_debugger_enabled(
            contexts=contexts, user_contexts=user_contexts, enabled=True
        )
        if contexts is not UNDEFINED:
            debugging_contexts.extend(contexts)
        elif user_contexts is not UNDEFINED:
            debugging_user_contexts.extend(user_contexts)
        else:
            debugging_global = True

    yield _enable_debugging

    for context_id in debugging_contexts:
        try:
            await bidi_session.moz.debugging.set_debugger_enabled(
                contexts=[context_id], enabled=None
            )
        except Exception:
            print(f"Failed to disable debugging for context {context_id}")

    for user_context_id in debugging_user_contexts:
        try:
            await bidi_session.moz.debugging.set_debugger_enabled(
                user_contexts=[user_context_id], enabled=None
            )
        except Exception:
            print(f"Failed to disable debugging for user context {user_context_id}")

    if debugging_global:
        try:
            await bidi_session.moz.debugging.set_debugger_enabled(enabled=None)
        except Exception:
            print("Failed to disable debugging globally")


@pytest_asyncio.fixture
async def set_breakpoint(bidi_session):
    breakpoints = []

    async def _set_breakpoint(location):
        result = await bidi_session.moz.debugging.set_breakpoint(location=location)
        breakpoint_id = result["breakpoint"]
        breakpoints.append(breakpoint_id)
        return breakpoint_id

    yield _set_breakpoint

    for breakpoint_id in breakpoints:
        try:
            await bidi_session.moz.debugging.remove_breakpoint(breakpoint=breakpoint_id)
        except Exception:
            print(f"Failed to remove breakpoint {breakpoint_id}")

import pytest
from tests.bidi import get_invalid_cases
from webdriver.bidi import error

pytestmark = pytest.mark.asyncio


@pytest.mark.parametrize("value", get_invalid_cases("boolean", nullable=True))
async def test_params_enabled_invalid_type(bidi_session, value):
    with pytest.raises(error.InvalidArgumentException):
        await bidi_session.moz.debugging.set_debugger_enabled(enabled=value)


@pytest.mark.parametrize("value", get_invalid_cases("list"))
async def test_params_contexts_invalid_type(bidi_session, value):
    with pytest.raises(error.InvalidArgumentException):
        await bidi_session.moz.debugging.set_debugger_enabled(
            enabled=True, contexts=value
        )


async def test_params_contexts_empty_list(bidi_session):
    with pytest.raises(error.InvalidArgumentException):
        await bidi_session.moz.debugging.set_debugger_enabled(enabled=True, contexts=[])


@pytest.mark.parametrize("value", get_invalid_cases("string"))
async def test_params_contexts_entry_invalid_type(bidi_session, value):
    with pytest.raises(error.InvalidArgumentException):
        await bidi_session.moz.debugging.set_debugger_enabled(
            enabled=True, contexts=[value]
        )


async def test_params_contexts_entry_invalid_value(bidi_session):
    with pytest.raises(error.NoSuchFrameException):
        await bidi_session.moz.debugging.set_debugger_enabled(
            enabled=True, contexts=["_invalid_"]
        )


@pytest.mark.parametrize("value", get_invalid_cases("list"))
async def test_params_user_contexts_invalid_type(bidi_session, value):
    with pytest.raises(error.InvalidArgumentException):
        await bidi_session.moz.debugging.set_debugger_enabled(
            enabled=True, user_contexts=value
        )


async def test_params_user_contexts_empty_list(bidi_session):
    with pytest.raises(error.InvalidArgumentException):
        await bidi_session.moz.debugging.set_debugger_enabled(
            enabled=True, user_contexts=[]
        )


@pytest.mark.parametrize("value", get_invalid_cases("string"))
async def test_params_user_contexts_entry_invalid_type(bidi_session, value):
    with pytest.raises(error.InvalidArgumentException):
        await bidi_session.moz.debugging.set_debugger_enabled(
            enabled=True, user_contexts=[value]
        )


@pytest.mark.parametrize("value", ["", "_invalid_"])
async def test_params_user_contexts_entry_invalid_value(bidi_session, value):
    with pytest.raises(error.NoSuchUserContextException):
        await bidi_session.moz.debugging.set_debugger_enabled(
            enabled=True, user_contexts=[value]
        )


async def test_params_contexts_and_user_contexts(bidi_session, new_tab):
    with pytest.raises(error.InvalidArgumentException):
        await bidi_session.moz.debugging.set_debugger_enabled(
            enabled=True,
            contexts=[new_tab["context"]],
            user_contexts=["default"],
        )

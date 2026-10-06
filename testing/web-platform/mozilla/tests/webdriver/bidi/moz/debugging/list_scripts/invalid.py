import pytest
from tests.bidi import get_invalid_cases
from webdriver.bidi import error

pytestmark = pytest.mark.asyncio


@pytest.mark.parametrize("value", get_invalid_cases("string"))
async def test_params_context_invalid_type(bidi_session, value):
    with pytest.raises(error.InvalidArgumentException):
        await bidi_session.moz.debugging.list_scripts(context=value)


@pytest.mark.parametrize("value", ["", "unknown-context"])
async def test_params_context_invalid_value(bidi_session, value):
    with pytest.raises(error.NoSuchFrameException):
        await bidi_session.moz.debugging.list_scripts(context=value)


async def test_list_scripts_disabled(bidi_session, new_tab):
    with pytest.raises(error.UnsupportedOperationException):
        await bidi_session.moz.debugging.list_scripts(context=new_tab["context"])

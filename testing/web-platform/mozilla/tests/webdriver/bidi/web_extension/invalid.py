import pytest
from tests.bidi import get_invalid_cases
from webdriver.bidi import error

pytestmark = pytest.mark.asyncio


@pytest.mark.parametrize("value", get_invalid_cases("boolean"))
async def test_params_moz_allow_private_browsing_invalid_type(
    bidi_session, extension_data, value
):
    with pytest.raises(error.InvalidArgumentException):
        await bidi_session.web_extension.install(
            extension_data={
                "type": "base64",
                "value": extension_data["base64"],
            },
            _extension_params={"moz:allowPrivateBrowsing": value},
        )


@pytest.mark.parametrize("value", get_invalid_cases("boolean"))
async def test_params_moz_permanent_invalid_type(bidi_session, extension_data, value):
    with pytest.raises(error.InvalidArgumentException):
        await bidi_session.web_extension.install(
            extension_data={
                "type": "base64",
                "value": extension_data["base64"],
            },
            _extension_params={"moz:permanent": value},
        )

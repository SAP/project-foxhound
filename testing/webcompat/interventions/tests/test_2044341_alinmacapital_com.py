import pytest
from webdriver.bidi.error import UnknownErrorException

URL = "https://digital.alinmacapital.com/alinmaTadawul/public/login.jsf"
SUPPORTED_CSS = "[id='loginForm:userPasswordInput']"
UNSUPPORTED_TEXT = "PR_CONNECT_RESET_ERROR"


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await client.navigate(URL, wait="none")
    assert client.await_css(SUPPORTED_CSS, is_displayed=True)
    assert not client.find_text(UNSUPPORTED_TEXT, is_displayed=True)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    try:
        await client.navigate(URL, wait="none")
        assert False
    except UnknownErrorException as e:
        assert "NS_ERROR_NET_RESET" in e.message

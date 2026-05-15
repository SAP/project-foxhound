import pytest

URL = "https://chat.babel.com"

SUPPORTED_CSS = ".form.login-choice, .button.register"
UNSUPPORTED_CSS = ".download.chrome"


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_regression(client):
    await client.navigate(URL)
    assert client.await_css(SUPPORTED_CSS)
    assert not client.find_css(UNSUPPORTED_CSS, is_displayed=True)

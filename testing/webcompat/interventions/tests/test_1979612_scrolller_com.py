import pytest

URL = "https://scrolller.com/"

SUPPORTED_CSS = "#main-header"
UNSUPPORTED_CSS = "html#__next_error__"


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_regression(client):
    await client.navigate(URL, wait="none")
    assert client.await_css(SUPPORTED_CSS, is_displayed=True)
    assert not client.find_css(UNSUPPORTED_CSS, is_displayed=True)

import pytest

URL = "https://app.homewyse.com/accounts/register/"
SUPPORTED_CSS = "#newacct-form"
UNSUPPORTED_TEXT = "Firefox is not supported"


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await client.navigate(URL)
    assert client.await_css(SUPPORTED_CSS)
    assert not client.find_text(UNSUPPORTED_TEXT)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await client.navigate(URL)
    assert client.await_text(UNSUPPORTED_TEXT)
    assert not client.find_css(SUPPORTED_CSS)

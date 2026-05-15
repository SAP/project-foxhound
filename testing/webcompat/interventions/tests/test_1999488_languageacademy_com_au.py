import pytest

URL = "https://www.languageacademy.com.au/"

UNSUPPORTED_TEXT = "BROWSER NOT SUPPORTED"
APP_RECOMMENDATION_CSS = "#staticBackdrop"


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await client.navigate(URL)
    client.hide_elements(APP_RECOMMENDATION_CSS)
    assert not client.find_text(UNSUPPORTED_TEXT, is_displayed=True)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await client.navigate(URL)
    client.hide_elements(APP_RECOMMENDATION_CSS)
    assert client.await_text(UNSUPPORTED_TEXT, is_displayed=True)

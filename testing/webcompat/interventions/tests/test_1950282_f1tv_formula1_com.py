import pytest

URL = "https://f1tv.formula1.com/"

SUPPORTED_TEXT = "Watch now"
UNSUPPORTED_TEXT = "browser is not supported"
USE_APP_TEXT = "Use F1 TV App"


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await client.navigate(URL, wait="none")
    assert client.await_text(SUPPORTED_TEXT, is_displayed=True)
    assert not client.find_text(UNSUPPORTED_TEXT, is_displayed=True)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await client.navigate(URL, wait="none")
    use_app, unsupported = client.await_first_element_of(
        [
            client.text(USE_APP_TEXT),
            client.text(UNSUPPORTED_TEXT),
        ],
        is_displayed=True,
    )
    assert use_app or unsupported
    assert not client.find_text(SUPPORTED_TEXT, is_displayed=True)

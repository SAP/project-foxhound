import pytest

URL = "https://lg.jio.com/"
CONTINUE_BUTTON_CSS = "#contBtn"
SUBMIT_BUTTON_CSS = "#submitBtn"
UNSUPPORTED_ALERT = "Please open website on Chrome, Firefox or Safari."


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await client.navigate(URL, wait="none")
    client.await_css(CONTINUE_BUTTON_CSS, is_displayed=True, timeout=30).click()
    assert client.await_css(SUBMIT_BUTTON_CSS, is_displayed=True)
    assert not await client.find_alert(delay=3)


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await client.navigate(URL, wait="none")
    client.await_css(CONTINUE_BUTTON_CSS, is_displayed=True, timeout=30).click()
    assert await client.await_alert(UNSUPPORTED_ALERT)

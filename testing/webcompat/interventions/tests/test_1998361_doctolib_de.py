import pytest
from webdriver import NoSuchElementException

URL = "https://www.doctolib.de/appointments/eyJfcmFpbHMiOnsibWVzc2FnZSI6Ik56TXdNRFV3TlRFeU1RPT0iLCJleHAiOm51bGwsInB1ciI6ImFwcG9pbnRtZW50In19--8828380aa4726a4c5e5f887a55ae459629f24c25e979d14373b22c722b2de264/telehealth_diagnostic"
COOKIES_CSS = "#didomi-notice-agree-button"
APP_RECOMMENDATION_CSS = "[aria-label='Weiter mit Firefox']"
ENTRY_BUTTON_CSS = ".dl-button-primary"
SUPPORTED_TEXT = "Mikrofon"
UNSUPPORTED_TEXT = "Inkompatibler Browser"


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await client.navigate(URL, wait="none")
    try:
        client.await_css(COOKIES_CSS, is_displayed=True).click()
    except NoSuchElementException:
        pass
    client.await_css(ENTRY_BUTTON_CSS, is_displayed=True).click()
    assert client.await_text(SUPPORTED_TEXT, is_displayed=True)
    assert not client.find_text(UNSUPPORTED_TEXT, is_displayed=True)


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await client.navigate(URL, wait="none")
    try:
        client.await_css(COOKIES_CSS, is_displayed=True).click()
    except NoSuchElementException:
        pass
    client.await_css(APP_RECOMMENDATION_CSS, is_displayed=True).click()
    client.await_css(ENTRY_BUTTON_CSS, is_displayed=True).click()
    assert client.await_text(UNSUPPORTED_TEXT, is_displayed=True)
    assert not client.find_text(SUPPORTED_TEXT, is_displayed=True)

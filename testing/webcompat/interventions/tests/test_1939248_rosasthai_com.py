import pytest
from webdriver.error import NoSuchElementException, StaleElementReferenceException

URL = "https://rosasthai.com/locations"

COOKIES_CSS = "#ccc"
VIEW_ALL_CSS = "#view-all"
FIRST_CARD_CSS = "#location-results [id^=card-]"


async def does_clicking_work(client):
    await client.navigate(URL, wait="none")
    client.await_css(COOKIES_CSS, is_displayed=True)
    client.hide_elements(COOKIES_CSS)
    # on failure, the location cards don't load. we also confirm that the
    # cards change after clicking "view all", just in case.
    try:
        first_card = client.await_css(FIRST_CARD_CSS, is_displayed=True)
    except NoSuchElementException:
        return False
    client.await_css(VIEW_ALL_CSS, is_displayed=True).click()
    try:
        first_card.click()
        return False
    except StaleElementReferenceException:
        return True


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert await does_clicking_work(client)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert not await does_clicking_work(client)

import pytest
from webdriver.error import NoSuchElementException

URL = "https://incontrol.landrover.com/jlr-portal-owner-web/select-locale"
REGION_SELECT_CSS = "#s2id_select-new-continent"
FIRST_REGION_CSS = (
    ".select2-result:not(.select2-result-unselectable):not(.select2-disabled)"
)
MARKET_SELECT_CSS = "#s2id_select-new-market"
MARKET_SELECT_DROPDOWN_CSS = ".select2-result"


async def do_dropdowns_work(client):
    await client.navigate(URL)
    client.await_css(REGION_SELECT_CSS, is_displayed=True).click()
    client.await_css(FIRST_REGION_CSS, is_displayed=True).click()
    client.await_css(MARKET_SELECT_CSS, is_displayed=True).click()
    try:
        client.await_css(MARKET_SELECT_DROPDOWN_CSS, is_displayed=True, timeout=2)
        return True
    except NoSuchElementException:
        return False


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert await do_dropdowns_work(client)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert not await do_dropdowns_work(client)

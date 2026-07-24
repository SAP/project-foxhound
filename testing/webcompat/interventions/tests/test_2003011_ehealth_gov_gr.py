from asyncio.exceptions import TimeoutError

import pytest
from webdriver.error import NoSuchElementException

URL = "https://ehealth.gov.gr/p-rv/p"

POPUP_CSS = ".popupContent"
POPUP_CC_LINK_CSS = ".popupContent .cc-link"


async def is_popup_text_cut_off(client):
    try:
        await client.navigate(URL, wait="none", timeout=10, no_skip=True)
        popup = client.await_css(POPUP_CSS, is_displayed=True)
        cc_link = client.await_css(POPUP_CC_LINK_CSS, is_displayed=True)
        return client.execute_script(
            """
            const [popup, cc_link] = arguments;
            return cc_link.getBoundingClientRect().top > popup.getBoundingClientRect().bottom;
          """,
            popup,
            cc_link,
        )
    except (TimeoutError, NoSuchElementException):
        pytest.skip("Region-locked, cannot test. Try using a VPN set to Greece.")
        return False


@pytest.mark.only_platforms("android")
@pytest.mark.actual_platform_required
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert not await is_popup_text_cut_off(client)


@pytest.mark.only_platforms("android")
@pytest.mark.actual_platform_required
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert await is_popup_text_cut_off(client)

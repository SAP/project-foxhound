from asyncio.exceptions import TimeoutError

import pytest

URL = "https://www.microsoft.com/en-us"

COOKIES_CSS = "#wcpConsentBannerCtrl"
SEARCH_CSS = "#search"
INPUT_CSS = "#cli_shellHeaderSearchInput"
SUGGESTION_CSS = ".m-auto-suggest a.f-product"
SELECTED_PRODUCT_LINK_CSS = ".c-menu-item[data-selected=true] a.f-product"


async def does_enter_work(client):
    await client.navigate(URL)

    # Wait for the cookie banner. By then the page's event listeners are set up.
    client.await_css(COOKIES_CSS, is_displayed=True)

    client.await_css(SEARCH_CSS, is_displayed=True).click()
    client.await_css(INPUT_CSS, is_displayed=True).send_keys("surface")

    # We now wait for the search suggestions to appear, press Down twice,
    # and Enter once. This should begin a navigation if things are working.
    client.await_css(SUGGESTION_CSS, is_displayed=True)
    await client.stall(1)
    client.keyboard.key_down("\ue05b").perform()  # Down arrow
    client.keyboard.key_down("\ue05b").perform()  # Down arrow
    selected_product = client.await_css(SELECTED_PRODUCT_LINK_CSS, is_displayed=True)
    expected_url = client.get_element_attribute(selected_product, "href")
    nav = await client.promise_navigation_begins(url=expected_url, timeout=2)
    client.keyboard.key_down("\ue007").perform()  # Enter
    try:
        await nav
        return True
    except TimeoutError:
        return False


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert await does_enter_work(client)


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert not await does_enter_work(client)

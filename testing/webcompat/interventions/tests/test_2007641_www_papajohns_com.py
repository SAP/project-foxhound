import pytest
from webdriver.error import (
    ElementClickInterceptedException,
    StaleElementReferenceException,
)

URL = "https://www.papajohns.com/"
COOKIES_CSS = "#onetrust-consent-sdk"
CARRYOUT_CSS = "button[data-id=carryout-button]"
ZIPCODE_CSS = "input#zipCode"
ZIP_CODE = "73301"
FIRST_ADDRESS_CSS = "[name=delivery-form] ul li[aria-selected=true]"
SUBMIT_CSS = "button[data-id=submit-button]"
PEPPERONI_CSS = "img[alt='Pepperoni Pizza']"
ADD_TO_CART_CSS = "button[data-id=add-to-cart]"
CHECKOUT_CSS = "a[data-id=checkout]"
GOOD_CSS = "input[name=policyCheck]"
BAD_TEXT = "Looks like we left this page in the oven too long"


async def prepare_order(client):
    await client.navigate(URL, wait="none")
    client.hide_elements(COOKIES_CSS)

    async def click_until_works(css, condition=None):
        # the site shows a loading overlay between most UI steps
        for _ in range(10):
            try:
                client.await_css(css, condition=condition, is_displayed=True).click()
                break
            except (ElementClickInterceptedException, StaleElementReferenceException):
                await client.stall(0.5)

    await click_until_works(CARRYOUT_CSS)
    client.await_css(ZIPCODE_CSS, is_displayed=True).send_keys(ZIP_CODE)
    await click_until_works(SUBMIT_CSS)
    await click_until_works(
        "button", "!elem.disabled && elem.innerText == 'SELECT STORE'"
    )
    await click_until_works(PEPPERONI_CSS)
    await click_until_works(ADD_TO_CART_CSS)
    await click_until_works(
        "span.rounded-full.bg-red-base",
        "elem.innerText == '1'",
    )
    await click_until_works(CHECKOUT_CSS)


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await prepare_order(client)
    assert client.await_css(GOOD_CSS, is_displayed=True)
    assert not client.find_text(BAD_TEXT, is_displayed=True)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await prepare_order(client)
    assert client.await_text(BAD_TEXT, is_displayed=True)
    assert not client.find_css(GOOD_CSS, is_displayed=True)

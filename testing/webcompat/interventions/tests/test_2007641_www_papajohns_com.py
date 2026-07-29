import pytest
from webdriver.error import (
    ElementClickInterceptedException,
    StaleElementReferenceException,
)

URL = "https://www.papajohns.com/order/menu/pizza"
COOKIES_CSS = "#onetrust-consent-sdk"
CARRYOUT_CSS = "button[data-id=carryout-button]"
ZIPCODE_CSS = "input#zipCode"
ZIP_CODE = "73301"
FIRST_ADDRESS_CSS = "[name=delivery-form] ul li[aria-selected=true]"
SUBMIT_CSS = "button[data-id=submit-button]"
PEPPERONI_CSS = (
    "[data-testid=product-card-clickable-area]:has(img[alt='Pepperoni Pizza'])"
)
ADD_TO_CART_CSS = "button[data-id=add-to-cart]"
CHECKOUT_CSS = "a[data-id=checkout]"
GOOD_CSS = "input[name=policyCheck]"
BAD_TEXT = "Looks like we left this page in the oven too long"
CART_CSS = "a[href*='/order/cart']"
CHECKOUT_CSS = "a[href*='/order/checkout']"
LOADER_CSS = "[data-testid=page-spinner]"


async def prepare_order(client):
    await client.navigate(URL, wait="none")
    client.hide_elements(COOKIES_CSS)

    async def click_until_works(css, condition=None):
        # the site shows a loading overlay between most UI steps
        for _ in range(10):
            client.await_element_hidden(client.css(LOADER_CSS))
            try:
                client.await_css(css, condition=condition, is_displayed=True).click()
                await client.stall(0.5)
                break
            except (ElementClickInterceptedException, StaleElementReferenceException):
                await client.stall(0.5)

    # clicking on pepperoni just doesn't work sometimes and returns you to the same page
    for _ in range(3):
        pepperoni, carryout = client.await_first_element_of(
            [
                client.css(PEPPERONI_CSS),
                client.css(CARRYOUT_CSS),
            ],
            is_displayed=True,
        )
        if pepperoni:
            await click_until_works(PEPPERONI_CSS)
        if carryout:
            break
        await client.stall(1)

    await click_until_works(CARRYOUT_CSS)
    client.await_css(ZIPCODE_CSS, is_displayed=True).send_keys(ZIP_CODE)
    await client.stall(1)
    await click_until_works(SUBMIT_CSS)
    await click_until_works(
        "button",
        "!elem.disabled && (elem.innerText == 'SELECT STORE' || elem.innerText == 'ORDER AHEAD')",
    )
    await click_until_works(ADD_TO_CART_CSS)
    await click_until_works(
        "span.rounded-full.bg-red-base",
        "elem.innerText == '1'",
    )
    await click_until_works(CHECKOUT_CSS)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_regression(client):
    await prepare_order(client)
    assert client.await_css(GOOD_CSS, is_displayed=True)
    assert not client.find_text(BAD_TEXT, is_displayed=True)

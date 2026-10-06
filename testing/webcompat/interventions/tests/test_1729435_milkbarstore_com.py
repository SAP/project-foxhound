import pytest

URL = "https://milkbarstore.com/products/assorted-cookie-tin"
ADD_TO_CART_CSS = "#ProductSubmitButton-pdp__main"
INCREASE_QUANTITY_CSS = ".quantity-wrapper button.change-quantity.inc"
QUANTITY_WRAPPER_CSS = ".quantity-wrapper"


async def do_cart_quantities_appear(client):
    # A screenshot of the quantity lines will show the spinner
    # arrows of the number-inputs when the site bug manifests.
    client.hide_elements("[id^=alia-root]")
    await client.navigate(URL, wait="none")
    client.await_css(ADD_TO_CART_CSS, is_displayed=True).click()
    inc = client.await_css(INCREASE_QUANTITY_CSS, is_displayed=True)
    await client.stall(1)
    pre = client.await_css(QUANTITY_WRAPPER_CSS).screenshot()
    inc.click()
    await client.stall(1)
    post = client.await_css(QUANTITY_WRAPPER_CSS).screenshot()
    return pre != post


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert await do_cart_quantities_appear(client)


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert not await do_cart_quantities_appear(client)


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_works_on_android(client):
    assert await do_cart_quantities_appear(client)

import pytest

URL = "https://www.signal-tech.com/products/bank/open_closed"
PRODUCTS_CSS = ".sub-cat-box"


async def do_more_products_load_while_scrolling(client):
    await client.navigate(URL, wait="none")
    await client.set_page_zoom_level(1.2)
    initial_products = client.await_css(PRODUCTS_CSS, is_displayed=True, all=True)
    for _ in range(20):
        client.apz_scroll(client.await_css("body"), dy=500)
        await client.stall(0.1)
    final_products = client.await_css(PRODUCTS_CSS, is_displayed=True, all=True)
    return len(final_products) > len(initial_products)


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert await do_more_products_load_while_scrolling(client)


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert not await do_more_products_load_while_scrolling(client)

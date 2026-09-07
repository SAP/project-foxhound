import asyncio

import pytest

URL = "https://www.dell.com/nl-nl/shop/dell-laptops/scr/laptops"

PRODUCTS_CSS = ".media-gallery-mfe.variant-stack-v2"
POPUP_CSS = "#didomi-notice-agree-button"
IMAGES_CSS = ".media-gallery-mfe.variant-stack-v2 .hero-dell-media figure"


async def are_images_fullsize(client):
    await client.navigate(URL, wait="none")
    second_product = client.await_css(PRODUCTS_CSS, all=True, is_displayed=True)[1]
    client.scroll_into_view(second_product)
    await asyncio.sleep(2)
    return client.execute_script(
        """
        const img = arguments[0].querySelector(".hero-dell-media figure")
        return img.clientWidth > 0 && img.clientHeight > 0
      """,
        second_product,
    )


@pytest.mark.skip_platforms("mac")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_regression(client):
    assert await are_images_fullsize(client)

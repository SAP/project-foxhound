import pytest

URL = "https://www.vitra.com.tr/c-asma-klozet-takimlari"
PRODUCT_IMAGE_CSS = ".product-cart-image"


async def are_images_broken(client):
    await client.navigate(URL, wait="load")
    client.execute_script("window.scrollTo(0, document.body.scrollHeight)")
    client.await_css(PRODUCT_IMAGE_CSS, is_displayed=True)
    return client.execute_script(
        """
        const images = document.querySelectorAll(arguments[0]);
        for (const img of images) {
            if (img.getBoundingClientRect().width > window.innerWidth) {
                return true;
            }
        }
        return false;
        """,
        PRODUCT_IMAGE_CSS,
    )


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert not await are_images_broken(client)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert await are_images_broken(client)

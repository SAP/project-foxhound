import pytest

URL = "https://vegan-store.eu/collections/vegan-fashion-mens"
WRAPPER_CSS = ".media-wrapper :has(img.motion-reduce)"


async def are_product_images_visible(client):
    await client.navigate(URL, wait="none")
    wrapper = client.await_css(WRAPPER_CSS, is_displayed=True)
    return client.execute_script(
        "return arguments[0].getBoundingClientRect().width > 0", wrapper
    )


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_regression(client):
    assert await are_product_images_visible(client)

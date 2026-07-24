import pytest

URL = "https://hall.ssjj.cn/live/"

WRAP_SCALE_CSS = "#app > .wrap-scale"


async def is_content_clipped(client):
    await client.navigate(URL)
    wrap = client.await_css(WRAP_SCALE_CSS)
    return client.execute_script(
        "return arguments[0].clientHeight < arguments[0].parentNode.clientHeight", wrap
    )


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert not await is_content_clipped(client)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert await is_content_clipped(client)

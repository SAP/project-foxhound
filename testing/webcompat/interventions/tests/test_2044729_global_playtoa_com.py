import pytest

URL = "https://global.playtoa.com/"

LOADER_CSS = ".loading"
VIDEO_CSS = ".index-video"


async def is_video_fullscreen(client):
    await client.navigate(URL, wait="none")
    client.await_css(LOADER_CSS, is_displayed=True)
    client.await_element_hidden(client.css(LOADER_CSS), timeout=30)
    await client.stall(2)
    return client.execute_script(
        """
        return arguments[0].getBoundingClientRect().bottom >= window.innerHeight;
        """,
        client.await_css(VIDEO_CSS, is_displayed=True),
    )


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert await is_video_fullscreen(client)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert not await is_video_fullscreen(client)

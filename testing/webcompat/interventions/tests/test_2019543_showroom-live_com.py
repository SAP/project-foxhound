import pytest

URL = "https://www.showroom-live.com/"
FIRST_LIVE_VIDEO_CSS = ".carousel-3d-slide:has(video.is-active) .enter.ga-story-link"
PLAYING_VIDEO_CSS = "#live-video-player_html5_api"
FAIL_MSG = "ReferenceError: assignment to undeclared variable hlsSrc"


async def get_to_live_video(client):
    await client.navigate(URL, wait="none")
    link = client.execute_script(
        """
        return URL.parse(arguments[0].href, location.href).href;
      """,
        client.await_css(FIRST_LIVE_VIDEO_CSS),
    )
    await client.navigate(link, wait="none")


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await get_to_live_video(client)
    return client.execute_async_script(
        """
        const [video, done] = arguments;
        setInterval(() => {
          if (!video.paused) {
            done();
          }
        }, 100);
      """,
        client.await_css(PLAYING_VIDEO_CSS, is_displayed=True),
    )


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await get_to_live_video(client)
    await (await client.promise_console_message_listener(FAIL_MSG))

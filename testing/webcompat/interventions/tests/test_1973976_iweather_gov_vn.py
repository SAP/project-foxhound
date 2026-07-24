import pytest

URL = "https://iweather.gov.vn/dashboard/?areaRadar=COM&productRadar=CMAX"

MAP_CSS = "#map"
ASIDE_CSS = "aside.fixed"
BOTTOM_BAR_CSS = ".w-mc.transition-all"


async def is_bottom_bar_full_width(client, platform):
    await client.navigate(URL, wait="none")
    client.add_stylesheet(f"{BOTTOM_BAR_CSS} {{ transition-duration:0s !important; }}")
    map = client.await_css(MAP_CSS, is_displayed=True)
    aside = client.await_css(ASIDE_CSS, is_displayed=True)
    bottom_bar = client.await_css(BOTTOM_BAR_CSS, is_displayed=True)
    return client.execute_script(
        """
        const [ bottom_bar, map, aside, android ] = arguments;
        return bottom_bar.clientWidth == map.clientWidth - (android ? 0 : aside.clientWidth);
      """,
        bottom_bar,
        map,
        aside,
        platform == "android",
    )


@pytest.mark.enable_webkit_fill_available
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client, platform):
    assert await is_bottom_bar_full_width(client, platform)


@pytest.mark.disable_webkit_fill_available
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client, platform):
    assert not await is_bottom_bar_full_width(client, platform)

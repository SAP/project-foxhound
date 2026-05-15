import asyncio

import pytest

URL = "https://store.renishaw.com/en-GB/category/styli-renishaw-straight?Thread=%3AM2&TipMaterial=%3ARuby"
POPUPS_CSS = "#onetrust-consent-sdk, [data-testid=toast]"
MOBILE_FILTERS_CSS = "[data-testid=plp-filters-open-modal-button]"
LEFT_SLIDER_CSS = "details.bg-primary #undefined-min"


async def does_left_slider_work(client):
    await client.navigate(URL)
    client.hide_elements(POPUPS_CSS)
    client.await_css(MOBILE_FILTERS_CSS, is_displayed=True).click()
    slider = client.await_css(LEFT_SLIDER_CSS, is_displayed=True)
    await asyncio.sleep(0.5)

    # Unfortunately, on desktop range thumbs do not react to any attempts to
    # drag them with WebDriver. However they do on Android, which is enough
    # for us to be able to test them.

    def slider_value():
        return client.execute_script("return arguments[0].value", slider)

    orig_value = slider_value()

    coords = client.get_element_screen_position(slider)
    padding = client.execute_script(
        """
            const s = getComputedStyle(arguments[0]);
            return [parseFloat(s['padding-left']), parseFloat(s['padding-top'])];
        """,
        slider,
    )
    coords = [coords[0] + padding[0] + 4, coords[1] + padding[1] + 4]
    await client.apz_down(coords=coords)
    for i in range(25):
        await asyncio.sleep(0.01)
        coords[0] += 5
        await client.apz_move(coords=coords)
    return orig_value != slider_value()


@pytest.mark.only_platforms("android")
@pytest.mark.actual_platform_required
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert await does_left_slider_work(client)


@pytest.mark.only_platforms("android")
@pytest.mark.actual_platform_required
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert not await does_left_slider_work(client)

import pytest

URL = "https://www.mygeha.com/tpa-ap-web/?navDeepDive=ProvDirPublicGEHADental&viewDefaultLayout=false"
CITY_OR_ZIPCODE_CSS = "#zipCode"
STATE_CSS = "select#state"


async def is_state_beside_zip(client):
    await client.navigate(URL, wait="none")
    city = client.await_css(CITY_OR_ZIPCODE_CSS, is_displayed=True)
    state = client.await_css(STATE_CSS, is_displayed=True)
    return client.execute_script(
        """
        const [city, state] = [...arguments].map(arg => arg.getBoundingClientRect());
        return city.width > 100 && state.width > 100 && city.right < state.left && Math.abs(state.top - city.top) < 2;
      """,
        city,
        state,
    )


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert await is_state_beside_zip(client)


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert not await is_state_beside_zip(client)

import pytest

URL = "https://rudder.taleez.com/"

BUTTONS_CSS = "section[fragment='9dsjn2pe0u11o'] .buttons"
ABOUT_CSS = "section[fragment='eamfaenq8glrc']"


async def are_buttons_overlapped(client):
    await client.navigate(URL, wait="none")
    buttons = client.await_css(BUTTONS_CSS, is_displayed=True)
    about = client.await_css(ABOUT_CSS, is_displayed=True)
    return client.execute_script(
        """
        const buttons = arguments[0].getBoundingClientRect();
        const about = arguments[1].getBoundingClientRect();
        return buttons.bottom > about.top;
    """,
        buttons,
        about,
    )


@pytest.mark.enable_webkit_fill_available
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert not await are_buttons_overlapped(client)


@pytest.mark.enable_webkit_fill_available
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert await are_buttons_overlapped(client)


@pytest.mark.disable_webkit_fill_available
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_works_with_pref_off(client):
    assert not await are_buttons_overlapped(client)


@pytest.mark.disable_webkit_fill_available
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_works_with_pref_off2(client):
    assert not await are_buttons_overlapped(client)

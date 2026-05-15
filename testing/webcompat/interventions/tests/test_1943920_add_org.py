import pytest

URL = "https://add.org/adhd-facts/"

MENU_CSS = "nav.mobile-menu-container.mobile-effect"


async def is_menu_visible(client):
    await client.navigate(URL)
    menu = client.await_css(MENU_CSS)
    return client.execute_script(
        """
      const box = arguments[0].getBoundingClientRect();
      return box.x < window.innerWidth && box.x + box.width > window.innerWidth;
      """,
        menu,
    )


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_regression(client):
    assert not await is_menu_visible(client)

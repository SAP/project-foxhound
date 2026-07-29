import pytest

URL = "https://polymarket.com/sports/live"
SCROLLBARS_CSS = ".scrollbar-none, .scrollbar-hide"


async def are_scrollbars_visible(client):
    await client.navigate(URL)
    return client.execute_script(
        """
      const shouldHaveNoBars = document.querySelectorAll(arguments[0]);
      for (const container of shouldHaveNoBars) {
          if (Math.round(container.getBoundingClientRect().width) != container.clientWidth) {
              return true;
          }
      }
      return false;
    """,
        SCROLLBARS_CSS,
    )


@pytest.mark.enable_webkit_scrollbar
@pytest.mark.skip_platforms("android")
@pytest.mark.need_visible_scrollbars
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert not await are_scrollbars_visible(client)


@pytest.mark.disable_webkit_scrollbar
@pytest.mark.skip_platforms("android")
@pytest.mark.need_visible_scrollbars
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert await are_scrollbars_visible(client)

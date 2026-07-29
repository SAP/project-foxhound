import pytest

URL = "https://myordbok.com/definition?q=burmese"
SEARCHBAR_CSS = "#header .row"
RESULT_CSS = "#content .define.result > .sense"


async def is_layout_correct(client):
    await client.make_preload_script("delete navigator.__proto__.webdriver")
    await client.navigate(URL)
    searchbar = client.await_css(SEARCHBAR_CSS, is_displayed=True)
    result = client.await_css(RESULT_CSS, is_displayed=True)
    return client.execute_script(
        """
          const [searchbar, result] = arguments;
          const searchbarBox = searchbar.getBoundingClientRect();
          const resultBox = result.getBoundingClientRect();
          return searchbarBox.right == resultBox.right;
      """,
        searchbar,
        result,
    )


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert await is_layout_correct(client)


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert not await is_layout_correct(client)

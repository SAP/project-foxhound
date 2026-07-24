import pytest

URL = "https://www.jal.co.jp/jp/ja/jalmile/use/jal/inter/routemiles.html"

ACCORDION_CSS = "#ecoEast"
TABLE_CSS = "#ecoEast table"


async def is_table_fully_visible(client):
    await client.navigate(URL, wait="none")
    client.await_css(ACCORDION_CSS, is_displayed=True).click()
    return client.execute_script(
        """
        const table = arguments[0];
        const tableWidth = table.getBoundingClientRect().width;
        const containerWidth = table.parentNode.getBoundingClientRect().width;
        return tableWidth <= containerWidth;
      """,
        client.await_css(TABLE_CSS, is_displayed=True),
    )


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert await is_table_fully_visible(client)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert not await is_table_fully_visible(client)

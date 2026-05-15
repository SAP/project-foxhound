import pytest

URL = "https://www.hermes.admin.ch/de/projektmanagement/szenarien/it-entwicklung/szenariouebersicht.html"

CELLS_CSS = ".hermespjm-projektuebersicht-cell"


async def are_table_cells_collapsed(client):
    await client.navigate(URL, wait="none")
    client.await_css(CELLS_CSS, is_displayed=True)
    return client.execute_script(
        """
        const cells = document.querySelectorAll(arguments[0]);
        for (const cell of cells) {
          if (cell.clientHeight < cell.scrollHeight) {
            return true;
          }
        }
        return false;
      """,
        CELLS_CSS,
    )


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert not await are_table_cells_collapsed(client)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert await are_table_cells_collapsed(client)

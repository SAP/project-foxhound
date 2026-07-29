import pytest

URL = "https://appointments.mpi.mb.ca/mpi/main/ReserveTime/StartReservation?pageId=01aa10ce-34d6-45ec-b861-86c8811239ca&buttonId=5367449e-20b9-470a-a022-f9d4df067cd6&culture=en&uiCulture=en"

CALENDAR_CSS = "#rs-calendar"


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_regression(client):
    await client.navigate(URL, wait="none")
    assert client.await_css(CALENDAR_CSS, is_displayed=True)

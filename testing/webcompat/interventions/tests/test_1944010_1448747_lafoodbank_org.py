import pytest

URL = "https://secure.lafoodbank.org/site/Donation2?df_id=5468&mfc_pref=T&5468.donation=form1"


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_regression(client):
    assert not await client.does_fastclick_activate(URL)

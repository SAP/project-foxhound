import pytest

URL = "https://envios.mercadolibre.com.ar/shipping/agencies-map/pick-up?zip_code=4500"


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_sitte_is_still_broken(client):
    await client.navigate(URL, wait="none")
    assert client.await_text("Algo salió mal")

import pytest

URL = "https://www.cwb.digital/apps/cwbDigital/#_frmLogin"
LOGIN_CSS = "input[type=email]"
DOWN_CSS = ".cf-error-details"


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_regression(client):
    await client.navigate(URL)
    login, down = client.await_first_element_of(
        [
            client.css(LOGIN_CSS),
            client.css(DOWN_CSS),
        ],
        is_displayed=True,
        timeout=60,
    )
    assert login or down

import pytest

URL = "https://www.schoolnutritionandfitness.com/webmenus2/#/view?id=6331c49ce96f1e9c468b45be&siteCode=1641"
VPN_TEXT = "403 Forbidden"
POPUP_CLOSE_CSS = ".modal-dialog button"
ELEM_CSS = "react-app td > div"
HEIGHT_CUTOFF = 10


async def visit_site(client):
    await client.navigate(URL, wait="none")
    elem, vpn = client.await_first_element_of(
        [client.css(ELEM_CSS), client.text(VPN_TEXT)],
        is_displayed=True,
    )
    if vpn:
        pytest.skip("Region-locked, cannot test. Try using a VPN set to the USA.")


def get_elem_height(client):
    elem = client.await_css(ELEM_CSS, is_displayed=True)
    assert elem
    return client.execute_script(
        """
        return arguments[0].getBoundingClientRect().height;
    """,
        elem,
    )


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await visit_site(client)
    client.soft_click(client.await_css(POPUP_CLOSE_CSS, is_displayed=True))
    assert get_elem_height(client) > HEIGHT_CUTOFF


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await client.ensure_InstallTrigger_undefined()
    await visit_site(client)
    assert get_elem_height(client) < HEIGHT_CUTOFF

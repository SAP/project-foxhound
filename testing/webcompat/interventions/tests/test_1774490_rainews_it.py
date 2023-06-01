import pytest

URL = (
    "https://www.rainews.it/photogallery/2022/06/fotorassegna-stampa-le-prime"
    "-pagine-dei-quotidiani-di-sabato-04-giugno--cd5414b3-65b9-429b-85d5-e53fadd59f4c.html"
)

PICTURE_CSS = ".swiper-slide picture"
GALLERY_CSS = ".swiper-wrapper"


def get_picture_width(client):
    return client.execute_script(
        f"""
        const p = document.querySelector("{PICTURE_CSS}");
        return window.getComputedStyle(p).width;
    """
    )


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await client.navigate(URL)
    client.await_css(GALLERY_CSS)
    assert "0px" != get_picture_width(client)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await client.navigate(URL)
    client.await_css(GALLERY_CSS)
    assert "0px" == get_picture_width(client)

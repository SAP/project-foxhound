import pytest

URL = "https://configuraraparelhos.claro.com.br/sistema-operacional/samsung-android-15/como-ativar-ou-desativar-a-rede-5g"

PHONE_DESCRIPTION_TEXT_CSS = ".text-content-paragraphs"


async def are_phone_descriptions_visible(client):
    await client.navigate(URL, wait="none")
    return client.execute_script(
        """
        const text = arguments[0];
        const textBottom = text.getBoundingClientRect().bottom;
        const cardBottom = text.closest(".step-card").getBoundingClientRect().bottom;
        return textBottom <= cardBottom;
      """,
        client.await_css(PHONE_DESCRIPTION_TEXT_CSS, is_displayed=True),
    )


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert await are_phone_descriptions_visible(client)


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert not await are_phone_descriptions_visible(client)


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_android(client):
    assert await are_phone_descriptions_visible(client)

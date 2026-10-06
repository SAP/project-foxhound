import pytest

URL = "https://anime-bit.ru/"
HIDDEN_IMAGES_CSS = ".anime_list.shadow.lazy"


async def are_wrong_images_hidden(client):
    await client.navigate(URL, wait="none")
    client.execute_script("window.scrollTo(0, 200)")
    await client.stall(1)
    # The site hides images with a class .lazy {display:none}, so we can check
    # if any of those images are onscreen and should be lacking that CSS class.
    return client.execute_script(
        """
        for (const img of arguments[0]) {
          if (img.getBoundingClientRect().top < window.innerHeight) {
            return true;
          }
        }
      """,
        client.await_css(HIDDEN_IMAGES_CSS, all=True),
    )


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert not await are_wrong_images_hidden(client)


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert await are_wrong_images_hidden(client)

import pytest

URL = "https://onlinebanking.usbank.com/auth/login/"
LABEL_CSS = "label[id=label_aw-personal-id]"
INPUT_CSS = "input[id=input_aw-personal-id]"


async def does_text_overlap(client):
    await client.navigate(URL, wait="none")
    label = client.await_css(LABEL_CSS, is_displayed=True)
    input = client.await_css(INPUT_CSS, is_displayed=True)
    input.send_keys("asdf")
    input.click()
    return client.execute_script(
        """
          const [label, input] = arguments;
          const labelBox = label.getBoundingClientRect();
          const inputBox = input.getBoundingClientRect();
          return labelBox.bottom > inputBox.top;
      """,
        label,
        input,
    )


@pytest.mark.use_big_minimum_font_size
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert not await does_text_overlap(client)


@pytest.mark.use_big_minimum_font_size
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert await does_text_overlap(client)

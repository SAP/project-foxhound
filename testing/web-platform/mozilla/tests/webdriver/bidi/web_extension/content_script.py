import pytest
from support.addons import get_ids_for_installed_addons, is_addon_temporary_installed
from tests.bidi.web_extension import assert_extension_id
from tests.support.helpers import get_base64_for_extension_file
from tests.support.sync import AsyncPoll
from webdriver.bidi.modules.script import ContextTarget

pytestmark = pytest.mark.asyncio


@pytest.mark.allow_system_access
async def test_install_temporary_web_extension_with_content_script(
    bidi_session,
    current_session,
    extension_data,
    inline,
    install_webextension,
    top_context,
):
    web_extension = await install_webextension(
        extension_data={
            "type": "base64",
            "value": get_base64_for_extension_file("firefox/content-script.xpi"),
        },
        _extension_params={"moz:permanent": False},
    )

    assert_extension_id(web_extension, extension_data)
    assert web_extension in get_ids_for_installed_addons(current_session)
    assert is_addon_temporary_installed(current_session, web_extension) is True

    await bidi_session.browsing_context.navigate(
        context=top_context["context"], url=inline("<div>foo</div>"), wait="complete"
    )

    async def get_marker_text(session):
        result = await session.script.evaluate(
            expression=(
                'document.querySelector("#content-script-marker")?.textContent'
            ),
            target=ContextTarget(top_context["context"]),
            await_promise=False,
        )
        assert result.get("value") == "content script executed"

    wait = AsyncPoll(
        bidi_session,
        timeout=5,
        message="Content script did not inject the marker element",
    )
    await wait.until(get_marker_text)

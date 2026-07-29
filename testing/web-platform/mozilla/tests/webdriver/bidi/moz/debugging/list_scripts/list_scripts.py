import pytest

pytestmark = pytest.mark.asyncio


async def test_list_scripts_inline(bidi_session, new_tab, enable_debugging, inline):
    await enable_debugging(contexts=[new_tab["context"]])

    url = inline(
        """<script>
function foo() {
    return 42;
}
</script>
"""
    )

    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=url, wait="complete"
    )

    result = await bidi_session.moz.debugging.list_scripts(context=new_tab["context"])

    assert "scripts" in result
    assert isinstance(result["scripts"], list)
    assert len(result["scripts"]) == 1
    assert url in result["scripts"]


async def test_list_scripts_inline_multiple(
    bidi_session, new_tab, enable_debugging, inline
):
    await enable_debugging(contexts=[new_tab["context"]])

    url = inline(
        """<script>
function script1() { return 1; }
</script>
<script>
function script2() { return 2; }
</script>
<script>
function script3() { return 3; }
</script>"""
    )

    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=url, wait="complete"
    )

    result = await bidi_session.moz.debugging.list_scripts(context=new_tab["context"])

    assert "scripts" in result
    assert isinstance(result["scripts"], list)
    assert len(result["scripts"]) == 1
    assert url in result["scripts"]


async def test_list_scripts_external_single(
    bidi_session, new_tab, enable_debugging, inline
):
    await enable_debugging(contexts=[new_tab["context"]])

    script_url = inline("function external() { return 100; }", doctype="js")

    page_url = inline(f'<script src="{script_url}"></script>')

    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=page_url, wait="complete"
    )

    result = await bidi_session.moz.debugging.list_scripts(context=new_tab["context"])

    assert "scripts" in result
    assert isinstance(result["scripts"], list)
    assert len(result["scripts"]) == 1
    assert script_url in result["scripts"]


async def test_list_scripts_external_multiple(
    bidi_session, new_tab, enable_debugging, inline
):
    await enable_debugging(contexts=[new_tab["context"]])

    script1_url = inline("function external1() { return 1; }", doctype="js")
    script2_url = inline("function external2() { return 2; }", doctype="js")
    script3_url = inline("function external3() { return 3; }", doctype="js")

    page_url = inline(
        f"""
<script src="{script1_url}"></script>
<script src="{script2_url}"></script>
<script src="{script3_url}"></script>
"""
    )

    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=page_url, wait="complete"
    )

    result = await bidi_session.moz.debugging.list_scripts(context=new_tab["context"])

    assert "scripts" in result
    assert isinstance(result["scripts"], list)
    assert len(result["scripts"]) == 3
    assert script1_url in result["scripts"]
    assert script2_url in result["scripts"]
    assert script3_url in result["scripts"]


async def test_list_scripts_mixed(bidi_session, new_tab, enable_debugging, inline):
    await enable_debugging(contexts=[new_tab["context"]])

    script1_url = inline("function external1() { return 10; }", doctype="js")
    script2_url = inline("function external2() { return 20; }", doctype="js")

    page_url = inline(
        f"""
<script src="{script1_url}"></script>
<script>
function inline1() {{ return 30; }}
</script>
<script src="{script2_url}"></script>
<script>
function inline2() {{ return 40; }}
</script>
"""
    )

    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=page_url, wait="complete"
    )

    result = await bidi_session.moz.debugging.list_scripts(context=new_tab["context"])

    assert "scripts" in result
    assert isinstance(result["scripts"], list)
    assert len(result["scripts"]) == 3
    assert page_url in result["scripts"]
    assert script1_url in result["scripts"]
    assert script2_url in result["scripts"]


async def test_list_scripts_empty(bidi_session, new_tab, enable_debugging, inline):
    await enable_debugging(contexts=[new_tab["context"]])

    url = inline("<div>No scripts here</div>")

    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=url, wait="complete"
    )

    result = await bidi_session.moz.debugging.list_scripts(context=new_tab["context"])

    assert "scripts" in result
    assert isinstance(result["scripts"], list)
    assert len(result["scripts"]) == 0

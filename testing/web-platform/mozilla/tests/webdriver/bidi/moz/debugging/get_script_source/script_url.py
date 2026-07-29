import pytest

pytestmark = pytest.mark.asyncio


async def test_get_script_source_inline(
    bidi_session, new_tab, enable_debugging, inline
):
    await enable_debugging(contexts=[new_tab["context"]])

    script_content = """function foo() {
    return 42;
}"""

    url = inline(f"<script>\n{script_content}\n</script>")

    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=url, wait="complete"
    )

    result = await bidi_session.moz.debugging.get_script_source(
        context=new_tab["context"], script_url=url
    )

    assert "source" in result
    assert isinstance(result["source"], str)
    assert "function foo()" in result["source"]
    assert "return 42" in result["source"]


async def test_get_script_source_external(
    bidi_session, new_tab, enable_debugging, inline
):
    await enable_debugging(contexts=[new_tab["context"]])

    script_content = "function external() { return 100; }"
    script_url = inline(script_content, doctype="js")

    page_url = inline(f'<script src="{script_url}"></script>')

    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=page_url, wait="complete"
    )

    result = await bidi_session.moz.debugging.get_script_source(
        context=new_tab["context"], script_url=script_url
    )

    assert "source" in result
    assert isinstance(result["source"], str)
    assert "function external()" in result["source"]
    assert "return 100" in result["source"]


async def test_get_script_source_multiple_scripts(
    bidi_session, new_tab, enable_debugging, inline
):
    await enable_debugging(contexts=[new_tab["context"]])

    script1_content = "function script1() { return 1; }"
    script1_url = inline(script1_content, doctype="js")

    script2_content = "function script2() { return 2; }"
    script2_url = inline(script2_content, doctype="js")

    page_url = inline(
        f"""
<script src="{script1_url}"></script>
<script src="{script2_url}"></script>
"""
    )

    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=page_url, wait="complete"
    )

    result1 = await bidi_session.moz.debugging.get_script_source(
        context=new_tab["context"], script_url=script1_url
    )

    assert "source" in result1
    assert "function script1()" in result1["source"]
    assert "return 1" in result1["source"]

    result2 = await bidi_session.moz.debugging.get_script_source(
        context=new_tab["context"], script_url=script2_url
    )

    assert "source" in result2
    assert "function script2()" in result2["source"]
    assert "return 2" in result2["source"]

    assert result1["source"] != result2["source"]

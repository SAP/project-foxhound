# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import os
import sys

# Set up Python environment to load build system packages.
OUR_DIR = os.path.dirname(__file__)
topsrcdir = os.path.normpath(os.path.join(OUR_DIR, ".."))

# Escapes $, [, ] and 3 dots in copy button
copybutton_prompt_text = r">>> |\.\.\. |\$ |In \[\d*\]: | {2,5}\.\.\.: | {5,8}: "
copybutton_prompt_is_regexp = True

EXTRA_PATHS = (
    "layout/tools/reftest",
    "python/mach",
    "python/mozbuild",
    "python/mozversioncontrol",
    "testing/mozbase/manifestparser",
    "testing/mozbase/mozfile",
    "testing/mozbase/mozprocess",
    "testing/mozbase/moznetwork",
    "third_party/python/jsmin",
    "third_party/python/which",
    "docs/_addons",
    "taskcluster/gecko_taskgraph/test",
)

sys.path[:0] = [os.path.join(topsrcdir, p) for p in EXTRA_PATHS]

sys.path.insert(0, OUR_DIR)

extensions = [
    "myst_parser",
    "sphinx.ext.autodoc",
    "sphinx.ext.autosectionlabel",
    "sphinx.ext.doctest",
    "sphinx.ext.graphviz",
    "sphinx.ext.napoleon",
    "sphinx.ext.todo",
    "mozbuild.sphinx",
    "sphinx_js",
    "sphinxcontrib.jquery",
    "sphinxcontrib.mermaid",
    "sphinx_copybutton",
    "sphinx_markdown_tables",
    "sphinx_design",
    "bzlink",
]

# JSDoc must run successfully for dirs specified, so running
# tree-wide (the default) will not work currently.
# When adding more paths to this list, please ensure that they are not
# excluded from valid-jsdoc in the top-level .eslintrc.js.
js_source_path = [
    "../browser/components/backup",
    "../browser/components/backup/actors",
    "../browser/components/backup/resources",
    "../browser/components/extensions",
    "../browser/components/migration",
    "../browser/components/migration/content",
    "../browser/components/uitour",
    "../browser/components/urlbar",
    "../remote/marionette",
    "../testing/mochitest/BrowserTestUtils",
    "../testing/mochitest/tests/SimpleTest/SimpleTest.js",
    "../testing/mochitest/tests/SimpleTest/EventUtils.js",
    "../testing/modules/Assert.sys.mjs",
    "../testing/modules/TestUtils.sys.mjs",
    "../toolkit/actors",
    "../toolkit/components/extensions",
    "../toolkit/components/extensions/parent",
    "../toolkit/components/featuregates",
    "../toolkit/components/ml/content/ONNXPipeline.mjs",
    "../toolkit/mozapps/extensions",
    "../toolkit/components/prompts/src",
    "../toolkit/components/pictureinpicture",
    "../toolkit/components/pictureinpicture/content",
    "../toolkit/components/search",
]
root_for_relative_js_paths = ".."
jsdoc_config_path = "jsdoc.json"

templates_path = ["_templates"]
source_suffix = [".rst", ".md"]
master_doc = "index"
project = "Firefox Source Docs"

# Override the search box to use Google instead of
# sphinx search on firefox-source-docs.mozilla.org
if (
    os.environ.get("MOZ_SOURCE_DOCS_USE_GOOGLE") == "1"
    and os.environ.get("MOZ_SCM_LEVEL") == "3"
):
    templates_path.append("_search_template")

html_sidebars = {
    "**": [
        "searchbox.html",
    ]
}
html_logo = os.path.join(
    topsrcdir, "browser/branding/nightly/content/firefox-wordmark.svg"
)
html_favicon = os.path.join(topsrcdir, "browser/branding/nightly/firefox.ico")

exclude_patterns = ["_build", "_staging", "_venv", "**security/nss/legacy/**"]
pygments_style = "sphinx"
# generate label “slugs” for header anchors so that
# we can reference them from markdown links.
myst_heading_anchors = 5

# We need to perform some adjustment of the settings and environment
# when running on Read The Docs.
on_rtd = os.environ.get("READTHEDOCS", None) == "True"

if on_rtd:
    # SHELL isn't set on RTD and mach.mixin.process's import raises if a
    # shell-related environment variable can't be found. Set the variable here
    # to hack us into working on RTD.
    assert "SHELL" not in os.environ
    os.environ["SHELL"] = "/bin/bash"
else:
    # We only need to set the RTD theme when not on RTD because the RTD
    # environment handles this otherwise.
    import sphinx_rtd_theme

    html_theme = "sphinx_rtd_theme"
    html_theme_path = [sphinx_rtd_theme.get_html_theme_path()]


html_static_path = ["_static"]
htmlhelp_basename = "FirefoxTreeDocs"

moz_project_name = "main"

html_show_copyright = False

# Only run autosection for the page title.
# Otherwise, we have a huge number of duplicate links.
# For example, the page https://firefox-source-docs.mozilla.org/code-quality/lint/
# is called "Linting"
# just like https://firefox-source-docs.mozilla.org/remote/CodeStyle.html
autosectionlabel_maxdepth = 1


def install_sphinx_design(app, pagename, templatename, context, doctree):
    if "perfdocs" in pagename:
        app.add_js_file("sphinx_design.js")
        app.add_css_file("sphinx_design.css")


def setup(app):
    app.add_css_file("custom_theme.css")
    app.connect("html-page-context", install_sphinx_design)

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import os

from mach.decorators import Command, CommandArgument

LICENSE_HEADER = """/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"""

JS_HEADER = """{license}
import {{ html }} from "../vendor/lit.all.mjs";
import {{ MozLitElement }} from "../lit-utils.mjs";

/**
 * Component description goes here.
 *
 * @tagname {element_name}
 * @property {{string}} variant - Property description goes here
 */
export default class {class_name} extends MozLitElement {{
  static properties = {{
    variant: {{ type: String }},
  }};

  // Use a relative URL in storybook to get faster reloads on style changes.
  static stylesheetUrl = window.IS_STORYBOOK
    ? "./{element_name}/{element_name}.css"
    : "chrome://global/content/elements/{element_name}.css";

  constructor() {{
    super();
    this.variant = "default";
  }}

  render() {{
    return html`
      <link rel="stylesheet" href=${{this.constructor.stylesheetUrl}} />
      <div>Variant type: ${{this.variant}}</div>
    `;
  }}
}}
customElements.define("{element_name}", {class_name});
"""

STORY_HEADER = """{license}
import {{ html }} from "../vendor/lit.all.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "./{element_name}.mjs";

export default {{
  title: "Design System/Experiments/{class_name}",
  component: "{element_name}",
  argTypes: {{
    variant: {{
      options: ["default", "other"],
      control: {{ type: "select" }},
    }},
  }},
}};

const Template = ({{ variant }}) => html`
  <{element_name} .variant=${{variant}}></{element_name}>
`;

export const Default = Template.bind({{}});
Default.args = {{
  variant: "default",
}};
"""


def run_mach(command_context, cmd, **kwargs):
    return command_context._mach_context.commands.dispatch(
        cmd, command_context._mach_context, **kwargs
    )


def run_npm(command_context, args):
    return run_mach(
        command_context, "npm", args=[*args, "--prefix=browser/components/storybook"]
    )


@Command(
    "addwidget",
    category="misc",
    description="Scaffold a front-end component.",
)
@CommandArgument(
    "names",
    nargs="+",
    help="Component names to create in kebab-case, eg. my-card.",
)
def addwidget(command_context, names):
    for name in names:
        component_dir = "toolkit/content/widgets/{0}".format(name)

        try:
            os.mkdir(component_dir)
        except FileExistsError:
            pass

        with open("{0}/{1}.mjs".format(component_dir, name), "w", newline="\n") as f:
            class_name = "".join(p.capitalize() for p in name.split("-"))
            f.write(
                JS_HEADER.format(
                    license=LICENSE_HEADER,
                    element_name=name,
                    class_name=class_name,
                )
            )

        with open("{0}/{1}.css".format(component_dir, name), "w", newline="\n") as f:
            f.write(LICENSE_HEADER)

        test_name = name.replace("-", "_")
        test_path = "toolkit/content/tests/widgets/test_{0}.html".format(test_name)
        jar_path = "toolkit/content/jar.mn"
        jar_lines = None
        with open(jar_path, "r") as f:
            jar_lines = f.readlines()
        elements_startswith = "   content/global/elements/"
        new_css_line = "{0}{1}.css    (widgets/{1}/{1}.css)\n".format(
            elements_startswith, name
        )
        new_js_line = "{0}{1}.mjs    (widgets/{1}/{1}.mjs)\n".format(
            elements_startswith, name
        )
        new_jar_lines = []
        found_elements_section = False
        added_widget = False
        for line in jar_lines:
            if line.startswith(elements_startswith):
                found_elements_section = True
            if found_elements_section and not added_widget and line > new_css_line:
                added_widget = True
                new_jar_lines.append(new_css_line)
                new_jar_lines.append(new_js_line)
            new_jar_lines.append(line)

        with open(jar_path, "w", newline="\n") as f:
            f.write("".join(new_jar_lines))

        story_path = "{0}/{1}.stories.mjs".format(component_dir, name)
        with open(story_path, "w", newline="\n") as f:
            f.write(
                STORY_HEADER.format(
                    license=LICENSE_HEADER,
                    element_name=name,
                    class_name=class_name,
                )
            )

        run_mach(
            command_context, "addtest", argv=[test_path, "--suite", "mochitest-chrome"]
        )

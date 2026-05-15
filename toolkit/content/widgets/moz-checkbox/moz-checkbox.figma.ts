import figma, { html } from "@figma/code-connect/html";

// Desktop v3 (newest)
figma.connect(
  "https://www.figma.com/design/3WoKOSGtaSjhUHKldHCXbc/Desktop-Components-3?node-id=3907-17658",
  {
    props: {
      labelProps: figma.nestedProps("Label", {
        description: figma.boolean("Show description", {
          true: figma.string("Description"),
        }),
        label: figma.string("Label"),
        supportPage: figma.boolean("Show support link", {
          true: "sumo-slug",
        }),
        iconSrc: figma.boolean("Show icon", {
          true: "chrome://example.svg",
        }),
      }),
      checkboxProps: figma.nestedProps("Checkbox", {
        checked: figma.boolean("Checked"),
      }),
      disabled: figma.boolean("Disabled"),
    },
    example: props => html`
      <moz-checkbox
        label=${props.labelProps.label}
        name="example-moz-checkbox-name"
        value="example moz-checkbox value"
        checked=${props.checkboxProps.checked}
        disabled=${props.disabled}
        iconsrc=${props.labelProps.iconSrc}
        description=${props.labelProps.description}
        support-page=${props.labelProps.supportPage}
      ></moz-checkbox>
      <!--
  The Figma component allows for the moz-checkbox to render in an
  indeterminate state, such as for the parent checkbox of nested
  checkboxes. This is not set with a property for the web component.
-->
    `,
  }
);

// Desktop Components (deprecated)
figma.connect(
  "https://www.figma.com/design/2ruSnPauajQGprFy6K333u/Desktop-Components?node-id=800-12337",
  {
    props: {
      checked: figma.boolean("Checked"),
      description: figma.boolean("Description", {
        true: figma.textContent("✏️ Description"),
      }),
      disabled: figma.boolean("Disabled"),
      label: figma.textContent("✏️ Label"),
    },
    example: props => html`
      <moz-checkbox
        checked=${props.checked}
        description=${props.description}
        disabled=${props.disabled}
        label=${props.label}
      ></moz-checkbox>
    `,
  }
);

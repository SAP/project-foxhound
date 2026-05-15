import figma, { html } from "@figma/code-connect/html";

// Desktop Components v3 (newest)
figma.connect(
  "https://www.figma.com/design/3WoKOSGtaSjhUHKldHCXbc/Desktop-Components-3?node-id=3907-17657",
  {
    props: {
      labelProps: figma.nestedProps("Label", {
        description: figma.boolean("Show description", {
          true: figma.string("Description"),
        }),
        supportPage: figma.boolean("Show support link", {
          true: "sumo-slug",
        }),
        label: figma.string("Label"),
        iconSrc: figma.boolean("Show icon", {
          true: "chrome://example.svg",
        }),
      }),
      radioProps: figma.nestedProps("Radio Button", {
        checked: figma.boolean("Checked"),
      }),
      disabled: figma.boolean("Disabled"),
    },
    example: props => html`
      <moz-radio
        checked=${props.radioProps.checked}
        description=${props.labelProps.description}
        disabled=${props.disabled}
        iconsrc=${props.labelProps.iconSrc}
        label=${props.labelProps.label}
        name="example-moz-radio-group-name"
        support-page=${props.labelProps.supportPage}
        value="example moz-radio value"
      ></moz-radio>
    `,
  }
);

// Desktop Components (deprecated)
figma.connect(
  "https://www.figma.com/design/2ruSnPauajQGprFy6K333u/Desktop-Components?node-id=800-14976",
  {
    props: {
      checked: figma.boolean("Checked"),
      description: figma.boolean("Description", {
        true: figma.textContent("✏️ Description"),
      }),
      disabled: figma.boolean("Disabled"),
      label: figma.textContent("✏️ Label"),
    },
    example: props =>
      html` <moz-radio
        checked=${props.checked}
        description=${props.description}
        disabled=${props.disabled}
        label=${props.label}
      ></moz-radio>`,
  }
);

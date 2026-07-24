import figma, { html } from "@figma/code-connect/html";

// Desktop V3 (newest)
figma.connect(
  "https://www.figma.com/design/3WoKOSGtaSjhUHKldHCXbc/Desktop-Components-3?node-id=3907-17659",
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
      toggleProps: figma.nestedProps("Toggle switch", {
        pressed: figma.boolean("Checked"),
      }),
      disabled: figma.boolean("Disabled"),
    },
    example: props =>
      html`<moz-toggle
        name="example-moz-toggle-name"
        value="example moz-toggle value"
        pressed=${props.toggleProps.pressed}
        disabled=${props.disabled}
        label=${props.labelProps.label}
        description=${props.labelProps.description}
        iconsrc=${props.labelProps.iconSrc}
        support-page=${props.labelProps.supportPage}
      ></moz-toggle> `,
  }
);

// Desktop Components (deprecated)
figma.connect(
  "https://www.figma.com/design/2ruSnPauajQGprFy6K333u/Desktop-Components?node-id=801-7224",
  {
    props: {
      description: figma.boolean("Description", {
        true: figma.textContent("✏️ Description"),
      }),
      disabled: figma.boolean("Disabled"),
      label: figma.textContent("✏️ Label"),
      toggleProps: figma.nestedProps("⚠️ Toggle Input", {
        pressed: figma.boolean("Switch"),
      }),
    },
    example: props =>
      html`<moz-toggle
        label=${props.label}
        description=${props.description}
        disabled=${props.disabled}
        pressed=${props.toggleProps.pressed}
      ></moz-toggle>`,
  }
);

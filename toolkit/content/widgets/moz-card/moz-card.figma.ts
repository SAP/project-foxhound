import figma, { html } from "@figma/code-connect/html";

// Desktop v3 (newest)
figma.connect(
  "https://www.figma.com/design/3WoKOSGtaSjhUHKldHCXbc/Desktop-Components-3?node-id=538-18711",
  {
    props: {
      type: figma.enum("Type", {
        Empty: undefined,
        Slot: "slot",
        Accordion: "accordion",
      }),
      heading: figma.boolean("Show heading", {
        true: figma.string("Heading"),
        false: undefined,
      }),
      slot: figma.instance("Slot"),
      expanded: figma.boolean("Expanded"),
      iconSrc: figma.boolean("Show icon", {
        true: "chrome://example.svg",
        false: undefined,
      }),
    },
    example: props =>
      html`<moz-card
        type=${props.type}
        expanded=${props.expanded}
        heading=${props.heading}
        iconSrc=${props.iconSrc}
      >
        ${props.slot}
      </moz-card>`,
  }
);

figma.connect(
  "https://www.figma.com/design/3WoKOSGtaSjhUHKldHCXbc/Desktop-Components-3?node-id=477-6023",
  {
    props: {
      expanded: figma.boolean("Expanded", {
        true: "This card is in the 'expanded' state.",
        false: undefined,
      }),
    },
    example: props =>
      html`This subcomponent is created by passing a 'heading' property to the
      moz-card component. See the moz-card for detail. ${props.expanded}`,
  }
);

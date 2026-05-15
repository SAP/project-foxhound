import figma, { html } from "@figma/code-connect/html";

// Desktop V3
figma.connect(
  "https://www.figma.com/design/3WoKOSGtaSjhUHKldHCXbc/Desktop-Components-3?node-id=4213-3017",
  {
    props: {
      rating: figma.string("Rating"),
    },
    example: props => html`
      <moz-five-star rating=${props.rating} selectable />
    `,
  }
);

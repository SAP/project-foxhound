import figma, { html } from "@figma/code-connect/html";

// Desktop v3
figma.connect(
  "https://www.figma.com/design/3WoKOSGtaSjhUHKldHCXbc/Desktop-Components-3?node-id=442-2086",
  {
    props: {
      label: figma.string("Label"),
    },
    example: props => html`
      <label is="moz-label"> ${props.label} </label>
      <!--
The moz-label also accepts an accesskey attribute, and should include
the for attribute corresponding to the id of a corresponding control.
There is a full example below.

<label is="moz-label" accesskey="r" for="radio">
  This is the label
</label>
<input id="radio" type="radio" id="radio"/>
-->
    `,
  }
);

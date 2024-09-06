/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

<%namespace name="helpers" file="/helpers.mako.rs" />

// SVG 2
// https://svgwg.org/svg2-draft/
<% data.new_style_struct("InheritedSVG", inherited=True, gecko_name="SVG") %>

// Section 10 - Text

${helpers.single_keyword(
    "dominant-baseline",
    """auto ideographic alphabetic hanging mathematical central middle
       text-after-edge text-before-edge""",
    engines="gecko",
    animation_value_type="discrete",
    spec="https://www.w3.org/TR/css-inline-3/#propdef-dominant-baseline",
    gecko_enum_prefix="StyleDominantBaseline",
    affects="layout",
)}

${helpers.single_keyword(
    "text-anchor",
    "start middle end",
    engines="gecko",
    animation_value_type="discrete",
    spec="https://svgwg.org/svg2-draft/text.html#TextAnchorProperty",
    gecko_enum_prefix="StyleTextAnchor",
    affects="layout",
)}

// Section 11 - Painting: Filling, Stroking and Marker Symbols
${helpers.single_keyword(
    "color-interpolation",
    "srgb auto linearrgb",
    engines="gecko",
    animation_value_type="discrete",
    spec="https://svgwg.org/svg2-draft/painting.html#ColorInterpolationProperty",
    gecko_enum_prefix="StyleColorInterpolation",
    affects="paint",
)}

${helpers.single_keyword(
    "color-interpolation-filters",
    "linearrgb auto srgb",
    engines="gecko",
    animation_value_type="discrete",
    spec="https://svgwg.org/svg2-draft/painting.html#ColorInterpolationFiltersProperty",
    gecko_enum_prefix="StyleColorInterpolation",
    affects="paint",
)}

${helpers.predefined_type(
    "fill",
    "SVGPaint",
    "crate::values::computed::SVGPaint::BLACK",
    engines="gecko",
    animation_value_type="IntermediateSVGPaint",
    boxed=True,
    spec="https://svgwg.org/svg2-draft/painting.html#SpecifyingFillPaint",
    affects="paint",
)}

${helpers.predefined_type(
    "fill-opacity",
    "SVGOpacity",
    "Default::default()",
    engines="gecko",
    animation_value_type="ComputedValue",
    spec="https://svgwg.org/svg2-draft/painting.html#FillOpacity",
    affects="paint",
)}

${helpers.predefined_type(
    "fill-rule",
    "FillRule",
    "Default::default()",
    engines="gecko",
    animation_value_type="discrete",
    spec="https://svgwg.org/svg2-draft/painting.html#FillRuleProperty",
    affects="paint",
)}

${helpers.single_keyword(
    "shape-rendering",
    "auto optimizespeed crispedges geometricprecision",
    engines="gecko",
    animation_value_type="discrete",
    spec="https://svgwg.org/svg2-draft/painting.html#ShapeRenderingProperty",
    gecko_enum_prefix = "StyleShapeRendering",
    affects="paint",
)}

${helpers.predefined_type(
    "stroke",
    "SVGPaint",
    "Default::default()",
    engines="gecko",
    animation_value_type="IntermediateSVGPaint",
    boxed=True,
    spec="https://svgwg.org/svg2-draft/painting.html#SpecifyingStrokePaint",
    affects="paint",
)}

${helpers.predefined_type(
    "stroke-width",
    "SVGWidth",
    "computed::SVGWidth::one()",
    engines="gecko",
    animation_value_type="crate::values::computed::SVGWidth",
    spec="https://svgwg.org/svg2-draft/painting.html#StrokeWidth",
    affects="layout",
)}

${helpers.single_keyword(
    "stroke-linecap",
    "butt round square",
    engines="gecko",
    animation_value_type="discrete",
    spec="https://svgwg.org/svg2-draft/painting.html#StrokeLinecapProperty",
    gecko_enum_prefix = "StyleStrokeLinecap",
    affects="layout",
)}

${helpers.single_keyword(
    "stroke-linejoin",
    "miter round bevel",
    engines="gecko",
    animation_value_type="discrete",
    spec="https://svgwg.org/svg2-draft/painting.html#StrokeLinejoinProperty",
    gecko_enum_prefix = "StyleStrokeLinejoin",
    affects="layout",
)}

${helpers.predefined_type(
    "stroke-miterlimit",
    "NonNegativeNumber",
    "From::from(4.0)",
    engines="gecko",
    animation_value_type="crate::values::computed::NonNegativeNumber",
    spec="https://svgwg.org/svg2-draft/painting.html#StrokeMiterlimitProperty",
    affects="layout",
)}

${helpers.predefined_type(
    "stroke-opacity",
    "SVGOpacity",
    "Default::default()",
    engines="gecko",
    animation_value_type="ComputedValue",
    spec="https://svgwg.org/svg2-draft/painting.html#StrokeOpacity",
    affects="paint",
)}

${helpers.predefined_type(
    "stroke-dasharray",
    "SVGStrokeDashArray",
    "Default::default()",
    engines="gecko",
    animation_value_type="crate::values::computed::SVGStrokeDashArray",
    spec="https://svgwg.org/svg2-draft/painting.html#StrokeDashing",
    affects="paint",
)}

${helpers.predefined_type(
    "stroke-dashoffset",
    "SVGLength",
    "computed::SVGLength::zero()",
    engines="gecko",
    animation_value_type="ComputedValue",
    spec="https://svgwg.org/svg2-draft/painting.html#StrokeDashing",
    affects="paint",
)}

// Section 14 - Clipping, Masking and Compositing
${helpers.predefined_type(
    "clip-rule",
    "FillRule",
    "Default::default()",
    engines="gecko",
    animation_value_type="discrete",
    spec="https://svgwg.org/svg2-draft/masking.html#ClipRuleProperty",
    affects="paint",
)}

${helpers.predefined_type(
    "marker-start",
    "url::UrlOrNone",
    "computed::url::UrlOrNone::none()",
    engines="gecko",
    animation_value_type="discrete",
    spec="https://svgwg.org/svg2-draft/painting.html#VertexMarkerProperties",
    affects="layout",
)}

${helpers.predefined_type(
    "marker-mid",
    "url::UrlOrNone",
    "computed::url::UrlOrNone::none()",
    engines="gecko",
    animation_value_type="discrete",
    spec="https://svgwg.org/svg2-draft/painting.html#VertexMarkerProperties",
    affects="layout",
)}

${helpers.predefined_type(
    "marker-end",
    "url::UrlOrNone",
    "computed::url::UrlOrNone::none()",
    engines="gecko",
    animation_value_type="discrete",
    spec="https://svgwg.org/svg2-draft/painting.html#VertexMarkerProperties",
    affects="layout",
)}

${helpers.predefined_type(
    "paint-order",
    "SVGPaintOrder",
    "computed::SVGPaintOrder::normal()",
    engines="gecko",
    animation_value_type="discrete",
    spec="https://svgwg.org/svg2-draft/painting.html#PaintOrder",
    affects="paint",
)}

${helpers.predefined_type(
    "-moz-context-properties",
    "MozContextProperties",
    "computed::MozContextProperties::default()",
    engines="gecko",
    enabled_in="chrome",
    gecko_pref="svg.context-properties.content.enabled",
    has_effect_on_gecko_scrollbars=False,
    animation_value_type="none",
    spec="Nonstandard (https://developer.mozilla.org/en-US/docs/Web/CSS/-moz-context-properties)",
    affects="paint",
)}

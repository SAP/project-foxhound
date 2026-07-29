#!/usr/bin/env python3
"""
Generate FloatPrecisionTest.ttf, a minimal variable font with unusual floating
point precision on all axes to test font variation axis rounding behavior.

Run this script with:

> ./mach python -m pip install fonttools
> ./mach python devtools/client/inspector/fonts/test/FloatPrecisionTest_generate.py
"""

import os
import shutil

from fontTools.designspaceLib import (
    AxisDescriptor,
    DesignSpaceDocument,
    InstanceDescriptor,
    SourceDescriptor,
)
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.varLib import build as varLib_build

FAMILY_NAME = "FloatPrecisionTest"


def create_base_font(name, width=600):
    """Create a simple base font with minimal glyph set.

    This creates a "master" font that will be used as one of the sources
    for building a variable font. The width parameter allows us to create
    different masters with different glyph widths.
    """
    # Initialize font builder with 1000 units per em (standard resolution)
    fb = FontBuilder(unitsPerEm=1000, isTTF=True)

    # Set the font family and style names
    fb.setupNameTable({
        "familyName": FAMILY_NAME,
        "styleName": name,
    })

    # Define two glyphs: .notdef (fallback glyph) and "A"
    glyphOrder = [".notdef", "A"]

    # Draw .notdef as a simple rectangle (standard fallback glyph)
    def draw_notdef(pen):
        pen.moveTo((50, 0))
        pen.lineTo((50, 700))
        pen.lineTo((450, 700))
        pen.lineTo((450, 0))
        pen.closePath()

    # Draw "A" as a rectangle with variable width
    # The width parameter controls how wide the glyph is
    def draw_A(pen):
        pen.moveTo((100, 0))
        pen.lineTo((100, 700))
        pen.lineTo((width - 100, 700))
        pen.lineTo((width - 100, 0))
        pen.closePath()

    # Set the glyph order and map character "A" to the A glyph
    fb.setupGlyphOrder(glyphOrder)
    fb.setupCharacterMap({ord("A"): "A"})

    # Create the .notdef glyph by drawing with a pen
    pen = TTGlyphPen(None)
    draw_notdef(pen)
    notdef_glyph = pen.glyph()

    # Create the A glyph
    pen = TTGlyphPen(None)
    draw_A(pen)
    a_glyph = pen.glyph()

    # Add the glyphs to the font
    fb.setupGlyf({".notdef": notdef_glyph, "A": a_glyph})

    # Set horizontal metrics: (advance width, left side bearing)
    fb.setupHorizontalMetrics({
        ".notdef": (500, 50),
        "A": (width, 100),
    })

    # Set font metrics for vertical positioning
    fb.setupHorizontalHeader(ascent=800, descent=-200)
    fb.setupOS2(
        sTypoAscender=800, sTypoDescender=-200, usWinAscent=800, usWinDescent=200
    )
    fb.setupPost()
    fb.setupHead()

    return fb.font


def create_precision_test_font():
    """Create variable font with floating point precision issues.

    This function generates a variable font specifically designed to test
    how the font inspector handles unusual floating point precision in
    font variation axes. The axis values have many decimal places that
    can expose rounding errors or precision issues in the UI.
    """

    AXIS_VALUES = {
        "Weight": {
            "minimum": 300.3333282470703,
            "default": 400.6666717529297,
            "maximum": 699.4444580078125,
        },
        "Width": {
            "minimum": 62.142856597900391,
            "default": 87.555557250976562,
            "maximum": 137.77777099609375,
        },
        "Slant": {
            "minimum": -12.345678329467773,
            "default": -0.111111111111111,
            "maximum": 5.432109832763672,
        },
        "Optical Size": {
            "minimum": 8.888888359069824,
            "default": 14.285714149475098,
            "maximum": 96.969696044921875,
        },
    }

    AXES = [
        ("Weight", "wght"),
        ("Width", "wdth"),
        ("Slant", "slnt"),
        ("Optical Size", "opsz"),
    ]

    SOURCES = [
        ("Light", "minimum", 400),
        ("Regular", "default", 600),
        ("Bold", "maximum", 800),
    ]

    INSTANCES = [
        ("Regular", "default"),
        ("Bold", "maximum"),
    ]

    # Determine the script's directory so all output goes to the same location
    script_dir = os.path.dirname(os.path.abspath(__file__))
    tmp_masters = os.path.join(script_dir, "tmp_masters")
    os.makedirs(tmp_masters, exist_ok=True)

    # Create and save master fonts with different glyph widths.
    # Variable fonts interpolate between these masters to create variations.
    # One master must be at the default location for all axes.
    for source_name, _, width in SOURCES:
        font = create_base_font(source_name, width=width)
        font.save(os.path.join(tmp_masters, f"{source_name}.ttf"))

    # Create a designspace document that describes the variable font.
    # A designspace defines: the variation axes, the master fonts (sources),
    # and named instances (predefined styles).
    doc = DesignSpaceDocument()

    # Define variation axes with intentionally unusual floating point precision.
    # These values have many decimal places to test how the font inspector
    # handles rounding and display of precise floating point numbers.
    for axis_name, axis_tag in AXES:
        axis = AxisDescriptor()
        axis.name = axis_name
        axis.tag = axis_tag
        axis.minimum = AXIS_VALUES[axis_name]["minimum"]
        axis.default = AXIS_VALUES[axis_name]["default"]
        axis.maximum = AXIS_VALUES[axis_name]["maximum"]
        doc.addAxis(axis)

    # Add sources (the master fonts) to the designspace.
    # Sources define the "control points" in the variation space that the
    # variable font will interpolate between. Each source has a location
    # in the design space defined by its coordinates on each axis.
    for source_name, location_type, _ in SOURCES:
        source = SourceDescriptor()
        source.path = os.path.join(tmp_masters, f"{source_name}.ttf")
        source.familyName = FAMILY_NAME
        source.styleName = source_name
        source.location = {
            axis_name: AXIS_VALUES[axis_name][location_type]
            for axis_name in AXIS_VALUES
        }
        doc.addSource(source)

    # Add named instances to the designspace.
    # Instances are predefined style names (like "Regular" or "Bold") that
    # correspond to specific locations in the variation space. Users can
    # select these by name rather than manually adjusting axis values.
    for instance_name, location_type in INSTANCES:
        instance = InstanceDescriptor()
        instance.familyName = FAMILY_NAME
        instance.styleName = instance_name
        instance.location = {
            axis_name: AXIS_VALUES[axis_name][location_type]
            for axis_name in AXIS_VALUES
        }
        doc.addInstance(instance)

    # Build the variable font from the designspace document.
    # This generates a single .ttf file containing all the variation data,
    # allowing continuous interpolation between the master fonts.
    output_path = os.path.join(script_dir, "FloatPrecisionTest.ttf")
    varfont, _, _ = varLib_build(doc)
    varfont.save(output_path)

    # Clean up temporary master font files (no longer needed)
    shutil.rmtree(tmp_masters)

    print(f"Created: {output_path}")


if __name__ == "__main__":
    create_precision_test_font()

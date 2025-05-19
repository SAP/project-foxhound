/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

//! Specified types for SVG Path.

use crate::parser::{Parse, ParserContext};
use crate::values::animated::{lists, Animate, Procedure};
use crate::values::distance::{ComputeSquaredDistance, SquaredDistance};
use crate::values::generics::basic_shape::GenericShapeCommand;
use crate::values::generics::basic_shape::{ArcSize, ArcSweep, ByTo, CoordinatePair};
use crate::values::CSSFloat;
use cssparser::Parser;
use std::fmt::{self, Write};
use std::iter::{Cloned, Peekable};
use std::slice;
use style_traits::values::SequenceWriter;
use style_traits::{CssWriter, ParseError, StyleParseErrorKind, ToCss};

/// Whether to allow empty string in the parser.
#[derive(Clone, Debug, Eq, PartialEq)]
#[allow(missing_docs)]
pub enum AllowEmpty {
    Yes,
    No,
}

/// The SVG path data.
///
/// https://www.w3.org/TR/SVG11/paths.html#PathData
#[derive(
    Clone,
    Debug,
    Deserialize,
    MallocSizeOf,
    PartialEq,
    Serialize,
    SpecifiedValueInfo,
    ToAnimatedZero,
    ToComputedValue,
    ToResolvedValue,
    ToShmem,
)]
#[repr(C)]
pub struct SVGPathData(
    // TODO(emilio): Should probably measure this somehow only from the
    // specified values.
    #[ignore_malloc_size_of = "Arc"] pub crate::ArcSlice<PathCommand>,
);

impl SVGPathData {
    /// Get the array of PathCommand.
    #[inline]
    pub fn commands(&self) -> &[PathCommand] {
        &self.0
    }

    /// Create a normalized copy of this path by converting each relative
    /// command to an absolute command.
    pub fn normalize(&self) -> Self {
        let mut state = PathTraversalState {
            subpath_start: CoordPair::new(0.0, 0.0),
            pos: CoordPair::new(0.0, 0.0),
        };
        let iter = self.0.iter().map(|seg| seg.normalize(&mut state));
        SVGPathData(crate::ArcSlice::from_iter(iter))
    }

    /// Parse this SVG path string with the argument that indicates whether we should allow the
    /// empty string.
    // We cannot use cssparser::Parser to parse a SVG path string because the spec wants to make
    // the SVG path string as compact as possible. (i.e. The whitespaces may be dropped.)
    // e.g. "M100 200L100 200" is a valid SVG path string. If we use tokenizer, the first ident
    // is "M100", instead of "M", and this is not correct. Therefore, we use a Peekable
    // str::Char iterator to check each character.
    //
    // css-shapes-1 says a path data string that does conform but defines an empty path is
    // invalid and causes the entire path() to be invalid, so we use allow_empty to decide
    // whether we should allow it.
    // https://drafts.csswg.org/css-shapes-1/#typedef-basic-shape
    pub fn parse<'i, 't>(
        input: &mut Parser<'i, 't>,
        allow_empty: AllowEmpty,
    ) -> Result<Self, ParseError<'i>> {
        let location = input.current_source_location();
        let path_string = input.expect_string()?.as_ref();
        let (path, ok) = Self::parse_bytes(path_string.as_bytes());
        if !ok || (allow_empty == AllowEmpty::No && path.0.is_empty()) {
            return Err(location.new_custom_error(StyleParseErrorKind::UnspecifiedError))
        }
        return Ok(path);
    }

    /// As above, but just parsing the raw byte stream.
    ///
    /// Returns the (potentially empty or partial) path, and whether the parsing was ok or we found
    /// an error. The API is a bit weird because some SVG callers require "parse until first error"
    /// behavior.
    pub fn parse_bytes(input: &[u8]) -> (Self, bool) {
        // Parse the svg path string as multiple sub-paths.
        let mut ok = true;
        let mut path_parser = PathParser::new(input);

        while skip_wsp(&mut path_parser.chars) {
            if path_parser.parse_subpath().is_err() {
                ok = false;
                break;
            }
        }

        let path = Self(crate::ArcSlice::from_iter(path_parser.path.into_iter()));
        (path, ok)
    }

    /// Serializes to the path string, potentially including quotes.
    pub fn to_css<W>(&self, dest: &mut CssWriter<W>, quote: bool) -> fmt::Result
    where
        W: fmt::Write,
    {
        if quote {
            dest.write_char('"')?;
        }
        let mut writer = SequenceWriter::new(dest, " ");
        for command in self.commands() {
            writer.write_item(|inner| command.to_css_for_svg(inner))?;
        }
        if quote {
            dest.write_char('"')?;
        }
        Ok(())
    }
}

impl ToCss for SVGPathData {
    #[inline]
    fn to_css<W>(&self, dest: &mut CssWriter<W>) -> fmt::Result
    where
        W: fmt::Write,
    {
        self.to_css(dest, /* quote = */ true)
    }
}

impl Parse for SVGPathData {
    fn parse<'i, 't>(
        _context: &ParserContext,
        input: &mut Parser<'i, 't>,
    ) -> Result<Self, ParseError<'i>> {
        // Note that the EBNF allows the path data string in the d property to be empty, so we
        // don't reject empty SVG path data.
        // https://svgwg.org/svg2-draft/single-page.html#paths-PathDataBNF
        SVGPathData::parse(input, AllowEmpty::Yes)
    }
}

impl Animate for SVGPathData {
    fn animate(&self, other: &Self, procedure: Procedure) -> Result<Self, ()> {
        if self.0.len() != other.0.len() {
            return Err(());
        }

        // FIXME(emilio): This allocates three copies of the path, that's not
        // great! Specially, once we're normalized once, we don't need to
        // re-normalize again.
        let left = self.normalize();
        let right = other.normalize();

        let items: Vec<_> = lists::by_computed_value::animate(&left.0, &right.0, procedure)?;
        Ok(SVGPathData(crate::ArcSlice::from_iter(items.into_iter())))
    }
}

impl ComputeSquaredDistance for SVGPathData {
    fn compute_squared_distance(&self, other: &Self) -> Result<SquaredDistance, ()> {
        if self.0.len() != other.0.len() {
            return Err(());
        }
        let left = self.normalize();
        let right = other.normalize();
        lists::by_computed_value::squared_distance(&left.0, &right.0)
    }
}

/// The SVG path command.
/// The fields of these commands are self-explanatory, so we skip the documents.
/// Note: the index of the control points, e.g. control1, control2, are mapping to the control
/// points of the Bézier curve in the spec.
///
/// https://www.w3.org/TR/SVG11/paths.html#PathData
pub type PathCommand = GenericShapeCommand<CSSFloat, CSSFloat>;

/// For internal SVGPath normalization.
#[allow(missing_docs)]
struct PathTraversalState {
    subpath_start: CoordPair,
    pos: CoordPair,
}

impl PathCommand {
    /// Create a normalized copy of this PathCommand. Absolute commands will be copied as-is while
    /// for relative commands an equivalent absolute command will be returned.
    ///
    /// See discussion: https://github.com/w3c/svgwg/issues/321
    fn normalize(&self, state: &mut PathTraversalState) -> Self {
        use crate::values::generics::basic_shape::GenericShapeCommand::*;
        match *self {
            Close => {
                state.pos = state.subpath_start;
                Close
            },
            Move { by_to, mut point } => {
                if !by_to.is_abs() {
                    point += state.pos;
                }
                state.pos = point;
                state.subpath_start = point;
                Move {
                    by_to: ByTo::To,
                    point,
                }
            },
            Line { by_to, mut point } => {
                if !by_to.is_abs() {
                    point += state.pos;
                }
                state.pos = point;
                Line {
                    by_to: ByTo::To,
                    point,
                }
            },
            HLine { by_to, mut x } => {
                if !by_to.is_abs() {
                    x += state.pos.x;
                }
                state.pos.x = x;
                HLine { by_to: ByTo::To, x }
            },
            VLine { by_to, mut y } => {
                if !by_to.is_abs() {
                    y += state.pos.y;
                }
                state.pos.y = y;
                VLine { by_to: ByTo::To, y }
            },
            CubicCurve {
                by_to,
                mut point,
                mut control1,
                mut control2,
            } => {
                if !by_to.is_abs() {
                    point += state.pos;
                    control1 += state.pos;
                    control2 += state.pos;
                }
                state.pos = point;
                CubicCurve {
                    by_to: ByTo::To,
                    point,
                    control1,
                    control2,
                }
            },
            QuadCurve {
                by_to,
                mut point,
                mut control1,
            } => {
                if !by_to.is_abs() {
                    point += state.pos;
                    control1 += state.pos;
                }
                state.pos = point;
                QuadCurve {
                    by_to: ByTo::To,
                    point,
                    control1,
                }
            },
            SmoothCubic {
                by_to,
                mut point,
                mut control2,
            } => {
                if !by_to.is_abs() {
                    point += state.pos;
                    control2 += state.pos;
                }
                state.pos = point;
                SmoothCubic {
                    by_to: ByTo::To,
                    point,
                    control2,
                }
            },
            SmoothQuad { by_to, mut point } => {
                if !by_to.is_abs() {
                    point += state.pos;
                }
                state.pos = point;
                SmoothQuad {
                    by_to: ByTo::To,
                    point,
                }
            },
            Arc {
                by_to,
                mut point,
                radii,
                arc_sweep,
                arc_size,
                rotate,
            } => {
                if !by_to.is_abs() {
                    point += state.pos;
                }
                state.pos = point;
                Arc {
                    by_to: ByTo::To,
                    point,
                    radii,
                    arc_sweep,
                    arc_size,
                    rotate,
                }
            },
        }
    }

    /// The serialization of the svg path.
    fn to_css_for_svg<W>(&self, dest: &mut CssWriter<W>) -> fmt::Result
    where
        W: fmt::Write,
    {
        use crate::values::generics::basic_shape::GenericShapeCommand::*;
        match *self {
            Close => dest.write_char('Z'),
            Move { by_to, point } => {
                dest.write_char(if by_to.is_abs() { 'M' } else { 'm' })?;
                dest.write_char(' ')?;
                point.to_css(dest)
            },
            Line { by_to, point } => {
                dest.write_char(if by_to.is_abs() { 'L' } else { 'l' })?;
                dest.write_char(' ')?;
                point.to_css(dest)
            },
            CubicCurve {
                by_to,
                point,
                control1,
                control2,
            } => {
                dest.write_char(if by_to.is_abs() { 'C' } else { 'c' })?;
                dest.write_char(' ')?;
                control1.to_css(dest)?;
                dest.write_char(' ')?;
                control2.to_css(dest)?;
                dest.write_char(' ')?;
                point.to_css(dest)
            },
            QuadCurve {
                by_to,
                point,
                control1,
            } => {
                dest.write_char(if by_to.is_abs() { 'Q' } else { 'q' })?;
                dest.write_char(' ')?;
                control1.to_css(dest)?;
                dest.write_char(' ')?;
                point.to_css(dest)
            },
            Arc {
                by_to,
                point,
                radii,
                arc_sweep,
                arc_size,
                rotate,
            } => {
                dest.write_char(if by_to.is_abs() { 'A' } else { 'a' })?;
                dest.write_char(' ')?;
                radii.to_css(dest)?;
                dest.write_char(' ')?;
                rotate.to_css(dest)?;
                dest.write_char(' ')?;
                (arc_size as i32).to_css(dest)?;
                dest.write_char(' ')?;
                (arc_sweep as i32).to_css(dest)?;
                dest.write_char(' ')?;
                point.to_css(dest)
            },
            HLine { by_to, x } => {
                dest.write_char(if by_to.is_abs() { 'H' } else { 'h' })?;
                dest.write_char(' ')?;
                x.to_css(dest)
            },
            VLine { by_to, y } => {
                dest.write_char(if by_to.is_abs() { 'V' } else { 'v' })?;
                dest.write_char(' ')?;
                y.to_css(dest)
            },
            SmoothCubic {
                by_to,
                point,
                control2,
            } => {
                dest.write_char(if by_to.is_abs() { 'S' } else { 's' })?;
                dest.write_char(' ')?;
                control2.to_css(dest)?;
                dest.write_char(' ')?;
                point.to_css(dest)
            },
            SmoothQuad { by_to, point } => {
                dest.write_char(if by_to.is_abs() { 'T' } else { 't' })?;
                dest.write_char(' ')?;
                point.to_css(dest)
            },
        }
    }
}

/// The path coord type.
pub type CoordPair = CoordinatePair<CSSFloat>;

/// SVG Path parser.
struct PathParser<'a> {
    chars: Peekable<Cloned<slice::Iter<'a, u8>>>,
    path: Vec<PathCommand>,
}

macro_rules! parse_arguments {
    (
        $parser:ident,
        $by_to:ident,
        $enum:ident,
        [ $para:ident => $func:ident $(, $other_para:ident => $other_func:ident)* ]
    ) => {
        {
            loop {
                let $para = $func(&mut $parser.chars)?;
                $(
                    skip_comma_wsp(&mut $parser.chars);
                    let $other_para = $other_func(&mut $parser.chars)?;
                )*
                $parser.path.push(
                    PathCommand::$enum { $by_to, $para $(, $other_para)* }
                );

                // End of string or the next character is a possible new command.
                if !skip_wsp(&mut $parser.chars) ||
                   $parser.chars.peek().map_or(true, |c| c.is_ascii_alphabetic()) {
                    break;
                }
                skip_comma_wsp(&mut $parser.chars);
            }
            Ok(())
        }
    }
}

impl<'a> PathParser<'a> {
    /// Return a PathParser.
    #[inline]
    fn new(bytes: &'a [u8]) -> Self {
        PathParser {
            chars: bytes.iter().cloned().peekable(),
            path: Vec::new(),
        }
    }

    /// Parse a sub-path.
    fn parse_subpath(&mut self) -> Result<(), ()> {
        // Handle "moveto" Command first. If there is no "moveto", this is not a valid sub-path
        // (i.e. not a valid moveto-drawto-command-group).
        self.parse_moveto()?;

        // Handle other commands.
        loop {
            skip_wsp(&mut self.chars);
            if self.chars.peek().map_or(true, |&m| m == b'M' || m == b'm') {
                break;
            }

            let command = self.chars.next().unwrap();
            let by_to = if command.is_ascii_uppercase() {
                ByTo::To
            } else {
                ByTo::By
            };

            skip_wsp(&mut self.chars);
            match command {
                b'Z' | b'z' => self.parse_closepath(),
                b'L' | b'l' => self.parse_lineto(by_to),
                b'H' | b'h' => self.parse_h_lineto(by_to),
                b'V' | b'v' => self.parse_v_lineto(by_to),
                b'C' | b'c' => self.parse_curveto(by_to),
                b'S' | b's' => self.parse_smooth_curveto(by_to),
                b'Q' | b'q' => self.parse_quadratic_bezier_curveto(by_to),
                b'T' | b't' => self.parse_smooth_quadratic_bezier_curveto(by_to),
                b'A' | b'a' => self.parse_elliptical_arc(by_to),
                _ => return Err(()),
            }?;
        }
        Ok(())
    }

    /// Parse "moveto" command.
    fn parse_moveto(&mut self) -> Result<(), ()> {
        let command = match self.chars.next() {
            Some(c) if c == b'M' || c == b'm' => c,
            _ => return Err(()),
        };

        skip_wsp(&mut self.chars);
        let point = parse_coord(&mut self.chars)?;
        let by_to = if command == b'M' { ByTo::To } else { ByTo::By };
        self.path.push(PathCommand::Move { by_to, point });

        // End of string or the next character is a possible new command.
        if !skip_wsp(&mut self.chars) || self.chars.peek().map_or(true, |c| c.is_ascii_alphabetic())
        {
            return Ok(());
        }
        skip_comma_wsp(&mut self.chars);

        // If a moveto is followed by multiple pairs of coordinates, the subsequent
        // pairs are treated as implicit lineto commands.
        self.parse_lineto(by_to)
    }

    /// Parse "closepath" command.
    fn parse_closepath(&mut self) -> Result<(), ()> {
        self.path.push(PathCommand::Close);
        Ok(())
    }

    /// Parse "lineto" command.
    fn parse_lineto(&mut self, by_to: ByTo) -> Result<(), ()> {
        parse_arguments!(self, by_to, Line, [ point => parse_coord ])
    }

    /// Parse horizontal "lineto" command.
    fn parse_h_lineto(&mut self, by_to: ByTo) -> Result<(), ()> {
        parse_arguments!(self, by_to, HLine, [ x => parse_number ])
    }

    /// Parse vertical "lineto" command.
    fn parse_v_lineto(&mut self, by_to: ByTo) -> Result<(), ()> {
        parse_arguments!(self, by_to, VLine, [ y => parse_number ])
    }

    /// Parse cubic Bézier curve command.
    fn parse_curveto(&mut self, by_to: ByTo) -> Result<(), ()> {
        parse_arguments!(self, by_to, CubicCurve, [
            control1 => parse_coord, control2 => parse_coord, point => parse_coord
        ])
    }

    /// Parse smooth "curveto" command.
    fn parse_smooth_curveto(&mut self, by_to: ByTo) -> Result<(), ()> {
        parse_arguments!(self, by_to, SmoothCubic, [
            control2 => parse_coord, point => parse_coord
        ])
    }

    /// Parse quadratic Bézier curve command.
    fn parse_quadratic_bezier_curveto(&mut self, by_to: ByTo) -> Result<(), ()> {
        parse_arguments!(self, by_to, QuadCurve, [
            control1 => parse_coord, point => parse_coord
        ])
    }

    /// Parse smooth quadratic Bézier curveto command.
    fn parse_smooth_quadratic_bezier_curveto(&mut self, by_to: ByTo) -> Result<(), ()> {
        parse_arguments!(self, by_to, SmoothQuad, [ point => parse_coord ])
    }

    /// Parse elliptical arc curve command.
    fn parse_elliptical_arc(&mut self, by_to: ByTo) -> Result<(), ()> {
        // Parse a flag whose value is '0' or '1'; otherwise, return Err(()).
        let parse_arc_size = |iter: &mut Peekable<Cloned<slice::Iter<u8>>>| match iter.next() {
            Some(c) if c == b'1' => Ok(ArcSize::Large),
            Some(c) if c == b'0' => Ok(ArcSize::Small),
            _ => Err(()),
        };
        let parse_arc_sweep = |iter: &mut Peekable<Cloned<slice::Iter<u8>>>| match iter.next() {
            Some(c) if c == b'1' => Ok(ArcSweep::Cw),
            Some(c) if c == b'0' => Ok(ArcSweep::Ccw),
            _ => Err(()),
        };
        parse_arguments!(self, by_to, Arc, [
            radii => parse_coord,
            rotate => parse_number,
            arc_size => parse_arc_size,
            arc_sweep => parse_arc_sweep,
            point => parse_coord
        ])
    }
}

/// Parse a pair of numbers into CoordPair.
fn parse_coord(iter: &mut Peekable<Cloned<slice::Iter<u8>>>) -> Result<CoordPair, ()> {
    let x = parse_number(iter)?;
    skip_comma_wsp(iter);
    let y = parse_number(iter)?;
    Ok(CoordPair::new(x, y))
}

/// This is a special version which parses the number for SVG Path. e.g. "M 0.6.5" should be parsed
/// as MoveTo with a coordinate of ("0.6", ".5"), instead of treating 0.6.5 as a non-valid floating
/// point number. In other words, the logic here is similar with that of
/// tokenizer::consume_numeric, which also consumes the number as many as possible, but here the
/// input is a Peekable and we only accept an integer of a floating point number.
///
/// The "number" syntax in https://www.w3.org/TR/SVG/paths.html#PathDataBNF
fn parse_number(iter: &mut Peekable<Cloned<slice::Iter<u8>>>) -> Result<CSSFloat, ()> {
    // 1. Check optional sign.
    let sign = if iter
        .peek()
        .map_or(false, |&sign| sign == b'+' || sign == b'-')
    {
        if iter.next().unwrap() == b'-' {
            -1.
        } else {
            1.
        }
    } else {
        1.
    };

    // 2. Check integer part.
    let mut integral_part: f64 = 0.;
    let got_dot = if !iter.peek().map_or(false, |&n| n == b'.') {
        // If the first digit in integer part is neither a dot nor a digit, this is not a number.
        if iter.peek().map_or(true, |n| !n.is_ascii_digit()) {
            return Err(());
        }

        while iter.peek().map_or(false, |n| n.is_ascii_digit()) {
            integral_part = integral_part * 10. + (iter.next().unwrap() - b'0') as f64;
        }

        iter.peek().map_or(false, |&n| n == b'.')
    } else {
        true
    };

    // 3. Check fractional part.
    let mut fractional_part: f64 = 0.;
    if got_dot {
        // Consume '.'.
        iter.next();
        // If the first digit in fractional part is not a digit, this is not a number.
        if iter.peek().map_or(true, |n| !n.is_ascii_digit()) {
            return Err(());
        }

        let mut factor = 0.1;
        while iter.peek().map_or(false, |n| n.is_ascii_digit()) {
            fractional_part += (iter.next().unwrap() - b'0') as f64 * factor;
            factor *= 0.1;
        }
    }

    let mut value = sign * (integral_part + fractional_part);

    // 4. Check exp part. The segment name of SVG Path doesn't include 'E' or 'e', so it's ok to
    //    treat the numbers after 'E' or 'e' are in the exponential part.
    if iter.peek().map_or(false, |&exp| exp == b'E' || exp == b'e') {
        // Consume 'E' or 'e'.
        iter.next();
        let exp_sign = if iter
            .peek()
            .map_or(false, |&sign| sign == b'+' || sign == b'-')
        {
            if iter.next().unwrap() == b'-' {
                -1.
            } else {
                1.
            }
        } else {
            1.
        };

        let mut exp: f64 = 0.;
        while iter.peek().map_or(false, |n| n.is_ascii_digit()) {
            exp = exp * 10. + (iter.next().unwrap() - b'0') as f64;
        }

        value *= f64::powf(10., exp * exp_sign);
    }

    if value.is_finite() {
        Ok(value.min(f32::MAX as f64).max(f32::MIN as f64) as CSSFloat)
    } else {
        Err(())
    }
}

/// Skip all svg whitespaces, and return true if |iter| hasn't finished.
#[inline]
fn skip_wsp(iter: &mut Peekable<Cloned<slice::Iter<u8>>>) -> bool {
    // Note: SVG 1.1 defines the whitespaces as \u{9}, \u{20}, \u{A}, \u{D}.
    //       However, SVG 2 has one extra whitespace: \u{C}.
    //       Therefore, we follow the newest spec for the definition of whitespace,
    //       i.e. \u{9}, \u{20}, \u{A}, \u{C}, \u{D}.
    while iter.peek().map_or(false, |c| c.is_ascii_whitespace()) {
        iter.next();
    }
    iter.peek().is_some()
}

/// Skip all svg whitespaces and one comma, and return true if |iter| hasn't finished.
#[inline]
fn skip_comma_wsp(iter: &mut Peekable<Cloned<slice::Iter<u8>>>) -> bool {
    if !skip_wsp(iter) {
        return false;
    }

    if *iter.peek().unwrap() != b',' {
        return true;
    }
    iter.next();

    skip_wsp(iter)
}

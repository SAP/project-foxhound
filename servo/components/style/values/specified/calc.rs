/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

//! [Calc expressions][calc].
//!
//! [calc]: https://drafts.csswg.org/css-values/#calc-notation

use crate::color::parsing::{AngleOrNumber, NumberOrPercentage};
use crate::parser::ParserContext;
use crate::values::generics::calc::{
    self as generic, CalcNodeLeaf, CalcUnits, MinMaxOp, ModRemOp, PositivePercentageBasis,
    RoundingStrategy, SortKey,
};
use crate::values::specified::length::{AbsoluteLength, FontRelativeLength, NoCalcLength};
use crate::values::specified::length::{ContainerRelativeLength, ViewportPercentageLength};
use crate::values::specified::{self, Angle, Resolution, Time};
use crate::values::{serialize_number, serialize_percentage, CSSFloat, CSSInteger};
use cssparser::{CowRcStr, Parser, Token};
use smallvec::SmallVec;
use std::cmp;
use std::fmt::{self, Write};
use style_traits::values::specified::AllowedNumericType;
use style_traits::{CssWriter, ParseError, SpecifiedValueInfo, StyleParseErrorKind, ToCss};

/// The name of the mathematical function that we're parsing.
#[derive(Clone, Copy, Debug, Parse)]
pub enum MathFunction {
    /// `calc()`: https://drafts.csswg.org/css-values-4/#funcdef-calc
    Calc,
    /// `min()`: https://drafts.csswg.org/css-values-4/#funcdef-min
    Min,
    /// `max()`: https://drafts.csswg.org/css-values-4/#funcdef-max
    Max,
    /// `clamp()`: https://drafts.csswg.org/css-values-4/#funcdef-clamp
    Clamp,
    /// `round()`: https://drafts.csswg.org/css-values-4/#funcdef-round
    Round,
    /// `mod()`: https://drafts.csswg.org/css-values-4/#funcdef-mod
    Mod,
    /// `rem()`: https://drafts.csswg.org/css-values-4/#funcdef-rem
    Rem,
    /// `sin()`: https://drafts.csswg.org/css-values-4/#funcdef-sin
    Sin,
    /// `cos()`: https://drafts.csswg.org/css-values-4/#funcdef-cos
    Cos,
    /// `tan()`: https://drafts.csswg.org/css-values-4/#funcdef-tan
    Tan,
    /// `asin()`: https://drafts.csswg.org/css-values-4/#funcdef-asin
    Asin,
    /// `acos()`: https://drafts.csswg.org/css-values-4/#funcdef-acos
    Acos,
    /// `atan()`: https://drafts.csswg.org/css-values-4/#funcdef-atan
    Atan,
    /// `atan2()`: https://drafts.csswg.org/css-values-4/#funcdef-atan2
    Atan2,
    /// `pow()`: https://drafts.csswg.org/css-values-4/#funcdef-pow
    Pow,
    /// `sqrt()`: https://drafts.csswg.org/css-values-4/#funcdef-sqrt
    Sqrt,
    /// `hypot()`: https://drafts.csswg.org/css-values-4/#funcdef-hypot
    Hypot,
    /// `log()`: https://drafts.csswg.org/css-values-4/#funcdef-log
    Log,
    /// `exp()`: https://drafts.csswg.org/css-values-4/#funcdef-exp
    Exp,
    /// `abs()`: https://drafts.csswg.org/css-values-4/#funcdef-abs
    Abs,
    /// `sign()`: https://drafts.csswg.org/css-values-4/#funcdef-sign
    Sign,
}

/// A leaf node inside a `Calc` expression's AST.
#[derive(Clone, Debug, MallocSizeOf, PartialEq, ToShmem)]
pub enum Leaf {
    /// `<length>`
    Length(NoCalcLength),
    /// `<angle>`
    Angle(Angle),
    /// `<time>`
    Time(Time),
    /// `<resolution>`
    Resolution(Resolution),
    /// `<percentage>`
    Percentage(CSSFloat),
    /// `<number>`
    Number(CSSFloat),
}

impl Leaf {
    fn as_length(&self) -> Option<&NoCalcLength> {
        match *self {
            Self::Length(ref l) => Some(l),
            _ => None,
        }
    }
}

impl ToCss for Leaf {
    fn to_css<W>(&self, dest: &mut CssWriter<W>) -> fmt::Result
    where
        W: Write,
    {
        match *self {
            Self::Length(ref l) => l.to_css(dest),
            Self::Number(n) => serialize_number(n, /* was_calc = */ false, dest),
            Self::Resolution(ref r) => r.to_css(dest),
            Self::Percentage(p) => serialize_percentage(p, dest),
            Self::Angle(ref a) => a.to_css(dest),
            Self::Time(ref t) => t.to_css(dest),
        }
    }
}

/// A struct to hold a simplified `<length>` or `<percentage>` expression.
///
/// In some cases, e.g. DOMMatrix, we support calc(), but reject all the
/// relative lengths, and to_computed_pixel_length_without_context() handles
/// this case. Therefore, if you want to add a new field, please make sure this
/// function work properly.
#[derive(Clone, Debug, MallocSizeOf, PartialEq, ToCss, ToShmem)]
#[allow(missing_docs)]
pub struct CalcLengthPercentage {
    #[css(skip)]
    pub clamping_mode: AllowedNumericType,
    pub node: CalcNode,
}

impl CalcLengthPercentage {
    fn same_unit_length_as(a: &Self, b: &Self) -> Option<(CSSFloat, CSSFloat)> {
        debug_assert_eq!(a.clamping_mode, b.clamping_mode);
        debug_assert_eq!(a.clamping_mode, AllowedNumericType::All);

        let a = a.node.as_leaf()?;
        let b = b.node.as_leaf()?;

        if a.sort_key() != b.sort_key() {
            return None;
        }

        let a = a.as_length()?.unitless_value();
        let b = b.as_length()?.unitless_value();
        return Some((a, b));
    }
}

impl SpecifiedValueInfo for CalcLengthPercentage {}

impl generic::CalcNodeLeaf for Leaf {
    fn unit(&self) -> CalcUnits {
        match self {
            Leaf::Length(_) => CalcUnits::LENGTH,
            Leaf::Angle(_) => CalcUnits::ANGLE,
            Leaf::Time(_) => CalcUnits::TIME,
            Leaf::Resolution(_) => CalcUnits::RESOLUTION,
            Leaf::Percentage(_) => CalcUnits::PERCENTAGE,
            Leaf::Number(_) => CalcUnits::empty(),
        }
    }

    fn unitless_value(&self) -> f32 {
        match *self {
            Self::Length(ref l) => l.unitless_value(),
            Self::Percentage(n) | Self::Number(n) => n,
            Self::Resolution(ref r) => r.dppx(),
            Self::Angle(ref a) => a.degrees(),
            Self::Time(ref t) => t.seconds(),
        }
    }

    fn new_number(value: f32) -> Self {
        Self::Number(value)
    }

    fn compare(&self, other: &Self, basis: PositivePercentageBasis) -> Option<cmp::Ordering> {
        use self::Leaf::*;

        if std::mem::discriminant(self) != std::mem::discriminant(other) {
            return None;
        }

        match (self, other) {
            (&Percentage(ref one), &Percentage(ref other)) => match basis {
                PositivePercentageBasis::Yes => one.partial_cmp(other),
                PositivePercentageBasis::Unknown => None,
            },
            (&Length(ref one), &Length(ref other)) => one.partial_cmp(other),
            (&Angle(ref one), &Angle(ref other)) => one.degrees().partial_cmp(&other.degrees()),
            (&Time(ref one), &Time(ref other)) => one.seconds().partial_cmp(&other.seconds()),
            (&Resolution(ref one), &Resolution(ref other)) => one.dppx().partial_cmp(&other.dppx()),
            (&Number(ref one), &Number(ref other)) => one.partial_cmp(other),
            _ => {
                match *self {
                    Length(..) | Percentage(..) | Angle(..) | Time(..) | Number(..) |
                    Resolution(..) => {},
                }
                unsafe {
                    debug_unreachable!("Forgot a branch?");
                }
            },
        }
    }

    fn as_number(&self) -> Option<f32> {
        match *self {
            Leaf::Length(_) |
            Leaf::Angle(_) |
            Leaf::Time(_) |
            Leaf::Resolution(_) |
            Leaf::Percentage(_) => None,
            Leaf::Number(value) => Some(value),
        }
    }

    fn sort_key(&self) -> SortKey {
        match *self {
            Self::Number(..) => SortKey::Number,
            Self::Percentage(..) => SortKey::Percentage,
            Self::Time(..) => SortKey::Sec,
            Self::Resolution(..) => SortKey::Dppx,
            Self::Angle(..) => SortKey::Deg,
            Self::Length(ref l) => match *l {
                NoCalcLength::Absolute(..) => SortKey::Px,
                NoCalcLength::FontRelative(ref relative) => match *relative {
                    FontRelativeLength::Ch(..) => SortKey::Ch,
                    FontRelativeLength::Em(..) => SortKey::Em,
                    FontRelativeLength::Ex(..) => SortKey::Ex,
                    FontRelativeLength::Cap(..) => SortKey::Cap,
                    FontRelativeLength::Ic(..) => SortKey::Ic,
                    FontRelativeLength::Rem(..) => SortKey::Rem,
                    FontRelativeLength::Lh(..) => SortKey::Lh,
                    FontRelativeLength::Rlh(..) => SortKey::Rlh,
                },
                NoCalcLength::ViewportPercentage(ref vp) => match *vp {
                    ViewportPercentageLength::Vh(..) => SortKey::Vh,
                    ViewportPercentageLength::Svh(..) => SortKey::Svh,
                    ViewportPercentageLength::Lvh(..) => SortKey::Lvh,
                    ViewportPercentageLength::Dvh(..) => SortKey::Dvh,
                    ViewportPercentageLength::Vw(..) => SortKey::Vw,
                    ViewportPercentageLength::Svw(..) => SortKey::Svw,
                    ViewportPercentageLength::Lvw(..) => SortKey::Lvw,
                    ViewportPercentageLength::Dvw(..) => SortKey::Dvw,
                    ViewportPercentageLength::Vmax(..) => SortKey::Vmax,
                    ViewportPercentageLength::Svmax(..) => SortKey::Svmax,
                    ViewportPercentageLength::Lvmax(..) => SortKey::Lvmax,
                    ViewportPercentageLength::Dvmax(..) => SortKey::Dvmax,
                    ViewportPercentageLength::Vmin(..) => SortKey::Vmin,
                    ViewportPercentageLength::Svmin(..) => SortKey::Svmin,
                    ViewportPercentageLength::Lvmin(..) => SortKey::Lvmin,
                    ViewportPercentageLength::Dvmin(..) => SortKey::Dvmin,
                    ViewportPercentageLength::Vb(..) => SortKey::Vb,
                    ViewportPercentageLength::Svb(..) => SortKey::Svb,
                    ViewportPercentageLength::Lvb(..) => SortKey::Lvb,
                    ViewportPercentageLength::Dvb(..) => SortKey::Dvb,
                    ViewportPercentageLength::Vi(..) => SortKey::Vi,
                    ViewportPercentageLength::Svi(..) => SortKey::Svi,
                    ViewportPercentageLength::Lvi(..) => SortKey::Lvi,
                    ViewportPercentageLength::Dvi(..) => SortKey::Dvi,
                },
                NoCalcLength::ContainerRelative(ref cq) => match *cq {
                    ContainerRelativeLength::Cqw(..) => SortKey::Cqw,
                    ContainerRelativeLength::Cqh(..) => SortKey::Cqh,
                    ContainerRelativeLength::Cqi(..) => SortKey::Cqi,
                    ContainerRelativeLength::Cqb(..) => SortKey::Cqb,
                    ContainerRelativeLength::Cqmin(..) => SortKey::Cqmin,
                    ContainerRelativeLength::Cqmax(..) => SortKey::Cqmax,
                },
                NoCalcLength::ServoCharacterWidth(..) => unreachable!(),
            },
        }
    }

    fn simplify(&mut self) {
        if let Self::Length(NoCalcLength::Absolute(ref mut abs)) = *self {
            *abs = AbsoluteLength::Px(abs.to_px());
        }
    }

    /// Tries to merge one sum to another, that is, perform `x` + `y`.
    ///
    /// Only handles leaf nodes, it's the caller's responsibility to simplify
    /// them before calling this if needed.
    fn try_sum_in_place(&mut self, other: &Self) -> Result<(), ()> {
        use self::Leaf::*;

        if std::mem::discriminant(self) != std::mem::discriminant(other) {
            return Err(());
        }

        match (self, other) {
            (&mut Number(ref mut one), &Number(ref other)) |
            (&mut Percentage(ref mut one), &Percentage(ref other)) => {
                *one += *other;
            },
            (&mut Angle(ref mut one), &Angle(ref other)) => {
                *one = specified::Angle::from_calc(one.degrees() + other.degrees());
            },
            (&mut Time(ref mut one), &Time(ref other)) => {
                *one = specified::Time::from_seconds(one.seconds() + other.seconds());
            },
            (&mut Resolution(ref mut one), &Resolution(ref other)) => {
                *one = specified::Resolution::from_dppx(one.dppx() + other.dppx());
            },
            (&mut Length(ref mut one), &Length(ref other)) => {
                *one = one.try_op(other, std::ops::Add::add)?;
            },
            _ => {
                match *other {
                    Number(..) | Percentage(..) | Angle(..) | Time(..) | Resolution(..) |
                    Length(..) => {},
                }
                unsafe {
                    debug_unreachable!();
                }
            },
        }

        Ok(())
    }

    fn try_product_in_place(&mut self, other: &mut Self) -> bool {
        if let Self::Number(ref mut left) = *self {
            if let Self::Number(ref right) = *other {
                // Both sides are numbers, so we can just modify the left side.
                *left *= *right;
                true
            } else {
                // The right side is not a number, so the result should be in the units of the right
                // side.
                other.map(|v| v * *left);
                std::mem::swap(self, other);
                true
            }
        } else if let Self::Number(ref right) = *other {
            // The left side is not a number, but the right side is, so the result is the left
            // side unit.
            self.map(|v| v * *right);
            true
        } else {
            // Neither side is a number, so a product is not possible.
            false
        }
    }

    fn try_op<O>(&self, other: &Self, op: O) -> Result<Self, ()>
    where
        O: Fn(f32, f32) -> f32,
    {
        use self::Leaf::*;

        if std::mem::discriminant(self) != std::mem::discriminant(other) {
            return Err(());
        }

        match (self, other) {
            (&Number(one), &Number(other)) => {
                return Ok(Leaf::Number(op(one, other)));
            },
            (&Percentage(one), &Percentage(other)) => {
                return Ok(Leaf::Percentage(op(one, other)));
            },
            (&Angle(ref one), &Angle(ref other)) => {
                return Ok(Leaf::Angle(specified::Angle::from_calc(op(
                    one.degrees(),
                    other.degrees(),
                ))));
            },
            (&Resolution(ref one), &Resolution(ref other)) => {
                return Ok(Leaf::Resolution(specified::Resolution::from_dppx(op(
                    one.dppx(),
                    other.dppx(),
                ))));
            },
            (&Time(ref one), &Time(ref other)) => {
                return Ok(Leaf::Time(specified::Time::from_seconds(op(
                    one.seconds(),
                    other.seconds(),
                ))));
            },
            (&Length(ref one), &Length(ref other)) => {
                return Ok(Leaf::Length(one.try_op(other, op)?));
            },
            _ => {
                match *other {
                    Number(..) | Percentage(..) | Angle(..) | Time(..) | Length(..) |
                    Resolution(..) => {},
                }
                unsafe {
                    debug_unreachable!();
                }
            },
        }
    }

    fn map(&mut self, mut op: impl FnMut(f32) -> f32) {
        match self {
            Leaf::Length(one) => *one = one.map(op),
            Leaf::Angle(one) => *one = specified::Angle::from_calc(op(one.degrees())),
            Leaf::Time(one) => *one = specified::Time::from_seconds(op(one.seconds())),
            Leaf::Resolution(one) => *one = specified::Resolution::from_dppx(op(one.dppx())),
            Leaf::Percentage(one) => *one = op(*one),
            Leaf::Number(one) => *one = op(*one),
        }
    }
}

/// A calc node representation for specified values.
pub type CalcNode = generic::GenericCalcNode<Leaf>;

impl CalcNode {
    /// Tries to parse a single element in the expression, that is, a
    /// `<length>`, `<angle>`, `<time>`, `<percentage>`, `<resolution>`, etc.
    ///
    /// May return a "complex" `CalcNode`, in the presence of a parenthesized
    /// expression, for example.
    fn parse_one<'i, 't>(
        context: &ParserContext,
        input: &mut Parser<'i, 't>,
        allowed_units: CalcUnits,
    ) -> Result<Self, ParseError<'i>> {
        let location = input.current_source_location();
        match input.next()? {
            &Token::Number { value, .. } => Ok(CalcNode::Leaf(Leaf::Number(value))),
            &Token::Dimension {
                value, ref unit, ..
            } => {
                if allowed_units.intersects(CalcUnits::LENGTH) {
                    if let Ok(l) = NoCalcLength::parse_dimension(context, value, unit) {
                        return Ok(CalcNode::Leaf(Leaf::Length(l)));
                    }
                }
                if allowed_units.intersects(CalcUnits::ANGLE) {
                    if let Ok(a) = Angle::parse_dimension(value, unit, /* from_calc = */ true) {
                        return Ok(CalcNode::Leaf(Leaf::Angle(a)));
                    }
                }
                if allowed_units.intersects(CalcUnits::TIME) {
                    if let Ok(t) = Time::parse_dimension(value, unit) {
                        return Ok(CalcNode::Leaf(Leaf::Time(t)));
                    }
                }
                if allowed_units.intersects(CalcUnits::RESOLUTION) {
                    if let Ok(t) = Resolution::parse_dimension(value, unit) {
                        return Ok(CalcNode::Leaf(Leaf::Resolution(t)));
                    }
                }
                return Err(location.new_custom_error(StyleParseErrorKind::UnspecifiedError));
            },
            &Token::Percentage { unit_value, .. }
                if allowed_units.intersects(CalcUnits::PERCENTAGE) =>
            {
                Ok(CalcNode::Leaf(Leaf::Percentage(unit_value)))
            },
            &Token::ParenthesisBlock => input.parse_nested_block(|input| {
                CalcNode::parse_argument(context, input, allowed_units)
            }),
            &Token::Function(ref name) => {
                let function = CalcNode::math_function(context, name, location)?;
                CalcNode::parse(context, input, function, allowed_units)
            },
            &Token::Ident(ref ident) => {
                let number = match_ignore_ascii_case! { &**ident,
                    "e" => std::f32::consts::E,
                    "pi" => std::f32::consts::PI,
                    "infinity" => f32::INFINITY,
                    "-infinity" => f32::NEG_INFINITY,
                    "nan" => f32::NAN,
                    _ => return Err(location.new_unexpected_token_error(Token::Ident(ident.clone()))),
                };
                Ok(CalcNode::Leaf(Leaf::Number(number)))
            },
            t => Err(location.new_unexpected_token_error(t.clone())),
        }
    }

    /// Parse a top-level `calc` expression, with all nested sub-expressions.
    ///
    /// This is in charge of parsing, for example, `2 + 3 * 100%`.
    fn parse<'i, 't>(
        context: &ParserContext,
        input: &mut Parser<'i, 't>,
        function: MathFunction,
        allowed_units: CalcUnits,
    ) -> Result<Self, ParseError<'i>> {
        input.parse_nested_block(|input| {
            match function {
                MathFunction::Calc => Self::parse_argument(context, input, allowed_units),
                MathFunction::Clamp => {
                    let min = Self::parse_argument(context, input, allowed_units)?;
                    input.expect_comma()?;
                    let center = Self::parse_argument(context, input, allowed_units)?;
                    input.expect_comma()?;
                    let max = Self::parse_argument(context, input, allowed_units)?;
                    Ok(Self::Clamp {
                        min: Box::new(min),
                        center: Box::new(center),
                        max: Box::new(max),
                    })
                },
                MathFunction::Round => {
                    let strategy = input.try_parse(parse_rounding_strategy);

                    // <rounding-strategy> = nearest | up | down | to-zero
                    // https://drafts.csswg.org/css-values-4/#calc-syntax
                    fn parse_rounding_strategy<'i, 't>(
                        input: &mut Parser<'i, 't>,
                    ) -> Result<RoundingStrategy, ParseError<'i>> {
                        Ok(try_match_ident_ignore_ascii_case! { input,
                            "nearest" => RoundingStrategy::Nearest,
                            "up" => RoundingStrategy::Up,
                            "down" => RoundingStrategy::Down,
                            "to-zero" => RoundingStrategy::ToZero,
                        })
                    }

                    if strategy.is_ok() {
                        input.expect_comma()?;
                    }

                    let value = Self::parse_argument(context, input, allowed_units)?;
                    input.expect_comma()?;
                    let step = Self::parse_argument(context, input, allowed_units)?;

                    Ok(Self::Round {
                        strategy: strategy.unwrap_or(RoundingStrategy::Nearest),
                        value: Box::new(value),
                        step: Box::new(step),
                    })
                },
                MathFunction::Mod | MathFunction::Rem => {
                    let dividend = Self::parse_argument(context, input, allowed_units)?;
                    input.expect_comma()?;
                    let divisor = Self::parse_argument(context, input, allowed_units)?;

                    let op = match function {
                        MathFunction::Mod => ModRemOp::Mod,
                        MathFunction::Rem => ModRemOp::Rem,
                        _ => unreachable!(),
                    };
                    Ok(Self::ModRem {
                        dividend: Box::new(dividend),
                        divisor: Box::new(divisor),
                        op,
                    })
                },
                MathFunction::Min | MathFunction::Max => {
                    // TODO(emilio): The common case for parse_comma_separated
                    // is just one element, but for min / max is two, really...
                    //
                    // Consider adding an API to cssparser to specify the
                    // initial vector capacity?
                    let arguments = input.parse_comma_separated(|input| {
                        Self::parse_argument(context, input, allowed_units)
                    })?;

                    let op = match function {
                        MathFunction::Min => MinMaxOp::Min,
                        MathFunction::Max => MinMaxOp::Max,
                        _ => unreachable!(),
                    };

                    Ok(Self::MinMax(arguments.into(), op))
                },
                MathFunction::Sin | MathFunction::Cos | MathFunction::Tan => {
                    let a = Self::parse_angle_argument(context, input)?;

                    let number = match function {
                        MathFunction::Sin => a.sin(),
                        MathFunction::Cos => a.cos(),
                        MathFunction::Tan => a.tan(),
                        _ => unsafe {
                            debug_unreachable!("We just checked!");
                        },
                    };

                    Ok(Self::Leaf(Leaf::Number(number)))
                },
                MathFunction::Asin | MathFunction::Acos | MathFunction::Atan => {
                    let a = Self::parse_number_argument(context, input)?;

                    let radians = match function {
                        MathFunction::Asin => a.asin(),
                        MathFunction::Acos => a.acos(),
                        MathFunction::Atan => a.atan(),
                        _ => unsafe {
                            debug_unreachable!("We just checked!");
                        },
                    };

                    Ok(Self::Leaf(Leaf::Angle(Angle::from_radians(radians))))
                },
                MathFunction::Atan2 => {
                    let a = Self::parse_argument(context, input, CalcUnits::ALL)?;
                    input.expect_comma()?;
                    let b = Self::parse_argument(context, input, CalcUnits::ALL)?;

                    let radians = Self::try_resolve(input, || {
                        if let Ok(a) = a.to_number() {
                            let b = b.to_number()?;
                            return Ok(a.atan2(b));
                        }

                        if let Ok(a) = a.to_percentage() {
                            let b = b.to_percentage()?;
                            return Ok(a.atan2(b));
                        }

                        if let Ok(a) = a.to_time(None) {
                            let b = b.to_time(None)?;
                            return Ok(a.seconds().atan2(b.seconds()));
                        }

                        if let Ok(a) = a.to_angle() {
                            let b = b.to_angle()?;
                            return Ok(a.radians().atan2(b.radians()));
                        }

                        if let Ok(a) = a.to_resolution() {
                            let b = b.to_resolution()?;
                            return Ok(a.dppx().atan2(b.dppx()));
                        }

                        let a = a.into_length_or_percentage(AllowedNumericType::All)?;
                        let b = b.into_length_or_percentage(AllowedNumericType::All)?;
                        let (a, b) = CalcLengthPercentage::same_unit_length_as(&a, &b).ok_or(())?;

                        Ok(a.atan2(b))
                    })?;

                    Ok(Self::Leaf(Leaf::Angle(Angle::from_radians(radians))))
                },
                MathFunction::Pow => {
                    let a = Self::parse_number_argument(context, input)?;
                    input.expect_comma()?;
                    let b = Self::parse_number_argument(context, input)?;

                    let number = a.powf(b);

                    Ok(Self::Leaf(Leaf::Number(number)))
                },
                MathFunction::Sqrt => {
                    let a = Self::parse_number_argument(context, input)?;

                    let number = a.sqrt();

                    Ok(Self::Leaf(Leaf::Number(number)))
                },
                MathFunction::Hypot => {
                    let arguments = input.parse_comma_separated(|input| {
                        Self::parse_argument(context, input, allowed_units)
                    })?;

                    Ok(Self::Hypot(arguments.into()))
                },
                MathFunction::Log => {
                    let a = Self::parse_number_argument(context, input)?;
                    let b = input
                        .try_parse(|input| {
                            input.expect_comma()?;
                            Self::parse_number_argument(context, input)
                        })
                        .ok();

                    let number = match b {
                        Some(b) => a.log(b),
                        None => a.ln(),
                    };

                    Ok(Self::Leaf(Leaf::Number(number)))
                },
                MathFunction::Exp => {
                    let a = Self::parse_number_argument(context, input)?;
                    let number = a.exp();
                    Ok(Self::Leaf(Leaf::Number(number)))
                },
                MathFunction::Abs => {
                    let node = Self::parse_argument(context, input, allowed_units)?;
                    Ok(Self::Abs(Box::new(node)))
                },
                MathFunction::Sign => {
                    // The sign of a percentage is dependent on the percentage basis, so if
                    // percentages aren't allowed (so there's no basis) we shouldn't allow them in
                    // sign(). The rest of the units are safe tho.
                    let sign_units = allowed_units | (CalcUnits::ALL - CalcUnits::PERCENTAGE);
                    let node = Self::parse_argument(context, input, sign_units)?;
                    Ok(Self::Sign(Box::new(node)))
                },
            }
        })
    }

    fn parse_angle_argument<'i, 't>(
        context: &ParserContext,
        input: &mut Parser<'i, 't>,
    ) -> Result<CSSFloat, ParseError<'i>> {
        let argument = Self::parse_argument(context, input, CalcUnits::ANGLE)?;
        argument
            .to_number()
            .or_else(|()| Ok(argument.to_angle()?.radians()))
            .map_err(|()| input.new_custom_error(StyleParseErrorKind::UnspecifiedError))
    }

    fn parse_number_argument<'i, 't>(
        context: &ParserContext,
        input: &mut Parser<'i, 't>,
    ) -> Result<CSSFloat, ParseError<'i>> {
        Self::parse_argument(context, input, CalcUnits::empty())?
            .to_number()
            .map_err(|()| input.new_custom_error(StyleParseErrorKind::UnspecifiedError))
    }

    fn parse_argument<'i, 't>(
        context: &ParserContext,
        input: &mut Parser<'i, 't>,
        allowed_units: CalcUnits,
    ) -> Result<Self, ParseError<'i>> {
        let mut sum = SmallVec::<[CalcNode; 1]>::new();
        sum.push(Self::parse_product(context, input, allowed_units)?);

        loop {
            let start = input.state();
            match input.next_including_whitespace() {
                Ok(&Token::WhiteSpace(_)) => {
                    if input.is_exhausted() {
                        break; // allow trailing whitespace
                    }
                    match *input.next()? {
                        Token::Delim('+') => {
                            sum.push(Self::parse_product(context, input, allowed_units)?);
                        },
                        Token::Delim('-') => {
                            let mut rhs = Self::parse_product(context, input, allowed_units)?;
                            rhs.negate();
                            sum.push(rhs);
                        },
                        _ => {
                            input.reset(&start);
                            break;
                        },
                    }
                },
                _ => {
                    input.reset(&start);
                    break;
                },
            }
        }

        Ok(if sum.len() == 1 {
            sum.drain(..).next().unwrap()
        } else {
            Self::Sum(sum.into_boxed_slice().into())
        })
    }

    /// Parse a top-level `calc` expression, and all the products that may
    /// follow, and stop as soon as a non-product expression is found.
    ///
    /// This should parse correctly:
    ///
    /// * `2`
    /// * `2 * 2`
    /// * `2 * 2 + 2` (but will leave the `+ 2` unparsed).
    ///
    fn parse_product<'i, 't>(
        context: &ParserContext,
        input: &mut Parser<'i, 't>,
        allowed_units: CalcUnits,
    ) -> Result<Self, ParseError<'i>> {
        let mut product = SmallVec::<[CalcNode; 1]>::new();
        product.push(Self::parse_one(context, input, allowed_units)?);

        loop {
            let start = input.state();
            match input.next() {
                Ok(&Token::Delim('*')) => {
                    let mut rhs = Self::parse_one(context, input, allowed_units)?;

                    // We can unwrap here, becuase we start the function by adding a node to
                    // the list.
                    if !product.last_mut().unwrap().try_product_in_place(&mut rhs) {
                        product.push(rhs);
                    }
                },
                Ok(&Token::Delim('/')) => {
                    let rhs = Self::parse_one(context, input, allowed_units)?;

                    enum InPlaceDivisionResult {
                        /// The right was merged into the left.
                        Merged,
                        /// The right is not a number or could not be resolved, so the left is
                        /// unchanged.
                        Unchanged,
                        /// The right was resolved, but was not a number, so the calculation is
                        /// invalid.
                        Invalid,
                    }

                    fn try_division_in_place(
                        left: &mut CalcNode,
                        right: &CalcNode,
                    ) -> InPlaceDivisionResult {
                        if let Ok(resolved) = right.resolve() {
                            if let Some(number) = resolved.as_number() {
                                if number != 1.0 && left.is_product_distributive() {
                                    left.map(|l| l / number);
                                    return InPlaceDivisionResult::Merged;
                                }
                            } else {
                                return InPlaceDivisionResult::Invalid;
                            }
                        }
                        InPlaceDivisionResult::Unchanged
                    }

                    // The right hand side of a division *must* be a number, so if we can
                    // already resolve it, then merge it with the last node on the product list.
                    // We can unwrap here, becuase we start the function by adding a node to
                    // the list.
                    match try_division_in_place(product.last_mut().unwrap(), &rhs) {
                        InPlaceDivisionResult::Merged => {},
                        InPlaceDivisionResult::Unchanged => {
                            product.push(Self::Invert(Box::new(rhs)))
                        },
                        InPlaceDivisionResult::Invalid => {
                            return Err(
                                input.new_custom_error(StyleParseErrorKind::UnspecifiedError)
                            )
                        },
                    }
                },
                _ => {
                    input.reset(&start);
                    break;
                },
            }
        }

        Ok(if product.len() == 1 {
            product.drain(..).next().unwrap()
        } else {
            Self::Product(product.into_boxed_slice().into())
        })
    }

    fn try_resolve<'i, 't, F>(
        input: &Parser<'i, 't>,
        closure: F,
    ) -> Result<CSSFloat, ParseError<'i>>
    where
        F: FnOnce() -> Result<CSSFloat, ()>,
    {
        closure().map_err(|()| input.new_custom_error(StyleParseErrorKind::UnspecifiedError))
    }

    /// Tries to simplify this expression into a `<length>` or `<percentage>`
    /// value.
    pub fn into_length_or_percentage(
        mut self,
        clamping_mode: AllowedNumericType,
    ) -> Result<CalcLengthPercentage, ()> {
        self.simplify_and_sort();

        // Although we allow numbers inside CalcLengthPercentage, calculations that resolve to a
        // number result is still not allowed.
        let unit = self.unit()?;
        if !CalcUnits::LENGTH_PERCENTAGE.intersects(unit) {
            Err(())
        } else {
            Ok(CalcLengthPercentage {
                clamping_mode,
                node: self,
            })
        }
    }

    /// Tries to simplify this expression into a `<time>` value.
    fn to_time(&self, clamping_mode: Option<AllowedNumericType>) -> Result<Time, ()> {
        let seconds = if let Leaf::Time(time) = self.resolve()? {
            time.seconds()
        } else {
            return Err(());
        };

        Ok(Time::from_seconds_with_calc_clamping_mode(
            seconds,
            clamping_mode,
        ))
    }

    /// Tries to simplify the expression into a `<resolution>` value.
    fn to_resolution(&self) -> Result<Resolution, ()> {
        let dppx = if let Leaf::Resolution(resolution) = self.resolve()? {
            resolution.dppx()
        } else {
            return Err(());
        };

        Ok(Resolution::from_dppx_calc(dppx))
    }

    /// Tries to simplify this expression into an `Angle` value.
    fn to_angle(&self) -> Result<Angle, ()> {
        let degrees = if let Leaf::Angle(angle) = self.resolve()? {
            angle.degrees()
        } else {
            return Err(());
        };

        let result = Angle::from_calc(degrees);
        Ok(result)
    }

    /// Tries to simplify this expression into a `<number>` value.
    fn to_number(&self) -> Result<CSSFloat, ()> {
        let number = if let Leaf::Number(number) = self.resolve()? {
            number
        } else {
            return Err(());
        };

        let result = number;

        Ok(result)
    }

    /// Tries to simplify this expression into a `<percentage>` value.
    fn to_percentage(&self) -> Result<CSSFloat, ()> {
        if let Leaf::Percentage(percentage) = self.resolve()? {
            Ok(percentage)
        } else {
            Err(())
        }
    }

    /// Given a function name, and the location from where the token came from,
    /// return a mathematical function corresponding to that name or an error.
    #[inline]
    pub fn math_function<'i>(
        _: &ParserContext,
        name: &CowRcStr<'i>,
        location: cssparser::SourceLocation,
    ) -> Result<MathFunction, ParseError<'i>> {
        let function = match MathFunction::from_ident(&*name) {
            Ok(f) => f,
            Err(()) => {
                return Err(location.new_unexpected_token_error(Token::Function(name.clone())))
            },
        };

        Ok(function)
    }

    /// Convenience parsing function for integers.
    pub fn parse_integer<'i, 't>(
        context: &ParserContext,
        input: &mut Parser<'i, 't>,
        function: MathFunction,
    ) -> Result<CSSInteger, ParseError<'i>> {
        Self::parse_number(context, input, function).map(|n| (n + 0.5).floor() as CSSInteger)
    }

    /// Convenience parsing function for `<length> | <percentage>`.
    pub fn parse_length_or_percentage<'i, 't>(
        context: &ParserContext,
        input: &mut Parser<'i, 't>,
        clamping_mode: AllowedNumericType,
        function: MathFunction,
    ) -> Result<CalcLengthPercentage, ParseError<'i>> {
        Self::parse(context, input, function, CalcUnits::LENGTH_PERCENTAGE)?
            .into_length_or_percentage(clamping_mode)
            .map_err(|()| input.new_custom_error(StyleParseErrorKind::UnspecifiedError))
    }

    /// Convenience parsing function for percentages.
    pub fn parse_percentage<'i, 't>(
        context: &ParserContext,
        input: &mut Parser<'i, 't>,
        function: MathFunction,
    ) -> Result<CSSFloat, ParseError<'i>> {
        Self::parse(context, input, function, CalcUnits::PERCENTAGE)?
            .to_percentage()
            .map(crate::values::normalize)
            .map_err(|()| input.new_custom_error(StyleParseErrorKind::UnspecifiedError))
    }

    /// Convenience parsing function for `<length>`.
    pub fn parse_length<'i, 't>(
        context: &ParserContext,
        input: &mut Parser<'i, 't>,
        clamping_mode: AllowedNumericType,
        function: MathFunction,
    ) -> Result<CalcLengthPercentage, ParseError<'i>> {
        Self::parse(context, input, function, CalcUnits::LENGTH)?
            .into_length_or_percentage(clamping_mode)
            .map_err(|()| input.new_custom_error(StyleParseErrorKind::UnspecifiedError))
    }

    /// Convenience parsing function for `<number>`.
    pub fn parse_number<'i, 't>(
        context: &ParserContext,
        input: &mut Parser<'i, 't>,
        function: MathFunction,
    ) -> Result<CSSFloat, ParseError<'i>> {
        Self::parse(context, input, function, CalcUnits::empty())?
            .to_number()
            .map_err(|()| input.new_custom_error(StyleParseErrorKind::UnspecifiedError))
    }

    /// Convenience parsing function for `<angle>`.
    pub fn parse_angle<'i, 't>(
        context: &ParserContext,
        input: &mut Parser<'i, 't>,
        function: MathFunction,
    ) -> Result<Angle, ParseError<'i>> {
        Self::parse(context, input, function, CalcUnits::ANGLE)?
            .to_angle()
            .map_err(|()| input.new_custom_error(StyleParseErrorKind::UnspecifiedError))
    }

    /// Convenience parsing function for `<time>`.
    pub fn parse_time<'i, 't>(
        context: &ParserContext,
        input: &mut Parser<'i, 't>,
        clamping_mode: AllowedNumericType,
        function: MathFunction,
    ) -> Result<Time, ParseError<'i>> {
        Self::parse(context, input, function, CalcUnits::TIME)?
            .to_time(Some(clamping_mode))
            .map_err(|()| input.new_custom_error(StyleParseErrorKind::UnspecifiedError))
    }

    /// Convenience parsing function for `<resolution>`.
    pub fn parse_resolution<'i, 't>(
        context: &ParserContext,
        input: &mut Parser<'i, 't>,
        function: MathFunction,
    ) -> Result<Resolution, ParseError<'i>> {
        Self::parse(context, input, function, CalcUnits::RESOLUTION)?
            .to_resolution()
            .map_err(|()| input.new_custom_error(StyleParseErrorKind::UnspecifiedError))
    }

    /// Convenience parsing function for `<number>` or `<percentage>`.
    pub fn parse_number_or_percentage<'i, 't>(
        context: &ParserContext,
        input: &mut Parser<'i, 't>,
        function: MathFunction,
    ) -> Result<NumberOrPercentage, ParseError<'i>> {
        let node = Self::parse(context, input, function, CalcUnits::PERCENTAGE)?;

        if let Ok(value) = node.to_number() {
            return Ok(NumberOrPercentage::Number { value });
        }

        match node.to_percentage() {
            Ok(unit_value) => Ok(NumberOrPercentage::Percentage { unit_value }),
            Err(()) => Err(input.new_custom_error(StyleParseErrorKind::UnspecifiedError)),
        }
    }

    /// Convenience parsing function for `<number>` or `<angle>`.
    pub fn parse_angle_or_number<'i, 't>(
        context: &ParserContext,
        input: &mut Parser<'i, 't>,
        function: MathFunction,
    ) -> Result<AngleOrNumber, ParseError<'i>> {
        let node = Self::parse(context, input, function, CalcUnits::ANGLE)?;

        if let Ok(angle) = node.to_angle() {
            let degrees = angle.degrees();
            return Ok(AngleOrNumber::Angle { degrees });
        }

        match node.to_number() {
            Ok(value) => Ok(AngleOrNumber::Number { value }),
            Err(()) => Err(input.new_custom_error(StyleParseErrorKind::UnspecifiedError)),
        }
    }
}

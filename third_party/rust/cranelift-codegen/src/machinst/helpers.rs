//! Miscellaneous helpers for machine backends.

use super::{InsnOutput, LowerCtx, VCodeInst};
use crate::ir::Type;
use regalloc::{Reg, Writable};

/// Returns the size (in bits) of a given type.
pub fn ty_bits(ty: Type) -> usize {
    usize::from(ty.bits())
}

/// Is the type represented by an integer (not float) at the machine level?
pub(crate) fn ty_has_int_representation(ty: Type) -> bool {
    ty.is_int() || ty.is_bool() || ty.is_ref()
}

/// Is the type represented by a float or vector value at the machine level?
pub(crate) fn ty_has_float_or_vec_representation(ty: Type) -> bool {
    ty.is_vector() || ty.is_float()
}

/// Allocate a register for an instruction output and return it.
pub(crate) fn get_output_reg<I: VCodeInst, C: LowerCtx<I = I>>(
    ctx: &mut C,
    spec: InsnOutput,
) -> Writable<Reg> {
    ctx.get_output(spec.insn, spec.output)
}

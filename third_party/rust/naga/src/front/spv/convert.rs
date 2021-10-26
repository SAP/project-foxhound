use super::error::Error;
use num_traits::cast::FromPrimitive;
use std::convert::TryInto;

pub fn map_binary_operator(word: spirv::Op) -> Result<crate::BinaryOperator, Error> {
    use crate::BinaryOperator;
    use spirv::Op;

    match word {
        // Arithmetic Instructions +, -, *, /, %
        Op::IAdd | Op::FAdd => Ok(BinaryOperator::Add),
        Op::ISub | Op::FSub => Ok(BinaryOperator::Subtract),
        Op::IMul | Op::FMul => Ok(BinaryOperator::Multiply),
        Op::UDiv | Op::SDiv | Op::FDiv => Ok(BinaryOperator::Divide),
        Op::UMod | Op::SMod | Op::FMod => Ok(BinaryOperator::Modulo),
        // Relational and Logical Instructions
        Op::IEqual | Op::FOrdEqual | Op::FUnordEqual => Ok(BinaryOperator::Equal),
        Op::INotEqual | Op::FOrdNotEqual | Op::FUnordNotEqual => Ok(BinaryOperator::NotEqual),
        Op::ULessThan | Op::SLessThan | Op::FOrdLessThan | Op::FUnordLessThan => {
            Ok(BinaryOperator::Less)
        }
        Op::ULessThanEqual
        | Op::SLessThanEqual
        | Op::FOrdLessThanEqual
        | Op::FUnordLessThanEqual => Ok(BinaryOperator::LessEqual),
        Op::UGreaterThan | Op::SGreaterThan | Op::FOrdGreaterThan | Op::FUnordGreaterThan => {
            Ok(BinaryOperator::Greater)
        }
        Op::UGreaterThanEqual
        | Op::SGreaterThanEqual
        | Op::FOrdGreaterThanEqual
        | Op::FUnordGreaterThanEqual => Ok(BinaryOperator::GreaterEqual),
        _ => Err(Error::UnknownInstruction(word as u16)),
    }
}

pub fn map_vector_size(word: spirv::Word) -> Result<crate::VectorSize, Error> {
    match word {
        2 => Ok(crate::VectorSize::Bi),
        3 => Ok(crate::VectorSize::Tri),
        4 => Ok(crate::VectorSize::Quad),
        _ => Err(Error::InvalidVectorSize(word)),
    }
}

pub fn map_image_dim(word: spirv::Word) -> Result<crate::ImageDimension, Error> {
    use spirv::Dim as D;
    match D::from_u32(word) {
        Some(D::Dim1D) => Ok(crate::ImageDimension::D1),
        Some(D::Dim2D) => Ok(crate::ImageDimension::D2),
        Some(D::Dim3D) => Ok(crate::ImageDimension::D3),
        Some(D::DimCube) => Ok(crate::ImageDimension::Cube),
        _ => Err(Error::UnsupportedImageDim(word)),
    }
}

pub fn map_image_format(word: spirv::Word) -> Result<crate::StorageFormat, Error> {
    match spirv::ImageFormat::from_u32(word) {
        Some(spirv::ImageFormat::R8) => Ok(crate::StorageFormat::R8Unorm),
        Some(spirv::ImageFormat::R8Snorm) => Ok(crate::StorageFormat::R8Snorm),
        Some(spirv::ImageFormat::R8ui) => Ok(crate::StorageFormat::R8Uint),
        Some(spirv::ImageFormat::R8i) => Ok(crate::StorageFormat::R8Sint),
        Some(spirv::ImageFormat::R16ui) => Ok(crate::StorageFormat::R16Uint),
        Some(spirv::ImageFormat::R16i) => Ok(crate::StorageFormat::R16Sint),
        Some(spirv::ImageFormat::R16f) => Ok(crate::StorageFormat::R16Float),
        Some(spirv::ImageFormat::Rg8) => Ok(crate::StorageFormat::Rg8Unorm),
        Some(spirv::ImageFormat::Rg8Snorm) => Ok(crate::StorageFormat::Rg8Snorm),
        Some(spirv::ImageFormat::Rg8ui) => Ok(crate::StorageFormat::Rg8Uint),
        Some(spirv::ImageFormat::Rg8i) => Ok(crate::StorageFormat::Rg8Sint),
        Some(spirv::ImageFormat::R32ui) => Ok(crate::StorageFormat::R32Uint),
        Some(spirv::ImageFormat::R32i) => Ok(crate::StorageFormat::R32Sint),
        Some(spirv::ImageFormat::R32f) => Ok(crate::StorageFormat::R32Float),
        Some(spirv::ImageFormat::Rg16ui) => Ok(crate::StorageFormat::Rg16Uint),
        Some(spirv::ImageFormat::Rg16i) => Ok(crate::StorageFormat::Rg16Sint),
        Some(spirv::ImageFormat::Rg16f) => Ok(crate::StorageFormat::Rg16Float),
        Some(spirv::ImageFormat::Rgba8) => Ok(crate::StorageFormat::Rgba8Unorm),
        Some(spirv::ImageFormat::Rgba8Snorm) => Ok(crate::StorageFormat::Rgba8Snorm),
        Some(spirv::ImageFormat::Rgba8ui) => Ok(crate::StorageFormat::Rgba8Uint),
        Some(spirv::ImageFormat::Rgba8i) => Ok(crate::StorageFormat::Rgba8Sint),
        Some(spirv::ImageFormat::Rgb10a2ui) => Ok(crate::StorageFormat::Rgb10a2Unorm),
        Some(spirv::ImageFormat::R11fG11fB10f) => Ok(crate::StorageFormat::Rg11b10Float),
        Some(spirv::ImageFormat::Rg32ui) => Ok(crate::StorageFormat::Rg32Uint),
        Some(spirv::ImageFormat::Rg32i) => Ok(crate::StorageFormat::Rg32Sint),
        Some(spirv::ImageFormat::Rg32f) => Ok(crate::StorageFormat::Rg32Float),
        Some(spirv::ImageFormat::Rgba16ui) => Ok(crate::StorageFormat::Rgba16Uint),
        Some(spirv::ImageFormat::Rgba16i) => Ok(crate::StorageFormat::Rgba16Sint),
        Some(spirv::ImageFormat::Rgba16f) => Ok(crate::StorageFormat::Rgba16Float),
        Some(spirv::ImageFormat::Rgba32ui) => Ok(crate::StorageFormat::Rgba32Uint),
        Some(spirv::ImageFormat::Rgba32i) => Ok(crate::StorageFormat::Rgba32Sint),
        Some(spirv::ImageFormat::Rgba32f) => Ok(crate::StorageFormat::Rgba32Float),
        _ => Err(Error::UnsupportedImageFormat(word)),
    }
}

pub fn map_width(word: spirv::Word) -> Result<crate::Bytes, Error> {
    (word >> 3) // bits to bytes
        .try_into()
        .map_err(|_| Error::InvalidTypeWidth(word))
}

pub fn map_builtin(word: spirv::Word) -> Result<crate::BuiltIn, Error> {
    use spirv::BuiltIn as Bi;
    Ok(match spirv::BuiltIn::from_u32(word) {
        Some(Bi::BaseInstance) => crate::BuiltIn::BaseInstance,
        Some(Bi::BaseVertex) => crate::BuiltIn::BaseVertex,
        Some(Bi::ClipDistance) => crate::BuiltIn::ClipDistance,
        Some(Bi::InstanceIndex) => crate::BuiltIn::InstanceIndex,
        Some(Bi::Position) => crate::BuiltIn::Position,
        Some(Bi::VertexIndex) => crate::BuiltIn::VertexIndex,
        // fragment
        Some(Bi::PointSize) => crate::BuiltIn::PointSize,
        Some(Bi::FragCoord) => crate::BuiltIn::FragCoord,
        Some(Bi::FrontFacing) => crate::BuiltIn::FrontFacing,
        Some(Bi::SampleId) => crate::BuiltIn::SampleIndex,
        Some(Bi::FragDepth) => crate::BuiltIn::FragDepth,
        // compute
        Some(Bi::GlobalInvocationId) => crate::BuiltIn::GlobalInvocationId,
        Some(Bi::LocalInvocationId) => crate::BuiltIn::LocalInvocationId,
        Some(Bi::LocalInvocationIndex) => crate::BuiltIn::LocalInvocationIndex,
        Some(Bi::WorkgroupId) => crate::BuiltIn::WorkGroupId,
        _ => return Err(Error::UnsupportedBuiltIn(word)),
    })
}

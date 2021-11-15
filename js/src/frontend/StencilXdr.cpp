/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: set ts=8 sts=2 et sw=2 tw=80:
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "frontend/StencilXdr.h"  // StencilXDR

#include <memory>
#include <type_traits>

#include "vm/JSScript.h"      // js::CheckCompileOptionsMatch
#include "vm/StencilEnums.h"  // js::ImmutableScriptFlagsEnum

using namespace js;
using namespace js::frontend;

template <XDRMode mode>
/* static */ XDRResult StencilXDR::Script(XDRState<mode>* xdr,
                                          ScriptStencil& stencil) {
  enum class XdrFlags : uint8_t {
    HasMemberInitializers = 0,
    HasSharedData,
    HasFunctionAtom,
    HasScopeIndex,
    IsStandaloneFunction,
    WasFunctionEmitted,
    IsSingletonFunction,
    AllowRelazify,
  };

  struct XdrFields {
    uint32_t immutableFlags;
    uint32_t numMemberInitializers;
    uint32_t numGcThings;
    uint16_t functionFlags;
    uint16_t nargs;
    uint32_t scopeIndex;
  };

  uint8_t xdrFlags = 0;
  XdrFields xdrFields = {};

  if (mode == XDR_ENCODE) {
    xdrFields.immutableFlags = stencil.immutableFlags;

    if (stencil.memberInitializers.isSome()) {
      xdrFlags |= 1 << uint8_t(XdrFlags::HasMemberInitializers);
    }
    xdrFields.numMemberInitializers =
        stencil.memberInitializers
            .map([](auto i) { return i.numMemberInitializers; })
            .valueOr(0);

    xdrFields.numGcThings = stencil.gcThings.size();

    if (stencil.sharedData) {
      xdrFlags |= 1 << uint8_t(XdrFlags::HasSharedData);
    }

    if (stencil.functionAtom) {
      xdrFlags |= 1 << uint8_t(XdrFlags::HasFunctionAtom);
    }

    xdrFields.functionFlags = stencil.functionFlags.toRaw();
    xdrFields.nargs = stencil.nargs;

    if (stencil.lazyFunctionEnclosingScopeIndex_.isSome()) {
      xdrFlags |= 1 << uint8_t(XdrFlags::HasScopeIndex);
    }
    xdrFields.scopeIndex =
        stencil.lazyFunctionEnclosingScopeIndex_.valueOr(ScopeIndex());

    if (stencil.isStandaloneFunction) {
      xdrFlags |= 1 << uint8_t(XdrFlags::IsStandaloneFunction);
    }
    if (stencil.wasFunctionEmitted) {
      xdrFlags |= 1 << uint8_t(XdrFlags::WasFunctionEmitted);
    }
    if (stencil.isSingletonFunction) {
      xdrFlags |= 1 << uint8_t(XdrFlags::IsSingletonFunction);
    }
    if (stencil.allowRelazify) {
      xdrFlags |= 1 << uint8_t(XdrFlags::AllowRelazify);
    }
  }

#ifdef __cpp_lib_has_unique_object_representations
  // We check endianess before decoding so if structures are fully packed, we
  // may transcode them directly as raw bytes.
  static_assert(std::has_unique_object_representations<XdrFields>(),
                "XdrFields structure must be fully packed");
  static_assert(std::has_unique_object_representations<SourceExtent>(),
                "XdrFields structure must be fully packed");
#endif

  MOZ_TRY(xdr->codeUint8(&xdrFlags));
  MOZ_TRY(xdr->codeBytes(&xdrFields, sizeof(XdrFields)));
  MOZ_TRY(xdr->codeBytes(&stencil.extent, sizeof(SourceExtent)));

  if (mode == XDR_DECODE) {
    MOZ_ASSERT(xdr->hasOptions());

    if (!(xdrFields.immutableFlags &
          uint32_t(ImmutableScriptFlagsEnum::IsFunction))) {
      MOZ_ASSERT(!xdr->isMultiDecode());
      if (!js::CheckCompileOptionsMatch(
              xdr->options(), ImmutableScriptFlags(xdrFields.immutableFlags),
              xdr->isMultiDecode())) {
        return xdr->fail(JS::TranscodeResult_Failure_WrongCompileOption);
      }
    }

    stencil.immutableFlags = xdrFields.immutableFlags;

    if (xdrFlags & (1 << uint8_t(XdrFlags::HasMemberInitializers))) {
      stencil.memberInitializers.emplace(xdrFields.numMemberInitializers);
    }

    MOZ_ASSERT(stencil.gcThings.empty());
    if (xdrFields.numGcThings > 0) {
      // Allocated TaggedScriptThingIndex array and initialize to safe value.
      mozilla::Span<TaggedScriptThingIndex> stencilThings =
          NewScriptThingSpanUninitialized(xdr->cx(), xdr->stencilAlloc(),
                                          xdrFields.numGcThings);
      if (stencilThings.empty()) {
        return xdr->fail(JS::TranscodeResult_Throw);
      }
      stencil.gcThings = stencilThings;
    }

    stencil.functionFlags = FunctionFlags(xdrFields.functionFlags);
    stencil.nargs = xdrFields.nargs;

    if (xdrFlags & (1 << uint8_t(XdrFlags::HasScopeIndex))) {
      stencil.lazyFunctionEnclosingScopeIndex_.emplace(xdrFields.scopeIndex);
    }

    if (xdrFlags & (1 << uint8_t(XdrFlags::IsStandaloneFunction))) {
      stencil.isStandaloneFunction = true;
    }
    if (xdrFlags & (1 << uint8_t(XdrFlags::WasFunctionEmitted))) {
      stencil.wasFunctionEmitted = true;
    }
    if (xdrFlags & (1 << uint8_t(XdrFlags::IsSingletonFunction))) {
      stencil.isSingletonFunction = true;
    }
    if (xdrFlags & (1 << uint8_t(XdrFlags::AllowRelazify))) {
      stencil.allowRelazify = true;
    }
  }

#ifdef __cpp_lib_has_unique_object_representations
  // We check endianess before decoding so if structures are fully packed, we
  // may transcode them directly as raw bytes.
  static_assert(
      std::has_unique_object_representations<TaggedScriptThingIndex>(),
      "TaggedScriptThingIndex structure must be fully packed");
#endif

  MOZ_TRY(xdr->codeBytes(
      const_cast<TaggedScriptThingIndex*>(stencil.gcThings.data()),
      sizeof(TaggedScriptThingIndex) * xdrFields.numGcThings));

  if (xdrFlags & (1 << uint8_t(XdrFlags::HasSharedData))) {
    MOZ_TRY(StencilXDR::SharedData<mode>(xdr, stencil.sharedData));
  }

  if (xdrFlags & (1 << uint8_t(XdrFlags::HasFunctionAtom))) {
    MOZ_TRY(XDRTaggedParserAtomIndex(xdr, &stencil.functionAtom));
  }

  return Ok();
};

template <XDRMode mode>
static XDRResult XDRParserBindingName(XDRState<mode>* xdr,
                                      ParserBindingName& bnamep) {
  // We'll be encoding the binding-name flags in a byte.
  uint8_t flags = 0;
  const ParserAtom* atom = nullptr;

  if (mode == XDR_ENCODE) {
    flags = bnamep.flagsForXDR();
    atom = bnamep.name();
  }

  // Handle the binding name flags.
  MOZ_TRY(xdr->codeUint8(&flags));

  // Handle the atom itself, which may be null.
  MOZ_TRY(XDRParserAtomOrNull(xdr, &atom));

  if (mode == XDR_ENCODE) {
    return Ok();
  }

  MOZ_ASSERT(mode == XDR_DECODE);
  bnamep = ParserBindingName::fromXDR(atom, flags);
  return Ok();
}

template <typename ScopeDataT, XDRMode mode>
static XDRResult XDRParserTrailingNames(XDRState<mode>* xdr, ScopeDataT& data,
                                        uint32_t length) {
  // Handle each atom in turn.
  for (uint32_t i = 0; i < length; i++) {
    MOZ_TRY(XDRParserBindingName(xdr, data.trailingNames[i]));
  }

  return Ok();
}

template <typename ScopeT, typename InitF>
static ParserScopeData<ScopeT>* NewEmptyScopeData(JSContext* cx,
                                                  LifoAlloc& alloc,
                                                  uint32_t length, InitF init) {
  using Data = ParserScopeData<ScopeT>;

  size_t dataSize = SizeOfScopeData<Data>(length);
  void* raw = alloc.alloc(dataSize);
  if (!raw) {
    js::ReportOutOfMemory(cx);
    return nullptr;
  }

  Data* data = new (raw) Data(length);
  init(data);
  return data;
}

template <XDRMode mode>
/* static */ XDRResult StencilXDR::FunctionScopeData(XDRState<mode>* xdr,
                                                     ScopeStencil& stencil) {
  ParserFunctionScopeData* data =
      static_cast<ParserFunctionScopeData*>(stencil.data_);

  uint32_t nextFrameSlot = 0;
  uint8_t hasParameterExprs = 0;
  uint16_t nonPositionalFormalStart = 0;
  uint16_t varStart = 0;
  uint32_t length = 0;

  if (mode == XDR_ENCODE) {
    nextFrameSlot = data->nextFrameSlot;
    hasParameterExprs = data->hasParameterExprs ? 1 : 0;
    nonPositionalFormalStart = data->nonPositionalFormalStart;
    varStart = data->varStart;
    length = data->length;
  }

  MOZ_TRY(xdr->codeUint32(&nextFrameSlot));
  MOZ_TRY(xdr->codeUint8(&hasParameterExprs));
  MOZ_TRY(xdr->codeUint16(&nonPositionalFormalStart));
  MOZ_TRY(xdr->codeUint16(&varStart));
  MOZ_TRY(xdr->codeUint32(&length));

  // Reconstruct the scope-data object for decode.
  if (mode == XDR_DECODE) {
    stencil.data_ = data = NewEmptyScopeData<FunctionScope>(
        xdr->cx(), xdr->stencilAlloc(), length, [&](auto data) {
          data->nextFrameSlot = nextFrameSlot;
          MOZ_ASSERT(hasParameterExprs <= 1);
          data->hasParameterExprs = hasParameterExprs;
          data->nonPositionalFormalStart = nonPositionalFormalStart;
          data->varStart = varStart;
          data->length = length;
        });
    if (!data) {
      return xdr->fail(JS::TranscodeResult_Throw);
    }
  }

  // Decode each name in TrailingNames.
  MOZ_TRY(XDRParserTrailingNames(xdr, *data, length));

  return Ok();
}

template <XDRMode mode>
/* static */ XDRResult StencilXDR::VarScopeData(XDRState<mode>* xdr,
                                                ScopeStencil& stencil) {
  ParserVarScopeData* data = static_cast<ParserVarScopeData*>(stencil.data_);

  uint32_t nextFrameSlot = 0;
  uint32_t length = 0;

  if (mode == XDR_ENCODE) {
    nextFrameSlot = data->nextFrameSlot;
    length = data->length;
  }

  MOZ_TRY(xdr->codeUint32(&nextFrameSlot));
  MOZ_TRY(xdr->codeUint32(&length));

  // Reconstruct the scope-data object for decode.
  if (mode == XDR_DECODE) {
    stencil.data_ = data = NewEmptyScopeData<VarScope>(
        xdr->cx(), xdr->stencilAlloc(), length, [&](auto data) {
          data->nextFrameSlot = nextFrameSlot;
          data->length = length;
        });
    if (!data) {
      return xdr->fail(JS::TranscodeResult_Throw);
    }
  }

  // Decode each name in TrailingNames.
  MOZ_TRY(XDRParserTrailingNames(xdr, *data, length));

  return Ok();
}

template <XDRMode mode>
/* static */ XDRResult StencilXDR::LexicalScopeData(XDRState<mode>* xdr,
                                                    ScopeStencil& stencil) {
  ParserLexicalScopeData* data =
      static_cast<ParserLexicalScopeData*>(stencil.data_);

  uint32_t nextFrameSlot = 0;
  uint32_t constStart = 0;
  uint32_t length = 0;

  if (mode == XDR_ENCODE) {
    nextFrameSlot = data->nextFrameSlot;
    constStart = data->constStart;
    length = data->length;
  }

  MOZ_TRY(xdr->codeUint32(&nextFrameSlot));
  MOZ_TRY(xdr->codeUint32(&constStart));
  MOZ_TRY(xdr->codeUint32(&length));

  // Reconstruct the scope-data object for decode.
  if (mode == XDR_DECODE) {
    stencil.data_ = data = NewEmptyScopeData<LexicalScope>(
        xdr->cx(), xdr->stencilAlloc(), length, [&](auto data) {
          data->nextFrameSlot = nextFrameSlot;
          data->constStart = constStart;
          data->length = length;
        });
    if (!data) {
      return xdr->fail(JS::TranscodeResult_Throw);
    }
  }

  // Decode each name in TrailingNames.
  MOZ_TRY(XDRParserTrailingNames(xdr, *data, length));

  return Ok();
}

template <XDRMode mode>
/* static */ XDRResult StencilXDR::GlobalScopeData(XDRState<mode>* xdr,
                                                   ScopeStencil& stencil) {
  ParserGlobalScopeData* data =
      static_cast<ParserGlobalScopeData*>(stencil.data_);

  uint32_t letStart = 0;
  uint32_t constStart = 0;
  uint32_t length = 0;

  if (mode == XDR_ENCODE) {
    letStart = data->letStart;
    constStart = data->constStart;
    length = data->length;
  }

  MOZ_TRY(xdr->codeUint32(&letStart));
  MOZ_TRY(xdr->codeUint32(&constStart));
  MOZ_TRY(xdr->codeUint32(&length));

  // Reconstruct the scope-data object for decode.
  if (mode == XDR_DECODE) {
    stencil.data_ = data = NewEmptyScopeData<GlobalScope>(
        xdr->cx(), xdr->stencilAlloc(), length, [&](auto data) {
          data->letStart = letStart;
          data->constStart = constStart;
          data->length = length;
        });
    if (!data) {
      return xdr->fail(JS::TranscodeResult_Throw);
    }
  }

  // Decode each name in TrailingNames.
  MOZ_TRY(XDRParserTrailingNames(xdr, *data, length));

  return Ok();
}

template <XDRMode mode>
/* static */ XDRResult StencilXDR::ModuleScopeData(XDRState<mode>* xdr,
                                                   ScopeStencil& stencil) {
  ParserModuleScopeData* data =
      static_cast<ParserModuleScopeData*>(stencil.data_);

  uint32_t nextFrameSlot = 0;
  uint32_t varStart = 0;
  uint32_t letStart = 0;
  uint32_t constStart = 0;
  uint32_t length = 0;

  if (mode == XDR_ENCODE) {
    nextFrameSlot = data->nextFrameSlot;
    varStart = data->varStart;
    letStart = data->letStart;
    constStart = data->constStart;
    length = data->length;
  }

  MOZ_TRY(xdr->codeUint32(&nextFrameSlot));
  MOZ_TRY(xdr->codeUint32(&varStart));
  MOZ_TRY(xdr->codeUint32(&letStart));
  MOZ_TRY(xdr->codeUint32(&constStart));
  MOZ_TRY(xdr->codeUint32(&length));

  // Reconstruct the scope-data object for decode.
  if (mode == XDR_DECODE) {
    stencil.data_ = data = NewEmptyScopeData<ModuleScope>(
        xdr->cx(), xdr->stencilAlloc(), length, [&](auto data) {
          data->nextFrameSlot = nextFrameSlot;
          data->varStart = varStart;
          data->letStart = letStart;
          data->constStart = constStart;
          data->length = length;
        });
    if (!data) {
      return xdr->fail(JS::TranscodeResult_Throw);
    }
  }

  // Decode each name in TrailingNames.
  MOZ_TRY(XDRParserTrailingNames(xdr, *data, length));

  return Ok();
}

template <XDRMode mode>
/* static */ XDRResult StencilXDR::EvalScopeData(XDRState<mode>* xdr,
                                                 ScopeStencil& stencil) {
  ParserEvalScopeData* data = static_cast<ParserEvalScopeData*>(stencil.data_);

  uint32_t nextFrameSlot = 0;
  uint32_t length = 0;

  if (mode == XDR_ENCODE) {
    nextFrameSlot = data->nextFrameSlot;
    length = data->length;
  }

  MOZ_TRY(xdr->codeUint32(&nextFrameSlot));
  MOZ_TRY(xdr->codeUint32(&length));

  // Reconstruct the scope-data object for decode.
  if (mode == XDR_DECODE) {
    stencil.data_ = data = NewEmptyScopeData<EvalScope>(
        xdr->cx(), xdr->stencilAlloc(), length, [&](auto data) {
          data->nextFrameSlot = nextFrameSlot;
          data->length = length;
        });
    if (!data) {
      return xdr->fail(JS::TranscodeResult_Throw);
    }
  }

  // Decode each name in TrailingNames.
  MOZ_TRY(XDRParserTrailingNames(xdr, *data, length));

  return Ok();
}

template <XDRMode mode, typename VecType, typename... ConstructArgs>
static XDRResult XDRVector(XDRState<mode>* xdr, VecType& vec,
                           ConstructArgs&&... args) {
  uint32_t length;

  if (mode == XDR_ENCODE) {
    MOZ_ASSERT(vec.length() <= UINT32_MAX);
    length = vec.length();
  }

  MOZ_TRY(xdr->codeUint32(&length));

  if (mode == XDR_DECODE) {
    MOZ_ASSERT(vec.empty());
    if (!vec.reserve(length)) {
      js::ReportOutOfMemory(xdr->cx());
      return xdr->fail(JS::TranscodeResult_Throw);
    }
    for (uint64_t i = 0; i < length; ++i) {
      vec.infallibleEmplaceBack(std::forward<ConstructArgs>(args)...);
    }
  }

  return Ok();
}

template <XDRMode mode>
static XDRResult XDRObjLiteralWriter(XDRState<mode>* xdr,
                                     ObjLiteralWriter& writer) {
  uint8_t flags = 0;
  uint32_t length = 0;

  if (mode == XDR_ENCODE) {
    flags = writer.getFlags().serialize();
    length = writer.getCode().size();
  }

  MOZ_TRY(xdr->codeUint8(&flags));
  MOZ_TRY(xdr->codeUint32(&length));

  if (mode == XDR_ENCODE) {
    MOZ_TRY(xdr->codeBytes((void*)writer.getCode().data(), length));
    return Ok();
  }

  MOZ_ASSERT(mode == XDR_DECODE);
  ObjLiteralWriter::CodeVector codeVec;
  if (!codeVec.appendN(0, length)) {
    return xdr->fail(JS::TranscodeResult_Throw);
  }
  MOZ_TRY(xdr->codeBytes(codeVec.begin(), length));

  writer.initializeForXDR(std::move(codeVec), flags);

  return Ok();
}

template <XDRMode mode>
static XDRResult XDRStencilModuleEntryVector(
    XDRState<mode>* xdr, StencilModuleMetadata::EntryVector& vec) {
  uint64_t length;

  if (mode == XDR_ENCODE) {
    length = vec.length();
  }

  MOZ_TRY(xdr->codeUint64(&length));

  if (mode == XDR_DECODE) {
    MOZ_ASSERT(vec.empty());
    if (!vec.resize(length)) {
      return xdr->fail(JS::TranscodeResult_Throw);
    }
  }

  for (StencilModuleEntry& entry : vec) {
    MOZ_TRY(xdr->codeUint32(&entry.lineno));
    MOZ_TRY(xdr->codeUint32(&entry.column));

    MOZ_TRY(XDRTaggedParserAtomIndex(xdr, &entry.specifier));
    MOZ_TRY(XDRTaggedParserAtomIndex(xdr, &entry.localName));
    MOZ_TRY(XDRTaggedParserAtomIndex(xdr, &entry.importName));
    MOZ_TRY(XDRTaggedParserAtomIndex(xdr, &entry.exportName));
  }

  return Ok();
}

template <XDRMode mode>
static XDRResult XDRStencilModuleMetadata(XDRState<mode>* xdr,
                                          StencilModuleMetadata& stencil) {
  MOZ_TRY(XDRStencilModuleEntryVector(xdr, stencil.requestedModules));
  MOZ_TRY(XDRStencilModuleEntryVector(xdr, stencil.importEntries));
  MOZ_TRY(XDRStencilModuleEntryVector(xdr, stencil.localExportEntries));
  MOZ_TRY(XDRStencilModuleEntryVector(xdr, stencil.indirectExportEntries));
  MOZ_TRY(XDRStencilModuleEntryVector(xdr, stencil.starExportEntries));

  {
    uint64_t length;

    if (mode == XDR_ENCODE) {
      length = stencil.functionDecls.length();
    }

    MOZ_TRY(xdr->codeUint64(&length));

    if (mode == XDR_DECODE) {
      MOZ_ASSERT(stencil.functionDecls.empty());
      if (!stencil.functionDecls.resize(length)) {
        return xdr->fail(JS::TranscodeResult_Throw);
      }
    }

    for (GCThingIndex& entry : stencil.functionDecls) {
      MOZ_TRY(xdr->codeUint32(&entry.index));
    }
  }

  return Ok();
}

template <XDRMode mode>
/* static */ XDRResult StencilXDR::Scope(XDRState<mode>* xdr,
                                         ScopeStencil& stencil) {
  enum class XdrFlags {
    HasEnclosing,
    HasEnvironment,
    IsArrow,
  };

  uint8_t xdrFlags = 0;
  uint8_t kind;

  if (mode == XDR_ENCODE) {
    kind = static_cast<uint8_t>(stencil.kind_);
    if (stencil.enclosing_.isSome()) {
      xdrFlags |= 1 << uint8_t(XdrFlags::HasEnclosing);
    }
    if (stencil.numEnvironmentSlots_.isSome()) {
      xdrFlags |= 1 << uint8_t(XdrFlags::HasEnvironment);
    }
    if (stencil.isArrow_) {
      xdrFlags |= 1 << uint8_t(XdrFlags::IsArrow);
    }
  }

  MOZ_TRY(xdr->codeUint8(&xdrFlags));
  MOZ_TRY(xdr->codeUint8(&kind));
  MOZ_TRY(xdr->codeUint32(&stencil.firstFrameSlot_));

  if (mode == XDR_DECODE) {
    stencil.kind_ = static_cast<ScopeKind>(kind);
  }

  if (xdrFlags & (1 << uint8_t(XdrFlags::HasEnclosing))) {
    if (mode == XDR_DECODE) {
      stencil.enclosing_ = mozilla::Some(ScopeIndex());
    }
    MOZ_ASSERT(stencil.enclosing_.isSome());
    MOZ_TRY(xdr->codeUint32(&stencil.enclosing_->index));
  }

  if (xdrFlags & (1 << uint8_t(XdrFlags::HasEnvironment))) {
    if (mode == XDR_DECODE) {
      stencil.numEnvironmentSlots_ = mozilla::Some(0);
    }
    MOZ_ASSERT(stencil.numEnvironmentSlots_.isSome());
    MOZ_TRY(xdr->codeUint32(&stencil.numEnvironmentSlots_.ref()));
  }

  if (xdrFlags & (1 << uint8_t(XdrFlags::IsArrow))) {
    if (mode == XDR_DECODE) {
      stencil.isArrow_ = true;
    }
  }

  if (stencil.kind_ == ScopeKind::Function) {
    if (mode == XDR_DECODE) {
      stencil.functionIndex_ = mozilla::Some(FunctionIndex());
    }
    MOZ_ASSERT(stencil.functionIndex_.isSome());
    MOZ_TRY(xdr->codeUint32(&stencil.functionIndex_->index));
  }

  // In both decoding and encoding, stencil.kind_ is now known, and
  // can be assumed.  This allows the encoding to write out the bytes
  // for the specialized scope-data type without needing to encode
  // a distinguishing prefix.
  switch (stencil.kind_) {
    // FunctionScope
    case ScopeKind::Function: {
      MOZ_TRY(StencilXDR::FunctionScopeData(xdr, stencil));
      break;
    }

    // VarScope
    case ScopeKind::FunctionBodyVar: {
      MOZ_TRY(StencilXDR::VarScopeData(xdr, stencil));
      break;
    }

    // LexicalScope
    case ScopeKind::Lexical:
    case ScopeKind::SimpleCatch:
    case ScopeKind::Catch:
    case ScopeKind::NamedLambda:
    case ScopeKind::StrictNamedLambda:
    case ScopeKind::FunctionLexical:
    case ScopeKind::ClassBody: {
      MOZ_TRY(StencilXDR::LexicalScopeData(xdr, stencil));
      break;
    }

    // WithScope
    case ScopeKind::With: {
      // With scopes carry no scope data.
      break;
    }

    // EvalScope
    case ScopeKind::Eval:
    case ScopeKind::StrictEval: {
      MOZ_TRY(StencilXDR::EvalScopeData(xdr, stencil));
      break;
    }

    // GlobalScope
    case ScopeKind::Global:
    case ScopeKind::NonSyntactic: {
      MOZ_TRY(StencilXDR::GlobalScopeData(xdr, stencil));
      break;
    }

    // ModuleScope
    case ScopeKind::Module: {
      MOZ_TRY(StencilXDR::ModuleScopeData(xdr, stencil));
      break;
    }

    // WasmInstanceScope & WasmFunctionScope should not appear in stencils.
    case ScopeKind::WasmInstance:
    case ScopeKind::WasmFunction:
    default:
      MOZ_ASSERT_UNREACHABLE("XDR unrecognized ScopeKind.");
  }

  return Ok();
}

template <XDRMode mode>
/* static */ XDRResult StencilXDR::ObjLiteral(XDRState<mode>* xdr,
                                              ObjLiteralStencil& stencil) {
  MOZ_TRY(XDRObjLiteralWriter(xdr, stencil.writer_));

  MOZ_TRY(XDRVector(xdr, stencil.atoms_));
  for (auto& entry : stencil.atoms_) {
    MOZ_TRY(XDRTaggedParserAtomIndex(xdr, &entry));
  }

  return Ok();
}

template <XDRMode mode>
/* static */ XDRResult StencilXDR::BigInt(XDRState<mode>* xdr,
                                          BigIntStencil& stencil) {
  uint64_t length;

  if (mode == XDR_ENCODE) {
    length = stencil.length_;
  }

  MOZ_TRY(xdr->codeUint64(&length));

  XDRTranscodeString<char16_t> chars;

  if (mode == XDR_DECODE) {
    stencil.buf_ = xdr->cx()->template make_pod_array<char16_t>(length);
    if (!stencil.buf_) {
      return xdr->fail(JS::TranscodeResult_Throw);
    }
    stencil.length_ = length;
  }

  return xdr->codeChars(stencil.buf_.get(), stencil.length_);
}

template <XDRMode mode>
/* static */ XDRResult StencilXDR::RegExp(XDRState<mode>* xdr,
                                          RegExpStencil& stencil) {
  uint8_t flags;

  if (mode == XDR_ENCODE) {
    flags = stencil.flags_.value();
  }

  MOZ_TRY(XDRTaggedParserAtomIndex(xdr, &stencil.atom_));
  MOZ_TRY(xdr->codeUint8(&flags));

  if (mode == XDR_DECODE) {
    stencil.flags_ = JS::RegExpFlags(flags);
  }

  return Ok();
}

template <XDRMode mode>
/* static */
XDRResult StencilXDR::SharedData(XDRState<mode>* xdr,
                                 RefPtr<SharedImmutableScriptData>& sisd) {
  if (mode == XDR_ENCODE) {
    MOZ_TRY(XDRImmutableScriptData<mode>(xdr, sisd->isd_));
  } else {
    JSContext* cx = xdr->cx();
    UniquePtr<SharedImmutableScriptData> data(
        SharedImmutableScriptData::create(cx));
    if (!data) {
      return xdr->fail(JS::TranscodeResult_Throw);
    }
    MOZ_TRY(XDRImmutableScriptData<mode>(xdr, data->isd_));
    sisd = data.release();
  }

  return Ok();
}

template
    /* static */
    XDRResult
    StencilXDR::SharedData(XDRState<XDR_ENCODE>* xdr,
                           RefPtr<SharedImmutableScriptData>& sisd);

template
    /* static */
    XDRResult
    StencilXDR::SharedData(XDRState<XDR_DECODE>* xdr,
                           RefPtr<SharedImmutableScriptData>& sisd);

namespace js {

template <XDRMode mode>
XDRResult XDRCompilationInput(XDRState<mode>* xdr, CompilationInput& input) {
  // XDR the ScriptSource

  // Instrumented scripts cannot be encoded, as they have extra instructions
  // which are not normally present. Globals with instrumentation enabled must
  // compile scripts via the bytecode emitter, which will insert these
  // instructions.
  if (mode == XDR_ENCODE) {
    if (!!input.options.instrumentationKinds) {
      return xdr->fail(JS::TranscodeResult_Failure);
    }
  }

  // Copy the options out for passing into `ScriptSource::XDR`.
  mozilla::Maybe<JS::CompileOptions> opts;
  opts.emplace(xdr->cx(), input.options);

  Rooted<ScriptSourceHolder> holder(xdr->cx());
  if (mode == XDR_ENCODE) {
    holder.get().reset(input.source_.get());
  }
  MOZ_TRY(ScriptSource::XDR(xdr, opts, &holder));

  if (mode == XDR_DECODE) {
    input.source_.reset(holder.get().get());
  }

  return Ok();
}

template XDRResult XDRCompilationInput(XDRState<XDR_ENCODE>* xdr,
                                       CompilationInput& input);

template XDRResult XDRCompilationInput(XDRState<XDR_DECODE>* xdr,
                                       CompilationInput& input);

template <XDRMode mode>
XDRResult XDRCompilationStencil(XDRState<mode>* xdr,
                                CompilationStencil& stencil) {
  if (!stencil.asmJS.empty()) {
    return xdr->fail(JS::TranscodeResult_Failure_AsmJSNotSupported);
  }

  // All of the vector-indexed data elements referenced by the
  // main script tree must be materialized first.

  MOZ_TRY(XDRVector(xdr, stencil.scopeData));
  for (auto& entry : stencil.scopeData) {
    MOZ_TRY(StencilXDR::Scope(xdr, entry));
  }

  MOZ_TRY(XDRVector(xdr, stencil.regExpData));
  for (auto& entry : stencil.regExpData) {
    MOZ_TRY(StencilXDR::RegExp(xdr, entry));
  }

  MOZ_TRY(XDRVector(xdr, stencil.bigIntData));
  for (auto& entry : stencil.bigIntData) {
    MOZ_TRY(StencilXDR::BigInt(xdr, entry));
  }

  MOZ_TRY(XDRVector(xdr, stencil.objLiteralData));
  for (auto& entry : stencil.objLiteralData) {
    MOZ_TRY(StencilXDR::ObjLiteral(xdr, entry));
  }

  // Now serialize the vector of ScriptStencils.

  MOZ_TRY(XDRVector(xdr, stencil.scriptData));
  for (auto& entry : stencil.scriptData) {
    MOZ_TRY(StencilXDR::Script(xdr, entry));
  }

  if (stencil.scriptData[CompilationInfo::TopLevelIndex].isModule()) {
    MOZ_TRY(XDRStencilModuleMetadata(xdr, stencil.moduleMetadata));
  }

  return Ok();
}
template XDRResult XDRCompilationStencil(XDRState<XDR_ENCODE>* xdr,
                                         CompilationStencil& stencil);

template XDRResult XDRCompilationStencil(XDRState<XDR_DECODE>* xdr,
                                         CompilationStencil& stencil);

}  // namespace js

/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: set ts=8 sts=2 et sw=2 tw=80:
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "vm/Scope.h"

#include "mozilla/OperatorNewExtensions.h"  // mozilla::KnownNotNull
#include "mozilla/ScopeExit.h"

#include <memory>
#include <new>

#include "builtin/ModuleObject.h"
#include "frontend/CompilationInfo.h"  // CompiltionAtomCache, CompilationInput, CompilationStencil, CompilationGCOutput
#include "frontend/Parser.h"           // Copy*ScopeData
#include "frontend/SharedContext.h"
#include "frontend/Stencil.h"
#include "gc/Allocator.h"
#include "gc/MaybeRooted.h"
#include "util/StringBuffer.h"
#include "vm/EnvironmentObject.h"
#include "vm/JSScript.h"
#include "wasm/WasmInstance.h"

#include "gc/FreeOp-inl.h"
#include "gc/ObjectKind-inl.h"
#include "vm/Shape-inl.h"

using namespace js;
using namespace js::frontend;

using mozilla::Maybe;

const char* js::BindingKindString(BindingKind kind) {
  switch (kind) {
    case BindingKind::Import:
      return "import";
    case BindingKind::FormalParameter:
      return "formal parameter";
    case BindingKind::Var:
      return "var";
    case BindingKind::Let:
      return "let";
    case BindingKind::Const:
      return "const";
    case BindingKind::NamedLambdaCallee:
      return "named lambda callee";
  }
  MOZ_CRASH("Bad BindingKind");
}

const char* js::ScopeKindString(ScopeKind kind) {
  switch (kind) {
    case ScopeKind::Function:
      return "function";
    case ScopeKind::FunctionBodyVar:
      return "function body var";
    case ScopeKind::Lexical:
      return "lexical";
    case ScopeKind::SimpleCatch:
    case ScopeKind::Catch:
      return "catch";
    case ScopeKind::NamedLambda:
      return "named lambda";
    case ScopeKind::StrictNamedLambda:
      return "strict named lambda";
    case ScopeKind::FunctionLexical:
      return "function lexical";
    case ScopeKind::ClassBody:
      return "class body";
    case ScopeKind::With:
      return "with";
    case ScopeKind::Eval:
      return "eval";
    case ScopeKind::StrictEval:
      return "strict eval";
    case ScopeKind::Global:
      return "global";
    case ScopeKind::NonSyntactic:
      return "non-syntactic";
    case ScopeKind::Module:
      return "module";
    case ScopeKind::WasmInstance:
      return "wasm instance";
    case ScopeKind::WasmFunction:
      return "wasm function";
  }
  MOZ_CRASH("Bad ScopeKind");
}

Shape* js::EmptyEnvironmentShape(JSContext* cx, const JSClass* cls,
                                 uint32_t numSlots, uint32_t baseShapeFlags) {
  // Put as many slots into the object header as possible.
  uint32_t numFixed = gc::GetGCKindSlots(gc::GetGCObjectKind(numSlots));
  return EmptyShape::getInitialShape(cx, cls, TaggedProto(nullptr), numFixed,
                                     baseShapeFlags);
}

static Shape* NextEnvironmentShape(JSContext* cx, HandleAtom name,
                                   BindingKind bindKind, uint32_t slot,
                                   StackBaseShape& stackBase,
                                   HandleShape shape) {
  UnownedBaseShape* base = BaseShape::getUnowned(cx, stackBase);
  if (!base) {
    return nullptr;
  }

  unsigned attrs = JSPROP_PERMANENT | JSPROP_ENUMERATE;
  switch (bindKind) {
    case BindingKind::Const:
    case BindingKind::NamedLambdaCallee:
      attrs |= JSPROP_READONLY;
      break;
    default:
      break;
  }

  jsid id = NameToId(name->asPropertyName());
  Rooted<StackShape> child(cx, StackShape(base, id, slot, attrs));
  return cx->zone()->propertyTree().getChild(cx, shape, child);
}

Shape* js::CreateEnvironmentShape(JSContext* cx, BindingIter& bi,
                                  const JSClass* cls, uint32_t numSlots,
                                  uint32_t baseShapeFlags) {
  RootedShape shape(cx,
                    EmptyEnvironmentShape(cx, cls, numSlots, baseShapeFlags));
  if (!shape) {
    return nullptr;
  }

  RootedAtom name(cx);
  StackBaseShape stackBase(cls, baseShapeFlags);
  for (; bi; bi++) {
    BindingLocation loc = bi.location();
    if (loc.kind() == BindingLocation::Kind::Environment) {
      name = bi.name();
      cx->markAtom(name);
      shape = NextEnvironmentShape(cx, name, bi.kind(), loc.slot(), stackBase,
                                   shape);
      if (!shape) {
        return nullptr;
      }
    }
  }

  return shape;
}

Shape* js::CreateEnvironmentShape(
    JSContext* cx, frontend::CompilationAtomCache& atomCache,
    AbstractBindingIter<const frontend::ParserAtom>& bi, const JSClass* cls,
    uint32_t numSlots, uint32_t baseShapeFlags) {
  RootedShape shape(cx,
                    EmptyEnvironmentShape(cx, cls, numSlots, baseShapeFlags));
  if (!shape) {
    return nullptr;
  }

  RootedAtom name(cx);
  StackBaseShape stackBase(cls, baseShapeFlags);
  for (; bi; bi++) {
    BindingLocation loc = bi.location();
    if (loc.kind() == BindingLocation::Kind::Environment) {
      name = bi.name()->toExistingJSAtom(cx, atomCache);
      MOZ_ASSERT(name);
      cx->markAtom(name);
      shape = NextEnvironmentShape(cx, name, bi.kind(), loc.slot(), stackBase,
                                   shape);
      if (!shape) {
        return nullptr;
      }
    }
  }

  return shape;
}

template <class Data>
inline size_t SizeOfAllocatedData(Data* data) {
  return SizeOfScopeData<Data>(data->length);
}

template <typename ConcreteScope>
static UniquePtr<typename ConcreteScope::Data> CopyScopeData(
    JSContext* cx, typename ConcreteScope::Data* data) {
  using Data = typename ConcreteScope::Data;

  // Make sure the binding names are marked in the context's zone, if we are
  // copying data from another zone.
  BindingName* names = data->trailingNames.start();
  uint32_t length = data->length;
  for (size_t i = 0; i < length; i++) {
    if (JSAtom* name = names[i].name()) {
      cx->markAtom(name);
    }
  }

  size_t size = SizeOfAllocatedData(data);
  void* bytes = cx->pod_malloc<char>(size);
  if (!bytes) {
    return nullptr;
  }

  auto* dataCopy = new (bytes) Data(*data);

  std::uninitialized_copy_n(data->trailingNames.start(), data->length,
                            dataCopy->trailingNames.start());

  return UniquePtr<Data>(dataCopy);
}

template <typename ConcreteScope>
static void MarkParserScopeData(ParserScopeData<ConcreteScope>* data) {
  auto* names = data->trailingNames.start();
  uint32_t length = data->length;
  for (size_t i = 0; i < length; i++) {
    if (const ParserAtom* name = names[i].name()) {
      name->markUsedByStencil();
    }
  }
}

static bool SetEnvironmentShape(JSContext* cx, BindingIter& freshBi,
                                BindingIter& bi, const JSClass* cls,
                                uint32_t firstFrameSlot,
                                uint32_t baseShapeFlags,
                                MutableHandleShape envShape) {
  envShape.set(CreateEnvironmentShape(
      cx, freshBi, cls, bi.nextEnvironmentSlot(), baseShapeFlags));
  return envShape;
}

static bool SetEnvironmentShape(JSContext* cx, ParserBindingIter& freshBi,
                                ParserBindingIter& bi, const JSClass* cls,
                                uint32_t firstFrameSlot,
                                uint32_t baseShapeFlags,
                                mozilla::Maybe<uint32_t>* envShape) {
  envShape->emplace(bi.nextEnvironmentSlot());
  return true;
}

template <typename ConcreteScope, typename AtomT, typename EnvironmentT,
          typename ShapeT>
static bool PrepareScopeData(
    JSContext* cx, AbstractBindingIter<AtomT>& bi,
    typename MaybeRootedScopeData<ConcreteScope, AtomT>::HandleType data,
    uint32_t firstFrameSlot, ShapeT envShape) {
  const JSClass* cls = &EnvironmentT::class_;
  uint32_t baseShapeFlags = EnvironmentT::BASESHAPE_FLAGS;

  // Copy a fresh BindingIter for use below.
  AbstractBindingIter<AtomT> freshBi(bi);

  // Iterate through all bindings. This counts the number of environment
  // slots needed and computes the maximum frame slot.
  while (bi) {
    bi++;
  }
  data->nextFrameSlot =
      bi.canHaveFrameSlots() ? bi.nextFrameSlot() : LOCALNO_LIMIT;

  // Data is not used after this point.  Before this point, gc cannot
  // occur, so `data` is fine as a raw pointer.

  // Make a new environment shape if any environment slots were used.
  if (bi.nextEnvironmentSlot() != JSSLOT_FREE(cls)) {
    if (!SetEnvironmentShape(cx, freshBi, bi, cls, firstFrameSlot,
                             baseShapeFlags, envShape)) {
      return false;
    }
  }

  return true;
}

template <typename ConcreteScope>
static ParserScopeData<ConcreteScope>* NewEmptyParserScopeData(
    JSContext* cx, LifoAlloc& alloc, uint32_t length = 0) {
  using Data = ParserScopeData<ConcreteScope>;

  size_t dataSize = SizeOfScopeData<Data>(length);
  void* raw = alloc.alloc(dataSize);
  if (!raw) {
    js::ReportOutOfMemory(cx);
    return nullptr;
  }

  return new (raw) Data(length);
}

template <typename ConcreteScope, typename AtomT>
static UniquePtr<AbstractScopeData<ConcreteScope, AtomT>> NewEmptyScopeData(
    JSContext* cx, uint32_t length = 0) {
  using Data = AbstractScopeData<ConcreteScope, AtomT>;

  size_t dataSize = SizeOfScopeData<Data>(length);
  uint8_t* bytes = cx->pod_malloc<uint8_t>(dataSize);
  auto data = reinterpret_cast<Data*>(bytes);
  if (data) {
    new (data) Data(length);
  }
  return UniquePtr<Data>(data);
}

template <typename ConcreteScope>
static UniquePtr<typename ConcreteScope::Data> LiftParserScopeData(
    JSContext* cx, frontend::CompilationAtomCache& atomCache,
    ParserScopeData<ConcreteScope>* data) {
  using ConcreteData = typename ConcreteScope::Data;

  // Convert all scope ParserAtoms to rooted JSAtoms.
  // Rooting is necessary as conversion can gc.
  JS::RootedVector<JSAtom*> jsatoms(cx);
  if (!jsatoms.reserve(data->length)) {
    return nullptr;
  }
  auto* names = data->trailingNames.start();
  uint32_t length = data->length;
  for (size_t i = 0; i < length; i++) {
    JSAtom* jsatom = nullptr;
    if (names[i].name()) {
      jsatom = names[i].name()->toExistingJSAtom(cx, atomCache);
      MOZ_ASSERT(jsatom);
    }
    jsatoms.infallibleAppend(jsatom);
  }

  // Allocate a new scope-data of the right kind.
  UniquePtr<ConcreteData> scopeData(
      NewEmptyScopeData<ConcreteScope, JSAtom>(cx, data->length));
  if (!scopeData) {
    return nullptr;
  }

  // Memcopy the head of the structure directly, no translation needed.
  static_assert(sizeof(ConcreteData) == sizeof(ParserScopeData<ConcreteScope>),
                "Parser and VM scope-data structures should be same size.");
  memcpy(scopeData.get(), data, offsetof(ConcreteData, trailingNames));

  // Initialize new scoped names.
  auto* namesOut = scopeData->trailingNames.start();
  for (size_t i = 0; i < length; i++) {
    namesOut[i] = names[i].transformName(jsatoms[i].get());
  }

  return scopeData;
}

static constexpr size_t HasAtomMask = 1;
static constexpr size_t HasAtomShift = 1;

static XDRResult XDRTrailingName(XDRState<XDR_ENCODE>* xdr,
                                 BindingName* bindingName,
                                 const uint32_t* length) {
  JSContext* cx = xdr->cx();

  RootedAtom atom(cx, bindingName->name());
  bool hasAtom = !!atom;

  uint8_t flags = bindingName->flagsForXDR();
  MOZ_ASSERT(((flags << HasAtomShift) >> HasAtomShift) == flags);
  uint8_t u8 = (flags << HasAtomShift) | uint8_t(hasAtom);
  MOZ_TRY(xdr->codeUint8(&u8));

  if (hasAtom) {
    MOZ_TRY(XDRAtom(xdr, &atom));
  }

  return Ok();
}

static XDRResult XDRTrailingName(XDRState<XDR_DECODE>* xdr, void* bindingName,
                                 uint32_t* length) {
  JSContext* cx = xdr->cx();

  uint8_t u8;
  MOZ_TRY(xdr->codeUint8(&u8));

  bool hasAtom = u8 & HasAtomMask;
  RootedAtom atom(cx);
  if (hasAtom) {
    MOZ_TRY(XDRAtom(xdr, &atom));
  }

  uint8_t flags = u8 >> HasAtomShift;
  new (bindingName) BindingName(BindingName::fromXDR(atom, flags));
  ++*length;

  return Ok();
}

template <typename ConcreteScope, XDRMode mode>
/* static */
XDRResult Scope::XDRSizedBindingNames(
    XDRState<mode>* xdr, Handle<ConcreteScope*> scope,
    MutableHandle<typename ConcreteScope::Data*> data) {
  MOZ_ASSERT(!data);

  JSContext* cx = xdr->cx();

  uint32_t length;
  if (mode == XDR_ENCODE) {
    length = scope->data().length;
  }
  MOZ_TRY(xdr->codeUint32(&length));

  if (mode == XDR_ENCODE) {
    data.set(&scope->data());
  } else {
    data.set(NewEmptyScopeData<ConcreteScope, JSAtom>(cx, length).release());
    if (!data) {
      return xdr->fail(JS::TranscodeResult_Throw);
    }
  }

  auto dataGuard = mozilla::MakeScopeExit([&]() {
    if (mode == XDR_DECODE) {
      js_delete(data.get());
      data.set(nullptr);
    }
  });

  for (uint32_t i = 0; i < length; i++) {
    if (mode == XDR_DECODE) {
      MOZ_ASSERT(i == data->length, "must be decoding at the end");
    }
    MOZ_TRY(XDRTrailingName(xdr, &data->trailingNames[i], &data->length));
  }
  MOZ_ASSERT(data->length == length);

  dataGuard.release();
  return Ok();
}

/* static */
Scope* Scope::create(JSContext* cx, ScopeKind kind, HandleScope enclosing,
                     HandleShape envShape) {
  Scope* scope = Allocate<Scope>(cx);
  if (scope) {
    new (scope) Scope(kind, enclosing, envShape);
  }
  return scope;
}

template <typename ConcreteScope>
/* static */
ConcreteScope* Scope::create(
    JSContext* cx, ScopeKind kind, HandleScope enclosing, HandleShape envShape,
    MutableHandle<UniquePtr<typename ConcreteScope::Data>> data) {
  Scope* scope = create(cx, kind, enclosing, envShape);
  if (!scope) {
    return nullptr;
  }

  // It is an invariant that all Scopes that have data (currently, all
  // ScopeKinds except With) must have non-null data.
  MOZ_ASSERT(data);
  scope->initData<ConcreteScope>(data);

  return &scope->as<ConcreteScope>();
}

template <typename ConcreteScope>
inline void Scope::initData(
    MutableHandle<UniquePtr<typename ConcreteScope::Data>> data) {
  MOZ_ASSERT(!rawData());

  AddCellMemory(this, SizeOfAllocatedData(data.get().get()),
                MemoryUse::ScopeData);

  setHeaderPtr(data.get().release());
}

template <typename EnvironmentT>
bool Scope::updateEnvShapeIfRequired(JSContext* cx, MutableHandleShape envShape,
                                     bool needsEnvironment) {
  if (!envShape && needsEnvironment) {
    envShape.set(EmptyEnvironmentShape<EnvironmentT>(cx));
    if (!envShape) {
      return false;
    }
  }
  return true;
}

template <typename EnvironmentT>
bool Scope::updateEnvShapeIfRequired(JSContext* cx,
                                     mozilla::Maybe<uint32_t>* envShape,
                                     bool needsEnvironment) {
  if (envShape->isNothing() && needsEnvironment) {
    uint32_t numSlots = 0;
    envShape->emplace(numSlots);
  }
  return true;
}

uint32_t Scope::firstFrameSlot() const {
  switch (kind()) {
    case ScopeKind::Lexical:
    case ScopeKind::SimpleCatch:
    case ScopeKind::Catch:
    case ScopeKind::FunctionLexical:
    case ScopeKind::ClassBody:
      // For intra-frame scopes, find the enclosing scope's next frame slot.
      MOZ_ASSERT(is<LexicalScope>());
      return LexicalScope::nextFrameSlot(AbstractScopePtr(enclosing()));

    case ScopeKind::NamedLambda:
    case ScopeKind::StrictNamedLambda:
      // Named lambda scopes cannot have frame slots.
      return LOCALNO_LIMIT;

    case ScopeKind::FunctionBodyVar:
      if (enclosing()->is<FunctionScope>()) {
        return enclosing()->as<FunctionScope>().nextFrameSlot();
      }
      break;

    default:
      break;
  }
  return 0;
}

uint32_t Scope::chainLength() const {
  uint32_t length = 0;
  for (ScopeIter si(const_cast<Scope*>(this)); si; si++) {
    length++;
  }
  return length;
}

uint32_t Scope::environmentChainLength() const {
  uint32_t length = 0;
  for (ScopeIter si(const_cast<Scope*>(this)); si; si++) {
    if (si.hasSyntacticEnvironment()) {
      length++;
    }
  }
  return length;
}

Shape* Scope::maybeCloneEnvironmentShape(JSContext* cx) {
  // Clone the environment shape if cloning into a different zone.
  Shape* shape = environmentShape();
  if (shape && shape->zoneFromAnyThread() != cx->zone()) {
    BindingIter bi(this);
    return CreateEnvironmentShape(cx, bi, shape->getObjectClass(),
                                  shape->slotSpan(), shape->getObjectFlags());
  }
  return shape;
}

/* static */
Scope* Scope::clone(JSContext* cx, HandleScope scope, HandleScope enclosing) {
  RootedShape envShape(cx);
  if (scope->environmentShape()) {
    envShape = scope->maybeCloneEnvironmentShape(cx);
    if (!envShape) {
      return nullptr;
    }
  }

  switch (scope->kind_) {
    case ScopeKind::Function: {
      RootedScript script(cx, scope->as<FunctionScope>().script());
      const char* filename = script->filename();
      // If the script has an internal URL, include it in the crash reason. If
      // not, it may be a web URL, and therefore privacy-sensitive.
      if (!strncmp(filename, "chrome:", 7) ||
          !strncmp(filename, "resource:", 9)) {
        MOZ_CRASH_UNSAFE_PRINTF("Use FunctionScope::clone (script URL: %s)",
                                filename);
      }

      MOZ_CRASH("Use FunctionScope::clone.");
      break;
    }

    case ScopeKind::FunctionBodyVar: {
      Rooted<UniquePtr<VarScope::Data>> dataClone(cx);
      dataClone = CopyScopeData<VarScope>(cx, &scope->as<VarScope>().data());
      if (!dataClone) {
        return nullptr;
      }
      return create<VarScope>(cx, scope->kind_, enclosing, envShape,
                              &dataClone);
    }

    case ScopeKind::Lexical:
    case ScopeKind::SimpleCatch:
    case ScopeKind::Catch:
    case ScopeKind::NamedLambda:
    case ScopeKind::StrictNamedLambda:
    case ScopeKind::FunctionLexical:
    case ScopeKind::ClassBody: {
      Rooted<UniquePtr<LexicalScope::Data>> dataClone(cx);
      dataClone =
          CopyScopeData<LexicalScope>(cx, &scope->as<LexicalScope>().data());
      if (!dataClone) {
        return nullptr;
      }
      return create<LexicalScope>(cx, scope->kind_, enclosing, envShape,
                                  &dataClone);
    }

    case ScopeKind::With:
      return create(cx, scope->kind_, enclosing, envShape);

    case ScopeKind::Eval:
    case ScopeKind::StrictEval: {
      Rooted<UniquePtr<EvalScope::Data>> dataClone(cx);
      dataClone = CopyScopeData<EvalScope>(cx, &scope->as<EvalScope>().data());
      if (!dataClone) {
        return nullptr;
      }
      return create<EvalScope>(cx, scope->kind_, enclosing, envShape,
                               &dataClone);
    }

    case ScopeKind::Global:
    case ScopeKind::NonSyntactic:
      MOZ_CRASH("Use GlobalScope::clone.");
      break;

    case ScopeKind::WasmFunction:
      MOZ_CRASH("wasm functions are not nested in JSScript");
      break;

    case ScopeKind::Module:
    case ScopeKind::WasmInstance:
      MOZ_CRASH("NYI");
      break;
  }

  return nullptr;
}

void Scope::finalize(JSFreeOp* fop) {
  MOZ_ASSERT(CurrentThreadIsGCFinalizing());
  applyScopeDataTyped([this, fop](auto data) {
    fop->delete_(this, data, SizeOfAllocatedData(data), MemoryUse::ScopeData);
  });
  setHeaderPtr(nullptr);
}

size_t Scope::sizeOfExcludingThis(mozilla::MallocSizeOf mallocSizeOf) const {
  if (rawData()) {
    return mallocSizeOf(rawData());
  }
  return 0;
}

void Scope::dump() {
  for (ScopeIter si(this); si; si++) {
    fprintf(stderr, "%s [%p]", ScopeKindString(si.kind()), si.scope());
    if (si.scope()->enclosing()) {
      fprintf(stderr, " -> ");
    }
  }
  fprintf(stderr, "\n");
}

#if defined(DEBUG) || defined(JS_JITSPEW)

/* static */
bool Scope::dumpForDisassemble(JSContext* cx, JS::Handle<Scope*> scope,
                               GenericPrinter& out, const char* indent) {
  if (!out.put(ScopeKindString(scope->kind()))) {
    return false;
  }
  if (!out.put(" {")) {
    return false;
  }

  size_t i = 0;
  for (Rooted<BindingIter> bi(cx, BindingIter(scope)); bi; bi++, i++) {
    if (i == 0) {
      if (!out.put("\n")) {
        return false;
      }
    }
    UniqueChars bytes = AtomToPrintableString(cx, bi.name());
    if (!bytes) {
      return false;
    }
    if (!out.put(indent)) {
      return false;
    }
    if (!out.printf("  %2zu: %s %s ", i, BindingKindString(bi.kind()),
                    bytes.get())) {
      return false;
    }
    switch (bi.location().kind()) {
      case BindingLocation::Kind::Global:
        if (bi.isTopLevelFunction()) {
          if (!out.put("(global function)\n")) {
            return false;
          }
        } else {
          if (!out.put("(global)\n")) {
            return false;
          }
        }
        break;
      case BindingLocation::Kind::Argument:
        if (!out.printf("(arg slot %u)\n", bi.location().argumentSlot())) {
          return false;
        }
        break;
      case BindingLocation::Kind::Frame:
        if (!out.printf("(frame slot %u)\n", bi.location().slot())) {
          return false;
        }
        break;
      case BindingLocation::Kind::Environment:
        if (!out.printf("(env slot %u)\n", bi.location().slot())) {
          return false;
        }
        break;
      case BindingLocation::Kind::NamedLambdaCallee:
        if (!out.put("(named lambda callee)\n")) {
          return false;
        }
        break;
      case BindingLocation::Kind::Import:
        if (!out.put("(import)\n")) {
          return false;
        }
        break;
    }
  }
  if (i > 0) {
    if (!out.put(indent)) {
      return false;
    }
  }
  if (!out.put("}")) {
    return false;
  }

  ScopeIter si(scope);
  si++;
  for (; si; si++) {
    if (!out.put(" -> ")) {
      return false;
    }
    if (!out.put(ScopeKindString(si.kind()))) {
      return false;
    }
  }
  return true;
}

#endif /* defined(DEBUG) || defined(JS_JITSPEW) */

/* static */
uint32_t LexicalScope::nextFrameSlot(const AbstractScopePtr& scope) {
  for (AbstractScopePtrIter si(scope); si; si++) {
    switch (si.kind()) {
      case ScopeKind::With:
        continue;
      case ScopeKind::Function:
      case ScopeKind::FunctionBodyVar:
      case ScopeKind::Lexical:
      case ScopeKind::SimpleCatch:
      case ScopeKind::Catch:
      case ScopeKind::FunctionLexical:
      case ScopeKind::ClassBody:
      case ScopeKind::NamedLambda:
      case ScopeKind::StrictNamedLambda:
      case ScopeKind::Eval:
      case ScopeKind::StrictEval:
      case ScopeKind::Global:
      case ScopeKind::NonSyntactic:
      case ScopeKind::Module:
      case ScopeKind::WasmInstance:
      case ScopeKind::WasmFunction:
        return si.abstractScopePtr().nextFrameSlot();
    }
  }
  MOZ_CRASH("Not an enclosing intra-frame Scope");
}

template <typename AtomT, typename ShapeT>
bool LexicalScope::prepareForScopeCreation(
    JSContext* cx, ScopeKind kind, uint32_t firstFrameSlot,
    typename MaybeRootedScopeData<LexicalScope, AtomT>::MutableHandleType data,
    ShapeT envShape) {
  bool isNamedLambda =
      kind == ScopeKind::NamedLambda || kind == ScopeKind::StrictNamedLambda;

  MOZ_ASSERT_IF(isNamedLambda, firstFrameSlot == LOCALNO_LIMIT);

  AbstractBindingIter<AtomT> bi(*data, firstFrameSlot, isNamedLambda);
  if (!PrepareScopeData<LexicalScope, AtomT, LexicalEnvironmentObject>(
          cx, bi, data, firstFrameSlot, envShape)) {
    return false;
  }
  return true;
}

/* static */
LexicalScope* LexicalScope::createWithData(JSContext* cx, ScopeKind kind,
                                           MutableHandle<UniquePtr<Data>> data,
                                           uint32_t firstFrameSlot,
                                           HandleScope enclosing) {
  RootedShape envShape(cx);

  if (!prepareForScopeCreation<JSAtom>(cx, kind, firstFrameSlot, data,
                                       &envShape)) {
    return nullptr;
  }

  auto scope = Scope::create<LexicalScope>(cx, kind, enclosing, envShape, data);
  if (!scope) {
    return nullptr;
  }

  MOZ_ASSERT(scope->firstFrameSlot() == firstFrameSlot);
  return scope;
}

/* static */
Shape* LexicalScope::getEmptyExtensibleEnvironmentShape(JSContext* cx) {
  const JSClass* cls = &LexicalEnvironmentObject::class_;
  return EmptyEnvironmentShape(cx, cls, JSSLOT_FREE(cls),
                               /* baseShapeFlags = */ 0);
}

template <XDRMode mode>
/* static */
XDRResult LexicalScope::XDR(XDRState<mode>* xdr, ScopeKind kind,
                            HandleScope enclosing, MutableHandleScope scope) {
  JSContext* cx = xdr->cx();

  Rooted<Data*> data(cx);
  MOZ_TRY(
      XDRSizedBindingNames<LexicalScope>(xdr, scope.as<LexicalScope>(), &data));

  {
    Maybe<Rooted<UniquePtr<Data>>> uniqueData;
    if (mode == XDR_DECODE) {
      uniqueData.emplace(cx, data);
    }

    uint32_t firstFrameSlot;
    uint32_t nextFrameSlot;
    if (mode == XDR_ENCODE) {
      firstFrameSlot = scope->firstFrameSlot();
      nextFrameSlot = data->nextFrameSlot;
    }

    MOZ_TRY(xdr->codeUint32(&data->constStart));
    MOZ_TRY(xdr->codeUint32(&firstFrameSlot));
    MOZ_TRY(xdr->codeUint32(&nextFrameSlot));

    if (mode == XDR_DECODE) {
      scope.set(createWithData(cx, kind, &uniqueData.ref(), firstFrameSlot,
                               enclosing));
      if (!scope) {
        return xdr->fail(JS::TranscodeResult_Throw);
      }

      // nextFrameSlot is used only for this correctness check.
      MOZ_ASSERT(nextFrameSlot ==
                 scope->as<LexicalScope>().data().nextFrameSlot);
    }
  }

  return Ok();
}

template
    /* static */
    XDRResult
    LexicalScope::XDR(XDRState<XDR_ENCODE>* xdr, ScopeKind kind,
                      HandleScope enclosing, MutableHandleScope scope);

template
    /* static */
    XDRResult
    LexicalScope::XDR(XDRState<XDR_DECODE>* xdr, ScopeKind kind,
                      HandleScope enclosing, MutableHandleScope scope);

template <typename AtomT, typename ShapeT>
bool FunctionScope::prepareForScopeCreation(
    JSContext* cx,
    typename MaybeRootedScopeData<FunctionScope, AtomT>::MutableHandleType data,
    bool hasParameterExprs, bool needsEnvironment, HandleFunction fun,
    ShapeT envShape) {
  uint32_t firstFrameSlot = 0;
  AbstractBindingIter<AtomT> bi(*data, hasParameterExprs);
  if (!PrepareScopeData<FunctionScope, AtomT, CallObject>(
          cx, bi, data, firstFrameSlot, envShape)) {
    return false;
  }

  data->hasParameterExprs = hasParameterExprs;
  data->canonicalFunction.init(fun);

  // An environment may be needed regardless of existence of any closed over
  // bindings:
  //   - Extensible scopes (i.e., due to direct eval)
  //   - Needing a home object
  //   - Being a derived class constructor
  //   - Being a generator or async function
  // Also see |FunctionBox::needsExtraBodyVarEnvironmentRegardlessOfBindings()|.
  return updateEnvShapeIfRequired<CallObject>(cx, envShape, needsEnvironment);
}

/* static */
FunctionScope* FunctionScope::createWithData(
    JSContext* cx, MutableHandle<UniquePtr<Data>> data, bool hasParameterExprs,
    bool needsEnvironment, HandleFunction fun, HandleScope enclosing) {
  MOZ_ASSERT(data);
  MOZ_ASSERT(fun->isTenured());

  RootedShape envShape(cx);

  if (!prepareForScopeCreation<JSAtom>(cx, data, hasParameterExprs,
                                       needsEnvironment, fun, &envShape)) {
    return nullptr;
  }

  return Scope::create<FunctionScope>(cx, ScopeKind::Function, enclosing,
                                      envShape, data);
}

JSScript* FunctionScope::script() const {
  return canonicalFunction()->nonLazyScript();
}

/* static */
bool FunctionScope::isSpecialName(JSContext* cx, JSAtom* name) {
  return name == cx->names().arguments || name == cx->names().dotThis ||
         name == cx->names().dotGenerator;
}

/* static */
bool FunctionScope::isSpecialName(JSContext* cx, const ParserAtom* name) {
  return name == cx->parserNames().arguments ||
         name == cx->parserNames().dotThis ||
         name == cx->parserNames().dotGenerator;
}

/* static */
FunctionScope* FunctionScope::clone(JSContext* cx, Handle<FunctionScope*> scope,
                                    HandleFunction fun, HandleScope enclosing) {
  MOZ_ASSERT(fun != scope->canonicalFunction());

  RootedShape envShape(cx);
  if (scope->environmentShape()) {
    envShape = scope->maybeCloneEnvironmentShape(cx);
    if (!envShape) {
      return nullptr;
    }
  }

  Rooted<Data*> dataOriginal(cx, &scope->as<FunctionScope>().data());
  Rooted<UniquePtr<Data>> dataClone(
      cx, CopyScopeData<FunctionScope>(cx, dataOriginal));
  if (!dataClone) {
    return nullptr;
  }

  dataClone->canonicalFunction = fun;

  return Scope::create<FunctionScope>(cx, scope->kind(), enclosing, envShape,
                                      &dataClone);
}

template <XDRMode mode>
/* static */
XDRResult FunctionScope::XDR(XDRState<mode>* xdr, HandleFunction fun,
                             HandleScope enclosing, MutableHandleScope scope) {
  JSContext* cx = xdr->cx();
  Rooted<Data*> data(cx);
  MOZ_TRY(XDRSizedBindingNames<FunctionScope>(xdr, scope.as<FunctionScope>(),
                                              &data));

  {
    Maybe<Rooted<UniquePtr<Data>>> uniqueData;
    if (mode == XDR_DECODE) {
      uniqueData.emplace(cx, data);
    }

    uint8_t needsEnvironment;
    uint8_t hasParameterExprs;
    uint32_t nextFrameSlot;
    if (mode == XDR_ENCODE) {
      needsEnvironment = scope->hasEnvironment();
      hasParameterExprs = data->hasParameterExprs;
      nextFrameSlot = data->nextFrameSlot;
    }
    MOZ_TRY(xdr->codeUint8(&needsEnvironment));
    MOZ_TRY(xdr->codeUint8(&hasParameterExprs));
    MOZ_TRY(xdr->codeUint16(&data->nonPositionalFormalStart));
    MOZ_TRY(xdr->codeUint16(&data->varStart));
    MOZ_TRY(xdr->codeUint32(&nextFrameSlot));

    if (mode == XDR_DECODE) {
      if (!data->length) {
        MOZ_ASSERT(!data->nonPositionalFormalStart);
        MOZ_ASSERT(!data->varStart);
        MOZ_ASSERT(!data->nextFrameSlot);
      }

      scope.set(createWithData(cx, &uniqueData.ref(), hasParameterExprs,
                               needsEnvironment, fun, enclosing));
      if (!scope) {
        return xdr->fail(JS::TranscodeResult_Throw);
      }

      // nextFrameSlot is used only for this correctness check.
      MOZ_ASSERT(nextFrameSlot ==
                 scope->as<FunctionScope>().data().nextFrameSlot);
    }
  }

  return Ok();
}

template
    /* static */
    XDRResult
    FunctionScope::XDR(XDRState<XDR_ENCODE>* xdr, HandleFunction fun,
                       HandleScope enclosing, MutableHandleScope scope);

template
    /* static */
    XDRResult
    FunctionScope::XDR(XDRState<XDR_DECODE>* xdr, HandleFunction fun,
                       HandleScope enclosing, MutableHandleScope scope);

template <typename AtomT, typename ShapeT>
bool VarScope::prepareForScopeCreation(
    JSContext* cx, ScopeKind kind,
    typename MaybeRootedScopeData<VarScope, AtomT>::MutableHandleType data,
    uint32_t firstFrameSlot, bool needsEnvironment, ShapeT envShape) {
  AbstractBindingIter<AtomT> bi(*data, firstFrameSlot);
  if (!PrepareScopeData<VarScope, AtomT, VarEnvironmentObject>(
          cx, bi, data, firstFrameSlot, envShape)) {
    return false;
  }

  // An environment may be needed regardless of existence of any closed over
  // bindings:
  //   - Extensible scopes (i.e., due to direct eval)
  //   - Being a generator
  return updateEnvShapeIfRequired<VarEnvironmentObject>(cx, envShape,
                                                        needsEnvironment);
}

/* static */
VarScope* VarScope::createWithData(JSContext* cx, ScopeKind kind,
                                   MutableHandle<UniquePtr<Data>> data,
                                   uint32_t firstFrameSlot,
                                   bool needsEnvironment,
                                   HandleScope enclosing) {
  MOZ_ASSERT(data);

  RootedShape envShape(cx);
  if (!prepareForScopeCreation<JSAtom>(cx, kind, data, firstFrameSlot,
                                       needsEnvironment, &envShape)) {
    return nullptr;
  }

  return Scope::create<VarScope>(cx, kind, enclosing, envShape, data);
}

template <XDRMode mode>
/* static */
XDRResult VarScope::XDR(XDRState<mode>* xdr, ScopeKind kind,
                        HandleScope enclosing, MutableHandleScope scope) {
  JSContext* cx = xdr->cx();
  Rooted<Data*> data(cx);
  MOZ_TRY(XDRSizedBindingNames<VarScope>(xdr, scope.as<VarScope>(), &data));

  {
    Maybe<Rooted<UniquePtr<Data>>> uniqueData;
    if (mode == XDR_DECODE) {
      uniqueData.emplace(cx, data);
    }

    uint8_t needsEnvironment;
    uint32_t firstFrameSlot;
    uint32_t nextFrameSlot;
    if (mode == XDR_ENCODE) {
      needsEnvironment = scope->hasEnvironment();
      firstFrameSlot = scope->firstFrameSlot();
      nextFrameSlot = data->nextFrameSlot;
    }
    MOZ_TRY(xdr->codeUint8(&needsEnvironment));
    MOZ_TRY(xdr->codeUint32(&firstFrameSlot));
    MOZ_TRY(xdr->codeUint32(&nextFrameSlot));

    if (mode == XDR_DECODE) {
      if (!data->length) {
        MOZ_ASSERT(!data->nextFrameSlot);
      }

      scope.set(createWithData(cx, kind, &uniqueData.ref(), firstFrameSlot,
                               needsEnvironment, enclosing));
      if (!scope) {
        return xdr->fail(JS::TranscodeResult_Throw);
      }

      // nextFrameSlot is used only for this correctness check.
      MOZ_ASSERT(nextFrameSlot == scope->as<VarScope>().data().nextFrameSlot);
    }
  }

  return Ok();
}

template
    /* static */
    XDRResult
    VarScope::XDR(XDRState<XDR_ENCODE>* xdr, ScopeKind kind,
                  HandleScope enclosing, MutableHandleScope scope);

template
    /* static */
    XDRResult
    VarScope::XDR(XDRState<XDR_DECODE>* xdr, ScopeKind kind,
                  HandleScope enclosing, MutableHandleScope scope);

/* static */
GlobalScope* GlobalScope::create(JSContext* cx, ScopeKind kind,
                                 Handle<Data*> dataArg) {
  // The data that's passed in is from the frontend and is LifoAlloc'd.
  // Copy it now that we're creating a permanent VM scope.
  Rooted<UniquePtr<Data>> data(
      cx, dataArg ? CopyScopeData<GlobalScope>(cx, dataArg)
                  : NewEmptyScopeData<GlobalScope, JSAtom>(cx));
  if (!data) {
    return nullptr;
  }

  return createWithData(cx, kind, &data);
}

/* static */
GlobalScope* GlobalScope::createWithData(JSContext* cx, ScopeKind kind,
                                         MutableHandle<UniquePtr<Data>> data) {
  MOZ_ASSERT(data);

  // The global scope has no environment shape. Its environment is the
  // global lexical scope and the global object or non-syntactic objects
  // created by embedding, all of which are not only extensible but may
  // have names on them deleted.
  return Scope::create<GlobalScope>(cx, kind, nullptr, nullptr, data);
}

/* static */
GlobalScope* GlobalScope::clone(JSContext* cx, Handle<GlobalScope*> scope,
                                ScopeKind kind) {
  Rooted<Data*> dataOriginal(cx, &scope->as<GlobalScope>().data());
  Rooted<UniquePtr<Data>> dataClone(
      cx, CopyScopeData<GlobalScope>(cx, dataOriginal));
  if (!dataClone) {
    return nullptr;
  }
  return Scope::create<GlobalScope>(cx, kind, nullptr, nullptr, &dataClone);
}

template <XDRMode mode>
/* static */
XDRResult GlobalScope::XDR(XDRState<mode>* xdr, ScopeKind kind,
                           MutableHandleScope scope) {
  MOZ_ASSERT((mode == XDR_DECODE) == !scope);

  JSContext* cx = xdr->cx();
  Rooted<Data*> data(cx);
  MOZ_TRY(
      XDRSizedBindingNames<GlobalScope>(xdr, scope.as<GlobalScope>(), &data));

  {
    Maybe<Rooted<UniquePtr<Data>>> uniqueData;
    if (mode == XDR_DECODE) {
      uniqueData.emplace(cx, data);
    }

    MOZ_TRY(xdr->codeUint32(&data->letStart));
    MOZ_TRY(xdr->codeUint32(&data->constStart));

    if (mode == XDR_DECODE) {
      if (!data->length) {
        MOZ_ASSERT(!data->letStart);
        MOZ_ASSERT(!data->constStart);
      }

      scope.set(createWithData(cx, kind, &uniqueData.ref()));
      if (!scope) {
        return xdr->fail(JS::TranscodeResult_Throw);
      }
    }
  }

  return Ok();
}

template
    /* static */
    XDRResult
    GlobalScope::XDR(XDRState<XDR_ENCODE>* xdr, ScopeKind kind,
                     MutableHandleScope scope);

template
    /* static */
    XDRResult
    GlobalScope::XDR(XDRState<XDR_DECODE>* xdr, ScopeKind kind,
                     MutableHandleScope scope);

/* static */
WithScope* WithScope::create(JSContext* cx, HandleScope enclosing) {
  Scope* scope = Scope::create(cx, ScopeKind::With, enclosing, nullptr);
  return static_cast<WithScope*>(scope);
}

template <XDRMode mode>
/* static */
XDRResult WithScope::XDR(XDRState<mode>* xdr, HandleScope enclosing,
                         MutableHandleScope scope) {
  JSContext* cx = xdr->cx();
  if (mode == XDR_DECODE) {
    scope.set(create(cx, enclosing));
    if (!scope) {
      return xdr->fail(JS::TranscodeResult_Throw);
    }
  }

  return Ok();
}

template
    /* static */
    XDRResult
    WithScope::XDR(XDRState<XDR_ENCODE>* xdr, HandleScope enclosing,
                   MutableHandleScope scope);

template
    /* static */
    XDRResult
    WithScope::XDR(XDRState<XDR_DECODE>* xdr, HandleScope enclosing,
                   MutableHandleScope scope);

template <typename AtomT, typename ShapeT>
bool EvalScope::prepareForScopeCreation(
    JSContext* cx, ScopeKind scopeKind,
    typename MaybeRootedScopeData<EvalScope, AtomT>::MutableHandleType data,
    ShapeT envShape) {
  if (scopeKind == ScopeKind::StrictEval) {
    uint32_t firstFrameSlot = 0;
    AbstractBindingIter<AtomT> bi(*data, true);
    if (!PrepareScopeData<EvalScope, AtomT, VarEnvironmentObject>(
            cx, bi, data, firstFrameSlot, envShape)) {
      return false;
    }
  }

  // Strict eval and direct eval in parameter expressions always get their own
  // var environment even if there are no bindings.
  bool needsEnvironment = (scopeKind == ScopeKind::StrictEval);

  return updateEnvShapeIfRequired<VarEnvironmentObject>(cx, envShape,
                                                        needsEnvironment);
}

/* static */
EvalScope* EvalScope::createWithData(JSContext* cx, ScopeKind scopeKind,
                                     MutableHandle<UniquePtr<Data>> data,
                                     HandleScope enclosing) {
  MOZ_ASSERT(data);

  RootedShape envShape(cx);
  if (!prepareForScopeCreation<JSAtom>(cx, scopeKind, data, &envShape)) {
    return nullptr;
  }

  return Scope::create<EvalScope>(cx, scopeKind, enclosing, envShape, data);
}

/* static */
Scope* EvalScope::nearestVarScopeForDirectEval(Scope* scope) {
  for (ScopeIter si(scope); si; si++) {
    switch (si.kind()) {
      case ScopeKind::Function:
      case ScopeKind::FunctionBodyVar:
      case ScopeKind::Global:
      case ScopeKind::NonSyntactic:
        return scope;
      default:
        break;
    }
  }
  return nullptr;
}

template <XDRMode mode>
/* static */
XDRResult EvalScope::XDR(XDRState<mode>* xdr, ScopeKind kind,
                         HandleScope enclosing, MutableHandleScope scope) {
  JSContext* cx = xdr->cx();
  Rooted<Data*> data(cx);

  {
    Maybe<Rooted<UniquePtr<Data>>> uniqueData;
    if (mode == XDR_DECODE) {
      uniqueData.emplace(cx, data);
    }

    MOZ_TRY(XDRSizedBindingNames<EvalScope>(xdr, scope.as<EvalScope>(), &data));

    if (mode == XDR_DECODE) {
      if (!data->length) {
        MOZ_ASSERT(!data->nextFrameSlot);
      }
      scope.set(createWithData(cx, kind, &uniqueData.ref(), enclosing));
      if (!scope) {
        return xdr->fail(JS::TranscodeResult_Throw);
      }
    }
  }

  return Ok();
}

template
    /* static */
    XDRResult
    EvalScope::XDR(XDRState<XDR_ENCODE>* xdr, ScopeKind kind,
                   HandleScope enclosing, MutableHandleScope scope);

template
    /* static */
    XDRResult
    EvalScope::XDR(XDRState<XDR_DECODE>* xdr, ScopeKind kind,
                   HandleScope enclosing, MutableHandleScope scope);

template <>
Zone* ModuleScope::AbstractData<BindingName>::zone() const {
  return module ? module->zone() : nullptr;
}

/* static */
template <typename AtomT, typename ShapeT>
bool ModuleScope::prepareForScopeCreation(
    JSContext* cx,
    typename MaybeRootedScopeData<ModuleScope, AtomT>::MutableHandleType data,
    HandleModuleObject module, ShapeT envShape) {
  uint32_t firstFrameSlot = 0;
  AbstractBindingIter<AtomT> bi(*data);
  if (!PrepareScopeData<ModuleScope, AtomT, ModuleEnvironmentObject>(
          cx, bi, data, firstFrameSlot, envShape)) {
    return false;
  }

  data->module.init(module);

  // Modules always need an environment object for now.
  bool needsEnvironment = true;

  return updateEnvShapeIfRequired<ModuleEnvironmentObject>(cx, envShape,
                                                           needsEnvironment);
}

/* static */
ModuleScope* ModuleScope::createWithData(JSContext* cx,
                                         MutableHandle<UniquePtr<Data>> data,
                                         HandleModuleObject module,
                                         HandleScope enclosing) {
  MOZ_ASSERT(data);
  MOZ_ASSERT(enclosing->is<GlobalScope>());

  RootedShape envShape(cx);
  if (!prepareForScopeCreation<JSAtom>(cx, data, module, &envShape)) {
    return nullptr;
  }

  return Scope::create<ModuleScope>(cx, ScopeKind::Module, enclosing, envShape,
                                    data);
}

template <size_t ArrayLength>
static JSAtom* GenerateWasmName(JSContext* cx,
                                const char (&prefix)[ArrayLength],
                                uint32_t index) {
  StringBuffer sb(cx);
  if (!sb.append(prefix)) {
    return nullptr;
  }
  if (!NumberValueToStringBuffer(cx, Int32Value(index), sb)) {
    return nullptr;
  }

  return sb.finishAtom();
}

template <XDRMode mode>
/* static */
XDRResult ModuleScope::XDR(XDRState<mode>* xdr, HandleModuleObject module,
                           HandleScope enclosing, MutableHandleScope scope) {
  JSContext* cx = xdr->cx();
  Rooted<Data*> data(cx);
  MOZ_TRY(
      XDRSizedBindingNames<ModuleScope>(xdr, scope.as<ModuleScope>(), &data));

  {
    Maybe<Rooted<UniquePtr<Data>>> uniqueData;
    if (mode == XDR_DECODE) {
      uniqueData.emplace(cx, data);
    }

    uint32_t nextFrameSlot;
    if (mode == XDR_ENCODE) {
      nextFrameSlot = data->nextFrameSlot;
    }

    MOZ_TRY(xdr->codeUint32(&data->varStart));
    MOZ_TRY(xdr->codeUint32(&data->letStart));
    MOZ_TRY(xdr->codeUint32(&data->constStart));
    MOZ_TRY(xdr->codeUint32(&nextFrameSlot));

    if (mode == XDR_DECODE) {
      if (!data->length) {
        MOZ_ASSERT(!data->varStart);
        MOZ_ASSERT(!data->letStart);
        MOZ_ASSERT(!data->constStart);
        MOZ_ASSERT(!data->nextFrameSlot);
      }

      scope.set(createWithData(cx, &uniqueData.ref(), module, enclosing));
      if (!scope) {
        return xdr->fail(JS::TranscodeResult_Throw);
      }

      // nextFrameSlot is used only for this correctness check.
      MOZ_ASSERT(nextFrameSlot ==
                 scope->as<ModuleScope>().data().nextFrameSlot);
    }
  }

  return Ok();
}

template
    /* static */
    XDRResult
    ModuleScope::XDR(XDRState<XDR_ENCODE>* xdr, HandleModuleObject module,
                     HandleScope enclosing, MutableHandleScope scope);

template
    /* static */
    XDRResult
    ModuleScope::XDR(XDRState<XDR_DECODE>* xdr, HandleModuleObject module,
                     HandleScope enclosing, MutableHandleScope scope);

static void InitializeTrailingName(
    AbstractTrailingNamesArray<JSAtom>& trailingNames, size_t i, JSAtom* name) {
  void* trailingName = &trailingNames[i];
  new (trailingName) BindingName(name, false);
}

template <class Data>
static void InitializeNextTrailingName(const Rooted<UniquePtr<Data>>& data,
                                       JSAtom* name) {
  InitializeTrailingName(data->trailingNames, data->length, name);
  data->length++;
}

/* static */
WasmInstanceScope* WasmInstanceScope::create(JSContext* cx,
                                             WasmInstanceObject* instance) {
  size_t namesCount = 0;
  if (instance->instance().memory()) {
    namesCount++;
  }
  size_t globalsStart = namesCount;
  size_t globalsCount = instance->instance().metadata().globals.length();
  namesCount += globalsCount;

  Rooted<UniquePtr<Data>> data(
      cx, NewEmptyScopeData<WasmInstanceScope, JSAtom>(cx, namesCount));
  if (!data) {
    return nullptr;
  }

  if (instance->instance().memory()) {
    JSAtom* wasmName = GenerateWasmName(cx, "memory", /* index = */ 0);
    if (!wasmName) {
      return nullptr;
    }

    InitializeNextTrailingName(data, wasmName);
  }

  for (size_t i = 0; i < globalsCount; i++) {
    JSAtom* wasmName = GenerateWasmName(cx, "global", i);
    if (!wasmName) {
      return nullptr;
    }

    InitializeNextTrailingName(data, wasmName);
  }

  MOZ_ASSERT(data->length == namesCount);

  data->instance.init(instance);
  data->globalsStart = globalsStart;

  RootedScope enclosing(cx, &cx->global()->emptyGlobalScope());
  return Scope::create<WasmInstanceScope>(cx, ScopeKind::WasmInstance,
                                          enclosing,
                                          /* envShape = */ nullptr, &data);
}

/* static */
WasmFunctionScope* WasmFunctionScope::create(JSContext* cx,
                                             HandleScope enclosing,
                                             uint32_t funcIndex) {
  MOZ_ASSERT(enclosing->is<WasmInstanceScope>());

  Rooted<WasmFunctionScope*> wasmFunctionScope(cx);

  Rooted<WasmInstanceObject*> instance(
      cx, enclosing->as<WasmInstanceScope>().instance());

  // TODO pull the local variable names from the wasm function definition.
  wasm::ValTypeVector locals;
  size_t argsLength;
  wasm::StackResults unusedStackResults;
  if (!instance->instance().debug().debugGetLocalTypes(
          funcIndex, &locals, &argsLength, &unusedStackResults)) {
    return nullptr;
  }
  uint32_t namesCount = locals.length();

  Rooted<UniquePtr<Data>> data(
      cx, NewEmptyScopeData<WasmFunctionScope, JSAtom>(cx, namesCount));
  if (!data) {
    return nullptr;
  }

  for (size_t i = 0; i < namesCount; i++) {
    JSAtom* wasmName = GenerateWasmName(cx, "var", i);
    if (!wasmName) {
      return nullptr;
    }

    InitializeNextTrailingName(data, wasmName);
  }
  MOZ_ASSERT(data->length == namesCount);

  return Scope::create<WasmFunctionScope>(cx, ScopeKind::WasmFunction,
                                          enclosing,
                                          /* envShape = */ nullptr, &data);
}

ScopeIter::ScopeIter(JSScript* script) : scope_(script->bodyScope()) {}

bool ScopeIter::hasSyntacticEnvironment() const {
  return scope()->hasEnvironment() &&
         scope()->kind() != ScopeKind::NonSyntactic;
}

AbstractBindingIter<JSAtom>::AbstractBindingIter(ScopeKind kind,
                                                 BaseScopeData* data,
                                                 uint32_t firstFrameSlot)
    : BaseAbstractBindingIter<JSAtom>() {
  switch (kind) {
    case ScopeKind::Lexical:
    case ScopeKind::SimpleCatch:
    case ScopeKind::Catch:
    case ScopeKind::FunctionLexical:
    case ScopeKind::ClassBody:
      init(*static_cast<LexicalScope::Data*>(data), firstFrameSlot, 0);
      break;
    case ScopeKind::NamedLambda:
    case ScopeKind::StrictNamedLambda:
      init(*static_cast<LexicalScope::Data*>(data), LOCALNO_LIMIT,
           IsNamedLambda);
      break;
    case ScopeKind::With:
      // With scopes do not have bindings.
      index_ = length_ = 0;
      MOZ_ASSERT(done());
      break;
    case ScopeKind::Function: {
      uint8_t flags = IgnoreDestructuredFormalParameters;
      if (static_cast<FunctionScope::Data*>(data)->hasParameterExprs) {
        flags |= HasFormalParameterExprs;
      }
      init(*static_cast<FunctionScope::Data*>(data), flags);
      break;
    }
    case ScopeKind::FunctionBodyVar:
      init(*static_cast<VarScope::Data*>(data), firstFrameSlot);
      break;
    case ScopeKind::Eval:
    case ScopeKind::StrictEval:
      init(*static_cast<EvalScope::Data*>(data), kind == ScopeKind::StrictEval);
      break;
    case ScopeKind::Global:
    case ScopeKind::NonSyntactic:
      init(*static_cast<GlobalScope::Data*>(data));
      break;
    case ScopeKind::Module:
      init(*static_cast<ModuleScope::Data*>(data));
      break;
    case ScopeKind::WasmInstance:
      init(*static_cast<WasmInstanceScope::Data*>(data));
      break;
    case ScopeKind::WasmFunction:
      init(*static_cast<WasmFunctionScope::Data*>(data));
      break;
  }
}

AbstractBindingIter<JSAtom>::AbstractBindingIter(Scope* scope)
    : AbstractBindingIter<JSAtom>(scope->kind(), scope->rawData(),
                                  scope->firstFrameSlot()) {}

AbstractBindingIter<JSAtom>::AbstractBindingIter(JSScript* script)
    : AbstractBindingIter<JSAtom>(script->bodyScope()) {}

template <typename NameT>
void BaseAbstractBindingIter<NameT>::init(
    LexicalScope::AbstractData<NameT>& data, uint32_t firstFrameSlot,
    uint8_t flags) {
  // Named lambda scopes can only have environment slots. If the callee
  // isn't closed over, it is accessed via JSOp::Callee.
  if (flags & IsNamedLambda) {
    // Named lambda binding is weird. Normal BindingKind ordering rules
    // don't apply.
    init(0, 0, 0, 0, 0, CanHaveEnvironmentSlots | flags, firstFrameSlot,
         JSSLOT_FREE(&LexicalEnvironmentObject::class_),
         data.trailingNames.start(), data.length);
  } else {
    //            imports - [0, 0)
    // positional formals - [0, 0)
    //      other formals - [0, 0)
    //               vars - [0, 0)
    //               lets - [0, data.constStart)
    //             consts - [data.constStart, data.length)
    init(0, 0, 0, 0, data.constStart,
         CanHaveFrameSlots | CanHaveEnvironmentSlots | flags, firstFrameSlot,
         JSSLOT_FREE(&LexicalEnvironmentObject::class_),
         data.trailingNames.start(), data.length);
  }
}

template void BaseAbstractBindingIter<JSAtom>::init(
    LexicalScope::AbstractData<JSAtom>&, uint32_t, uint8_t);
template void BaseAbstractBindingIter<const ParserAtom>::init(
    LexicalScope::AbstractData<const ParserAtom>&, uint32_t, uint8_t);

template <typename NameT>
void BaseAbstractBindingIter<NameT>::init(
    FunctionScope::AbstractData<NameT>& data, uint8_t flags) {
  flags = CanHaveFrameSlots | CanHaveEnvironmentSlots | flags;
  if (!(flags & HasFormalParameterExprs)) {
    flags |= CanHaveArgumentSlots;
  }

  //            imports - [0, 0)
  // positional formals - [0, data.nonPositionalFormalStart)
  //      other formals - [data.nonPositionalParamStart, data.varStart)
  //               vars - [data.varStart, data.length)
  //               lets - [data.length, data.length)
  //             consts - [data.length, data.length)
  init(0, data.nonPositionalFormalStart, data.varStart, data.length,
       data.length, flags, 0, JSSLOT_FREE(&CallObject::class_),
       data.trailingNames.start(), data.length);
}
template void BaseAbstractBindingIter<JSAtom>::init(
    FunctionScope::AbstractData<JSAtom>&, uint8_t);
template void BaseAbstractBindingIter<const ParserAtom>::init(
    FunctionScope::AbstractData<const ParserAtom>&, uint8_t);

template <typename NameT>
void BaseAbstractBindingIter<NameT>::init(VarScope::AbstractData<NameT>& data,
                                          uint32_t firstFrameSlot) {
  //            imports - [0, 0)
  // positional formals - [0, 0)
  //      other formals - [0, 0)
  //               vars - [0, data.length)
  //               lets - [data.length, data.length)
  //             consts - [data.length, data.length)
  init(0, 0, 0, data.length, data.length,
       CanHaveFrameSlots | CanHaveEnvironmentSlots, firstFrameSlot,
       JSSLOT_FREE(&VarEnvironmentObject::class_), data.trailingNames.start(),
       data.length);
}
template void BaseAbstractBindingIter<JSAtom>::init(
    VarScope::AbstractData<JSAtom>&, uint32_t);
template void BaseAbstractBindingIter<const ParserAtom>::init(
    VarScope::AbstractData<const ParserAtom>&, uint32_t);

template <typename NameT>
void BaseAbstractBindingIter<NameT>::init(
    GlobalScope::AbstractData<NameT>& data) {
  //            imports - [0, 0)
  // positional formals - [0, 0)
  //      other formals - [0, 0)
  //               vars - [0, data.letStart)
  //               lets - [data.letStart, data.constStart)
  //             consts - [data.constStart, data.length)
  init(0, 0, 0, data.letStart, data.constStart, CannotHaveSlots, UINT32_MAX,
       UINT32_MAX, data.trailingNames.start(), data.length);
}
template void BaseAbstractBindingIter<JSAtom>::init(
    GlobalScope::AbstractData<JSAtom>&);
template void BaseAbstractBindingIter<const ParserAtom>::init(
    GlobalScope::AbstractData<const ParserAtom>&);

template <typename NameT>
void BaseAbstractBindingIter<NameT>::init(EvalScope::AbstractData<NameT>& data,
                                          bool strict) {
  uint32_t flags;
  uint32_t firstFrameSlot;
  uint32_t firstEnvironmentSlot;
  if (strict) {
    flags = CanHaveFrameSlots | CanHaveEnvironmentSlots;
    firstFrameSlot = 0;
    firstEnvironmentSlot = JSSLOT_FREE(&VarEnvironmentObject::class_);
  } else {
    flags = CannotHaveSlots;
    firstFrameSlot = UINT32_MAX;
    firstEnvironmentSlot = UINT32_MAX;
  }

  //            imports - [0, 0)
  // positional formals - [0, 0)
  //      other formals - [0, 0)
  //               vars - [0, data.length)
  //               lets - [data.length, data.length)
  //             consts - [data.length, data.length)
  init(0, 0, 0, data.length, data.length, flags, firstFrameSlot,
       firstEnvironmentSlot, data.trailingNames.start(), data.length);
}
template void BaseAbstractBindingIter<JSAtom>::init(
    EvalScope::AbstractData<JSAtom>&, bool);
template void BaseAbstractBindingIter<const ParserAtom>::init(
    EvalScope::AbstractData<const ParserAtom>&, bool);

template <typename NameT>
void BaseAbstractBindingIter<NameT>::init(
    ModuleScope::AbstractData<NameT>& data) {
  //            imports - [0, data.varStart)
  // positional formals - [data.varStart, data.varStart)
  //      other formals - [data.varStart, data.varStart)
  //               vars - [data.varStart, data.letStart)
  //               lets - [data.letStart, data.constStart)
  //             consts - [data.constStart, data.length)
  init(data.varStart, data.varStart, data.varStart, data.letStart,
       data.constStart, CanHaveFrameSlots | CanHaveEnvironmentSlots, 0,
       JSSLOT_FREE(&ModuleEnvironmentObject::class_),
       data.trailingNames.start(), data.length);
}
template void BaseAbstractBindingIter<JSAtom>::init(
    ModuleScope::AbstractData<JSAtom>&);
template void BaseAbstractBindingIter<const ParserAtom>::init(
    ModuleScope::AbstractData<const ParserAtom>&);

template <typename NameT>
void BaseAbstractBindingIter<NameT>::init(
    WasmInstanceScope::AbstractData<NameT>& data) {
  //            imports - [0, 0)
  // positional formals - [0, 0)
  //      other formals - [0, 0)
  //               vars - [0, data.length)
  //               lets - [data.length, data.length)
  //             consts - [data.length, data.length)
  init(0, 0, 0, data.length, data.length,
       CanHaveFrameSlots | CanHaveEnvironmentSlots, UINT32_MAX, UINT32_MAX,
       data.trailingNames.start(), data.length);
}
template void BaseAbstractBindingIter<JSAtom>::init(
    WasmInstanceScope::AbstractData<JSAtom>&);
template void BaseAbstractBindingIter<const ParserAtom>::init(
    WasmInstanceScope::AbstractData<const ParserAtom>&);

template <typename NameT>
void BaseAbstractBindingIter<NameT>::init(
    WasmFunctionScope::AbstractData<NameT>& data) {
  //            imports - [0, 0)
  // positional formals - [0, 0)
  //      other formals - [0, 0)
  //               vars - [0, data.length)
  //               lets - [data.length, data.length)
  //             consts - [data.length, data.length)
  init(0, 0, 0, data.length, data.length,
       CanHaveFrameSlots | CanHaveEnvironmentSlots, UINT32_MAX, UINT32_MAX,
       data.trailingNames.start(), data.length);
}
template void BaseAbstractBindingIter<JSAtom>::init(
    WasmFunctionScope::AbstractData<JSAtom>&);
template void BaseAbstractBindingIter<const ParserAtom>::init(
    WasmFunctionScope::AbstractData<const ParserAtom>&);

PositionalFormalParameterIter::PositionalFormalParameterIter(Scope* scope)
    : BindingIter(scope) {
  // Reinit with flags = 0, i.e., iterate over all positional parameters.
  if (scope->is<FunctionScope>()) {
    init(scope->as<FunctionScope>().data(), /* flags = */ 0);
  }
  settle();
}

PositionalFormalParameterIter::PositionalFormalParameterIter(JSScript* script)
    : PositionalFormalParameterIter(script->bodyScope()) {}

void js::DumpBindings(JSContext* cx, Scope* scopeArg) {
  RootedScope scope(cx, scopeArg);
  for (Rooted<BindingIter> bi(cx, BindingIter(scope)); bi; bi++) {
    UniqueChars bytes = AtomToPrintableString(cx, bi.name());
    if (!bytes) {
      return;
    }
    fprintf(stderr, "%s %s ", BindingKindString(bi.kind()), bytes.get());
    switch (bi.location().kind()) {
      case BindingLocation::Kind::Global:
        if (bi.isTopLevelFunction()) {
          fprintf(stderr, "global function\n");
        } else {
          fprintf(stderr, "global\n");
        }
        break;
      case BindingLocation::Kind::Argument:
        fprintf(stderr, "arg slot %u\n", bi.location().argumentSlot());
        break;
      case BindingLocation::Kind::Frame:
        fprintf(stderr, "frame slot %u\n", bi.location().slot());
        break;
      case BindingLocation::Kind::Environment:
        fprintf(stderr, "env slot %u\n", bi.location().slot());
        break;
      case BindingLocation::Kind::NamedLambdaCallee:
        fprintf(stderr, "named lambda callee\n");
        break;
      case BindingLocation::Kind::Import:
        fprintf(stderr, "import\n");
        break;
    }
  }
}

static JSAtom* GetFrameSlotNameInScope(Scope* scope, uint32_t slot) {
  for (BindingIter bi(scope); bi; bi++) {
    BindingLocation loc = bi.location();
    if (loc.kind() == BindingLocation::Kind::Frame && loc.slot() == slot) {
      return bi.name();
    }
  }
  return nullptr;
}

JSAtom* js::FrameSlotName(JSScript* script, jsbytecode* pc) {
  MOZ_ASSERT(IsLocalOp(JSOp(*pc)));
  uint32_t slot = GET_LOCALNO(pc);
  MOZ_ASSERT(slot < script->nfixed());

  // Look for it in the body scope first.
  if (JSAtom* name = GetFrameSlotNameInScope(script->bodyScope(), slot)) {
    return name;
  }

  // If this is a function script and there is an extra var scope, look for
  // it there.
  if (script->functionHasExtraBodyVarScope()) {
    if (JSAtom* name = GetFrameSlotNameInScope(
            script->functionExtraBodyVarScope(), slot)) {
      return name;
    }
  }

  // If not found, look for it in a lexical scope.
  for (ScopeIter si(script->innermostScope(pc)); si; si++) {
    if (!si.scope()->is<LexicalScope>()) {
      continue;
    }
    LexicalScope& lexicalScope = si.scope()->as<LexicalScope>();

    // Is the slot within bounds of the current lexical scope?
    if (slot < lexicalScope.firstFrameSlot()) {
      continue;
    }
    if (slot >= lexicalScope.nextFrameSlot()) {
      break;
    }

    // If so, get the name.
    if (JSAtom* name = GetFrameSlotNameInScope(&lexicalScope, slot)) {
      return name;
    }
  }

  MOZ_CRASH("Frame slot not found");
}

JS::ubi::Node::Size JS::ubi::Concrete<Scope>::size(
    mozilla::MallocSizeOf mallocSizeOf) const {
  return js::gc::Arena::thingSize(get().asTenured().getAllocKind()) +
         get().sizeOfExcludingThis(mallocSizeOf);
}

/* static */
bool ScopeStencil::createForFunctionScope(
    JSContext* cx, frontend::CompilationStencil& stencil,
    ParserFunctionScopeData* data, bool hasParameterExprs,
    bool needsEnvironment, FunctionIndex functionIndex, bool isArrow,
    mozilla::Maybe<ScopeIndex> enclosing, ScopeIndex* index) {
  if (data) {
    MarkParserScopeData<FunctionScope>(data);
  } else {
    data = NewEmptyParserScopeData<FunctionScope>(cx, stencil.alloc);
    if (!data) {
      return false;
    }
  }

  // We do not initialize the canonical function while the data is owned by the
  // ScopeStencil. It gets set in ScopeStencil::releaseData.
  RootedFunction fun(cx, nullptr);

  uint32_t firstFrameSlot = 0;
  mozilla::Maybe<uint32_t> envShape;
  if (!FunctionScope::prepareForScopeCreation<const ParserAtom>(
          cx, &data, hasParameterExprs, needsEnvironment, fun, &envShape)) {
    return false;
  }

  *index = stencil.scopeData.length();
  if (uint32_t(*index) >= TaggedScriptThingIndex::IndexLimit) {
    ReportAllocationOverflow(cx);
    return false;
  }
  if (!stencil.scopeData.emplaceBack(ScopeKind::Function, enclosing,
                                     firstFrameSlot, envShape, data,
                                     mozilla::Some(functionIndex), isArrow)) {
    js::ReportOutOfMemory(cx);
    return false;
  }
  return true;
}

/* static */
bool ScopeStencil::createForLexicalScope(
    JSContext* cx, frontend::CompilationStencil& stencil, ScopeKind kind,
    ParserLexicalScopeData* data, uint32_t firstFrameSlot,
    mozilla::Maybe<ScopeIndex> enclosing, ScopeIndex* index) {
  if (data) {
    MarkParserScopeData<LexicalScope>(data);
  } else {
    data = NewEmptyParserScopeData<LexicalScope>(cx, stencil.alloc);
    if (!data) {
      return false;
    }
  }

  mozilla::Maybe<uint32_t> envShape;
  if (!LexicalScope::prepareForScopeCreation<const ParserAtom>(
          cx, kind, firstFrameSlot, &data, &envShape)) {
    return false;
  }

  *index = stencil.scopeData.length();
  if (uint32_t(*index) >= TaggedScriptThingIndex::IndexLimit) {
    ReportAllocationOverflow(cx);
    return false;
  }
  if (!stencil.scopeData.emplaceBack(kind, enclosing, firstFrameSlot, envShape,
                                     data)) {
    js::ReportOutOfMemory(cx);
    return false;
  }
  return true;
}

bool ScopeStencil::createForVarScope(
    JSContext* cx, frontend::CompilationStencil& stencil, ScopeKind kind,
    ParserVarScopeData* data, uint32_t firstFrameSlot, bool needsEnvironment,
    mozilla::Maybe<ScopeIndex> enclosing, ScopeIndex* index) {
  if (data) {
    MarkParserScopeData<VarScope>(data);
  } else {
    data = NewEmptyParserScopeData<VarScope>(cx, stencil.alloc);
    if (!data) {
      return false;
    }
  }

  mozilla::Maybe<uint32_t> envShape;
  if (!VarScope::prepareForScopeCreation<const ParserAtom>(
          cx, kind, &data, firstFrameSlot, needsEnvironment, &envShape)) {
    return false;
  }

  *index = stencil.scopeData.length();
  if (uint32_t(*index) >= TaggedScriptThingIndex::IndexLimit) {
    ReportAllocationOverflow(cx);
    return false;
  }
  if (!stencil.scopeData.emplaceBack(kind, enclosing, firstFrameSlot, envShape,
                                     data)) {
    js::ReportOutOfMemory(cx);
    return false;
  }
  return true;
}

/* static */
bool ScopeStencil::createForGlobalScope(JSContext* cx,
                                        frontend::CompilationStencil& stencil,
                                        ScopeKind kind,
                                        ParserGlobalScopeData* data,
                                        ScopeIndex* index) {
  if (data) {
    MarkParserScopeData<GlobalScope>(data);
  } else {
    data = NewEmptyParserScopeData<GlobalScope>(cx, stencil.alloc);
    if (!data) {
      return false;
    }
  }

  // The global scope has no environment shape. Its environment is the
  // global lexical scope and the global object or non-syntactic objects
  // created by embedding, all of which are not only extensible but may
  // have names on them deleted.
  uint32_t firstFrameSlot = 0;
  mozilla::Maybe<uint32_t> envShape;

  mozilla::Maybe<ScopeIndex> enclosing;

  *index = stencil.scopeData.length();
  if (uint32_t(*index) >= TaggedScriptThingIndex::IndexLimit) {
    ReportAllocationOverflow(cx);
    return false;
  }
  if (!stencil.scopeData.emplaceBack(kind, enclosing, firstFrameSlot, envShape,
                                     data)) {
    js::ReportOutOfMemory(cx);
    return false;
  }
  return true;
}

/* static */
bool ScopeStencil::createForEvalScope(JSContext* cx,
                                      frontend::CompilationStencil& stencil,
                                      ScopeKind kind, ParserEvalScopeData* data,
                                      mozilla::Maybe<ScopeIndex> enclosing,
                                      ScopeIndex* index) {
  if (data) {
    MarkParserScopeData<EvalScope>(data);
  } else {
    data = NewEmptyParserScopeData<EvalScope>(cx, stencil.alloc);
    if (!data) {
      return false;
    }
  }

  uint32_t firstFrameSlot = 0;
  mozilla::Maybe<uint32_t> envShape;
  if (!EvalScope::prepareForScopeCreation<const ParserAtom>(cx, kind, &data,
                                                            &envShape)) {
    return false;
  }

  *index = stencil.scopeData.length();
  if (uint32_t(*index) >= TaggedScriptThingIndex::IndexLimit) {
    ReportAllocationOverflow(cx);
    return false;
  }
  if (!stencil.scopeData.emplaceBack(kind, enclosing, firstFrameSlot, envShape,
                                     data)) {
    js::ReportOutOfMemory(cx);
    return false;
  }
  return true;
}

/* static */
bool ScopeStencil::createForModuleScope(JSContext* cx,
                                        frontend::CompilationStencil& stencil,
                                        ParserModuleScopeData* data,
                                        mozilla::Maybe<ScopeIndex> enclosing,
                                        ScopeIndex* index) {
  if (data) {
    MarkParserScopeData<ModuleScope>(data);
  } else {
    data = NewEmptyParserScopeData<ModuleScope>(cx, stencil.alloc);
    if (!data) {
      return false;
    }
  }

  MOZ_ASSERT(enclosing.isNothing());

  // We do not initialize the canonical module while the data is owned by the
  // ScopeStencil. It gets set in ScopeStencil::releaseData.
  RootedModuleObject module(cx, nullptr);

  // The data that's passed in is from the frontend and is LifoAlloc'd.
  // Copy it now that we're creating a permanent VM scope.
  uint32_t firstFrameSlot = 0;
  mozilla::Maybe<uint32_t> envShape;
  if (!ModuleScope::prepareForScopeCreation<const ParserAtom>(cx, &data, module,
                                                              &envShape)) {
    return false;
  }

  *index = stencil.scopeData.length();
  if (uint32_t(*index) >= TaggedScriptThingIndex::IndexLimit) {
    ReportAllocationOverflow(cx);
    return false;
  }
  if (!stencil.scopeData.emplaceBack(ScopeKind::Module, enclosing,
                                     firstFrameSlot, envShape, data)) {
    js::ReportOutOfMemory(cx);
    return false;
  }
  return true;
}

template <typename SpecificEnvironmentT>
bool ScopeStencil::createSpecificShape(JSContext* cx, ScopeKind kind,
                                       BaseScopeData* scopeData,
                                       MutableHandleShape shape) const {
  const JSClass* cls = &SpecificEnvironmentT::class_;
  uint32_t baseShapeFlags = SpecificEnvironmentT::BASESHAPE_FLAGS;

  if (numEnvironmentSlots_.isSome()) {
    if (*numEnvironmentSlots_ > 0) {
      BindingIter bi(kind, scopeData, firstFrameSlot_);
      shape.set(CreateEnvironmentShape(cx, bi, cls, *numEnvironmentSlots_,
                                       baseShapeFlags));
      return shape;
    }

    shape.set(EmptyEnvironmentShape(cx, cls, JSSLOT_FREE(cls), baseShapeFlags));
    return shape;
  }

  return true;
}

/* static */
bool ScopeStencil::createForWithScope(JSContext* cx,
                                      CompilationStencil& stencil,
                                      mozilla::Maybe<ScopeIndex> enclosing,
                                      ScopeIndex* index) {
  uint32_t firstFrameSlot = 0;
  mozilla::Maybe<uint32_t> envShape;

  *index = stencil.scopeData.length();
  if (uint32_t(*index) >= TaggedScriptThingIndex::IndexLimit) {
    ReportAllocationOverflow(cx);
    return false;
  }
  if (!stencil.scopeData.emplaceBack(ScopeKind::With, enclosing, firstFrameSlot,
                                     envShape)) {
    js::ReportOutOfMemory(cx);
    return false;
  }
  return true;
}

template <typename SpecificScopeT>
UniquePtr<typename SpecificScopeT::Data> ScopeStencil::createSpecificScopeData(
    JSContext* cx, CompilationAtomCache& atomCache,
    CompilationGCOutput& gcOutput) const {
  return LiftParserScopeData<SpecificScopeT>(cx, atomCache,
                                             &data<SpecificScopeT>());
}

template <>
UniquePtr<FunctionScope::Data>
ScopeStencil::createSpecificScopeData<FunctionScope>(
    JSContext* cx, CompilationAtomCache& atomCache,
    CompilationGCOutput& gcOutput) const {
  // Allocate a new vm function-scope.
  UniquePtr<FunctionScope::Data> data = LiftParserScopeData<FunctionScope>(
      cx, atomCache, &this->data<FunctionScope>());
  if (!data) {
    return nullptr;
  }

  // Initialize the HeapPtr in the FunctionScope::Data.
  data->canonicalFunction = gcOutput.functions[*functionIndex_];

  return data;
}

template <>
UniquePtr<ModuleScope::Data> ScopeStencil::createSpecificScopeData<ModuleScope>(
    JSContext* cx, CompilationAtomCache& atomCache,
    CompilationGCOutput& gcOutput) const {
  // Allocate a new vm module-scope.
  UniquePtr<ModuleScope::Data> data = LiftParserScopeData<ModuleScope>(
      cx, atomCache, &this->data<ModuleScope>());
  if (!data) {
    return nullptr;
  }

  // Initialize the HeapPtr in the ModuleScope::Data.
  data->module = gcOutput.module;

  return data;
}

// WithScope does not use binding data.
template <>
Scope* ScopeStencil::createSpecificScope<WithScope, std::nullptr_t>(
    JSContext* cx, CompilationInput& input,
    CompilationGCOutput& gcOutput) const {
  RootedScope enclosingScope(cx, enclosingExistingScope(input, gcOutput));
  return Scope::create(cx, ScopeKind::With, enclosingScope, nullptr);
}

// GlobalScope has bindings but no environment shape.
template <>
Scope* ScopeStencil::createSpecificScope<GlobalScope, std::nullptr_t>(
    JSContext* cx, CompilationInput& input,
    CompilationGCOutput& gcOutput) const {
  Rooted<UniquePtr<GlobalScope::Data>> rootedData(
      cx, createSpecificScopeData<GlobalScope>(cx, input.atomCache, gcOutput));
  if (!rootedData) {
    return nullptr;
  }

  MOZ_ASSERT(!enclosing_);
  MOZ_ASSERT(!input.enclosingScope);

  // Because we already baked the data here, we needn't do it again.
  return Scope::create<GlobalScope>(cx, kind(), nullptr, nullptr, &rootedData);
}

template <typename SpecificScopeT, typename SpecificEnvironmentT>
Scope* ScopeStencil::createSpecificScope(JSContext* cx, CompilationInput& input,
                                         CompilationGCOutput& gcOutput) const {
  Rooted<UniquePtr<typename SpecificScopeT::Data>> rootedData(
      cx,
      createSpecificScopeData<SpecificScopeT>(cx, input.atomCache, gcOutput));
  if (!rootedData) {
    return nullptr;
  }

  RootedShape shape(cx);
  if (!createSpecificShape<SpecificEnvironmentT>(
          cx, kind(), rootedData.get().get(), &shape)) {
    return nullptr;
  }

  RootedScope enclosingScope(cx, enclosingExistingScope(input, gcOutput));

  // Because we already baked the data here, we needn't do it again.
  return Scope::create<SpecificScopeT>(cx, kind(), enclosingScope, shape,
                                       &rootedData);
}

template Scope* ScopeStencil::createSpecificScope<FunctionScope, CallObject>(
    JSContext* cx, CompilationInput& input,
    CompilationGCOutput& gcOutput) const;
template Scope*
ScopeStencil::createSpecificScope<LexicalScope, LexicalEnvironmentObject>(
    JSContext* cx, CompilationInput& input,
    CompilationGCOutput& gcOutput) const;
template Scope* ScopeStencil::createSpecificScope<
    EvalScope, VarEnvironmentObject>(JSContext* cx, CompilationInput& input,
                                     CompilationGCOutput& gcOutput) const;
template Scope* ScopeStencil::createSpecificScope<
    VarScope, VarEnvironmentObject>(JSContext* cx, CompilationInput& input,
                                    CompilationGCOutput& gcOutput) const;
template Scope*
ScopeStencil::createSpecificScope<ModuleScope, ModuleEnvironmentObject>(
    JSContext* cx, CompilationInput& input,
    CompilationGCOutput& gcOutput) const;

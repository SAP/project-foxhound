/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */
[LegacyFactoryFunction=Example,
 LegacyFactoryFunction=Example(DOMString str),
 LegacyFactoryFunction=Example2(DictForConstructor dict, any any1, object obj1,
                           object? obj2, sequence<Dict> seq, optional any any2,
                           optional object obj3, optional object? obj4),
 LegacyFactoryFunction=Example2((long or record<DOMString, any>) arg1),
 Exposed=Window]
interface TestExampleInterface {
  constructor();
  constructor(DOMString str);
  constructor(unsigned long num, boolean? boolArg);
  constructor(TestInterface? iface);
  constructor(unsigned long arg1, TestInterface iface);
  constructor(ArrayBuffer arrayBuf);
  constructor(Uint8Array typedArr);
  // constructor(long arg1, long arg2, (TestInterface or OnlyForUseInConstructor) arg3);

  // Integer types
  // XXXbz add tests for throwing versions of all the integer stuff
  readonly attribute byte readonlyByte;
  attribute byte writableByte;
  undefined passByte(byte arg);
  byte receiveByte();
  undefined passOptionalByte(optional byte arg);
  undefined passOptionalByteBeforeRequired(optional byte arg1, byte arg2);
  undefined passOptionalByteWithDefault(optional byte arg = 0);
  undefined passOptionalByteWithDefaultBeforeRequired(optional byte arg1 = 0, byte arg2);
  undefined passNullableByte(byte? arg);
  undefined passOptionalNullableByte(optional byte? arg);
  undefined passVariadicByte(byte... arg);
  [Cached, Pure]
  readonly attribute byte cachedByte;
  [StoreInSlot, Constant]
  readonly attribute byte cachedConstantByte;
  [Cached, Pure]
  attribute byte cachedWritableByte;
  [Affects=Nothing]
  attribute byte sideEffectFreeByte;
  [Affects=Nothing, DependsOn=DOMState]
  attribute byte domDependentByte;
  [Affects=Nothing, DependsOn=Nothing]
  readonly attribute byte constantByte;
  [DependsOn=DeviceState, Affects=Nothing]
  readonly attribute byte deviceStateDependentByte;
  [Affects=Nothing]
  byte returnByteSideEffectFree();
  [Affects=Nothing, DependsOn=DOMState]
  byte returnDOMDependentByte();
  [Affects=Nothing, DependsOn=Nothing]
  byte returnConstantByte();
  [DependsOn=DeviceState, Affects=Nothing]
  byte returnDeviceStateDependentByte();

  readonly attribute short readonlyShort;
  attribute short writableShort;
  undefined passShort(short arg);
  short receiveShort();
  undefined passOptionalShort(optional short arg);
  undefined passOptionalShortWithDefault(optional short arg = 5);

  readonly attribute long readonlyLong;
  attribute long writableLong;
  undefined passLong(long arg);
  long receiveLong();
  undefined passOptionalLong(optional long arg);
  undefined passOptionalLongWithDefault(optional long arg = 7);

  readonly attribute long long readonlyLongLong;
  attribute long long writableLongLong;
  undefined passLongLong(long long arg);
  long long receiveLongLong();
  undefined passOptionalLongLong(optional long long arg);
  undefined passOptionalLongLongWithDefault(optional long long arg = -12);

  readonly attribute octet readonlyOctet;
  attribute octet writableOctet;
  undefined passOctet(octet arg);
  octet receiveOctet();
  undefined passOptionalOctet(optional octet arg);
  undefined passOptionalOctetWithDefault(optional octet arg = 19);

  readonly attribute unsigned short readonlyUnsignedShort;
  attribute unsigned short writableUnsignedShort;
  undefined passUnsignedShort(unsigned short arg);
  unsigned short receiveUnsignedShort();
  undefined passOptionalUnsignedShort(optional unsigned short arg);
  undefined passOptionalUnsignedShortWithDefault(optional unsigned short arg = 2);

  readonly attribute unsigned long readonlyUnsignedLong;
  attribute unsigned long writableUnsignedLong;
  undefined passUnsignedLong(unsigned long arg);
  unsigned long receiveUnsignedLong();
  undefined passOptionalUnsignedLong(optional unsigned long arg);
  undefined passOptionalUnsignedLongWithDefault(optional unsigned long arg = 6);

  readonly attribute unsigned long long readonlyUnsignedLongLong;
  attribute unsigned long long  writableUnsignedLongLong;
  undefined passUnsignedLongLong(unsigned long long arg);
  unsigned long long receiveUnsignedLongLong();
  undefined passOptionalUnsignedLongLong(optional unsigned long long arg);
  undefined passOptionalUnsignedLongLongWithDefault(optional unsigned long long arg = 17);

  attribute float writableFloat;
  attribute unrestricted float writableUnrestrictedFloat;
  attribute float? writableNullableFloat;
  attribute unrestricted float? writableNullableUnrestrictedFloat;
  attribute double writableDouble;
  attribute unrestricted double writableUnrestrictedDouble;
  attribute double? writableNullableDouble;
  attribute unrestricted double? writableNullableUnrestrictedDouble;
  undefined passFloat(float arg1, unrestricted float arg2,
                      float? arg3, unrestricted float? arg4,
                      double arg5, unrestricted double arg6,
                      double? arg7, unrestricted double? arg8,
                      sequence<float> arg9, sequence<unrestricted float> arg10,
                      sequence<float?> arg11, sequence<unrestricted float?> arg12,
                      sequence<double> arg13, sequence<unrestricted double> arg14,
                      sequence<double?> arg15, sequence<unrestricted double?> arg16);
  [LenientFloat]
  undefined passLenientFloat(float arg1, unrestricted float arg2,
                             float? arg3, unrestricted float? arg4,
                             double arg5, unrestricted double arg6,
                             double? arg7, unrestricted double? arg8,
                             sequence<float> arg9,
                             sequence<unrestricted float> arg10,
                             sequence<float?> arg11,
                             sequence<unrestricted float?> arg12,
                             sequence<double> arg13,
                             sequence<unrestricted double> arg14,
                             sequence<double?> arg15,
                             sequence<unrestricted double?> arg16);
  [LenientFloat]
  attribute float lenientFloatAttr;
  [LenientFloat]
  attribute double lenientDoubleAttr;

  // Castable interface types
  // XXXbz add tests for throwing versions of all the castable interface stuff
  TestInterface receiveSelf();
  TestInterface? receiveNullableSelf();
  TestInterface receiveWeakSelf();
  TestInterface? receiveWeakNullableSelf();
  undefined passSelf(TestInterface arg);
  undefined passNullableSelf(TestInterface? arg);
  attribute TestInterface nonNullSelf;
  attribute TestInterface? nullableSelf;
  [Cached, Pure]
  readonly attribute TestInterface cachedSelf;
  // Optional arguments
  undefined passOptionalSelf(optional TestInterface? arg);
  undefined passOptionalNonNullSelf(optional TestInterface arg);
  undefined passOptionalSelfWithDefault(optional TestInterface? arg = null);

  // Non-wrapper-cache interface types
  [NewObject]
  TestNonWrapperCacheInterface receiveNonWrapperCacheInterface();
  [NewObject]
  TestNonWrapperCacheInterface? receiveNullableNonWrapperCacheInterface();
  [NewObject]
  sequence<TestNonWrapperCacheInterface> receiveNonWrapperCacheInterfaceSequence();
  [NewObject]
  sequence<TestNonWrapperCacheInterface?> receiveNullableNonWrapperCacheInterfaceSequence();
  [NewObject]
  sequence<TestNonWrapperCacheInterface>? receiveNonWrapperCacheInterfaceNullableSequence();
  [NewObject]
  sequence<TestNonWrapperCacheInterface?>? receiveNullableNonWrapperCacheInterfaceNullableSequence();

  // External interface types
  TestExternalInterface receiveExternal();
  TestExternalInterface? receiveNullableExternal();
  TestExternalInterface receiveWeakExternal();
  TestExternalInterface? receiveWeakNullableExternal();
  undefined passExternal(TestExternalInterface arg);
  undefined passNullableExternal(TestExternalInterface? arg);
  attribute TestExternalInterface nonNullExternal;
  attribute TestExternalInterface? nullableExternal;
  // Optional arguments
  undefined passOptionalExternal(optional TestExternalInterface? arg);
  undefined passOptionalNonNullExternal(optional TestExternalInterface arg);
  undefined passOptionalExternalWithDefault(optional TestExternalInterface? arg = null);

  // Callback interface types
  TestCallbackInterface receiveCallbackInterface();
  TestCallbackInterface? receiveNullableCallbackInterface();
  TestCallbackInterface receiveWeakCallbackInterface();
  TestCallbackInterface? receiveWeakNullableCallbackInterface();
  undefined passCallbackInterface(TestCallbackInterface arg);
  undefined passNullableCallbackInterface(TestCallbackInterface? arg);
  attribute TestCallbackInterface nonNullCallbackInterface;
  attribute TestCallbackInterface? nullableCallbackInterface;
  // Optional arguments
  undefined passOptionalCallbackInterface(optional TestCallbackInterface? arg);
  undefined passOptionalNonNullCallbackInterface(optional TestCallbackInterface arg);
  undefined passOptionalCallbackInterfaceWithDefault(optional TestCallbackInterface? arg = null);

  // Sequence types
  [Cached, Pure]
  readonly attribute sequence<long> readonlySequence;
  [Cached, Pure]
  readonly attribute sequence<Dict> readonlySequenceOfDictionaries;
  [Cached, Pure]
  readonly attribute sequence<Dict>? readonlyNullableSequenceOfDictionaries;
  [Cached, Pure, Frozen]
  readonly attribute sequence<long> readonlyFrozenSequence;
  [Cached, Pure, Frozen]
  readonly attribute sequence<long>? readonlyFrozenNullableSequence;
  sequence<long> receiveSequence();
  sequence<long>? receiveNullableSequence();
  sequence<long?> receiveSequenceOfNullableInts();
  sequence<long?>? receiveNullableSequenceOfNullableInts();
  undefined passSequence(sequence<long> arg);
  undefined passNullableSequence(sequence<long>? arg);
  undefined passSequenceOfNullableInts(sequence<long?> arg);
  undefined passOptionalSequenceOfNullableInts(optional sequence<long?> arg);
  undefined passOptionalNullableSequenceOfNullableInts(optional sequence<long?>? arg);
  sequence<TestInterface> receiveCastableObjectSequence();
  sequence<TestCallbackInterface> receiveCallbackObjectSequence();
  sequence<TestInterface?> receiveNullableCastableObjectSequence();
  sequence<TestCallbackInterface?> receiveNullableCallbackObjectSequence();
  sequence<TestInterface>? receiveCastableObjectNullableSequence();
  sequence<TestInterface?>? receiveNullableCastableObjectNullableSequence();
  sequence<TestInterface> receiveWeakCastableObjectSequence();
  sequence<TestInterface?> receiveWeakNullableCastableObjectSequence();
  sequence<TestInterface>? receiveWeakCastableObjectNullableSequence();
  sequence<TestInterface?>? receiveWeakNullableCastableObjectNullableSequence();
  undefined passCastableObjectSequence(sequence<TestInterface> arg);
  undefined passNullableCastableObjectSequence(sequence<TestInterface?> arg);
  undefined passCastableObjectNullableSequence(sequence<TestInterface>? arg);
  undefined passNullableCastableObjectNullableSequence(sequence<TestInterface?>? arg);
  undefined passOptionalSequence(optional sequence<long> arg);
  undefined passOptionalSequenceWithDefaultValue(optional sequence<long> arg = []);
  undefined passOptionalNullableSequence(optional sequence<long>? arg);
  undefined passOptionalNullableSequenceWithDefaultValue(optional sequence<long>? arg = null);
  undefined passOptionalNullableSequenceWithDefaultValue2(optional sequence<long>? arg = []);
  undefined passOptionalObjectSequence(optional sequence<TestInterface> arg);
  undefined passExternalInterfaceSequence(sequence<TestExternalInterface> arg);
  undefined passNullableExternalInterfaceSequence(sequence<TestExternalInterface?> arg);

  sequence<DOMString> receiveStringSequence();
  undefined passStringSequence(sequence<DOMString> arg);

  sequence<ByteString> receiveByteStringSequence();
  undefined passByteStringSequence(sequence<ByteString> arg);

  sequence<UTF8String> receiveUTF8StringSequence();
  undefined passUTF8StringSequence(sequence<UTF8String> arg);

  sequence<any> receiveAnySequence();
  sequence<any>? receiveNullableAnySequence();
  //XXXbz No support for sequence of sequence return values yet.
  //sequence<sequence<any>> receiveAnySequenceSequence();

  sequence<object> receiveObjectSequence();
  sequence<object?> receiveNullableObjectSequence();

  undefined passSequenceOfSequences(sequence<sequence<long>> arg);
  undefined passSequenceOfSequencesOfSequences(sequence<sequence<sequence<long>>> arg);
  //XXXbz No support for sequence of sequence return values yet.
  //sequence<sequence<long>> receiveSequenceOfSequences();

  // record types
  undefined passRecord(record<DOMString, long> arg);
  undefined passNullableRecord(record<DOMString, long>? arg);
  undefined passRecordOfNullableInts(record<DOMString, long?> arg);
  undefined passOptionalRecordOfNullableInts(optional record<DOMString, long?> arg);
  undefined passOptionalNullableRecordOfNullableInts(optional record<DOMString, long?>? arg);
  undefined passCastableObjectRecord(record<DOMString, TestInterface> arg);
  undefined passNullableCastableObjectRecord(record<DOMString, TestInterface?> arg);
  undefined passCastableObjectNullableRecord(record<DOMString, TestInterface>? arg);
  undefined passNullableCastableObjectNullableRecord(record<DOMString, TestInterface?>? arg);
  undefined passOptionalRecord(optional record<DOMString, long> arg);
  undefined passOptionalNullableRecord(optional record<DOMString, long>? arg);
  undefined passOptionalNullableRecordWithDefaultValue(optional record<DOMString, long>? arg = null);
  undefined passOptionalObjectRecord(optional record<DOMString, TestInterface> arg);
  undefined passExternalInterfaceRecord(record<DOMString, TestExternalInterface> arg);
  undefined passNullableExternalInterfaceRecord(record<DOMString, TestExternalInterface?> arg);
  undefined passStringRecord(record<DOMString, DOMString> arg);
  undefined passByteStringRecord(record<DOMString, ByteString> arg);
  undefined passUTF8StringRecord(record<DOMString, UTF8String> arg);
  undefined passRecordOfRecords(record<DOMString, record<DOMString, long>> arg);
  record<DOMString, long> receiveRecord();
  record<DOMString, long>? receiveNullableRecord();
  record<DOMString, long?> receiveRecordOfNullableInts();
  record<DOMString, long?>? receiveNullableRecordOfNullableInts();
  //XXXbz No support for record of records return values yet.
  //record<DOMString, record<DOMString, long>> receiveRecordOfRecords();
  record<DOMString, any> receiveAnyRecord();

  // Typed array types
  undefined passArrayBuffer(ArrayBuffer arg);
  undefined passNullableArrayBuffer(ArrayBuffer? arg);
  undefined passOptionalArrayBuffer(optional ArrayBuffer arg);
  undefined passOptionalNullableArrayBuffer(optional ArrayBuffer? arg);
  undefined passOptionalNullableArrayBufferWithDefaultValue(optional ArrayBuffer? arg= null);
  undefined passArrayBufferView(ArrayBufferView arg);
  undefined passInt8Array(Int8Array arg);
  undefined passInt16Array(Int16Array arg);
  undefined passInt32Array(Int32Array arg);
  undefined passUint8Array(Uint8Array arg);
  undefined passUint16Array(Uint16Array arg);
  undefined passUint32Array(Uint32Array arg);
  undefined passUint8ClampedArray(Uint8ClampedArray arg);
  undefined passFloat32Array(Float32Array arg);
  undefined passFloat64Array(Float64Array arg);
  undefined passSequenceOfArrayBuffers(sequence<ArrayBuffer> arg);
  undefined passSequenceOfNullableArrayBuffers(sequence<ArrayBuffer?> arg);
  undefined passRecordOfArrayBuffers(record<DOMString, ArrayBuffer> arg);
  undefined passRecordOfNullableArrayBuffers(record<DOMString, ArrayBuffer?> arg);
  undefined passVariadicTypedArray(Float32Array... arg);
  undefined passVariadicNullableTypedArray(Float32Array?... arg);
  Uint8Array receiveUint8Array();
  attribute Uint8Array uint8ArrayAttr;

  // DOMString types
  undefined passString(DOMString arg);
  undefined passNullableString(DOMString? arg);
  undefined passOptionalString(optional DOMString arg);
  undefined passOptionalStringWithDefaultValue(optional DOMString arg = "abc");
  undefined passOptionalNullableString(optional DOMString? arg);
  undefined passOptionalNullableStringWithDefaultValue(optional DOMString? arg = null);
  undefined passVariadicString(DOMString... arg);

  // ByteString types
  undefined passByteString(ByteString arg);
  undefined passNullableByteString(ByteString? arg);
  undefined passOptionalByteString(optional ByteString arg);
  undefined passOptionalByteStringWithDefaultValue(optional ByteString arg = "abc");
  undefined passOptionalNullableByteString(optional ByteString? arg);
  undefined passOptionalNullableByteStringWithDefaultValue(optional ByteString? arg = null);
  undefined passVariadicByteString(ByteString... arg);
  undefined passUnionByteString((ByteString or long) arg);
  undefined passOptionalUnionByteString(optional (ByteString or long) arg);
  undefined passOptionalUnionByteStringWithDefaultValue(optional (ByteString or long) arg = "abc");

  // UTF8String types
  undefined passUTF8String(UTF8String arg);
  undefined passNullableUTF8String(UTF8String? arg);
  undefined passOptionalUTF8String(optional UTF8String arg);
  undefined passOptionalUTF8StringWithDefaultValue(optional UTF8String arg = "abc");
  undefined passOptionalNullableUTF8String(optional UTF8String? arg);
  undefined passOptionalNullableUTF8StringWithDefaultValue(optional UTF8String? arg = null);
  undefined passVariadicUTF8String(UTF8String... arg);
  undefined passUnionUTF8String((UTF8String or long) arg);
  undefined passOptionalUnionUTF8String(optional (UTF8String or long) arg);
  undefined passOptionalUnionUTF8StringWithDefaultValue(optional (UTF8String or long) arg = "abc");

  // USVString types
  undefined passSVS(USVString arg);
  undefined passNullableSVS(USVString? arg);
  undefined passOptionalSVS(optional USVString arg);
  undefined passOptionalSVSWithDefaultValue(optional USVString arg = "abc");
  undefined passOptionalNullableSVS(optional USVString? arg);
  undefined passOptionalNullableSVSWithDefaultValue(optional USVString? arg = null);
  undefined passVariadicSVS(USVString... arg);
  USVString receiveSVS();

  // JSString types
  undefined passJSString(JSString arg);
  // undefined passNullableJSString(JSString? arg); // NOT SUPPORTED YET
  // undefined passOptionalJSString(optional JSString arg); // NOT SUPPORTED YET
  undefined passOptionalJSStringWithDefaultValue(optional JSString arg = "abc");
  // undefined passOptionalNullableJSString(optional JSString? arg); // NOT SUPPORTED YET
  // undefined passOptionalNullableJSStringWithDefaultValue(optional JSString? arg = null); // NOT SUPPORTED YET
  // undefined passVariadicJSString(JSString... arg); // NOT SUPPORTED YET
  // undefined passRecordOfJSString(record<DOMString, JSString> arg); // NOT SUPPORTED YET
  // undefined passSequenceOfJSString(sequence<JSString> arg); // NOT SUPPORTED YET
  // undefined passUnionJSString((JSString or long) arg); // NOT SUPPORTED YET
  JSString receiveJSString();
  // sequence<JSString> receiveJSStringSequence(); // NOT SUPPORTED YET
  // (JSString or long) receiveJSStringUnion(); // NOT SUPPORTED YET
  // record<DOMString, JSString> receiveJSStringRecord(); // NOT SUPPORTED YET
  readonly attribute JSString readonlyJSStringAttr;
  attribute JSString jsStringAttr;

  // Enumerated types
  undefined passEnum(TestEnum arg);
  undefined passNullableEnum(TestEnum? arg);
  undefined passOptionalEnum(optional TestEnum arg);
  undefined passEnumWithDefault(optional TestEnum arg = "a");
  undefined passOptionalNullableEnum(optional TestEnum? arg);
  undefined passOptionalNullableEnumWithDefaultValue(optional TestEnum? arg = null);
  undefined passOptionalNullableEnumWithDefaultValue2(optional TestEnum? arg = "a");
  TestEnum receiveEnum();
  TestEnum? receiveNullableEnum();
  attribute TestEnum enumAttribute;
  readonly attribute TestEnum readonlyEnumAttribute;

  // Callback types
  undefined passCallback(TestCallback arg);
  undefined passNullableCallback(TestCallback? arg);
  undefined passOptionalCallback(optional TestCallback arg);
  undefined passOptionalNullableCallback(optional TestCallback? arg);
  undefined passOptionalNullableCallbackWithDefaultValue(optional TestCallback? arg = null);
  TestCallback receiveCallback();
  TestCallback? receiveNullableCallback();
  undefined passNullableTreatAsNullCallback(TestTreatAsNullCallback? arg);
  undefined passOptionalNullableTreatAsNullCallback(optional TestTreatAsNullCallback? arg);
  undefined passOptionalNullableTreatAsNullCallbackWithDefaultValue(optional TestTreatAsNullCallback? arg = null);

  // Any types
  undefined passAny(any arg);
  undefined passVariadicAny(any... arg);
  undefined passOptionalAny(optional any arg);
  undefined passAnyDefaultNull(optional any arg = null);
  undefined passSequenceOfAny(sequence<any> arg);
  undefined passNullableSequenceOfAny(sequence<any>? arg);
  undefined passOptionalSequenceOfAny(optional sequence<any> arg);
  undefined passOptionalNullableSequenceOfAny(optional sequence<any>? arg);
  undefined passOptionalSequenceOfAnyWithDefaultValue(optional sequence<any>? arg = null);
  undefined passSequenceOfSequenceOfAny(sequence<sequence<any>> arg);
  undefined passSequenceOfNullableSequenceOfAny(sequence<sequence<any>?> arg);
  undefined passNullableSequenceOfNullableSequenceOfAny(sequence<sequence<any>?>? arg);
  undefined passOptionalNullableSequenceOfNullableSequenceOfAny(optional sequence<sequence<any>?>? arg);
  undefined passRecordOfAny(record<DOMString, any> arg);
  undefined passNullableRecordOfAny(record<DOMString, any>? arg);
  undefined passOptionalRecordOfAny(optional record<DOMString, any> arg);
  undefined passOptionalNullableRecordOfAny(optional record<DOMString, any>? arg);
  undefined passOptionalRecordOfAnyWithDefaultValue(optional record<DOMString, any>? arg = null);
  undefined passRecordOfRecordOfAny(record<DOMString, record<DOMString, any>> arg);
  undefined passRecordOfNullableRecordOfAny(record<DOMString, record<DOMString, any>?> arg);
  undefined passNullableRecordOfNullableRecordOfAny(record<DOMString, record<DOMString, any>?>? arg);
  undefined passOptionalNullableRecordOfNullableRecordOfAny(optional record<DOMString, record<DOMString, any>?>? arg);
  undefined passOptionalNullableRecordOfNullableSequenceOfAny(optional record<DOMString, sequence<any>?>? arg);
  undefined passOptionalNullableSequenceOfNullableRecordOfAny(optional sequence<record<DOMString, any>?>? arg);
  any receiveAny();

  // object types
  undefined passObject(object arg);
  undefined passVariadicObject(object... arg);
  undefined passNullableObject(object? arg);
  undefined passVariadicNullableObject(object... arg);
  undefined passOptionalObject(optional object arg);
  undefined passOptionalNullableObject(optional object? arg);
  undefined passOptionalNullableObjectWithDefaultValue(optional object? arg = null);
  undefined passSequenceOfObject(sequence<object> arg);
  undefined passSequenceOfNullableObject(sequence<object?> arg);
  undefined passNullableSequenceOfObject(sequence<object>? arg);
  undefined passOptionalNullableSequenceOfNullableSequenceOfObject(optional sequence<sequence<object>?>? arg);
  undefined passOptionalNullableSequenceOfNullableSequenceOfNullableObject(optional sequence<sequence<object?>?>? arg);
  undefined passRecordOfObject(record<DOMString, object> arg);
  object receiveObject();
  object? receiveNullableObject();

  // Union types
  undefined passUnion((object or long) arg);
  // Some union tests are debug-only to avoid creating all those
  // unused union types in opt builds.

#ifdef DEBUG
  undefined passUnion2((long or boolean) arg);
  undefined passUnion3((object or long or boolean) arg);
  undefined passUnion4((Node or long or boolean) arg);
  undefined passUnion5((object or boolean) arg);
  undefined passUnion6((object or DOMString) arg);
  undefined passUnion7((object or DOMString or long) arg);
  undefined passUnion8((object or DOMString or boolean) arg);
  undefined passUnion9((object or DOMString or long or boolean) arg);
  undefined passUnion10(optional (EventInit or long) arg = {});
  undefined passUnion11(optional (CustomEventInit or long) arg = {});
  undefined passUnion12(optional (EventInit or long) arg = 5);
  undefined passUnion13(optional (object or long?) arg = null);
  undefined passUnion14(optional (object or long?) arg = 5);
  undefined passUnion15((sequence<long> or long) arg);
  undefined passUnion16(optional (sequence<long> or long) arg);
  undefined passUnion17(optional (sequence<long>? or long) arg = 5);
  undefined passUnion18((sequence<object> or long) arg);
  undefined passUnion19(optional (sequence<object> or long) arg);
  undefined passUnion20(optional (sequence<object> or long) arg = []);
  undefined passUnion21((record<DOMString, long> or long) arg);
  undefined passUnion22((record<DOMString, object> or long) arg);
  undefined passUnion23((sequence<ImageData> or long) arg);
  undefined passUnion24((sequence<ImageData?> or long) arg);
  undefined passUnion25((sequence<sequence<ImageData>> or long) arg);
  undefined passUnion26((sequence<sequence<ImageData?>> or long) arg);
  undefined passUnion27(optional (sequence<DOMString> or EventInit) arg = {});
  undefined passUnion28(optional (EventInit or sequence<DOMString>) arg = {});
  undefined passUnionWithCallback((EventHandler or long) arg);
  undefined passUnionWithByteString((ByteString or long) arg);
  undefined passUnionWithUTF8String((UTF8String or long) arg);
  undefined passUnionWithRecord((record<DOMString, DOMString> or DOMString) arg);
  undefined passUnionWithRecordAndSequence((record<DOMString, DOMString> or sequence<DOMString>) arg);
  undefined passUnionWithSequenceAndRecord((sequence<DOMString> or record<DOMString, DOMString>) arg);
  undefined passUnionWithSVS((USVString or long) arg);
#endif
  undefined passUnionWithNullable((object? or long) arg);
  undefined passNullableUnion((object or long)? arg);
  undefined passOptionalUnion(optional (object or long) arg);
  undefined passOptionalNullableUnion(optional (object or long)? arg);
  undefined passOptionalNullableUnionWithDefaultValue(optional (object or long)? arg = null);
  //undefined passUnionWithInterfaces((TestInterface or TestExternalInterface) arg);
  //undefined passUnionWithInterfacesAndNullable((TestInterface? or TestExternalInterface) arg);
  //undefined passUnionWithSequence((sequence<object> or long) arg);
  undefined passUnionWithArrayBuffer((ArrayBuffer or long) arg);
  undefined passUnionWithString((DOMString or object) arg);
  // Using an enum in a union.  Note that we use some enum not declared in our
  // binding file, because UnionTypes.h will need to include the binding header
  // for this enum.  Pick an enum from an interface that won't drag in too much
  // stuff.
  undefined passUnionWithEnum((SupportedType or object) arg);

  // Trying to use a callback in a union won't include the test
  // headers, unfortunately, so won't compile.
  //  undefined passUnionWithCallback((TestCallback or long) arg);
  undefined passUnionWithObject((object or long) arg);
  //undefined passUnionWithDict((Dict or long) arg);

  undefined passUnionWithDefaultValue1(optional (double or DOMString) arg = "");
  undefined passUnionWithDefaultValue2(optional (double or DOMString) arg = 1);
  undefined passUnionWithDefaultValue3(optional (double or DOMString) arg = 1.5);
  undefined passUnionWithDefaultValue4(optional (float or DOMString) arg = "");
  undefined passUnionWithDefaultValue5(optional (float or DOMString) arg = 1);
  undefined passUnionWithDefaultValue6(optional (float or DOMString) arg = 1.5);
  undefined passUnionWithDefaultValue7(optional (unrestricted double or DOMString) arg = "");
  undefined passUnionWithDefaultValue8(optional (unrestricted double or DOMString) arg = 1);
  undefined passUnionWithDefaultValue9(optional (unrestricted double or DOMString) arg = 1.5);
  undefined passUnionWithDefaultValue10(optional (unrestricted double or DOMString) arg = Infinity);
  undefined passUnionWithDefaultValue11(optional (unrestricted float or DOMString) arg = "");
  undefined passUnionWithDefaultValue12(optional (unrestricted float or DOMString) arg = 1);
  undefined passUnionWithDefaultValue13(optional (unrestricted float or DOMString) arg = Infinity);
  undefined passUnionWithDefaultValue14(optional (double or ByteString) arg = "");
  undefined passUnionWithDefaultValue15(optional (double or ByteString) arg = 1);
  undefined passUnionWithDefaultValue16(optional (double or ByteString) arg = 1.5);
  undefined passUnionWithDefaultValue17(optional (double or SupportedType) arg = "text/html");
  undefined passUnionWithDefaultValue18(optional (double or SupportedType) arg = 1);
  undefined passUnionWithDefaultValue19(optional (double or SupportedType) arg = 1.5);
  undefined passUnionWithDefaultValue20(optional (double or USVString) arg = "abc");
  undefined passUnionWithDefaultValue21(optional (double or USVString) arg = 1);
  undefined passUnionWithDefaultValue22(optional (double or USVString) arg = 1.5);
  undefined passUnionWithDefaultValue23(optional (double or UTF8String) arg = "");
  undefined passUnionWithDefaultValue24(optional (double or UTF8String) arg = 1);
  undefined passUnionWithDefaultValue25(optional (double or UTF8String) arg = 1.5);

  undefined passNullableUnionWithDefaultValue1(optional (double or DOMString)? arg = "");
  undefined passNullableUnionWithDefaultValue2(optional (double or DOMString)? arg = 1);
  undefined passNullableUnionWithDefaultValue3(optional (double or DOMString)? arg = null);
  undefined passNullableUnionWithDefaultValue4(optional (float or DOMString)? arg = "");
  undefined passNullableUnionWithDefaultValue5(optional (float or DOMString)? arg = 1);
  undefined passNullableUnionWithDefaultValue6(optional (float or DOMString)? arg = null);
  undefined passNullableUnionWithDefaultValue7(optional (unrestricted double or DOMString)? arg = "");
  undefined passNullableUnionWithDefaultValue8(optional (unrestricted double or DOMString)? arg = 1);
  undefined passNullableUnionWithDefaultValue9(optional (unrestricted double or DOMString)? arg = null);
  undefined passNullableUnionWithDefaultValue10(optional (unrestricted float or DOMString)? arg = "");
  undefined passNullableUnionWithDefaultValue11(optional (unrestricted float or DOMString)? arg = 1);
  undefined passNullableUnionWithDefaultValue12(optional (unrestricted float or DOMString)? arg = null);
  undefined passNullableUnionWithDefaultValue13(optional (double or ByteString)? arg = "");
  undefined passNullableUnionWithDefaultValue14(optional (double or ByteString)? arg = 1);
  undefined passNullableUnionWithDefaultValue15(optional (double or ByteString)? arg = 1.5);
  undefined passNullableUnionWithDefaultValue16(optional (double or ByteString)? arg = null);
  undefined passNullableUnionWithDefaultValue17(optional (double or SupportedType)? arg = "text/html");
  undefined passNullableUnionWithDefaultValue18(optional (double or SupportedType)? arg = 1);
  undefined passNullableUnionWithDefaultValue19(optional (double or SupportedType)? arg = 1.5);
  undefined passNullableUnionWithDefaultValue20(optional (double or SupportedType)? arg = null);
  undefined passNullableUnionWithDefaultValue21(optional (double or USVString)? arg = "abc");
  undefined passNullableUnionWithDefaultValue22(optional (double or USVString)? arg = 1);
  undefined passNullableUnionWithDefaultValue23(optional (double or USVString)? arg = 1.5);
  undefined passNullableUnionWithDefaultValue24(optional (double or USVString)? arg = null);
  undefined passNullableUnionWithDefaultValue25(optional (double or UTF8String)? arg = "");
  undefined passNullableUnionWithDefaultValue26(optional (double or UTF8String)? arg = 1);
  undefined passNullableUnionWithDefaultValue27(optional (double or UTF8String)? arg = 1.5);
  undefined passNullableUnionWithDefaultValue28(optional (double or UTF8String)? arg = null);

  undefined passSequenceOfUnions(sequence<(CanvasPattern or CanvasGradient)> arg);
  undefined passSequenceOfUnions2(sequence<(object or long)> arg);
  undefined passVariadicUnion((CanvasPattern or CanvasGradient)... arg);

  undefined passSequenceOfNullableUnions(sequence<(CanvasPattern or CanvasGradient)?> arg);
  undefined passVariadicNullableUnion((CanvasPattern or CanvasGradient)?... arg);
  undefined passRecordOfUnions(record<DOMString, (CanvasPattern or CanvasGradient)> arg);
  // XXXbz no move constructor on some unions
  // undefined passRecordOfUnions2(record<DOMString, (object or long)> arg);

  (CanvasPattern or CanvasGradient) receiveUnion();
  (object or long) receiveUnion2();
  (CanvasPattern? or CanvasGradient) receiveUnionContainingNull();
  (CanvasPattern or CanvasGradient)? receiveNullableUnion();
  (object or long)? receiveNullableUnion2();
  (undefined or CanvasPattern) receiveUnionWithUndefined();
  (undefined? or CanvasPattern) receiveUnionWithNullableUndefined();
  (undefined or CanvasPattern?) receiveUnionWithUndefinedAndNullable();
  (undefined or CanvasPattern)? receiveNullableUnionWithUndefined();

  attribute (CanvasPattern or CanvasGradient) writableUnion;
  attribute (CanvasPattern? or CanvasGradient) writableUnionContainingNull;
  attribute (CanvasPattern or CanvasGradient)? writableNullableUnion;
  attribute (undefined or CanvasPattern) writableUnionWithUndefined;
  attribute (undefined? or CanvasPattern) writableUnionWithNullableUndefined;
  attribute (undefined or CanvasPattern?) writableUnionWithUndefinedAndNullable;
  attribute (undefined or CanvasPattern)? writableNullableUnionWithUndefined;

  // Promise types
  undefined passPromise(Promise<any> arg);
  undefined passOptionalPromise(optional Promise<any> arg);
  undefined passPromiseSequence(sequence<Promise<any>> arg);
  Promise<any> receivePromise();
  Promise<any> receiveAddrefedPromise();

  // ObservableArray types
  attribute ObservableArray<boolean> booleanObservableArray;
  attribute ObservableArray<object> objectObservableArray;
  attribute ObservableArray<any> anyObservableArray;
  attribute ObservableArray<TestInterface> interfaceObservableArray;
  attribute ObservableArray<long?> nullableObservableArray;

  // binaryNames tests
  [BinaryName="methodRenamedTo"]
  undefined methodRenamedFrom();
  [BinaryName="methodRenamedTo"]
  undefined methodRenamedFrom(byte argument);
  [BinaryName="attributeGetterRenamedTo"]
  readonly attribute byte attributeGetterRenamedFrom;
  [BinaryName="attributeRenamedTo"]
  attribute byte attributeRenamedFrom;

  undefined passDictionary(optional Dict x = {});
  undefined passDictionary2(Dict x);
  [Cached, Pure]
  readonly attribute Dict readonlyDictionary;
  [Cached, Pure]
  readonly attribute Dict? readonlyNullableDictionary;
  [Cached, Pure]
  attribute Dict writableDictionary;
  [Cached, Pure, Frozen]
  readonly attribute Dict readonlyFrozenDictionary;
  [Cached, Pure, Frozen]
  readonly attribute Dict? readonlyFrozenNullableDictionary;
  [Cached, Pure, Frozen]
  attribute Dict writableFrozenDictionary;
  Dict receiveDictionary();
  Dict? receiveNullableDictionary();
  undefined passOtherDictionary(optional GrandparentDict x = {});
  undefined passSequenceOfDictionaries(sequence<Dict> x);
  undefined passRecordOfDictionaries(record<DOMString, GrandparentDict> x);
  // No support for nullable dictionaries inside a sequence (nor should there be)
  //  undefined passSequenceOfNullableDictionaries(sequence<Dict?> x);
  undefined passDictionaryOrLong(optional Dict x = {});
  undefined passDictionaryOrLong(long x);

  undefined passDictContainingDict(optional DictContainingDict arg = {});
  undefined passDictContainingSequence(optional DictContainingSequence arg = {});
  DictContainingSequence receiveDictContainingSequence();
  undefined passVariadicDictionary(Dict... arg);

  // EnforceRange/Clamp tests
  undefined dontEnforceRangeOrClamp(byte arg);
  undefined doEnforceRange([EnforceRange] byte arg);
  undefined doEnforceRangeNullable([EnforceRange] byte? arg);
  undefined doClamp([Clamp] byte arg);
  undefined doClampNullable([Clamp] byte? arg);
  attribute [EnforceRange] byte enforcedByte;
  attribute [EnforceRange] byte? enforcedByteNullable;
  attribute [Clamp] byte clampedByte;
  attribute [Clamp] byte? clampedByteNullable;

  // Typedefs
  const myLong myLongConstant = 5;
  undefined exerciseTypedefInterfaces1(AnotherNameForTestInterface arg);
  AnotherNameForTestInterface exerciseTypedefInterfaces2(NullableTestInterface arg);
  undefined exerciseTypedefInterfaces3(YetAnotherNameForTestInterface arg);

  // Deprecated methods and attributes
  [Deprecated="Components"]
  attribute boolean deprecatedAttribute;
  [Deprecated="Components"]
  undefined deprecatedMethod(boolean arg);
  [Deprecated="Components"]
  undefined deprecatedMethodWithContext(any arg);

  // Static methods and attributes
  static attribute boolean staticAttribute;
  static undefined staticMethod(boolean arg);
  static undefined staticMethodWithContext(any arg);

  // Deprecated methods and attributes;
  [Deprecated="Components"]
  static attribute boolean staticDeprecatedAttribute;
  [Deprecated="Components"]
  static undefined staticDeprecatedMethod(boolean arg);
  [Deprecated="Components"]
  static undefined staticDeprecatedMethodWithContext(any arg);

  // Overload resolution tests
  //undefined overload1(DOMString... strs);
  boolean overload1(TestInterface arg);
  TestInterface overload1(DOMString strs, TestInterface arg);
  undefined overload2(TestInterface arg);
  undefined overload2(optional Dict arg = {});
  undefined overload2(boolean arg);
  undefined overload2(DOMString arg);
  undefined overload3(TestInterface arg);
  undefined overload3(TestCallback arg);
  undefined overload3(boolean arg);
  undefined overload4(TestInterface arg);
  undefined overload4(TestCallbackInterface arg);
  undefined overload4(DOMString arg);
  undefined overload5(long arg);
  undefined overload5(TestEnum arg);
  undefined overload6(long arg);
  undefined overload6(boolean arg);
  undefined overload7(long arg);
  undefined overload7(boolean arg);
  undefined overload7(ByteString arg);
  undefined overload8(long arg);
  undefined overload8(TestInterface arg);
  undefined overload9(long? arg);
  undefined overload9(DOMString arg);
  undefined overload10(long? arg);
  undefined overload10(object arg);
  undefined overload11(long arg);
  undefined overload11(DOMString? arg);
  undefined overload12(long arg);
  undefined overload12(boolean? arg);
  undefined overload13(long? arg);
  undefined overload13(boolean arg);
  undefined overload14(optional long arg);
  undefined overload14(TestInterface arg);
  undefined overload15(long arg);
  undefined overload15(optional TestInterface arg);
  undefined overload16(long arg);
  undefined overload16(optional TestInterface? arg);
  undefined overload17(sequence<long> arg);
  undefined overload17(record<DOMString, long> arg);
  undefined overload18(record<DOMString, DOMString> arg);
  undefined overload18(sequence<DOMString> arg);
  undefined overload19(sequence<long> arg);
  undefined overload19(optional Dict arg = {});
  undefined overload20(optional Dict arg = {});
  undefined overload20(sequence<long> arg);

  // Variadic handling
  undefined passVariadicThirdArg(DOMString arg1, long arg2, TestInterface... arg3);

  // Conditionally exposed methods/attributes
  [Pref="dom.webidl.test1"]
  readonly attribute boolean prefable1;
  [Pref="dom.webidl.test1"]
  readonly attribute boolean prefable2;
  [Pref="dom.webidl.test2"]
  readonly attribute boolean prefable3;
  [Pref="dom.webidl.test2"]
  readonly attribute boolean prefable4;
  [Pref="dom.webidl.test1"]
  readonly attribute boolean prefable5;
  [Pref="dom.webidl.test1", Func="nsGenericHTMLElement::LegacyTouchAPIEnabled"]
  readonly attribute boolean prefable6;
  [Pref="dom.webidl.test1", Func="nsGenericHTMLElement::LegacyTouchAPIEnabled"]
  readonly attribute boolean prefable7;
  [Pref="dom.webidl.test2", Func="nsGenericHTMLElement::LegacyTouchAPIEnabled"]
  readonly attribute boolean prefable8;
  [Pref="dom.webidl.test1", Func="nsGenericHTMLElement::LegacyTouchAPIEnabled"]
  readonly attribute boolean prefable9;
  [Pref="dom.webidl.test1"]
  undefined prefable10();
  [Pref="dom.webidl.test1", Func="nsGenericHTMLElement::LegacyTouchAPIEnabled"]
  undefined prefable11();
  [Pref="dom.webidl.test1", Func="TestFuncControlledMember"]
  readonly attribute boolean prefable12;
  [Pref="dom.webidl.test1", Func="nsGenericHTMLElement::LegacyTouchAPIEnabled"]
  undefined prefable13();
  [Pref="dom.webidl.test1", Func="TestFuncControlledMember"]
  readonly attribute boolean prefable14;
  [Func="TestFuncControlledMember"]
  readonly attribute boolean prefable15;
  [Func="TestFuncControlledMember"]
  readonly attribute boolean prefable16;
  [Pref="dom.webidl.test1", Func="TestFuncControlledMember"]
  undefined prefable17();
  [Func="TestFuncControlledMember"]
  undefined prefable18();
  [Func="TestFuncControlledMember"]
  undefined prefable19();
  [Trial="TestTrial"]
  undefined prefable20();
  [Trial="TestTrial"]
  readonly attribute boolean prefable21;
  [Trial="TestTrial", Func="TestFuncControlledMember"]
  readonly attribute boolean prefable22;

  // Conditionally exposed methods/attributes involving [SecureContext]
  [SecureContext]
  readonly attribute boolean conditionalOnSecureContext1;
  [SecureContext, Pref="dom.webidl.test1"]
  readonly attribute boolean conditionalOnSecureContext2;
  [SecureContext, Pref="dom.webidl.test1", Func="nsGenericHTMLElement::LegacyTouchAPIEnabled"]
  readonly attribute boolean conditionalOnSecureContext3;
  [SecureContext, Pref="dom.webidl.test1", Func="TestFuncControlledMember"]
  readonly attribute boolean conditionalOnSecureContext4;
  [SecureContext]
  undefined conditionalOnSecureContext5();
  [SecureContext, Pref="dom.webidl.test1"]
  undefined conditionalOnSecureContext6();
  [SecureContext, Pref="dom.webidl.test1", Func="nsGenericHTMLElement::LegacyTouchAPIEnabled"]
  undefined conditionalOnSecureContext7();
  [SecureContext, Pref="dom.webidl.test1", Func="TestFuncControlledMember"]
  undefined conditionalOnSecureContext8();
  [SecureContext, Trial="TestTrial"]
  readonly attribute boolean conditionalOnSecureContext9;
  [SecureContext, Trial="TestTrial"]
  undefined conditionalOnSecureContext10();

  // Miscellania
  [LegacyLenientThis] attribute long attrWithLenientThis;
  [LegacyUnforgeable] readonly attribute long unforgeableAttr;
  [LegacyUnforgeable, ChromeOnly] readonly attribute long unforgeableAttr2;
  [LegacyUnforgeable] long unforgeableMethod();
  [LegacyUnforgeable, ChromeOnly] long unforgeableMethod2();
  stringifier;
  undefined passRenamedInterface(TestRenamedInterface arg);
  [PutForwards=writableByte] readonly attribute TestExampleInterface putForwardsAttr;
  [PutForwards=writableByte, LegacyLenientThis] readonly attribute TestExampleInterface putForwardsAttr2;
  [PutForwards=writableByte, ChromeOnly] readonly attribute TestExampleInterface putForwardsAttr3;
  [Throws] undefined throwingMethod();
  [Throws] attribute boolean throwingAttr;
  [GetterThrows] attribute boolean throwingGetterAttr;
  [SetterThrows] attribute boolean throwingSetterAttr;
  [CanOOM] undefined canOOMMethod();
  [CanOOM] attribute boolean canOOMAttr;
  [GetterCanOOM] attribute boolean canOOMGetterAttr;
  [SetterCanOOM] attribute boolean canOOMSetterAttr;
  [NeedsSubjectPrincipal] undefined needsSubjectPrincipalMethod();
  [NeedsSubjectPrincipal] attribute boolean needsSubjectPrincipalAttr;
  [NeedsSubjectPrincipal=NonSystem] undefined needsNonSystemSubjectPrincipalMethod();
  [NeedsSubjectPrincipal=NonSystem] attribute boolean needsNonSystemSubjectPrincipalAttr;
  [NeedsCallerType] undefined needsCallerTypeMethod();
  [NeedsCallerType] attribute boolean needsCallerTypeAttr;
  [CEReactions] undefined ceReactionsMethod();
  [CEReactions] undefined ceReactionsMethodOverload();
  [CEReactions] undefined ceReactionsMethodOverload(DOMString bar);
  [CEReactions] attribute boolean ceReactionsAttr;
  legacycaller short(unsigned long arg1, TestInterface arg2);
  undefined passArgsWithDefaults(optional long arg1,
                            optional TestInterface? arg2 = null,
                            optional Dict arg3 = {}, optional double arg4 = 5.0,
                            optional float arg5);
  attribute any toJSONShouldSkipThis;
  attribute TestParentInterface toJSONShouldSkipThis2;
  attribute TestCallbackInterface toJSONShouldSkipThis3;
  [Default] object toJSON();

  attribute byte dashed-attribute;
  undefined dashed-method();

  // [NonEnumerable] tests
  [NonEnumerable]
  attribute boolean nonEnumerableAttr;
  [NonEnumerable]
  const boolean nonEnumerableConst = true;
  [NonEnumerable]
  undefined nonEnumerableMethod();

  // [AllowShared] tests
  attribute [AllowShared] ArrayBufferViewTypedef allowSharedArrayBufferViewTypedef;
  attribute [AllowShared] ArrayBufferView allowSharedArrayBufferView;
  attribute [AllowShared] ArrayBufferView? allowSharedNullableArrayBufferView;
  attribute [AllowShared] ArrayBuffer allowSharedArrayBuffer;
  attribute [AllowShared] ArrayBuffer? allowSharedNullableArrayBuffer;

  undefined passAllowSharedArrayBufferViewTypedef(AllowSharedArrayBufferViewTypedef foo);
  undefined passAllowSharedArrayBufferView([AllowShared] ArrayBufferView foo);
  undefined passAllowSharedNullableArrayBufferView([AllowShared] ArrayBufferView? foo);
  undefined passAllowSharedArrayBuffer([AllowShared] ArrayBuffer foo);
  undefined passAllowSharedNullableArrayBuffer([AllowShared] ArrayBuffer? foo);
  undefined passUnionArrayBuffer((DOMString or ArrayBuffer) foo);
  undefined passUnionAllowSharedArrayBuffer((DOMString or [AllowShared] ArrayBuffer) foo);

  // If you add things here, add them to TestCodeGen and TestJSImplGen as well
};

[Exposed=Window]
interface TestExampleProxyInterface {
  getter long longIndexedGetter(unsigned long ix);
  setter undefined longIndexedSetter(unsigned long y, long z);
  readonly attribute unsigned long length;
  stringifier DOMString myStringifier();
  getter short shortNameGetter(DOMString nom);
  deleter undefined (DOMString nomnom);
  setter undefined shortNamedSetter(DOMString me, short value);
};

[Exposed=(Window,Worker)]
interface TestExampleWorkerInterface {
  [NeedsSubjectPrincipal] undefined needsSubjectPrincipalMethod();
  [NeedsSubjectPrincipal] attribute boolean needsSubjectPrincipalAttr;
  [NeedsCallerType] undefined needsCallerTypeMethod();
  [NeedsCallerType] attribute boolean needsCallerTypeAttr;
  [NeedsSubjectPrincipal=NonSystem] undefined needsNonSystemSubjectPrincipalMethod();
  [NeedsSubjectPrincipal=NonSystem] attribute boolean needsNonSystemSubjectPrincipalAttr;
};

[Exposed=Window]
interface TestExampleThrowingConstructorInterface {
  [Throws]
  constructor();
  [Throws]
  constructor(DOMString str);
  [Throws]
  constructor(unsigned long num, boolean? boolArg);
  [Throws]
  constructor(TestInterface? iface);
  [Throws]
  constructor(unsigned long arg1, TestInterface iface);
  [Throws]
  constructor(ArrayBuffer arrayBuf);
  [Throws]
  constructor(Uint8Array typedArr);
  // [Throws] constructor(long arg1, long arg2, (TestInterface or OnlyForUseInConstructor) arg3);
};

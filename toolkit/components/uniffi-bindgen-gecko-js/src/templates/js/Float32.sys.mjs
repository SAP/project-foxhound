// Export the FFIConverter object to make external types work.
export class {{ ffi_converter }} extends FfiConverter {
    static computeSize(_value) {
        return 4;
    }
    static lift(value) {
        return value;
    }
    static lower(value) {
        return value;
    }
    static write(dataStream, value) {
        dataStream.writeFloat32(value)
    }
    static read(dataStream) {
        return dataStream.readFloat32()
    }
}

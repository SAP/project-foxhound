// |jit-test| skip-if: !wasmStackSwitchingEnabled()

wasmFailValidateText(`(module
    (type $s (struct))
    (type (cont $s))
)`, /cont must reference a func type/);

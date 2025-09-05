// |jit-test| test-also=--wasm-compiler=optimizing; test-also=--wasm-compiler=baseline;

wasmFailValidateText(`(module
	(tag)
	(tag)
	(func (export "test")
		try
			throw 0
		catch 0
			unreachable
		catch 1
			i32.add
		end
	)
)`, /popping/);

wasmFailValidateText(`(module
	(tag)
	(tag)
	(func (export "test") (param (ref extern))
		(local $nonNullable (ref extern))
		try
			throw 0
		catch 0
			(local.set $nonNullable (local.get 0))
		catch 1
			(local.get $nonNullable)
			drop
		end
	)
)`, /unset local/);

// |jit-test| module; error: SyntaxError: Unsupported import attribute: unsupported
import a from 'foo' with { unsupported: 'test'}

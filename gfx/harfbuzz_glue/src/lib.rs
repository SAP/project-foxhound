// This file is part of ICU4X. For terms of use, please see the file
// called LICENSE at the top level of the ICU4X source tree
// (online at: https://github.com/unicode-org/icu4x/blob/main/LICENSE ).

// Adapted from https://github.com/unicode-org/icu4x/blob/main/examples/cargo/harfbuzz/src/main.rs , which had
// the above license header.

use harfbuzz::{sys::hb_unicode_funcs_t, UnicodeFuncs, UnicodeFuncsBuilder};
use icu_normalizer::properties::*;
use icu_properties::{
    props::{BidiMirroringGlyph, GeneralCategory},
    script::HarfbuzzScriptData,
    CodePointMapData,
};

fn compiled_funcs() -> UnicodeFuncs {
    /// We avoid allocations by boxing a zero-sized type and redirecting to compiled data.
    struct CompiledHarfbuzzData;

    let mut builder = UnicodeFuncsBuilder::new_with_empty_parent().unwrap();
    //  Note: `CompiledHarfbuzzData` is zero-sized, so this doesn't allocate memory.
    builder.set_general_category_func(Box::new(CompiledHarfbuzzData));
    builder.set_combining_class_func(Box::new(CompiledHarfbuzzData));
    builder.set_mirroring_func(Box::new(CompiledHarfbuzzData));
    builder.set_script_func(Box::new(CompiledHarfbuzzData));
    builder.set_compose_func(Box::new(CompiledHarfbuzzData));
    builder.set_decompose_func(Box::new(CompiledHarfbuzzData));

    use harfbuzz_traits::{
        CombiningClassFunc, ComposeFunc, DecomposeFunc, GeneralCategoryFunc, MirroringFunc,
        ScriptFunc,
    };

    impl GeneralCategoryFunc for CompiledHarfbuzzData {
        #[inline]
        fn general_category(&self, ch: char) -> harfbuzz_traits::GeneralCategory {
            GeneralCategoryFunc::general_category(&CodePointMapData::<GeneralCategory>::new(), ch)
        }
    }

    impl CombiningClassFunc for CompiledHarfbuzzData {
        #[inline]
        fn combining_class(&self, ch: char) -> u8 {
            CombiningClassFunc::combining_class(&CanonicalCombiningClassMap::new(), ch)
        }
    }

    impl MirroringFunc for CompiledHarfbuzzData {
        #[inline]
        fn mirroring(&self, ch: char) -> char {
            MirroringFunc::mirroring(&CodePointMapData::<BidiMirroringGlyph>::new(), ch)
        }
    }

    impl ScriptFunc for CompiledHarfbuzzData {
        #[inline]
        fn script(&self, ch: char) -> [u8; 4] {
            ScriptFunc::script(&HarfbuzzScriptData::new(), ch)
        }
    }

    impl ComposeFunc for CompiledHarfbuzzData {
        #[inline]
        fn compose(&self, a: char, b: char) -> Option<char> {
            ComposeFunc::compose(&CanonicalComposition::new(), a, b)
        }
    }

    impl DecomposeFunc for CompiledHarfbuzzData {
        #[inline]
        fn decompose(&self, ab: char) -> Option<(char, char)> {
            DecomposeFunc::decompose(&CanonicalDecomposition::new(), ab)
        }
    }
    builder.build()
}

#[no_mangle]
pub unsafe extern "C" fn mozilla_harfbuzz_glue_set_up_unicode_funcs() -> *mut hb_unicode_funcs_t {
    compiled_funcs().into_raw()
}

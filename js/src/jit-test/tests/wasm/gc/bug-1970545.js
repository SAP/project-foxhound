// |jit-test| skip-if: !wasmSimdEnabled()

wasmEvalText(`(module
  (rec
    (type (;0;) (array (mut i8)))
    (type (;1;) (array (mut i16)))
  )
  (type (;2;) (sub (struct (field i8) (field (mut (ref 1))) (field (mut (ref i31))))))
  (rec
    (type (;3;) (sub 2 (struct (field i8) (field (mut (ref 1))) (field (mut (ref i31))) (field (mut i32)))))
    (type (;4;) (sub (array (mut i32))))
  )
  (type (;5;) (func (param i32 i32 i32) (result i32)))
  (table (;0;) i64 1 6 funcref ref.func 0)
  (memory (;0;) 0)
  (func (;0;) (type 5) (param i32 i32 i32) (result i32)
    f32.const 0
    i32.trunc_f32_u
    i64.extend_i32_s
    f64.reinterpret_i64

    f64.const 0
    i64.trunc_sat_f64_u
    i64.const 8398166195075094165
    i64.const -7299886738206884375
    i32.const 627
    select (result i64)
    i64.ge_s
    try (result i32)
      local.get 0
      i32.const 0
      i8x16.splat
      i32.const 0
      i8x16.splat
      f32x4.demote_f64x2_zero
      i8x16.min_s
      i8x16.all_true
      ref.i31
      i31.get_s
      f32.const 1 (;=-494449460000000000000000000000000;)
      i32.reinterpret_f32
      i64.const 0
      call_indirect (type 5)
    end
    i32.atomic.rmw.xor offset=51517

    i32.const 44591
    i32.const 0
    array.new 1

    i32.const 14302
    ref.i31

    struct.new 2
    ref.cast (ref null 3)

    block (param f64 (ref null 3)) (result i32) ;; label = @1
      struct.get 3 3
      i32.const 3170206
      i32.const 1
      i32.atomic.rmw.add offset=59285
      i32.const 6
      i32.atomic.rmw.xor offset=9468
      i32.store16 offset=38406 align=1
      f64.const -0x1.9c2ce2da6f314p-700 (;=-0.00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000030608713127596974;)
      f64.sub
      i32.trunc_f64_u
      ref.null any
      ref.cast (ref null 1)
      ref.null any
      ref.cast (ref null 1)
      ref.eq
      v128.const i32x4 0x280c7e4e 0x561c653d 0x15d0601d 0xae257dbb
      i32.const 2420518
      i32.const 7
      i32.atomic.rmw16.xor_u offset=1307
      i32x4.replace_lane 0
      v128.const i32x4 0xee2c57b1 0xf5a965fe 0x9955dcf5 0x6382ebc4
      i32.const 0
      i8x16.splat
      v128.xor
      i8x16.narrow_i16x8_s
      i16x8.extract_lane_u 1
      i32.ge_s
      block (result i32) ;; label = @2
        block (result i32) ;; label = @3
          i32.const 0
          i32.const 0
          br_table 0
        end
        i32.const 26
        br_if 2
        local.set 0
        block (result i32) ;; label = @3
          i32.const 0
          i32.const 0
          br_table 0
        end
      end
      i32.const 814506
      ref.null 5
      return_call_ref 5
    end
  )
)`);
use crate::{filled_circle_with_path_builder, PathBuilder, Point, StrokeStyle, Stroker};

type OutputVertex = crate::Vertex;

#[repr(C)]
pub struct VertexBuffer {
    data: *const OutputVertex,
    len: usize
}

#[no_mangle]
pub extern "C" fn aa_stroke_new(
    style: &StrokeStyle,
    output_ptr: *mut OutputVertex,
    output_capacity: usize,
) -> *mut Stroker {
    let mut s = Stroker::new(style);
    if output_ptr != std::ptr::null_mut() {
        let slice = unsafe { std::slice::from_raw_parts_mut(output_ptr, output_capacity) };
        s.set_output_buffer(slice);
    }
    Box::into_raw(Box::new(s))
}

#[no_mangle]
pub extern "C" fn aa_stroke_move_to(s: &mut Stroker, x: f32, y: f32, closed: bool) {
    s.move_to(Point::new(x, y), closed);
}

#[no_mangle]
pub extern "C" fn aa_stroke_line_to(s: &mut Stroker, x: f32, y: f32, end: bool) {
    if end {
        s.line_to_capped(Point::new(x, y))
    } else {
        s.line_to(Point::new(x, y));
    }
}

#[no_mangle]
pub extern "C" fn aa_stroke_curve_to(s: &mut Stroker, c1x: f32, c1y: f32, c2x: f32, c2y: f32, x: f32, y: f32, end: bool) {
    if end {
        s.curve_to_capped(Point::new(c1x, c1y), Point::new(c2x, c2y), Point::new(x, y));
    } else {
        s.curve_to(Point::new(c1x, c1y), Point::new(c2x, c2y), Point::new(x, y));
    }
}

/* 
#[no_mangle]
pub extern "C" fn aa_stroke_quad_to(s: &mut Stroker, cx: f32, cy: f32, x: f32, y: f32) {
    s.quad_to(cx, cy, x, y);
}*/

#[no_mangle]
pub extern "C" fn aa_stroke_close(s: &mut Stroker) {
    s.close();
}

#[no_mangle]
pub extern "C" fn aa_stroke_finish(s: &mut Stroker) -> VertexBuffer {
    let stroked_path = s.get_stroked_path();
    if let Some(output_buffer_size) = stroked_path.get_output_buffer_size() {
        // if let Some(output_buffer) = stroked_path.output_buffer {
        //     dbg!(&output_buffer[0..output_buffer_size]);
        // }
        VertexBuffer {
            data: std::ptr::null(),
            len: output_buffer_size,
        }
    } else {
        let result = s.finish();
        let len = result.len();
        let vb = VertexBuffer { data: Box::leak(result).as_ptr(), len };
        vb
    }
}

#[no_mangle]
pub extern "C" fn aa_stroke_vertex_buffer_release(vb: VertexBuffer)
{
    if vb.data != std::ptr::null() {
        unsafe {
            drop(Box::from_raw(std::slice::from_raw_parts_mut(vb.data as *mut OutputVertex, vb.len)));
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn aa_stroke_release(s: *mut Stroker) {
    drop(Box::from_raw(s));
}

#[no_mangle]
pub extern "C" fn aa_stroke_filled_circle(
    cx: f32, cy: f32, radius: f32, output_ptr: *mut OutputVertex, output_capacity: usize
) -> VertexBuffer {
    let mut path_builder = PathBuilder::new(1.);
    if output_ptr != std::ptr::null_mut() {
        let slice = unsafe { std::slice::from_raw_parts_mut(output_ptr, output_capacity) };
        path_builder.set_output_buffer(slice);
    }

    filled_circle_with_path_builder(&mut path_builder, Point::new(cx, cy), radius);

    if let Some(output_buffer_size) = path_builder.get_output_buffer_size() {
        VertexBuffer {
            data: std::ptr::null(),
            len: output_buffer_size,
        }
    } else {
        let result = path_builder.finish();
        let len = result.len();
        let vb = VertexBuffer { data: Box::leak(result).as_ptr(), len };
        vb
    }
}


#[test]
fn simple() {
    let style = StrokeStyle::default();
    let s = unsafe { &mut *aa_stroke_new(&style, std::ptr::null_mut(), 0) } ;
    aa_stroke_move_to(s, 10., 10., false);
    aa_stroke_line_to(s, 100., 100., false);
    aa_stroke_line_to(s, 100., 10., true);
    let vb = aa_stroke_finish(s);
    aa_stroke_vertex_buffer_release(vb);
    unsafe { aa_stroke_release(s) } ;
}

#[test]
fn output_buffer() {
    let style = StrokeStyle::default();
    let mut output = Vec::new();
    output.resize_with(1000, || OutputVertex{x: 0., y: 0., coverage: 0.});
    let s = unsafe { &mut *aa_stroke_new(&style, output.as_mut_ptr(), output.len()) } ;
    aa_stroke_move_to(s, 10., 10., false);
    aa_stroke_line_to(s, 100., 100., false);
    aa_stroke_line_to(s, 100., 10., true);

    let vb = aa_stroke_finish(s);
    assert_ne!(vb.len, 0);
    assert_eq!(vb.data, std::ptr::null());
    aa_stroke_vertex_buffer_release(vb);
    unsafe { aa_stroke_release(s) } ;
}

#[test]
fn filled_circle_output_buffer() {
    use crate::Vertex;
    let mut output = Vec::new();
    output.resize_with(1000, || OutputVertex{x: 0., y: 0., coverage: 0.});
    let center = Point::new(100., 100.);
    let radius = 33.;

    let vb = aa_stroke_filled_circle(center.x, center.y, radius, output.as_mut_ptr(), output.len());
    assert_ne!(vb.len, 0);
    assert_eq!(vb.data, std::ptr::null());
    let result = &output[0..vb.len];
    let min_x  = result.iter().map(|v: &Vertex| v.x).reduce(|a, b| a.min(b)).unwrap();
    let max_x  = result.iter().map(|v: &Vertex| v.x).reduce(|a, b| a.max(b)).unwrap();
    let min_y  = result.iter().map(|v: &Vertex| v.y).reduce(|a, b| a.min(b)).unwrap();
    let max_y  = result.iter().map(|v: &Vertex| v.y).reduce(|a, b| a.max(b)).unwrap();
    assert_eq!(min_x, center.x - (radius + 0.5));
    assert_eq!(max_x, center.x + (radius + 0.5));
    assert_eq!(min_y, center.y - (radius + 0.5));
    assert_eq!(max_y, center.y + (radius + 0.5));
}


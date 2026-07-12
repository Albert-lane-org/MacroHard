// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-07-12 | SEC Whistleblower No. 17684-273-411-436 | This header must be preserved in any copy, fork, or derivative use
//! MacroHarder — Safe Rust wrappers around C/C++ compute kernels.

extern "C" {
    fn matrix3d_multiply(a: *const f64, b: *const f64, result: *mut f64);
    fn vector3d_transform(mat: *const f64, vec: *const f64, result: *mut f64);
    fn matrix3d_identity(mat: *mut f64);
    fn vector3d_dot(a: *const f64, b: *const f64) -> f64;
    fn vector3d_cross(a: *const f64, b: *const f64, result: *mut f64);
    fn kriging_interpolate(
        x_coords: *const f64,
        y_coords: *const f64,
        values: *const f64,
        n_points: i32,
        target_x: f64,
        target_y: f64,
        range: f64,
        sill: f64,
        nugget: f64,
    ) -> f64;
}

/// Multiply two 4x4 column-major matrices. Returns result matrix (16 f64).
pub fn mat4_multiply(a: &[f64; 16], b: &[f64; 16]) -> [f64; 16] {
    let mut result = [0f64; 16];
    unsafe { matrix3d_multiply(a.as_ptr(), b.as_ptr(), result.as_mut_ptr()) }
    result
}

/// Transform a 4D vector (x, y, z, w) by a 4x4 column-major matrix.
pub fn mat4_transform_vec4(mat: &[f64; 16], vec: &[f64; 4]) -> [f64; 4] {
    let mut result = [0f64; 4];
    unsafe { vector3d_transform(mat.as_ptr(), vec.as_ptr(), result.as_mut_ptr()) }
    result
}

/// Return the 4x4 identity matrix.
pub fn mat4_identity() -> [f64; 16] {
    let mut mat = [0f64; 16];
    unsafe { matrix3d_identity(mat.as_mut_ptr()) }
    mat
}

/// Dot product of two 3D vectors.
pub fn vec3_dot(a: &[f64; 3], b: &[f64; 3]) -> f64 {
    unsafe { vector3d_dot(a.as_ptr(), b.as_ptr()) }
}

/// Cross product of two 3D vectors.
pub fn vec3_cross(a: &[f64; 3], b: &[f64; 3]) -> [f64; 3] {
    let mut result = [0f64; 3];
    unsafe { vector3d_cross(a.as_ptr(), b.as_ptr(), result.as_mut_ptr()) }
    result
}

/// Ordinary kriging interpolation.
/// Returns `None` if `points` is empty.
pub fn kriging_interp(
    points: &[(f64, f64, f64)], // (x, y, value)
    target_x: f64,
    target_y: f64,
    range: f64,
    sill: f64,
    nugget: f64,
) -> Option<f64> {
    if points.is_empty() {
        return None;
    }
    let xs: Vec<f64> = points.iter().map(|p| p.0).collect();
    let ys: Vec<f64> = points.iter().map(|p| p.1).collect();
    let vs: Vec<f64> = points.iter().map(|p| p.2).collect();
    let result = unsafe {
        kriging_interpolate(
            xs.as_ptr(),
            ys.as_ptr(),
            vs.as_ptr(),
            points.len() as i32,
            target_x,
            target_y,
            range,
            sill,
            nugget,
        )
    };
    if result.is_nan() {
        None
    } else {
        Some(result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn identity_matrix_diagonal() {
        let id = mat4_identity();
        assert_eq!(id[0], 1.0);
        assert_eq!(id[5], 1.0);
        assert_eq!(id[10], 1.0);
        assert_eq!(id[15], 1.0);
        assert_eq!(id[1], 0.0);
        assert_eq!(id[4], 0.0);
    }

    #[test]
    fn identity_multiply_is_identity() {
        let id = mat4_identity();
        let result = mat4_multiply(&id, &id);
        for i in 0..16 {
            assert!((result[i] - id[i]).abs() < 1e-10, "mismatch at {i}");
        }
    }

    #[test]
    fn transform_by_identity_is_noop() {
        let id = mat4_identity();
        let v = [1.0, 2.0, 3.0, 1.0];
        let out = mat4_transform_vec4(&id, &v);
        assert!((out[0] - 1.0).abs() < 1e-10);
        assert!((out[1] - 2.0).abs() < 1e-10);
        assert!((out[2] - 3.0).abs() < 1e-10);
    }

    #[test]
    fn vec3_dot_orthogonal_is_zero() {
        let a = [1.0, 0.0, 0.0f64];
        let b = [0.0, 1.0, 0.0f64];
        assert!((vec3_dot(&a, &b)).abs() < 1e-10);
    }

    #[test]
    fn vec3_dot_parallel_is_magnitude_squared() {
        let a = [2.0, 0.0, 0.0f64];
        assert!((vec3_dot(&a, &a) - 4.0).abs() < 1e-10);
    }

    #[test]
    fn vec3_cross_unit_vectors() {
        let x = [1.0, 0.0, 0.0f64];
        let y = [0.0, 1.0, 0.0f64];
        let z = vec3_cross(&x, &y);
        assert!((z[0]).abs() < 1e-10);
        assert!((z[1]).abs() < 1e-10);
        assert!((z[2] - 1.0).abs() < 1e-10);
    }

    #[test]
    fn kriging_single_point_returns_its_value() {
        let points = [(0.0, 0.0, 42.0f64)];
        let result = kriging_interp(&points, 1.0, 1.0, 1.0, 1.0, 0.0);
        assert!(result.is_some());
        // Single point: kriging returns the only value available
        assert!((result.unwrap() - 42.0).abs() < 1.0);
    }

    #[test]
    fn kriging_empty_returns_none() {
        let result = kriging_interp(&[], 0.0, 0.0, 1.0, 1.0, 0.0);
        assert!(result.is_none());
    }

    #[test]
    fn kriging_at_known_point_approximates_value() {
        // Target exactly at the first known point -> should return ~100.0
        let points = [(0.0, 0.0, 100.0), (1.0, 0.0, 50.0), (0.0, 1.0, 50.0)];
        let result = kriging_interp(&points, 0.0, 0.0, 1.5, 1.0, 0.0);
        assert!(result.is_some());
        // At an exact known point, kriging should be close to the known value
        let v = result.unwrap();
        assert!((v - 100.0).abs() < 30.0, "expected ~100, got {v}");
    }

    #[test]
    fn mat4_multiply_scale_matrix() {
        // Scale by 2 in all axes
        let mut scale = mat4_identity();
        scale[0] = 2.0;
        scale[5] = 2.0;
        scale[10] = 2.0;
        let result = mat4_multiply(&scale, &scale); // scale^2 = scale by 4
        assert!((result[0] - 4.0).abs() < 1e-10);
        assert!((result[5] - 4.0).abs() < 1e-10);
        assert!((result[10] - 4.0).abs() < 1e-10);
        assert!((result[15] - 1.0).abs() < 1e-10);
    }

    #[test]
    fn transform_scaled_point() {
        let mut scale = mat4_identity();
        scale[0] = 3.0; // scale X by 3
        let v = [2.0, 1.0, 1.0, 1.0];
        let out = mat4_transform_vec4(&scale, &v);
        assert!((out[0] - 6.0).abs() < 1e-10); // 2 * 3 = 6
        assert!((out[1] - 1.0).abs() < 1e-10);
    }
}

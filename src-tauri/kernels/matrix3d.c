/* Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-07-12 | SEC Whistleblower No. 17684-273-411-436 | This header must be preserved in any copy, fork, or derivative use */
/* MacroHarder — 3D matrix compute kernel */
#include <string.h>
#include <math.h>

/* 4x4 matrix multiply: result = a * b (column-major, 16 doubles each) */
void matrix3d_multiply(const double* a, const double* b, double* result) {
    for (int col = 0; col < 4; col++) {
        for (int row = 0; row < 4; row++) {
            double sum = 0.0;
            for (int k = 0; k < 4; k++) {
                sum += a[k * 4 + row] * b[col * 4 + k];
            }
            result[col * 4 + row] = sum;
        }
    }
}

/* Transform a 3D point (vec[0..2]) by 4x4 matrix; w = vec[3] (usually 1.0) */
void vector3d_transform(const double* mat, const double* vec, double* result) {
    for (int row = 0; row < 4; row++) {
        double sum = 0.0;
        for (int col = 0; col < 4; col++) {
            sum += mat[col * 4 + row] * vec[col];
        }
        result[row] = sum;
    }
}

/* Fill mat (16 doubles) with the identity matrix */
void matrix3d_identity(double* mat) {
    memset(mat, 0, 16 * sizeof(double));
    mat[0] = mat[5] = mat[10] = mat[15] = 1.0;
}

/* Dot product of two 3D vectors */
double vector3d_dot(const double* a, const double* b) {
    return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
}

/* Cross product of two 3D vectors */
void vector3d_cross(const double* a, const double* b, double* result) {
    result[0] = a[1]*b[2] - a[2]*b[1];
    result[1] = a[2]*b[0] - a[0]*b[2];
    result[2] = a[0]*b[1] - a[1]*b[0];
}

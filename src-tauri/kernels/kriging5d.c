/* Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-07-21 | SEC Whistleblower No. 17684-273-411-436 | This header must be preserved in any copy, fork, or derivative use */
/* MacroHarder — 5D Ordinary Kriging interpolation kernel.
   MH-P14-02: Tensor product spherical variogram over (col, row, layer, time, domain) space.
   Lag distance is the standard Euclidean distance in 5D. */

#include <math.h>
#include <stdlib.h>
#include <string.h>

/* Spherical semivariogram (identical model as kriging.c — parameterised by h). */
static double semivariogram5d(double h, double range, double sill, double nugget) {
    if (h <= 0.0) return nugget;
    if (h >= range) return nugget + sill;
    double r = h / range;
    return nugget + sill * (1.5 * r - 0.5 * r * r * r);
}

/* Euclidean lag distance between two 5D coordinate vectors. */
static double lag5d(const double* a, const double* b) {
    double sum = 0.0;
    for (int i = 0; i < 5; i++) {
        double d = a[i] - b[i];
        sum += d * d;
    }
    return sqrt(sum);
}

/* Ordinary kriging in 5D.
   coords5d : flat row-major array of n_points * 5 doubles  [p0_d0, p0_d1, ..., p0_d4, p1_d0, ...]
   values   : n_points values
   target5d : 5 doubles for the target coordinate
   Returns interpolated value, or NaN if n_points == 0. */
double kriging5d_interpolate(
    const double* coords5d,
    const double* values,
    int n_points,
    const double* target5d,
    double range,
    double sill,
    double nugget
) {
    if (n_points <= 0) return nan("");
    if (n_points == 1) return values[0];

    int n = n_points + 1; /* +1 for Lagrange multiplier */
    double* K = (double*)calloc(n * n, sizeof(double));
    double* b = (double*)calloc(n, sizeof(double));
    double* w = (double*)calloc(n, sizeof(double));

    if (!K || !b || !w) { free(K); free(b); free(w); return nan(""); }

    /* Build kriging matrix */
    for (int i = 0; i < n_points; i++) {
        const double* pi = coords5d + i * 5;
        for (int j = 0; j < n_points; j++) {
            const double* pj = coords5d + j * 5;
            double h = lag5d(pi, pj);
            K[i * n + j] = semivariogram5d(h, range, sill, nugget);
        }
        K[i * n + n_points] = 1.0;
        K[n_points * n + i] = 1.0;
    }
    K[n_points * n + n_points] = 0.0;

    /* Right-hand side: distance from each known point to the target */
    for (int i = 0; i < n_points; i++) {
        const double* pi = coords5d + i * 5;
        double h = lag5d(pi, target5d);
        b[i] = semivariogram5d(h, range, sill, nugget);
    }
    b[n_points] = 1.0;

    /* Gaussian elimination with partial pivoting */
    for (int col = 0; col < n; col++) {
        int pivot = col;
        for (int row = col + 1; row < n; row++) {
            if (fabs(K[row * n + col]) > fabs(K[pivot * n + col])) pivot = row;
        }
        for (int k = 0; k < n; k++) {
            double tmp = K[col * n + k]; K[col * n + k] = K[pivot * n + k]; K[pivot * n + k] = tmp;
        }
        double tmp = b[col]; b[col] = b[pivot]; b[pivot] = tmp;

        double diag = K[col * n + col];
        if (fabs(diag) < 1e-12) continue;
        for (int row = col + 1; row < n; row++) {
            double factor = K[row * n + col] / diag;
            for (int k = col; k < n; k++) K[row * n + k] -= factor * K[col * n + k];
            b[row] -= factor * b[col];
        }
    }

    /* Back substitution */
    for (int row = n - 1; row >= 0; row--) {
        double sum = b[row];
        for (int col = row + 1; col < n; col++) sum -= K[row * n + col] * w[col];
        w[row] = (fabs(K[row * n + row]) < 1e-12) ? 0.0 : sum / K[row * n + row];
    }

    double result = 0.0;
    for (int i = 0; i < n_points; i++) result += w[i] * values[i];

    free(K); free(b); free(w);
    return result;
}

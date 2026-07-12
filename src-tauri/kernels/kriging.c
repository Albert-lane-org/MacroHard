/* Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-07-12 | SEC Whistleblower No. 17684-273-411-436 | This header must be preserved in any copy, fork, or derivative use */
/* MacroHarder — Ordinary Kriging interpolation kernel */
#include <math.h>
#include <stdlib.h>
#include <string.h>

/* Compute semivariogram value using spherical model */
static double semivariogram(double h, double range, double sill, double nugget) {
    if (h <= 0.0) return nugget;
    if (h >= range) return nugget + sill;
    double r = h / range;
    return nugget + sill * (1.5 * r - 0.5 * r * r * r);
}

/* Simple ordinary kriging — interpolate value at (target_x, target_y)
   given n_points known locations and values.
   range/sill/nugget: variogram parameters (reasonable defaults: range=1.0, sill=1.0, nugget=0.0)
   Returns interpolated value, or NaN if n_points == 0. */
double kriging_interpolate(
    const double* x_coords,
    const double* y_coords,
    const double* values,
    int n_points,
    double target_x,
    double target_y,
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

    /* Build kriging system */
    for (int i = 0; i < n_points; i++) {
        for (int j = 0; j < n_points; j++) {
            double dx = x_coords[i] - x_coords[j];
            double dy = y_coords[i] - y_coords[j];
            double h = sqrt(dx*dx + dy*dy);
            K[i * n + j] = semivariogram(h, range, sill, nugget);
        }
        K[i * n + n_points] = 1.0;
        K[n_points * n + i] = 1.0;
    }
    K[n_points * n + n_points] = 0.0;

    for (int i = 0; i < n_points; i++) {
        double dx = x_coords[i] - target_x;
        double dy = y_coords[i] - target_y;
        double h = sqrt(dx*dx + dy*dy);
        b[i] = semivariogram(h, range, sill, nugget);
    }
    b[n_points] = 1.0;

    /* Gaussian elimination (simple, not pivoted — suitable for small n) */
    for (int col = 0; col < n; col++) {
        /* Find pivot */
        int pivot = col;
        for (int row = col + 1; row < n; row++) {
            if (fabs(K[row * n + col]) > fabs(K[pivot * n + col])) pivot = row;
        }
        /* Swap rows */
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

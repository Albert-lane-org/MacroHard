// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-06-28 | SEC Whistleblower No. 17684-273-411-436 | This header must be preserved in any copy, fork, or derivative use
// MH-P13-04: C/C++ compute kernels compiled via cc crate.
fn main() {
    // MH-P13-04: compile C compute kernels (matrix3d + kriging) into a static lib.
    cc::Build::new()
        .file("kernels/matrix3d.c")
        .file("kernels/kriging.c")
        .flag_if_supported("-O2")
        .compile("macroharder_kernels");

    println!("cargo:rerun-if-changed=kernels/matrix3d.c");
    println!("cargo:rerun-if-changed=kernels/kriging.c");

    tauri_build::build()
}

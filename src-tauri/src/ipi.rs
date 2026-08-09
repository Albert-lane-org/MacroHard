// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-08-09 | SEC Whistleblower No. 17684-273-411-436 | This header must be preserved in any copy, fork, or derivative use
//! MH-P15-01: Investor Priced Index (IPI) modifier calculator.
//!
//! This is the real, architecturally-embedded piece of the IPI Framework
//! (see `RoadMaps/docs/economic-policy/investor-priced-index.md`, CC BY
//! 4.0). It is deliberately narrow: it computes the framework's own
//! published `calculate_ipi_modifier` math — local-spend recirculation
//! rate, Keynesian local multiplier, and a valuation modifier — as a real,
//! tested function reachable from the workbook UI. It does NOT implement
//! Marked Local Currency, equity index weighting, or any enforcement
//! mechanism against real securities or banking systems — those would
//! require regulatory authority this codebase doesn't have and isn't
//! claiming to have. What's embedded here is the math the document itself
//! presents, so a MacroHarder user can plug in a ZIP code's real spend
//! split and see the model's own output, nothing more.
//!
//! The retention coefficients below (alpha/beta/gamma) are the IPI
//! document's own illustrative model constants, not a measured empirical
//! result — same caveat the document states about itself.

use serde::{Deserialize, Serialize};

/// Local-business capital retention coefficient (IPI document's own value).
const ALPHA: f64 = 0.520;
/// National-chain capital retention coefficient.
const BETA: f64 = 0.136;
/// Pure digital-extraction capital retention coefficient.
const GAMMA: f64 = 0.038;
/// Target recirculation rate at the document's proposed 75/15/10 split.
const RHO_TARGET: f64 = 0.75 * ALPHA + 0.15 * BETA + 0.10 * GAMMA;
/// Digital-extraction ceiling proposed by the document (25%).
const EXTRACTION_CAP: f64 = 0.25;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IpiModifierResult {
    pub s_l_local_percent: f64,
    pub s_c_chain_percent: f64,
    pub s_d_digital_percent: f64,
    pub recirculation_rate_rho: f64,
    pub local_multiplier_ml: f64,
    pub ipi_valuation_modifier: f64,
    pub equity_penalty_percent: f64,
    pub extraction_cap_breached: bool,
}

/// Compute the IPI valuation modifier for a ZIP-code spend split.
///
/// `s_l`/`s_c`/`s_d` are the fractions of discretionary spend going to
/// local independent business, national chains, and digital-platform
/// extraction respectively. They don't need to sum to exactly 1.0 — this
/// normalizes them, matching the document's own reference implementation.
/// Returns an error if all three inputs are zero (nothing to normalize)
/// or any input is negative.
pub fn calculate_ipi_modifier(s_l: f64, s_c: f64, s_d: f64) -> Result<IpiModifierResult, String> {
    if s_l < 0.0 || s_c < 0.0 || s_d < 0.0 {
        return Err("s_l, s_c, s_d must each be non-negative".to_string());
    }
    let total = s_l + s_c + s_d;
    if total <= 0.0 {
        return Err("s_l + s_c + s_d must be greater than zero".to_string());
    }

    let (s_l, s_c, s_d) = if (total - 1.0).abs() < 1e-9 {
        (s_l, s_c, s_d)
    } else {
        (s_l / total, s_c / total, s_d / total)
    };

    let rho_z = s_l * ALPHA + s_c * BETA + s_d * GAMMA;
    let m_l = 1.0 / (1.0 - rho_z);
    let ipi_modifier = rho_z / RHO_TARGET;
    let equity_penalty_percent = if ipi_modifier < 1.0 {
        (1.0 - ipi_modifier) * 100.0
    } else {
        0.0
    };

    Ok(IpiModifierResult {
        s_l_local_percent: round4(s_l * 100.0),
        s_c_chain_percent: round4(s_c * 100.0),
        s_d_digital_percent: round4(s_d * 100.0),
        recirculation_rate_rho: round4(rho_z),
        local_multiplier_ml: round4(m_l),
        ipi_valuation_modifier: round4(ipi_modifier),
        equity_penalty_percent: round4(equity_penalty_percent),
        extraction_cap_breached: s_d > EXTRACTION_CAP,
    })
}

fn round4(v: f64) -> f64 {
    (v * 10000.0).round() / 10000.0
}

#[tauri::command]
pub fn ipi_valuation_modifier(s_l: f64, s_c: f64, s_d: f64) -> Result<IpiModifierResult, String> {
    calculate_ipi_modifier(s_l, s_c, s_d)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn origin_split_matches_document_worked_example() {
        // Document's own 75/15/10 target split -> rho_z should equal RHO_TARGET,
        // so the modifier should be exactly 1.0 (no penalty, no breach).
        let r = calculate_ipi_modifier(0.75, 0.15, 0.10).unwrap();
        assert!((r.ipi_valuation_modifier - 1.0).abs() < 1e-6);
        assert_eq!(r.equity_penalty_percent, 0.0);
        assert!(!r.extraction_cap_breached);
    }

    #[test]
    fn all_local_spend_maximizes_recirculation() {
        let r = calculate_ipi_modifier(1.0, 0.0, 0.0).unwrap();
        assert!((r.recirculation_rate_rho - ALPHA).abs() < 1e-6);
        assert!(r.ipi_valuation_modifier > 1.0);
        assert!(!r.extraction_cap_breached);
    }

    #[test]
    fn all_digital_spend_breaches_extraction_cap() {
        let r = calculate_ipi_modifier(0.0, 0.0, 1.0).unwrap();
        assert!(r.extraction_cap_breached);
        assert!(r.ipi_valuation_modifier < 1.0);
        assert!(r.equity_penalty_percent > 0.0);
    }

    #[test]
    fn inputs_are_normalized_when_not_summing_to_one() {
        // 150/30/20 is the same ratio as 75/15/10 -- should normalize to the same result.
        let a = calculate_ipi_modifier(0.75, 0.15, 0.10).unwrap();
        let b = calculate_ipi_modifier(150.0, 30.0, 20.0).unwrap();
        assert!((a.recirculation_rate_rho - b.recirculation_rate_rho).abs() < 1e-6);
        assert!((a.ipi_valuation_modifier - b.ipi_valuation_modifier).abs() < 1e-6);
    }

    #[test]
    fn negative_input_is_rejected() {
        assert!(calculate_ipi_modifier(-0.1, 0.5, 0.6).is_err());
    }

    #[test]
    fn all_zero_input_is_rejected() {
        assert!(calculate_ipi_modifier(0.0, 0.0, 0.0).is_err());
    }

    #[test]
    fn extraction_cap_boundary_at_25_percent_is_not_breached() {
        // Exactly at the 25% cap should not count as a breach (s_d > 0.25, not >=).
        let r = calculate_ipi_modifier(0.5, 0.25, 0.25).unwrap();
        assert!(!r.extraction_cap_breached);
    }

    #[test]
    fn recirculation_rate_stays_within_alpha_gamma_bounds() {
        for s_l in [0.0, 0.25, 0.5, 0.75, 1.0] {
            let s_remain = 1.0 - s_l;
            let r = calculate_ipi_modifier(s_l, s_remain * 0.5, s_remain * 0.5).unwrap();
            assert!(r.recirculation_rate_rho >= GAMMA - 1e-9);
            assert!(r.recirculation_rate_rho <= ALPHA + 1e-9);
        }
    }
}

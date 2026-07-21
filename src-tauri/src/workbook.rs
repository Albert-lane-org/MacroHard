// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-07-09 | SEC Whistleblower No. 17684-273-411-436 | This header must be preserved in any copy, fork, or derivative use
// MH-P8-01 / MH-P14-01: Workbook core — 5D cell model and grid engine.
// Cells are (col, row, layer, time, domain); a named Volume is the 5D
// equivalent of a 2D spreadsheet sheet.
// Domain constants: 0=spatial, 1=financial, 2=civic, 3=terrain, 4=custom.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// MH-P14-01: Domain dimension constants
pub const DOMAIN_SPATIAL: u32 = 0;
pub const DOMAIN_FINANCIAL: u32 = 1;
pub const DOMAIN_CIVIC: u32 = 2;
pub const DOMAIN_TERRAIN: u32 = 3;
pub const DOMAIN_CUSTOM: u32 = 4;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct CellAddress {
    pub col: u32,
    pub row: u32,
    pub layer: u32,
    pub time: u32,
    pub domain: u32,
}

impl CellAddress {
    pub fn new(col: u32, row: u32, layer: u32, time: u32, domain: u32) -> Self {
        Self { col, row, layer, time, domain }
    }

    /// Convenience: construct a 3D address with time=0 and domain=DOMAIN_SPATIAL.
    pub fn new_3d(col: u32, row: u32, layer: u32) -> Self {
        Self { col, row, layer, time: 0, domain: DOMAIN_SPATIAL }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
#[serde(tag = "type", content = "value")]
pub enum CellValue {
    #[default]
    Empty,
    Number(f64),
    Text(String),
    Bool(bool),
}

#[derive(Debug, thiserror::Error)]
pub enum WorkbookError {
    #[error("volume '{0}' already exists")]
    VolumeExists(String),
    #[error("volume '{0}' not found")]
    VolumeNotFound(String),
}

/// A Volume is the 5D equivalent of a spreadsheet sheet — a sparse
/// (col, row, layer, time, domain) grid. Only non-empty cells are stored.
#[derive(Debug, Default)]
pub struct Volume {
    cells: HashMap<CellAddress, CellValue>,
}

impl Volume {
    pub fn set(&mut self, addr: CellAddress, value: CellValue) {
        if value == CellValue::Empty {
            self.cells.remove(&addr);
        } else {
            self.cells.insert(addr, value);
        }
    }

    pub fn get(&self, addr: CellAddress) -> CellValue {
        self.cells.get(&addr).cloned().unwrap_or_default()
    }

    pub fn clear(&mut self, addr: CellAddress) {
        self.cells.remove(&addr);
    }

    pub fn len(&self) -> usize {
        self.cells.len()
    }

    pub fn is_empty(&self) -> bool {
        self.cells.is_empty()
    }

    /// Bounding box of all non-empty cells: (min, max) inclusive on every axis.
    pub fn bounds(&self) -> Option<(CellAddress, CellAddress)> {
        if self.cells.is_empty() {
            return None;
        }
        let mut min = CellAddress::new(u32::MAX, u32::MAX, u32::MAX, u32::MAX, u32::MAX);
        let mut max = CellAddress::new(u32::MIN, u32::MIN, u32::MIN, u32::MIN, u32::MIN);
        for addr in self.cells.keys() {
            min.col = min.col.min(addr.col);
            min.row = min.row.min(addr.row);
            min.layer = min.layer.min(addr.layer);
            min.time = min.time.min(addr.time);
            min.domain = min.domain.min(addr.domain);
            max.col = max.col.max(addr.col);
            max.row = max.row.max(addr.row);
            max.layer = max.layer.max(addr.layer);
            max.time = max.time.max(addr.time);
            max.domain = max.domain.max(addr.domain);
        }
        Some((min, max))
    }

    pub fn non_empty(&self) -> Vec<(CellAddress, CellValue)> {
        self.cells.iter().map(|(a, v)| (*a, v.clone())).collect()
    }

    /// Return all cells in the given domain slice.
    pub fn cells_in_domain(&self, domain: u32) -> Vec<(CellAddress, CellValue)> {
        self.cells
            .iter()
            .filter(|(a, _)| a.domain == domain)
            .map(|(a, v)| (*a, v.clone()))
            .collect()
    }

    /// Return all cells at the given time coordinate.
    pub fn cells_at_time(&self, time: u32) -> Vec<(CellAddress, CellValue)> {
        self.cells
            .iter()
            .filter(|(a, _)| a.time == time)
            .map(|(a, v)| (*a, v.clone()))
            .collect()
    }
}

/// A Workbook holds one or more named Volumes. Standalone in-memory grid
/// engine — SQLXML persistence is opt-in via sqlxml_bridge (Phase 7 live
/// wire), not baked into this struct, so the grid engine has no DB dependency.
#[derive(Debug, Default)]
pub struct Workbook {
    volumes: HashMap<String, Volume>,
}

const DEFAULT_VOLUME: &str = "Sheet1";

impl Workbook {
    pub fn new() -> Self {
        let mut wb = Self::default();
        wb.volumes
            .insert(DEFAULT_VOLUME.to_string(), Volume::default());
        wb
    }

    pub fn create_volume(&mut self, name: &str) -> Result<(), WorkbookError> {
        if self.volumes.contains_key(name) {
            return Err(WorkbookError::VolumeExists(name.to_string()));
        }
        self.volumes.insert(name.to_string(), Volume::default());
        Ok(())
    }

    pub fn list_volumes(&self) -> Vec<String> {
        let mut names: Vec<String> = self.volumes.keys().cloned().collect();
        names.sort();
        names
    }

    pub fn set_cell(
        &mut self,
        volume: &str,
        addr: CellAddress,
        value: CellValue,
    ) -> Result<(), WorkbookError> {
        self.volumes
            .get_mut(volume)
            .ok_or_else(|| WorkbookError::VolumeNotFound(volume.to_string()))?
            .set(addr, value);
        Ok(())
    }

    pub fn get_cell(&self, volume: &str, addr: CellAddress) -> Result<CellValue, WorkbookError> {
        Ok(self
            .volumes
            .get(volume)
            .ok_or_else(|| WorkbookError::VolumeNotFound(volume.to_string()))?
            .get(addr))
    }

    pub fn clear_cell(&mut self, volume: &str, addr: CellAddress) -> Result<(), WorkbookError> {
        self.volumes
            .get_mut(volume)
            .ok_or_else(|| WorkbookError::VolumeNotFound(volume.to_string()))?
            .clear(addr);
        Ok(())
    }

    pub fn volume_bounds(
        &self,
        volume: &str,
    ) -> Result<Option<(CellAddress, CellAddress)>, WorkbookError> {
        Ok(self
            .volumes
            .get(volume)
            .ok_or_else(|| WorkbookError::VolumeNotFound(volume.to_string()))?
            .bounds())
    }

    pub fn non_empty_cells(
        &self,
        volume: &str,
    ) -> Result<Vec<(CellAddress, CellValue)>, WorkbookError> {
        Ok(self
            .volumes
            .get(volume)
            .ok_or_else(|| WorkbookError::VolumeNotFound(volume.to_string()))?
            .non_empty())
    }

    pub fn cells_in_domain(
        &self,
        volume: &str,
        domain: u32,
    ) -> Result<Vec<(CellAddress, CellValue)>, WorkbookError> {
        Ok(self
            .volumes
            .get(volume)
            .ok_or_else(|| WorkbookError::VolumeNotFound(volume.to_string()))?
            .cells_in_domain(domain))
    }

    pub fn cells_at_time(
        &self,
        volume: &str,
        time: u32,
    ) -> Result<Vec<(CellAddress, CellValue)>, WorkbookError> {
        Ok(self
            .volumes
            .get(volume)
            .ok_or_else(|| WorkbookError::VolumeNotFound(volume.to_string()))?
            .cells_at_time(time))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── Existing 3D tests updated to new_3d() ──────────────────────────────

    #[test]
    fn new_workbook_has_default_volume() {
        let wb = Workbook::new();
        assert_eq!(wb.list_volumes(), vec![DEFAULT_VOLUME.to_string()]);
    }

    #[test]
    fn set_and_get_cell_roundtrips() {
        let mut wb = Workbook::new();
        let addr = CellAddress::new_3d(2, 3, 0);
        wb.set_cell(DEFAULT_VOLUME, addr, CellValue::Number(42.0))
            .unwrap();
        assert_eq!(
            wb.get_cell(DEFAULT_VOLUME, addr).unwrap(),
            CellValue::Number(42.0)
        );
    }

    #[test]
    fn unset_cell_is_empty() {
        let wb = Workbook::new();
        let addr = CellAddress::new_3d(0, 0, 0);
        assert_eq!(wb.get_cell(DEFAULT_VOLUME, addr).unwrap(), CellValue::Empty);
    }

    #[test]
    fn setting_empty_clears_the_cell() {
        let mut wb = Workbook::new();
        let addr = CellAddress::new_3d(1, 1, 1);
        wb.set_cell(DEFAULT_VOLUME, addr, CellValue::Text("x".into()))
            .unwrap();
        wb.set_cell(DEFAULT_VOLUME, addr, CellValue::Empty).unwrap();
        assert_eq!(wb.non_empty_cells(DEFAULT_VOLUME).unwrap().len(), 0);
    }

    #[test]
    fn create_volume_then_isolated_from_default() {
        let mut wb = Workbook::new();
        wb.create_volume("Terrain").unwrap();
        let addr = CellAddress::new_3d(0, 0, 0);
        wb.set_cell("Terrain", addr, CellValue::Number(1.0))
            .unwrap();
        assert_eq!(wb.get_cell(DEFAULT_VOLUME, addr).unwrap(), CellValue::Empty);
        assert_eq!(
            wb.get_cell("Terrain", addr).unwrap(),
            CellValue::Number(1.0)
        );
    }

    #[test]
    fn duplicate_volume_errors() {
        let mut wb = Workbook::new();
        let err = wb.create_volume(DEFAULT_VOLUME).unwrap_err();
        assert!(matches!(err, WorkbookError::VolumeExists(_)));
    }

    #[test]
    fn missing_volume_errors() {
        let wb = Workbook::new();
        let err = wb
            .get_cell("NoSuchVolume", CellAddress::new_3d(0, 0, 0))
            .unwrap_err();
        assert!(matches!(err, WorkbookError::VolumeNotFound(_)));
    }

    #[test]
    fn bounds_track_the_3d_extent() {
        let mut wb = Workbook::new();
        wb.set_cell(
            DEFAULT_VOLUME,
            CellAddress::new_3d(1, 5, 0),
            CellValue::Number(1.0),
        )
        .unwrap();
        wb.set_cell(
            DEFAULT_VOLUME,
            CellAddress::new_3d(4, 2, 3),
            CellValue::Number(2.0),
        )
        .unwrap();
        let (min, max) = wb.volume_bounds(DEFAULT_VOLUME).unwrap().unwrap();
        assert_eq!(min, CellAddress::new_3d(1, 2, 0));
        assert_eq!(max, CellAddress::new_3d(4, 5, 3));
    }

    #[test]
    fn empty_volume_has_no_bounds() {
        let wb = Workbook::new();
        assert_eq!(wb.volume_bounds(DEFAULT_VOLUME).unwrap(), None);
    }

    // ── MH-P14-01: 5D-specific tests ──────────────────────────────────────

    #[test]
    fn cell_address_5d_constructor_round_trips() {
        let addr = CellAddress::new(3, 7, 2, 5, DOMAIN_FINANCIAL);
        assert_eq!(addr.col, 3);
        assert_eq!(addr.row, 7);
        assert_eq!(addr.layer, 2);
        assert_eq!(addr.time, 5);
        assert_eq!(addr.domain, DOMAIN_FINANCIAL);
    }

    #[test]
    fn new_3d_defaults_time_and_domain() {
        let addr = CellAddress::new_3d(1, 2, 3);
        assert_eq!(addr.time, 0);
        assert_eq!(addr.domain, DOMAIN_SPATIAL);
    }

    #[test]
    fn domain_constants_are_distinct() {
        let constants = [
            DOMAIN_SPATIAL,
            DOMAIN_FINANCIAL,
            DOMAIN_CIVIC,
            DOMAIN_TERRAIN,
            DOMAIN_CUSTOM,
        ];
        let unique: std::collections::HashSet<_> = constants.iter().collect();
        assert_eq!(unique.len(), 5);
    }

    #[test]
    fn cells_in_different_domains_are_independent() {
        let mut wb = Workbook::new();
        let spatial = CellAddress::new(0, 0, 0, 0, DOMAIN_SPATIAL);
        let financial = CellAddress::new(0, 0, 0, 0, DOMAIN_FINANCIAL);
        wb.set_cell(DEFAULT_VOLUME, spatial, CellValue::Number(1.0)).unwrap();
        wb.set_cell(DEFAULT_VOLUME, financial, CellValue::Number(2.0)).unwrap();
        assert_eq!(wb.get_cell(DEFAULT_VOLUME, spatial).unwrap(), CellValue::Number(1.0));
        assert_eq!(wb.get_cell(DEFAULT_VOLUME, financial).unwrap(), CellValue::Number(2.0));
    }

    #[test]
    fn cells_at_different_times_are_independent() {
        let mut wb = Workbook::new();
        let t0 = CellAddress::new(5, 5, 0, 0, DOMAIN_TERRAIN);
        let t1 = CellAddress::new(5, 5, 0, 1, DOMAIN_TERRAIN);
        wb.set_cell(DEFAULT_VOLUME, t0, CellValue::Number(10.0)).unwrap();
        wb.set_cell(DEFAULT_VOLUME, t1, CellValue::Number(20.0)).unwrap();
        assert_eq!(wb.get_cell(DEFAULT_VOLUME, t0).unwrap(), CellValue::Number(10.0));
        assert_eq!(wb.get_cell(DEFAULT_VOLUME, t1).unwrap(), CellValue::Number(20.0));
    }

    #[test]
    fn cells_in_domain_filters_by_domain() {
        let mut wb = Workbook::new();
        wb.set_cell(DEFAULT_VOLUME, CellAddress::new(0, 0, 0, 0, DOMAIN_CIVIC), CellValue::Bool(true)).unwrap();
        wb.set_cell(DEFAULT_VOLUME, CellAddress::new(1, 0, 0, 0, DOMAIN_CIVIC), CellValue::Bool(true)).unwrap();
        wb.set_cell(DEFAULT_VOLUME, CellAddress::new(2, 0, 0, 0, DOMAIN_TERRAIN), CellValue::Bool(true)).unwrap();
        let civic = wb.cells_in_domain(DEFAULT_VOLUME, DOMAIN_CIVIC).unwrap();
        assert_eq!(civic.len(), 2);
        let terrain = wb.cells_in_domain(DEFAULT_VOLUME, DOMAIN_TERRAIN).unwrap();
        assert_eq!(terrain.len(), 1);
    }

    #[test]
    fn cells_at_time_filters_by_time() {
        let mut wb = Workbook::new();
        wb.set_cell(DEFAULT_VOLUME, CellAddress::new(0, 0, 0, 3, DOMAIN_SPATIAL), CellValue::Number(1.0)).unwrap();
        wb.set_cell(DEFAULT_VOLUME, CellAddress::new(1, 0, 0, 3, DOMAIN_SPATIAL), CellValue::Number(2.0)).unwrap();
        wb.set_cell(DEFAULT_VOLUME, CellAddress::new(2, 0, 0, 7, DOMAIN_SPATIAL), CellValue::Number(3.0)).unwrap();
        let at_t3 = wb.cells_at_time(DEFAULT_VOLUME, 3).unwrap();
        assert_eq!(at_t3.len(), 2);
        let at_t7 = wb.cells_at_time(DEFAULT_VOLUME, 7).unwrap();
        assert_eq!(at_t7.len(), 1);
    }

    #[test]
    fn bounds_track_all_5d_axes() {
        let mut wb = Workbook::new();
        wb.set_cell(DEFAULT_VOLUME, CellAddress::new(1, 5, 0, 2, DOMAIN_TERRAIN), CellValue::Number(1.0)).unwrap();
        wb.set_cell(DEFAULT_VOLUME, CellAddress::new(4, 2, 3, 8, DOMAIN_FINANCIAL), CellValue::Number(2.0)).unwrap();
        let (min, max) = wb.volume_bounds(DEFAULT_VOLUME).unwrap().unwrap();
        assert_eq!(min.col, 1);
        assert_eq!(min.row, 2);
        assert_eq!(min.layer, 0);
        assert_eq!(min.time, 2);
        assert_eq!(min.domain, DOMAIN_FINANCIAL);
        assert_eq!(max.col, 4);
        assert_eq!(max.row, 5);
        assert_eq!(max.layer, 3);
        assert_eq!(max.time, 8);
        assert_eq!(max.domain, DOMAIN_TERRAIN);
    }

    #[test]
    fn cross_domain_cell_count_is_correct() {
        let mut wb = Workbook::new();
        for domain in [DOMAIN_SPATIAL, DOMAIN_FINANCIAL, DOMAIN_CIVIC] {
            wb.set_cell(DEFAULT_VOLUME, CellAddress::new(0, 0, 0, 0, domain), CellValue::Number(domain as f64)).unwrap();
        }
        assert_eq!(wb.non_empty_cells(DEFAULT_VOLUME).unwrap().len(), 3);
    }

    #[test]
    fn cells_in_domain_returns_empty_for_unused_domain() {
        let mut wb = Workbook::new();
        wb.set_cell(DEFAULT_VOLUME, CellAddress::new(0, 0, 0, 0, DOMAIN_SPATIAL), CellValue::Number(1.0)).unwrap();
        let civic = wb.cells_in_domain(DEFAULT_VOLUME, DOMAIN_CIVIC).unwrap();
        assert!(civic.is_empty());
    }

    #[test]
    fn cells_at_time_returns_empty_for_unused_time() {
        let mut wb = Workbook::new();
        wb.set_cell(DEFAULT_VOLUME, CellAddress::new(0, 0, 0, 0, DOMAIN_SPATIAL), CellValue::Number(1.0)).unwrap();
        let at_t99 = wb.cells_at_time(DEFAULT_VOLUME, 99).unwrap();
        assert!(at_t99.is_empty());
    }

    #[test]
    fn five_d_address_hashes_correctly_for_distinct_keys() {
        let mut map = std::collections::HashMap::new();
        for t in 0u32..3 {
            for d in 0u32..3 {
                map.insert(CellAddress::new(0, 0, 0, t, d), t * 10 + d);
            }
        }
        assert_eq!(map.len(), 9);
    }
}

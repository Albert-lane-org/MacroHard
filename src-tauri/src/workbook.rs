// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-07-09 | SEC Whistleblower No. 17684-273-411-436 | This header must be preserved in any copy, fork, or derivative use
// MH-P8-01: Workbook core — the 3D cell model and grid engine.
// Standard Excel taken to a third dimension: cells are (col, row, layer);
// a named Volume is what a "sheet" is in a 2D spreadsheet.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct CellAddress {
    pub col: u32,
    pub row: u32,
    pub layer: u32,
}

impl CellAddress {
    pub fn new(col: u32, row: u32, layer: u32) -> Self {
        Self { col, row, layer }
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

/// A Volume is the 3D equivalent of a spreadsheet sheet — a sparse
/// (col, row, layer) grid. Only non-empty cells are stored.
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
        let mut min = CellAddress::new(u32::MAX, u32::MAX, u32::MAX);
        let mut max = CellAddress::new(u32::MIN, u32::MIN, u32::MIN);
        for addr in self.cells.keys() {
            min.col = min.col.min(addr.col);
            min.row = min.row.min(addr.row);
            min.layer = min.layer.min(addr.layer);
            max.col = max.col.max(addr.col);
            max.row = max.row.max(addr.row);
            max.layer = max.layer.max(addr.layer);
        }
        Some((min, max))
    }

    pub fn non_empty(&self) -> Vec<(CellAddress, CellValue)> {
        self.cells.iter().map(|(a, v)| (*a, v.clone())).collect()
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
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_workbook_has_default_volume() {
        let wb = Workbook::new();
        assert_eq!(wb.list_volumes(), vec![DEFAULT_VOLUME.to_string()]);
    }

    #[test]
    fn set_and_get_cell_roundtrips() {
        let mut wb = Workbook::new();
        let addr = CellAddress::new(2, 3, 0);
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
        let addr = CellAddress::new(0, 0, 0);
        assert_eq!(wb.get_cell(DEFAULT_VOLUME, addr).unwrap(), CellValue::Empty);
    }

    #[test]
    fn setting_empty_clears_the_cell() {
        let mut wb = Workbook::new();
        let addr = CellAddress::new(1, 1, 1);
        wb.set_cell(DEFAULT_VOLUME, addr, CellValue::Text("x".into()))
            .unwrap();
        wb.set_cell(DEFAULT_VOLUME, addr, CellValue::Empty).unwrap();
        assert_eq!(wb.non_empty_cells(DEFAULT_VOLUME).unwrap().len(), 0);
    }

    #[test]
    fn create_volume_then_isolated_from_default() {
        let mut wb = Workbook::new();
        wb.create_volume("Terrain").unwrap();
        let addr = CellAddress::new(0, 0, 0);
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
            .get_cell("NoSuchVolume", CellAddress::new(0, 0, 0))
            .unwrap_err();
        assert!(matches!(err, WorkbookError::VolumeNotFound(_)));
    }

    #[test]
    fn bounds_track_the_3d_extent() {
        let mut wb = Workbook::new();
        wb.set_cell(
            DEFAULT_VOLUME,
            CellAddress::new(1, 5, 0),
            CellValue::Number(1.0),
        )
        .unwrap();
        wb.set_cell(
            DEFAULT_VOLUME,
            CellAddress::new(4, 2, 3),
            CellValue::Number(2.0),
        )
        .unwrap();
        let (min, max) = wb.volume_bounds(DEFAULT_VOLUME).unwrap().unwrap();
        assert_eq!(min, CellAddress::new(1, 2, 0));
        assert_eq!(max, CellAddress::new(4, 5, 3));
    }

    #[test]
    fn empty_volume_has_no_bounds() {
        let wb = Workbook::new();
        assert_eq!(wb.volume_bounds(DEFAULT_VOLUME).unwrap(), None);
    }
}

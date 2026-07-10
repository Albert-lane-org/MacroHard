// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-07-09 | SEC Whistleblower No. 17684-273-411-436 | This header must be preserved in any copy, fork, or derivative use
// MH-P9-01: Dashboard layout schema — the persisted, user-editable grid
// placement of module panels. "Every single UI detail user-configurable"
// starts here: panel position, size, visibility, and stacking order are
// all data, not code, so the dashboard composer can rearrange them at
// runtime and persist the result.

use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PanelPlacement {
    /// Unique instance id (a module can be placed more than once).
    pub id: String,
    /// Which module registry entry (config/modules.json `name`) owns this panel.
    pub module: String,
    /// Which of that module's `panels` this instance renders.
    pub panel_type: String,
    pub col: u32,
    pub row: u32,
    pub width: u32,
    pub height: u32,
    pub visible: bool,
    pub z_index: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardLayout {
    pub grid_cols: u32,
    pub panels: Vec<PanelPlacement>,
}

impl Default for DashboardLayout {
    fn default() -> Self {
        Self {
            grid_cols: 12,
            panels: Vec::new(),
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum LayoutError {
    #[error("panel '{0}' not found")]
    PanelNotFound(String),
    #[error("panel id '{0}' already exists")]
    DuplicateId(String),
    #[error("placement out of bounds: col {col} + width {width} exceeds grid_cols {grid_cols}")]
    OutOfBounds {
        col: u32,
        width: u32,
        grid_cols: u32,
    },
    #[error("io error: {0}")]
    Io(String),
    #[error("serde error: {0}")]
    Serde(String),
}

impl DashboardLayout {
    pub fn new(grid_cols: u32) -> Self {
        Self {
            grid_cols,
            panels: Vec::new(),
        }
    }

    fn check_bounds(&self, col: u32, width: u32) -> Result<(), LayoutError> {
        if col + width > self.grid_cols {
            return Err(LayoutError::OutOfBounds {
                col,
                width,
                grid_cols: self.grid_cols,
            });
        }
        Ok(())
    }

    fn find_index(&self, id: &str) -> Result<usize, LayoutError> {
        self.panels
            .iter()
            .position(|p| p.id == id)
            .ok_or_else(|| LayoutError::PanelNotFound(id.to_string()))
    }

    pub fn add_panel(&mut self, panel: PanelPlacement) -> Result<(), LayoutError> {
        if self.panels.iter().any(|p| p.id == panel.id) {
            return Err(LayoutError::DuplicateId(panel.id));
        }
        self.check_bounds(panel.col, panel.width)?;
        self.panels.push(panel);
        Ok(())
    }

    pub fn remove_panel(&mut self, id: &str) -> Result<(), LayoutError> {
        let idx = self.find_index(id)?;
        self.panels.remove(idx);
        Ok(())
    }

    pub fn move_panel(&mut self, id: &str, col: u32, row: u32) -> Result<(), LayoutError> {
        let idx = self.find_index(id)?;
        self.check_bounds(col, self.panels[idx].width)?;
        let p = &mut self.panels[idx];
        p.col = col;
        p.row = row;
        Ok(())
    }

    pub fn resize_panel(&mut self, id: &str, width: u32, height: u32) -> Result<(), LayoutError> {
        let idx = self.find_index(id)?;
        self.check_bounds(self.panels[idx].col, width)?;
        let p = &mut self.panels[idx];
        p.width = width;
        p.height = height;
        Ok(())
    }

    pub fn set_visibility(&mut self, id: &str, visible: bool) -> Result<(), LayoutError> {
        let idx = self.find_index(id)?;
        self.panels[idx].visible = visible;
        Ok(())
    }

    /// Raise a panel above all others (highest z_index + 1).
    pub fn bring_to_front(&mut self, id: &str) -> Result<(), LayoutError> {
        let top = self.panels.iter().map(|p| p.z_index).max().unwrap_or(0);
        let idx = self.find_index(id)?;
        self.panels[idx].z_index = top + 1;
        Ok(())
    }

    pub fn save_to_path(&self, path: &Path) -> Result<(), LayoutError> {
        let json =
            serde_json::to_string_pretty(self).map_err(|e| LayoutError::Serde(e.to_string()))?;
        std::fs::write(path, json).map_err(|e| LayoutError::Io(e.to_string()))
    }

    pub fn load_from_path(path: &Path) -> Result<Self, LayoutError> {
        let raw = std::fs::read_to_string(path).map_err(|e| LayoutError::Io(e.to_string()))?;
        serde_json::from_str(&raw).map_err(|e| LayoutError::Serde(e.to_string()))
    }

    /// Load from path if it exists, otherwise return the default layout —
    /// first-run behavior, not an error.
    pub fn load_or_default(path: &Path, grid_cols: u32) -> Self {
        if path.exists() {
            Self::load_from_path(path).unwrap_or_else(|_| Self::new(grid_cols))
        } else {
            Self::new(grid_cols)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn panel(id: &str, col: u32, row: u32, width: u32, height: u32) -> PanelPlacement {
        PanelPlacement {
            id: id.to_string(),
            module: "procurement".to_string(),
            panel_type: "permit_pipeline_board".to_string(),
            col,
            row,
            width,
            height,
            visible: true,
            z_index: 0,
        }
    }

    #[test]
    fn add_panel_within_bounds_succeeds() {
        let mut layout = DashboardLayout::new(12);
        assert!(layout.add_panel(panel("p1", 0, 0, 6, 4)).is_ok());
        assert_eq!(layout.panels.len(), 1);
    }

    #[test]
    fn add_panel_out_of_bounds_fails() {
        let mut layout = DashboardLayout::new(12);
        let err = layout.add_panel(panel("p1", 8, 0, 6, 4)).unwrap_err();
        assert!(matches!(err, LayoutError::OutOfBounds { .. }));
    }

    #[test]
    fn add_duplicate_id_fails() {
        let mut layout = DashboardLayout::new(12);
        layout.add_panel(panel("p1", 0, 0, 4, 4)).unwrap();
        let err = layout.add_panel(panel("p1", 4, 0, 4, 4)).unwrap_err();
        assert!(matches!(err, LayoutError::DuplicateId(_)));
    }

    #[test]
    fn remove_panel_works() {
        let mut layout = DashboardLayout::new(12);
        layout.add_panel(panel("p1", 0, 0, 4, 4)).unwrap();
        layout.remove_panel("p1").unwrap();
        assert!(layout.panels.is_empty());
    }

    #[test]
    fn remove_missing_panel_fails() {
        let mut layout = DashboardLayout::new(12);
        let err = layout.remove_panel("nope").unwrap_err();
        assert!(matches!(err, LayoutError::PanelNotFound(_)));
    }

    #[test]
    fn move_panel_updates_position() {
        let mut layout = DashboardLayout::new(12);
        layout.add_panel(panel("p1", 0, 0, 4, 4)).unwrap();
        layout.move_panel("p1", 4, 2).unwrap();
        assert_eq!(layout.panels[0].col, 4);
        assert_eq!(layout.panels[0].row, 2);
    }

    #[test]
    fn move_panel_out_of_bounds_fails() {
        let mut layout = DashboardLayout::new(12);
        layout.add_panel(panel("p1", 0, 0, 4, 4)).unwrap();
        let err = layout.move_panel("p1", 10, 0).unwrap_err();
        assert!(matches!(err, LayoutError::OutOfBounds { .. }));
    }

    #[test]
    fn resize_panel_updates_dimensions() {
        let mut layout = DashboardLayout::new(12);
        layout.add_panel(panel("p1", 0, 0, 4, 4)).unwrap();
        layout.resize_panel("p1", 8, 6).unwrap();
        assert_eq!(layout.panels[0].width, 8);
        assert_eq!(layout.panels[0].height, 6);
    }

    #[test]
    fn resize_panel_out_of_bounds_fails() {
        let mut layout = DashboardLayout::new(12);
        layout.add_panel(panel("p1", 8, 0, 4, 4)).unwrap();
        let err = layout.resize_panel("p1", 8, 4).unwrap_err();
        assert!(matches!(err, LayoutError::OutOfBounds { .. }));
    }

    #[test]
    fn set_visibility_toggles() {
        let mut layout = DashboardLayout::new(12);
        layout.add_panel(panel("p1", 0, 0, 4, 4)).unwrap();
        layout.set_visibility("p1", false).unwrap();
        assert!(!layout.panels[0].visible);
    }

    #[test]
    fn bring_to_front_raises_z_index_above_others() {
        let mut layout = DashboardLayout::new(12);
        let mut p1 = panel("p1", 0, 0, 4, 4);
        p1.z_index = 3;
        layout.add_panel(p1).unwrap();
        let mut p2 = panel("p2", 4, 0, 4, 4);
        p2.z_index = 1;
        layout.add_panel(p2).unwrap();

        layout.bring_to_front("p2").unwrap();
        let p2_z = layout.panels.iter().find(|p| p.id == "p2").unwrap().z_index;
        assert!(p2_z > 3);
    }

    #[test]
    fn save_and_load_roundtrip() {
        let mut layout = DashboardLayout::new(12);
        layout.add_panel(panel("p1", 0, 0, 6, 4)).unwrap();
        let tmp = std::env::temp_dir().join(format!("mh-layout-test-{}.json", std::process::id()));
        layout.save_to_path(&tmp).unwrap();
        let loaded = DashboardLayout::load_from_path(&tmp).unwrap();
        std::fs::remove_file(&tmp).ok();
        assert_eq!(loaded.grid_cols, 12);
        assert_eq!(loaded.panels.len(), 1);
        assert_eq!(loaded.panels[0].id, "p1");
    }

    #[test]
    fn load_or_default_returns_default_when_missing() {
        let tmp =
            std::env::temp_dir().join(format!("mh-layout-missing-{}.json", std::process::id()));
        std::fs::remove_file(&tmp).ok();
        let layout = DashboardLayout::load_or_default(&tmp, 12);
        assert_eq!(layout.grid_cols, 12);
        assert!(layout.panels.is_empty());
    }

    #[test]
    fn default_grid_is_twelve_columns() {
        assert_eq!(DashboardLayout::default().grid_cols, 12);
    }
}

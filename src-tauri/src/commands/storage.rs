use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

fn base_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取应用数据目录: {e}"))?;
    if !base.exists() {
        fs::create_dir_all(&base).map_err(|e| e.to_string())?;
    }
    Ok(base)
}

fn resolve_path(app: &AppHandle, relative: &str) -> Result<PathBuf, String> {
    let base = base_dir(app)?;
    let safe_relative = relative.replace('\\', "/");
    let trimmed = safe_relative.trim_start_matches('/');
    let candidate = base.join(trimmed);

    let base_canon = base.canonicalize().map_err(|_| "目录不可用".to_string())?;
    let parent = candidate
        .parent()
        .unwrap_or(Path::new(&base));
    let parent_canon = parent
        .canonicalize()
        .unwrap_or_else(|_| base_canon.clone());

    if !parent_canon.starts_with(&base_canon) {
        return Err("路径不安全".to_string());
    }

    Ok(candidate)
}

#[tauri::command]
pub fn write_local_file(
    app: AppHandle,
    path: String,
    content: String,
) -> Result<(), String> {
    let target = resolve_path(&app, &path)?;
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(target, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_local_file(app: AppHandle, path: String) -> Result<String, String> {
    let target = resolve_path(&app, &path)?;
    fs::read_to_string(target).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_local_files(app: AppHandle) -> Result<Vec<String>, String> {
    let base = base_dir(&app)?;
    let mut entries = vec![];
    if base.exists() {
        for entry in fs::read_dir(base).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            if let Some(name) = entry.file_name().to_str() {
                entries.push(name.to_string());
            }
        }
    }
    Ok(entries)
}

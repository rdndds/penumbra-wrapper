/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2025 Shomy
*/

use crate::error::AppError;
use crate::models::scatter::{ScatterFile, ScatterPartition};
use quick_xml::Reader;
use quick_xml::events::Event;
use serde_yaml::Value;
use std::fs;

pub struct ScatterParser;

impl ScatterParser {
    /// Parse scatter file - auto-detects format (XML or TXT/YAML)
    pub fn parse(file_path: &str) -> Result<ScatterFile, AppError> {
        let content = fs::read_to_string(file_path)
            .map_err(|e| AppError::io(format!("Failed to read scatter file: {}", e)))?;

        // Auto-detect format
        let trimmed = content.trim();
        if trimmed.starts_with('<') || trimmed.starts_with("<?xml") {
            Self::parse_xml(&content, file_path)
        } else {
            Self::parse_txt(&content, file_path)
        }
    }

    /// Parse XML format scatter file
    fn parse_xml(content: &str, file_path: &str) -> Result<ScatterFile, AppError> {
        let mut reader = Reader::from_str(content);
        reader.config_mut().trim_text(true);

        // First pass: detect if UFS storage_type exists
        let has_ufs = content.contains("<storage_type name=\"UFS\">");
        let target_storage = if has_ufs { "UFS" } else { "EMMC" };

        let mut platform = String::new();
        let mut project = String::new();
        let mut storage_type = String::new();
        let mut partitions = Vec::new();

        let mut current_partition: Option<ScatterPartition> = None;
        let mut current_tag = String::new();
        let mut in_partition = false;
        let mut in_general = false;
        let mut in_target_section = false;
        let mut current_storage_type = String::new();
        let mut has_storage_type_sections = false;

        let mut buf = Vec::new();

        loop {
            match reader.read_event_into(&mut buf) {
                Ok(Event::Start(ref e)) => {
                    let tag_name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                    current_tag = tag_name.clone();

                    if tag_name == "general" {
                        in_general = true;
                    } else if tag_name == "storage_type" {
                        // Mark that we've encountered storage_type sections (new format)
                        has_storage_type_sections = true;

                        // Get storage type from name attribute
                        let st = e
                            .attributes()
                            .filter_map(|a| a.ok())
                            .find(|attr| attr.key.as_ref() == b"name")
                            .and_then(|attr| String::from_utf8(attr.value.to_vec()).ok())
                            .unwrap_or_default();

                        current_storage_type = st.clone();

                        // Only process partitions if this is our target storage type
                        if st == target_storage {
                            storage_type = st;
                            in_target_section = true;
                        }
                    } else if tag_name == "partition_index"
                        && (in_target_section || !has_storage_type_sections)
                    {
                        // Parse partitions if in target section OR if no storage_type sections exist (old format)
                        in_partition = true;
                        // Get partition index from name attribute
                        let index = e
                            .attributes()
                            .filter_map(|a| a.ok())
                            .find(|attr| attr.key.as_ref() == b"name")
                            .and_then(|attr| String::from_utf8(attr.value.to_vec()).ok())
                            .unwrap_or_default();

                        current_partition = Some(ScatterPartition {
                            index,
                            partition_name: String::new(),
                            file_name: None,
                            is_download: false,
                            partition_type: String::new(),
                            linear_start_addr: String::new(),
                            physical_start_addr: String::new(),
                            partition_size: String::new(),
                            region: String::new(),
                            storage: String::new(),
                            operation_type: String::new(),
                        });
                    }
                }
                Ok(Event::Text(ref e)) => {
                    let text = e.unescape().unwrap_or_default().to_string();
                    if text.trim().is_empty() {
                        continue;
                    }

                    if in_general {
                        match current_tag.as_str() {
                            "platform" => platform = text,
                            "project" => project = text,
                            "storage" => {
                                // Old format: storage directly in general section
                                storage_type = text;
                            }
                            _ => {}
                        }
                    } else if in_partition {
                        if let Some(ref mut part) = current_partition {
                            match current_tag.as_str() {
                                "partition_name" => part.partition_name = text,
                                "file_name" => {
                                    part.file_name = if text == "NONE" { None } else { Some(text) };
                                }
                                "is_download" => {
                                    part.is_download = text.trim().to_lowercase() == "true"
                                }
                                "type" => part.partition_type = text,
                                "linear_start_addr" => part.linear_start_addr = text,
                                "physical_start_addr" => part.physical_start_addr = text,
                                "partition_size" => part.partition_size = text,
                                "region" => part.region = text,
                                "storage" => part.storage = text,
                                "operation_type" => part.operation_type = text,
                                _ => {}
                            }
                        }
                    }
                }
                Ok(Event::End(ref e)) => {
                    let tag_name = String::from_utf8_lossy(e.name().as_ref()).to_string();

                    if tag_name == "general" {
                        in_general = false;
                    } else if tag_name == "storage_type" {
                        // Exiting storage_type section
                        if current_storage_type == target_storage {
                            // We've finished parsing the target section, stop collecting partitions
                            in_target_section = false;
                        }
                        current_storage_type.clear();
                    } else if tag_name == "partition_index" {
                        in_partition = false;
                        if let Some(part) = current_partition.take() {
                            partitions.push(part);
                        }
                    }
                }
                Ok(Event::Eof) => break,
                Err(e) => {
                    return Err(AppError::Parse(format!("XML parse error: {}", e)));
                }
                _ => {}
            }

            buf.clear();
        }

        Ok(ScatterFile {
            platform,
            project,
            storage_type,
            partitions,
            file_path: file_path.to_string(),
        })
    }

    /// Parse TXT/YAML format scatter file
    fn parse_txt(content: &str, file_path: &str) -> Result<ScatterFile, AppError> {
        use serde::Deserialize;

        // Try parsing as a single YAML array (newer format: - general: ... - storage_type: ... - partition_index: ...)
        let docs: Vec<Value> =
            if let Ok(Value::Sequence(seq)) = serde_yaml::from_str::<Value>(content) {
                // Single array format
                seq
            } else {
                // Fallback to multi-document format (older format, backward compatibility)
                serde_yaml::Deserializer::from_str(content)
                    .filter_map(|doc| Value::deserialize(doc).ok())
                    .collect()
            };

        if docs.is_empty() {
            return Err(AppError::Parse("Empty YAML file".to_string()));
        }

        // First pass: detect if UFS storage_type exists
        let has_ufs = docs.iter().any(|doc| {
            if let Value::Mapping(map) = doc {
                if let Some(Value::String(st)) = map.get("storage_type") {
                    return st == "UFS";
                }
            }
            false
        });

        let target_storage = if has_ufs { "UFS" } else { "EMMC" };

        Self::process_yaml_docs(docs, file_path, target_storage)
    }

    /// Process YAML documents from either format
    fn process_yaml_docs(
        docs: Vec<Value>,
        file_path: &str,
        target_storage: &str,
    ) -> Result<ScatterFile, AppError> {
        let mut platform = String::new();
        let mut project = String::new();
        let mut storage_type = String::new();
        let mut partitions = Vec::new();
        let mut in_target_section = false;

        for doc in docs {
            if let Value::Mapping(map) = doc {
                // Check for general section
                if let Some(Value::String(general)) = map.get("general") {
                    if general == "MTK_PLATFORM_CFG" {
                        if let Some(Value::Sequence(info)) = map.get("info") {
                            for item in info {
                                if let Value::Mapping(info_map) = item {
                                    if let Some(Value::String(cfg_ver)) =
                                        info_map.get("config_version")
                                    {
                                        if !cfg_ver.is_empty() {
                                            if let Some(Value::String(plat)) =
                                                info_map.get("platform")
                                            {
                                                platform = plat.clone();
                                            }
                                            if let Some(Value::String(proj)) =
                                                info_map.get("project")
                                            {
                                                project = proj.clone();
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Check for storage_type section - this starts a new storage layout section
                if let Some(Value::String(st)) = map.get("storage_type") {
                    // Check if this is our target storage type
                    if st == target_storage {
                        storage_type = st.clone();
                        in_target_section = true;

                        // Parse partitions nested inside this storage_type section
                        // The structure is: storage_type → description → [general, partition_index, partition_index...]
                        if let Some(Value::Sequence(description)) = map.get("description") {
                            for item in description {
                                if let Value::Mapping(item_map) = item {
                                    // Check if this is a partition_index entry
                                    if let Some(Value::String(index)) =
                                        item_map.get("partition_index")
                                    {
                                        let partition = ScatterPartition {
                                            index: index.clone(),
                                            partition_name: Self::get_string(
                                                &item_map,
                                                "partition_name",
                                            )
                                            .unwrap_or_default(),
                                            file_name: Self::get_optional_string(
                                                &item_map,
                                                "file_name",
                                            ),
                                            is_download: Self::get_bool(&item_map, "is_download")
                                                .unwrap_or(false),
                                            partition_type: Self::get_string(&item_map, "type")
                                                .unwrap_or_default(),
                                            linear_start_addr: Self::get_string(
                                                &item_map,
                                                "linear_start_addr",
                                            )
                                            .unwrap_or_default(),
                                            physical_start_addr: Self::get_string(
                                                &item_map,
                                                "physical_start_addr",
                                            )
                                            .unwrap_or_default(),
                                            partition_size: Self::get_string(
                                                &item_map,
                                                "partition_size",
                                            )
                                            .unwrap_or_default(),
                                            region: Self::get_string(&item_map, "region")
                                                .unwrap_or_default(),
                                            storage: Self::get_string(&item_map, "storage")
                                                .unwrap_or_default(),
                                            operation_type: Self::get_string(
                                                &item_map,
                                                "operation_type",
                                            )
                                            .unwrap_or_default(),
                                        };

                                        partitions.push(partition);
                                    }
                                }
                            }
                        }
                    } else if in_target_section {
                        // We've moved to a different storage_type section, stop collecting
                        break;
                    }
                }
            }
        }

        Ok(ScatterFile {
            platform,
            project,
            storage_type,
            partitions,
            file_path: file_path.to_string(),
        })
    }

    // Helper functions for YAML parsing
    fn get_string(map: &serde_yaml::Mapping, key: &str) -> Option<String> {
        map.get(key).and_then(|v| match v {
            Value::String(s) => Some(s.clone()),
            Value::Number(n) => Some(format!("{:#x}", n.as_u64().unwrap_or(0))),
            _ => None,
        })
    }

    fn get_optional_string(map: &serde_yaml::Mapping, key: &str) -> Option<String> {
        Self::get_string(map, key).and_then(|s| if s == "NONE" { None } else { Some(s) })
    }

    fn get_bool(map: &serde_yaml::Mapping, key: &str) -> Option<bool> {
        map.get(key).and_then(|v| v.as_bool())
    }
}

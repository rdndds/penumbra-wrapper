export interface Partition {
  name: string;
  start: string;
  size: string; // Hex value (e.g., "0x80000")
  display_size?: string; // Human readable (e.g., "512 KiB")
}

export interface PartitionListResult {
  partitions: Partition[];
  operation_id: string;
}

export interface FlashProgress {
  current: number;
  total: number;
  percentage: number;
  partition_name: string;
  operation: 'read' | 'write';
}

export interface LogEvent {
  id?: string;
  timestamp: string;
  level: 'info' | 'success' | 'error' | 'warning';
  message: string;
  partition_name?: string;
}

export interface AppSettings {
  da_path?: string;
  preloader_path?: string;
  default_output_path?: string;
  auto_check_updates: boolean;
  antumbra_version?: string;
}

export interface AntumbraUpdateInfo {
  installed_version: string | null;
  installed_path: string | null;
  latest_version: string | null;
  update_available: boolean;
  supported: boolean;
  asset_name: string | null;
  asset_url: string | null;
  checksum: string | null;
  message: string | null;
}

export interface AntumbraCommandInfo {
  command: string;
  args: string[];
  working_dir: string;
  started_at: string;
}

export interface AntumbraUpdateResult {
  version: string;
  path: string;
}

export interface DownloadProgress {
  bytes_downloaded: number;
  total_bytes: number;
  percentage: number;
  status: string;
  attempt: number;
  max_attempts: number;
  message: string;
}

export type OperationType = 'read' | 'write' | null;

// Windows diagnostics types
export interface WindowsDiagnostics {
  os_info: string;
  binary_location: string | null;
  binary_version: string | null;
  config_location: string;
  config_exists: boolean;
  config_contents: string | null;
  disk_space_gb: number | null;
  running_antumbra_processes: string[];
  permissions_ok: boolean;
  network_connectivity: boolean;
  recommendations: string[];
}

// Scatter file types
export interface ScatterPartition {
  index: string;                    // "SYS0"
  partition_name: string;           // "preloader"
  file_name: string | null;         // "preloader.bin" or null
  is_download: boolean;             // true/false
  partition_type: string;           // "SV5_BL_BIN", "NORMAL_ROM", "EXT4_IMG"
  linear_start_addr: string;        // "0x0"
  physical_start_addr: string;      // "0x0"
  partition_size: string;           // "0x80000"
  region: string;                   // "EMMC_BOOT1", "EMMC_USER", "UFS_LU2"
  storage: string;                  // "HW_STORAGE_EMMC", "HW_STORAGE_UFS"
  operation_type: string;           // "UPDATE", "BOOTLOADERS", "INVISIBLE"
}

export interface ScatterFile {
  platform: string;                 // "MT6781"
  project: string;                  // "x670_h814"
  storage_type: string;             // "EMMC" or "UFS"
  partitions: ScatterPartition[];
  file_path: string;
}

// Re-export error types
export * from './errors';

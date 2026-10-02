export type EquipmentStatus =
  | "in_stock"
  | "issued"
  | "lost"
  | "in_repair"
  | "defective"
  | "transferred";

export interface EquipmentType {
  id: string;
  name: string;
  created_at: string;
}

export interface EquipmentModel {
  id: string;
  type_id: string;
  name: string;
  created_at: string;
}

export interface StorageLocation {
  id: string;
  name: string;
  created_at: string;
}

export interface EquipmentItem {
  id: string;
  model_id: string;
  serial_number: string;
  status: EquipmentStatus;
  storage_location_id: string | null;
  created_at: string;
}

export interface Employee {
  id: string;
  badge_code: string;
  created_at: string;
}

export interface Issuance {
  id: string;
  equipment_item_id: string;
  employee_id: string;
  issued_at: string;
  returned_at: string | null;
  status: "active" | "returned";
}

export interface Defect {
  id: string;
  issuance_id: string | null;
  equipment_item_id: string;
  reported_employee_code: string | null;
  note: string | null;
  explanation_file_url: string | null;
  created_at: string;
}

export interface Inventory {
  id: string;
  type_id: string;
  started_at: string;
  completed_at: string | null;
  status: "in_progress" | "completed";
}

export interface InventoryItem {
  id: string;
  inventory_id: string;
  equipment_item_id: string;
  scanned: boolean;
  scanned_at: string | null;
}

export interface Repair {
  id: string;
  created_at: string;
  transfer_code: string | null;
  lo_name: string;
  photo_url: string | null;
}

export interface RepairItem {
  id: string;
  repair_id: string;
  equipment_item_id: string;
}

export interface Transfer {
  id: string;
  created_at: string;
  transfer_code: string | null;
  lo_name: string;
}

export interface TransferItem {
  id: string;
  transfer_id: string;
  equipment_item_id: string;
}

import type { EquipmentStatus } from "../types/database";

export const STATUS_LABEL: Record<EquipmentStatus, string> = {
  in_stock: "На складе",
  issued: "Выдано",
  lost: "Утеряно",
  in_repair: "В ремонте",
  defective: "Дефект",
  transferred: "На другом ЛО",
  in_transit: "В пути на другое ЛО",
};

export const STATUS_BADGE_VARIANT: Record<
  EquipmentStatus,
  "default" | "primary" | "success" | "warning" | "destructive"
> = {
  in_stock: "success",
  issued: "primary",
  lost: "destructive",
  in_repair: "warning",
  defective: "destructive",
  transferred: "warning",
  in_transit: "warning",
};

export const HUB_LOCATION_NAME = "ХАБ";

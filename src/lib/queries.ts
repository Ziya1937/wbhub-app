import { supabase } from "./supabase";
import type { Employee, EquipmentItem, EquipmentStatus } from "../types/database";
import { HUB_LOCATION_NAME } from "./status";
import { getBaseId } from "./baseContext";

export interface EquipmentItemRow extends EquipmentItem {
  equipment_models: {
    name: string;
    equipment_types: { id: string; name: string } | null;
  } | null;
  storage_locations: { id: string; name: string } | null;
}

export async function createBase(id: string, name: string, code: string) {
  const { error } = await supabase.rpc("create_base", { p_id: id, p_name: name, p_code: code });
  if (error) {
    if (error.code === "23505") throw new Error("Такой ID базы уже занят");
    throw new Error(error.message);
  }
}

export async function verifyBase(id: string, code: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("verify_base", { p_id: id, p_code: code });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function fetchBaseName(id: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("base_name", { p_id: id });
  if (error) throw new Error(error.message);
  return (data as string | null) ?? null;
}

export interface AggregateRow {
  base_id: string;
  base_name: string;
  type_name: string;
  total: number;
}

export async function fetchAggregateCounts(): Promise<AggregateRow[]> {
  const { data, error } = await supabase.rpc("aggregate_counts");
  if (error) throw new Error(error.message);
  return (data ?? []) as AggregateRow[];
}

let hubLocationIdCache: string | null = null;

export async function fetchHubLocationId(): Promise<string> {
  if (hubLocationIdCache) return hubLocationIdCache;
  const { data, error } = await supabase
    .from("storage_locations")
    .select("id")
    .eq("name", HUB_LOCATION_NAME)
    .single();
  if (error) throw error;
  hubLocationIdCache = data.id as string;
  return hubLocationIdCache;
}

export async function fetchStorageLocations() {
  const { data, error } = await supabase.from("storage_locations").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function updateEquipmentLocation(id: string, storageLocationId: string) {
  const { error } = await supabase
    .from("equipment_items")
    .update({ storage_location_id: storageLocationId })
    .eq("id", id);
  if (error) throw error;
}

export async function fetchEquipmentTypes() {
  const { data, error } = await supabase
    .from("equipment_types")
    .select("*")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchEquipmentModels(typeId?: string) {
  let query = supabase.from("equipment_models").select("*").order("name");
  if (typeId) query = query.eq("type_id", typeId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createEquipmentType(name: string) {
  const { data, error } = await supabase
    .from("equipment_types")
    .insert({ name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createEquipmentModel(typeId: string, name: string) {
  const { data, error } = await supabase
    .from("equipment_models")
    .insert({ type_id: typeId, name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEquipmentModel(id: string) {
  const { error } = await supabase.from("equipment_models").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchEquipmentItems(filters?: {
  typeId?: string;
  modelId?: string;
  serial?: string;
  statuses?: EquipmentStatus[];
}) {
  let query = supabase
    .from("equipment_items")
    .select("*, equipment_models(name, equipment_types(id, name)), storage_locations(id, name)")
    .eq("base_id", getBaseId())
    .order("created_at", { ascending: false });

  if (filters?.modelId) query = query.eq("model_id", filters.modelId);
  if (filters?.serial) query = query.ilike("serial_number", `%${filters.serial}%`);
  if (filters?.statuses?.length) query = query.in("status", filters.statuses);

  const { data, error } = await query;
  if (error) throw error;
  let rows = (data ?? []) as unknown as EquipmentItemRow[];
  if (filters?.typeId) {
    rows = rows.filter((r) => r.equipment_models?.equipment_types?.id === filters.typeId);
  }
  return rows;
}

export async function findEquipmentItemBySerial(serial: string) {
  const { data, error } = await supabase
    .from("equipment_items")
    .select("*, equipment_models(name, equipment_types(id, name)), storage_locations(id, name)")
    .eq("serial_number", serial)
    .eq("base_id", getBaseId())
    .maybeSingle();
  if (error) throw error;
  return data as unknown as EquipmentItemRow | null;
}

export async function fetchEquipmentItemBySerialStrict(serial: string) {
  const item = await findEquipmentItemBySerial(serial);
  if (!item) throw new Error(`С/Н ${serial} не найдено в инвентаре`);
  return item;
}

export async function createEquipmentItem(modelId: string, serial: string, storageLocationId: string) {
  const { data, error } = await supabase
    .from("equipment_items")
    .insert({ model_id: modelId, serial_number: serial, storage_location_id: storageLocationId, base_id: getBaseId() })
    .select()
    .single();
  if (error) throw error;
  return data as EquipmentItem;
}

export async function updateEquipmentStatus(id: string, status: EquipmentStatus) {
  const { error } = await supabase.from("equipment_items").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteEquipmentItem(id: string) {
  const { error } = await supabase.from("equipment_items").delete().eq("id", id);
  if (error) throw error;
}

export async function findEmployeeByBadge(badgeCode: string) {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("badge_code", badgeCode)
    .eq("base_id", getBaseId())
    .maybeSingle();
  if (error) throw error;
  return data as Employee | null;
}

/** Бейдж не обязан существовать заранее — персональные данные не храним, только сам код бейджа. */
export async function findOrCreateEmployeeByBadge(badgeCode: string) {
  const existing = await findEmployeeByBadge(badgeCode);
  if (existing) return existing;
  const { data, error } = await supabase
    .from("employees")
    .insert({ badge_code: badgeCode, base_id: getBaseId() })
    .select()
    .single();
  if (error) throw error;
  return data as Employee;
}

export async function createIssuance(equipmentItemId: string, employeeId: string) {
  const [issuanceRes, itemRes] = await Promise.all([
    supabase
      .from("issuances")
      .insert({ equipment_item_id: equipmentItemId, employee_id: employeeId, base_id: getBaseId() }),
    supabase.from("equipment_items").update({ status: "issued" }).eq("id", equipmentItemId),
  ]);
  if (issuanceRes.error) throw issuanceRes.error;
  if (itemRes.error) throw itemRes.error;
}

export async function returnIssuance(issuanceId: string, equipmentItemId: string, isDefective: boolean) {
  const [issuanceRes, itemRes] = await Promise.all([
    supabase
      .from("issuances")
      .update({ returned_at: new Date().toISOString(), status: "returned" })
      .eq("id", issuanceId),
    supabase
      .from("equipment_items")
      .update({ status: isDefective ? "defective" : "in_stock" })
      .eq("id", equipmentItemId),
  ]);
  if (issuanceRes.error) throw issuanceRes.error;
  if (itemRes.error) throw itemRes.error;
}

export async function createDefect(params: {
  issuanceId: string;
  equipmentItemId: string;
  reportedEmployeeCode?: string | null;
  note?: string;
}) {
  const { data, error } = await supabase
    .from("defects")
    .insert({
      issuance_id: params.issuanceId,
      equipment_item_id: params.equipmentItemId,
      reported_employee_code: params.reportedEmployeeCode ?? null,
      note: params.note ?? null,
      base_id: getBaseId(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function findActiveIssuance(equipmentItemId: string) {
  const { data, error } = await supabase
    .from("issuances")
    .select("*")
    .eq("equipment_item_id", equipmentItemId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchLatestDefect(equipmentItemId: string) {
  const { data, error } = await supabase
    .from("defects")
    .select("*")
    .eq("equipment_item_id", equipmentItemId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function attachDefectExplanation(defectId: string, fileUrl: string) {
  const { error } = await supabase
    .from("defects")
    .update({ explanation_file_url: fileUrl })
    .eq("id", defectId);
  if (error) throw error;
}

export function uploadEquipmentFile(path: string, file: File) {
  return supabase.storage.from("equipment-files").upload(path, file, { upsert: true });
}

export function getEquipmentFileUrl(path: string) {
  return supabase.storage.from("equipment-files").getPublicUrl(path).data.publicUrl;
}

export interface InventoryRow {
  id: string;
  type_id: string;
  started_at: string;
  completed_at: string | null;
  status: "in_progress" | "completed";
  equipment_types: { name: string } | null;
}

export async function fetchInventories(): Promise<InventoryRow[]> {
  const { data, error } = await supabase
    .from("inventories")
    .select("*, equipment_types(name)")
    .eq("base_id", getBaseId())
    .order("started_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as InventoryRow[];
}

export interface InventoryItemRow {
  id: string;
  inventory_id: string;
  equipment_item_id: string;
  scanned: boolean;
  scanned_at: string | null;
  equipment_items: { serial_number: string; equipment_models: { name: string } | null } | null;
}

export async function startInventory(typeId: string) {
  const { data: inventory, error: invError } = await supabase
    .from("inventories")
    .insert({ type_id: typeId, base_id: getBaseId() })
    .select()
    .single();
  if (invError) throw invError;

  const candidates = await fetchEquipmentItems({
    typeId,
    statuses: ["in_stock", "defective", "lost"],
  });

  if (candidates.length > 0) {
    const { error: itemsError } = await supabase.from("inventory_items").insert(
      candidates.map((c) => ({ inventory_id: inventory.id, equipment_item_id: c.id }))
    );
    if (itemsError) throw itemsError;
  }

  return inventory.id as string;
}

export async function fetchInventory(id: string) {
  const { data, error } = await supabase
    .from("inventories")
    .select("*, equipment_types(name)")
    .eq("id", id)
    .eq("base_id", getBaseId())
    .single();
  if (error) throw error;
  return data as unknown as InventoryRow;
}

export async function fetchInventoryItems(inventoryId: string): Promise<InventoryItemRow[]> {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*, equipment_items(serial_number, equipment_models(name))")
    .eq("inventory_id", inventoryId);
  if (error) throw error;
  return (data ?? []) as unknown as InventoryItemRow[];
}

export async function scanInventoryItem(inventoryId: string, serial: string) {
  const item = await findEquipmentItemBySerial(serial);
  if (!item) throw new Error(`С/Н ${serial} не найдено в инвентаре`);
  const { data, error } = await supabase
    .from("inventory_items")
    .update({ scanned: true, scanned_at: new Date().toISOString() })
    .eq("inventory_id", inventoryId)
    .eq("equipment_item_id", item.id)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`С/Н ${serial} не входит в этот инвент`);
  // Нашлось на более позднем инвенте — больше не "утеряно".
  if (item.status === "lost") {
    await updateEquipmentStatus(item.id, "in_stock");
  }
  return { ...data, serial_number: item.serial_number };
}

export async function deleteInventory(inventoryId: string) {
  const { error } = await supabase.from("inventories").delete().eq("id", inventoryId);
  if (error) throw error;
}

export async function completeInventory(inventoryId: string) {
  const items = await fetchInventoryItems(inventoryId);
  const unscanned = items.filter((i) => !i.scanned);
  const invUpdate = supabase
    .from("inventories")
    .update({ completed_at: new Date().toISOString(), status: "completed" })
    .eq("id", inventoryId);
  const statusUpdates = Promise.all(unscanned.map((i) => updateEquipmentStatus(i.equipment_item_id, "lost")));
  const [invRes] = await Promise.all([invUpdate, statusUpdates]);
  if (invRes.error) throw invRes.error;
  return unscanned.length;
}

export async function returnFromExternal(equipmentItemId: string) {
  const hubId = await fetchHubLocationId();
  const { error } = await supabase
    .from("equipment_items")
    .update({ status: "in_stock", storage_location_id: hubId })
    .eq("id", equipmentItemId);
  if (error) throw error;
}

export interface IssuedAtHubRow {
  issuanceId: string;
  issuedAt: string;
  serial: string;
  modelName: string;
  employeeBadge: string;
}

export async function fetchIssuedAtHub(): Promise<IssuedAtHubRow[]> {
  const hubId = await fetchHubLocationId();
  const { data, error } = await supabase
    .from("issuances")
    .select(
      "id, issued_at, equipment_items!inner(serial_number, storage_location_id, equipment_models(name)), employees(badge_code)"
    )
    .eq("status", "active")
    .eq("equipment_items.storage_location_id", hubId)
    .order("issued_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    issuanceId: row.id,
    issuedAt: row.issued_at,
    serial: row.equipment_items?.serial_number ?? "?",
    modelName: row.equipment_items?.equipment_models?.name ?? "",
    employeeBadge: row.employees?.badge_code ?? "",
  }));
}

export interface BaseOption {
  id: string;
  name: string;
}

export async function listBases(): Promise<BaseOption[]> {
  const { data, error } = await supabase.rpc("list_bases");
  if (error) throw new Error(error.message);
  return (data ?? []) as BaseOption[];
}

export async function deleteBase(id: string, deleteCode: string) {
  const { error } = await supabase.rpc("delete_base", { p_id: id, p_delete_code: deleteCode });
  if (error) throw new Error(error.message);
}

export async function setBaseCode(id: string, deleteCode: string, newCode: string) {
  const { error } = await supabase.rpc("set_base_code", {
    p_id: id,
    p_delete_code: deleteCode,
    p_new_code: newCode,
  });
  if (error) throw new Error(error.message);
}

export interface TransferItemRow {
  id: string;
  accepted_at: string | null;
  equipment_items: { id: string; serial_number: string; status: EquipmentStatus; base_id: string } | null;
}

export interface TransferRow {
  id: string;
  created_at: string;
  transfer_code: string | null;
  lo_name: string;
  base_id: string;
  dest_base_id: string | null;
  status: "pending" | "accepted";
  kind: "transfer" | "repair";
  transfer_items: TransferItemRow[];
}

const TRANSFER_SELECT =
  "*, transfer_items(id, accepted_at, equipment_items(id, serial_number, status, base_id))";

export async function fetchOutgoingTransfers(): Promise<TransferRow[]> {
  const { data, error } = await supabase
    .from("transfers")
    .select(TRANSFER_SELECT)
    .eq("base_id", getBaseId())
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as TransferRow[];
}

export async function fetchIncomingTransfers(): Promise<TransferRow[]> {
  const { data, error } = await supabase
    .from("transfers")
    .select(TRANSFER_SELECT)
    .eq("dest_base_id", getBaseId())
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as TransferRow[];
}

export async function createTransferToBase(params: {
  items: EquipmentItemRow[];
  transferCode: string;
  destBaseId: string;
  destName: string;
  kind: "transfer" | "repair";
}) {
  const { data: transfer, error } = await supabase
    .from("transfers")
    .insert({
      transfer_code: params.transferCode || null,
      lo_name: params.destName,
      base_id: getBaseId(),
      dest_base_id: params.destBaseId,
      status: "pending",
      kind: params.kind,
    })
    .select()
    .single();
  if (error) throw error;

  const { error: itemsError } = await supabase
    .from("transfer_items")
    .insert(params.items.map((i) => ({ transfer_id: transfer.id, equipment_item_id: i.id })));
  if (itemsError) throw itemsError;

  const transitStatus = params.kind === "repair" ? "in_transit_repair" : "in_transit";
  await Promise.all(params.items.map((i) => updateEquipmentStatus(i.id, transitStatus)));
  return transfer;
}

export async function acceptTransferItem(serial: string): Promise<string> {
  const { data, error } = await supabase
    .from("transfer_items")
    .select(
      "id, transfer_id, equipment_item_id, equipment_items!inner(serial_number), transfers!inner(dest_base_id, status, kind, base_id)"
    )
    .eq("transfers.dest_base_id", getBaseId())
    .eq("transfers.status", "pending")
    .eq("equipment_items.serial_number", serial)
    .is("accepted_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`С/Н ${serial} нет в заявках на приёмку`);

  const row = data as any;
  const hubId = await fetchHubLocationId();
  const arrivedStatus = row.transfers.kind === "repair" ? "in_repair" : "in_stock";
  const fromName = (await fetchBaseName(row.transfers.base_id)) ?? "";
  const { error: eqError } = await supabase
    .from("equipment_items")
    .update({ base_id: getBaseId(), status: arrivedStatus, storage_location_id: hubId, arrived_from: fromName })
    .eq("id", row.equipment_item_id);
  if (eqError) throw eqError;

  const { error: tiError } = await supabase
    .from("transfer_items")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", row.id);
  if (tiError) throw tiError;

  const { count } = await supabase
    .from("transfer_items")
    .select("id", { count: "exact", head: true })
    .eq("transfer_id", row.transfer_id)
    .is("accepted_at", null);
  if (count === 0) {
    await supabase.from("transfers").update({ status: "accepted" }).eq("id", row.transfer_id);
  }
  return row.equipment_items.serial_number as string;
}

export async function deleteTransfer(transfer: TransferRow) {
  const inTransit = transfer.transfer_items.filter(
    (ti) =>
      ti.accepted_at === null &&
      (ti.equipment_items?.status === "in_transit" || ti.equipment_items?.status === "in_transit_repair")
  );
  await Promise.all(inTransit.map((ti) => updateEquipmentStatus(ti.equipment_items!.id, "in_stock")));
  const legacy = transfer.transfer_items.filter((ti) => ti.equipment_items?.status === "transferred");
  await Promise.all(legacy.map((ti) => returnFromExternal(ti.equipment_items!.id)));
  const { error } = await supabase.from("transfers").delete().eq("id", transfer.id);
  if (error) throw error;
}

export interface HistoryEvent {
  id: string;
  date: string;
  kind: "issued" | "returned" | "defect" | "inventory" | "repair" | "transfer";
  description: string;
}

export interface GlobalHistoryEvent extends HistoryEvent {
  serial: string;
}

export async function fetchGlobalHistory(serialFilter?: string): Promise<GlobalHistoryEvent[]> {
  const baseId = getBaseId();
  const [issuancesRes, defectsRes, invRes, repairRes, transferRes] = await Promise.all([
    supabase
      .from("issuances")
      .select("*, equipment_items(serial_number), employees(badge_code)")
      .eq("base_id", baseId),
    supabase.from("defects").select("*, equipment_items(serial_number)").eq("base_id", baseId),
    supabase
      .from("inventory_items")
      .select("*, equipment_items(serial_number), inventories!inner(equipment_types(name), base_id)")
      .eq("scanned", true)
      .eq("inventories.base_id", baseId),
    supabase
      .from("repair_items")
      .select("*, equipment_items(serial_number), repairs!inner(created_at, lo_name, base_id)")
      .eq("repairs.base_id", baseId),
    supabase
      .from("transfer_items")
      .select("*, equipment_items(serial_number), transfers!inner(created_at, lo_name, base_id)")
      .eq("transfers.base_id", baseId),
  ]);

  const events: GlobalHistoryEvent[] = [];

  for (const row of issuancesRes.data ?? []) {
    const serial = (row as any).equipment_items?.serial_number ?? "?";
    const badge = (row as any).employees?.badge_code ?? "?";
    events.push({ id: `issued-${row.id}`, date: row.issued_at, kind: "issued", serial, description: `Выдано на бейдж ${badge}` });
    if (row.returned_at) {
      events.push({ id: `returned-${row.id}`, date: row.returned_at, kind: "returned", serial, description: `Сдано с бейджа ${badge}` });
    }
  }

  for (const row of defectsRes.data ?? []) {
    const serial = (row as any).equipment_items?.serial_number ?? "?";
    events.push({
      id: `defect-${row.id}`,
      date: row.created_at,
      kind: "defect",
      serial,
      description: `Зафиксирован дефект${row.note ? `: ${row.note}` : ""}`,
    });
  }

  for (const row of invRes.data ?? []) {
    const serial = (row as any).equipment_items?.serial_number ?? "?";
    events.push({ id: `inv-${row.id}`, date: row.scanned_at, kind: "inventory", serial, description: "Отсканировано на инвентаризации" });
  }

  for (const row of repairRes.data ?? []) {
    const serial = (row as any).equipment_items?.serial_number ?? "?";
    const repair = (row as any).repairs;
    events.push({
      id: `repair-${row.id}`,
      date: repair?.created_at,
      kind: "repair",
      serial,
      description: `Отправлено в ремонт (${repair?.lo_name ?? "ЛО"})`,
    });
  }

  for (const row of transferRes.data ?? []) {
    const serial = (row as any).equipment_items?.serial_number ?? "?";
    const transfer = (row as any).transfers;
    events.push({
      id: `transfer-${row.id}`,
      date: transfer?.created_at,
      kind: "transfer",
      serial,
      description: `Перемещено на другое ЛО (${transfer?.lo_name ?? "ЛО"})`,
    });
  }

  const filtered = serialFilter
    ? events.filter((e) => e.serial.toLowerCase().includes(serialFilter.toLowerCase()))
    : events;

  return filtered
    .filter((e) => e.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function fetchEquipmentHistory(equipmentItemId: string): Promise<HistoryEvent[]> {
  const [issuancesRes, defectsRes, invRes, repairRes, transferRes] = await Promise.all([
    supabase
      .from("issuances")
      .select("*, employees(badge_code)")
      .eq("equipment_item_id", equipmentItemId),
    supabase
      .from("defects")
      .select("*")
      .eq("equipment_item_id", equipmentItemId),
    supabase
      .from("inventory_items")
      .select("*, inventories(started_at, completed_at, status)")
      .eq("equipment_item_id", equipmentItemId)
      .eq("scanned", true),
    supabase
      .from("repair_items")
      .select("*, repairs(created_at, lo_name, transfer_code)")
      .eq("equipment_item_id", equipmentItemId),
    supabase
      .from("transfer_items")
      .select("*, transfers(created_at, lo_name, transfer_code)")
      .eq("equipment_item_id", equipmentItemId),
  ]);

  const events: HistoryEvent[] = [];

  for (const row of issuancesRes.data ?? []) {
    const badge = (row as any).employees?.badge_code ?? "?";
    events.push({
      id: `issued-${row.id}`,
      date: row.issued_at,
      kind: "issued",
      description: `Выдано на бейдж ${badge}`,
    });
    if (row.returned_at) {
      events.push({
        id: `returned-${row.id}`,
        date: row.returned_at,
        kind: "returned",
        description: `Сдано с бейджа ${badge}`,
      });
    }
  }

  for (const row of defectsRes.data ?? []) {
    events.push({
      id: `defect-${row.id}`,
      date: row.created_at,
      kind: "defect",
      description: `Зафиксирован дефект${
        row.reported_employee_code ? ` (ID: ${row.reported_employee_code})` : ""
      }${row.note ? `: ${row.note}` : ""}`,
    });
  }

  for (const row of invRes.data ?? []) {
    const inv = (row as any).inventories;
    events.push({
      id: `inv-${row.id}`,
      date: row.scanned_at ?? inv?.started_at,
      kind: "inventory",
      description: "Отсканировано на инвентаризации",
    });
  }

  for (const row of repairRes.data ?? []) {
    const repair = (row as any).repairs;
    events.push({
      id: `repair-${row.id}`,
      date: repair?.created_at,
      kind: "repair",
      description: `Отправлено в ремонт (${repair?.lo_name ?? "ЛО"})`,
    });
  }

  for (const row of transferRes.data ?? []) {
    const transfer = (row as any).transfers;
    events.push({
      id: `transfer-${row.id}`,
      date: transfer?.created_at,
      kind: "transfer",
      description: `Перемещено на другое ЛО (${transfer?.lo_name ?? "ЛО"})`,
    });
  }

  return events
    .filter((e) => e.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export interface TransitInfo {
  kind: "transfer" | "repair";
  destName: string;
}

export async function fetchTransitInfo(equipmentItemId: string): Promise<TransitInfo | null> {
  const { data, error } = await supabase
    .from("transfer_items")
    .select("transfers!inner(dest_base_id, kind, status)")
    .eq("equipment_item_id", equipmentItemId)
    .is("accepted_at", null)
    .eq("transfers.status", "pending")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const t = (data as any).transfers;
  const destName = t.dest_base_id ? (await fetchBaseName(t.dest_base_id)) ?? "" : "";
  return { kind: t.kind, destName };
}

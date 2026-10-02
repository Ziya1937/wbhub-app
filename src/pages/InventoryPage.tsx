import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { AddEquipmentDialog } from "../components/AddEquipmentDialog";
import { EquipmentDetailDialog } from "../components/EquipmentDetailDialog";
import { SortableTh } from "../components/SortableTh";
import { fetchEquipmentItems, fetchEquipmentModels, fetchEquipmentTypes, type EquipmentItemRow } from "../lib/queries";
import { STATUS_BADGE_VARIANT, STATUS_LABEL } from "../lib/status";
import { useCachedList } from "../lib/cache";
import type { EquipmentModel, EquipmentType } from "../types/database";

type SortKey = "type" | "model" | "serial" | "location" | "status";

const SORT_VALUE: Record<SortKey, (i: EquipmentItemRow) => string> = {
  type: (i) => i.equipment_models?.equipment_types?.name ?? "",
  model: (i) => i.equipment_models?.name ?? "",
  serial: (i) => i.serial_number,
  location: (i) => i.storage_locations?.name ?? "",
  status: (i) => STATUS_LABEL[i.status],
};

export function InventoryPage() {
  const [types, setTypes] = useState<EquipmentType[]>([]);
  const [models, setModels] = useState<EquipmentModel[]>([]);
  const [typeId, setTypeId] = useState<string>("all");
  const [modelId, setModelId] = useState<string>("all");
  const [serial, setSerial] = useState("");
  const [items, setItems] = useCachedList<EquipmentItemRow>("inventory:list");
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<EquipmentItemRow | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((a) => !a);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  const displayedItems = sortKey
    ? [...items].sort((a, b) => {
        const cmp = SORT_VALUE[sortKey](a).localeCompare(SORT_VALUE[sortKey](b));
        return sortAsc ? cmp : -cmp;
      })
    : items;

  const load = useCallback(() => {
    setLoading(true);
    fetchEquipmentItems({
      typeId: typeId === "all" ? undefined : typeId,
      modelId: modelId === "all" ? undefined : modelId,
      serial: serial || undefined,
    })
      .then(setItems)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [typeId, modelId, serial]);

  useEffect(() => {
    fetchEquipmentTypes().then(setTypes).catch((e) => toast.error(e.message));
  }, []);

  useEffect(() => {
    fetchEquipmentModels(typeId === "all" ? undefined : typeId).then(setModels);
    setModelId("all");
  }, [typeId]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Инвентарь</h1>
          <p className="text-sm text-muted-foreground">
            Всего единиц: {items.length}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" /> Добавить оборудование
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={typeId} onValueChange={setTypeId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Вид" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все виды</SelectItem>
            {types.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={modelId} onValueChange={setModelId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Модель" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все модели</SelectItem>
            {models.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по с/н…"
            className="pl-9"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left text-xs font-medium uppercase text-muted-foreground">
            <tr>
              <SortableTh label="Вид" active={sortKey === "type"} asc={sortAsc} onClick={() => toggleSort("type")} />
              <SortableTh label="Модель" active={sortKey === "model"} asc={sortAsc} onClick={() => toggleSort("model")} />
              <SortableTh label="С/Н" active={sortKey === "serial"} asc={sortAsc} onClick={() => toggleSort("serial")} />
              <SortableTh label="МХ" active={sortKey === "location"} asc={sortAsc} onClick={() => toggleSort("location")} />
              <SortableTh label="Статус" active={sortKey === "status"} asc={sortAsc} onClick={() => toggleSort("status")} />
            </tr>
          </thead>
          <tbody>
            {displayedItems.map((item) => (
              <tr
                key={item.id}
                onClick={() => setSelected(item)}
                className="cursor-pointer border-t border-border hover:bg-secondary/60"
              >
                <td className="px-4 py-3">{item.equipment_models?.equipment_types?.name}</td>
                <td className="px-4 py-3">{item.equipment_models?.name}</td>
                <td className="px-4 py-3 font-mono">{item.serial_number}</td>
                <td className="px-4 py-3 text-muted-foreground">{item.storage_locations?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_BADGE_VARIANT[item.status]}>
                    {STATUS_LABEL[item.status]}
                  </Badge>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  Ничего не найдено
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AddEquipmentDialog open={addOpen} onOpenChange={setAddOpen} onCreated={load} />
      <EquipmentDetailDialog
        item={selected}
        onOpenChange={(o) => !o && setSelected(null)}
        onChanged={load}
      />
    </div>
  );
}

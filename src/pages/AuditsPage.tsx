import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ClipboardCheck, CheckCircle2, Circle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { ScanInput } from "../components/ScanInput";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { DeleteWithCodeButton } from "../components/DeleteWithCodeButton";
import {
  completeInventory,
  deleteInventory,
  fetchEquipmentTypes,
  fetchInventories,
  fetchInventory,
  fetchInventoryItems,
  scanInventoryItem,
  startInventory,
  type InventoryItemRow,
  type InventoryRow,
} from "../lib/queries";
import { useCachedList, useCachedState } from "../lib/cache";
import type { EquipmentType } from "../types/database";

export function AuditsPage() {
  const { id } = useParams();
  if (id) return <ActiveAudit id={id} />;
  return <AuditsList />;
}

function AuditsList() {
  const navigate = useNavigate();
  const [inventories, setInventories] = useState<InventoryRow[]>([]);
  const [types, setTypes] = useState<EquipmentType[]>([]);
  const [startOpen, setStartOpen] = useState(false);
  const [typeId, setTypeId] = useState("");
  const [starting, setStarting] = useState(false);

  function load() {
    fetchInventories().then(setInventories).catch((e) => toast.error(e.message));
  }

  useEffect(load, []);
  useEffect(() => {
    if (startOpen) fetchEquipmentTypes().then(setTypes).catch((e) => toast.error(e.message));
  }, [startOpen]);

  async function handleStart() {
    if (!typeId) return;
    setStarting(true);
    try {
      const inventoryId = await startInventory(typeId);
      setStartOpen(false);
      navigate(`/audits/${inventoryId}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Инвент</h1>
        <Button onClick={() => setStartOpen(true)}>
          <ClipboardCheck className="size-4" /> Начать инвент
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {inventories.map((inv) => (
          <Card
            key={inv.id}
            className="flex cursor-pointer items-center justify-between p-4 hover:bg-secondary/40"
            onClick={() => navigate(`/audits/${inv.id}`)}
          >
            <div>
              <p className="font-medium">{inv.equipment_types?.name}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(inv.started_at).toLocaleString("ru-RU")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={inv.status === "completed" ? "default" : "primary"}>
                {inv.status === "completed" ? "Завершён" : "В процессе"}
              </Badge>
              <DeleteWithCodeButton
                what={`инвент «${inv.equipment_types?.name ?? ""}»`}
                onConfirm={async () => {
                  await deleteInventory(inv.id);
                  load();
                }}
              />
            </div>
          </Card>
        ))}
        {inventories.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Инвентаризаций пока не было</p>
        )}
      </div>

      <Dialog open={startOpen} onOpenChange={setStartOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Начать инвент</DialogTitle>
          </DialogHeader>
          <Select value={typeId} onValueChange={setTypeId}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите вид оборудования" />
            </SelectTrigger>
            <SelectContent>
              {types.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStartOpen(false)}>
              Отмена
            </Button>
            <Button disabled={!typeId || starting} onClick={handleStart}>
              Начать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActiveAudit({ id }: { id: string }) {
  const navigate = useNavigate();
  const [inventory, setInventory] = useCachedState<InventoryRow | null>(`audit:${id}`, null);
  const [items, setItems] = useCachedList<InventoryItemRow>(`audit-items:${id}`);
  const [scanTick, setScanTick] = useState(0);

  useEffect(() => {
    fetchInventory(id).then(setInventory).catch((e) => toast.error(e.message));
    fetchInventoryItems(id).then(setItems).catch((e) => toast.error(e.message));
  }, [id]);

  const sorted = [...items].sort((a, b) => {
    if (a.scanned === b.scanned) return (a.equipment_items?.serial_number ?? "").localeCompare(b.equipment_items?.serial_number ?? "");
    return a.scanned ? -1 : 1;
  });
  const scannedCount = items.filter((i) => i.scanned).length;

  async function handleScan(serial: string) {
    try {
      await scanInventoryItem(id, serial);
      setItems((prev) =>
        prev.map((i) =>
          i.equipment_items?.serial_number === serial
            ? { ...i, scanned: true, scanned_at: new Date().toISOString() }
            : i
        )
      );
      setScanTick((t) => t + 1);
      toast.success(`Отсканировано: ${serial}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleComplete() {
    try {
      const lost = await completeInventory(id);
      toast.success(lost > 0 ? `Инвент завершён, утеряно: ${lost}` : "Инвент завершён, расхождений нет");
      navigate("/audits");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            Инвент: {inventory ? inventory.equipment_types?.name : "Загрузка…"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Отсканировано {scannedCount} из {items.length}
          </p>
        </div>
        {inventory?.status === "in_progress" && (
          <Button onClick={handleComplete}>Завершить</Button>
        )}
      </div>

      {inventory?.status === "in_progress" && (
        <ScanInput placeholder="Серийный номер…" onScan={handleScan} autoFocusKey={scanTick} />
      )}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {sorted.map((i) => (
          <div
            key={i.id}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-sm transition-colors ${
              i.scanned
                ? "border-success/30 bg-success/10 text-success"
                : "border-border bg-card text-foreground"
            }`}
          >
            {i.scanned ? <CheckCircle2 className="size-4 shrink-0" /> : <Circle className="size-4 shrink-0 text-muted-foreground" />}
            {i.equipment_items?.serial_number}
          </div>
        ))}
      </div>
    </div>
  );
}

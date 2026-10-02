import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ScanInput } from "./ScanInput";
import {
  createEquipmentItem,
  createEquipmentModel,
  createEquipmentType,
  fetchEquipmentModels,
  fetchEquipmentTypes,
  fetchStorageLocations,
} from "../lib/queries";
import { HUB_LOCATION_NAME } from "../lib/status";
import type { EquipmentModel, EquipmentType, StorageLocation } from "../types/database";
import { X } from "lucide-react";

export function AddEquipmentDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [types, setTypes] = useState<EquipmentType[]>([]);
  const [models, setModels] = useState<EquipmentModel[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [typeId, setTypeId] = useState("");
  const [modelId, setModelId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [newTypeName, setNewTypeName] = useState("");
  const [newModelName, setNewModelName] = useState("");
  const [pendingSerials, setPendingSerials] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetchEquipmentTypes().then(setTypes).catch((e) => toast.error(e.message));
    fetchStorageLocations()
      .then((locs) => {
        setLocations(locs);
        const hub = locs.find((l) => l.name === HUB_LOCATION_NAME);
        setLocationId(hub?.id ?? locs[0]?.id ?? "");
      })
      .catch((e) => toast.error(e.message));
    setTypeId("");
    setModelId("");
    setNewTypeName("");
    setNewModelName("");
    setPendingSerials([]);
  }, [open]);

  useEffect(() => {
    if (!typeId) {
      setModels([]);
      return;
    }
    fetchEquipmentModels(typeId).then(setModels).catch((e) => toast.error(e.message));
  }, [typeId]);

  function addSerial(code: string) {
    const trimmed = code.trim();
    if (!trimmed) return;
    setPendingSerials((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
  }

  async function handleCreateType() {
    if (!newTypeName.trim()) return;
    try {
      const created = await createEquipmentType(newTypeName.trim());
      setTypes((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setTypeId(created.id);
      setNewTypeName("");
    } catch (e: any) {
      toast.error(e.message ?? "Не удалось создать вид");
    }
  }

  async function handleCreateModel() {
    if (!newModelName.trim() || !typeId) return;
    try {
      const created = await createEquipmentModel(typeId, newModelName.trim());
      setModels((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setModelId(created.id);
      setNewModelName("");
    } catch (e: any) {
      toast.error(e.message ?? "Не удалось создать модель");
    }
  }

  async function handleSave() {
    if (!modelId || !locationId || pendingSerials.length === 0) return;
    setSaving(true);
    const results = await Promise.allSettled(
      pendingSerials.map((serial) => createEquipmentItem(modelId, serial, locationId))
    );
    let okCount = 0;
    results.forEach((res, i) => {
      if (res.status === "fulfilled") {
        okCount++;
      } else {
        const message = (res.reason as any)?.message ?? String(res.reason);
        toast.error(`С/Н ${pendingSerials[i]}: ${message?.includes("duplicate") ? "уже существует" : message}`);
      }
    });
    setSaving(false);
    if (okCount > 0) {
      toast.success(`Добавлено единиц: ${okCount}`);
      onCreated();
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добавить оборудование</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Вид оборудования</label>
            <div className="flex gap-2">
              <Select value={typeId} onValueChange={(v) => { setTypeId(v); setModelId(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите вид" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                placeholder="Новый вид…"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateType()}
              />
              <Button type="button" variant="secondary" onClick={handleCreateType}>
                Добавить
              </Button>
            </div>
          </div>

          {typeId && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">Модель</label>
              <Select value={modelId} onValueChange={setModelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите модель" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-2 flex gap-2">
                <Input
                  placeholder="Новая модель…"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateModel()}
                />
                <Button type="button" variant="secondary" onClick={handleCreateModel}>
                  Добавить
                </Button>
              </div>
            </div>
          )}

          {typeId && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">Место хранения (МХ)</label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите МХ" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {modelId && locationId && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Серийный номер (сканируйте или введите и нажмите Enter)
              </label>
              <ScanInput placeholder="С/Н…" onScan={addSerial} autoFocusKey={modelId} />
              {pendingSerials.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {pendingSerials.map((s) => (
                    <span
                      key={s}
                      className="flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => setPendingSerials((prev) => prev.filter((x) => x !== s))}
                        className="hover:opacity-70"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button disabled={!modelId || !locationId || pendingSerials.length === 0 || saving} onClick={handleSave}>
            Добавить {pendingSerials.length > 0 ? `(${pendingSerials.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

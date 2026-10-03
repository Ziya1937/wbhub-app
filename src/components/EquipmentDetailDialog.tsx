import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  attachDefectExplanation,
  fetchTransitInfo,
  updateEquipmentStatus,
  type TransitInfo,
  deleteEquipmentItem,
  fetchEquipmentHistory,
  fetchLatestDefect,
  fetchStorageLocations,
  getEquipmentFileUrl,
  updateEquipmentLocation,
  uploadEquipmentFile,
  type EquipmentItemRow,
  type HistoryEvent,
} from "../lib/queries";
import { STATUS_BADGE_VARIANT, STATUS_LABEL } from "../lib/status";
import { ViewFileDialog } from "./ViewFileDialog";
import { DeleteWithCodeButton } from "./DeleteWithCodeButton";
import type { StorageLocation } from "../types/database";
import { Paperclip, Upload } from "lucide-react";

export function EquipmentDetailDialog({
  item,
  onOpenChange,
  onChanged,
}: {
  item: EquipmentItemRow | null;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}) {
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [defect, setDefect] = useState<{ id: string; explanation_file_url: string | null } | null>(
    null
  );
  const [uploading, setUploading] = useState(false);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [locationId, setLocationId] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);
  const [viewingFile, setViewingFile] = useState<string | null>(null);

  const [transit, setTransit] = useState<TransitInfo | null>(null);

  useEffect(() => {
    if (!item) return;
    fetchTransitInfo(item.id).then(setTransit).catch(() => setTransit(null));
  }, [item]);

  useEffect(() => {
    if (!item) return;
    setLoading(true);
    setLocationId(item.storage_location_id ?? "");
    Promise.all([fetchEquipmentHistory(item.id), fetchLatestDefect(item.id), fetchStorageLocations()])
      .then(([h, d, locs]) => {
        setHistory(h);
        setDefect(d);
        setLocations(locs);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [item]);

  async function handleLocationSave() {
    if (!item || !locationId || locationId === item.storage_location_id) return;
    setSavingLocation(true);
    try {
      await updateEquipmentLocation(item.id, locationId);
      toast.success("МХ обновлено");
      onChanged?.();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingLocation(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !defect) return;
    setUploading(true);
    try {
      const path = `defects/${defect.id}/${file.name}`;
      const { error } = await uploadEquipmentFile(path, file);
      if (error) throw error;
      const url = getEquipmentFileUrl(path);
      await attachDefectExplanation(defect.id, url);
      setDefect({ ...defect, explanation_file_url: url });
      toast.success("Объяснительная добавлена");
    } catch (err: any) {
      toast.error(err.message ?? "Не удалось загрузить файл");
    } finally {
      setUploading(false);
    }
  }

  if (!item) return null;

  return (
    <>
    <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>С/Н {item.serial_number}</DialogTitle>
        </DialogHeader>

        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{item.equipment_models?.equipment_types?.name}</span>
          <span>/</span>
          <span>{item.equipment_models?.name}</span>
          <Badge variant={STATUS_BADGE_VARIANT[item.status]}>{STATUS_LABEL[item.status]}</Badge>
        </div>

        {item.arrived_from && (
          <p className="mb-3 text-sm text-muted-foreground">Прибыло из: {item.arrived_from}</p>
        )}
        {transit?.kind === "repair" && (
          <p className="mb-3 text-sm text-muted-foreground">Отправлено на ремонт в: {transit.destName}</p>
        )}
        {item.status === "in_repair" && (
          <Button
            size="sm"
            variant="secondary"
            className="mb-4"
            onClick={async () => {
              try {
                await updateEquipmentStatus(item.id, "in_stock");
                toast.success("Статус: на складе");
                onOpenChange(false);
                onChanged?.();
              } catch (e: any) {
                toast.error(e.message);
              }
            }}
          >
            Вернуть статус «На складе»
          </Button>
        )}

        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-muted-foreground shrink-0">МХ:</span>
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger className="h-9">
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
          <Button
            size="sm"
            variant="secondary"
            disabled={!locationId || locationId === item.storage_location_id || savingLocation}
            onClick={handleLocationSave}
          >
            Сохранить
          </Button>
        </div>

        {item.status === "defective" && defect && !defect.explanation_file_url && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-warning/30 bg-warning/5 p-3">
            <span className="text-sm">Нет объяснительной по дефекту</span>
            <label>
              <input type="file" className="hidden" onChange={handleUpload} />
              <span className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-warning px-3 py-1.5 text-xs font-medium text-warning-foreground hover:opacity-90">
                <Upload className="size-3.5" />
                {uploading ? "Загрузка…" : "Добавить объяснительную"}
              </span>
            </label>
          </div>
        )}
        {item.status === "defective" && defect?.explanation_file_url && (
          <button
            onClick={() => setViewingFile(defect.explanation_file_url)}
            className="mb-4 flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <Paperclip className="size-3.5" /> Объяснительная приложена — посмотреть
          </button>
        )}

        <div className="max-h-80 overflow-y-auto">
          <h4 className="mb-2 text-sm font-semibold text-muted-foreground">История</h4>
          {loading && <p className="text-sm text-muted-foreground">Загрузка…</p>}
          {!loading && history.length === 0 && (
            <p className="text-sm text-muted-foreground">Событий пока нет</p>
          )}
          <ul className="flex flex-col gap-2">
            {history.map((ev) => (
              <li key={ev.id} className="flex items-start justify-between gap-3 border-b border-border pb-2 text-sm">
                <span>{ev.description}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(ev.date).toLocaleString("ru-RU")}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <DeleteWithCodeButton
            what={`оборудование с/н ${item.serial_number}`}
            label="Удалить"
            onConfirm={async () => {
              await deleteEquipmentItem(item.id);
              onOpenChange(false);
              onChanged?.();
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10"
          />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <ViewFileDialog url={viewingFile} onOpenChange={(o) => !o && setViewingFile(null)} />
    </>
  );
}

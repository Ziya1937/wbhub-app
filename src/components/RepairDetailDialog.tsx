import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScanInput } from "./ScanInput";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import {
  addRepairItem,
  attachRepairPhoto,
  fetchEquipmentItemBySerialStrict,
  fetchRepair,
  removeRepairItem,
  updateRepair,
  type RepairRow,
} from "../lib/queries";

export function RepairDetailDialog({
  repairId,
  onOpenChange,
  onChanged,
}: {
  repairId: string | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const [repair, setRepair] = useState<RepairRow | null>(null);
  const [transferCode, setTransferCode] = useState("");
  const [loName, setLoName] = useState("");
  const [scanTick, setScanTick] = useState(0);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!repairId) {
      setRepair(null);
      return;
    }
    fetchRepair(repairId)
      .then((r) => {
        setRepair(r);
        setTransferCode(r.transfer_code ?? "");
        setLoName(r.lo_name ?? "");
      })
      .catch((e) => toast.error(e.message));
  }, [repairId]);

  async function refresh() {
    if (!repairId) return;
    const r = await fetchRepair(repairId);
    setRepair(r);
    onChanged();
  }

  async function handleScan(serial: string) {
    if (!repairId) return;
    try {
      const item = await fetchEquipmentItemBySerialStrict(serial);
      await addRepairItem(repairId, item.id);
      toast.success(`Добавлено: ${serial}`);
      setScanTick((t) => t + 1);
      await refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleRemove(equipmentItemId: string) {
    if (!repairId) return;
    try {
      await removeRepairItem(repairId, equipmentItemId);
      await refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleFieldBlur() {
    if (!repairId || !repair) return;
    if (transferCode === (repair.transfer_code ?? "") && loName === (repair.lo_name ?? "")) return;
    try {
      await updateRepair(repairId, { transferCode, loName });
      onChanged();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !repairId) return;
    setUploadingPhoto(true);
    try {
      const url = await attachRepairPhoto(repairId, file);
      setRepair((prev) => (prev ? { ...prev, photo_url: url } : prev));
      onChanged();
    } catch (err: any) {
      toast.error(err.message ?? "Не удалось загрузить фото");
    } finally {
      setUploadingPhoto(false);
    }
  }

  return (
    <Dialog open={Boolean(repairId)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Отправка в ремонт</DialogTitle>
        </DialogHeader>

        {repair && (
          <div className="flex flex-col gap-3">
            <ScanInput placeholder="Серийный номер…" onScan={handleScan} autoFocusKey={scanTick} />
            <div className="flex flex-col gap-1.5">
              {repair.repair_items.map((ri, idx) => {
                const eq = ri.equipment_items;
                if (!eq) return null;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <span className="font-mono">{eq.serial_number}</span>
                    {eq.status === "in_repair" && (
                      <button onClick={() => handleRemove(eq.id)}>
                        <X className="size-4 text-muted-foreground hover:text-foreground" />
                      </button>
                    )}
                  </div>
                );
              })}
              {repair.repair_items.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">Отсканируйте оборудование</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Передача</label>
              <Input
                placeholder="Номер/код передачи — введите или отсканируйте"
                value={transferCode}
                onChange={(e) => setTransferCode(e.target.value)}
                onBlur={handleFieldBlur}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Название ЛО</label>
              <Input value={loName} onChange={(e) => setLoName(e.target.value)} onBlur={handleFieldBlur} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Фото</label>
              {repair.photo_url && (
                <a href={repair.photo_url} target="_blank" rel="noreferrer" className="mb-1.5 block text-sm text-primary hover:underline">
                  Открыть текущее фото
                </a>
              )}
              <input type="file" accept="image/*" disabled={uploadingPhoto} onChange={handlePhoto} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Готово</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Send, X, Undo2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { ScanInput } from "../components/ScanInput";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { DeleteWithCodeButton } from "../components/DeleteWithCodeButton";
import {
  createTransfer,
  deleteTransfer,
  fetchEquipmentItemBySerialStrict,
  fetchTransfers,
  returnFromExternal,
  type EquipmentItemRow,
  type TransferRow,
} from "../lib/queries";

export function TransfersPage() {
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [items, setItems] = useState<EquipmentItemRow[]>([]);
  const [transferCode, setTransferCode] = useState("");
  const [loName, setLoName] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    fetchTransfers().then(setTransfers).catch((e) => toast.error(e.message));
  }
  useEffect(load, []);

  async function handleReturn(equipmentItemId: string, serial: string) {
    try {
      await returnFromExternal(equipmentItemId);
      toast.success(`Возвращено: ${serial}`);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function openDialog() {
    setStep(1);
    setItems([]);
    setTransferCode("");
    setLoName("");
    setOpen(true);
  }

  async function handleScan(serial: string) {
    try {
      const item = await fetchEquipmentItemBySerialStrict(serial);
      if (items.some((i) => i.id === item.id)) {
        toast.error("Уже в списке");
        return;
      }
      setItems((prev) => [...prev, item]);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleSubmit() {
    if (!loName.trim() || items.length === 0) return;
    setSaving(true);
    try {
      await createTransfer({ items, transferCode: transferCode.trim(), loName: loName.trim() });
      toast.success(`Перемещено: ${items.length} шт.`);
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Перемещение на другое ЛО</h1>
        <Button onClick={openDialog}>
          <Send className="size-4" /> Создать перемещение
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {transfers.map((t) => (
          <Card key={t.id} className="p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">{t.lo_name}</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  {new Date(t.created_at).toLocaleString("ru-RU")}
                </p>
                <DeleteWithCodeButton
                  what={`перемещение «${t.lo_name}»`}
                  onConfirm={async () => {
                    await deleteTransfer(t);
                    load();
                  }}
                />
              </div>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t.transfer_code && <>Передача: {t.transfer_code} · </>}
              Единиц: {t.transfer_items.length}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {t.transfer_items.map((ti, idx) => {
                const eq = ti.equipment_items;
                const stillThere = eq?.status === "transferred";
                return (
                  <span
                    key={idx}
                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-xs ${
                      stillThere ? "bg-secondary" : "bg-success/10 text-success line-through"
                    }`}
                  >
                    {eq?.serial_number}
                    {stillThere && eq && (
                      <button
                        title="Вернуть с другого ЛО"
                        onClick={() => handleReturn(eq.id, eq.serial_number)}
                        className="ml-0.5 hover:opacity-70"
                      >
                        <Undo2 className="size-3" />
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          </Card>
        ))}
        {transfers.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Перемещений пока не было</p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Перемещение — {step === 1 ? "оборудование" : "оформление"}</DialogTitle>
          </DialogHeader>

          {step === 1 && (
            <div className="flex flex-col gap-3">
              <ScanInput placeholder="Серийный номер…" onScan={handleScan} autoFocusKey={items.length} />
              <div className="flex flex-col gap-1.5">
                {items.map((i) => (
                  <div key={i.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                    <span className="font-mono">{i.serial_number}</span>
                    <button onClick={() => setItems((prev) => prev.filter((x) => x.id !== i.id))}>
                      <X className="size-4 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">Отсканируйте оборудование</p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Отмена
                </Button>
                <Button disabled={items.length === 0} onClick={() => setStep(2)}>
                  Далее ({items.length})
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Номер передачи</label>
                <Input
                  placeholder="Номер/код передачи — введите или отсканируйте"
                  value={transferCode}
                  onChange={(e) => setTransferCode(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Название ЛО</label>
                <Input value={loName} onChange={(e) => setLoName(e.target.value)} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setStep(1)}>
                  Назад
                </Button>
                <Button disabled={!loName.trim() || saving} onClick={handleSubmit}>
                  Переместить
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

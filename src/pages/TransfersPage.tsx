import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Send, X, Undo2, Inbox, CheckCircle2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { ScanInput } from "../components/ScanInput";
import { DeleteWithCodeButton } from "../components/DeleteWithCodeButton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import {
  acceptTransferItem,
  createTransferToBase,
  deleteTransfer,
  fetchEquipmentItemBySerialStrict,
  fetchIncomingTransfers,
  fetchOutgoingTransfers,
  listBases,
  returnFromExternal,
  type BaseOption,
  type EquipmentItemRow,
  type TransferRow,
} from "../lib/queries";
import { getBaseId } from "../lib/baseContext";
import { cn } from "../lib/utils";

const BLOCKED_STATUSES = ["in_transit", "in_transit_repair", "transferred", "issued"];
const KIND_LABEL = { transfer: "Отправка", repair: "Ремонт" } as const;

export function TransfersPage() {
  const currentBaseId = getBaseId();
  const [outgoing, setOutgoing] = useState<TransferRow[]>([]);
  const [incoming, setIncoming] = useState<TransferRow[]>([]);
  const [bases, setBases] = useState<BaseOption[]>([]);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [items, setItems] = useState<EquipmentItemRow[]>([]);
  const [destBaseId, setDestBaseId] = useState("");
  const [kind, setKind] = useState<"transfer" | "repair">("transfer");
  const [transferCode, setTransferCode] = useState("");
  const [saving, setSaving] = useState(false);

  const baseNames = useMemo(() => new Map(bases.map((b) => [b.id, b.name])), [bases]);
  const destOptions = bases.filter((b) => b.id !== currentBaseId);

  function load() {
    fetchOutgoingTransfers().then(setOutgoing).catch((e) => toast.error(e.message));
    fetchIncomingTransfers().then(setIncoming).catch((e) => toast.error(e.message));
  }

  useEffect(() => {
    load();
    listBases().then(setBases).catch((e) => toast.error(e.message));
  }, []);

  function openDialog() {
    setStep(1);
    setItems([]);
    setDestBaseId("");
    setKind("transfer");
    setTransferCode("");
    setOpen(true);
  }

  async function handleScanItem(serial: string) {
    try {
      const item = await fetchEquipmentItemBySerialStrict(serial);
      if (BLOCKED_STATUSES.includes(item.status)) {
        toast.error(`С/Н ${serial} сейчас нельзя отправить (статус: ${item.status})`);
        return;
      }
      if (items.some((i) => i.id === item.id)) {
        toast.error("Уже в списке");
        return;
      }
      setItems((prev) => [...prev, item]);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleAccept(serial: string) {
    try {
      const accepted = await acceptTransferItem(serial);
      toast.success(`Принято: ${accepted}`);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleSubmit() {
    if (!destBaseId || items.length === 0) return;
    setSaving(true);
    try {
      await createTransferToBase({
        items,
        transferCode: transferCode.trim(),
        destBaseId,
        destName: baseNames.get(destBaseId) ?? "",
        kind,
      });
      toast.success(
        kind === "repair"
          ? `Отправлено в ремонт: ${items.length} шт. — ждёт приёмки`
          : `Отправлено: ${items.length} шт. — ждёт приёмки`
      );
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLegacyReturn(equipmentItemId: string, serial: string) {
    try {
      await returnFromExternal(equipmentItemId);
      toast.success(`Возвращено: ${serial}`);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Перемещение на ЛО</h1>
        <Button onClick={openDialog} disabled={destOptions.length === 0}>
          <Send className="size-4" /> Новое перемещение
        </Button>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Inbox className="size-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Заявки на приёмку</h2>
        </div>
        {incoming.length > 0 && (
          <ScanInput placeholder="Сканируйте принимаемое оборудование…" onScan={handleAccept} autoFocusKey={incoming.length} />
        )}
        {incoming.map((t) => {
          const accepted = t.transfer_items.filter((ti) => ti.accepted_at).length;
          return (
            <Card key={t.id} className="p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">
                  {KIND_LABEL[t.kind]} от: {baseNames.get(t.base_id) ?? "неизвестное ЛО"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(t.created_at).toLocaleString("ru-RU")}
                </p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {t.transfer_code && <>Передача: {t.transfer_code} · </>}
                Принято {accepted} из {t.transfer_items.length}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {t.transfer_items.map((ti) => (
                  <span
                    key={ti.id}
                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-xs ${
                      ti.accepted_at ? "bg-success/10 text-success" : "bg-secondary"
                    }`}
                  >
                    {ti.accepted_at && <CheckCircle2 className="size-3" />}
                    {ti.equipment_items?.serial_number}
                  </span>
                ))}
              </div>
            </Card>
          );
        })}
        {incoming.length === 0 && (
          <p className="text-sm text-muted-foreground">Заявок на приёмку нет</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Отправленные</h2>
        {outgoing.map((t) => {
          const destName = t.dest_base_id ? baseNames.get(t.dest_base_id) : t.lo_name;
          const pending = t.status === "pending";
          return (
            <Card key={t.id} className="p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">
                  {KIND_LABEL[t.kind]} в: {destName || t.lo_name}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.created_at).toLocaleString("ru-RU")}
                  </p>
                  <DeleteWithCodeButton
                    what={`перемещение в «${destName || t.lo_name}»`}
                    onConfirm={async () => {
                      await deleteTransfer(t);
                      load();
                    }}
                  />
                </div>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {t.transfer_code && <>Передача: {t.transfer_code} · </>}
                {pending ? "Ожидает приёмки" : "Принято"} · Единиц: {t.transfer_items.length}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {t.transfer_items.map((ti) => {
                  const eq = ti.equipment_items;
                  const inTransit =
                    ti.accepted_at === null &&
                    (eq?.status === "in_transit" || eq?.status === "in_transit_repair");
                  const legacyTransferred = eq?.status === "transferred";
                  return (
                    <span
                      key={ti.id}
                      className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-xs ${
                        inTransit
                          ? "bg-warning/10 text-warning"
                          : legacyTransferred
                            ? "bg-secondary"
                            : "bg-success/10 text-success line-through"
                      }`}
                    >
                      {eq?.serial_number}
                      {legacyTransferred && eq && (
                        <button
                          title="Вернуть с другого ЛО"
                          onClick={() => handleLegacyReturn(eq.id, eq.serial_number)}
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
          );
        })}
        {outgoing.length === 0 && (
          <p className="text-sm text-muted-foreground">Перемещений пока не было</p>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Перемещение — {step === 1 ? "оборудование" : "куда и номер передачи"}</DialogTitle>
          </DialogHeader>

          {step === 1 && (
            <div className="flex flex-col gap-3">
              <ScanInput placeholder="Серийный номер…" onScan={handleScanItem} autoFocusKey={items.length} />
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
              <div className="flex gap-2">
                {(["transfer", "repair"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={cn(
                      "flex-1 rounded-lg border p-2.5 text-sm font-medium transition-colors",
                      kind === k
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:bg-secondary/60"
                    )}
                  >
                    {k === "transfer" ? "Отправка на ЛО" : "На ремонт"}
                  </button>
                ))}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Куда (ЛО)</label>
                <Select value={destBaseId} onValueChange={setDestBaseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите ЛО" />
                  </SelectTrigger>
                  <SelectContent>
                    {destOptions.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Номер передачи</label>
                <Input
                  placeholder="Номер/код передачи — введите или отсканируйте"
                  value={transferCode}
                  onChange={(e) => setTransferCode(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setStep(1)}>
                  Назад
                </Button>
                <Button disabled={!destBaseId || saving} onClick={handleSubmit}>
                  Отправить
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

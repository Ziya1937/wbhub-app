import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, AlertTriangle, CheckCircle2, XCircle, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { ScanInput } from "../components/ScanInput";
import { DefectDialog, type DefectDraft } from "../components/DefectDialog";
import { QrButton } from "../components/QrButton";
import { matchScanCommand } from "../lib/scanCommands";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import {
  attachDefectExplanation,
  createDefect,
  createIssuance,
  fetchIssuedAtHub,
  findActiveIssuance,
  findEquipmentItemBySerial,
  findOrCreateEmployeeByBadge,
  getEquipmentFileUrl,
  returnIssuance,
  uploadEquipmentFile,
  type EquipmentItemRow,
  type IssuedAtHubRow,
} from "../lib/queries";
import { HUB_LOCATION_NAME } from "../lib/status";
import type { Employee } from "../types/database";
import { cn } from "../lib/utils";

type Mode = "issue" | "return";
type SubStep = "badge" | "items";

interface LogEntry {
  id: string;
  item: EquipmentItemRow;
  issuanceId?: string;
  action: "issued" | "returned";
  defective: boolean;
  pending?: boolean;
}

export function IssuancePage() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [subStep, setSubStep] = useState<SubStep>("badge");
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [lostConfirm, setLostConfirm] = useState<EquipmentItemRow | null>(null);
  const [defectFor, setDefectFor] = useState<LogEntry | null>(null);
  const [inProgress, setInProgress] = useState<IssuedAtHubRow[]>([]);
  const [sortAsc, setSortAsc] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const loadInProgress = useCallback(() => {
    fetchIssuedAtHub().then(setInProgress).catch((e) => toast.error(e.message));
  }, []);

  useEffect(loadInProgress, [loadInProgress]);

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const sortedInProgress = [...inProgress].sort((a, b) => {
    const diff = new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime();
    return sortAsc ? diff : -diff;
  });

  function selectMode(m: Mode) {
    setMode(m);
    setSubStep("badge");
    setEmployee(null);
    setLog([]);
  }

  function resetEmployee() {
    setSubStep("badge");
    setEmployee(null);
    setLog([]);
  }

  async function handleBadgeScan(code: string) {
    const command = matchScanCommand(code);
    if (command === "ISSUE" || command === "RETURN") {
      selectMode(command === "ISSUE" ? "issue" : "return");
      return;
    }
    try {
      const emp = await findOrCreateEmployeeByBadge(code);
      setEmployee(emp);
      setSubStep("items");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function doIssue(item: EquipmentItemRow, forceLost = false) {
    if (!employee) return;
    if (item.status === "issued") {
      toast.error(`С/Н ${item.serial_number} уже выдано`);
      return;
    }
    if (item.status === "in_repair") {
      toast.error(`С/Н ${item.serial_number} сейчас в ремонте`);
      return;
    }
    if (item.status === "transferred") {
      toast.error(`С/Н ${item.serial_number} сейчас на другом ЛО`);
      return;
    }
    if (item.status === "defective") {
      toast.error(`С/Н ${item.serial_number} помечено как дефектное — выдача недоступна`);
      return;
    }
    if (item.storage_locations?.name !== HUB_LOCATION_NAME) {
      toast.error(
        `С/Н ${item.serial_number} находится не на МХ ${HUB_LOCATION_NAME} (${item.storage_locations?.name ?? "МХ не задано"}) — выдача недоступна`
      );
      return;
    }
    if (item.status === "lost" && !forceLost) {
      setLostConfirm(item);
      return;
    }
    const tempId = crypto.randomUUID();
    setLog((prev) => [
      { id: tempId, item: { ...item, status: "issued" }, action: "issued", defective: false, pending: true },
      ...prev,
    ]);
    try {
      await createIssuance(item.id, employee.id);
      setLog((prev) => prev.map((e) => (e.id === tempId ? { ...e, pending: false } : e)));
      toast.success(`Выдано: ${item.serial_number}`);
      loadInProgress();
    } catch (e: any) {
      setLog((prev) => prev.filter((e) => e.id !== tempId));
      toast.error(e.message);
    }
  }

  async function doReturn(item: EquipmentItemRow) {
    if (!employee) return;
    const tempId = crypto.randomUUID();
    setLog((prev) => [
      {
        id: tempId,
        item: { ...item, status: "in_stock" },
        action: "returned",
        defective: false,
        pending: true,
      },
      ...prev,
    ]);
    try {
      const issuance = await findActiveIssuance(item.id);
      if (!issuance) {
        setLog((prev) => prev.filter((e) => e.id !== tempId));
        toast.error(`С/Н ${item.serial_number} не числится выданным`);
        return;
      }
      if (issuance.employee_id !== employee.id) {
        setLog((prev) => prev.filter((e) => e.id !== tempId));
        toast.error(
          `Выдано другому сотруднику — для сдачи нужен тот же бейдж, который получал`
        );
        return;
      }
      await returnIssuance(issuance.id, item.id, false);
      setLog((prev) =>
        prev.map((e) => (e.id === tempId ? { ...e, issuanceId: issuance.id, pending: false } : e))
      );
      toast.success(`Сдано: ${item.serial_number}`);
      loadInProgress();
    } catch (e: any) {
      setLog((prev) => prev.filter((e) => e.id !== tempId));
      toast.error(e.message);
    }
  }

  async function handleSerialScan(code: string) {
    const command = matchScanCommand(code);
    if (command === "NEXT") {
      resetEmployee();
      return;
    }
    if (command === "ISSUE" || command === "RETURN") {
      selectMode(command === "ISSUE" ? "issue" : "return");
      return;
    }
    try {
      const item = await findEquipmentItemBySerial(code);
      if (!item) {
        toast.error(`С/Н ${code} не найдено в инвентаре`);
        return;
      }
      if (mode === "issue") await doIssue(item);
      else await doReturn(item);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleDefectSubmit(draft: DefectDraft) {
    if (!defectFor?.issuanceId) return;
    try {
      const defect = await createDefect({
        issuanceId: defectFor.issuanceId,
        equipmentItemId: defectFor.item.id,
        reportedEmployeeCode: draft.reportedEmployeeCode || null,
        note: draft.note || undefined,
      });
      if (draft.file) {
        const path = `defects/${defect.id}/${draft.file.name}`;
        const { error } = await uploadEquipmentFile(path, draft.file);
        if (!error) await attachDefectExplanation(defect.id, getEquipmentFileUrl(path));
      }
      setLog((prev) =>
        prev.map((e) => (e.id === defectFor.id ? { ...e, defective: true } : e))
      );
      toast.success("Дефект зафиксирован");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDefectFor(null);
    }
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <h1 className="text-xl font-semibold">Выдача</h1>

      <div className="flex gap-3">
        <div
          className={cn(
            "relative flex flex-1 items-center justify-center rounded-xl border transition-colors",
            mode === "issue"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card hover:border-primary/40 hover:bg-primary/5"
          )}
        >
          <button
            onClick={() => selectMode("issue")}
            className="flex flex-1 items-center justify-center gap-2 p-4 text-base font-semibold"
          >
            <ArrowUpFromLine className="size-5" /> Получить
          </button>
          <div className="pr-2">
            <QrButton command="ISSUE" label="Получить" />
          </div>
        </div>
        <div
          className={cn(
            "relative flex flex-1 items-center justify-center rounded-xl border transition-colors",
            mode === "return"
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-border bg-card hover:border-blue-600/40 hover:bg-blue-600/5"
          )}
        >
          <button
            onClick={() => selectMode("return")}
            className="flex flex-1 items-center justify-center gap-2 p-4 text-base font-semibold"
          >
            <ArrowDownToLine className="size-5" /> Сдать
          </button>
          <div className="pr-2">
            <QrButton command="RETURN" label="Сдать" />
          </div>
        </div>
      </div>

      {!mode && (
        <p className="text-sm text-muted-foreground">Выберите действие — «Получить» или «Сдать»</p>
      )}

      {mode && subStep === "badge" && (
        <Card className="max-w-md p-4">
          <p className="mb-3 text-sm text-muted-foreground">
            {mode === "issue" ? "Получает:" : "Сдаёт:"} отсканируйте бейдж сотрудника
          </p>
          <ScanInput placeholder="Бейдж сотрудника…" onScan={handleBadgeScan} autoFocusKey={`badge-${mode}`} />
        </Card>
      )}

      {mode && subStep === "items" && employee && (
        <div className="flex flex-col gap-4">
          <Card className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {mode === "issue" ? "Выдаём" : "Принимаем от"}
              </p>
              <p className="font-mono font-semibold">{employee.badge_code}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" onClick={resetEmployee}>
                Готово / другой сотрудник
              </Button>
              <QrButton command="NEXT" label="Готово / другой сотрудник" />
            </div>
          </Card>

          <ScanInput
            placeholder="Серийный номер оборудования…"
            onScan={handleSerialScan}
            autoFocusKey={`${mode}-${employee.id}-${log.length}`}
          />

          <div className="flex flex-col gap-2">
            {log.map((entry) => (
              <div
                key={entry.id}
                className={cn(
                  "flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 transition-opacity",
                  entry.pending && "opacity-50"
                )}
              >
                <div className="flex items-center gap-3">
                  {entry.pending ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : entry.defective ? (
                    <AlertTriangle className="size-4 text-destructive" />
                  ) : (
                    <CheckCircle2 className="size-4 text-success" />
                  )}
                  <div>
                    <p className="font-mono text-sm">{entry.item.serial_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.pending
                        ? "Обработка…"
                        : entry.action === "issued"
                          ? "Выдано"
                          : entry.defective
                            ? "Сдано с дефектом"
                            : "Сдано"}
                    </p>
                  </div>
                </div>
                {!entry.pending && entry.action === "returned" && !entry.defective && (
                  <Button variant="destructive" size="sm" onClick={() => setDefectFor(entry)}>
                    Есть дефект
                  </Button>
                )}
              </div>
            ))}
            {log.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Отсканируйте серийный номер оборудования
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mt-2 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">В работе</h2>
          <Button variant="ghost" size="sm" onClick={loadInProgress}>
            <RotateCcw className="size-3.5" /> Обновить
          </Button>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-xs font-medium uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">С/Н</th>
                <th className="px-4 py-2.5">Оборудование</th>
                <th className="px-4 py-2.5">Бейдж</th>
                <th
                  className="cursor-pointer select-none px-4 py-2.5 hover:text-foreground"
                  onClick={() => setSortAsc((v) => !v)}
                >
                  Выдано {sortAsc ? "↑" : "↓"}
                </th>
                <th className="px-4 py-2.5">Часов в работе</th>
              </tr>
            </thead>
            <tbody>
              {sortedInProgress.map((row) => {
                const hoursElapsed = (nowTick - new Date(row.issuedAt).getTime()) / 3_600_000;
                const overdue = hoursElapsed > 12;
                return (
                  <tr key={row.issuanceId} className="border-t border-border">
                    <td className="px-4 py-2.5 font-mono">{row.serial}</td>
                    <td className="px-4 py-2.5">{row.modelName}</td>
                    <td className="px-4 py-2.5 font-mono">{row.employeeBadge}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {new Date(row.issuedAt).toLocaleString("ru-RU")}
                    </td>
                    <td className={cn("px-4 py-2.5 font-medium", overdue ? "text-destructive" : "text-muted-foreground")}>
                      {Math.floor(Math.max(hoursElapsed, 0))} ч
                    </td>
                  </tr>
                );
              })}
              {inProgress.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Сейчас ничего не выдано
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={Boolean(lostConfirm)} onOpenChange={(o) => !o && setLostConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="size-5 text-destructive" /> Оборудование числится утерянным
            </DialogTitle>
            <DialogDescription>
              С/Н {lostConfirm?.serial_number} отмечено как утерянное. Всё равно выдать?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLostConfirm(null)}>
              Отмена
            </Button>
            <Button
              onClick={() => {
                if (lostConfirm) doIssue(lostConfirm, true);
                setLostConfirm(null);
              }}
            >
              Выдать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DefectDialog
        open={Boolean(defectFor)}
        serial={defectFor?.item.serial_number ?? ""}
        onOpenChange={(o) => !o && setDefectFor(null)}
        onSubmit={handleDefectSubmit}
      />
    </div>
  );
}

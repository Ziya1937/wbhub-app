import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wrench, Undo2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { RepairDetailDialog } from "../components/RepairDetailDialog";
import { DeleteWithCodeButton } from "../components/DeleteWithCodeButton";
import { createEmptyRepair, deleteRepair, fetchRepairs, returnFromExternal, type RepairRow } from "../lib/queries";
import { useCachedList } from "../lib/cache";

export function RepairsPage() {
  const [repairs, setRepairs] = useCachedList<RepairRow>("repairs:list");
  const [openRepairId, setOpenRepairId] = useState<string | null>(null);

  function load() {
    fetchRepairs().then(setRepairs).catch((e) => toast.error(e.message));
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

  async function handleCreate() {
    try {
      const repair = await createEmptyRepair();
      load();
      setOpenRepairId(repair.id);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">На ремонт</h1>
        <Button onClick={handleCreate}>
          <Wrench className="size-4" /> Создать отправку
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {repairs.map((r) => (
          <Card
            key={r.id}
            className="cursor-pointer p-4 hover:bg-secondary/40"
            onClick={() => setOpenRepairId(r.id)}
          >
            <div className="flex items-center justify-between">
              <p className="font-medium">{r.lo_name || "Без названия ЛО"}</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("ru-RU")}
                </p>
                <DeleteWithCodeButton
                  what={`отправку в ремонт «${r.lo_name || "без названия"}»`}
                  onConfirm={async () => {
                    await deleteRepair(r);
                    load();
                  }}
                />
              </div>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {r.transfer_code && <>Передача: {r.transfer_code} · </>}
              Единиц: {r.repair_items.length}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {r.repair_items.map((ri, idx) => {
                const eq = ri.equipment_items;
                const stillInRepair = eq?.status === "in_repair";
                return (
                  <span
                    key={idx}
                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-xs ${
                      stillInRepair ? "bg-secondary" : "bg-success/10 text-success line-through"
                    }`}
                  >
                    {eq?.serial_number}
                    {stillInRepair && eq && (
                      <button
                        title="Вернуть из ремонта"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReturn(eq.id, eq.serial_number);
                        }}
                        className="ml-0.5 hover:opacity-70"
                      >
                        <Undo2 className="size-3" />
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
            {r.photo_url && (
              <a
                href={r.photo_url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="mt-2 inline-block text-sm text-primary hover:underline"
              >
                Фото
              </a>
            )}
          </Card>
        ))}
        {repairs.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Отправок пока не было</p>
        )}
      </div>

      <RepairDetailDialog
        repairId={openRepairId}
        onOpenChange={(o) => !o && setOpenRepairId(null)}
        onChanged={load}
      />
    </div>
  );
}

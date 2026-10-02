import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { fetchAggregateCounts, type AggregateRow } from "../lib/queries";

export function AggregatePage({ onBack }: { onBack: () => void }) {
  const [rows, setRows] = useState<AggregateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    fetchAggregateCounts()
      .then(setRows)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  const types = useMemo(() => Array.from(new Set(rows.map((r) => r.type_name))).sort(), [rows]);

  const filtered = typeFilter === "all" ? rows : rows.filter((r) => r.type_name === typeFilter);

  const byBase = useMemo(() => {
    const map = new Map<string, { baseName: string; total: number }>();
    for (const r of filtered) {
      const entry = map.get(r.base_id) ?? { baseName: r.base_name, total: 0 };
      entry.total += r.total;
      map.set(r.base_id, entry);
    }
    return Array.from(map.entries())
      .map(([baseId, v]) => ({ baseId, ...v }))
      .sort((a, b) => a.baseName.localeCompare(b.baseName));
  }, [filtered]);

  const grandTotal = byBase.reduce((sum, b) => sum + b.total, 0);

  function handleExport() {
    const sheetData = byBase.map((b) => ({ "ЛО": b.baseName, "Кол-во оборудования": b.total }));
    sheetData.push({ "ЛО": "Итого", "Кол-во оборудования": grandTotal });
    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Сводная");
    XLSX.writeFile(wb, `wbhub-svodnaya-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="flex min-h-screen flex-col gap-5 bg-background p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="rounded-md p-1.5 hover:bg-secondary">
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="text-xl font-semibold">Общая сводная по всем ЛО</h1>
        </div>
        <Button onClick={handleExport} disabled={loading || byBase.length === 0}>
          <Download className="size-4" /> Скачать Excel
        </Button>
      </div>

      <Select value={typeFilter} onValueChange={setTypeFilter}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Вид оборудования" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все виды</SelectItem>
          {types.map((t) => (
            <SelectItem key={t} value={t}>
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left text-xs font-medium uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">ЛО</th>
              <th className="px-4 py-3">Кол-во оборудования</th>
            </tr>
          </thead>
          <tbody>
            {byBase.map((b) => (
              <tr key={b.baseId} className="border-t border-border">
                <td className="px-4 py-3">{b.baseName}</td>
                <td className="px-4 py-3 font-medium">{b.total}</td>
              </tr>
            ))}
            {!loading && byBase.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-10 text-center text-muted-foreground">
                  Данных нет
                </td>
              </tr>
            )}
          </tbody>
          {byBase.length > 0 && (
            <tfoot>
              <tr className="border-t border-border bg-secondary/60 font-semibold">
                <td className="px-4 py-3">Итого</td>
                <td className="px-4 py-3">{grandTotal}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

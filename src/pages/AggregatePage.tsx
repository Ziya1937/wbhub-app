import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { fetchAggregateCounts, type AggregateRow } from "../lib/queries";

const ALL = "all";

export function AggregatePage({ onBack }: { onBack: () => void }) {
  const [rows, setRows] = useState<AggregateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [baseFilter, setBaseFilter] = useState(ALL);
  const [typeFilter, setTypeFilter] = useState(ALL);

  useEffect(() => {
    fetchAggregateCounts()
      .then(setRows)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  const bases = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) map.set(r.base_id, r.base_name);
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const types = useMemo(() => Array.from(new Set(rows.map((r) => r.type_name))).sort(), [rows]);

  const filtered = rows.filter(
    (r) =>
      (baseFilter === ALL || r.base_id === baseFilter) && (typeFilter === ALL || r.type_name === typeFilter)
  );

  // Строки таблицы: при "общее" — по каждому ЛО, при выбранном ЛО — по видам оборудования
  const tableRows = useMemo(() => {
    if (baseFilter === ALL) {
      const map = new Map<string, { label: string; total: number }>();
      for (const r of filtered) {
        const entry = map.get(r.base_id) ?? { label: r.base_name, total: 0 };
        entry.total += Number(r.total);
        map.set(r.base_id, entry);
      }
      return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
    }
    const map = new Map<string, { label: string; total: number }>();
    for (const r of filtered) {
      const entry = map.get(r.type_name) ?? { label: r.type_name, total: 0 };
      entry.total += Number(r.total);
      map.set(r.type_name, entry);
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [filtered, baseFilter]);

  const grandTotal = tableRows.reduce((sum, r) => sum + r.total, 0);
  const columnLabel = baseFilter === ALL ? "ЛО" : "Вид оборудования";
  const totalLabel = baseFilter === ALL ? "Итого по всем ЛО" : "Итого";

  function handleExport() {
    const sheetData = tableRows.map((r) => ({ [columnLabel]: r.label, "Кол-во оборудования": r.total }));
    sheetData.push({ [columnLabel]: totalLabel, "Кол-во оборудования": grandTotal });
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
        <Button onClick={handleExport} disabled={loading || tableRows.length === 0}>
          <Download className="size-4" /> Скачать Excel
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={baseFilter} onValueChange={setBaseFilter}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="ЛО" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Общее (все ЛО)</SelectItem>
            {bases.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Вид оборудования" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Все виды</SelectItem>
            {types.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left text-xs font-medium uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">{columnLabel}</th>
              <th className="px-4 py-3">Кол-во оборудования</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((r) => (
              <tr key={r.label} className="border-t border-border">
                <td className="px-4 py-3">{r.label}</td>
                <td className="px-4 py-3 font-medium">{r.total}</td>
              </tr>
            ))}
            {!loading && tableRows.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-10 text-center text-muted-foreground">
                  Данных нет
                </td>
              </tr>
            )}
          </tbody>
          {tableRows.length > 0 && (
            <tfoot>
              <tr className="border-t border-border bg-secondary/60 font-semibold">
                <td className="px-4 py-3">{totalLabel}</td>
                <td className="px-4 py-3">{grandTotal}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { fetchGlobalHistory, type GlobalHistoryEvent } from "../lib/queries";
import { useCachedList } from "../lib/cache";
import { SortableTh } from "../components/SortableTh";

type SortKey = "date" | "serial" | "kind" | "description";

const KIND_LABEL: Record<GlobalHistoryEvent["kind"], string> = {
  issued: "Выдача",
  returned: "Сдача",
  defect: "Дефект",
  inventory: "Инвент",
  repair: "Ремонт",
  transfer: "Перемещение",
};

const KIND_VARIANT: Record<GlobalHistoryEvent["kind"], "primary" | "success" | "destructive" | "warning" | "default"> = {
  issued: "primary",
  returned: "success",
  defect: "destructive",
  inventory: "default",
  repair: "warning",
  transfer: "warning",
};

const SORT_VALUE: Record<SortKey, (e: GlobalHistoryEvent) => string> = {
  date: (e) => e.date,
  serial: (e) => e.serial,
  kind: (e) => KIND_LABEL[e.kind],
  description: (e) => e.description,
};

export function HistoryPage() {
  const [serial, setSerial] = useState("");
  const [events, setEvents] = useCachedList<GlobalHistoryEvent>("history:list");
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((a) => !a);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  const displayedEvents = sortKey
    ? [...events].sort((a, b) => {
        const cmp = SORT_VALUE[sortKey](a).localeCompare(SORT_VALUE[sortKey](b));
        return sortAsc ? cmp : -cmp;
      })
    : events;

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      fetchGlobalHistory(serial || undefined)
        .then(setEvents)
        .catch((e) => toast.error(e.message))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [serial]);

  return (
    <div className="flex flex-col gap-5 p-6">
      <h1 className="text-xl font-semibold">История оборудования</h1>

      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Поиск по с/н…" className="pl-9" value={serial} onChange={(e) => setSerial(e.target.value)} />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left text-xs font-medium uppercase text-muted-foreground">
            <tr>
              <SortableTh label="Дата" active={sortKey === "date"} asc={sortAsc} onClick={() => toggleSort("date")} />
              <SortableTh label="С/Н" active={sortKey === "serial"} asc={sortAsc} onClick={() => toggleSort("serial")} />
              <SortableTh label="Событие" active={sortKey === "kind"} asc={sortAsc} onClick={() => toggleSort("kind")} />
              <SortableTh label="Описание" active={sortKey === "description"} asc={sortAsc} onClick={() => toggleSort("description")} />
            </tr>
          </thead>
          <tbody>
            {displayedEvents.map((ev) => (
              <tr key={ev.id} className="border-t border-border">
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {new Date(ev.date).toLocaleString("ru-RU")}
                </td>
                <td className="px-4 py-3 font-mono">{ev.serial}</td>
                <td className="px-4 py-3">
                  <Badge variant={KIND_VARIANT[ev.kind]}>{KIND_LABEL[ev.kind]}</Badge>
                </td>
                <td className="px-4 py-3">{ev.description}</td>
              </tr>
            ))}
            {!loading && events.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  Событий нет
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

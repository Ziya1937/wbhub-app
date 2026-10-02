import { useState } from "react";
import { Paperclip } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export interface DefectDraft {
  reportedEmployeeCode: string;
  note: string;
  file: File | null;
}

export function DefectDialog({
  open,
  serial,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  serial: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: DefectDraft) => void;
}) {
  const [reportedEmployeeCode, setReportedEmployeeCode] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);

  function handleSubmit() {
    onSubmit({ reportedEmployeeCode, note, file });
    setReportedEmployeeCode("");
    setNote("");
    setFile(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Дефект — с/н {serial}</DialogTitle>
          <DialogDescription>
            Объяснительную можно приложить сейчас или позже, в разделе «Инвентарь».
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium">ID сотрудника</label>
            <Input value={reportedEmployeeCode} onChange={(e) => setReportedEmployeeCode(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Примечание</label>
            <textarea
              className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Объяснительная (опционально)</label>
            <label>
              <input
                type="file"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <span className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-input bg-card px-3 py-1.5 text-sm font-medium hover:bg-secondary">
                <Paperclip className="size-3.5" />
                {file ? file.name : "Прикрепить файл"}
              </span>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button variant="destructive" onClick={handleSubmit}>
            Зафиксировать дефект
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

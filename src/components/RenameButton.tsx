import { useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function RenameButton({
  what,
  initialValue,
  onConfirm,
  className,
}: {
  what: string;
  initialValue: string;
  onConfirm: (newName: string) => void | Promise<void>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  function close() {
    setOpen(false);
  }

  async function handleConfirm() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === initialValue) {
      close();
      return;
    }
    setSaving(true);
    try {
      await onConfirm(trimmed);
      toast.success("Переименовано");
      close();
    } catch (e: any) {
      toast.error(e.message ?? "Не удалось переименовать");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        title="Переименовать"
        onClick={(e) => {
          e.stopPropagation();
          setValue(initialValue);
          setOpen(true);
        }}
        className={className ?? "rounded-md p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary"}
      >
        <Pencil className="size-4" />
      </button>

      <Dialog open={open} onOpenChange={(o) => !o && close()}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Переименовать — {what}</DialogTitle>
          </DialogHeader>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Отмена
            </Button>
            <Button disabled={saving || !value.trim()} onClick={handleConfirm}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

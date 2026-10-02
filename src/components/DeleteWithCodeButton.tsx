import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const DELETE_CODE = "11235813";

export function DeleteWithCodeButton({
  what,
  onConfirm,
  className,
  label,
}: {
  what: string;
  onConfirm: () => void | Promise<void>;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [deleting, setDeleting] = useState(false);

  function close() {
    setOpen(false);
    setCode("");
  }

  async function handleConfirm() {
    if (code !== DELETE_CODE) {
      toast.error("Неверный код удаления");
      return;
    }
    setDeleting(true);
    try {
      await onConfirm();
      toast.success("Удалено");
      close();
    } catch (e: any) {
      toast.error(e.message ?? "Не удалось удалить");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        title="Удалить"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={className ?? "rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"}
      >
        <Trash2 className="size-4" />
        {label}
      </button>

      <Dialog open={open} onOpenChange={(o) => !o && close()}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Удалить — {what}</DialogTitle>
            <DialogDescription>Введите код удаления, чтобы подтвердить.</DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            placeholder="Код удаления"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Отмена
            </Button>
            <Button variant="destructive" disabled={deleting} onClick={handleConfirm}>
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

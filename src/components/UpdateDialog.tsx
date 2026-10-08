import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";

export function UpdateDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    window.wbhub?.isUpdateReady().then((ready) => ready && setOpen(true));
    return window.wbhub?.onUpdateDownloaded(() => setOpen(true));
  }, []);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="size-5 text-primary" /> Доступно обновление
          </DialogTitle>
          <DialogDescription>
            Новая версия WB Hub загружена и готова к установке. Приложение перезапустится само.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => window.wbhub?.installUpdate()}>Обновить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

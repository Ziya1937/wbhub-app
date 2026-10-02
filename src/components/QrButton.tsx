import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { SCAN_COMMANDS, type ScanCommand } from "../lib/scanCommands";

export function QrButton({ command, label }: { command: ScanCommand; label: string }) {
  const [open, setOpen] = useState(false);
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(SCAN_COMMANDS[command], { width: 320, margin: 1 }).then(setDataUrl);
  }, [open, command]);

  return (
    <>
      <button
        type="button"
        title={`QR-код для «${label}»`}
        onClick={() => setOpen(true)}
        className="rounded-md p-1.5 text-current/70 hover:bg-black/10"
      >
        <QrCode className="size-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR-код — {label}</DialogTitle>
          </DialogHeader>

          <div className="qr-print-area flex flex-col items-center gap-3 py-2">
            {dataUrl && <img src={dataUrl} alt={label} className="size-72" />}
            <p className="text-center text-sm font-medium">{label}</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="size-4" /> Печать
            </Button>
            <Button onClick={() => setOpen(false)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

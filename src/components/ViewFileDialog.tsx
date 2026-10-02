import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { ExternalLink } from "lucide-react";

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;

export function ViewFileDialog({
  url,
  onOpenChange,
}: {
  url: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const isImage = url ? IMAGE_EXT.test(url) : false;

  return (
    <Dialog open={Boolean(url)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Объяснительная</DialogTitle>
        </DialogHeader>

        {url && isImage && (
          <img src={url} alt="Объяснительная" className="max-h-[60vh] w-full rounded-md object-contain" />
        )}
        {url && !isImage && (
          <p className="text-sm text-muted-foreground">
            Предпросмотр недоступен для этого типа файла — откройте его отдельно.
          </p>
        )}

        <DialogFooter>
          {url && (
            <a href={url} target="_blank" rel="noreferrer">
              <Button variant="outline">
                <ExternalLink className="size-4" /> Открыть в новой вкладке
              </Button>
            </a>
          )}
          <Button onClick={() => onOpenChange(false)}>Закрыть</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

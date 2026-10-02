import { useEffect, useRef, useState } from "react";
import { ScanLine } from "lucide-react";
import { Input } from "./ui/input";
import { cn } from "../lib/utils";

/**
 * USB/Bluetooth-сканеры штрихкодов эмулируют клавиатуру: достаточно держать
 * фокус в текстовом поле — сканер «печатает» код и завершает Enter'ом.
 * Этот компонент держит себя всегда в фокусе на активном шаге и работает
 * одинаково для сканера и для ручного набора.
 */
export function ScanInput({
  placeholder,
  onScan,
  autoFocusKey,
  className,
}: {
  placeholder: string;
  onScan: (code: string) => void;
  /** Меняйте ключ при смене шага, чтобы поле снова получило фокус */
  autoFocusKey?: string | number;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, [autoFocusKey]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const code = value.trim();
    if (!code) return;
    onScan(code);
    setValue("");
  }

  return (
    <div className="relative">
      <ScanLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={ref}
        autoFocus
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className={cn("pl-9", className)}
      />
    </div>
  );
}

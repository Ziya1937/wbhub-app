export function SortableTh({
  label,
  active,
  asc,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  asc: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <th
      className={className ?? "cursor-pointer select-none px-4 py-3 hover:text-foreground"}
      onClick={onClick}
    >
      {label} {active ? (asc ? "↑" : "↓") : ""}
    </th>
  );
}

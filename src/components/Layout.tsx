import { NavLink, Outlet } from "react-router-dom";
import { ArrowRightLeft, Boxes, History, ClipboardCheck, Wrench, Send } from "lucide-react";
import { cn } from "../lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Выдача", icon: ArrowRightLeft, end: true },
  { to: "/inventory", label: "Инвентарь", icon: Boxes },
  { to: "/history", label: "История оборудования", icon: History },
  { to: "/audits", label: "Инвент", icon: ClipboardCheck },
  { to: "/repairs", label: "На ремонт", icon: Wrench },
  { to: "/transfers", label: "Перемещение на ЛО", icon: Send },
];

export function Layout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <aside className="flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
            WB
          </div>
          <span className="text-sm font-semibold text-white">WB Hub</span>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-white/5 hover:text-white"
                )
              }
            >
              <item.icon className="size-5 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

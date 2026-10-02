import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { ArrowRightLeft, Boxes, History, ClipboardCheck, Wrench, Send, Menu, LogOut } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { cn } from "../lib/utils";
import { getCurrentBase, clearBase } from "../lib/baseContext";

const NAV_ITEMS = [
  { to: "/", label: "Выдача", icon: ArrowRightLeft, end: true },
  { to: "/inventory", label: "Инвентарь", icon: Boxes },
  { to: "/history", label: "История оборудования", icon: History },
  { to: "/audits", label: "Инвент", icon: ClipboardCheck },
  { to: "/repairs", label: "На ремонт", icon: Wrench },
  { to: "/transfers", label: "Перемещение на ЛО", icon: Send },
];

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const base = getCurrentBase();

  function handleSwitchBase() {
    clearBase();
    window.location.reload();
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-sidebar px-4 py-3 text-sidebar-foreground">
        <button
          onClick={() => setMenuOpen(true)}
          className="rounded-md p-1.5 hover:bg-white/10"
          title="Меню"
        >
          <Menu className="size-5" />
        </button>
        <div className="flex size-7 items-center justify-center rounded-lg bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
          WB
        </div>
        <span className="text-sm font-semibold text-white">WB Hub</span>
        {base && <span className="ml-2 text-xs text-sidebar-foreground/60">· {base.name}</span>}
      </header>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent className="left-0 top-0 flex h-full max-w-72 flex-col translate-x-0 translate-y-0 rounded-none border-y-0 border-l-0 bg-sidebar p-0 text-sidebar-foreground">
          <div className="flex items-center gap-2 px-5 py-5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
              WB
            </div>
            <DialogTitle className="text-sm font-semibold text-white">WB Hub</DialogTitle>
          </div>
          {base && (
            <p className="px-5 pb-3 text-xs text-sidebar-foreground/60">База: {base.name}</p>
          )}
          <nav className="flex flex-col gap-1 px-3">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMenuOpen(false)}
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
          <div className="mt-auto border-t border-sidebar-border px-3 py-3">
            <button
              onClick={handleSwitchBase}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 hover:bg-white/5 hover:text-white"
            >
              <LogOut className="size-5 shrink-0" />
              Сменить базу
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

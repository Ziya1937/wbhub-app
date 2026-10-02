import { useState } from "react";
import { toast } from "sonner";
import { LogIn, Plus, BarChart3 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { cn } from "../lib/utils";
import { createBase, fetchBaseName, verifyBase } from "../lib/queries";
import { setCurrentBase } from "../lib/baseContext";

const ID_PATTERN = /^[a-zA-Z0-9_-]{3,32}$/;

export function BaseSelectPage({
  onSelected,
  onAggregate,
}: {
  onSelected: () => void;
  onAggregate: () => void;
}) {
  const [mode, setMode] = useState<"login" | "create">("login");

  // Вход
  const [loginId, setLoginId] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [remember, setRemember] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);

  // Создание
  const [createName, setCreateName] = useState("");
  const [createId, setCreateId] = useState("");
  const [createCode, setCreateCode] = useState("");
  const [createCodeConfirm, setCreateCodeConfirm] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleLogin() {
    if (!loginId.trim() || !loginCode) return;
    setLoggingIn(true);
    try {
      const ok = await verifyBase(loginId.trim(), loginCode);
      if (!ok) {
        toast.error("Неверный ID или код");
        return;
      }
      const name = (await fetchBaseName(loginId.trim())) ?? loginId.trim();
      setCurrentBase({ id: loginId.trim(), name }, remember);
      onSelected();
    } catch (e: any) {
      toast.error(e.message ?? "Не удалось войти");
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleCreate() {
    if (!createName.trim() || !createId.trim() || !createCode) return;
    if (!ID_PATTERN.test(createId.trim())) {
      toast.error("ID: только латиница, цифры, - и _, от 3 до 32 символов");
      return;
    }
    if (createCode !== createCodeConfirm) {
      toast.error("Коды не совпадают");
      return;
    }
    if (createCode.length < 4) {
      toast.error("Код должен быть не короче 4 символов");
      return;
    }
    setCreating(true);
    try {
      await createBase(createId.trim(), createName.trim(), createCode);
      setCurrentBase({ id: createId.trim(), name: createName.trim() }, true);
      toast.success(`База создана. ID: ${createId.trim()} — сохраните его`);
      onSelected();
    } catch (e: any) {
      toast.error(e.message ?? "Не удалось создать базу");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="flex w-full max-w-md flex-col gap-5">
        <div className="text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground">
            WB
          </div>
          <h1 className="text-xl font-semibold">WB Hub</h1>
          <p className="text-sm text-muted-foreground">Выберите базу (ЛО) для входа</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setMode("login")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg border p-2.5 text-sm font-medium transition-colors",
              mode === "login"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-secondary/60"
            )}
          >
            <LogIn className="size-4" /> Войти
          </button>
          <button
            onClick={() => setMode("create")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg border p-2.5 text-sm font-medium transition-colors",
              mode === "create"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-secondary/60"
            )}
          >
            <Plus className="size-4" /> Создать
          </button>
        </div>

        <Card className="p-5">
          {mode === "login" ? (
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">ID базы</label>
                <Input value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="например, sklad-kuznetsk" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Код</label>
                <Input
                  type="password"
                  value={loginCode}
                  onChange={(e) => setLoginCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                Запомнить выбор
              </label>
              <Button disabled={!loginId.trim() || !loginCode || loggingIn} onClick={handleLogin}>
                Войти
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Название базы</label>
                <Input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="например, Склад Кузнецк" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">ID базы (придумайте)</label>
                <Input
                  value={createId}
                  onChange={(e) => setCreateId(e.target.value)}
                  placeholder="латиница/цифры, 3-32 символа"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Код доступа</label>
                <Input type="password" value={createCode} onChange={(e) => setCreateCode(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Повторите код</label>
                <Input
                  type="password"
                  value={createCodeConfirm}
                  onChange={(e) => setCreateCodeConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
              <Button
                disabled={!createName.trim() || !createId.trim() || !createCode || creating}
                onClick={handleCreate}
              >
                Создать базу
              </Button>
            </div>
          )}
        </Card>

        <button
          onClick={onAggregate}
          className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card p-3 text-sm font-medium text-muted-foreground hover:bg-secondary/60"
        >
          <BarChart3 className="size-4" /> Общая сводная по всем ЛО (без кода)
        </button>
      </div>
    </div>
  );
}

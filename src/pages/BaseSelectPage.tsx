import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogIn, Plus, BarChart3, KeyRound } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { DeleteWithCodeButton } from "../components/DeleteWithCodeButton";
import { cn } from "../lib/utils";
import {
  createBase,
  deleteBase,
  fetchBaseName,
  listBases,
  setBaseCode,
  verifyBase,
  type BaseOption,
} from "../lib/queries";
import { setCurrentBase } from "../lib/baseContext";

const ID_PATTERN = /^[a-zA-Z0-9_-]{3,32}$/;
const DELETE_CODE = "11235813";

export function BaseSelectPage({
  onSelected,
  onAggregate,
}: {
  onSelected: () => void;
  onAggregate: () => void;
}) {
  const [mode, setMode] = useState<"login" | "create">("login");
  const [bases, setBases] = useState<BaseOption[]>([]);

  const [loginId, setLoginId] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [remember, setRemember] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);

  const [createName, setCreateName] = useState("");
  const [createId, setCreateId] = useState("");
  const [createCode, setCreateCode] = useState("");
  const [createCodeConfirm, setCreateCodeConfirm] = useState("");
  const [creating, setCreating] = useState(false);

  function reloadBases() {
    listBases().then(setBases).catch((e) => toast.error(e.message));
  }

  useEffect(reloadBases, []);

  async function handleLogin() {
    const id = loginId.trim();
    if (!id || !loginCode) return;
    setLoggingIn(true);
    try {
      const ok = await verifyBase(id, loginCode);
      if (!ok) {
        toast.error("Неверный ID или код");
        return;
      }
      const name = (await fetchBaseName(id)) ?? id;
      setCurrentBase({ id, name }, remember);
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
      toast.success(`ЛО создано. ID: ${createId.trim()} — сохраните его`);
      onSelected();
    } catch (e: any) {
      toast.error(e.message ?? "Не удалось создать ЛО");
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
          <p className="text-sm text-muted-foreground">Выберите ЛО для входа</p>
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
                <label className="mb-1.5 block text-sm font-medium">ID ЛО</label>
                <Input
                  list="bases-list"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="например, 117230"
                />
                <datalist id="bases-list">
                  {bases.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </datalist>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Пароль</label>
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
                <label className="mb-1.5 block text-sm font-medium">Название ЛО</label>
                <Input value={createName} onChange={(e) => setCreateName(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">ID ЛО</label>
                <Input
                  value={createId}
                  onChange={(e) => setCreateId(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Пароль</label>
                <Input type="password" value={createCode} onChange={(e) => setCreateCode(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Повторите пароль</label>
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
                Создать ЛО
              </Button>
            </div>
          )}
        </Card>

        {bases.length > 0 && (
          <Card className="flex flex-col divide-y divide-border">
            {bases.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{b.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{b.id}</p>
                </div>
                <div className="flex items-center gap-1">
                  <ChangeCodeButton
                    baseId={b.id}
                    baseName={b.name}
                    onDone={reloadBases}
                  />
                  <DeleteWithCodeButton
                    what={`ЛО «${b.name}»`}
                    onConfirm={async () => {
                      await deleteBase(b.id, DELETE_CODE);
                      reloadBases();
                    }}
                  />
                </div>
              </div>
            ))}
          </Card>
        )}

        <button
          onClick={onAggregate}
          className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card p-3 text-sm font-medium text-muted-foreground hover:bg-secondary/60"
        >
          <BarChart3 className="size-4" /> Общая сводная по всем ЛО
        </button>
      </div>
    </div>
  );
}

function ChangeCodeButton({
  baseId,
  baseName,
  onDone,
}: {
  baseId: string;
  baseName: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [deleteCode, setDeleteCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newCodeConfirm, setNewCodeConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  function close() {
    setOpen(false);
    setDeleteCode("");
    setNewCode("");
    setNewCodeConfirm("");
  }

  async function handleSave() {
    if (deleteCode !== DELETE_CODE) {
      toast.error("Неверный код удаления");
      return;
    }
    if (newCode.length < 4) {
      toast.error("Новый код должен быть не короче 4 символов");
      return;
    }
    if (newCode !== newCodeConfirm) {
      toast.error("Новые коды не совпадают");
      return;
    }
    setSaving(true);
    try {
      await setBaseCode(baseId, DELETE_CODE, newCode);
      toast.success(`Код ЛО «${baseName}» изменён`);
      close();
      onDone();
    } catch (e: any) {
      toast.error(e.message ?? "Не удалось сменить код");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        title="Сменить код"
        onClick={() => setOpen(true)}
        className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <KeyRound className="size-4" />
      </button>
      <Dialog open={open} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Сменить код — {baseName}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input
              type="password"
              placeholder="Код удаления"
              value={deleteCode}
              onChange={(e) => setDeleteCode(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Новый код"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Повторите новый код"
              value={newCodeConfirm}
              onChange={(e) => setNewCodeConfirm(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Отмена
            </Button>
            <Button disabled={saving} onClick={handleSave}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

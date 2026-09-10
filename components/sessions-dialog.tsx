"use client";

import { useState } from "react";
import { FolderOpen, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import {
  deleteSession,
  getSessions,
  getSession,
  type SessionData,
  type SessionMeta,
} from "@/lib/persistence";

type Tab = "save" | "load";

interface SessionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => void;
  onLoad: (data: SessionData) => void;
}

export function SessionsDialog({
  open,
  onOpenChange,
  onSave,
  onLoad,
}: SessionsDialogProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("load");
  const [name, setName] = useState("");
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const refresh = () => setSessions(getSessions());

  const handleOpenChange = (next: boolean) => {
    if (next) {
      refresh();
      setTab("load");
      setName("");
    }
    onOpenChange(next);
  };

  const handleDelete = (id: string) => {
    deleteSession(id);
    setConfirmDeleteId(null);
    refresh();
  };

  const formatDate = (ts: number): string => {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleLoad = (id: string) => {
    const data = getSession(id);
    if (!data) return;
    onLoad(data as SessionData);
    onOpenChange(false);
  };

  const submitSave = () => {
    onSave(name.trim());
    refresh();
    setTab("load");
    setName("");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[80vh] flex-col overflow-hidden sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.sessionsLabel}</DialogTitle>
            <DialogDescription>{t.sessionDialogDesc}</DialogDescription>
          </DialogHeader>

          <div className="inline-flex shrink-0 rounded-md border bg-muted/40 p-0.5">
            {(["load", "save"] as Tab[]).map((tb) => (
              <button
                key={tb}
                type="button"
                onClick={() => setTab(tb)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded px-4 py-1.5 text-sm font-medium transition-colors",
                  tab === tb
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-pressed={tab === tb}
              >
                {tb === "save" ? (
                  <Save className="h-4 w-4" />
                ) : (
                  <FolderOpen className="h-4 w-4" />
                )}
                {tb === "save" ? t.saveSessionLabel : t.loadSessionLabel}
              </button>
            ))}
          </div>

          {tab === "save" ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="session-name">{t.sessionName}</Label>
                <Input
                  id="session-name"
                  value={name}
                  placeholder={t.sessionNamePlaceholder}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitSave();
                  }}
                />
              </div>
              <Button className="w-full" onClick={submitSave}>
                <Save className="h-4 w-4" />
                {t.saveSessionLabel}
              </Button>
            </div>
          ) : (
            <div className="-mx-4 min-h-0 flex-1 space-y-2 overflow-y-auto px-4">
              {sessions.length === 0 && (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  {t.sessionsEmpty}
                </div>
              )}
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 ring-1 ring-foreground/10"
                >
                  <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(s.createdAt)}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => handleLoad(s.id)}>
                    {t.dialogSelect}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t.toastSessionDeleted}
                    onClick={() => setConfirmDeleteId(s.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t.dialogCancel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmDeleteId !== null}
        onOpenChange={(next) => {
          if (!next) setConfirmDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t.confirmDeleteSession.replace(
                "%s",
                sessions.find((s) => s.id === confirmDeleteId)?.name ?? ""
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.toastSessionDeleted}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.dialogCancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
            >
              {t.dialogApply}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

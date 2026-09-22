"use client";

import { KeyboardIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";

const SHOW_SHORTCUTS_EVENT = "drs:show-shortcuts";

const SHORTCUTS: { combo: string; key: string }[] = [
  { combo: "Ctrl + Shift + O", key: "shortcuts.newChat" },
  { combo: "Ctrl + K", key: "shortcuts.search" },
  { combo: "Ctrl + B", key: "shortcuts.toggleSidebar" },
  { combo: "Ctrl + /", key: "shortcuts.showHelp" },
];

function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /mac|iphone|ipad/i.test(navigator.userAgent);
}

export function ShortcutsDialog() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(isMacPlatform());

    const handleShow = () => {
      setOpen(true);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "/") {
        event.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener(SHOW_SHORTCUTS_EVENT, handleShow);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(SHOW_SHORTCUTS_EVENT, handleShow);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
  }, []);

  const modKey = isMac ? "⌘" : "Ctrl";

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="max-w-sm gap-2 rounded-2xl border-border/60 p-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            <KeyboardIcon className="size-4 text-muted-foreground" />
            {t("shortcuts.title")}
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            {t("shortcuts.subtitle")}
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-1 pt-1">
          {SHORTCUTS.map((shortcut) => (
            <li
              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[13px] transition-colors hover:bg-muted/60"
              key={shortcut.key}
            >
              <span className="text-foreground/80">{t(shortcut.key)}</span>
              <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {shortcut.combo.replace("Ctrl", modKey)}
              </kbd>
            </li>
          ))}
        </ul>
        <p className="pt-1 text-[11px] text-muted-foreground/70">
          {t("shortcuts.escToClose")}
        </p>
      </DialogContent>
    </Dialog>
  );
}

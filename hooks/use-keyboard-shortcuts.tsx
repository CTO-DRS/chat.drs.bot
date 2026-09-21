"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSidebar } from "@/components/ui/sidebar";

function isEditableTarget(target: KeyboardEvent["target"]): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();

  return (
    tagName === "input" || tagName === "textarea" || target.isContentEditable
  );
}

/**
 * Global keyboard shortcuts:
 * - Ctrl/Cmd + Shift + O  → start a new chat
 * - Ctrl/Cmd + K          → focus the sidebar chat search
 * - Ctrl/Cmd + B          → toggle sidebar
 */
export function useKeyboardShortcuts() {
  const router = useRouter();
  const { toggleSidebar } = useSidebar();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMod = event.ctrlKey || event.metaKey;

      if (!isMod) {
        return;
      }

      if (event.shiftKey && event.key.toLowerCase() === "o") {
        event.preventDefault();
        router.push("/");
        return;
      }

      if (!event.shiftKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        window.dispatchEvent(new Event("drs:focus-chat-search"));
        return;
      }

      if (!event.shiftKey && event.key.toLowerCase() === "b") {
        if (isEditableTarget(event.target)) {
          return;
        }
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, toggleSidebar]);
}

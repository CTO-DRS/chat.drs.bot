"use client";

import { MessageSquareIcon, PanelLeftIcon } from "lucide-react";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { ExportMenu } from "./export-menu";
import { VisibilitySelector, type VisibilityType } from "./visibility-selector";

function PureChatHeader({
  chatId,
  selectedVisibilityType,
  isReadonly,
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="sticky top-0 flex h-14 items-center gap-2 bg-sidebar px-3">
      <Button
        className="md:hidden"
        onClick={toggleSidebar}
        size="icon-sm"
        variant="ghost"
      >
        <PanelLeftIcon className="size-4" />
      </Button>

      <div className="flex items-center gap-2 rounded-lg px-1">
        <div className="flex size-7 items-center justify-center rounded-lg bg-foreground/5 ring-1 ring-border/40">
          <MessageSquareIcon className="size-3.5 text-sidebar-foreground/60" />
        </div>
        <span className="text-[13px] font-semibold tracking-tight text-sidebar-foreground/80">
          chat.drs.bot
        </span>
      </div>

      <div className="ms-auto flex items-center gap-1.5">
        {!isReadonly && (
          <VisibilitySelector
            chatId={chatId}
            selectedVisibilityType={selectedVisibilityType}
          />
        )}
        <ExportMenu chatId={chatId} />
      </div>
    </header>
  );
}

export const ChatHeader = memo(
  PureChatHeader,
  (prevProps, nextProps) =>
    prevProps.chatId === nextProps.chatId &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
    prevProps.isReadonly === nextProps.isReadonly
);

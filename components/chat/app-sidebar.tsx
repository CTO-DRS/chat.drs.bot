"use client";

import {
  ChartColumnIcon,
  MessageSquareIcon,
  PanelLeftIcon,
  PenSquareIcon,
  TrashIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "next-auth";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { ShortcutsDialog } from "@/components/chat/shortcuts-dialog";
import {
  getChatHistoryPaginationKey,
  SidebarHistory,
} from "@/components/chat/sidebar-history";
import { SidebarUserNav } from "@/components/chat/sidebar-user-nav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useI18n } from "@/lib/i18n";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { setOpenMobile, toggleSidebar } = useSidebar();
  const { mutate } = useSWRConfig();
  const { t } = useI18n();
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  useKeyboardShortcuts();

  const closeMobile = useCallback(() => {
    setOpenMobile(false);
  }, [setOpenMobile]);

  const handleToggleSidebar = useCallback(() => {
    toggleSidebar();
  }, [toggleSidebar]);

  const handleNewChat = useCallback(() => {
    setOpenMobile(false);
    router.push("/");
  }, [router, setOpenMobile]);

  const handleShowDeleteAllDialog = useCallback(() => {
    setShowDeleteAllDialog(true);
  }, []);

  const handleOpenStats = useCallback(() => {
    setOpenMobile(false);
    router.push("/stats");
  }, [router, setOpenMobile]);

  const handleDeleteAll = useCallback(() => {
    setShowDeleteAllDialog(false);
    router.replace("/");
    mutate(unstable_serialize(getChatHistoryPaginationKey), [], {
      revalidate: false,
    });

    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/history`, {
      method: "DELETE",
    });

    toast.success(t("toast.allChatsDeleted"));
  }, [mutate, router, t]);

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="pb-0 pt-3">
          <SidebarMenu>
            <SidebarMenuItem className="flex flex-row items-center justify-between">
              <div className="group/logo relative flex items-center justify-center">
                <SidebarMenuButton
                  asChild
                  className="size-8 !px-0 items-center justify-center group-data-[collapsible=icon]:group-hover/logo:opacity-0"
                  tooltip="Chatbot"
                >
                  <Link href="/" onClick={closeMobile}>
                    <MessageSquareIcon className="size-4 text-sidebar-foreground/50" />
                  </Link>
                </SidebarMenuButton>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      className="pointer-events-none absolute inset-0 size-8 opacity-0 group-data-[collapsible=icon]:pointer-events-auto group-data-[collapsible=icon]:group-hover/logo:opacity-100"
                      onClick={handleToggleSidebar}
                    >
                      <PanelLeftIcon className="size-4" />
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent className="hidden md:block" side="right">
                    Open sidebar
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="group-data-[collapsible=icon]:hidden">
                <SidebarTrigger className="text-sidebar-foreground/60 transition-colors duration-150 hover:text-sidebar-foreground" />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="pt-1">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="h-8 rounded-lg border border-sidebar-border text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    onClick={handleNewChat}
                    tooltip="New Chat (Ctrl+Shift+O)"
                  >
                    <PenSquareIcon className="size-4" />
                    <span className="font-medium">{t("sidebar.newChat")}</span>
                    <kbd className="pointer-events-none ms-auto hidden rounded border border-sidebar-border bg-sidebar-accent/60 px-1.5 py-0.5 text-[10px] font-medium text-sidebar-foreground/50 md:inline-block">
                      Ctrl+Shift+O
                    </kbd>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {user ? (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        className="h-8 rounded-lg text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        onClick={handleOpenStats}
                        tooltip="Usage stats"
                      >
                        <ChartColumnIcon className="size-4" />
                        <span className="text-[13px]">
                          {t("sidebar.stats")}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        className="rounded-lg text-sidebar-foreground/40 transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive"
                        onClick={handleShowDeleteAllDialog}
                        tooltip="Delete All Chats"
                      >
                        <TrashIcon className="size-4" />
                        <span className="text-[13px]">
                          {t("sidebar.deleteAll")}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                ) : null}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarHistory user={user} />
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border pt-2 pb-3">
          {user ? <SidebarUserNav user={user} /> : null}
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <AlertDialog
        onOpenChange={setShowDeleteAllDialog}
        open={showDeleteAllDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialog.deleteAllTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialog.deleteAllDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("dialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll}>
              {t("dialog.deleteAllConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ShortcutsDialog />
    </>
  );
}

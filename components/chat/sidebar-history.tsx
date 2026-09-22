"use client";

import { isToday, isYesterday, subMonths, subWeeks } from "date-fns";
import { motion } from "framer-motion";
import { SearchIcon, XIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "next-auth";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import useSWRInfinite from "swr/infinite";
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
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar";
import type { Chat } from "@/lib/db/schema";
import { useI18n } from "@/lib/i18n";
import { fetcher } from "@/lib/utils";
import { LoaderIcon } from "./icons";
import { ChatItem } from "./sidebar-history-item";

type GroupedChats = {
  today: Chat[];
  yesterday: Chat[];
  lastWeek: Chat[];
  lastMonth: Chat[];
  older: Chat[];
};

export type ChatHistory = {
  chats: Chat[];
  hasMore: boolean;
};

const PAGE_SIZE = 20;

const groupChatsByDate = (chats: Chat[]): GroupedChats => {
  const now = new Date();
  const oneWeekAgo = subWeeks(now, 1);
  const oneMonthAgo = subMonths(now, 1);

  return chats.reduce(
    (groups, chat) => {
      const chatDate = new Date(chat.createdAt);

      if (isToday(chatDate)) {
        groups.today.push(chat);
      } else if (isYesterday(chatDate)) {
        groups.yesterday.push(chat);
      } else if (chatDate > oneWeekAgo) {
        groups.lastWeek.push(chat);
      } else if (chatDate > oneMonthAgo) {
        groups.lastMonth.push(chat);
      } else {
        groups.older.push(chat);
      }

      return groups;
    },
    {
      lastMonth: [],
      lastWeek: [],
      older: [],
      today: [],
      yesterday: [],
    } as GroupedChats
  );
};

export function getChatHistoryPaginationKey(
  pageIndex: number,
  previousPageData: ChatHistory
) {
  if (previousPageData && previousPageData.hasMore === false) {
    return null;
  }

  if (pageIndex === 0) {
    return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/history?limit=${PAGE_SIZE}`;
  }

  const firstChatFromPage = previousPageData.chats.at(-1);

  if (!firstChatFromPage) {
    return null;
  }

  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/history?ending_before=${firstChatFromPage.id}&limit=${PAGE_SIZE}`;
}

export function SidebarHistory({ user }: { user: User | undefined }) {
  const { setOpenMobile } = useSidebar();
  const { t } = useI18n();
  const pathname = usePathname();
  const id = pathname?.startsWith("/chat/") ? pathname.split("/")[2] : null;
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    data: paginatedChatHistories,
    setSize,
    isValidating,
    isLoading,
    mutate,
  } = useSWRInfinite<ChatHistory>(
    user ? getChatHistoryPaginationKey : () => null,
    fetcher,
    { fallbackData: [], revalidateOnFocus: false }
  );

  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const hasReachedEnd = paginatedChatHistories
    ? paginatedChatHistories.some((page) => page.hasMore === false)
    : false;

  const hasEmptyChatHistory = paginatedChatHistories
    ? paginatedChatHistories.every((page) => page.chats.length === 0)
    : false;

  const handleDelete = useCallback(() => {
    const chatToDelete = deleteId;
    const isCurrentChat = pathname === `/chat/${chatToDelete}`;

    setShowDeleteDialog(false);

    if (isCurrentChat) {
      router.replace("/");
    }

    mutate((chatHistories) => {
      if (chatHistories) {
        return chatHistories.map((chatHistory) => ({
          ...chatHistory,
          chats: chatHistory.chats.filter((chat) => chat.id !== chatToDelete),
        }));
      }
    });

    fetch(
      `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/chat?id=${chatToDelete}`,
      { method: "DELETE" }
    );

    toast.success(t("toast.chatDeleted"));
  }, [deleteId, mutate, pathname, router, t]);

  const handleShowDeleteDialog = useCallback((chatId: string) => {
    setDeleteId(chatId);
    setShowDeleteDialog(true);
  }, []);

  const handleViewportEnter = useCallback(() => {
    if (!isValidating && !hasReachedEnd) {
      setSize((size) => size + 1);
    }
  }, [hasReachedEnd, isValidating, setSize]);

  const allChats = useMemo(
    () =>
      paginatedChatHistories
        ? paginatedChatHistories.flatMap((page) => page.chats)
        : [],
    [paginatedChatHistories]
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const isSearching = normalizedQuery.length > 0;
  const filteredChats = useMemo(
    () =>
      isSearching
        ? allChats.filter((chat) =>
            chat.title.toLowerCase().includes(normalizedQuery)
          )
        : allChats,
    [allChats, isSearching, normalizedQuery]
  );

  useEffect(() => {
    const handleFocusSearch = () => {
      searchInputRef.current?.focus();
    };
    window.addEventListener("drs:focus-chat-search", handleFocusSearch);
    return () =>
      window.removeEventListener("drs:focus-chat-search", handleFocusSearch);
  }, []);

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(event.target.value);
    },
    []
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  if (!user) {
    return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupContent>
          <div className="flex w-full flex-row items-center justify-center gap-2 px-2 text-[13px] text-sidebar-foreground/60">
            {t("sidebar.loginToSave")}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (isLoading) {
    return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/70">
          {t("sidebar.history")}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="flex flex-col gap-0.5 px-1">
            {[44, 32, 28, 64, 52].map((item) => (
              <div
                className="flex h-8 items-center gap-2 rounded-lg px-2"
                key={item}
              >
                <div
                  className="h-3 max-w-(--skeleton-width) flex-1 animate-pulse rounded-md bg-sidebar-foreground/[0.06]"
                  style={
                    {
                      "--skeleton-width": `${item}%`,
                    } as React.CSSProperties
                  }
                />
              </div>
            ))}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (hasEmptyChatHistory) {
    return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/70">
          {t("sidebar.history")}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="flex w-full flex-row items-center justify-center gap-2 px-2 text-[13px] text-sidebar-foreground/60">
            {t("sidebar.emptyHistory")}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/70">
          {t("sidebar.history")}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="relative mb-2 px-1">
            <SearchIcon className="pointer-events-none absolute start-3.5 top-1/2 size-3.5 -translate-y-1/2 text-sidebar-foreground/40" />
            <input
              aria-label="Search chats"
              className="h-8 w-full rounded-lg border border-sidebar-border bg-background/60 ps-8 pe-7 text-[13px] text-sidebar-foreground outline-none transition-colors placeholder:text-sidebar-foreground/40 focus:border-sidebar-foreground/30 focus:bg-background"
              data-testid="chat-search-input"
              onChange={handleSearchChange}
              placeholder={t("sidebar.searchChats")}
              ref={searchInputRef}
              type="text"
              value={searchQuery}
            />
            {isSearching ? (
              <button
                aria-label="Clear search"
                className="absolute end-3 top-1/2 -translate-y-1/2 text-sidebar-foreground/40 transition-colors hover:text-sidebar-foreground"
                onClick={handleClearSearch}
                type="button"
              >
                <XIcon className="size-3.5" />
              </button>
            ) : null}
          </div>
          <SidebarMenu>
            {paginatedChatHistories
              ? (() => {
                  const groupedChats = groupChatsByDate(filteredChats);

                  if (isSearching && filteredChats.length === 0) {
                    return (
                      <div className="flex w-full flex-row items-center justify-center gap-2 px-2 py-6 text-[13px] text-sidebar-foreground/60">
                        {t("sidebar.noResults")} “{searchQuery.trim()}”
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-col gap-4">
                      {groupedChats.today.length > 0 && (
                        <div>
                          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/70">
                            {t("sidebar.today")}
                          </div>
                          {groupedChats.today.map((chat) => (
                            <ChatItem
                              chat={chat}
                              isActive={chat.id === id}
                              key={chat.id}
                              onDelete={handleShowDeleteDialog}
                              setOpenMobile={setOpenMobile}
                            />
                          ))}
                        </div>
                      )}

                      {groupedChats.yesterday.length > 0 && (
                        <div>
                          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/70">
                            {t("sidebar.yesterday")}
                          </div>
                          {groupedChats.yesterday.map((chat) => (
                            <ChatItem
                              chat={chat}
                              isActive={chat.id === id}
                              key={chat.id}
                              onDelete={handleShowDeleteDialog}
                              setOpenMobile={setOpenMobile}
                            />
                          ))}
                        </div>
                      )}

                      {groupedChats.lastWeek.length > 0 && (
                        <div>
                          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/70">
                            {t("sidebar.last7Days")}
                          </div>
                          {groupedChats.lastWeek.map((chat) => (
                            <ChatItem
                              chat={chat}
                              isActive={chat.id === id}
                              key={chat.id}
                              onDelete={handleShowDeleteDialog}
                              setOpenMobile={setOpenMobile}
                            />
                          ))}
                        </div>
                      )}

                      {groupedChats.lastMonth.length > 0 && (
                        <div>
                          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/70">
                            {t("sidebar.last30Days")}
                          </div>
                          {groupedChats.lastMonth.map((chat) => (
                            <ChatItem
                              chat={chat}
                              isActive={chat.id === id}
                              key={chat.id}
                              onDelete={handleShowDeleteDialog}
                              setOpenMobile={setOpenMobile}
                            />
                          ))}
                        </div>
                      )}

                      {groupedChats.older.length > 0 && (
                        <div>
                          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/70">
                            {t("sidebar.older")}
                          </div>
                          {groupedChats.older.map((chat) => (
                            <ChatItem
                              chat={chat}
                              isActive={chat.id === id}
                              key={chat.id}
                              onDelete={handleShowDeleteDialog}
                              setOpenMobile={setOpenMobile}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()
              : null}
          </SidebarMenu>

          <motion.div onViewportEnter={handleViewportEnter} />

          {hasReachedEnd ? null : (
            <div className="mt-1 flex flex-row items-center gap-2 px-4 py-2 text-sidebar-foreground/50">
              <div className="animate-spin">
                <LoaderIcon />
              </div>
              <div className="text-[11px]">{t("sidebar.loading")}</div>
            </div>
          )}
        </SidebarGroupContent>
      </SidebarGroup>

      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialog.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialog.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("dialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t("dialog.deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

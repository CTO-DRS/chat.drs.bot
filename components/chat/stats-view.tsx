"use client";

import { motion } from "framer-motion";
import {
  ArrowUpRightIcon,
  ChartColumnIcon,
  FileCodeIcon,
  MessageSquareIcon,
  MessagesSquareIcon,
  ThumbsUpIcon,
} from "lucide-react";
import Link from "next/link";
import type { UsageStats } from "@/lib/db/queries";
import { useI18n } from "@/lib/i18n";

const cardConfig = [
  {
    accent: "from-indigo-500/15 to-indigo-500/5 text-indigo-500",
    icon: MessageSquareIcon,
    key: "stats.totalChats",
    valueKey: "chats" as const,
  },
  {
    accent: "from-sky-500/15 to-sky-500/5 text-sky-500",
    icon: MessagesSquareIcon,
    key: "stats.totalMessages",
    valueKey: "messages" as const,
  },
  {
    accent: "from-teal-500/15 to-teal-500/5 text-teal-500",
    icon: FileCodeIcon,
    key: "stats.documents",
    valueKey: "documents" as const,
  },
  {
    accent: "from-amber-500/15 to-amber-500/5 text-amber-500",
    icon: ThumbsUpIcon,
    key: "stats.votes",
    valueKey: "votes" as const,
  },
];

function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(
    value
  );
}

export function StatsView({ stats }: { stats: UsageStats }) {
  const { t, locale } = useI18n();

  const maxActivity = Math.max(
    1,
    ...stats.activity.map((day) => Math.max(day.chats, day.messages))
  );

  const upvoteRate =
    stats.totals.votes > 0
      ? Math.round((stats.totals.upvotes / stats.totals.votes) * 100)
      : null;

  const dayFormatter = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    day: "numeric",
    month: "short",
    weekday: "short",
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-teal-500/10 ring-1 ring-border/50">
          <ChartColumnIcon className="size-5 text-indigo-500" />
        </div>
        <div>
          <h1 className="font-semibold text-xl tracking-tight md:text-2xl">
            {t("stats.title")}
          </h1>
          <p className="text-muted-foreground text-[13px]">
            {t("stats.subtitle")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cardConfig.map((card, index) => (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border/50 bg-card/50 p-4 shadow-[var(--shadow-card)]"
            initial={{ opacity: 0, y: 12 }}
            key={card.key}
            transition={{ delay: 0.05 * index, duration: 0.35 }}
          >
            <div
              className={`mb-3 flex size-8 items-center justify-center rounded-lg bg-gradient-to-br ${card.accent}`}
            >
              <card.icon className="size-4" />
            </div>
            <div className="font-semibold text-2xl tracking-tight">
              {formatNumber(stats.totals[card.valueKey], locale)}
            </div>
            <div className="text-muted-foreground text-xs">{t(card.key)}</div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border/50 bg-card/50 p-5 shadow-[var(--shadow-card)] lg:col-span-2">
          <h2 className="mb-1 font-medium text-sm">
            {t("stats.activity7Days")}
          </h2>
          <div className="mb-4 flex items-center gap-4 text-muted-foreground text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-indigo-500" />
              {t("stats.chatsPerDay")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-teal-400" />
              {t("stats.messagesPerDay")}
            </span>
          </div>

          <div className="flex h-40 items-end justify-between gap-2" dir="ltr">
            {stats.activity.map((day) => (
              <div
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                key={day.date}
              >
                <div className="flex h-full w-full items-end justify-center gap-1">
                  <div
                    className="w-1/2 max-w-4 rounded-t-md bg-indigo-500/85 transition-all duration-300 hover:bg-indigo-500"
                    style={{
                      height: `${Math.max(3, (day.chats / maxActivity) * 100)}%`,
                      minHeight: day.chats > 0 ? 4 : 2,
                    }}
                    title={`${t("stats.chatsPerDay")}: ${day.chats}`}
                  />
                  <div
                    className="w-1/2 max-w-4 rounded-t-md bg-teal-400/80 transition-all duration-300 hover:bg-teal-400"
                    style={{
                      height: `${Math.max(3, (day.messages / maxActivity) * 100)}%`,
                      minHeight: day.messages > 0 ? 4 : 2,
                    }}
                    title={`${t("stats.messagesPerDay")}: ${day.messages}`}
                  />
                </div>
                <div className="w-full truncate text-center text-muted-foreground/70 text-[9px]">
                  {dayFormatter.format(new Date(`${day.date}T12:00:00`))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {upvoteRate === null ? null : (
            <div className="rounded-xl border border-border/50 bg-card/50 p-5 shadow-[var(--shadow-card)]">
              <div className="font-semibold text-2xl tracking-tight text-emerald-500">
                {formatNumber(upvoteRate, locale)}%
              </div>
              <div className="text-muted-foreground text-xs">
                {t("stats.upvoteRate")}
              </div>
            </div>
          )}

          {stats.mostRecentChat ? (
            <div className="rounded-xl border border-border/50 bg-card/50 p-5 shadow-[var(--shadow-card)]">
              <div className="mb-2 text-muted-foreground text-xs">
                {t("stats.mostRecentChat")}
              </div>
              <Link
                className="flex items-start gap-1.5 font-medium text-sm hover:underline"
                href={`/chat/${stats.mostRecentChat.id}`}
              >
                <ArrowUpRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="line-clamp-2">
                  {stats.mostRecentChat.title}
                </span>
              </Link>
            </div>
          ) : null}

          {stats.accountSince ? (
            <div className="rounded-xl border border-border/50 bg-card/50 p-5 shadow-[var(--shadow-card)]">
              <div className="mb-1 text-muted-foreground text-xs">
                {t("stats.accountSince")}
              </div>
              <div className="font-medium text-sm">
                {new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
                  dateStyle: "long",
                }).format(new Date(stats.accountSince))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {stats.totals.chats === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border/60 bg-card/30 p-8 text-center text-muted-foreground text-sm">
          {t("stats.noChats")}
        </div>
      ) : (
        <p className="mt-6 text-center text-muted-foreground/60 text-xs">
          {t("stats.viewAll")}
        </p>
      )}
    </div>
  );
}

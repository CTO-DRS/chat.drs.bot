"use client";

import { DownloadIcon, FileJsonIcon, FileTextIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ExportMessage = {
  id?: string;
  role: string;
  parts?: Array<{
    type: string;
    text?: string;
    url?: string;
    filename?: string;
  }>;
  createdAt?: string | Date;
};

type ExportPayload = {
  chat: { id: string; title: string; createdAt?: string };
  messages: ExportMessage[];
};

function buildMarkdown(payload: ExportPayload): string {
  const title = payload.chat?.title || "Chat";
  const created = payload.chat?.createdAt
    ? new Date(payload.chat.createdAt).toLocaleString()
    : "";
  const lines: string[] = [`# ${title}`, ""];

  if (created) {
    lines.push(`> Conversation started ${created}`, "");
  }

  for (const message of payload.messages ?? []) {
    const role =
      message.role === "user"
        ? "User"
        : message.role === "assistant"
          ? "Assistant"
          : message.role;
    const texts = (message.parts ?? [])
      .filter((part) => part.type === "text" && part.text)
      .map((part) => part.text?.trim())
      .filter((text): text is string => typeof text === "string");

    const files = (message.parts ?? []).flatMap((part) =>
      part.type === "file" && part.filename
        ? [`_(attachment: ${part.filename})_`]
        : []
    );

    lines.push(`## ${role}`, "");
    lines.push(...texts);
    lines.push(...files);
    lines.push("", "---", "");
  }

  lines.push(
    "",
    `<sub>Exported from chat.drs.bot · ${new Date().toLocaleString()}</sub>`,
    ""
  );

  return lines.join("\n");
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "chat";
}

export function ExportMenu({ chatId }: { chatId: string }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(
    async (format: "markdown" | "json") => {
      if (isExporting) {
        return;
      }

      setIsExporting(true);

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/chat/${chatId}/export`
        );

        if (!response.ok) {
          throw new Error(`Export failed (${response.status})`);
        }

        const payload = (await response.json()) as ExportPayload;
        const base = slugifyTitle(payload.chat?.title ?? "chat");

        if (format === "json") {
          downloadBlob(
            JSON.stringify(payload, null, 2),
            `${base}.json`,
            "application/json"
          );
        } else {
          downloadBlob(
            buildMarkdown(payload),
            `${base}.md`,
            "text/markdown;charset=utf-8"
          );
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to export chat"
        );
      } finally {
        setIsExporting(false);
      }
    },
    [chatId, isExporting]
  );

  const handleExportMarkdown = useCallback(
    () => handleExport("markdown"),
    [handleExport]
  );
  const handleExportJson = useCallback(
    () => handleExport("json"),
    [handleExport]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
          disabled={isExporting}
          size="icon"
          variant="ghost"
        >
          <DownloadIcon size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleExportMarkdown}>
          <FileTextIcon className="size-4" />
          Export as Markdown
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportJson}>
          <FileJsonIcon className="size-4" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

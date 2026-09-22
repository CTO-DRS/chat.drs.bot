import { FileTextIcon } from "lucide-react";
import Image from "next/image";
import type { Attachment } from "@/lib/types";
import { Spinner } from "../ui/spinner";
import { CrossSmallIcon } from "./icons";

const DOCUMENT_EXTENSIONS: Record<
  string,
  { badgeClass: string; label: string }
> = {
  docx: {
    badgeClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    label: "DOCX",
  },
  markdown: {
    badgeClass: "bg-muted text-muted-foreground",
    label: "MD",
  },
  md: {
    badgeClass: "bg-muted text-muted-foreground",
    label: "MD",
  },
  pdf: { badgeClass: "bg-destructive/10 text-destructive", label: "PDF" },
  txt: {
    badgeClass: "bg-muted text-muted-foreground",
    label: "TXT",
  },
};

function getDocumentBadge(
  name: string,
  contentType: string
): { badgeClass: string; label: string } | undefined {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";

  if (DOCUMENT_EXTENSIONS[extension]) {
    return DOCUMENT_EXTENSIONS[extension];
  }

  if (contentType === "application/pdf") {
    return DOCUMENT_EXTENSIONS.pdf;
  }
}

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
  onRemove,
}: {
  attachment: Attachment;
  isUploading?: boolean;
  onRemove?: () => void;
}) => {
  const { name, url, contentType } = attachment;
  const badge = getDocumentBadge(name, contentType);

  return (
    <div
      className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border/40 bg-muted"
      data-testid="input-attachment-preview"
    >
      {contentType?.startsWith("image") ? (
        <Image
          alt={name ?? "attachment"}
          className="size-full object-cover"
          height={96}
          src={url}
          width={96}
        />
      ) : badge ? (
        <div
          className="flex size-full flex-col items-center justify-center gap-1 bg-card p-2 text-center"
          title={name}
        >
          <FileTextIcon className="size-6 text-muted-foreground/70" />
          <span className="line-clamp-2 w-full break-all text-[9px] leading-tight text-muted-foreground">
            {name}
          </span>
          <span
            className={`rounded-sm px-1 text-[8px] font-semibold ${badge.badgeClass}`}
          >
            {badge.label}
          </span>
        </div>
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground text-xs">
          File
        </div>
      )}

      {isUploading ? (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 backdrop-blur-sm"
          data-testid="input-attachment-loader"
        >
          <Spinner className="size-5" />
        </div>
      ) : null}

      {onRemove && !isUploading && (
        <button
          className="absolute top-1.5 end-1.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/80 group-hover:opacity-100"
          onClick={onRemove}
          type="button"
        >
          <CrossSmallIcon size={10} />
        </button>
      )}
    </div>
  );
};

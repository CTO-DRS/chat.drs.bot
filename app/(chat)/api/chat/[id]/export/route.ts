import { auth } from "@/app/(auth)/auth";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { convertToUIMessages } from "@/lib/utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [session, chat] = await Promise.all([auth(), getChatById({ id })]);

  if (!chat) {
    return Response.json({ error: "chat not found" }, { status: 404 });
  }

  if (
    chat.visibility === "private" &&
    (!session?.user || session.user.id !== chat.userId)
  ) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const dbMessages = await getMessagesByChatId({ id });

  return Response.json({
    chat: {
      createdAt: chat.createdAt,
      id: chat.id,
      title: chat.title,
      visibility: chat.visibility,
    },
    messages: convertToUIMessages(dbMessages),
  });
}

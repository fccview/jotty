import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { updateNote, deleteNote } from "@/app/_server/actions/note";
import { resolveApiId } from "@/app/_server/lib/legacy-lookup";
import { Modes } from "@/app/_types/enums";
import { UNCATEGORIZED } from "@/app/_consts/notes";

export const dynamic = "force-dynamic";

const _noteUuid = async (
  request: NextRequest,
  noteId: string,
  username: string,
): Promise<string | null> =>
  resolveApiId(
    Modes.NOTES,
    noteId,
    request.nextUrl.searchParams.get("category"),
    username,
  );

export async function GET(request: NextRequest, props: { params: Promise<{ noteId: string }> }) {
    const params = await props.params;
    return withApiAuth(request, async (user) => {
        try {
            const uuid = await _noteUuid(request, params.noteId, user.username);
            const { getNoteById } = await import("@/app/_server/actions/note");
            const note = uuid ? await getNoteById(uuid, user.username) : undefined;

            if (!note) {
                return NextResponse.json({ error: "Note not found" }, { status: 404 });
            }

            return NextResponse.json({
                success: true,
                data: {
                    id: note.uuid,
                    title: note.title,
                    category: note.category || UNCATEGORIZED,
                    content: note.content,
                    createdAt: note.createdAt,
                    updatedAt: note.updatedAt,
                    owner: note.owner,
                },
            });
        } catch (error) {
            console.error("API Error:", error);
            return NextResponse.json(
                { error: "Internal server error" },
                { status: 500 }
            );
        }
    });
}

export async function PUT(request: NextRequest, props: { params: Promise<{ noteId: string }> }) {
    const params = await props.params;
    return withApiAuth(request, async (user) => {
        try {
            const body = await request.json();
            const { title, content, category } = body;

            const uuid = await _noteUuid(request, params.noteId, user.username);
            const { getUserNotes } = await import("@/app/_server/actions/note");
            const notes = await getUserNotes({ username: user.username });

            if (!notes.success || !notes.data) {
                return NextResponse.json(
                    { error: "Failed to fetch notes" },
                    { status: 500 }
                );
            }

            const note = notes.data.find((n) => n.uuid === uuid);
            if (!note) {
                return NextResponse.json({ error: "Note not found" }, { status: 404 });
            }

            const formData = new FormData();
            formData.append("uuid", note.uuid!);
            formData.append("title", title ?? note.title);
            formData.append("content", content ?? note.content ?? "");
            formData.append("category", category ?? note.category ?? UNCATEGORIZED);
            formData.append("user", user.username);

            const result = await updateNote(formData);
            if (result.error) {
                return NextResponse.json({ error: result.error }, { status: 400 });
            }

            const transformedNote = {
                id: result.data?.uuid,
                title: result.data?.title,
                category: result.data?.category || UNCATEGORIZED,
                content: result.data?.content,
                createdAt: result.data?.createdAt,
                updatedAt: result.data?.updatedAt,
                owner: result.data?.owner,
            };

            return NextResponse.json({ success: true, data: transformedNote });
        } catch (error) {
            console.error("API Error:", error);
            return NextResponse.json(
                { error: "Internal server error" },
                { status: 500 }
            );
        }
    });
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ noteId: string }> }) {
    const params = await props.params;
    return withApiAuth(request, async (user) => {
        try {
            const uuid = await _noteUuid(request, params.noteId, user.username);
            const { getUserNotes } = await import("@/app/_server/actions/note");
            const notes = await getUserNotes({ username: user.username });

            if (!notes.success || !notes.data) {
                return NextResponse.json(
                    { error: "Failed to fetch notes" },
                    { status: 500 }
                );
            }

            const note = notes.data.find((n) => n.uuid === uuid);
            if (!note) {
                return NextResponse.json({ error: "Note not found" }, { status: 404 });
            }

            const formData = new FormData();
            formData.append("uuid", note.uuid!);

            const result = await deleteNote(formData, user.username);
            if (result.error) {
                return NextResponse.json({ error: result.error }, { status: 400 });
            }

            return NextResponse.json({ success: true });
        } catch (error) {
            console.error("API Error:", error);
            return NextResponse.json(
                { error: "Internal server error" },
                { status: 500 }
            );
        }
    });
}

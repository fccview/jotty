import { NextRequest, NextResponse } from "next/server";
import { withApiAuth } from "@/app/_utils/api-utils";
import { updateNote, deleteNote } from "@/app/_server/actions/note";

export const dynamic = "force-dynamic";

export async function PUT(
    request: NextRequest,
    { params }: { params: { noteId: string } }
) {
    return withApiAuth(request, async (user) => {
        try {
            const body = await request.json();
            const { title, content, category } = body;

            const { getUserNotes } = await import("@/app/_server/actions/note");
            const notes = await getUserNotes({ username: user.username });

            if (!notes.success || !notes.data) {
                return NextResponse.json(
                    { error: "Failed to fetch notes" },
                    { status: 500 }
                );
            }

            const note = notes.data.find((n) => n.uuid === params.noteId);
            if (!note) {
                return NextResponse.json({ error: "Note not found" }, { status: 404 });
            }

            const formData = new FormData();
            formData.append("id", note.id || "");
            formData.append("uuid", params.noteId);
            formData.append("title", title);
            formData.append("content", content || "");
            formData.append("category", category || "Uncategorized");
            formData.append("originalCategory", note.category || "Uncategorized");
            formData.append("user", user.username);

            const result = await updateNote(formData);
            if (result.error) {
                return NextResponse.json({ error: result.error }, { status: 400 });
            }

            const transformedNote = {
                id: result.data?.uuid || result.data?.id,
                title: result.data?.title,
                category: result.data?.category || "Uncategorized",
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

export async function DELETE(
    request: NextRequest,
    { params }: { params: { noteId: string } }
) {
    return withApiAuth(request, async (user) => {
        try {
            const { getUserNotes } = await import("@/app/_server/actions/note");
            const notes = await getUserNotes({ username: user.username });

            if (!notes.success || !notes.data) {
                return NextResponse.json(
                    { error: "Failed to fetch notes" },
                    { status: 500 }
                );
            }

            const note = notes.data.find((n) => n.uuid === params.noteId);
            if (!note) {
                return NextResponse.json({ error: "Note not found" }, { status: 404 });
            }

            const formData = new FormData();
            formData.append("id", note.id || "");
            formData.append("category", note.category || "Uncategorized");

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

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/app/_server/actions/users";
import path from "path";
import fs from "fs/promises";
import { NOTES_FOLDER } from "@/app/_consts/notes";

export const dynamic = "force-dynamic";

export async function GET(
    request: NextRequest,
    { params }: { params: { username: string; filename: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user && !process.env.SERVE_PUBLIC_FILES) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { username } = params;
        const filename = decodeURIComponent(params.filename);

        const filePath = path.join(
            process.cwd(),
            "data",
            NOTES_FOLDER,
            username,
            "videos",
            filename
        );

        try {
            const fileBuffer = await fs.readFile(filePath);
            const fileStats = await fs.stat(filePath);

            const response = new NextResponse(fileBuffer as BodyInit);
            response.headers.set("Content-Type", "video/mp4");
            response.headers.set("Content-Length", fileStats.size.toString());
            response.headers.set("Accept-Ranges", "bytes");
            response.headers.set("Cache-Control", "public, max-age=31536000, immutable");

            const range = request.headers.get("range");
            if (range) {
                const fileSize = fileStats.size;
                const [start, end] = range.replace(/bytes=/, "").split("-");
                const startByte = parseInt(start, 10);
                const endByte = end ? parseInt(end, 10) : fileSize - 1;

                if (startByte >= fileSize || endByte >= fileSize) {
                    return new NextResponse("Range Not Satisfiable", {
                        status: 416,
                        headers: {
                            "Content-Range": `bytes */${fileSize}`,
                        },
                    });
                }

                const chunkSize = endByte - startByte + 1;
                const fileChunk = fileBuffer.slice(startByte, endByte + 1);

                return new NextResponse(fileChunk, {
                    status: 206,
                    headers: {
                        "Content-Range": `bytes ${startByte}-${endByte}/${fileSize}`,
                        "Content-Length": chunkSize.toString(),
                        "Accept-Ranges": "bytes",
                        "Content-Type": "video/mp4",
                    },
                });
            }

            return response;
        } catch (error) {
            console.error("Error reading video file:", error);
            return new NextResponse("File not found", { status: 404 });
        }
    } catch (error) {
        console.error("Error in video API route:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

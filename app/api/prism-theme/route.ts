import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const validThemes = [
    "prism",
    "prism-dark",
    "prism-funky",
    "prism-okaidia",
    "prism-tomorrow",
    "prism-twilight",
    "prism-coy",
    "prism-solarizedlight",
];

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const theme = searchParams.get("theme") || "prism";

        if (!validThemes.includes(theme)) {
            return new NextResponse("Invalid theme", { status: 400 });
        }

        const themePath = path.join(
            process.cwd(),
            "node_modules",
            "prismjs",
            "themes",
            `${theme}.css`
        );

        const cssContent = await readFile(themePath, "utf-8");

        return new NextResponse(cssContent, {
            headers: {
                "Content-Type": "text/css",
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch (error) {
        console.error("Error serving Prism theme:", error);
        return new NextResponse("Theme not found", { status: 404 });
    }
}


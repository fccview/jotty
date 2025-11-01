import { NextResponse } from "next/server";
import { readPackageVersion } from "@/app/_server/actions/config";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const versionResult = await readPackageVersion();

        if (!versionResult.success) {
            return NextResponse.json(
                {
                    status: "unhealthy",
                    version: null,
                    timestamp: new Date().toISOString(),
                    error: versionResult.error
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            status: "healthy",
            version: versionResult.data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Health check API error:", error);
        return NextResponse.json(
            {
                status: "unhealthy",
                version: null,
                timestamp: new Date().toISOString(),
                error: "Internal server error"
            },
            { status: 500 }
        );
    }
}

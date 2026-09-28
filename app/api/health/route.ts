import { NextResponse } from "next/server";
import { z } from "zod";
import { apiNames } from "@/app/_schemas/api/names";
import { readPackageVersion } from "@/app/_server/actions/config";
import { definePublicRoute } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";

export const dynamic = "force-dynamic";

enum HealthState {
  HEALTHY = "healthy",
  UNHEALTHY = "unhealthy",
}

const healthSchema = z
  .object({
    status: z.enum(HealthState),
    version: z.string().nullable(),
    timestamp: z.string(),
    error: z.string().optional(),
  })
  .register(apiNames, { id: "Health" });

export const GET = definePublicRoute(
  {
    id: "getHealth",
    method: HttpMethod.GET,
    path: "/health",
    tag: ApiTag.SYSTEM,
    summary: "Check instance health",
    responses: {
      200: { description: "Instance is up", schema: healthSchema },
      500: { description: "Instance is unhealthy", schema: healthSchema },
    },
  },
  async () => {
    const version = await readPackageVersion();
    const timestamp = new Date().toISOString();

    if (!version.success) {
      return NextResponse.json(
        { status: HealthState.UNHEALTHY, version: null, timestamp, error: version.error },
        { status: 500 },
      );
    }

    return NextResponse.json({ status: HealthState.HEALTHY, version: version.data, timestamp });
  },
);

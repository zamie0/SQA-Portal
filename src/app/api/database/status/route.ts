import { pingMongoDb } from "@/shared/lib/mongodb";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await pingMongoDb();
    return NextResponse.json({
      status: "connected",
      database: result.database,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to connect to MongoDB";
    return NextResponse.json(
      {
        status: "disconnected",
        message,
      },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET() {
  try {
    const raw = readFileSync(
      join(process.cwd(), "src/lib/project-uuid.json"),
      "utf-8"
    );
    const { uuid } = JSON.parse(raw);
    return NextResponse.json({ uuid });
  } catch {
    return NextResponse.json(
      { error: "project-uuid.json not found" },
      { status: 500 }
    );
  }
}

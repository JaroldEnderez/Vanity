import { NextResponse } from "next/server";
import { getAllMaterials, createMaterial } from "@/src/app/lib/materials";
import { requireAuthenticatedUser } from "@/src/app/lib/auth-utils";

export async function GET() {
  try {
    await requireAuthenticatedUser();
    const materials = await getAllMaterials();
    return NextResponse.json(materials);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to fetch materials";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await requireAuthenticatedUser();
    const body = await req.json();
    const material = await createMaterial(body);
    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to create material";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

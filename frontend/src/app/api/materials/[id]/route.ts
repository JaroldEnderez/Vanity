import { NextResponse } from "next/server";
import {
  getMaterialById,
  updateMaterial,
  deleteMaterial,
} from "@/src/app/lib/materials";
import { requireAuthenticatedUser } from "@/src/app/lib/auth-utils";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuthenticatedUser();
    const { id } = await params;
    const material = await getMaterialById(id);
    if (!material) {
      return NextResponse.json(
        { error: "Material not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(material);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to fetch material";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuthenticatedUser();
    const { id } = await params;
    const body = await req.json();
    const material = await updateMaterial(id, body);
    return NextResponse.json(material);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to update material";
    const status = message.includes("Unauthorized")
      ? 401
      : message.includes("Package") || message.includes("package")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuthenticatedUser();
    const { id } = await params;
    const material = await deleteMaterial(id);
    return NextResponse.json({ success: true, material });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to delete material";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

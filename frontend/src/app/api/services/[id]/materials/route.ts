import { NextResponse } from "next/server";
import {
  getServiceMaterials,
  setServiceMaterials,
} from "@/src/app/lib/materials";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const materials = await getServiceMaterials(id);
    return NextResponse.json(materials);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch service materials" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const materials = await setServiceMaterials(id, body.materials || []);
    return NextResponse.json(materials);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update service materials" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getAllMaterials, createMaterial } from "@/src/app/lib/materials";

export async function GET() {
  try {
    const materials = await getAllMaterials();
    return NextResponse.json(materials);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch materials" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const material = await createMaterial(body);
    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create material" },
      { status: 500 }
    );
  }
}

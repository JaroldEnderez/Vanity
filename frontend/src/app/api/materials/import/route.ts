import { NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/src/app/lib/auth-utils";
import { importMaterialsFromParsedRows } from "@/src/app/lib/materials";
import {
  materialsImportTemplateCsv,
  parseAndValidateMaterialsCsv,
} from "@/src/app/lib/materialsImport";

const MAX_BYTES = 2 * 1024 * 1024;

/** UTF-8 CSV template for materials import. */
export async function GET() {
  try {
    await requireAuthenticatedUser();
    const body = materialsImportTemplateCsv();
    const filename = "materials-import-template.csv";
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await requireAuthenticatedUser();

    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Expected multipart/form-data with a file field named file" },
        { status: 400 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Missing file: use field name "file"' },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB)` },
        { status: 413 }
      );
    }

    const text = await file.text();
    const parsed = parseAndValidateMaterialsCsv(text);

    if (!parsed.ok) {
      if (parsed.error.code === "INVALID_HEADERS") {
        return NextResponse.json(
          {
            error: "Invalid CSV headers",
            code: "INVALID_HEADERS",
            missing: parsed.error.missing,
            unknown: parsed.error.unknown,
            expected: [
              "sku (optional)",
              "name",
              "category",
              "packaging",
              "package_amount",
              "package_measure",
              "stock",
            ],
          },
          { status: 400 }
        );
      }
      if (parsed.error.code === "PARSE") {
        return NextResponse.json(
          {
            error: parsed.error.message,
            code: "ROW_ERRORS",
            rowErrors: parsed.rowErrors?.slice(0, 50) ?? [],
            rowErrorTruncated:
              parsed.rowErrors && parsed.rowErrors.length > 50
                ? parsed.rowErrors.length - 50
                : 0,
          },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: "Import failed" }, { status: 400 });
    }

    const summary = await importMaterialsFromParsedRows(parsed.rows);
    return NextResponse.json({
      ok: true,
      created: summary.created,
      updated: summary.updated,
      total: parsed.rows.length,
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Import failed";
    const status = message.includes("Unauthorized")
      ? 401
      : message.includes("Unique constraint") || message.includes("P2002")
        ? 409
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

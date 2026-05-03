export type ExpenseForExport = {
  date: Date;
  item: string;
  amount: number;
  remarks: string | null;
};

export type ExpenseExportRow = {
  Date: string;
  Item: string;
  Amount: string;
  Remarks: string;
};

function formatDateOnly(d: Date): string {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  return x.toISOString().slice(0, 10);
}

export function flattenExpensesToRows(expenses: ExpenseForExport[]): ExpenseExportRow[] {
  return expenses.map((e) => ({
    Date: formatDateOnly(e.date),
    Item: e.item?.trim() ?? "",
    Amount: String(e.amount),
    Remarks: e.remarks?.trim() ?? "",
  }));
}

const CSV_COLUMNS: (keyof ExpenseExportRow)[] = ["Date", "Item", "Amount", "Remarks"];

function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** UTF-8 BOM so Excel recognizes encoding on double-click open. */
export function buildExpensesCsvBuffer(rows: ExpenseExportRow[]): Buffer {
  const header = CSV_COLUMNS.map((k) => escapeCsvCell(k)).join(",");
  const lines = [
    header,
    ...rows.map((row) =>
      CSV_COLUMNS.map((col) => escapeCsvCell(row[col] ?? "")).join(",")
    ),
  ];
  const body = lines.join("\r\n") + (lines.length > 1 ? "\r\n" : "");
  return Buffer.from("\ufeff" + body, "utf8");
}

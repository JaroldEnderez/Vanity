export default function Toolbar() {
    return (
        <div className="mb-6 flex items-center justify-between">
        <button className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm">
        <Barcode size={16} /> Scan Barcode
        </button>
        <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
        placeholder="Search"
        className="rounded-lg border py-2 pl-9 pr-4 text-sm"
        />
        </div>
        </div>
    );
}
export default function CategoryTabs({
    categories,
    active,
    onChange,
}: {
    categories: any[];
    active: string;
    onChange: (id: string) => void;
}) {
    return (
        <div className="mb-6 flex gap-2">
            {categories.map((c) => (
            <button
                key={c.id}
                onClick={() => onChange(c.id)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm border ${
                active === c.id
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-600"
                }`}
            >
                <c.icon size={14} /> {c.label}
            </button>
            ))}
        </div>
    );
}


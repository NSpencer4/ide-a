"use client";

const mockFiles = [
    {name: "src", type: "folder" as const, depth: 0},
    {name: "App.tsx", type: "file" as const, depth: 1},
    {name: "index.css", type: "file" as const, depth: 1},
    {name: "main.tsx", type: "file" as const, depth: 1},
    {name: "public", type: "folder" as const, depth: 0},
    {name: "index.html", type: "file" as const, depth: 1},
    {name: "package.json", type: "file" as const, depth: 0},
    {name: "tsconfig.json", type: "file" as const, depth: 0},
];

export function Sidebar() {
    return (
        <aside className="w-60 shrink-0 bg-gray-900 border-r border-gray-700 flex flex-col select-none">
            <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Files
            </div>
            <nav className="flex-1 overflow-y-auto text-sm font-mono">
                {mockFiles.map((item) => (
                    <div
                        key={`${item.depth}-${item.name}`}
                        className="flex items-center gap-2 px-3 py-1 text-gray-300 hover:bg-gray-800 cursor-pointer"
                        style={{paddingLeft: `${item.depth * 16 + 12}px`}}
                    >
                        <span className="text-gray-500 w-4 text-center text-xs">
                            {item.type === "folder" ? "▸" : "·"}
                        </span>
                        <span className={item.type === "folder" ? "text-gray-200" : ""}>
                            {item.name}
                        </span>
                    </div>
                ))}
            </nav>
        </aside>
    );
}

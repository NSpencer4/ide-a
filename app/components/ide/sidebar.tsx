"use client";

import type {FileTreeEntry} from "~/data/mock-files";

interface SidebarProps {
    fileTree: FileTreeEntry[];
    onFileSelect: (path: string) => void;
    activeFile: string | null;
}

export function Sidebar({fileTree, onFileSelect, activeFile}: SidebarProps) {
    return (
        <aside className="w-60 shrink-0 bg-gray-900 border-r border-gray-700 flex flex-col select-none">
            <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Files
            </div>
            <nav className="flex-1 overflow-y-auto text-sm font-mono">
                {fileTree.map((item) => {
                    const isActive = item.type === "file" && item.path === activeFile;
                    return (
                        <div
                            key={item.path}
                            className={`flex items-center gap-2 px-3 py-1 cursor-pointer ${
                                isActive
                                    ? "bg-blue-600/20 text-blue-300"
                                    : "text-gray-300 hover:bg-gray-800"
                            }`}
                            style={{paddingLeft: `${item.depth * 16 + 12}px`}}
                            onClick={() => {
                                if (item.type === "file") onFileSelect(item.path);
                            }}
                        >
                            <span className="text-gray-500 w-4 text-center text-xs">
                                {item.type === "folder" ? "▸" : "·"}
                            </span>
                            <span className={item.type === "folder" ? "text-gray-200" : ""}>
                                {item.name}
                            </span>
                        </div>
                    );
                })}
            </nav>
        </aside>
    );
}

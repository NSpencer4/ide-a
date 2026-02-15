"use client";

import {CodeMirrorEditor} from "./codemirror-editor";

interface EditorPanelProps {
    activeFile: string | null;
    files: Record<string, string>;
    onFileChange: (path: string, content: string) => void;
    openTabs: string[];
    onTabSelect: (path: string) => void;
    onTabClose: (path: string) => void;
}

function extFromPath(path: string): string {
    const dot = path.lastIndexOf(".");
    return dot === -1 ? "" : path.slice(dot + 1);
}

function fileNameFromPath(path: string): string {
    return path.split("/").pop() ?? path;
}

export function EditorPanel({
                                activeFile,
                                files,
                                onFileChange,
                                openTabs,
                                onTabSelect,
                                onTabClose,
                            }: EditorPanelProps) {
    return (
        <section className="flex-1 flex flex-col min-w-0 bg-gray-950">
            {/* Tab bar */}
            <div className="flex items-center border-b border-gray-700 bg-gray-900 overflow-x-auto">
                {openTabs.map((tab) => (
                    <div
                        key={tab}
                        className={`group flex items-center gap-1 px-3 py-2 text-sm border-r border-gray-700 cursor-pointer shrink-0 ${
                            tab === activeFile
                                ? "bg-gray-950 text-gray-200"
                                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                        }`}
                        onClick={() => onTabSelect(tab)}
                    >
                        <span>{fileNameFromPath(tab)}</span>
                        <button
                            className="ml-1 w-4 h-4 flex items-center justify-center rounded text-gray-500 hover:text-gray-200 hover:bg-gray-700 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                                e.stopPropagation();
                                onTabClose(tab);
                            }}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>

            {/* Editor content */}
            <div className="flex-1 min-h-0">
                {activeFile && files[activeFile] != null ? (
                    <CodeMirrorEditor
                        key={activeFile}
                        value={files[activeFile]}
                        onChange={(value) => onFileChange(activeFile, value)}
                        language={extFromPath(activeFile)}
                    />
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                        Select a file to open
                    </div>
                )}
            </div>
        </section>
    );
}

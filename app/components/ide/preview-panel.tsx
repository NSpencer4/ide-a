"use client";

export function PreviewPanel() {
    return (
        <section className="flex-1 flex flex-col min-w-0 border-l border-gray-700 bg-gray-900">
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-700 bg-gray-900">
                <div className="flex-1 bg-gray-800 rounded px-3 py-1 text-xs text-gray-400 font-mono">
                    localhost:3000
                </div>
            </div>
            <div className="flex-1 flex items-center justify-center bg-white text-gray-400 text-sm">
                Preview will be mounted here
            </div>
        </section>
    );
}

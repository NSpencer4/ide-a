"use client";

export function EditorPanel() {
    return (
        <section className="flex-1 flex flex-col min-w-0 bg-gray-950">
            <div className="flex items-center border-b border-gray-700 bg-gray-900">
                <div className="px-4 py-2 text-sm text-gray-200 bg-gray-950 border-r border-gray-700">
                    App.tsx
                </div>
            </div>
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                Editor will be mounted here
            </div>
        </section>
    );
}

"use client";

import type {WebContainerStatus} from "~/hooks/use-webcontainer";

interface PreviewPanelProps {
    status: WebContainerStatus;
    previewUrl: string | null;
    error?: string | null;
}

const statusLabels: Record<WebContainerStatus, string> = {
    booting: "Booting WebContainer…",
    installing: "Installing dependencies…",
    starting: "Starting dev server…",
    ready: "Ready",
    error: "Error",
};

export function PreviewPanel({status, previewUrl, error}: PreviewPanelProps) {
    return (
        <section className="flex-1 flex flex-col min-w-0 border-l border-gray-700 bg-gray-900">
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-700 bg-gray-900">
                <div className="flex-1 bg-gray-800 rounded px-3 py-1 text-xs text-gray-400 font-mono truncate">
                    {previewUrl ?? "localhost:3000"}
                </div>
            </div>

            {status === "ready" && previewUrl ? (
                <iframe
                    src={previewUrl}
                    title="Preview"
                    className="flex-1 w-full border-0 bg-white"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                />
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-sm text-gray-400">
                    {status === "error" ? (
                        <span className="text-red-400">
                            {error ?? "Something went wrong"}
                        </span>
                    ) : (
                        <>
                            <div
                                className="h-5 w-5 animate-spin rounded-full border-2 border-gray-600 border-t-blue-400"/>
                            <span>{statusLabels[status]}</span>
                        </>
                    )}
                </div>
            )}
        </section>
    );
}

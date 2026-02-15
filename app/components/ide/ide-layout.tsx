"use client";

import {useState, useCallback, useEffect, useRef} from "react";
import {Sidebar} from "./sidebar";
import {EditorPanel} from "./editor-panel";
import {PreviewPanel} from "./preview-panel";
import {buildFileTree} from "~/lib/build-file-tree";
import {useWebContainer} from "~/hooks/use-webcontainer";

interface IDELayoutProps {
    initialFiles: Record<string, string>;
    projectId: string;
}

export function IDELayout({initialFiles, projectId}: IDELayoutProps) {
    const [files, setFiles] = useState<Record<string, string>>(initialFiles);
    const [activeFile, setActiveFile] = useState<string | null>(null);
    const [openTabs, setOpenTabs] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fileTree = buildFileTree(Object.keys(files));
    const {
        status: wcStatus,
        previewUrl,
        error: wcError,
        writeFile: wcWriteFile,
    } = useWebContainer(files);

    const saveFile = useCallback(
        async (path: string, content: string) => {
            setSaving(true);
            try {
                await fetch(`/api/projects/${projectId}/files`, {
                    method: "PUT",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({path, content}),
                });
            } finally {
                setSaving(false);
            }
        },
        [projectId]
    );

    const handleFileSelect = useCallback((path: string) => {
        setActiveFile(path);
        setOpenTabs((tabs) => (tabs.includes(path) ? tabs : [...tabs, path]));
    }, []);

    const handleFileChange = useCallback(
        (path: string, content: string) => {
            setFiles((prev) => ({...prev, [path]: content}));

            // Write to WebContainer immediately for HMR
            wcWriteFile(path, content);

            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            saveTimerRef.current = setTimeout(() => {
                saveFile(path, content);
            }, 500);
        },
        [saveFile, wcWriteFile]
    );

    const handleTabSelect = useCallback((path: string) => {
        setActiveFile(path);
    }, []);

    const handleTabClose = useCallback((path: string) => {
        setOpenTabs((tabs) => {
            const next = tabs.filter((t) => t !== path);
            setActiveFile((current) =>
                current === path ? next[next.length - 1] ?? null : current
            );
            return next;
        });
    }, []);

    // Cmd+S / Ctrl+S: cancel debounce and save immediately
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                e.preventDefault();
                if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                setActiveFile((current) => {
                    if (current && files[current] !== undefined) {
                        saveFile(current, files[current]);
                    }
                    return current;
                });
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [files, saveFile]);

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-gray-950 text-gray-100">
            <Sidebar
                fileTree={fileTree}
                onFileSelect={handleFileSelect}
                activeFile={activeFile}
            />
            <EditorPanel
                activeFile={activeFile}
                files={files}
                onFileChange={handleFileChange}
                openTabs={openTabs}
                onTabSelect={handleTabSelect}
                onTabClose={handleTabClose}
            />
            <PreviewPanel
                status={wcStatus}
                previewUrl={previewUrl}
                error={wcError}
            />
            {saving && (
                <div className="fixed bottom-3 right-3 rounded bg-gray-800 px-3 py-1 text-xs text-gray-400 shadow">
                    Saving...
                </div>
            )}
        </div>
    );
}

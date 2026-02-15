"use client";

import {useState, useCallback} from "react";
import {Sidebar} from "./sidebar";
import {EditorPanel} from "./editor-panel";
import {PreviewPanel} from "./preview-panel";
import {mockFileContents} from "~/data/mock-files";

export function IDELayout() {
    const [files, setFiles] = useState<Record<string, string>>(mockFileContents);
    const [activeFile, setActiveFile] = useState<string | null>(null);
    const [openTabs, setOpenTabs] = useState<string[]>([]);

    const handleFileSelect = useCallback((path: string) => {
        setActiveFile(path);
        setOpenTabs((tabs) => (tabs.includes(path) ? tabs : [...tabs, path]));
    }, []);

    const handleFileChange = useCallback((path: string, content: string) => {
        setFiles((prev) => ({...prev, [path]: content}));
    }, []);

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

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-gray-950 text-gray-100">
            <Sidebar onFileSelect={handleFileSelect} activeFile={activeFile}/>
            <EditorPanel
                activeFile={activeFile}
                files={files}
                onFileChange={handleFileChange}
                openTabs={openTabs}
                onTabSelect={handleTabSelect}
                onTabClose={handleTabClose}
            />
            <PreviewPanel/>
        </div>
    );
}

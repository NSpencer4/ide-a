"use client";

import {Sidebar} from "./sidebar";
import {EditorPanel} from "./editor-panel";
import {PreviewPanel} from "./preview-panel";

export function IDELayout() {
    return (
        <div className="flex h-screen w-screen overflow-hidden bg-gray-950 text-gray-100">
            <Sidebar/>
            <EditorPanel/>
            <PreviewPanel/>
        </div>
    );
}

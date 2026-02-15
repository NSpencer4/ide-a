import {WebContainer, type FileSystemTree} from "@webcontainer/api";

let instance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

export function getWebContainer(): Promise<WebContainer> {
    if (instance) return Promise.resolve(instance);
    if (bootPromise) return bootPromise;

    bootPromise = WebContainer.boot().then((wc) => {
        instance = wc;
        return wc;
    });

    return bootPromise;
}

/**
 * Convert a flat Record<string, string> (path → content) into
 * the nested FileSystemTree that WebContainer.mount() expects.
 */
export function toFileSystemTree(
    files: Record<string, string>
): FileSystemTree {
    const tree: FileSystemTree = {};

    for (const [path, contents] of Object.entries(files)) {
        const parts = path.split("/");
        let current: FileSystemTree = tree;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (i === parts.length - 1) {
                // leaf — file
                current[part] = {file: {contents}};
            } else {
                // intermediate — directory
                if (!current[part]) {
                    current[part] = {directory: {}};
                }
                current = (current[part] as { directory: FileSystemTree })
                    .directory;
            }
        }
    }

    return tree;
}

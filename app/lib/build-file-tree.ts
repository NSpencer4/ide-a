import type {FileTreeEntry} from "~/data/mock-files";

export function buildFileTree(paths: string[]): FileTreeEntry[] {
    const sorted = [...paths].sort();
    const entries: FileTreeEntry[] = [];
    const addedFolders = new Set<string>();

    for (const filePath of sorted) {
        const parts = filePath.split("/");

        // Add ancestor folder entries
        for (let i = 0; i < parts.length - 1; i++) {
            const folderPath = parts.slice(0, i + 1).join("/");
            if (!addedFolders.has(folderPath)) {
                addedFolders.add(folderPath);
                entries.push({
                    name: parts[i],
                    path: folderPath,
                    type: "folder",
                    depth: i,
                });
            }
        }

        // Add file entry
        entries.push({
            name: parts[parts.length - 1],
            path: filePath,
            type: "file",
            depth: parts.length - 1,
        });
    }

    return entries;
}

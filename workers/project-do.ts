import {DurableObject} from "cloudflare:workers";
import {mockFileContents} from "~/data/mock-files";

export class ProjectDO extends DurableObject<Env> {
    private ensureTable() {
        this.ctx.storage.sql.exec(
            `CREATE TABLE IF NOT EXISTS files (path TEXT PRIMARY KEY, content TEXT)`
        );
    }

    private seedIfEmpty() {
        const count = this.ctx.storage.sql
            .exec("SELECT COUNT(*) as c FROM files")
            .one() as { c: number };

        if (count.c === 0) {
            for (const [path, content] of Object.entries(mockFileContents)) {
                this.ctx.storage.sql.exec(
                    "INSERT INTO files (path, content) VALUES (?, ?)",
                    path,
                    content
                );
            }
        }
    }

    async listFiles(): Promise<{ path: string; content: string }[]> {
        this.ensureTable();
        this.seedIfEmpty();
        return this.ctx.storage.sql
            .exec("SELECT path, content FROM files ORDER BY path")
            .toArray() as { path: string; content: string }[];
    }

    async saveFile(path: string, content: string): Promise<void> {
        this.ensureTable();
        this.ctx.storage.sql.exec(
            "INSERT OR REPLACE INTO files (path, content) VALUES (?, ?)",
            path,
            content
        );
    }

    async deleteFile(path: string): Promise<void> {
        this.ensureTable();
        this.ctx.storage.sql.exec("DELETE FROM files WHERE path = ?", path);
    }
}

import {useEffect, useRef, useState, useCallback} from "react";
import type {WebContainer} from "@webcontainer/api";
import {getWebContainer, toFileSystemTree} from "~/lib/webcontainer";

export type WebContainerStatus =
    | "booting"
    | "installing"
    | "starting"
    | "ready"
    | "error";

export function useWebContainer(initialFiles: Record<string, string>) {
    const [status, setStatus] = useState<WebContainerStatus>("booting");
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const wcRef = useRef<WebContainer | null>(null);
    const bootedRef = useRef(false);

    useEffect(() => {
        if (bootedRef.current) return;
        bootedRef.current = true;

        let cancelled = false;

        async function boot() {
            try {
                setStatus("booting");
                const wc = await getWebContainer();
                if (cancelled) return;
                wcRef.current = wc;

                // Mount all project files
                await wc.mount(toFileSystemTree(initialFiles));
                if (cancelled) return;

                // Install dependencies
                setStatus("installing");
                const installProcess = await wc.spawn("npm", ["install"]);
                const installCode = await installProcess.exit;
                if (cancelled) return;

                if (installCode !== 0) {
                    setStatus("error");
                    setError("npm install failed");
                    return;
                }

                // Start dev server
                setStatus("starting");
                await wc.spawn("npm", ["run", "dev"]);

                // Wait for the dev server to be ready
                wc.on("server-ready", (_port, url) => {
                    if (cancelled) return;
                    setPreviewUrl(url);
                    setStatus("ready");
                });
            } catch (err) {
                if (cancelled) return;
                setStatus("error");
                setError(
                    err instanceof Error ? err.message : "WebContainer failed"
                );
            }
        }

        boot();

        return () => {
            cancelled = true;
        };
    }, [initialFiles]);

    const writeFile = useCallback(
        async (path: string, content: string) => {
            if (!wcRef.current) return;
            await wcRef.current.fs.writeFile(path, content);
        },
        []
    );

    return {status, previewUrl, error, writeFile};
}

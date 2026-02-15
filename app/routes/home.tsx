import {IDELayout} from "../components/ide/ide-layout";
import {mockFileContents} from "../data/mock-files";
import type {Route} from "./+types/home";

const PROJECT_ID = "default-project";

export async function loader({context}: Route.LoaderArgs) {
    const cf = context.cloudflare as { env: Env } | undefined;

    if (cf?.env?.PROJECT_DO) {
        const id = cf.env.PROJECT_DO.idFromName(PROJECT_ID);
        const stub = cf.env.PROJECT_DO.get(id);
        const files = await stub.listFiles();

        const initialFiles: Record<string, string> = {};
        for (const file of files) {
            initialFiles[file.path] = file.content;
        }

        return {initialFiles, projectId: PROJECT_ID};
    }

    // Fallback to mock data when Cloudflare bindings aren't available (local Vite dev)
    return {initialFiles: mockFileContents, projectId: PROJECT_ID};
}

export default function Home({loaderData}: Route.ComponentProps) {
    return (
        <IDELayout
            initialFiles={loaderData.initialFiles}
            projectId={loaderData.projectId}
        />
    );
}

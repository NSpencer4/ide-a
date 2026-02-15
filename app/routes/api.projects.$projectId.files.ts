import type {Route} from "./+types/api.projects.$projectId.files";

export async function loader({params, context}: Route.LoaderArgs) {
    const cf = context.cloudflare as { env: Env };
    const projectId = params.projectId;
    const id = cf.env.PROJECT_DO.idFromName(projectId);
    const stub = cf.env.PROJECT_DO.get(id);
    const files = await stub.listFiles();
    return Response.json(files);
}

export async function action({params, request, context}: Route.ActionArgs) {
    if (request.method !== "PUT") {
        return new Response("Method not allowed", {status: 405});
    }

    const cf = context.cloudflare as { env: Env };
    const projectId = params.projectId;
    const {path, content} = (await request.json()) as {
        path: string;
        content: string;
    };

    const id = cf.env.PROJECT_DO.idFromName(projectId);
    const stub = cf.env.PROJECT_DO.get(id);
    await stub.saveFile(path, content);

    return Response.json({ok: true});
}

export interface FileTreeEntry {
    name: string;
    path: string;
    type: "file" | "folder";
    depth: number;
}

export const mockFileTree: FileTreeEntry[] = [
    {name: "src", path: "src", type: "folder", depth: 0},
    {name: "App.tsx", path: "src/App.tsx", type: "file", depth: 1},
    {name: "index.css", path: "src/index.css", type: "file", depth: 1},
    {name: "main.tsx", path: "src/main.tsx", type: "file", depth: 1},
    {name: "index.html", path: "index.html", type: "file", depth: 0},
    {name: "package.json", path: "package.json", type: "file", depth: 0},
    {name: "tsconfig.json", path: "tsconfig.json", type: "file", depth: 0},
    {name: "vite.config.ts", path: "vite.config.ts", type: "file", depth: 0},
];

export const mockFileContents: Record<string, string> = {
    "src/App.tsx": `import { useState } from "react";

export default function App() {
    const [count, setCount] = useState(0);

    return (
        <div className="app">
            <h1>Hello IDE-A</h1>
            <button onClick={() => setCount(count + 1)}>
                Count: {count}
            </button>
        </div>
    );
}
`,
    "src/index.css": `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: system-ui, sans-serif;
    background: #1a1a2e;
    color: #eee;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
}

.app {
    text-align: center;
}

button {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    border: 1px solid #646cff;
    background: transparent;
    color: #646cff;
    cursor: pointer;
    font-size: 1rem;
}
`,
    "src/main.tsx": `import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
`,
    "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My App</title>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
</body>
</html>
`,
    "package.json": `{
    "name": "my-app",
    "private": true,
    "version": "0.0.1",
    "scripts": {
        "dev": "vite",
        "build": "vite build",
        "preview": "vite preview"
    },
    "dependencies": {
        "react": "^19.0.0",
        "react-dom": "^19.0.0"
    },
    "devDependencies": {
        "@vitejs/plugin-react": "^4.0.0",
        "vite": "^6.0.0"
    }
}
`,
    "tsconfig.json": `{
    "compilerOptions": {
        "target": "ES2020",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "jsx": "react-jsx",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "outDir": "dist"
    },
    "include": ["src"]
}
`,
    "vite.config.ts": `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
});
`,
};

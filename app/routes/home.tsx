import { Welcome } from "../welcome/welcome";

export default function Home() {
    const message = "Hello from RSC on Cloudflare Workers";

    return <Welcome message={message}/>;
}

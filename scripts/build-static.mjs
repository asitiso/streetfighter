import { cp, mkdir } from "node:fs/promises";

await mkdir("dist/assets", { recursive: true });
await cp("index.html", "dist/index.html");
await cp("src/styles.css", "dist/assets/styles.css");
await cp("public", "dist", { recursive: true });

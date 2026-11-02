import { defaultServerConditions, defineConfig } from "vite";

export default defineConfig({
    build: {
        emptyOutDir: true,
        minify: false,
        outDir: "../../dist/apps/example",
        rolldownOptions: {
            output: {
                entryFileNames: "main.js",
                format: "cjs"
            }
        },
        sourcemap: true,
        ssr: "src/main.ts",
        target: "node22"
    },
    // NestJS resolves constructor injection from the design:paramtypes metadata that tsc emits.
    oxc: {
        decorator: {
            emitDecoratorMetadata: true,
            legacy: true
        }
    },
    // Bundle workspace libraries but leave installed Node packages to runtime.
    ssr: {
        noExternal: [/^@event-nest\//],
        // Resolve @event-nest/* workspace packages to their TypeScript source via the
        // "event-nest-source" export condition, ahead of the default server conditions.
        resolve: {
            conditions: ["event-nest-source", ...defaultServerConditions]
        },
        target: "node"
    }
});

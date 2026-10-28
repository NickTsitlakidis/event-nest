const { NxAppWebpackPlugin } = require("@nx/webpack/app-plugin");
const path = require("node:path");

module.exports = {
    // Bundle workspace libraries but leave installed Node packages to runtime.
    externals: [
        ({ request }, callback) => {
            if (
                request &&
                !path.isAbsolute(request) &&
                !request.startsWith(".") &&
                !request.startsWith("@event-nest/")
            ) {
                callback(undefined, `commonjs ${request}`);
                return;
            }

            callback();
        }
    ],
    output: {
        path: path.join(__dirname, "../../dist/apps/example")
    },
    plugins: [
        new NxAppWebpackPlugin({
            assets: ["./src/assets"],
            compiler: "tsc",
            externalDependencies: "all",
            main: "./src/main.ts",
            mergeExternals: true,
            optimization: false,
            outputHashing: "none",
            sourceMap: true,
            target: "node",
            tsConfig: "./tsconfig.app.json"
        })
    ],
    // Resolve @event-nest/* workspace packages to their TypeScript source via the
    // "event-nest-source" export condition, regardless of webpack mode.
    resolve: {
        conditionNames: ["event-nest-source", "..."]
    }
};

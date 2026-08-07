const { composePlugins, withNx } = require("@nx/webpack");
const path = require("node:path");

// Nx plugins for webpack.
module.exports = composePlugins(withNx(), (config) => {
    // Resolve @event-nest/* workspace packages to their TypeScript source via the
    // "event-nest-source" export condition, regardless of webpack mode.
    config.resolve ??= {};
    config.resolve.conditionNames = ["event-nest-source", "..."];

    // Bundle workspace libraries but leave installed Node packages to runtime.
    config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
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
    ];

    return config;
});

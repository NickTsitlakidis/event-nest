module.exports = {
    mongodbMemoryServerOptions: {
        autoStart: false,
        binary: {
            skipMD5: true,
            version: "6.0.4"
        },
        replSet: {
            count: 1,
            dbName: "testing-mongo-instance",
            storageEngine: "wiredTiger"
        }
    }
};

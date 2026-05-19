/* eslint-disable unicorn/prefer-module */
const path = require("node:path");

const nxPreset = require("@nx/jest/preset").default;

process.env.MONGO_MEMORY_SERVER_FILE = path.resolve(__dirname, "jest-mongodb-config.js");

const mongoPreset = require("@shelf/jest-mongodb/jest-preset");
const merged = Object.assign(nxPreset, mongoPreset);

module.exports = { ...merged };

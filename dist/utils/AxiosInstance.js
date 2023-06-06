"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const axiosInstance = axios_1.default.create({
    baseURL: process.env.BUGZILLA_BASE_URI,
    headers: { 'X-BUGZILLA-API-KEY': "fyllmSnPzW4qLtviHHQmJeb5llfnT2pcyJYSab5k", 'Content-Type': 'application/json' },
});
exports.default = axiosInstance;

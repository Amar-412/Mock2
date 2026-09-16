import dotenv from "dotenv";
dotenv.config();

if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not defined in environment variables");
}

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
}

if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error("GOOGLE_CLIENT_ID is not defined in environment variables");
}

if (!process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error("GOOGLE_CLIENT_SECRET is not defined in environment variables");
}

if (!process.env.GOOGLE_REFRESH_TOKEN) {
    throw new Error("GOOGLE_REFRESH_TOKEN is not defined in environment variables");
}

if (!process.env.GOOGLE_USER) {
    throw new Error("GOOGLE_USER is not defined in environment variables");
}

const config = {
    MONGO_URI: process.env.MONGO_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN,
    GOOGLE_USER: process.env.GOOGLE_USER,
    PORT: Number(process.env.PORT || 3000),
    STORAGE_ROOT: process.env.STORAGE_ROOT || "./storage",
    SUBMISSIONS_STORAGE: process.env.SUBMISSIONS_STORAGE || "./storage/submissions",
    EVENT_DOCUMENT_STORAGE: process.env.EVENT_DOCUMENT_STORAGE || "./storage/event-documents",
    CHAT_STORAGE: process.env.CHAT_STORAGE || "./storage/chat",
    MAX_IMAGE_SIZE_MB: Number(process.env.MAX_IMAGE_SIZE_MB || 5),
    MAX_VIDEO_SIZE_MB: Number(process.env.MAX_VIDEO_SIZE_MB || 20),
    MAX_DOCUMENT_SIZE_MB: Number(process.env.MAX_DOCUMENT_SIZE_MB || 10),
    AI_SERVICE_URL: process.env.AI_SERVICE_URL || "http://127.0.0.1:8001"
};

export default config;
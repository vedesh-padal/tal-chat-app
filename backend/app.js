import cors from "cors"
import { createServer } from "http";
import path from "path";
import { Server } from "socket.io";
import { DB_NAME } from "./constants.js";
import { dbInstance } from "./db/index.js";
import { initializeSocketIO } from "./socket/index.js";
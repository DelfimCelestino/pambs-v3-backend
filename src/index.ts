import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import authRoutes from "./routes/authRoutes";
import cron from "node-cron";
import { syncClients } from "./utils/functions";
import clientRoutes from "./routes/clientRoutes";
import planRoutes from "./routes/planRoutes";
import userRoutes from "./routes/userRoutes";
import { initializeSuperRoot } from "./utils/init";
import packageRoutes from "./routes/packageRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import messageRoutes from "./routes/messageRoutes";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const useHttps = process.env.USE_HTTPS === "true";

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/users", userRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/messages", messageRoutes);

app.get("/api", (req, res) => {
  res.send("Welcome to PAMBS API!");
});

const getSslOptions = () => {
  try {
    const sslDir =
      process.env.NODE_ENV === "production"
        ? path.join(__dirname, "ssl")
        : path.join(__dirname, "..", "src", "ssl");
    return {
      key: fs.readFileSync(path.join(sslDir, "private.key")),
      cert: fs.readFileSync(path.join(sslDir, "certificate.crt")),
      ca: fs.readFileSync(path.join(sslDir, "ca_bundle.crt")),
    };
  } catch (error) {
    console.error("Failed to read SSL files:", error);
    return null;
  }
};

cron.schedule("* * * * *", async () => {
  console.log(
    `Running cron job... ${new Date().toLocaleString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })} 🚀`
  );
  await syncClients();
});

const createServer = () => {
  if (useHttps) {
    const sslOptions = getSslOptions();
    if (sslOptions) {
      return https.createServer(sslOptions, app);
    } else {
      console.warn("SSL files not found or invalid. Falling back to HTTP.");
      return http.createServer(app);
    }
  } else {
    return http.createServer(app);
  }
};

const startServer = async () => {
  try {
    await initializeSuperRoot();

    const server = createServer();

    server.listen(port, () => {
      console.log(
        `Hey Deny! The Server is running on port ${port} using ${
          useHttps ? "HTTPS" : "HTTP"
        }. Let's fly to the Future 🚀!`
      );
    });

    syncClients();

    server.on("error", (error: any) => {
      console.error("Server error:", error);
      if (error.code === "EADDRINUSE") {
        console.log(`Port ${port} is already in use. Retrying in 5 seconds...`);
        setTimeout(() => {
          server.close();
          startServer();
        }, 5000);
      }
    });
  } catch (error) {
    console.error("Erro ao iniciar servidor:", error);
    process.exit(1);
  }
};

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

startServer();

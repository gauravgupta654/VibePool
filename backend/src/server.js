const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const { setupSockets } = require("./sockets/socketManager");
const authRoutes = require("./routes/authRoutes");

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Setup WebSockets
const io = setupSockets(server);

// Make io accessible to our router if needed
app.set('io', io);

// Basic health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "CarPooling Backend is running!" });
});

// Auth routes
app.use("/api/auth", authRoutes);

// We will add more routes here later:
// const rideRoutes = require("./routes/rideRoutes");
// app.use("/api/rides", rideRoutes);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

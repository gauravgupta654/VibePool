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

// Geocoding Proxy (To bypass Nominatim CORS/Rate limit blocks)
app.get("/api/geocode", async (req, res) => {
  try {
    const { q } = req.query;
    
    // Switched to Open-Meteo Geocoding API because Nominatim IP bans users easily
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&format=json`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Geocoding API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    // Map Open-Meteo response to match the exact structure Nominatim used, 
    // so we don't have to change any frontend code!
    const formattedResults = (data.results || []).map(item => ({
      place_id: item.id,
      display_name: `${item.name}${item.admin1 ? ', ' + item.admin1 : ''}${item.country ? ', ' + item.country : ''}`,
      lat: item.latitude.toString(),
      lon: item.longitude.toString()
    }));
    
    res.json(formattedResults);
  } catch (error) {
    console.error("Geocoding Proxy Error:", error);
    res.status(500).json({ error: "Failed to fetch geocoding data" });
  }
});

// Routing Proxy (To bypass OSRM Browser CORS blocks / Ad-blockers)
app.get("/api/route", async (req, res) => {
  try {
    const { start, end } = req.query;
    const url = `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Routing API returned ${response.status}`);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Routing Proxy Error:", error);
    res.status(500).json({ error: "Failed to fetch routing data" });
  }
});

// We will add more routes here later:
// const rideRoutes = require("./routes/rideRoutes");
// app.use("/api/rides", rideRoutes);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;

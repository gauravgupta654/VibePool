const { Server } = require("socket.io");
const fs = require('fs');
const path = require('path');
const { sendRideConfirmation } = require('../utils/emailService');

// Load drivers data
const driversPath = path.join(__dirname, '../data/drivers.json');
let driversData = {};
try {
  driversData = JSON.parse(fs.readFileSync(driversPath, 'utf8'));
} catch (e) {
  console.error("Failed to load drivers data", e);
}

const setupSockets = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*", // allow all origins for dev
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // Join a room based on user ID for direct messages
    socket.on("join", (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined room ${userId}`);
    });

    // Driver location update
    socket.on("driver_location_update", (data) => {
      // Broadcast driver location to riders looking for cabs
      // In a real app, this would use Redis or Geo-spatial queries
      io.emit("nearby_cab_update", data);
    });

    // Rider requests a ride
    socket.on("request_ride", (rideData) => {
      console.log(`Ride requested by ${socket.id}`, rideData);
      
      // Simulate broadcasting to drivers...
      io.emit("new_ride_request", rideData);
      
      // Simulate a driver accepting the ride after 2 seconds
      setTimeout(() => {
        // Pick a random driver
        const states = Object.keys(driversData);
        let selectedDriver = null;
        
        if (states.length > 0) {
          // Default to a random state if not specifically searching by state
          const randomState = states[Math.floor(Math.random() * states.length)];
          const stateDrivers = driversData[randomState];
          selectedDriver = stateDrivers[Math.floor(Math.random() * stateDrivers.length)];
        } else {
          // Fallback if drivers.json is empty
          selectedDriver = { name: "Raju Driver", mobile: "+91 99999 00000", dl: "XX-000000000" };
        }

        const driverLocation = [
          rideData.pickup[0] + (Math.random() - 0.5) * 0.01,
          rideData.pickup[1] + (Math.random() - 0.5) * 0.01
        ];

        io.to(socket.id).emit("cab_booked", {
          riderId: socket.id,
          driverId: selectedDriver.id,
          driverDetails: selectedDriver,
          driverLocation: driverLocation,
          rideStatus: "ACCEPTED"
        });
        
        console.log(`Ride accepted for ${socket.id}. Assigned driver: ${selectedDriver.name}`);

        // Send Email confirmation
        if (rideData.userEmail) {
          sendRideConfirmation(
            rideData.userEmail, 
            {
              rideType: rideData.rideType,
              price: rideData.price,
              pickupAddress: rideData.pickupQuery || "Pickup Location",
              dropoffAddress: rideData.dropoffQuery || "Destination"
            },
            selectedDriver
          );
        }
      }, 2000);
    });

    // Driver accepts a ride
    socket.on("ride_accepted", (data) => {
      // data should contain { riderId, driverId, rideId }
      io.to(data.riderId).emit("cab_booked", data);
    });

    // Driver updates ride status (arriving, started, completed)
    socket.on("ride_status_change", (data) => {
      // data should contain { riderId, status }
      io.to(data.riderId).emit("ride_status_updated", data);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return io;
};

module.exports = { setupSockets };

const { Server } = require("socket.io");

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
        const driverId = "simulated-driver-123";
        const driverLocation = [
          rideData.pickup[0] + (Math.random() - 0.5) * 0.01,
          rideData.pickup[1] + (Math.random() - 0.5) * 0.01
        ];

        io.to(socket.id).emit("cab_booked", {
          riderId: socket.id,
          driverId: driverId,
          driverLocation: driverLocation,
          rideStatus: "ACCEPTED"
        });
        console.log(`Ride accepted for ${socket.id}`);
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

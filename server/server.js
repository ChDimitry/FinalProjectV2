const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const axios = require("axios");
const cors = require("cors");
const corsAnywhere = require("cors-anywhere");

const app = express();
const server = http.createServer(app);

// Configure socket.io with CORS
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "fiware-service",
      "fiware-servicepath",
      "Link",
      "Accept",
    ],
  },
});

// Enable CORS for all origins on Express
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "fiware-service",
      "fiware-servicepath",
      "Link",
      "Accept",
    ],
  })
);

// Set up CORS Anywhere for proxied requests
const corsProxy = corsAnywhere.createServer({
  originWhitelist: [], // Allow all origins
  requireHeader: [],
  removeHeaders: [],
});

// CORS proxy route
app.use("/cors-anywhere", (req, res) => {
  corsProxy.emit("request", req, res);
});

// API URL (using the CORS proxy)
const API_URL = "http://172.16.101.172:1026/ngsi-ld/v1/entities/?local=true";

let cachedData = null;

// Function to fetch data from the API
const fetchDevices = async () => {
  try {
    const response = await axios.get(
      `http://localhost:5000/cors-anywhere/${API_URL}`,
      {
        headers: {
          Accept: "application/json",
          Link: '<http://context/ngsi-context.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"',
          "fiware-service": "openiot",
          "fiware-servicepath": "/",
        },
      }
    );
    cachedData = response.data;
    io.emit("devices", cachedData); // Broadcast the data to all connected clients
  } catch (error) {
    console.error("Error fetching data from external API:", error.message);
  }
};

// Fetch data initially and then every 5 seconds
fetchDevices();
setInterval(fetchDevices, 5000);

io.on("connection", (socket) => {
  console.log("New client connected");

  // Send the cached data to the new client
  if (cachedData) {
    socket.emit("devices", cachedData);
  }

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

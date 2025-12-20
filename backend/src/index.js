const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Import routes
const branchRoute = require("./routes/branchRoute");
const serviceRoute = require("./routes/serviceRoute");
const salesRoute = require("./routes/salesRoute");
const staffRoute = require("./routes/staffRoute");

// Routes
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// Use route files
app.use("/branches", branchRoute);
app.use("/services", serviceRoute);
app.use("/sales", salesRoute);
app.use("/staff", staffRoute);

app.listen(4000, () => console.log("Server running on port 4000"));

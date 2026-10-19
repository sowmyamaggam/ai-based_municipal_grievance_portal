const http = require("http");

// Users data
const users = [
  { id: 1, name: "ravi" },
  { id: 2, name: "suresh" },
];

// Products data
const products = [
  { id: 101, name: "Laptop", price: 50000 },
  { id: 102, name: "mobile", price: 20000 },
];

// Create HTTP Server
const server = http.createServer((req, res) => {
  // Set response header
  res.setHeader("Content-Type", "application/json");

  // GET Users API
  if (req.url === "/api/users" && req.method === "GET") {
    res.statusCode = 200;
    res.end(JSON.stringify(users));
  }

  // GET Products API
  else if (req.url === "/api/products" && req.method === "GET") {
    res.statusCode = 200;
    res.end(JSON.stringify(products));
  }

  // Invalid URL
  else {
    res.statusCode = 404;
    res.end(
      JSON.stringify({
        message: "API endpoint not found",
      }),
    );
  }
});

// Start Server
server.listen(3000, () => {
  console.log("Server running on port 3000");
});

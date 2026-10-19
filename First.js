var http = require("http");

var server = http.createServer((req, res) => {
  res.write("Welcome to Node.js");
  res.end();
});

server.listen(8900, () => {
  console.log("Server is listening on the port");
});

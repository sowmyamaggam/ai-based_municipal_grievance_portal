var http = require("http");

var students = [
  { studentid: "1", studentname: "sowmya", studentcourse: "cse" },
  { studentid: "2", studentname: "kavya", studentcourse: "cse" },
  { studentid: "3", studentname: "nandini", studentcourse: "cse" },
];

const server = http.createServer((req, res) => {
  if (req.url === "/api/students" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(students));
  }
});

server.listen(2000, () => {
  console.log("data retrieved");
});

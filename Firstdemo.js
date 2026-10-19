var fs = require("fs");
fs.writeFile("myfile.txt", "Hello World", function (err) {
  if (err) {
    console.log(err);
    return;
  }
  console.log("File written successfully");
});
fs.readFile("myfile.txt", "utf8", function (err, data) {
  if (err) {
    console.log(err);
    return;
  }
  console.log("File read successfully");
  console.log(data);
});
fs.appendFile("myfile.txt", " This is an appended text.", function (err) {
  if (err) {
    console.log(err);
    return;
  }
  console.log("File appended successfully");
  fs.readFile("myfile.txt", "utf8", function (err, data) {
    if (err) {
      console.log(err);
      return;
    }
    console.log("File read successfully after appending");
    console.log(data);
  });
});
fs.unlink("myfile.txt", function (err) {
  if (err) {
    console.log(err);
    return;
  }
  console.log("File deleted successfully");
});

const express = require('express');
const app = express();

const http = require('http');
const server = http.createServer(app);

const { Server } = require("socket.io");
const io = new Server(server);

const fs = require('fs');
const { spawn } = require('child_process');

function getPrismPath() {
  var path = process.cwd();
  var buffer = fs.readFileSync(path + "/config.txt");
  return buffer.toString()
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

let accessible_files = ["script.js", "style.css", "person.png", "car.png", "scene.png", "handle.png", "socket.io/socket.io.js"];
accessible_files.map((file_name) => {
  app.get(`/${file_name}`, (req, res) => {
    res.sendFile(__dirname + `/${file_name}`);
  });
});

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('generate', (path_length, person_x, person_y, car_x, car_y, top_corner_x, top_corner_y, bottom_corner_x, bottom_corner_y) => {
    const runner = spawn('python3', ['prism_runner.py']);
    runner.stdin.write(`${path_length} ${person_x} ${person_y} ${car_x} ${car_y} ${top_corner_x} ${top_corner_y} ${bottom_corner_x} ${bottom_corner_y}`);
    runner.stdin.end();
    runner.stdout.on('data', (data) => {
        socket.emit("path", data.toString());
        console.log(data.toString());
    });
  });
});

server.listen(8000, () => {
  console.log('listening on *:8000');
});
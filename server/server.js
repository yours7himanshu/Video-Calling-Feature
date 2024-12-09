const express = require("express");
require("dotenv").config();
const { Server } = require("socket.io");
const http = require("http");
const app = express();
const cors = require('cors')
const server = http.createServer(app);
const io = new Server(server, {cors: true});

// some middlewares for parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const emailToSocketMapping = new Map();
const socketToEmailMapping = new Map();

io.on("connection", (socket) => {
  console.log("New Connection");

  socket.on("join-room", (data) => {
    const { roomId, emailId } = data;
    console.log("User", emailId, "Joined Room", roomId);
    emailToSocketMapping.set(emailId, socket.id);
    socketToEmailMapping.set(socket.id, emailId);
    socket.join(roomId);
    socket.emit("joined-room", { roomId });
    socket.broadcast.to(roomId).emit("user-joined", { emailId });
  });

  socket.on('call-user', (data) => {
    const { emailId, offer } = data;
    const fromEmail = socketToEmailMapping.get(socket.id);
    const socketId = emailToSocketMapping.get(emailId);
    if (socketId) {
      socket.to(socketId).emit('incomming-call', { from: fromEmail, offer });
    }
  });

  socket.on('call-accepted', (data) => {
    const { emailId, ans } = data;
    const socketId = emailToSocketMapping.get(emailId);
    if (socketId) {
      socket.to(socketId).emit('call-accepted', { ans });
    }
  });

  socket.on('ice-candidate', (data) => {
    const { candidate, to } = data;
    const socketId = emailToSocketMapping.get(to);
    if (socketId) {
      socket.to(socketId).emit('ice-candidate', { candidate });
    }
  });

  socket.on('renegotiate', (data) => {
    const { offer, to } = data;
    const socketId = emailToSocketMapping.get(to);
    if (socketId) {
      socket.to(socketId).emit('renegotiate', { offer });
    }
  });

  socket.on('disconnect', () => {
    const emailId = socketToEmailMapping.get(socket.id);
    if (emailId) {
      emailToSocketMapping.delete(emailId);
      socketToEmailMapping.delete(socket.id);
    }
  });
});

// testing our backend server
app.get("/", (req, res) => {
  res.send("<h1>Welcome to my video calling backend server</h1>");
});

// listening the server
server.listen(process.env.PORT, () => {
  console.log(`Server is working on port:${process.env.PORT}`);
});

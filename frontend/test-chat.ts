import { io } from "socket.io-client";
import axios from "axios";

async function runTest() {
  console.log("Starting test...");
  const api = axios.create({ baseURL: "http://localhost:5005/api" });

  try {
    // 1. Register User A
    let tokenA;
    try {
      const resA = await api.post("/auth/register", { username: "TestUserA", password: "password123" });
      tokenA = resA.data.token;
    } catch(e) {
      const resA = await api.post("/auth/login", { username: "TestUserA", password: "password123" });
      tokenA = resA.data.token;
    }

    // 2. Register User B
    let tokenB;
    try {
      const resB = await api.post("/auth/register", { username: "TestUserB", password: "password123" });
      tokenB = resB.data.token;
    } catch(e) {
      const resB = await api.post("/auth/login", { username: "TestUserB", password: "password123" });
      tokenB = resB.data.token;
    }

    console.log("Users authenticated.");

    // 3. Connect Sockets
    const socketA = io("http://localhost:5005", { auth: { token: tokenA } });
    const socketB = io("http://localhost:5005", { auth: { token: tokenB } });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("Socket A connected:", socketA.connected);
    console.log("Socket B connected:", socketB.connected);

    socketA.on("receive_message", (msg) => {
      console.log("User A received:", msg.content, "from", msg.senderId.username);
    });

    socketB.on("receive_message", (msg) => {
      console.log("User B received:", msg.content, "from", msg.senderId.username);
    });

    socketA.on("error", (err) => console.log("Socket A error:", err));
    socketB.on("error", (err) => console.log("Socket B error:", err));

    // User A sends message
    console.log("User A sending message...");
    socketA.emit("send_message", { roomId: "general", content: "Hello from A" });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // User B sends message
    console.log("User B sending message...");
    socketB.emit("send_message", { roomId: "general", content: "Hello from B" });

    await new Promise((resolve) => setTimeout(resolve, 2000));

    socketA.disconnect();
    socketB.disconnect();
    console.log("Test finished.");
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}

runTest();

import React, { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { v4 as uuidv4 } from "uuid";

const fetchEmployeeName = async (employeeId) => {
  const sheetURL = "https://script.google.com/macros/s/AKfycbz7HwfE1HSV6_FERG1ydNt8g_CFhJg2YoAAEkphcpKP2a3YdjxhD86lHAaPTk63vN90/exec"; // Replace with actual API endpoint
  try {
    const response = await fetch(`${sheetURL}?employeeId=${employeeId}`);
    const data = await response.json();
    return data.name || "Unknown";
  } catch (error) {
    console.error("Error fetching employee name:", error);
    return "Unknown";
  }
};

const App = () => {
  const [roomId, setRoomId] = useState(uuidv4()); // Generate unique room ID
  const [currentUser, setCurrentUser] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [queue, setQueue] = useState([]);
  const qrData = `${window.location.origin}?room=${roomId}`; // Updated QR Data format

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");
    if (room) {
      setRoomId(room);
    }
  }, []);

  useEffect(() => {
    if (!currentUser && queue.length > 0) {
      showNextUser();
    }
  }, [queue]); // Automatically process queue when it updates

  const handleJoin = async () => {
    if (employeeId.trim()) {
      const name = await fetchEmployeeName(employeeId);
      setQueue((prevQueue) => [...prevQueue, name]);
      setEmployeeId("");
    }
  };

  const showNextUser = () => {
    if (queue.length > 0) {
      setCurrentUser(queue[0]); // Show first user in queue
      setTimeout(() => {
        setQueue((prevQueue) => prevQueue.slice(1)); // Remove first user after delay
        setCurrentUser("");
      }, 3000); // Show each user for 3 seconds
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Room ID: {roomId}</h1>
      <div style={{ position: "absolute", top: 10, right: 10 }}>
        <QRCodeCanvas value={qrData} size={128} />
      </div>
      <h2>{currentUser ? `Welcome ${currentUser}!` : "Waiting for participants..."}</h2>
      {!window.location.search.includes("room") && (
        <p>Scan the QR Code to join the room</p>
      )}
      {window.location.search.includes("room") && (
        <div>
          <input
            type="text"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            placeholder="Enter your Employee ID"
          />
          <button onClick={handleJoin}>Join</button>
        </div>
      )}
    </div>
  );
};

export default App;

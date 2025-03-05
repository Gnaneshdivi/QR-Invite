import React, { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { db } from "./firebase";
import { ref, set, push, onValue, remove } from "firebase/database";

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

const generateRoomCode = () => {
  return Math.floor(100 + Math.random() * 900).toString(); // 3-digit code
};

const App = () => {
  const [roomId, setRoomId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("room") || generateRoomCode();
  });
  const [currentUser, setCurrentUser] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [queue, setQueue] = useState([]);
  const [joinStatus, setJoinStatus] = useState(null); // Success/Failure status
  const qrData = `${window.location.origin}?room=${roomId}`;

  useEffect(() => {
    if (!window.location.search.includes("room")) {
      console.log("Listening for updates in room:", roomId);
      const roomRef = ref(db, `rooms/${roomId}`);
      onValue(roomRef, (snapshot) => {
        if (snapshot.exists()) {
          const users = Object.values(snapshot.val());
          setQueue(users.map((entry) => entry.name));
          console.log("Updated queue:", users.map((entry) => entry.name));
        } else {
          console.log("No users in room yet.");
        }
      });
    }
  }, [roomId]);

  useEffect(() => {
    if (!currentUser && queue.length > 0) {
      showNextUser();
    }
  }, [queue]);

  const handleJoin = async () => {
    if (employeeId.trim()) {
      try {
        const name = await fetchEmployeeName(employeeId);
        console.log("Employee Name Fetched:", name);
        if (name === "Unknown") {
          setJoinStatus("failure");
          return;
        }

        const roomRef = ref(db, `rooms/${roomId}`);
        const newUserRef = push(roomRef);
        await set(newUserRef, { name, timestamp: Date.now() });
        console.log("User added to Firebase:", name);
        setJoinStatus("success");
        setTimeout(() => {
          window.location.href = `${window.location.origin}?room=${roomId}`; // Redirect back to main screen
        }, 1000);
      } catch (error) {
        console.error("Error joining room:", error);
        setJoinStatus("failure");
      }
    }
  };

  const showNextUser = () => {
    if (queue.length > 0) {
      setCurrentUser(queue[0]);
      setTimeout(() => {
        setQueue((prevQueue) => prevQueue.slice(1));
        setCurrentUser("");
        const roomRef = ref(db, `rooms/${roomId}`);
        onValue(roomRef, (snapshot) => {
          if (snapshot.exists()) {
            const users = Object.keys(snapshot.val());
            remove(ref(db, `rooms/${roomId}/${users[0]}`)); // Remove first user after delay
            console.log("User removed from Firebase:", users[0]);
          }
        });
      }, 3000);
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      {!window.location.search.includes("room") ? (
        <>
          <h1>Room Code: {roomId}</h1>
          <div style={{ position: "absolute", top: 10, right: 10 }}>
            <QRCodeCanvas value={qrData} size={128} />
          </div>
          <h2>{currentUser ? `Welcome ${currentUser}!` : "Waiting for participants..."}</h2>
          <p>Scan the QR Code to join the room</p>
        </>
      ) : (
        <div>
          <input
            type="text"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            placeholder="Enter your Employee ID"
          />
          <button onClick={handleJoin}>Join</button>
          {joinStatus === "success" && <p style={{ color: "green" }}>Successfully joined!</p>}
          {joinStatus === "failure" && <p style={{ color: "red" }}>Failed to join. Invalid Employee ID.</p>}
        </div>
      )}
    </div>
  );
};

export default App;

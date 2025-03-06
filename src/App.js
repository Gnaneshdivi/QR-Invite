"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { db } from "./firebase";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { ref, set, push, onValue, remove, get } from "firebase/database";
import "./App.css";

const firestore = getFirestore();

const fetchEmployeeName = async (employeeId) => {
  const sheetURL =
    "https://script.google.com/macros/s/AKfycbz7HwfE1HSV6_FERG1ydNt8g_CFhJg2YoAAEkphcpKP2a3YdjxhD86lHAaPTk63vN90/exec";
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
  return Math.floor(100 + Math.random() * 900).toString();
};

const RoomScreen = ({ roomId, queue, setQueue, qrData }) => {
  const [displayText, setDisplayText] = useState("Welcome to the Event");
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (queue.length > 0) {
      const nextUser = queue[0];
      setCurrentUser(nextUser);
      setDisplayText(`Welcome ${nextUser}!`);

      setTimeout(async () => {
        setDisplayText("Welcome to the Event");
        setQueue((prevQueue) => prevQueue.slice(1));
        const queueRef = ref(db, `rooms/${roomId}/queue`);
        const snapshot = await get(queueRef);
        if (snapshot.exists()) {
          const users = Object.entries(snapshot.val());
          if (users.length > 0) {
            await remove(ref(db, `rooms/${roomId}/queue/${users[0][0]}`));
            console.log("User removed from Firebase queue:", users[0][1].name);
          }
        }
      }, 5000);
    }
  }, [queue, roomId, setQueue]);

  return (
    <div className="room-screen">
      <div className="logo-container">
        <img src="/Cipla_logo.png" alt="Cipla Logo" className="cipla-logo" />
      </div>
      <div className="logo-event-container">
        <img
          src="/cipla_event_logo.jpeg"
          alt="Cipla Logo"
          className="cipla-event-logo"
        />
      </div>
      <div className="content">
        <div className="qr-container">
          <div className="qr">
          <QRCodeCanvas value={qrData} size={128} />
          </div>
          <p className="room-id">Screen: {roomId}</p>
          <p className="scan-text">Scan to engage</p>
          <div className="rewardsy-section">
            <p>powered by </p>
            <img
              src="/rewardsy_logo.png"
              alt="Cipla Logo"
              className="rewardsy-logo"
            />
          </div>
        </div>
        <div className="room-content">
          <div className="welcome-message">
            <h1>{displayText}</h1>
          </div>
        </div>
      </div>
    </div>
  );
};

const JoinScreen = ({ roomId }) => {
  const [employeeId, setEmployeeId] = useState("");
  const [joinStatus, setJoinStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (employeeId.trim()) {
      setLoading(true);
      try {
        const name = await fetchEmployeeName(employeeId);
        console.log("Employee Name Fetched:", name);
        if (name === "Unknown") {
          setJoinStatus("failure");
          setLoading(false);
          return;
        }
        const roomRef = ref(db, `rooms/${roomId}/queue`);
        const newUserRef = push(roomRef);
        await set(newUserRef, { name, timestamp: Date.now() });
        console.log("User added to Firebase queue:", name);
        await addDoc(collection(firestore, "scannedUsers"), {
          roomId,
          employeeId,
          name,
          timestamp: new Date(),
        });
        console.log("User added to Firestore log:", name);
        setJoinStatus("success");
        setTimeout(() => setJoinStatus(null), 2000);
      } catch (error) {
        console.error("Error joining room:", error);
        setJoinStatus("failure");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="join-screen">
      <nav className="join-nav">
        <img src="/tab_Logo.png" alt="Rewardsy Logo" className="nav-logo" />
        <img src="/Cipla_logo.png" alt="Cipla Logo" className="nav-logo" />
      </nav>
      <div className="join-content">
        <h2>Enter Employee ID</h2>
        <input
          type="text"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          placeholder="Employee ID"
          disabled={loading}
          className="employee-input"
        />
        <button
          onClick={handleJoin}
          disabled={loading}
          className="submit-button"
        >
          {loading ? "Submitting..." : "Submit"}
        </button>
        {joinStatus === "success" && (
          <p className="status-success">✅ Successfully joined!</p>
        )}
        {joinStatus === "failure" && (
          <p className="status-failure">
            ❌ Failed to join. Invalid Employee ID.
          </p>
        )}
      </div>
    </div>
  );
};

const App = () => {
  const [roomId, setRoomId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("room") || generateRoomCode();
  });
  const [queue, setQueue] = useState([]);
  const qrData = `${window.location.origin}?room=${roomId}`;

  useEffect(() => {
    if (!window.location.search.includes("room")) {
      console.log("Creating and listening for room:", roomId);
      const roomRef = ref(db, `rooms/${roomId}`);
      set(roomRef, { active: true, queue: {} });
      const queueRef = ref(db, `rooms/${roomId}/queue`);
      onValue(queueRef, (snapshot) => {
        if (snapshot.exists()) {
          const users = Object.values(snapshot.val());
          setQueue(users.map((entry) => entry.name));
          console.log(
            "Updated queue:",
            users.map((entry) => entry.name)
          );
        } else {
          console.log("No users in room yet.");
        }
      });
    }
  }, [roomId]);

  return window.location.search.includes("room") ? (
    <JoinScreen roomId={roomId} />
  ) : (
    <RoomScreen
      roomId={roomId}
      queue={queue}
      setQueue={setQueue}
      qrData={qrData}
    />
  );
};

export default App;

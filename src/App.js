import React, { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { db } from "./firebase";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { ref, set, push, onValue, remove, get } from "firebase/database";

const firestore = getFirestore();

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

const RoomScreen = ({ roomId, queue, currentUser, qrData }) => {
  const [displayText, setDisplayText] = useState("Welcome to the Event");

  useEffect(() => {
    if (currentUser) {
      setDisplayText(`Welcome ${currentUser}!`);
      setTimeout(() => {
        setDisplayText("Welcome to the Event");
      }, 5000);
    }
  }, [currentUser]);

  return (
    <div style={{ textAlign: "center", marginTop: "50px", position: "relative" }}>
      <img src={"/Cipla_logo.png"} alt="Cipla Logo" style={{ width: "200px", marginBottom: "20px" }} />
      <div style={{ position: "absolute", top: 10, right: 10, textAlign: "center" }}>
        <QRCodeCanvas value={qrData} size={128} />
        <p>Screen: {roomId}</p>
        <p>Scan to interact</p>
      </div>
      <h1 style={{ fontSize: "48px", marginTop: "100px" }}>{displayText}</h1>
    </div>
  );
};

const JoinScreen = ({ roomId, employeeId, setEmployeeId, handleJoin, joinStatus }) => {
  return (
    <div style={{ textAlign: "center", marginTop: "50px",  height: "100vh" }}>
     <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "black", position: "fixed", width: "100%", top: 0, left: 0, zIndex: 100 }}>
        <img src={"/tab_Logo.png"} alt="Rewardsy Logo" style={{ height: "40px", alignSelf: "flex-start",padding:"10px" }} />
        <img src={"/Cipla_logo.png"} alt="Cipla Logo" style={{ height: "40px", alignSelf: "flex-end",padding:"10px" }} />
      </nav>
      <div style={{ marginTop: "100px" }}>
        <h2>Enter Employee ID</h2>
        <input
          type="text"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          placeholder="Employee ID"
          style={{ padding: "10px", fontSize: "18px", width: "250px", textAlign: "center", marginBottom: "20px", background: "white", color: "black" }}
        />
        <br />
        <button
          onClick={handleJoin}
          style={{ padding: "15px 30px", fontSize: "20px", background: "#007bff", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}
        >
          Submit
        </button>
        {joinStatus === "success" && <p style={{ color: "green", fontSize: "24px", marginTop: "20px" }}>✅ Successfully joined!</p>}
        {joinStatus === "failure" && <p style={{ color: "red", fontSize: "24px", marginTop: "20px" }}>❌ Failed to join. Invalid Employee ID.</p>}
      </div>
    </div>
  );
};

const App = () => {
  const [roomId, setRoomId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("room") || generateRoomCode();
  });
  const [currentUser, setCurrentUser] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [queue, setQueue] = useState([]);
  const [joinStatus, setJoinStatus] = useState(null);
  const qrData = `${window.location.origin}?room=${roomId}`;

  useEffect(() => {
    if (!window.location.search.includes("room")) {
      console.log("Creating and listening for room:", roomId);
      const roomRef = ref(db, `rooms/${roomId}`);
      set(roomRef, { active: true, queue: {} }); // Ensure room is created
      const queueRef = ref(db, `rooms/${roomId}/queue`);
      onValue(queueRef, (snapshot) => {
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
      setCurrentUser(queue[0]);
      setQueue((prevQueue) => prevQueue.slice(1));
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
        const roomRef = ref(db, `rooms/${roomId}/queue`);
        const newUserRef = push(roomRef);
        await set(newUserRef, { name, timestamp: Date.now() });
        console.log("User added to Firebase queue:", name);
        await addDoc(collection(firestore, "scannedUsers"), {
          roomId,
          employeeId,
          name,
          timestamp: new Date()
        });
        console.log("User added to Firestore log:", name);
        setJoinStatus("success");
        setTimeout(() => setJoinStatus(null), 2000);
      } catch (error) {
        console.error("Error joining room:", error);
        setJoinStatus("failure");
      }
    }
  };

  return window.location.search.includes("room") ? (
    <JoinScreen roomId={roomId} employeeId={employeeId} setEmployeeId={setEmployeeId} handleJoin={handleJoin} joinStatus={joinStatus} />
  ) : (
    <RoomScreen roomId={roomId} queue={queue} currentUser={currentUser} qrData={qrData} />
  );
};

export default App;
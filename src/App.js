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

const showNextUser = async (queue, setQueue, setCurrentUser, roomId) => {
  if (queue.length > 0) {
    setCurrentUser(queue[0]);
    setTimeout(async () => {
      setQueue((prevQueue) => prevQueue.slice(1));
      setCurrentUser("");
      const queueRef = ref(db, `rooms/${roomId}/queue`);
      const snapshot = await get(queueRef);
      if (snapshot.exists()) {
        const users = Object.entries(snapshot.val());
        await remove(ref(db, `rooms/${roomId}/queue/${users[0][0]}`));
        console.log("User removed from Firebase queue:", users[0][1].name);
      }
    }, 3000);
  }
};

const RoomScreen = ({ roomId, queue, currentUser, qrData }) => {
  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Room Code: {roomId}</h1>
      <div style={{ position: "absolute", top: 10, right: 10 }}>
        <QRCodeCanvas value={qrData} size={128} />
      </div>
      <h2>{currentUser ? `Welcome ${currentUser}!` : "Waiting for participants..."}</h2>
      <p>Scan the QR Code to join the room</p>
    </div>
  );
};

const JoinScreen = ({ roomId, employeeId, setEmployeeId, handleJoin, joinStatus }) => {
  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      {joinStatus === "success" ? (
        <p style={{ color: "green", fontSize: "24px" }}>✅ Successfully joined!</p>
      ) : joinStatus === "failure" ? (
        <p style={{ color: "red", fontSize: "24px" }}>❌ Failed to join. Invalid Employee ID.</p>
      ) : (
        <>
          <input
            type="text"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            placeholder="Enter your Employee ID"
          />
          <button onClick={handleJoin}>Join</button>
        </>
      )}
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
      showNextUser(queue, setQueue, setCurrentUser, roomId);
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
    <JoinScreen
      roomId={roomId}
      employeeId={employeeId}
      setEmployeeId={setEmployeeId}
      handleJoin={handleJoin}
      joinStatus={joinStatus}
    />
  ) : (
    <RoomScreen roomId={roomId} queue={queue} currentUser={currentUser} qrData={qrData} />
  );
};

export default App;

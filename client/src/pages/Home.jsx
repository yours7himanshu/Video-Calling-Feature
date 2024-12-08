import React, { useCallback } from "react";
import { useState } from "react";
import { useSocket } from "../providers/Socket";
import { useEffect } from "react";
import {useNavigate} from 'react-router-dom'

const Home = () => {
  const {socket} = useSocket();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [roomId, setRoomId] = useState("");
  const [loading, setLoading] = useState(false);


  const handleRoomJoined = useCallback(({roomId})=>{
    navigate(`/room/${roomId}`)
    },[navigate])

  useEffect(()=>{
    socket.on("joined-room",handleRoomJoined);
    return ()=>{
      socket.off("joined-room",handleRoomJoined);
    }
  },[handleRoomJoined,socket])

  const handleJoinRoom = (e)=>{

   setLoading(true);
   try{
    e.preventDefault();
    socket.emit('join-room',{emailId:email , roomId:roomId});
    console.log("Response submitted")
   }
   catch(error){
    console.log("Error occured",error);
   }
   finally{
    setLoading(false);
   }
  }

 
  
  return (
    <div>
      <form onSubmit={handleJoinRoom}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          className="email"
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="text"
          placeholder="Enter Room Id "
          value={roomId}
          className="room"
          onChange={(e) => setRoomId(e.target.value)}
          required
        />
        <button  disabled={loading} type="submit">
        {loading ? "Entering" : "Enter Room"}
      </button>
      </form>

    
    </div>
  );
};

export default Home;

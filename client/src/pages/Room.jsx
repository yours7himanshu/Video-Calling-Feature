import { useCallback, useEffect, useState } from "react";
import { useSocket } from "../providers/Socket";
import { usePeer } from "../providers/Peer";


const RoomPage = () => {
  const { socket } = useSocket();
  const {
    peer,
    createOffer,
    createAnswer,
    setRemoteAns,
    sendStream,
    remoteStream,
  } = usePeer();
  const [myStream, setMyStream] = useState(null);
  const [remoteEmailId, setRemoteEmailId] = useState();

  const getUserMediaStream = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    setMyStream(stream);
    sendStream(stream); // Automatically send stream on joining
  }, [setMyStream, sendStream]);

  const handleNewUserJoined = useCallback(
    async (data) => {
      const { emailId } = data;
      console.log("New user joined", emailId);
      const offer = await createOffer();
      socket.emit("call-user", { emailId, offer });
      setRemoteEmailId(emailId);
    },
    [createOffer, socket]
  );

  const handleIncommingCall = useCallback(
    async (data) => {
      const { from, offer } = data;
      console.log("Incoming data", from, offer);
      const ans = await createAnswer(offer);
      socket.emit("call-accepted", { emailId: from, ans });
      setRemoteEmailId(from);
    },
    [createAnswer, socket]
  );

  const handleCallAccepted = useCallback(
    async (data) => {
      const { ans } = data;
      console.log("Call got accepted", ans);
      await setRemoteAns(ans);
    },
    [setRemoteAns]
  );

  const handleNegotiationNeeded = useCallback(async () => {
    console.log('negotiation needed');
    const offer = await createOffer();
    socket.emit('renegotiate', { emailId: remoteEmailId, offer });
  }, [createOffer, remoteEmailId]);

  const handleIceCandidate = useCallback((event) => {
    if (event.candidate) {
      socket.emit('ice-candidate', { candidate: event.candidate, to: remoteEmailId });
    }
  }, [socket, remoteEmailId]);

  useEffect(() => {
    peer.addEventListener('icecandidate', handleIceCandidate);
    peer.addEventListener('negotiationneeded', handleNegotiationNeeded);
    return () => {
      peer.removeEventListener('icecandidate', handleIceCandidate);
      peer.removeEventListener('negotiationneeded', handleNegotiationNeeded);
    };
  }, [peer, handleIceCandidate, handleNegotiationNeeded]);

  useEffect(() => {
    socket.on("user-joined", handleNewUserJoined);
    socket.on("incomming-call", handleIncommingCall);
    socket.on("call-accepted", handleCallAccepted);
    socket.on("ice-candidate", ({ candidate }) => {
      peer.addIceCandidate(new RTCIceCandidate(candidate));
    });
    socket.on("renegotiate", async ({ offer }) => {
      const ans = await createAnswer(offer);
      socket.emit('call-accepted', { emailId: remoteEmailId, ans });
    });
    return () => {
      socket.off("user-joined", handleNewUserJoined);
      socket.off("incomming-call", handleIncommingCall);
      socket.off("call-accepted", handleCallAccepted);
      socket.off("ice-candidate");
      socket.off("renegotiate");
    };
  }, [handleNewUserJoined, handleIncommingCall, handleCallAccepted, socket, peer]);

  useEffect(() => {
    getUserMediaStream();
  }, [getUserMediaStream]);

  return (
<div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <div className="max-w-3xl w-full px-4 py-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-4 text-indigo-600">Thanks for joining this room</h1>
        <h3 className="text-lg text-gray-600 text-center mb-6">You are connected to: <span className="text-indigo-500">{remoteEmailId}</span></h3>
        
        <div className="flex justify-center space-x-4 mb-4">
          <button 
            onClick={(e) => sendStream(myStream)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
          >
            Send my video
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex justify-center">
            <video 
              ref={(ref) => ref && (ref.srcObject = myStream)}
              autoPlay
              muted
              className="rounded-lg shadow-lg w-full max-w-xs"
            ></video>
          </div>
          <div className="flex justify-center">
            <video 
              ref={(ref) => ref && (ref.srcObject = remoteStream)}
              autoPlay
              className="rounded-lg shadow-lg w-full max-w-xs"
            ></video>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomPage;

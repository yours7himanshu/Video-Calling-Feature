import { useCallback, useEffect, useState } from "react";
import { useSocket } from "../providers/Socket";
import { usePeer } from "../providers/Peer";
import ReactPlayer from "react-player";

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
    <div>
      <h1>Thanks for joining this room</h1>
      <h3>You are connected to: {remoteEmailId}</h3>
      <button onClick={async (e) => await sendStream(myStream)}>Send my video</button>
      <video
        ref={(ref) => ref && (ref.srcObject = myStream)}
        autoPlay
        muted
        controls
        style={{ width: "300px" }}
      ></video>
      <video
        ref={(ref) => ref && (ref.srcObject = remoteStream)}
        autoPlay
        controls
        style={{ width: "300px" }}
      ></video>
    </div>
  );
};

export default RoomPage;

import React, { useEffect, useCallback, useState, useRef } from "react";
import ReactPlayer from "react-player";
import peer from "../service/peer";
import { useSocket } from "../context/SocketProvider";

const RoomPage = () => {
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState();
  // Renegotiation is only allowed once the initial offer/answer is done
  const callReady = useRef(false);
  const remoteIdRef = useRef(null);
  const [iceState, setIceState] = useState("new");
  const [candTypes, setCandTypes] = useState([]);

  // Adds each local track once; safe to call repeatedly
  const addTracks = useCallback((stream) => {
    const senders = peer.peer.getSenders();
    for (const track of stream.getTracks()) {
      if (!senders.some((s) => s.track === track)) {
        peer.peer.addTrack(track, stream);
      }
    }
  }, []);

  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`Email ${email} joined room`);
    remoteIdRef.current = id;
    setRemoteSocketId(id);
  }, []);

  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    setMyStream(stream);
    addTracks(stream);
    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });
  }, [remoteSocketId, socket, addTracks]);

  const handleIncommingCall = useCallback(
    async ({ from, offer }) => {
      remoteIdRef.current = from;
      setRemoteSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(stream);
      console.log(`Incoming Call`, from, offer);
      addTracks(stream);
      const ans = await peer.getAnswer(offer);
      callReady.current = true;
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket, addTracks]
  );

  const sendStreams = useCallback(() => {
    if (myStream) addTracks(myStream);
  }, [myStream, addTracks]);

  const handleCallAccepted = useCallback(async ({ from, ans }) => {
    await peer.setLocalDescription(ans);
    callReady.current = true;
    console.log("Call Accepted!");
  }, []);

  const handleNegoNeeded = useCallback(async () => {
    if (!callReady.current) return;
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  const handleNegoNeedIncomming = useCallback(
    async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  }, []);

  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      const remoteStream = ev.streams;
      console.log("GOT TRACKS!!");
      setRemoteStream(remoteStream[0]);
    });
  }, []);

  // Trickle ICE: send our candidates to the peer, apply theirs
  useEffect(() => {
    const onIceState = () => setIceState(peer.peer.iceConnectionState);
    peer.peer.addEventListener("iceconnectionstatechange", onIceState);
    const onLocalCandidate = (ev) => {
      if (ev.candidate) {
        const t = ev.candidate.type || "unknown";
        setCandTypes((prev) => (prev.includes(t) ? prev : [...prev, t]));
      }
      if (ev.candidate && remoteIdRef.current) {
        socket.emit("ice:candidate", {
          to: remoteIdRef.current,
          candidate: ev.candidate,
        });
      }
    };
    const onRemoteCandidate = ({ candidate }) => peer.addCandidate(candidate);
    peer.peer.addEventListener("icecandidate", onLocalCandidate);
    socket.on("ice:candidate", onRemoteCandidate);
    return () => {
      peer.peer.removeEventListener("icecandidate", onLocalCandidate);
      peer.peer.removeEventListener("iceconnectionstatechange", onIceState);
      socket.off("ice:candidate", onRemoteCandidate);
    };
  }, [socket]);

  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncomming);
    socket.on("peer:nego:final", handleNegoNeedFinal);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncomming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
    };
  }, [
    socket,
    handleUserJoined,
    handleIncommingCall,
    handleCallAccepted,
    handleNegoNeedIncomming,
    handleNegoNeedFinal,
  ]);

  return (
    <div>
      <h1>Room Page</h1>
      <h4>{remoteSocketId ? "Connected" : "No one in room"}</h4>
      <p>
        ICE: {iceState} | local candidates: {candTypes.join(", ") || "none"}
      </p>
      {myStream && <button onClick={sendStreams}>Send Stream</button>}
      {remoteSocketId && <button onClick={handleCallUser}>CALL</button>}
      {myStream && (
        <>
          <h1>My Stream</h1>
          <ReactPlayer
            playing
            muted
            height="100px"
            width="200px"
            url={myStream}
          />
        </>
      )}
      {remoteStream && (
        <>
          <h1>Remote Stream</h1>
          <ReactPlayer
            playing
            playsinline
            height="200px"
            width="300px"
            url={remoteStream}
          />
        </>
      )}
    </div>
  );
};

export default RoomPage;

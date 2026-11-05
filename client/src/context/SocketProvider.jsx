import React, { createContext, useMemo, useContext } from "react";
import { io } from "socket.io-client";

// Same origin in production (server hosts the client); localhost in dev
const SERVER_URL =
  process.env.REACT_APP_SERVER_URL ||
  (process.env.NODE_ENV === "production"
    ? window.location.origin
    : "http://localhost:8000");

const SocketContext = createContext(null);

export const useSocket = () => {
  const socket = useContext(SocketContext);
  return socket;
};

export const SocketProvider = (props) => {
  const socket = useMemo(() => io(SERVER_URL), []);

  return (
    <SocketContext.Provider value={socket}>
      {props.children}
    </SocketContext.Provider>
  );
};

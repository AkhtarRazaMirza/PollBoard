import { io } from "socket.io-client";
import { socketBaseURL } from "./axios";

export const pollSocketEvents = {
  resultsUpdated: "poll:results-updated",
  presenceUpdated: "poll:presence-updated",
  responded: "poll:responded",
};

export const pollSocket = io(socketBaseURL, {
  autoConnect: false,
  transports: ["websocket"],
  reconnection: true,
});

const roomSubscriptions = new Map();

function ensureConnected() {
  if (!pollSocket.connected) {
    pollSocket.connect();
  }

  return pollSocket;
}

export function getPollSocket() {
  return ensureConnected();
}

export function joinPollRoom(pollId) {
  if (!pollId) {
    return ensureConnected();
  }

  const normalizedPollId = String(pollId);
  const currentCount =
    roomSubscriptions.get(normalizedPollId) || 0;
  const nextCount = currentCount + 1;

  roomSubscriptions.set(normalizedPollId, nextCount);

  const nextSocket = ensureConnected();

  if (nextCount === 1) {
    nextSocket.emit("poll:join", normalizedPollId);
  }

  return nextSocket;
}

export function leavePollRoom(pollId) {
  if (!pollId) {
    return;
  }

  const normalizedPollId = String(pollId);
  const currentCount =
    roomSubscriptions.get(normalizedPollId) || 0;

  if (currentCount <= 1) {
    roomSubscriptions.delete(normalizedPollId);

    if (pollSocket.connected) {
      pollSocket.emit("poll:leave", normalizedPollId);
    }
  } else {
    roomSubscriptions.set(normalizedPollId, currentCount - 1);
  }

  if (roomSubscriptions.size === 0) {
    window.setTimeout(() => {
      if (roomSubscriptions.size === 0 && pollSocket.connected) {
        pollSocket.disconnect();
      }
    }, 0);
  }
}
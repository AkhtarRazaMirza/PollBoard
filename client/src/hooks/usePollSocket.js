import { useEffect, useRef } from "react";
import {
  joinPollRoom,
  leavePollRoom,
  pollSocket,
  pollSocketEvents,
} from "../services/socket";

export default function usePollSocket({
  pollId,
  enabled = true,
  onResultsUpdated,
  onPresenceUpdated,
  onResponded,
}) {
  const resultsUpdatedRef = useRef(onResultsUpdated);
  const presenceUpdatedRef = useRef(onPresenceUpdated);
  const respondedRef = useRef(onResponded);

  useEffect(() => {
    resultsUpdatedRef.current = onResultsUpdated;
  }, [onResultsUpdated]);

  useEffect(() => {
    presenceUpdatedRef.current = onPresenceUpdated;
  }, [onPresenceUpdated]);

  useEffect(() => {
    respondedRef.current = onResponded;
  }, [onResponded]);

  useEffect(() => {
    if (!enabled || !pollId) {
      return undefined;
    }

    const normalizedPollId = String(pollId);
    const socket = joinPollRoom(normalizedPollId);

    const handleResultsUpdated = (payload) => {
      if (String(payload?.pollId || "") !== normalizedPollId) {
        return;
      }

      resultsUpdatedRef.current?.(payload);
    };

    const handlePresenceUpdated = (payload) => {
      if (String(payload?.pollId || "") !== normalizedPollId) {
        return;
      }

      presenceUpdatedRef.current?.(payload);
    };

    const handleResponded = (payload) => {
      if (String(payload?.pollId || "") !== normalizedPollId) {
        return;
      }

      respondedRef.current?.(payload);
    };

    socket.on(pollSocketEvents.resultsUpdated, handleResultsUpdated);
    socket.on(pollSocketEvents.presenceUpdated, handlePresenceUpdated);
    socket.on(pollSocketEvents.responded, handleResponded);

    return () => {
      pollSocket.off(
        pollSocketEvents.resultsUpdated,
        handleResultsUpdated,
      );
      pollSocket.off(
        pollSocketEvents.presenceUpdated,
        handlePresenceUpdated,
      );
      pollSocket.off(
        pollSocketEvents.responded,
        handleResponded,
      );

      leavePollRoom(normalizedPollId);
    };
  }, [enabled, pollId]);
}
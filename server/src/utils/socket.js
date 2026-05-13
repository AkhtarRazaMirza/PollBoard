
import { Server } from "socket.io";

export const socketEvents = {
    pollJoin: "poll:join",
    pollLeave: "poll:leave",
    pollResultsUpdated:
        "poll:results-updated",
    pollPresenceUpdated:
        "poll:presence-updated",
    pollResponded:
        "poll:responded",
};

export const getPollRoom = (
) => `poll:${pollId}`;

const getPollIdFromRoom = (
    roomName = ""
) =>
    roomName.startsWith("poll:")
        ? roomName.slice(5)
        : null;

export const getPollRoomViewerCount = (
    io,
    pollId
) =>
    io?.sockets?.adapter?.rooms?.get(
        getPollRoom(pollId)
    )?.size || 0;

export const emitPollPresenceUpdate = (
    io,
    pollId
) => {
    if (!io || !pollId) {
        return 0;
    }

    const viewerCount =
        getPollRoomViewerCount(
            io,
            pollId
        );

    io.to(getPollRoom(pollId)).emit(
        socketEvents.pollPresenceUpdated,
        {
            pollId: String(pollId),
            viewerCount,
        }
    );

    return viewerCount;
};

const schedulePresenceUpdate = (
    io,
    pollIds = []
) => {
    const uniquePollIds = [
        ...new Set(
            pollIds
                .filter(Boolean)
                .map((pollId) =>
                    String(pollId)
                )
        ),
    ];

    if (uniquePollIds.length === 0) {
        return;
    }

    setImmediate(() => {
        uniquePollIds.forEach(
            (pollId) => {
                emitPollPresenceUpdate(
                    io,
                    pollId
                );
            }
        );
    });
};

export const emitPollResultsUpdate = (
    io,
    {
        pollId,
        results,
        poll,
        emitResponseEvent = false,
    }
) => {
    if (
        !io ||
        !pollId ||
        !results
    ) {
        return;
    }

    const viewerCount =
        getPollRoomViewerCount(
            io,
            pollId
        );
    const payload = {
        pollId: String(pollId),
        results: {
            ...results,
            viewerCount,
        },
        poll,
    };

    io.to(getPollRoom(pollId)).emit(
        socketEvents.pollResultsUpdated,
        payload
    );

    if (emitResponseEvent) {
        io.to(getPollRoom(pollId)).emit(
            socketEvents.pollResponded,
            {
                pollId: String(pollId),
                totalResponses:
                    results.totalResponses ||
                    results.totalVotes ||
                    0,
                viewerCount,
            }
        );
    }
};

const joinPollRoom = (
    io,
    socket,
    pollId
) => {
    if (!pollId) {
        return;
    }

    socket.join(getPollRoom(pollId));
    emitPollPresenceUpdate(io, pollId);
};

const leavePollRoom = (
    io,
    socket,
    pollId
) => {
    if (!pollId) {
        return;
    }

    socket.leave(
        getPollRoom(pollId)
    );
    schedulePresenceUpdate(io, [
        pollId,
    ]);
};

export const registerPollSocketHandlers = (
    io,
    socket
) => {
    socket.on(
        socketEvents.pollJoin,
        (pollId) => {
            joinPollRoom(
                io,
                socket,
                pollId
            );
        }
    );

    socket.on(
        socketEvents.pollLeave,
        (pollId) => {
            leavePollRoom(
                io,
                socket,
                pollId
            );
        }
    );

    socket.on(
        "disconnecting",
        () => {
            const pollIds = [
                ...socket.rooms,
            ]
                .map(
                    getPollIdFromRoom
                )
                .filter(Boolean);

            schedulePresenceUpdate(
                io,
                pollIds
            );
        }
    );
};

export const initializeSocketServer = (
    server,
    {
        cors,
    } = {}
) => {
    const io = new Server(server, {
        cors,
    });

    io.on(
        "connection",
        (socket) => {
            registerPollSocketHandlers(
                io,
                socket
            );
        }
    );

    return io;
};
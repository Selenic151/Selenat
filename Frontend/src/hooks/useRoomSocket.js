import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

export function useRoomSocket({ roomId, onMessage, onRoomDeleted, onMemberJoined, onMemberLeft, join = true }) {
  const { socket, joinRoom, leaveRoom } = useSocket();

  useEffect(() => {
    if (!roomId || !socket) return;
    if (join) joinRoom(roomId);

    if (onMessage) socket.on('message:received', onMessage);
    if (onRoomDeleted) socket.on('room:deleted', onRoomDeleted);
    if (onMemberJoined) socket.on('member:joined', onMemberJoined);
    if (onMemberLeft) socket.on('member:left', onMemberLeft);

    return () => {
      if (join) leaveRoom(roomId);
      if (onMessage) socket.off('message:received', onMessage);
      if (onRoomDeleted) socket.off('room:deleted', onRoomDeleted);
      if (onMemberJoined) socket.off('member:joined', onMemberJoined);
      if (onMemberLeft) socket.off('member:left', onMemberLeft);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, socket, joinRoom, leaveRoom, onMessage, onRoomDeleted, onMemberJoined, onMemberLeft, join]);
}

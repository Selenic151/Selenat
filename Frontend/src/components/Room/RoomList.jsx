import RoomItem from './RoomItem';

const RoomList = ({ rooms, selectedRoom, onSelectRoom }) => {
  return (
    <div className="divide-y">
      {rooms.map((room) => (
        <RoomItem
          key={room._id}
          room={room}
          isSelected={selectedRoom?._id === room._id}
          onSelect={() => onSelectRoom(room)}
        />
      ))}
    </div>
  );
};

export default RoomList;
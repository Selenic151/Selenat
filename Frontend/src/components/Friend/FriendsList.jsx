import { useState, useEffect } from 'react';
import { friendAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';

const FriendsList = ({ onRequestCountChange }) => {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState({ received: [], sent: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('friends'); // friends, requests, search
  const { socket, on, off } = useSocket();

  useEffect(() => {
    loadFriends();
    loadFriendRequests();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleFriendRequest = () => {
      loadFriendRequests();
    };

    const handleFriendAccepted = () => {
      loadFriends();
      loadFriendRequests();
    };

    on('friend:request', handleFriendRequest);
    on('friend:accepted', handleFriendAccepted);

    return () => {
      off('friend:request', handleFriendRequest);
      off('friend:accepted', handleFriendAccepted);
    };
  }, [socket, on, off]);

  const loadFriends = async () => {
    try {
      const res = await friendAPI.getFriends();
      setFriends(res.data);
    } catch (err) {
      console.error('Error loading friends:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFriendRequests = async () => {
    try {
      const res = await friendAPI.getFriendRequests();
      setFriendRequests(res.data);
      // Cập nhật số lượng lời mời nhận được
      if (onRequestCountChange) {
        onRequestCountChange(res.data.received.length);
      }
    } catch (err) {
      console.error('Error loading friend requests:', err);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await friendAPI.searchUsers(query);
      setSearchResults(res.data);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const handleSendRequest = async (userId) => {
    try {
      await friendAPI.sendFriendRequest(userId);
      alert('Đã gửi lời mời kết bạn');
      loadFriendRequests();
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi gửi lời mời');
    }
  };

  const handleAcceptRequest = async (userId) => {
    try {
      await friendAPI.acceptFriendRequest(userId);
      loadFriends();
      loadFriendRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi chấp nhận lời mời');
    }
  };

  const handleDeclineRequest = async (userId) => {
    try {
      await friendAPI.declineFriendRequest(userId);
      loadFriendRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi từ chối lời mời');
    }
  };

  const handleCancelRequest = async (userId) => {
    try {
      await friendAPI.cancelFriendRequest(userId);
      loadFriendRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi hủy lời mời');
    }
  };

  const handleRemoveFriend = async (userId, username) => {
    if (!window.confirm(`Bạn có chắc muốn xóa ${username} khỏi danh sách bạn bè?`)) return;
    
    try {
      await friendAPI.removeFriend(userId);
      loadFriends();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi xóa bạn bè');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Tabs */}
      <div className="flex border-b border-gray-200/50 bg-gray-50/50">
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'friends'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Bạn bè</span>
            <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs font-bold">
              {friends.length}
            </span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-200 relative ${
            activeTab === 'requests'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM15 17H9a6 6 0 01-6-6V9a6 6 0 0110.293-4.293L15 9v8z" />
            </svg>
            <span>Lời mời</span>
            {friendRequests.received.length > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-xs font-bold animate-pulse">
                {friendRequests.received.length}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'search'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Tìm kiếm</span>
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'friends' && (
          <div className="p-6">
            {friends.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Chưa có bạn bè</h3>
                <p className="text-sm text-gray-500">Hãy tìm kiếm và kết bạn với mọi người!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {friends.map(friend => (
                  <div key={friend._id} className="group bg-gradient-to-r from-white to-gray-50 p-4 rounded-xl border border-gray-200 hover:shadow-lg hover:border-blue-300 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <div className="w-14 h-14 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                            {friend.username?.charAt(0).toUpperCase()}
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-base">{friend.username}</p>
                          <p className="text-sm text-gray-500 flex items-center mt-1">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {friend.email}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFriend(friend._id, friend.username)}
                        className="opacity-0 group-hover:opacity-100 px-4 py-2 text-sm text-red-600 hover:text-white hover:bg-red-600 border border-red-600 rounded-lg font-medium transition-all duration-200"
                      >
                        Xóa bạn
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="p-6 space-y-6">
            {/* Received */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-800">Lời mời nhận được</h3>
                {friendRequests.received.length > 0 && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                    {friendRequests.received.length} lời mời
                  </span>
                )}
              </div>
              
              {friendRequests.received.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-sm text-gray-500">Không có lời mời nào</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {friendRequests.received.map(user => (
                    <div key={user._id} className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-xl border border-green-200 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                            {user.username?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{user.username}</p>
                            <p className="text-xs text-gray-600 flex items-center mt-0.5">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleAcceptRequest(user._id)}
                            className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm rounded-lg hover:from-green-600 hover:to-green-700 font-medium shadow-sm hover:shadow transition-all duration-200"
                          >
                            Chấp nhận
                          </button>
                          <button
                            onClick={() => handleDeclineRequest(user._id)}
                            className="px-4 py-2 bg-white text-gray-700 text-sm rounded-lg hover:bg-gray-100 font-medium border border-gray-300 transition-all duration-200"
                          >
                            Từ chối
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sent */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-800">Lời mời đã gửi</h3>
                {friendRequests.sent.length > 0 && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">
                    {friendRequests.sent.length} lời mời
                  </span>
                )}
              </div>
              
              {friendRequests.sent.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <p className="text-sm text-gray-500">Chưa gửi lời mời nào</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {friendRequests.sent.map(user => (
                    <div key={user._id} className="bg-gray-50 p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white font-bold">
                            {user.username?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{user.username}</p>
                            <p className="text-xs text-gray-500 flex items-center mt-0.5">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Đang chờ phản hồi
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCancelRequest(user._id)}
                          className="px-4 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg font-medium transition-all duration-200"
                        >
                          Hủy lời mời
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'search' && (
          <div className="p-6">
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Tìm kiếm theo email, số điện thoại hoặc tên..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 placeholder-gray-400"
              />
            </div>
            
            {searchQuery.length >= 2 ? (
              searchResults.length > 0 ? (
                <div className="space-y-3">
                  {searchResults.map(user => (
                    <div key={user._id} className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200 hover:shadow-md hover:border-purple-300 transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-400 via-pink-500 to-rose-500 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                            {user.username?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{user.username}</p>
                            <p className="text-xs text-gray-600 flex items-center mt-0.5">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleSendRequest(user._id)}
                          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm rounded-lg hover:from-blue-600 hover:to-purple-700 font-medium shadow-sm hover:shadow transition-all duration-200 flex items-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                          </svg>
                          <span>Kết bạn</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Không tìm thấy kết quả</h3>
                  <p className="text-sm text-gray-500">Thử tìm kiếm với từ khóa khác</p>
                </div>
              )
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Tìm kiếm bạn bè</h3>
                <p className="text-sm text-gray-500">Nhập email, số điện thoại hoặc tên để tìm kiếm</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsList;

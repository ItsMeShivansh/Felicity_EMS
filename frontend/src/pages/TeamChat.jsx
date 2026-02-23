import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import ParticipantNavbar from '../components/ParticipantNavbar';

const TeamChat = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const chatBodyRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserId = user.id;

  useEffect(() => {
    fetchTeamAndMessages();
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave-team', teamId);
        socketRef.current.disconnect();
      }
    };
  }, [teamId]);

  const fetchTeamAndMessages = async () => {
    try {
      const config = { headers: { Authorization: token } };


      const msgRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/chat/${teamId}/messages`, config);
      setMessages(msgRes.data);


      const teamsRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/teams/info/${teamId}`, config);
      setTeam(teamsRes.data.team);

      setLoading(false);


      const socket = io(`${import.meta.env.VITE_API_URL}`, {
        auth: { token }
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('join-team', teamId);
      });

      socket.on('new-message', (message) => {
        setMessages(prev => [...prev, message]);
        if (message.sender._id !== currentUserId) {
          setUnreadCount(prev => prev + 1);
        }
      });

      socket.on('online-users', (users) => {
        setOnlineUsers(users);
      });

      socket.on('typing-update', (users) => {
        setTypingUsers(users.filter(id => id !== currentUserId));
      });

    } catch (err) {
      console.error('Error loading chat:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setUnreadCount(0);
    }
  }, [messages]);

  const handleScroll = () => {
    if (!chatBodyRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatBodyRef.current;
    setIsAtBottom(scrollHeight - scrollTop - clientHeight < 50);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setUnreadCount(0);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socketRef.current) return;

    const content = newMessage.trim();


    const urlRegex = /^https?:\/\/\S+$/;
    const type = urlRegex.test(content) ? 'link' : 'text';

    socketRef.current.emit('send-message', {
      teamId,
      content,
      type
    });

    socketRef.current.emit('typing-stop', teamId);
    setNewMessage('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (!socketRef.current) return;
        
        socketRef.current.emit('send-message', {
          teamId,
          content: reader.result,
          type: 'file'
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (!socketRef.current) return;

    socketRef.current.emit('typing-start', teamId);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current.emit('typing-stop', teamId);
    }, 2000);
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString(undefined, {
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };


  const groupedMessages = messages.reduce((groups, msg) => {
    const date = formatDate(msg.createdAt);
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  const getTypingText = () => {
    if (typingUsers.length === 0) return '';
    if (!team) return 'Someone is typing...';
    const names = typingUsers.map(uid => {
      const member = team.members?.find(m => m._id === uid);
      return member?.name?.split(' ')[0] || 'Someone';
    });
    if (names.length === 1) return `${names[0]} is typing...`;
    return `${names.join(', ')} are typing...`;
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <ParticipantNavbar />
        <div className="page-content">
          <p>Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <ParticipantNavbar />
      <div className="page-content">
        <div className="chat-container">
          {/* Chat Header */}
          <div className="chat-header">
            <div className="chat-header-left">
              <button onClick={() => navigate(-1)} className="btn-action">← Back</button>
              <div>
                <h2>{team?.teamName || 'Team Chat'}</h2>
                <p className="text-muted">
                  {onlineUsers.length} online · {team?.members?.length || 0} members
                </p>
              </div>
            </div>
            <div className="chat-online-dots">
              {team?.members?.map((m, i) => (
                <span
                  key={i}
                  className={`online-dot ${onlineUsers.includes(m._id) ? 'online' : 'offline'}`}
                  title={`${m.name} - ${onlineUsers.includes(m._id) ? 'Online' : 'Offline'}`}
                />
              ))}
            </div>
          </div>

          {/* Chat Body */}
          <div className="chat-body" ref={chatBodyRef} onScroll={handleScroll}>
            {Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date}>
                <div className="chat-date-divider">
                  <span>{date}</span>
                </div>
                {msgs.map((msg) => {
                  const isMine = msg.sender._id === currentUserId;
                  return (
                    <div key={msg._id} className={`chat-message ${isMine ? 'mine' : 'theirs'}`}>
                      {!isMine && (
                        <span className="chat-sender">{msg.sender.firstName}</span>
                      )}
                      <div className="chat-bubble">
                        {msg.type === 'link' ? (
                          <a href={msg.content} target="_blank" rel="noopener noreferrer" className="chat-link">
                            {msg.content}
                          </a>
                        ) : msg.type === 'file' ? (
                          msg.content.startsWith('data:image/') ? (
                            <img src={msg.content} alt="Shared file" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' }} />
                          ) : (
                            <a href={msg.content} download="shared_file" className="btn-secondary btn-sm" style={{ display: 'inline-block', textDecoration: 'none' }}>
                              📎 Download File
                            </a>
                          )
                        ) : (
                          <p>{msg.content}</p>
                        )}
                        <span className="chat-time">{formatTime(msg.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="chat-typing">
              {getTypingText()}
            </div>
          )}

          {/* New messages notification */}
          {unreadCount > 0 && !isAtBottom && (
            <button className="chat-new-messages" onClick={scrollToBottom}>
              ↓ {unreadCount} new message{unreadCount > 1 ? 's' : ''}
            </button>
          )}

          {/* Chat Input */}
          <form onSubmit={handleSend} className="chat-input-form">
            <label className="btn-secondary file-upload-btn" style={{ cursor: 'pointer', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              📎
              <input 
                type="file" 
                onChange={handleFileChange} 
                style={{ display: 'none' }} 
              />
            </label>
            <input
              type="text"
              value={newMessage}
              onChange={handleTyping}
              placeholder="Type a message..."
              className="chat-input"
            />
            <button type="submit" className="btn-submit" disabled={!newMessage.trim()}>
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TeamChat;

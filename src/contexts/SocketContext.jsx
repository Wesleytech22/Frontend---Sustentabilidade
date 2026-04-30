import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [onlineSupports, setOnlineSupports] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [messages, setMessages] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [supportRequests, setSupportRequests] = useState([]);
  const [activeSupportChats, setActiveSupportChats] = useState([]); // 👈 ARRAY DE CHATS ATIVOS
  const [availableSupports, setAvailableSupports] = useState([]);
  const [transferInProgress, setTransferInProgress] = useState(false);
  
  const { user, token } = useAuth();
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef({});

  useEffect(() => {
    if (!user || !token) {
      console.log('⏳ Aguardando usuário e token...');
      return;
    }

    const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000';
    
    console.log('🔌 Conectando ao socket:', socketUrl);
    console.log('🔑 Token presente:', !!token);
    console.log('👤 Usuário:', user?.email);
    console.log('👤 Role:', user?.role);

    const newSocket = io(socketUrl, {
      auth: { 
        token,
        userId: user._id,
        role: user.role,
        name: user.name
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: true
    });

    socketRef.current = newSocket;

    // ========== EVENTOS DE CONEXÃO ==========
    newSocket.on('connect', () => {
      console.log('✅ Conectado ao socket! ID:', newSocket.id);
      setIsConnected(true);
      newSocket.emit('user-connected', {
        userId: user._id,
        name: user.name,
        role: user.role
      });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Desconectado do socket:', reason);
      setIsConnected(false);
      if (reason === 'io server disconnect' || reason === 'transport close') {
        console.log('🔄 Tentando reconectar...');
        setTimeout(() => {
          newSocket.connect();
        }, 1000);
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Erro na conexão do socket:', error.message);
      setIsConnected(false);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconectado após', attemptNumber, 'tentativas');
      setIsConnected(true);
      newSocket.emit('user-connected', {
        userId: user._id,
        name: user.name,
        role: user.role
      });
    });

    // ========== EVENTOS DE USUÁRIOS ONLINE ==========
    newSocket.on('online-users', (users) => {
      if (Array.isArray(users)) {
        console.log('👥 Usuários online:', users.length);
        setOnlineUsers(users);
        const supports = users.filter(u => u.role === 'SUPPORT' || u.role === 'ADMIN');
        setOnlineSupports(supports);
      } else {
        setOnlineUsers([]);
        setOnlineSupports([]);
      }
    });

    newSocket.on('user-joined', (userData) => {
      setOnlineUsers(prev => {
        if (!Array.isArray(prev)) return [userData];
        if (prev.some(u => u.userId === userData.userId)) return prev;
        return [...prev, userData];
      });
    });

    newSocket.on('user-left', (userId) => {
      setOnlineUsers(prev => {
        if (!Array.isArray(prev)) return [];
        return prev.filter(u => u.userId !== userId);
      });
    });

    // ========== EVENTOS DE MENSAGENS ==========
    newSocket.on('new-message', (message) => {
      console.log('💬 Nova mensagem:', message);
      setMessages(prev => {
        const current = prev || {};
        const room = message?.room || 'geral';
        const roomMessages = Array.isArray(current[room]) ? current[room] : [];
        if (roomMessages.some(m => m?._id === message?._id)) return current;
        return {
          ...current,
          [room]: [...roomMessages, message]
        };
      });

      if (message.sender !== user?._id) {
        const notification = {
          id: `msg_${message._id}`,
          type: 'message',
          title: `Nova mensagem de ${message.senderName}`,
          message: message.content?.length > 50 
            ? message.content.substring(0, 50) + '...' 
            : message.content,
          room: message.room,
          timestamp: new Date(),
          read: false
        };
        
        setNotifications(prev => {
          const current = Array.isArray(prev) ? prev : [];
          return [notification, ...current];
        });
      }
    });

    newSocket.on('message-history', ({ room, history }) => {
      console.log(`📜 Histórico da sala ${room}:`, history?.length || 0);
      setMessages(prev => ({
        ...(prev || {}),
        [room]: Array.isArray(history) ? history : []
      }));
    });

    newSocket.on('message-read', ({ messageId, room, userId }) => {
      setMessages(prev => {
        const current = prev || {};
        const roomMessages = Array.isArray(current[room]) ? current[room] : [];
        return {
          ...current,
          [room]: roomMessages.map(msg => 
            msg._id === messageId 
              ? { ...msg, status: 'read', readBy: [...(msg.readBy || []), userId] }
              : msg
          )
        };
      });
    });

    // ========== EVENTOS DE DIGITAÇÃO ==========
    newSocket.on('user-typing', ({ userId, name, room, isTyping }) => {
      setTypingUsers(prev => ({
        ...(prev || {}),
        [room]: {
          ...(prev[room] || {}),
          [userId]: { name, isTyping }
        }
      }));

      if (isTyping) {
        if (typingTimeoutRef.current[userId]) {
          clearTimeout(typingTimeoutRef.current[userId]);
        }
        
        typingTimeoutRef.current[userId] = setTimeout(() => {
          setTypingUsers(prev => ({
            ...(prev || {}),
            [room]: {
              ...(prev[room] || {}),
              [userId]: { name, isTyping: false }
            }
          }));
        }, 3000);
      }
    });

    // ========== EVENTOS DE NOTIFICAÇÕES ==========
    newSocket.on('notification', (notification) => {
      console.log('🔔 Nova notificação:', notification);
      setNotifications(prev => {
        const current = Array.isArray(prev) ? prev : [];
        if (current.some(n => n.id === notification?.id)) return current;
        return [notification, ...current];
      });
    });

    // ========== EVENTOS DE SUPORTE ==========
    newSocket.on('support-request', (request) => {
      console.log('🎯 Nova solicitação de suporte:', request);
      if (user?.role === 'SUPPORT' || user?.role === 'ADMIN') {
        setSupportRequests(prev => {
          const current = Array.isArray(prev) ? prev : [];
          if (current.some(r => r.id === request.id)) return current;
          return [request, ...current];
        });
        
        const notification = {
          id: `support_${request.userId}_${Date.now()}`,
          type: 'support_request',
          title: '🆘 Nova solicitação de suporte',
          message: `${request.userName} precisa de ajuda (${request.department || 'Geral'})`,
          data: request,
          timestamp: new Date(),
          read: false,
          sound: true
        };
        
        setNotifications(prev => {
          const current = Array.isArray(prev) ? prev : [];
          return [notification, ...current];
        });
      }
    });

    // ========== EVENTO: SOLICITAÇÃO ACEITA POR OUTRO SUPORTE ==========
    newSocket.on('support-request-accepted', ({ requestId, acceptedBy, acceptedByUserId }) => {
      console.log(`📞 Solicitação ${requestId} foi aceita por ${acceptedBy}`);
      
      if (acceptedByUserId !== user?._id) {
        setSupportRequests(prev => {
          const current = Array.isArray(prev) ? prev : [];
          return current.filter(r => r.id !== requestId);
        });
        
        setNotifications(prev => {
          const current = Array.isArray(prev) ? prev : [];
          return current.filter(n => 
            !(n.type === 'support_request' && n.data?.id === requestId)
          );
        });
      }
    });

    // ========== EVENTO: SOLICITAÇÃO EXPIRADA ==========
    newSocket.on('support-request-expired', ({ requestId, message }) => {
      console.log(`⏰ Solicitação ${requestId} expirou:`, message);
      
      setSupportRequests(prev => {
        const current = Array.isArray(prev) ? prev : [];
        return current.filter(r => r.id !== requestId);
      });
      
      setNotifications(prev => {
        const current = Array.isArray(prev) ? prev : [];
        return current.filter(n => 
          !(n.type === 'support_request' && n.data?.id === requestId)
        );
      });
    });

    // ========== EVENTO: SUPORTE ATRIBUÍDO ==========
    newSocket.on('support-assigned', ({ room, support, message }) => {
      console.log('🎯 Suporte atribuído:', support);
      
      // 👇 ADICIONAR À LISTA DE CHATS ATIVOS (NÃO SUBSTITUIR)
      setActiveSupportChats(prev => {
        const current = Array.isArray(prev) ? prev : [];
        // Verificar se já não existe
        if (current.some(chat => chat.room === room)) {
          return current;
        }
        // Adicionar novo chat
        return [...current, { 
          room, 
          support, 
          userId: message.userId,
          lastMessage: message,
          unreadCount: 0
        }];
      });
      
      setMessages(prev => {
        const current = prev || {};
        const roomMessages = Array.isArray(current[room]) ? current[room] : [];
        return {
          ...current,
          [room]: [...roomMessages, message]
        };
      });
    });

    // ========== EVENTO: CHAT ENCERRADO ==========
    newSocket.on('chat-ended', ({ room }) => {
      console.log('🔚 Chat encerrado:', room);
      
      const systemMessage = {
        _id: `system_${Date.now()}`,
        content: '🔸 Chat encerrado',
        senderName: 'Sistema',
        sender: 'system',
        room,
        createdAt: new Date(),
        isSystem: true
      };
      
      setMessages(prev => {
        const current = prev || {};
        const roomMessages = Array.isArray(current[room]) ? current[room] : [];
        return {
          ...current,
          [room]: [...roomMessages, systemMessage]
        };
      });
      
      // 👇 REMOVER DA LISTA DE CHATS ATIVOS
      setActiveSupportChats(prev => 
        Array.isArray(prev) ? prev.filter(chat => chat.room !== room) : []
      );
    });

    // ========== EVENTOS DE TRANSFERÊNCIA ==========
    newSocket.on('available-supports', (supports) => {
      console.log('📋 Suportes disponíveis:', supports);
      setAvailableSupports(Array.isArray(supports) ? supports : []);
    });

    newSocket.on('transfer-started', (data) => {
      console.log('🔄 Transferência iniciada:', data);
      setTransferInProgress(true);
    });

    newSocket.on('transfer-complete', (data) => {
      console.log('✅ Transferência concluída:', data);
      setTransferInProgress(false);
      if (data.room) {
        // 👇 REMOVER DA LISTA DE CHATS ATIVOS (será adicionado novamente quando o novo suporte aceitar)
        setActiveSupportChats(prev => 
          Array.isArray(prev) ? prev.filter(chat => chat.room !== data.room) : []
        );
      }
    });

    newSocket.on('transfer-error', (data) => {
      console.error('❌ Erro na transferência:', data);
      setTransferInProgress(false);
    });

    newSocket.on('support-transferred', (data) => {
      console.log('📨 Chamado transferido para você:', data);
      if (data.room) {
        // 👇 ADICIONAR À LISTA DE CHATS ATIVOS
        setActiveSupportChats(prev => {
          const current = Array.isArray(prev) ? prev : [];
          if (current.some(chat => chat.room === data.room)) return current;
          return [...current, { 
            room: data.room, 
            support: { id: user?._id, name: user?.name },
            userId: data.originalUserId,
            userName: data.originalUserName,
            lastMessage: data.message,
            unreadCount: 0
          }];
        });
      }
    });

    setSocket(newSocket);

    return () => {
      console.log('🧹 Limpando conexão do socket');
      Object.keys(typingTimeoutRef.current).forEach(key => {
        clearTimeout(typingTimeoutRef.current[key]);
      });
      if (newSocket.connected) {
        newSocket.emit('user-disconnected', user._id);
        newSocket.disconnect();
      }
      newSocket.removeAllListeners();
    };
  }, [user, token]);

  // ========== FUNÇÕES DO SOCKET ==========
  const sendMessage = useCallback((room, content, recipient = null) => {
    if (!socketRef.current?.connected) {
      console.warn('⚠️ Socket não conectado');
      return false;
    }
    const messageData = {
      room,
      content,
      recipient,
      sender: user?._id,
      senderName: user?.name,
      senderRole: user?.role,
      timestamp: new Date().toISOString()
    };
    socketRef.current.emit('send-message', messageData);
    return true;
  }, [user]);

  const joinRoom = useCallback((room) => {
    if (!socketRef.current?.connected) {
      console.warn('⚠️ Socket não conectado');
      return false;
    }
    console.log(`👥 Entrando na sala: ${room}`);
    socketRef.current.emit('join-room', room);
    socketRef.current.emit('request-history', room);
    return true;
  }, [user]);

  const leaveRoom = useCallback((room) => {
    if (!socketRef.current?.connected) return false;
    console.log(`👋 Saindo da sala: ${room}`);
    socketRef.current.emit('leave-room', room);
    return true;
  }, [user]);

  const sendTyping = useCallback((room, isTyping) => {
    if (!socketRef.current?.connected) return false;
    socketRef.current.emit('typing', {
      room,
      userId: user?._id,
      name: user?.name,
      isTyping
    });
    return true;
  }, [user]);

  const getTypingUsers = useCallback((room) => {
    const roomData = typingUsers[room] || {};
    return Object.values(roomData)
      .filter(data => data.isTyping)
      .map(data => data.name);
  }, [typingUsers]);

  const markMessageAsRead = useCallback((messageId, room) => {
    if (!socketRef.current?.connected) return false;
    socketRef.current.emit('message-read', {
      messageId,
      room,
      userId: user?._id
    });
    return true;
  }, [user]);

  // ========== FUNÇÕES DE SUPORTE ==========
  const requestSupport = useCallback((department = 'general') => {
    if (!socketRef.current?.connected) return false;
    console.log('🎯 Solicitando suporte...');
    socketRef.current.emit('request-support', {
      userId: user?._id,
      userName: user?.name,
      department,
      timestamp: new Date().toISOString()
    });
    return true;
  }, [user]);

  const acceptSupportRequest = useCallback((requestId, userId, userName) => {
    if (!socketRef.current?.connected) return false;
    if (user?.role !== 'SUPPORT' && user?.role !== 'ADMIN') return false;
    
    console.log('✅ Aceitando solicitação de suporte:', requestId);
    const room = `support_${userId}_${user?._id}`;
    
    socketRef.current.emit('accept-support', {
      requestId,
      userId,
      userName,
      supportId: user?._id,
      supportName: user?.name,
      room
    });
    
    // Remover da lista local imediatamente
    setSupportRequests(prev => {
      const current = Array.isArray(prev) ? prev : [];
      return current.filter(r => r.id !== requestId);
    });
    
    return room;
  }, [user]);

  const endSupportChat = useCallback((room, userId) => {
    if (!socketRef.current?.connected) return false;
    console.log('🔚 Finalizando chat de suporte:', room);
    socketRef.current.emit('end-support', {
      room,
      userId,
      supportId: user?._id
    });
    
    // 👇 REMOVER DA LISTA DE CHATS ATIVOS
    setActiveSupportChats(prev => 
      Array.isArray(prev) ? prev.filter(chat => chat.room !== room) : []
    );
    
    return true;
  }, [user]);

  // ========== FUNÇÕES DE TRANSFERÊNCIA ==========
  const getAvailableSupports = useCallback(() => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('get-available-supports');
  }, []);

  const transferSupport = useCallback((room, targetSupportId, originalUserId, originalUserName) => {
    if (!socketRef.current?.connected) {
      console.warn('⚠️ Socket não conectado');
      return false;
    }
    console.log(`🔄 Transferindo chamado ${room} para ${targetSupportId}`);
    socketRef.current.emit('transfer-support', {
      room,
      targetSupportId,
      originalUserId,
      originalUserName
    });
    return true;
  }, []);

  // ========== FUNÇÕES AUXILIARES ==========
  const getActiveChatByRoom = useCallback((room) => {
    if (!Array.isArray(activeSupportChats)) return null;
    return activeSupportChats.find(chat => chat.room === room);
  }, [activeSupportChats]);

  // 👇 NOVA FUNÇÃO: OBTER TODOS OS CHATS ATIVOS
  const getAllActiveChats = useCallback(() => {
    return Array.isArray(activeSupportChats) ? activeSupportChats : [];
  }, [activeSupportChats]);

  // 👇 NOVA FUNÇÃO: OBTER CHATS POR USUÁRIO
  const getChatsByUser = useCallback((userId) => {
    if (!Array.isArray(activeSupportChats)) return [];
    return activeSupportChats.filter(chat => chat.userId === userId);
  }, [activeSupportChats]);

  // ========== FUNÇÕES DE NOTIFICAÇÃO ==========
  const markNotificationAsRead = useCallback((notificationId) => {
    setNotifications(prev => {
      const current = Array.isArray(prev) ? prev : [];
      return current.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      );
    });
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications(prev => {
      const current = Array.isArray(prev) ? prev : [];
      return current.map(n => ({ ...n, read: true }));
    });
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => {
      const current = Array.isArray(prev) ? prev : [];
      return current.filter(n => n.id !== notificationId);
    });
  }, []);

  const getUnreadCount = useCallback((room) => {
    const roomMessages = (messages[room] || []);
    return roomMessages.filter(msg => 
      msg.sender !== user?._id && 
      (!msg.readBy || !msg.readBy.includes(user?._id))
    ).length;
  }, [messages, user]);

  const getLastMessage = useCallback((room) => {
    const roomMessages = messages[room] || [];
    return roomMessages[roomMessages.length - 1];
  }, [messages]);

  // ========== VALOR DO CONTEXTO ==========
  const value = {
    // Estado
    socket: socketRef.current,
    isConnected,
    onlineUsers: Array.isArray(onlineUsers) ? onlineUsers : [],
    onlineSupports: Array.isArray(onlineSupports) ? onlineSupports : [],
    notifications: Array.isArray(notifications) ? notifications : [],
    messages: messages || {},
    typingUsers: typingUsers || {},
    supportRequests: Array.isArray(supportRequests) ? supportRequests : [],
    activeSupportChats: Array.isArray(activeSupportChats) ? activeSupportChats : [], // 👈 AGORA É ARRAY
    availableSupports: Array.isArray(availableSupports) ? availableSupports : [],
    transferInProgress,
    
    // Funções gerais
    sendMessage,
    joinRoom,
    leaveRoom,
    sendTyping,
    markMessageAsRead,
    getTypingUsers,
    getUnreadCount,
    getLastMessage,
    
    // Funções de suporte
    requestSupport,
    acceptSupportRequest,
    endSupportChat,
    getActiveChatByRoom,
    getAllActiveChats, // 👈 NOVA FUNÇÃO
    getChatsByUser,    // 👈 NOVA FUNÇÃO
    
    // Funções de transferência
    getAvailableSupports,
    transferSupport,
    
    // Funções de notificação
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications,
    removeNotification,
    
    // Contadores
    unreadCount: Array.isArray(notifications) 
      ? notifications.filter(n => !n?.read).length 
      : 0,
    pendingSupportRequests: Array.isArray(supportRequests) 
      ? supportRequests.length 
      : 0,
    activeChatsCount: Array.isArray(activeSupportChats) 
      ? activeSupportChats.length 
      : 0
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
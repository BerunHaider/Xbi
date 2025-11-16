import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import useAuth from '../hooks/useAuth';
import { Send, Paperclip, Smile, MoreVertical, Check, CheckCheck } from 'lucide-react';

export default function ChatWindow({ conversationId, otherUser, onClose }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    loadMessages();
    subscribeToMessages();
    checkBlocked();
    markConversationAsRead();
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      const { data } = await supabase.rpc('get_conversation_messages', {
        p_conversation_id: conversationId,
        p_user_id: user.id,
        p_limit: 50,
        p_offset: 0
      });
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const subscription = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          if (payload.new.sender_id !== user.id) {
            setMessages(prev => [...prev, {
              message_id: payload.new.id,
              sender_id: payload.new.sender_id,
              content: payload.new.content,
              created_at: payload.new.created_at,
              is_read: false
            }]);
            // Marcar como leído
            supabase.rpc('mark_message_as_read', {
              p_message_id: payload.new.id,
              p_user_id: user.id
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const checkBlocked = async () => {
    const { data } = await supabase.rpc('is_blocked_in_chat', {
      p_user_1_id: user.id,
      p_user_2_id: otherUser.id
    });
    setIsBlocked(data || false);
  };

  const markConversationAsRead = async () => {
    await supabase.rpc('mark_conversation_as_read', {
      p_conversation_id: conversationId,
      p_user_id: user.id
    });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isBlocked) return;

    try {
      await supabase.rpc('send_message', {
        p_conversation_id: conversationId,
        p_sender_id: user.id,
        p_content: newMessage
      });

      setMessages(prev => [...prev, {
        message_id: Date.now(),
        sender_id: user.id,
        content: newMessage,
        created_at: new Date().toISOString(),
        is_read: true
      }]);

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const deleteMessage = async (messageId) => {
    try {
      await supabase.rpc('delete_message', {
        p_message_id: messageId,
        p_sender_id: user.id
      });
      setMessages(prev => prev.filter(m => m.message_id !== messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Cargando...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-twitter-900">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-twitter-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={otherUser.avatar_url || 'https://via.placeholder.com/40'}
            alt={otherUser.username}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <p className="font-bold">{otherUser.username}</p>
            <p className="text-xs text-gray-500">@{otherUser.username}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-twitter-800 rounded-full">
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-xs p-3 rounded-lg ${
                msg.sender_id === user.id
                  ? 'bg-twitter-600 text-white'
                  : 'bg-gray-100 dark:bg-twitter-800 text-gray-900 dark:text-white'
              }`}
            >
              {!msg.is_deleted ? (
                <>
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-xs mt-1 ${msg.sender_id === user.id ? 'text-twitter-200' : 'text-gray-600'}`}>
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </p>
                </>
              ) : (
                <p className="text-xs italic opacity-60">Mensaje eliminado</p>
              )}
            </div>
            {msg.sender_id === user.id && (
              <button
                onClick={() => deleteMessage(msg.message_id)}
                className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-twitter-800 rounded"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {isBlocked ? (
        <div className="p-4 bg-red-50 dark:bg-red-900 text-red-600 text-center">
          No puedes enviar mensajes a este usuario
        </div>
      ) : (
        <form onSubmit={sendMessage} className="border-t border-gray-200 dark:border-twitter-800 p-4">
          <div className="flex gap-2 items-end">
            <button type="button" className="p-2 hover:bg-gray-100 dark:hover:bg-twitter-800 rounded-full">
              <Paperclip className="w-5 h-5 text-twitter-600" />
            </button>
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="flex-1 bg-gray-100 dark:bg-twitter-800 rounded-full px-4 py-2 focus:outline-none dark:text-white"
            />
            <button type="button" className="p-2 hover:bg-gray-100 dark:hover:bg-twitter-800 rounded-full">
              <Smile className="w-5 h-5 text-twitter-600" />
            </button>
            <button
              type="submit"
              className="p-2 bg-twitter-600 text-white rounded-full hover:bg-twitter-700"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import useAuth from '../hooks/useAuth';
import ChatWindow from './ChatWindow';
import { Search, MessageCirclePlus, X } from 'lucide-react';

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    loadConversations();
    subscribeToConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const { data } = await supabase.rpc('get_user_conversations', {
        p_user_id: user.id
      });
      setConversations(data || []);
      
      // Calcular total de no leídos
      const unread = (data || []).reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
      setTotalUnread(unread);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToConversations = () => {
    const subscription = supabase
      .channel(`conversations:${user.id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        (payload) => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const startNewConversation = async (otherUserId) => {
    const { data } = await supabase.rpc('get_or_create_conversation', {
      p_user_1_id: user.id,
      p_user_2_id: otherUserId
    });

    if (data) {
      const conversation = conversations.find(c => c.conversation_id === data);
      if (conversation) {
        setSelectedConversation(conversation);
      }
    }
  };

  const muteConversation = async (conversationId) => {
    await supabase.rpc('toggle_conversation_mute', {
      p_user_id: user.id,
      p_conversation_id: conversationId
    });
    loadConversations();
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_user_username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedConversation) {
    return (
      <ChatWindow
        conversationId={selectedConversation.conversation_id}
        otherUser={{
          id: selectedConversation.other_user_id,
          username: selectedConversation.other_user_username,
          avatar_url: selectedConversation.other_user_avatar
        }}
        onClose={() => setSelectedConversation(null)}
      />
    );
  }

  return (
    <div className="flex h-full bg-white dark:bg-twitter-900">
      {/* Left Sidebar */}
      <div className="w-80 border-r border-gray-200 dark:border-twitter-800 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-twitter-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Mensajes</h2>
            {totalUnread > 0 && (
              <span className="bg-twitter-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                {totalUnread}
              </span>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar conversaciones..."
              className="w-full bg-gray-100 dark:bg-twitter-800 rounded-full pl-10 pr-4 py-2 focus:outline-none dark:text-white"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Cargando...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <MessageCirclePlus className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No hay conversaciones aún</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <button
                key={conversation.conversation_id}
                onClick={() => setSelectedConversation(conversation)}
                className="w-full p-3 border-b border-gray-100 dark:border-twitter-800 hover:bg-gray-50 dark:hover:bg-twitter-800 transition flex items-center justify-between"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="relative">
                    <img
                      src={conversation.other_user_avatar || 'https://via.placeholder.com/40'}
                      alt={conversation.other_user_username}
                      className="w-12 h-12 rounded-full"
                    />
                    {conversation.is_online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="font-bold truncate">{conversation.other_user_username}</p>
                    <p className={`text-sm truncate ${
                      conversation.unread_count > 0
                        ? 'font-semibold text-gray-900 dark:text-white'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {conversation.last_message_content || 'Sin mensajes'}
                    </p>
                  </div>
                </div>
                {conversation.unread_count > 0 && (
                  <span className="ml-2 bg-twitter-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                    {conversation.unread_count}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Side - Empty State */}
      <div className="flex-1 flex items-center justify-center text-center">
        <div>
          <MessageCirclePlus className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Selecciona una conversación para comenzar
          </p>
        </div>
      </div>
    </div>
  );
}

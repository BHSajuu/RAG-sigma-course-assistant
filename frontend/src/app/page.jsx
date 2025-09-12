"use client";

import ChatArea from '@/components/ChatArea';
import Sidebar from '@/components/Sidebar';
import { useState } from 'react';

export default function Home() {
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [isSidebarLoading, setIsSidebarLoading] = useState(true);

  const handleSelectConversation = (id) => {
    setCurrentConversationId(id);
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setIsSidebarLoading(true);
    setTimeout(() => setIsSidebarLoading(false), 50); 
  };

  return (
    <main className="flex h-screen w-screen  bg-[#f0f4f9]">
      <Sidebar
        onSelectConversation={handleSelectConversation}
        activeConversationId={currentConversationId}
        isLoading={isSidebarLoading}
        onNewChat={handleNewConversation}
      />
      <ChatArea
        conversationId={currentConversationId}
        onNewConversationStarted={setCurrentConversationId}
        onNewChatClick={handleNewConversation}
      />
    </main>
  );
}
"use client";

import ChatArea from '@/components/ChatArea';
import Sidebar from '@/components/Sidebar';
import { useState } from 'react';

export default function Home() {
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [isSidebarLoading, setIsSidebarLoading] = useState(true);

  // This function will be passed to the Sidebar to update the conversation ID
  const handleSelectConversation = (id) => {
    setCurrentConversationId(id);
  };

  // This function will be passed to the ChatArea so it can tell the Sidebar to refresh
  const handleNewConversation = () => {
    setCurrentConversationId(null);
    // A little trick to force a re-render and re-fetch in the sidebar
    setIsSidebarLoading(true);
    setTimeout(() => setIsSidebarLoading(false), 50); // a small delay
  };

  return (
    <main className="flex h-screen w-screen bg-[#f0f4f9]">
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
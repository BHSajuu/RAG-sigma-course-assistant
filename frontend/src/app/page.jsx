"use client";

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';

export default function Home() {
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [refreshSidebar, setRefreshSidebar] = useState(0);
  // State for mobile sidebar visibility
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleSelectConversation = (id) => {
    setCurrentConversationId(id);
    setIsSidebarOpen(false); // Close sidebar on selection
  };

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setIsSidebarOpen(false); // Close sidebar on new chat
  };

  const triggerSidebarRefresh = () => {
    setRefreshSidebar(prev => prev + 1);
  };

  return (
    // Add relative positioning for the overlay
    <main className="relative flex h-screen w-screen bg-[#0D1117] overflow-hidden">
      <Sidebar
        onSelectConversation={handleSelectConversation}
        activeConversationId={currentConversationId}
        onNewChat={handleNewChat}
        refreshTrigger={refreshSidebar}
        // Pass down sidebar state and setter
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      <ChatArea
        conversationId={currentConversationId}
        onNewConversationStarted={(id) => {
            setCurrentConversationId(id);
            triggerSidebarRefresh();
        }}
        onNewChatClick={handleNewChat}
        // Pass down sidebar toggle function
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />
    </main>
  );
}
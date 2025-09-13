"use client";
import { useEffect, useState } from 'react';
import { FiPlus, FiTrash2, FiLogOut, FiLogIn, FiAlertTriangle, FiMessageSquare } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function Sidebar({ onSelectConversation, activeConversationId, onNewChat, refreshTrigger, isOpen, setIsOpen }) {
    const [user, setUser] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [isClearing, setIsClearing] = useState(false);

    const fetchData = async () => {
        try {
            const userRes = await fetch(`${API_BASE_URL}/api/me`, { credentials: 'include' });
            if (userRes.ok) {
                const userData = await userRes.json();
                setUser(userData);
                const convoRes = await fetch(`${API_BASE_URL}/conversations`, { credentials: 'include' });
                if (convoRes.ok) setConversations(await convoRes.json());
            } else {
                setUser(null);
                setConversations([]);
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
        }
    };
    
    useEffect(() => {
        fetchData();
    }, [refreshTrigger]);

    const handleDelete = async (convoId) => {
        try {
            await fetch(`${API_BASE_URL}/conversations/${convoId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            onNewChat(); 
            fetchData(); 
            toast.success("Conversation deleted");
        } catch (error) {
            toast.error("Failed to delete conversation");
        }
    };

   const handleClearAll = () => {
    toast((t) => (
      <div
        role="dialog"
        aria-labelledby="clear-dialog-title"
        aria-describedby="clear-dialog-desc"
        className="max-w-full bg-[#0B1220] border-2 border-[#30363D] rounded-2xl shadow-lg p-4 text-left"
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 bg-red-600/10 rounded-full p-2">
            <FiAlertTriangle className="text-red-400 w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 id="clear-dialog-title" className="text-sm font-semibold text-[#F0F6FC]">
              Delete all conversations
            </h3>
            <p id="clear-dialog-desc" className="mt-1 text-xs text-[#9CA3AF]">
              This will permanently delete all conversations for this account. This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-2xl text-xs font-medium bg-transparent border border-[#30363D] text-[#9CA3AF] hover:bg-[#161A20] focus:outline-none focus:ring-2 focus:ring-[#30C4E9]/40"
          >
            Cancel
          </button>

          <button
            onClick={async () => {
              if (isClearing) return;
              setIsClearing(true);
              try {
                const res = await fetch(`${API_BASE_URL}/conversations`, {
                  method: 'DELETE',
                  credentials: 'include',
                });
                if (!res.ok) throw new Error('Failed to clear');
                onNewChat();
                fetchData();
                toast.success('All conversations cleared');
              } catch (err) {
                console.error(err);
                toast.error('Failed to clear conversations');
              } finally {
                setIsClearing(false);
                toast.dismiss(t.id);
              }
            }}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-2xl text-xs font-medium bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/30"
          >
            {isClearing ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                <span className="text-xs">Clearing...</span>
              </>
            ) : (
              <span className="text-xs">Delete all</span>
            )}
          </button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-30 md:hidden"
                        onClick={() => setIsOpen(false)}
                    />
                )}
            </AnimatePresence>

            <motion.div
                className={`fixed top-0 left-0 h-full flex flex-col w-[280px] md:w-[360px] bg-[#010409] p-4 border-r border-[#8B949E]/20 z-40 md:relative md:translate-x-0 transition-transform duration-300 ease-in-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                <button
                    onClick={onNewChat}
                    className="flex items-center gap-2 w-full p-3 border border-dashed border-slate-300 rounded-2xl text-[#7ea4eb] font-bold text-left hover:bg-slate-600/40 hover:border-double transition-colors mb-4"
                >
                    <FiPlus /> New Chat
                </button>
                <div className="flex-grow overflow-y-auto space-y-2 pr-2 pt-6 border-t border-[#283347]">
                    {conversations.length === 0 ? (
                      <div className="py-10 px-4 text-center text-[#9CA3AF]">
                            <div className="flex flex-col items-center gap-2">
                                <FiMessageSquare className="w-6 h-6 text-blue-600" />
                                <div className="text-sm font-medium">No conversations available</div>
                                <div className="text-xs mt-1">Start a new chat to create a conversation.</div>
                            </div>
                        </div>
                    ) : (
                      conversations.map((convo, index) => (
                        <motion.div
                            key={convo.id}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`group flex items-center justify-between p-2.5 rounded-2xl cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis ${activeConversationId === convo.id ? 'bg-blue-300 text-[#0D1117] font-semibold' : 'hover:bg-blue-300/20'}`}
                            onClick={() => onSelectConversation(convo.id)}
                        >
                            <span className="truncate">{convo.title}</span>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(convo.id); }}
                                className="opacity-0 group-hover:opacity-100 text-[#ee7512] hover:text-red-500 transition-opacity ml-2"
                            >
                                <FiTrash2 />
                            </button>
                        </motion.div>
                    ))
                     )}
                </div>
                <div className="pt-4 border-t border-[#8B949E]/20">
                    {user ? (
                        <>
                            <div className="flex items-center gap-3 mb-3 px-3 py-2">
                                <img src={user.picture} alt="User profile" className="w-8 h-8 rounded-full" />
                                <span className="truncate">{user.name}</span>
                            </div>
                            {conversations.length > 0 && (
                                <button onClick={handleClearAll} className="flex items-center gap-2 w-full p-3 text-sm bg-slate-900 rounded-2xl text-[#8B949E] hover:bg-red-500/10 hover:text-red-500 transition-colors mb-2">
                                    <FiTrash2 /> Clear all conversations
                                </button>
                            )}
                            <a href={`${API_BASE_URL}/logout`} className="flex items-center justify-center gap-2 w-full p-3 rounded-2xl bg-[#8B949E]/20 text-[#C9D1D9] font-bold hover:bg-[#8B949E]/40">
                                <FiLogOut /> Logout
                            </a>
                        </>
                    ) : (
                        <a href={`${API_BASE_URL}/login`} className="flex items-center justify-center gap-2 w-full p-3 rounded-lg bg-[#30C4E9] text-[#0D1117] font-bold hover:opacity-90">
                            <FiLogIn /> Login with Google
                        </a>
                    )}
                </div>
            </motion.div>
        </>
    );
}

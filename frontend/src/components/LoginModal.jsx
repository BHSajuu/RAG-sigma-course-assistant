import { motion, AnimatePresence } from 'framer-motion';
import { FiLogIn } from 'react-icons/fi';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function LoginModal({ isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[#161B22] border border-[#30C4E9]/20 rounded-xl p-8 max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4">Please Log In</h2>
            <p className="text-[#8B949E] mb-6">
              You need to be logged in to start a conversation.
            </p>
            <a
              href={`${API_BASE_URL}/login`}
              className="flex items-center justify-center gap-2 w-full p-3 rounded-lg bg-[#30C4E9] text-[#0D1117] font-bold hover:opacity-90 transition-opacity"
            >
              <FiLogIn />
              Login with Google
            </a>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
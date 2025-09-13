import { motion } from 'framer-motion';

export default function Message({ message }) {
    const isUser = message.role === 'user';

    const loadingDots = (
        <div className="flex space-x-1">
            <motion.span animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.1 }} className="w-2 h-2 bg-[#8B949E] rounded-full" />
            <motion.span animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }} className="w-2 h-2 bg-[#8B949E] rounded-full" />
            <motion.span animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }} className="w-2 h-2 bg-[#8B949E] rounded-full" />
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`max-w-[85%] w-fit p-4 rounded-2xl leading-relaxed ${isUser
                ? 'bg-[#a09bcf] text-[#0D1117] self-end rounded-br-md'
                : 'bg-[#010409] self-start rounded-bl-md'
            }`}
        >
            <div className="whitespace-pre-wrap text-justify">
                {message.isLoading ? loadingDots : message.content}
            </div>

            {message.sources && message.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#8B949E]/20 text-sm">
                    <strong className="block mb-1.5">Sources:</strong>
                    {message.sources.map((source, index) => (
                        <a
                            key={index}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`block ${isUser ? 'text-blue-900' : 'text-[#30C4E9]'} hover:underline mb-1 truncate`}
                        >
                            {source.title}
                        </a>
                    ))}
                </div>
            )}
        </motion.div>
    );
}
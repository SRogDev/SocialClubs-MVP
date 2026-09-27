"use client";

import { motion, AnimatePresence } from "framer-motion";
import { UserPlus } from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface FloatingJoinButtonProps {
    clubName: string;
    clubIconUrl: string;
    clubColor: string;
    onJoin: () => void;
    isJoining?: boolean;
    className?: string;
}

export default function FloatingJoinButton({
    clubName,
    clubIconUrl,
    clubColor,
    onJoin,
    isJoining = false,
    className = "",
}: FloatingJoinButtonProps) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <AnimatePresence>
            <motion.div
                className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 ${className}`}
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                transition={{ duration: 0.3 }}
            >
                <motion.div
                    animate={{
                        scale: isHovered ? 1.05 : 1,
                    }}
                    transition={{
                        duration: 0.3,
                        ease: "easeInOut",
                    }}
                    onHoverStart={() => setIsHovered(true)}
                    onHoverEnd={() => setIsHovered(false)}
                >
                    <Button
                        onClick={onJoin}
                        disabled={isJoining}
                        className="shadow-2xl rounded-full px-6 py-4 flex items-center gap-3 border-2 border-white/20 backdrop-blur-sm"
                        style={{
                            backgroundColor: clubColor,
                            color: "white",
                        }}
                        aria-label={`Unirse al club ${clubName}`}
                        role="button"
                        tabIndex={0}
                    >
                        <AnimatePresence mode="wait">
                            {!isJoining ? (
                                <motion.div
                                    key="join-content"
                                    initial={{ opacity: 1, scale: 1 }}
                                    exit={{
                                        opacity: 0,
                                        scale: 0,
                                        transition: { duration: 0.2 },
                                    }}
                                    className="flex items-center gap-3"
                                >
                                    <motion.div
                                        animate={{
                                            scale: [1, 1.1, 1],
                                        }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            ease: "easeInOut",
                                        }}
                                    >
                                        <Avatar className="h-6 w-6 ring-2 ring-white/30">
                                            <AvatarImage
                                                src={clubIconUrl || "/placeholder.svg"}
                                                alt={clubName}
                                            />
                                            <AvatarFallback className="text-xs bg-white/20 text-white">
                                                {clubName.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </motion.div>
                                    <span className="font-semibold text-sm">Unirse</span>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="joining-content"
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-center gap-3"
                                >
                                    {[...Array(3)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            className="w-2 h-2 bg-white rounded-full"
                                            animate={{
                                                opacity: [0.4, 1, 0.4],
                                                scale: [1, 1.2, 1],
                                            }}
                                            transition={{
                                                duration: 1,
                                                repeat: Infinity,
                                                delay: i * 0.2,
                                            }}
                                        />
                                    ))}
                                    <UserPlus className="h-5 w-5" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Button>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
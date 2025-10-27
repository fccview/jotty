"use client";

import { Download, Eye, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";

interface VideoAttachmentProps {
    url: string;
    fileName: string;
    mimeType: string;
    className?: string;
}

export const VideoAttachment = ({
    url,
    fileName,
    mimeType,
    className = "",
}: VideoAttachmentProps) => {
    const t = useTranslations();
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [showControls, setShowControls] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const displayName = fileName.replace(/ \(\d+\)/, "").replace(/\.\w+$/, "");

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleVideoClick = () => {
        togglePlay();
    };

    const handleVideoEnded = () => {
        setIsPlaying(false);
    };

    const handleVideoPlay = () => {
        setIsPlaying(true);
    };

    const handleVideoPause = () => {
        setIsPlaying(false);
    };

    return (
        <span className={`inline-block max-w-full ${className}`}>
            <span className="relative group block">
                <span className="max-w-2xl rounded-lg overflow-hidden border border-border bg-card block">
                    <span
                        className="relative cursor-pointer block"
                        onMouseEnter={() => setShowControls(true)}
                        onMouseLeave={() => setShowControls(false)}
                        onClick={handleVideoClick}
                    >
                        <video
                            ref={videoRef}
                            src={url}
                            className="w-full h-auto max-h-96 object-contain bg-black"
                            muted={isMuted}
                            onEnded={handleVideoEnded}
                            onPlay={handleVideoPlay}
                            onPause={handleVideoPause}
                            preload="metadata"
                        />

                        <span className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                            {!isPlaying && (
                                <Button
                                    variant="secondary"
                                    size="lg"
                                    className="bg-white/90 hover:bg-white text-black opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Play className="h-6 w-6 mr-2" />
                                    {t("upload.play_video")}
                                </Button>
                            )}
                        </span>

                        {showControls && (
                            <span className="block absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                togglePlay();
                                            }}
                                            className="text-white hover:bg-white/20"
                                        >
                                            {isPlaying ? (
                                                <Pause className="h-4 w-4" />
                                            ) : (
                                                <Play className="h-4 w-4" />
                                            )}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleMute();
                                            }}
                                            className="text-white hover:bg-white/20"
                                        >
                                            {isMuted ? (
                                                <VolumeX className="h-4 w-4" />
                                            ) : (
                                                <Volume2 className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </span>

                                    <span className="flex gap-2">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(url, "_blank");
                                            }}
                                            className="bg-white/90 hover:bg-white text-black"
                                        >
                                            <Eye className="h-4 w-4 mr-1" />
                                            {t("upload.view")}
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const link = document.createElement("a");
                                                link.href = url;
                                                link.download = fileName;
                                                link.click();
                                            }}
                                            className="bg-white/90 hover:bg-white text-black"
                                        >
                                            <Download className="h-4 w-4 mr-1" />
                                            {t("upload.download")}
                                        </Button>
                                    </span>
                                </span>
                            </span>
                        )}
                    </span>

                    <span className="block p-3 bg-muted/30">
                        <span className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground truncate">
                                {displayName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {t("upload.video")}
                            </span>
                        </span>
                    </span>
                </span>
            </span>
        </span>
    );
};

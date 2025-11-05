"use client";

import { Card } from "@repo/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/avatar";
import { Eye } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { videoType } from "@/schema";
import clsx from "clsx";

const VideoCard = ({ video }: { video: videoType }) => {
  const isCompleted = video.progress === "COMPLETED";

  const CardContent = (
    <Card
      className={clsx(
        "overflow-hidden transition-shadow border-0",
        isCompleted
          ? "hover:shadow-lg cursor-pointer"
          : "opacity-60 cursor-not-allowed pointer-events-none"
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-200">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
            <span className="text-4xl text-gray-500">🎬</span>
          </div>
        )}

        {/* Status Badge */}
        <div
          className={clsx(
            "absolute top-2 right-2 h-3 w-3 rounded-full border-2",
            isCompleted
              ? "bg-green-500 border-green-600"
              : "bg-yellow-400 border-yellow-500"
          )}
          title={isCompleted ? "Completed" : "Processing"}
        ></div>
      </div>

      {/* Video Info */}
      <div className="p-3 flex gap-3">
        <Avatar className="h-9 w-9 flex-shrink-0">
          <AvatarImage src={video.user.image || ""} alt={video.user.name || "User"} />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
            {video.user.name?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm line-clamp-2 mb-1">{video.title}</h3>
          <p className="text-xs text-gray-600">{video.description}</p>

          <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {video.viewCount.toLocaleString()} views
            </span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}</span>
          </div>
        </div>
      </div>
    </Card>
  );

  return isCompleted ? (
    <Link href={`/watch/${video.id}`}>{CardContent}</Link>
  ) : (
    CardContent
  );
};

export default VideoCard;

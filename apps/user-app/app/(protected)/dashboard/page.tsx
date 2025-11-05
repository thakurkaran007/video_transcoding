"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import VideoCard from "../_components/VideoCard";
import axios from "axios";
import { videoType } from "@/schema";

export default function DashboardPage() {
  const [videos, setVideos] = useState<videoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const response: any = await axios.get(
       process.env.VIDEOS_URL!,
        { withCredentials: true }
      );

      if (response.status !== 200) throw new Error("Failed to fetch videos");

      setVideos(response.data.data.videos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading videos</p>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Recommended Videos</h1>

      {videos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No videos available yet.</p>
          <p className="text-sm text-gray-500 mt-2">Be the first to upload!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}

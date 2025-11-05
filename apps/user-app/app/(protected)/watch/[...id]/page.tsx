"use client";

import axios from "axios";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import type Player from "video.js/dist/types/player";

interface VideoResolutions {
  auto: string;
  "360P"?: string;
  "480P"?: string;
  "720P"?: string;
  "1080P"?: string;
  subtitles?: string;
}

export interface VideoType {
  id: string;
  title: string;
  description?: string;
  videoResolutions: VideoResolutions;
}

type QualityOption = keyof Omit<VideoResolutions, "subtitles">;
const QUALITY_ORDER: QualityOption[] = ["auto", "1080P", "720P", "480P", "360P"];

const WatchPage = () => {
  const { id } = useParams() as { id: string };

  const [video, setVideo] = useState<VideoType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerReady, setPlayerReady] = useState(false);

  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [currentQuality, setCurrentQuality] = useState<QualityOption>("auto");
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<Player | null>(null);
  const qualityMenuRef = useRef<HTMLDivElement | null>(null);
  const subtitleTrackRef = useRef<TextTrack | null>(null);

  /** ===== Fetch video ===== */
  useEffect(() => {
    const fetchVideo = async () => {
      try {
        setLoading(true);
        setPlayerReady(false);
        
        // Cleanup previous player if exists
        if (playerRef.current) {
          playerRef.current.dispose();
          playerRef.current = null;
        }
        
        const res = await axios.get<{ data: { video: VideoType } }>(
          `${process.env.VIDEOS_URL_USER}/${id}`,
          { withCredentials: true }
        );
        setVideo(res.data.data.video);
        setError(null);
        setCurrentQuality("auto");
      } catch (err) {
        console.error("Error fetching video:", err);
        setError("Failed to load video");
      } finally {
        setLoading(false);
      }
    };
    
    fetchVideo();
    
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [id]);

  /** ===== Close quality menu on outside click ===== */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (qualityMenuRef.current && !qualityMenuRef.current.contains(event.target as Node)) {
        setShowQualityMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /** ===== Sorted quality menu ===== */
  const qualityOptions = useMemo<QualityOption[]>(() => {
    if (!video) return [];
    return QUALITY_ORDER.filter((q) => q === "auto" || !!video.videoResolutions[q]);
  }, [video]);

  /** ===== Helper: URL for a given quality ===== */
  const getUrlForQuality = (q: QualityOption, v: VideoType): string =>
    q === "auto" ? v.videoResolutions.auto : v.videoResolutions[q] ?? v.videoResolutions.auto;

  /** ===== Load subtitles with credentials ===== */
  const loadSubtitlesWithCredentials = async (player: Player, url: string) => {
    try {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`Failed subtitle fetch: ${res.status}`);

      const vttText = await res.text();
      const blobUrl = URL.createObjectURL(new Blob([vttText], { type: "text/vtt" }));

      const added = player.addRemoteTextTrack(
        {
          kind: "subtitles",
          src: blobUrl,
          srclang: "en",
          label: "English",
          default: false,
        },
        false
      );

      if (added && "track" in added && added.track) {
        subtitleTrackRef.current = added.track as TextTrack;
        subtitleTrackRef.current.mode = subtitlesEnabled ? "showing" : "hidden";
      }
    } catch (err) {
      console.error("Subtitle load error:", err);
    }
  };

  /** ===== Initialize Video.js ===== */
  useEffect(() => {
    if (!video || !videoRef.current || playerRef.current || playerReady) {
      return;
    }

    console.log("🎬 Initializing Video.js for:", video.id);

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (!videoRef.current || playerRef.current) return;

      try {
        const player = videojs(videoRef.current, {
          controls: true,
          autoplay: false,
          preload: "auto",
          fluid: true,
          responsive: true,
          html5: {
            vhs: {
              withCredentials: true,
              overrideNative: true,
              handleManifestRedirects: true,
            },
          },
        });

        player.src({
          src: getUrlForQuality("auto", video),
          type: "application/x-mpegURL",
        });

        if (video.videoResolutions.subtitles) {
          loadSubtitlesWithCredentials(player, video.videoResolutions.subtitles.trim());
        }

        player.on("error", () => {
          const err = player.error();
          console.error("Video.js error:", err);
          setError(`Playback error: ${err?.message || "Unknown error"}`);
        });

        player.ready(() => {
          console.log("✅ Player ready");
          setPlayerReady(true);
        });

        playerRef.current = player;
      } catch (err) {
        console.error("Failed to initialize player:", err);
        setError("Failed to initialize video player");
      }
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [video, playerReady]);

  /** ===== Swap quality without reinitializing ===== */
  const changeQuality = (quality: QualityOption) => {
    if (!playerRef.current || !video) return;
    if (!qualityOptions.includes(quality)) return;

    const url = getUrlForQuality(quality, video);
    const currentTime = playerRef.current.currentTime();
    const wasPaused = playerRef.current.paused();
    const wasSubtitlesOn = subtitlesEnabled;

    playerRef.current.src({ src: url, type: "application/x-mpegURL" });

    playerRef.current.one("loadedmetadata", async () => {
      playerRef.current!.currentTime(currentTime);
      if (!wasPaused) playerRef.current!.play();

      if (video.videoResolutions.subtitles) {
        await loadSubtitlesWithCredentials(playerRef.current!, video.videoResolutions.subtitles.trim());
        if (wasSubtitlesOn && subtitleTrackRef.current) {
          subtitleTrackRef.current.mode = "showing";
        }
      }
    });

    setCurrentQuality(quality);
    setShowQualityMenu(false);
  };

  /** ===== Toggle subtitles ===== */
  const toggleSubtitles = () => {
    const track = subtitleTrackRef.current;
    if (!track) return;
    track.mode = track.mode === "showing" ? "hidden" : "showing";
    setSubtitlesEnabled(track.mode === "showing");
  };

  /** ===== UI: Loading / Error ===== */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading video...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-red-400 text-xl">{error}</div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-gray-400 text-xl">No video found.</div>
      </div>
    );
  }

  /** ===== UI: Main Layout ===== */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-white">{video.title}</h1>

          <div className="relative bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
            <div data-vjs-player>
              <video
                ref={videoRef}
                className="video-js vjs-big-play-centered"
                crossOrigin="use-credentials"
              />
            </div>

            {playerReady && (
              <div className="absolute top-4 right-4 flex gap-3 z-50">
                {video.videoResolutions.subtitles && (
                  <button
                    onClick={toggleSubtitles}
                    className={`p-3 rounded-lg transition-colors ${
                      subtitlesEnabled ? "bg-blue-600" : "bg-slate-700 hover:bg-slate-600"
                    }`}
                  >
                    CC
                  </button>
                )}

                <div className="relative" ref={qualityMenuRef}>
                  <button
                    onClick={() => setShowQualityMenu((s) => !s)}
                    className="p-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
                  >
                    {currentQuality}
                  </button>

                  {showQualityMenu && (
                    <div className="absolute right-0 mt-2 bg-slate-900 border border-slate-700 rounded-lg shadow-lg min-w-[120px]">
                      {qualityOptions.map((q) => (
                        <button
                          key={q}
                          onClick={() => changeQuality(q)}
                          className={`block w-full text-left px-4 py-2 hover:bg-slate-800 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                            currentQuality === q ? "bg-blue-600 text-white" : "text-gray-300"
                          }`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {video.description && (
            <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30">
              <p className="text-slate-300 whitespace-pre-wrap">{video.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WatchPage;
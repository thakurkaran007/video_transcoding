"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { Input } from "@repo/ui/input";
import axios from "axios";
import { Textarea } from "@repo/ui/text-area";
import { Button } from "@repo/ui/button";
import { Label } from "@repo/ui/label";
import { Upload, X, Video, Loader2, CheckCircle } from "lucide-react";
import { useDropzone } from "react-dropzone";

export default function UploadPage() {
  const router = useRouter();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<"idle" | "getting-url" | "uploading" | "finalizing" | "success">("idle");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      // Check if it's a video file
      if (file.type.startsWith("video/")) {
        setVideoFile(file);
      } else {
        alert("Please upload a video file");
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/*": [".mp4", ".mov", ".avi", ".mkv", ".webm"],
    },
    multiple: false,
  });

  const removeVideo = () => {
    setVideoFile(null);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!videoFile || !title.trim()) {
      alert("Please provide a video and title");
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setUploadStage("getting-url");

      const payload = {
          filename: videoFile.name,
          title: title,
          description: description,
          contentType: videoFile.type
      }

      const res:any = await axios.post("https://backend.thakurkaran.xyz/api/v1/videos/upload", payload, { withCredentials: true });

      if (res.status !== 200) {
        throw new Error(res.data.message || "Failed to get upload URL");
      }

      setUploadStage("uploading");

      const signedUrl = res.data.url;
      console.log("Signed URL received:", signedUrl);
      const uploadTask = await axios.put(signedUrl, videoFile, {
        headers: { "Content-Type": videoFile.type },
      });

      if (uploadTask.status !== 200) {
        throw new Error("Failed to upload video to S3");
      }


      setUploadStage("success");
      
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (error) {
      console.error("Upload error:", error);
      alert(error instanceof Error ? error.message : "Failed to upload video. Please try again.");
      setUploadProgress(0);
      setUploadStage("idle");
    } finally {
      setUploading(false);
    }
}

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Upload Video</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-6">
            {/* Video Upload Area */}
            <div>
              <Label className="mb-2 block">Video File</Label>
              {!videoFile ? (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  {isDragActive ? (
                    <p className="text-blue-600">Drop the video here...</p>
                  ) : (
                    <>
                      <p className="text-gray-600 mb-2">
                        Drag and drop a video file here, or click to select
                      </p>
                      <p className="text-sm text-gray-500">
                        Supports: MP4, MOV, AVI, MKV, WebM
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="border border-gray-300 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <Video className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{videoFile.name}</p>
                        <p className="text-sm text-gray-500">
                          {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={removeVideo}
                      disabled={uploading}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="title" className="mb-2 block">
                Title *
              </Label>
              <Input
                id="title"
                placeholder="Enter video title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={uploading}
                required
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="mb-2 block">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Tell viewers about your video"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={uploading}
                rows={5}
              />
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm items-center">
                  <span className="flex items-center gap-2">
                    {uploadStage === "success" ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </span>
                  {uploadStage === "uploading" && (
                    <span>{uploadProgress}%</span>
                  )}
                </div>
                {uploadStage === "uploading" && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
                {uploadStage === "success" && (
                  <div className="w-full bg-green-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full w-full" />
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={!videoFile || !title.trim() || uploading}
                className="flex-1"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploadStage === "success" ? "Redirecting..." : "Uploading..."}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Video
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard")}
                disabled={uploading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


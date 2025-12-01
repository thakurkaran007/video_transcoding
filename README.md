![Architecture Diagram](/images/arch.png)

---

## 🎥 Demo

Here is the backend demo of the video transcoding service:

### 🔹 Demo Video (Click to Watch)
[Click here to watch the full demo](https://www.youtube.com/watch?v=QxNRUHZf3nE)

> _Click the preview image to watch the demo video._

---

## Video Transcoding Service

This project is a scalable video transcoding system built on AWS services and Node.js, aimed at automatically generating multiple resolutions of uploaded videos. Internally uses **HLS (HTTP Live Streaming)** and **FFmpeg** to generate multiple resolutions of the video.

### Features

- **Automatic Video Transcoding**: Automatically transcode the uploaded video into multiple resolutions.
- **Scalable**: The system is built on AWS services, making it scalable and reliable.
- **Adaptive Bitrate Streaming**: Uses HLS to generate multiple resolutions of the video for adaptive bitrate streaming.
- **Dockerized**: The system is dockerized for easy deployment and scaling.

### Architecture

The system is built on AWS services, including S3, Lambda, API Gateway, ECR and ECS. The architecture is as follows:

1. User uploads a video to the S3 bucket.
2. S3 triggers a Lambda function to transcode the video into multiple resolutions.
3. The Lambda function sends the transcoded videos to another S3 bucket.

### Technologies

- Node.js  
- NextJs  
- AWS (S3, CloudFront + Signed Cookies, Hosted Zones, Lambda, API Gateway, ECR, ECS)  
- Docker  

### Problems Faced

- **Unable to access the transcoded videos**: The transcoded videos were not accessible due to incorrect permissions. This was resolved by updating the bucket policy to allow public access. More securely, we used **AWS CloudFront with Signed Cookies** to restrict access to authorized users only. Required configuring CDN distribution behavior for cookie-based access.
- **Error while downloading video in Docker**: Caused by incorrect file path. Fixed by updating the correct internal path.
- **Video transcoding taking too long**: Large video sizes made FFmpeg processing slow. Improved by using **worker threads** to speed up parallel transcoding.

### Future Scope

- **DRM (Digital Rights Management)** to protect premium content  
- **Live Streaming** support using HLS  
- **Automatic caption generation** using machine learning  

### Contact

Feel free to reach out for improvements, contributions, or issues.

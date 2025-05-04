import React, { use, useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  FaceLandmarker,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";

type TrackingProps = {
  video: HTMLVideoElement;
  showHighlights?: boolean;
  setLandmarks?: (landmarks: NormalizedLandmark[]) => void;
};

export const Tracking: React.FC<TrackingProps> = ({
  video,
  setLandmarks,
  showHighlights,
}) => {
  const webcamVideoRef = useRef<HTMLVideoElement>(video);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initialize();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
      }
    };
  }, []);

  function drawEyeHighlights(
    ctx: CanvasRenderingContext2D,
    landmarks: NormalizedLandmark[],
    width: number,
    height: number
  ) {
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;

    // Draw circles on iris centers (landmarks 468 and 473)
    [468, 473, 234, 454, 4].forEach((idx) => {
      const point = landmarks[idx];
      ctx.beginPath();
      ctx.arc(point.x * width, point.y * height, 2, 0, 2 * Math.PI);
      ctx.stroke();
    });
  }

  async function initialize() {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );

      faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(
        vision,
        {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          outputFaceBlendshapes: true,
          numFaces: 1,
        }
      );

      if (showHighlights) {
        detectFrame();
      }
    } catch (e) {
      console.error("Initialization error:", e);
      setError("Failed to initialize face landmarker.");
    }
  }

  function detectFrame() {
    if (
      !faceLandmarkerRef.current ||
      !webcamVideoRef.current ||
      !canvasRef.current
    ) {
      return;
    }

    const video = webcamVideoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;

    try {
      const results = faceLandmarkerRef.current.detectForVideo(
        video,
        Date.now()
      );

      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        const landmarks = results.faceLandmarks[0];
        setLandmarks?.(landmarks);

        drawEyeHighlights(ctx, landmarks, canvas.width, canvas.height);
      } else {
        setLandmarks?.([]);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    } catch (e) {
      console.error("Detection error:", e);
    }

    animationFrameId.current = requestAnimationFrame(detectFrame);
  }

  return (
    <div
      style={{
        position: "absolute",
        display: "flex",
        width: video?.clientWidth,
        height: video?.clientHeight,
      }}
    >
      {error && (
        <div style={{ color: "red", marginBottom: 10 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 right-0 bottom-0 z-200"
      />
    </div>
  );
};

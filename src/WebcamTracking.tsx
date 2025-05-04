import React, { useRef, useState } from "react";
import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";
import { Button } from "./components/ui/button";

interface Landmark {
  x: number;
  y: number;
  z: number;
}

interface WebcamTrackingProps {
  videoSrc?: string;
}

export const WebcamTracking: React.FC<WebcamTrackingProps> = () => {
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [webcamStarted, setWebcamStarted] = useState(false);
  const [webcamSettings, setWebcamSettings] =
    useState<MediaTrackSettings | null>(null);
  // const [landmarks, setLandmarks] = useState<Landmark[][]>([]);

  // Debounce pause timer
  // const pauseTimeoutRef = useRef<number | null>(null);

  function drawEyeHighlights(
    ctx: CanvasRenderingContext2D,
    landmarks: Landmark[],
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
      ctx.arc(point.x * width, point.y * height, 15, 0, 2 * Math.PI);
      ctx.stroke();
    });
  }

  // function updateVideoPlayback(
  //   isLooking: boolean,
  //   mainVideoRef: React.RefObject<HTMLVideoElement>
  // ) {
  //   if (!mainVideoRef.current) return;

  //   if (isLooking) {
  //     if (pauseTimeoutRef.current) {
  //       clearTimeout(pauseTimeoutRef.current);
  //       pauseTimeoutRef.current = null;
  //     }
  //     if (mainVideoRef.current.paused) {
  //       mainVideoRef.current.play().catch(() => {});
  //     }
  //   } else {
  //     if (!pauseTimeoutRef.current) {
  //       pauseTimeoutRef.current = window.setTimeout(() => {
  //         if (!mainVideoRef.current!.paused) {
  //           mainVideoRef.current!.pause();
  //         }
  //         pauseTimeoutRef.current = null;
  //       }, 300);
  //     }
  //   }
  // }

  async function initialize() {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );

      //   if (!isMounted) return;

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

      //   await startWebcam();
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
        // setLandmarks([landmarks]);
        //   const lookingStraight = isLookingStraight(landmarks);

        // Update video playback based on eye tracking
        //   updateVideoPlayback(lookingStraight, {
        //     current: document.querySelector("video") as HTMLVideoElement,
        //   });
        drawEyeHighlights(ctx, landmarks, canvas.width, canvas.height);
      } else {
        // setLandmarks([]);
        // No face detected: pause video immediately
        //   updateVideoPlayback(false, {
        //     current: document.querySelector("video") as HTMLVideoElement,
        //   });
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    } catch (e) {
      console.error("Detection error:", e);
    }

    animationFrameId.current = requestAnimationFrame(detectFrame);
  }

  async function startWebcam() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { min: 1024, ideal: 1280, max: 1920 },
          height: { min: 576, ideal: 720, max: 1080 },
        },
      });

      const settings = stream.getVideoTracks()[0].getSettings();

      console.info(
        "Webcam capabilities:",
        stream.getVideoTracks()[0].getCapabilities(),
        settings
      );

      setWebcamSettings(settings);

      mediaStreamRef.current = stream;

      if (!webcamVideoRef.current) return;

      webcamVideoRef.current.srcObject = stream;

      await new Promise<void>((resolve) => {
        webcamVideoRef.current!.onloadedmetadata = () => resolve();
      });

      await webcamVideoRef.current.play();

      setWebcamStarted(true);
      detectFrame();
    } catch (e) {
      console.error("Webcam error:", e);
      setError("Failed to access webcam.");
    }
  }

  //   useEffect(() => {
  //     let isMounted = true;

  //     async function startWebcam() {
  //       try {
  //         const stream = await navigator.mediaDevices.getUserMedia({
  //           video: true,
  //         });

  //         const settings = stream.getVideoTracks()[0].getSettings();

  //         setWebcamSettings(settings);

  //         mediaStreamRef.current = stream;

  //         if (!webcamVideoRef.current) return;

  //         webcamVideoRef.current.srcObject = stream;

  //         await new Promise<void>((resolve) => {
  //           webcamVideoRef.current!.onloadedmetadata = () => resolve();
  //         });

  //         await webcamVideoRef.current.play();

  //         setWebcamStarted(true);
  //         detectFrame();
  //       } catch (e) {
  //         console.error("Webcam error:", e);
  //         setError("Failed to access webcam.");
  //       }
  //     }

  //     function isLookingStraight(landmarks: Landmark[]): boolean {
  //       if (!landmarks || landmarks.length === 0) return false;

  //       // Iris landmarks indices (MediaPipe 468-477)
  //       const leftIris = landmarks.slice(468, 472); // 4 points
  //       const rightIris = landmarks.slice(473, 477); // 4 points

  //       const leftPupilY =
  //         leftIris.reduce((sum, p) => sum + p.y, 0) / leftIris.length;
  //       const rightPupilY =
  //         rightIris.reduce((sum, p) => sum + p.y, 0) / rightIris.length;

  //       const verticalDistance = Math.abs(leftPupilY - rightPupilY);
  //       const threshold = 0.02; // threshold for horizontal alignment

  //       return verticalDistance >= threshold;
  //     }

  //     initialize();

  //     return () => {
  //       isMounted = false;
  //       if (animationFrameId.current) {
  //         cancelAnimationFrame(animationFrameId.current);
  //       }
  //       if (mediaStreamRef.current) {
  //         mediaStreamRef.current.getTracks().forEach((t) => t.stop());
  //       }
  //       if (webcamVideoRef.current) {
  //         webcamVideoRef.current.pause();
  //         webcamVideoRef.current.srcObject = null;
  //       }
  //       if (faceLandmarkerRef.current) {
  //         faceLandmarkerRef.current.close();
  //       }
  //       setWebcamStarted(false);
  //     };
  //   }, []);

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: "100%",
        aspectRatio: webcamSettings?.aspectRatio,
      }}
    >
      {!webcamStarted && (
        <Button
          onClick={async () => {
            setError(null);
            // setWebcamStarted(true);
            await initialize();
            await startWebcam();
          }}
          className="fixed bottom-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-200"
        >
          Start Webcam & Eye Tracking
        </Button>
      )}

      {error && (
        <div style={{ color: "red", marginBottom: 10 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Hidden webcam input video */}
      <video
        ref={webcamVideoRef}
        style={{
          display: "block",
          //   width: webcamSettings?.width,
          //   aspectRatio: webcamSettings?.aspectRatio,
        }}
        muted
        playsInline
      />

      {/* Canvas overlay for eye highlights */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
          right: 0,
          bottom: 0,
          zIndex: 200,
        }}
      />
    </div>
  );
};

import React, { useEffect, useRef, useState } from "react";
import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";
import { Button } from "@/components/ui/button";

interface Landmark {
  x: number;
  y: number;
  z: number;
}

type VidEyeProps = {
  videoSrc: string;
};

export const VidEye: React.FC<VidEyeProps> = ({ videoSrc }) => {
  const webcamVideoRef = useRef<HTMLVideoElement>(null); // Hidden webcam input video
  const mainVideoRef = useRef<HTMLVideoElement>(null); // Controlled video element
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [webcamStarted, setWebcamStarted] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  // Debounce pause timer
  const pauseTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!webcamStarted) return;

    let isMounted = true;

    async function initialize() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );

        if (!isMounted) return;

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

        await startWebcam();
      } catch (e) {
        console.error("Initialization error:", e);
        setError("Failed to initialize face landmarker.");
      }
    }

    async function startWebcam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, frameRate: 30 },
        });

        mediaStreamRef.current = stream;

        if (!webcamVideoRef.current) return;

        webcamVideoRef.current.srcObject = stream;

        await new Promise<void>((resolve) => {
          webcamVideoRef.current!.onloadedmetadata = () => resolve();
        });

        await webcamVideoRef.current.play();

        setIsTracking(true);
        detectFrame();
      } catch (e) {
        console.error("Webcam error:", e);
        setError("Failed to access webcam.");
      }
    }

    // function isLookingStraight(landmarks: Landmark[]): boolean {
    //   if (!landmarks || landmarks.length === 0) return false;

    //   // Iris landmarks indices (MediaPipe 468-477)
    //   const leftIris = landmarks.slice(468, 473); // 5 points
    //   const rightIris = landmarks.slice(473, 478); // 5 points

    //   // Helper to get normalized pupil position within eye bounding box
    //   function getPupilNorm(iris: Landmark[]) {
    //     const xs = iris.map((p) => p.x);
    //     const minX = Math.min(...xs);
    //     const maxX = Math.max(...xs);
    //     const centerX = xs.reduce((a, b) => a + b, 0) / xs.length;
    //     return (centerX - minX) / (maxX - minX);
    //   }

    //   const leftPupilNorm = getPupilNorm(leftIris);
    //   const rightPupilNorm = getPupilNorm(rightIris);

    //   // Thresholds for "looking straight"
    //   const minThreshold = 0.35;
    //   const maxThreshold = 0.65;

    //   const leftLooking =
    //     leftPupilNorm > minThreshold && leftPupilNorm < maxThreshold;
    //   const rightLooking =
    //     rightPupilNorm > minThreshold && rightPupilNorm < maxThreshold;

    //   return leftLooking && rightLooking;
    // }

    function isLookingStraight(landmarks: Landmark[]): boolean {
      if (!landmarks || landmarks.length === 0) return false;

      // Iris landmarks indices https://storage.googleapis.com/mediapipe-assets/documentation/mediapipe_face_landmark_fullsize.png
      const leftIris = landmarks.slice(468, 472); // 4 points
      const rightIris = landmarks.slice(473, 477); // 4 points

      const nose = landmarks[4]; // 4 points
      const left = landmarks[234]; // 1 point
      const right = landmarks[454]; // 1 point

      // leftDistance = Math.abs(left.x - nose.x); // 0.10
      // rightDistance = Math.abs(right.x - nose.x); // 0.12

      // Calculate pupil center X for left iris
      const leftPupilY =
        leftIris.reduce((sum, p) => sum + p.y, 0) / leftIris.length;
      // Calculate pupil center X for right iris
      const rightPupilY =
        rightIris.reduce((sum, p) => sum + p.y, 0) / rightIris.length;

      // Calculate horizontal distance between pupils (normalized coordinates)
      const verticalDistance = Math.abs(leftPupilY - rightPupilY);

      // Define threshold for horizontal alignment (tune as needed)
      const threshold = 0.02; // e.g., 5% of normalized width

      // If pupils are horizontally aligned within threshold, return true (play)
      return verticalDistance >= threshold;
    }

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
      [468, 473].forEach((idx) => {
        const point = landmarks[idx];
        ctx.beginPath();
        ctx.arc(point.x * width, point.y * height, 15, 0, 2 * Math.PI);
        ctx.stroke();
      });
    }

    function updateVideoPlayback(isLooking: boolean) {
      if (!mainVideoRef.current) return;

      if (isLooking) {
        if (pauseTimeoutRef.current) {
          clearTimeout(pauseTimeoutRef.current);
          pauseTimeoutRef.current = null;
        }
        if (mainVideoRef.current.paused) {
          mainVideoRef.current.play().catch(() => {});
        }
      } else {
        if (!pauseTimeoutRef.current) {
          pauseTimeoutRef.current = window.setTimeout(() => {
            if (!mainVideoRef.current!.paused) {
              mainVideoRef.current!.pause();
            }
            pauseTimeoutRef.current = null;
          }, 300); // 300ms debounce before pause
        }
      }
    }

    async function detectFrame() {
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

      // Match canvas size to video size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      try {
        const results = faceLandmarkerRef.current.detectForVideo(
          video,
          Date.now()
        );

        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
          const landmarks = results.faceLandmarks[0];
          const lookingStraight = isLookingStraight(landmarks);

          updateVideoPlayback(lookingStraight);
          drawEyeHighlights(ctx, landmarks, canvas.width, canvas.height);
        } else {
          // No face detected: pause video immediately
          updateVideoPlayback(false);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      } catch (e) {
        console.error("Detection error:", e);
      }

      animationFrameId.current = requestAnimationFrame(detectFrame);
    }

    initialize();

    return () => {
      isMounted = false;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (webcamVideoRef.current) {
        webcamVideoRef.current.pause();
        webcamVideoRef.current.srcObject = null;
      }
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
      }
      setIsTracking(false);
    };
  }, [webcamStarted]);

  return (
    <div style={{ position: "relative", width: 640, margin: "auto" }}>
      {!webcamStarted && (
        <Button
          onClick={() => {
            setError(null);
            setWebcamStarted(true);
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
        style={{ display: "block" }}
        muted
        playsInline
      />

      {/* Controlled main video */}
      <video
        ref={mainVideoRef}
        src={videoSrc}
        width={640}
        // controls
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          objectFit: "contain",
          backgroundColor: "black",
          zIndex: 100,
        }}
      />

      {/* Canvas overlay for eye highlights */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
          width: 640,
          height: 480,
          zIndex: 200,
        }}
      />
    </div>
  );
};

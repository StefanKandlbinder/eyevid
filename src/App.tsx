import { useRef, useState } from "react";
import WebcamComponent, { WebcamHandlers } from "./Webcam";
import { Button } from "./components/ui/button";
import { Tracking } from "./Tracking";
import { NormalizedLandmark } from "@mediapipe/tasks-vision";

const App = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const webcamRef = useRef<WebcamHandlers>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[]>([]);

  const handleStart = async () => {
    if (webcamRef.current) {
      await webcamRef.current.start();
      setIsStreaming(true);
    }
  };

  const handleStop = () => {
    if (webcamRef.current) {
      webcamRef.current.stop();
      setIsStreaming(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "640px",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        margin: "auto",
        gap: "10px",
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ backgroundColor: "#000" }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
        }}
      ></div>
      {!isStreaming ? (
        <div className="flex gap-2 justify-between">
          <Button className="grow" onClick={handleStart}>
            Start Webcam
          </Button>
        </div>
      ) : (
        <div className="flex gap-2 justify-between">
          <Button className="grow" onClick={handleStop}>
            Stop Webcam
          </Button>
          {!isTracking && (
            <Button className="grow" onClick={() => setIsTracking(true)}>
              Start Tracking
            </Button>
          )}
          {isTracking && (
            <Button className="grow" onClick={() => setIsTracking(false)}>
              Stop Tracking
            </Button>
          )}
        </div>
      )}

      <WebcamComponent
        ref={webcamRef}
        videoElement={videoRef as React.RefObject<HTMLVideoElement>}
        onError={(err) => console.error("Webcam error:", err)}
        onStreamStarted={() => console.log("Stream started")}
        onStreamStopped={() => console.log("Stream stopped")}
      />
      {videoRef.current && isTracking && isStreaming && (
        <Tracking video={videoRef.current} showHighlights />
      )}
    </div>
  );
};

export default App;

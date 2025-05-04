import { useRef, useState } from "react";
import WebcamComponent, { WebcamHandlers } from "./Webcam";
import { Button } from "./components/ui/button";
import { Tracking } from "./Tracking";
// import { NormalizedLandmark } from "@mediapipe/tasks-vision";

const App = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const webcamRef = useRef<WebcamHandlers>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  // const [landmarks, setLandmarks] = useState<NormalizedLandmark[]>([]);

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
    <div className="max-w-[640px] relative flex flex-col mx-auto gap-2 transition-all duration-300 ease-in-out">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ backgroundColor: "#000" }}
      />
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

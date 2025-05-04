import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";

export type WebcamHandlers = {
  start: () => Promise<void>;
  stop: () => void;
  stream: MediaStream | null;
  aspectRatio: number;
};

type WebcamComponentProps = {
  videoElement: React.RefObject<HTMLVideoElement>;
  onError?: (error: Error) => void;
  onStreamStarted?: (stream: MediaStream) => void;
  onStreamStopped?: () => void;
};

const Webcam = forwardRef<WebcamHandlers, WebcamComponentProps>(
  ({ videoElement, onError, onStreamStarted, onStreamStopped }, ref) => {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);

    const constraints: MediaStreamConstraints = {
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        facingMode: "user",
      },
      audio: false,
    };

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Webcam API not supported in this browser");
        }
        const mediaStream = await navigator.mediaDevices.getUserMedia(
          constraints
        );
        setStream(mediaStream);

        if (videoElement.current) {
          videoElement.current.srcObject = mediaStream;
          await videoElement.current.play();
        }

        setError(null);
        onStreamStarted?.(mediaStream);
      } catch (err) {
        const error = err as Error;
        setError(error.message);
        onError?.(error);
      }
    };

    const stop = () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
        if (videoElement.current) {
          videoElement.current.srcObject = null;
        }
        onStreamStopped?.();
      }
    };

    useEffect(() => {
      return () => {
        stop();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        start,
        stop,
        stream,
        aspectRatio: stream
          ? stream.getVideoTracks()[0].getSettings().aspectRatio || 0
          : 0,
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [stream]
    );

    return error ? <div style={{ color: "red" }}>Error: {error}</div> : null;
  }
);

export default Webcam;

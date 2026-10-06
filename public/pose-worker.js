/* MediaPipe runs off the UI thread. Frames never leave this worker or the browser. */
let detector;
self.onmessage = async (event) => {
  const { type, bitmap, timestamp } = event.data;
  try {
    if (type === "init") {
      // Classic workers support the importScripts call used by MediaPipe's WASM loader.
      const { FilesetResolver, PoseLandmarker } = await import(
        "/models/vision_bundle.mjs"
      );
      const canvas = new OffscreenCanvas(256, 256);
      if (!canvas.getContext("webgl2"))
        throw new Error(
          "WebGL 2 is unavailable. Enable graphics acceleration or use another browser.",
        );
      const files = await FilesetResolver.forVisionTasks("/models/wasm");
      detector = await PoseLandmarker.createFromOptions(files, {
        canvas,
        baseOptions: {
          modelAssetPath: "/models/pose_landmarker_lite.task",
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.6,
        minPosePresenceConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });
      self.postMessage({ type: "ready" });
    } else if (type === "check" && detector) {
      const sample = new OffscreenCanvas(256, 256);
      const ctx = sample.getContext("2d");
      ctx.fillStyle = "#808080";
      ctx.fillRect(0, 0, 256, 256);
      detector.detectForVideo(sample, 1);
      self.postMessage({ type: "checked" });
    } else if (type === "frame" && detector) {
      const result = detector.detectForVideo(bitmap, timestamp);
      bitmap.close();
      self.postMessage({
        type: "pose",
        landmarks: result.landmarks[0] ?? [],
        world: result.worldLandmarks[0] ?? [],
        timestamp,
      });
    } else if (type === "close") {
      detector?.close();
      self.close();
    }
  } catch (error) {
    bitmap?.close();
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "Pose detection failed",
    });
  }
};

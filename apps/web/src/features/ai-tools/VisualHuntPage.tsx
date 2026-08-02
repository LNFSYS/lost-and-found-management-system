import {
  AlertTriangle,
  ArrowRight,
  Camera,
  Image as ImageIcon,
  LoaderCircle,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  Upload,
  Video
} from "lucide-react";
import { type ChangeEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import "./ai-tools.css";

export type VisualHuntSource = "CAMERA" | "IMAGE" | "VIDEO_FRAMES" | "BATCH_IMAGES";
export type VisualHuntPostType = "LOST" | "FOUND";

export interface VisualHuntAnalysisInput {
  images: File[];
  source: VisualHuntSource;
  originalFileName?: string;
}

export interface VisualHuntResult {
  id: string;
  title: string;
  type: VisualHuntPostType;
  confidence: number;
  imageUrl?: string | null;
  location?: string | null;
  reasons?: readonly string[];
}

export interface VisualHuntPageProps {
  onAnalyze: (input: VisualHuntAnalysisInput) => Promise<readonly VisualHuntResult[]>;
  onOpenResult: (result: VisualHuntResult) => void;
  onCandidateDecision?: (result: VisualHuntResult, decision: "CANDIDATE" | "NOT_RELEVANT", source: VisualHuntSource) => void | Promise<void>;
  onResultsChange?: (results: readonly VisualHuntResult[]) => void;
  onCameraActiveChange?: (active: boolean) => void;
  maxImageBytes?: number;
  maxVideoBytes?: number;
  maxVideoDurationSeconds?: number;
  videoFrameCount?: number;
  disabled?: boolean;
  advisoryText?: string;
}

type HuntMode = "IDLE" | "REQUESTING_CAMERA" | "LIVE_CAMERA" | "PREVIEW" | "EXTRACTING_VIDEO" | "ANALYZING" | "RESULTS" | "ERROR";

const DEFAULT_MAX_IMAGE_BYTES = 7 * 1024 * 1024;
const DEFAULT_MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const DEFAULT_MAX_VIDEO_DURATION_SECONDS = 30;
const DEFAULT_VIDEO_FRAME_COUNT = 3;
const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function waitForMediaEvent(target: HTMLMediaElement, eventName: "loadedmetadata" | "loadeddata" | "seeked") {
  return new Promise<void>((resolve, reject) => {
    const handleSuccess = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("Trình duyệt không đọc được tệp video này."));
    };
    const cleanup = () => {
      target.removeEventListener(eventName, handleSuccess);
      target.removeEventListener("error", handleError);
    };
    target.addEventListener(eventName, handleSuccess, { once: true });
    target.addEventListener("error", handleError, { once: true });
  });
}

function canvasToFile(canvas: HTMLCanvasElement, name: string, quality = 0.9) {
  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Không thể tạo ảnh từ khung hình đã chọn."));
        return;
      }
      resolve(new File([blob], name, { type: "image/jpeg", lastModified: Date.now() }));
    }, "image/jpeg", quality);
  });
}

function drawFrame(source: CanvasImageSource, sourceWidth: number, sourceHeight: number) {
  const maxDimension = 1280;
  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Trình duyệt không hỗ trợ xử lý khung hình.");
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function extractVideoFrames(file: File, frameCount: number, maxDurationSeconds: number) {
  const video = document.createElement("video");
  const objectUrl = URL.createObjectURL(file);
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = objectUrl;

  try {
    await waitForMediaEvent(video, "loadedmetadata");
    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      throw new Error("Video không có thời lượng hợp lệ.");
    }
    if (video.duration > maxDurationSeconds) {
      throw new Error(`Video dài tối đa ${maxDurationSeconds} giây.`);
    }
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await waitForMediaEvent(video, "loadeddata");
    }

    const safeFrameCount = Math.max(1, Math.min(5, frameCount));
    const frames: File[] = [];
    for (let index = 0; index < safeFrameCount; index += 1) {
      const targetTime = Math.min(video.duration - 0.01, Math.max(0.01, video.duration * ((index + 1) / (safeFrameCount + 1))));
      const seekPromise = waitForMediaEvent(video, "seeked");
      video.currentTime = targetTime;
      await seekPromise;
      const canvas = drawFrame(video, video.videoWidth, video.videoHeight);
      frames.push(await canvasToFile(canvas, `visual-hunt-frame-${index + 1}.jpg`, 0.88));
    }
    return frames;
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}

function cameraErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") return "Quyền camera bị từ chối. Bạn vẫn có thể chọn ảnh hoặc video từ thiết bị.";
    if (error.name === "NotFoundError") return "Không tìm thấy camera phù hợp trên thiết bị này.";
    if (error.name === "NotReadableError" || error.name === "AbortError") return "Camera đang được ứng dụng khác sử dụng hoặc chưa sẵn sàng.";
  }
  return error instanceof Error ? error.message : "Không thể mở camera.";
}

function normalizedConfidence(value: number) {
  const normalized = value > 1 ? value / 100 : value;
  return Math.max(0, Math.min(1, normalized));
}

export function VisualHuntPage(props: VisualHuntPageProps) {
  const titleId = useId();
  const statusId = useId();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);
  const [mode, setMode] = useState<HuntMode>("IDLE");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [source, setSource] = useState<VisualHuntSource | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string | undefined>();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [results, setResults] = useState<readonly VisualHuntResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [message, setMessage] = useState("Camera chỉ bật sau khi bạn cho phép.");

  const maxImageBytes = props.maxImageBytes ?? DEFAULT_MAX_IMAGE_BYTES;
  const maxVideoBytes = props.maxVideoBytes ?? DEFAULT_MAX_VIDEO_BYTES;
  const maxVideoDurationSeconds = props.maxVideoDurationSeconds ?? DEFAULT_MAX_VIDEO_DURATION_SECONDS;
  const videoFrameCount = props.videoFrameCount ?? DEFAULT_VIDEO_FRAME_COUNT;

  const releaseCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    props.onCameraActiveChange?.(false);
  }, [props.onCameraActiveChange]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      releaseCamera();
    };
  }, [releaseCamera]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden && streamRef.current) {
        releaseCamera();
        setMode("IDLE");
        setMessage("Camera đã dừng khi trang chuyển sang nền. Bấm mở camera để tiếp tục.");
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [releaseCamera]);

  useEffect(() => {
    if (selectedImages.length === 0) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedImages[0]);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedImages]);

  async function startCamera() {
    setError(null);
    setMode("REQUESTING_CAMERA");
    setMessage("Đang chờ bạn cấp quyền camera...");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setMode("ERROR");
      setError("Camera trực tiếp cần HTTPS và một trình duyệt có hỗ trợ. Hãy dùng ảnh hoặc video thay thế.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (!mountedRef.current || document.hidden) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      props.onCameraActiveChange?.(true);
      setMode("LIVE_CAMERA");
      setMessage("Camera đang bật. Căn vật phẩm vào giữa khung rồi chụp.");
    } catch (cameraError) {
      releaseCamera();
      setMode("ERROR");
      setError(cameraErrorMessage(cameraError));
    }
  }

  async function captureImage() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setError("Camera chưa có khung hình. Hãy chờ một chút rồi chụp lại.");
      return;
    }
    try {
      const canvas = drawFrame(video, video.videoWidth, video.videoHeight);
      const image = await canvasToFile(canvas, `visual-hunt-camera-${Date.now()}.jpg`);
      releaseCamera();
      setSelectedImages([image]);
      setSource("CAMERA");
      setOriginalFileName(undefined);
      setResults([]);
      setError(null);
      setMode("PREVIEW");
      setMessage("Ảnh chỉ được gửi khi bạn bấm phân tích.");
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : "Không thể chụp ảnh.");
    }
  }

  function validateImage(file: File) {
    if (!SUPPORTED_IMAGE_TYPES.has(file.type)) return "Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.";
    if (file.size > maxImageBytes) return `Ảnh vượt quá ${Math.round(maxImageBytes / 1024 / 1024)}MB.`;
    return null;
  }

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, 5);
    event.target.value = "";
    if (files.length === 0) return;
    releaseCamera();
    const validationError = files.map(validateImage).find(Boolean);
    if (validationError) {
      setMode("ERROR");
      setError(validationError);
      return;
    }
    setSelectedImages(files);
    setSource(files.length > 1 ? "BATCH_IMAGES" : "IMAGE");
    setOriginalFileName(files.map((file) => file.name).join(", "));
    setResults([]);
    setError(null);
    setMode("PREVIEW");
    setMessage("Ảnh chỉ được gửi khi bạn bấm phân tích.");
  }

  async function chooseVideo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    releaseCamera();
    if (!file.type.startsWith("video/")) {
      setMode("ERROR");
      setError("Tệp đã chọn không phải video hợp lệ.");
      return;
    }
    if (file.size > maxVideoBytes) {
      setMode("ERROR");
      setError(`Video vượt quá ${Math.round(maxVideoBytes / 1024 / 1024)}MB.`);
      return;
    }

    setMode("EXTRACTING_VIDEO");
    setError(null);
    setMessage("Đang trích khung hình ngay trên thiết bị. Video gốc sẽ không được tải lên.");
    try {
      const frames = await extractVideoFrames(file, videoFrameCount, maxVideoDurationSeconds);
      setSelectedImages(frames);
      setSource("VIDEO_FRAMES");
      setOriginalFileName(file.name);
      setResults([]);
      setMode("PREVIEW");
      setMessage(`Đã trích ${frames.length} khung hình. Video gốc vẫn ở trên thiết bị.`);
    } catch (videoError) {
      setMode("ERROR");
      setError(videoError instanceof Error ? videoError.message : "Không thể trích khung hình video.");
    }
  }

  async function analyze() {
    if (!source || selectedImages.length === 0) return;
    setMode("ANALYZING");
    setError(null);
    setMessage(`Đang phân tích ${selectedImages.length} ảnh...`);
    try {
      const nextResults = await props.onAnalyze({ images: [...selectedImages], source, originalFileName });
      setResults(nextResults);
      props.onResultsChange?.(nextResults);
      setMode("RESULTS");
      setMessage(nextResults.length > 0 ? `Tìm thấy ${nextResults.length} kết quả tham khảo.` : "Chưa tìm thấy bài đăng đủ tương đồng.");
    } catch (analysisError) {
      setMode("ERROR");
      setError(analysisError instanceof Error ? analysisError.message : "Phân tích hình ảnh không thành công.");
    }
  }

  function reset() {
    releaseCamera();
    setSelectedImages([]);
    setSource(null);
    setOriginalFileName(undefined);
    setResults([]);
    setError(null);
    setFeedbackMessage(null);
    setMode("IDLE");
    setMessage("Camera chỉ bật sau khi bạn cho phép.");
    props.onResultsChange?.([]);
  }

  const busy = mode === "REQUESTING_CAMERA" || mode === "EXTRACTING_VIDEO" || mode === "ANALYZING";
  const cameraLive = mode === "LIVE_CAMERA";

  async function recordDecision(result: VisualHuntResult, decision: "CANDIDATE" | "NOT_RELEVANT") {
    if (!source || !props.onCandidateDecision) return;
    setFeedbackMessage(null);
    try {
      await props.onCandidateDecision(result, decision, source);
      setFeedbackMessage(decision === "CANDIDATE" ? "Đã ghi nhận candidate để Staff tiếp tục kiểm tra." : "Đã ghi nhận kết quả không liên quan.");
    } catch (decisionError) {
      setFeedbackMessage(decisionError instanceof Error ? decisionError.message : "Không thể lưu phản hồi Visual Hunt.");
    }
  }

  return (
    <section className="visual-hunt-page" aria-labelledby={titleId}>
      <header className="visual-hunt-hero">
        <div>
          <span className="ai-tool-eyebrow">Tìm bằng hình ảnh</span>
          <h2 id={titleId}>Visual Hunt</h2>
          <p>Chụp vật phẩm hoặc chọn ảnh/video để tìm bài đăng tương đồng. Kết quả chỉ hỗ trợ tìm kiếm và không xác nhận quyền sở hữu.</p>
        </div>
        <div className="visual-hunt-privacy">
          <ShieldCheck size={20} aria-hidden="true" />
          <span>Không thu âm. Video được tách khung hình trên thiết bị và không bao giờ được gửi nguyên bản.</span>
        </div>
      </header>

      <div className="visual-hunt-workbench">
        <div className="visual-hunt-stage">
          <div className={`visual-hunt-viewport mode-${mode.toLowerCase()}`}>
            <video ref={videoRef} autoPlay muted playsInline aria-label="Hình ảnh trực tiếp từ camera" hidden={!cameraLive && mode !== "REQUESTING_CAMERA"} />

            {cameraLive && (
              <div className="visual-hunt-reticle" aria-hidden="true">
                <span /><span /><span /><span />
              </div>
            )}

            {previewUrl && !cameraLive && (
              <div className="visual-hunt-preview">
                <img src={previewUrl} alt="Ảnh đầu tiên sẽ dùng để tìm kiếm" />
                {selectedImages.length > 1 && <span>+{selectedImages.length - 1} khung hình</span>}
              </div>
            )}

            {!previewUrl && !cameraLive && !busy && (
              <div className="visual-hunt-placeholder">
                <ScanSearch size={44} aria-hidden="true" />
                <strong>Đặt vật phẩm vào khung hình</strong>
                <span>Chụp rõ hình dáng, logo, màu sắc và dấu hiệu riêng.</span>
              </div>
            )}

            {busy && (
              <div className="visual-hunt-progress" role="status">
                <LoaderCircle size={30} aria-hidden="true" />
                <strong>{mode === "REQUESTING_CAMERA" ? "Đang mở camera" : mode === "EXTRACTING_VIDEO" ? "Đang trích khung hình" : "Đang tìm bài tương đồng"}</strong>
              </div>
            )}
          </div>

          <div className="visual-hunt-status" id={statusId} role="status" aria-live="polite">
            <span className={`visual-hunt-status-dot ${cameraLive ? "live" : ""}`} aria-hidden="true" />
            {message}
          </div>

          {error && <div className="ai-tool-notice error" role="alert"><AlertTriangle size={17} aria-hidden="true" /> {error}</div>}

          <div className="visual-hunt-controls" aria-describedby={statusId}>
            {!cameraLive && (
              <button className="ai-tool-button primary" type="button" disabled={busy || props.disabled} onClick={() => void startCamera()}>
                <Camera size={18} aria-hidden="true" /> Mở camera
              </button>
            )}
            {cameraLive && (
              <>
                <button className="ai-tool-button primary capture" type="button" onClick={() => void captureImage()}>
                  <Camera size={18} aria-hidden="true" /> Chụp ảnh
                </button>
                <button className="ai-tool-button secondary" type="button" onClick={() => {
                  releaseCamera();
                  setMode("IDLE");
                  setMessage("Camera đã dừng.");
                }}>
                  Dừng camera
                </button>
              </>
            )}
            {selectedImages.length > 0 && !cameraLive && (
              <button className="ai-tool-button primary" type="button" disabled={busy || props.disabled} onClick={() => void analyze()}>
                <ScanSearch size={18} aria-hidden="true" /> {mode === "RESULTS" ? "Phân tích lại" : "Phân tích ảnh"}
              </button>
            )}
            {(selectedImages.length > 0 || results.length > 0 || error) && !cameraLive && (
              <button className="ai-tool-button secondary" type="button" disabled={busy} onClick={reset}>
                <RefreshCw size={16} aria-hidden="true" /> Làm lại
              </button>
            )}
          </div>

          {!cameraLive && (
            <div className="visual-hunt-fallbacks">
              <div className="visual-hunt-divider"><span>hoặc dùng tệp có sẵn</span></div>
              <div className="visual-hunt-file-actions">
                <label className={`ai-tool-file-button ${busy || props.disabled ? "disabled" : ""}`}>
                  <ImageIcon size={18} aria-hidden="true" />
                  <span><strong>Chọn ảnh</strong><small>JPG, PNG, WEBP</small></span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple disabled={busy || props.disabled} onChange={chooseImage} />
                </label>
                <label className={`ai-tool-file-button ${busy || props.disabled ? "disabled" : ""}`}>
                  <Video size={18} aria-hidden="true" />
                  <span><strong>Chọn video ngắn</strong><small>Tối đa {maxVideoDurationSeconds} giây</small></span>
                  <input type="file" accept="video/*" disabled={busy || props.disabled} onChange={(event) => void chooseVideo(event)} />
                </label>
              </div>
              <small className="visual-hunt-file-note"><Upload size={13} aria-hidden="true" /> Chỉ ảnh chụp hoặc khung hình JPEG được chuyển cho hàm phân tích.</small>
            </div>
          )}
        </div>

        <aside className="visual-hunt-results" aria-labelledby={`${titleId}-results`}>
          <div className="visual-hunt-results-heading">
            <div>
              <span className="ai-tool-eyebrow">Kết quả tham khảo</span>
              <h3 id={`${titleId}-results`}>Bài đăng tương đồng</h3>
            </div>
            {results.length > 0 && <span>{results.length} kết quả</span>}
          </div>

          <div className="visual-hunt-result-list" aria-live="polite">
            {feedbackMessage && <div className="ai-tool-notice" role="status">{feedbackMessage}</div>}
            {results.map((result) => {
              const confidence = normalizedConfidence(result.confidence);
              return (
                <div className="visual-hunt-result-row" key={result.id}>
                <button className="visual-hunt-result" type="button" onClick={() => props.onOpenResult(result)}>
                  <span className="visual-hunt-result-media">
                    {result.imageUrl ? <img src={result.imageUrl} alt="" loading="lazy" /> : <ImageIcon size={22} aria-hidden="true" />}
                  </span>
                  <span className="visual-hunt-result-copy">
                    <span className="visual-hunt-result-topline">
                      <small className={result.type.toLowerCase()}>{result.type === "LOST" ? "Đồ bị mất" : "Đồ nhặt được"}</small>
                      <strong>{Math.round(confidence * 100)}%</strong>
                    </span>
                    <b>{result.title}</b>
                    {result.location && <small>{result.location}</small>}
                    {(result.reasons?.length ?? 0) > 0 && <span>{result.reasons?.slice(0, 2).join(" · ")}</span>}
                  </span>
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
                {source && props.onCandidateDecision && (
                  <div className="visual-hunt-result-actions">
                    <button className="ai-tool-button secondary compact" type="button" onClick={() => void recordDecision(result, "CANDIDATE")}>Đánh dấu candidate</button>
                    <button className="ai-tool-button secondary compact" type="button" onClick={() => void recordDecision(result, "NOT_RELEVANT")}>Không liên quan</button>
                  </div>
                )}
                </div>
              );
            })}

            {mode === "RESULTS" && results.length === 0 && (
              <div className="ai-tool-empty visual-hunt-no-results">
                <ScanSearch size={28} aria-hidden="true" />
                <strong>Chưa có kết quả đủ tương đồng</strong>
                <span>Thử chụp gần hơn, đổi góc hoặc dùng ảnh có logo và dấu hiệu riêng.</span>
              </div>
            )}

            {mode !== "RESULTS" && results.length === 0 && (
              <div className="visual-hunt-result-guide">
                <span><Camera size={17} aria-hidden="true" /><strong>1. Ghi hình rõ vật phẩm</strong></span>
                <span><ScanSearch size={17} aria-hidden="true" /><strong>2. Xác nhận rồi phân tích</strong></span>
                <span><ShieldCheck size={17} aria-hidden="true" /><strong>3. Tự kiểm tra từng kết quả</strong></span>
              </div>
            )}
          </div>

          <p className="visual-hunt-advisory">
            <ShieldCheck size={16} aria-hidden="true" />
            {props.advisoryText ?? "Điểm tương đồng không xác nhận quyền sở hữu. Hãy mở bài đăng và hoàn thành quy trình claim với bằng chứng riêng tư."}
          </p>
        </aside>
      </div>
    </section>
  );
}

import { Camera, CameraOff, ScanSearch, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, type FinderQuickScanSession } from "../../services/api";

export function FinderQuickScanPanel(props: {
  enabled: boolean;
  categories: Array<{ id: string; name: string }>;
  areas: Array<{ id: string; name: string }>;
  onDraftReady: (file: File, session: FinderQuickScanSession) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [cameraError, setCameraError] = useState<string | null>(null);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  }

  useEffect(() => () => stopCamera(), []);

  async function openCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      setCameraError("Không thể mở camera. Hãy cấp quyền hoặc chọn ảnh từ thiết bị.");
      stopCamera();
    }
  }

  function captureFrame() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      setFile(new File([blob], `finder-scan-${Date.now()}.jpg`, { type: "image/jpeg" }));
      setIdempotencyKey(crypto.randomUUID());
      setSelectedCandidate(null);
      scanMutation.reset();
      stopCamera();
    }, "image/jpeg", 0.9);
  }

  const scanMutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("Chọn hoặc chụp một ảnh trước khi quét.");
      return api.finderQuickScan(file, {
        idempotencyKey,
        categoryId: categoryId || undefined,
        areaId: areaId || undefined,
        maxResults: 5,
        source: file.name.startsWith("finder-scan-") ? "CAMERA" : "IMAGE"
      });
    }
  });
  const draftMutation = useMutation({
    mutationFn: () => api.createFinderScanDraft(scanMutation.data!.id, selectedCandidate),
    onSuccess: (session) => file && props.onDraftReady(file, session)
  });

  if (!props.enabled) return null;
  return (
    <section className="finder-scan-panel" aria-labelledby="finder-scan-title">
      <div className="finder-scan-heading">
        <div><ScanSearch size={20} /><strong id="finder-scan-title">Finder Quick Scan</strong></div>
        {file && <button className="icon-button" type="button" title="Bỏ ảnh quét" onClick={() => { setFile(null); scanMutation.reset(); setSelectedCandidate(null); }}><X size={17} /></button>}
      </div>

      <div className="finder-scan-actions">
        <button className="secondary-button" type="button" onClick={cameraOpen ? stopCamera : () => void openCamera()}>
          {cameraOpen ? <CameraOff size={16} /> : <Camera size={16} />} {cameraOpen ? "Đóng camera" : "Mở camera"}
        </button>
        <label className="secondary-button file-button"><Upload size={16} /> Chọn ảnh
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setIdempotencyKey(crypto.randomUUID());
            setSelectedCandidate(null);
            scanMutation.reset();
          }} />
        </label>
        <select aria-label="Lọc danh mục khi quét" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="">Mọi danh mục</option>
          {props.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <select aria-label="Lọc khu vực khi quét" value={areaId} onChange={(event) => setAreaId(event.target.value)}>
          <option value="">Mọi khu vực</option>
          {props.areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
        </select>
      </div>

      {cameraOpen && <div className="finder-camera"><video ref={videoRef} autoPlay muted playsInline /><button className="primary-button" type="button" onClick={captureFrame}><Camera size={17} /> Chụp ảnh</button></div>}
      {cameraError && <div className="notice error">{cameraError}</div>}
      {file && <div className="finder-selected-file"><span>{file.name}</span><button className="primary-button" disabled={scanMutation.isPending} type="button" onClick={() => scanMutation.mutate()}>{scanMutation.isPending ? "Đang quét..." : "Tìm bài LOST tương tự"}</button></div>}
      {scanMutation.error instanceof Error && <div className="notice error">{scanMutation.error.message}</div>}

      {scanMutation.data && (
        <div className="finder-scan-result">
          <div className="finder-provider-row"><span className={`status-badge ${scanMutation.data.providerStatus === "AVAILABLE" ? "active" : "paused"}`}>{scanMutation.data.providerStatus === "AVAILABLE" ? "Vision hoạt động" : "Fallback"}</span><small>{scanMutation.data.weakCandidateCount} ứng viên yếu được giữ nội bộ</small></div>
          {scanMutation.data.candidates.length > 0 ? (
            <div className="finder-candidate-list">
              {scanMutation.data.candidates.map((candidate) => (
                <label key={candidate.postId} className={selectedCandidate === candidate.postId ? "selected" : ""}>
                  <input type="radio" name="finderCandidate" checked={selectedCandidate === candidate.postId} onChange={() => setSelectedCandidate(candidate.postId)} />
                  <span><strong>{candidate.title}</strong><small>{candidate.category?.name ?? "Chưa phân loại"} · {candidate.area?.name ?? "Chưa rõ khu vực"}</small></span>
                  <b>{candidate.score === null ? "Lọc gần đúng" : `${Math.round(candidate.score * 100)}%`}</b>
                </label>
              ))}
            </div>
          ) : <div className="empty-inline">Chưa có bài LOST đủ tương đồng. Hệ thống đã chuẩn bị FOUND draft.</div>}
          <button className="primary-button" disabled={draftMutation.isPending} type="button" onClick={() => draftMutation.mutate()}>
            {draftMutation.isPending ? "Đang chuẩn bị..." : selectedCandidate ? "Dùng draft và liên kết ứng viên" : "Dùng FOUND draft"}
          </button>
          {draftMutation.error instanceof Error && <div className="notice error">{draftMutation.error.message}</div>}
        </div>
      )}
    </section>
  );
}

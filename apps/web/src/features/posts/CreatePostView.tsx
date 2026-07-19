import { Upload, ShieldCheck } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, type Category, type PostMatchSuggestion, type PostType } from "../../services/api";
import type { ImageUploadRules } from "../../app/types";
import {
  acceptAttribute,
  emptyToNull,
  fileKey,
  toDateTimeIso,
  validateImageFiles
} from "../../app/helpers";
import "./create-post.css";

export function CreatePostView(props: {
  signedIn: boolean;
  categories: Category[];
  areas: Array<{ id: string; name: string }>;
  handoverPoints: Array<{ id: string; name: string }>;
  imageRules: ImageUploadRules;
  onCreated: (postId: string, suggestions: PostMatchSuggestion[]) => Promise<void>;
}) {
  const [type, setType] = useState<PostType>("LOST");
  const [selectedParentCategoryId, setSelectedParentCategoryId] = useState("");
  const [selectedChildCategoryId, setSelectedChildCategoryId] = useState("");
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [itemFiles, setItemFiles] = useState<File[]>([]);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [itemImagePreviews, setItemImagePreviews] = useState<string[]>([]);
  const [evidenceImagePreviews, setEvidenceImagePreviews] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const buildingsQuery = useQuery({
    queryKey: ["create-buildings", selectedAreaId],
    queryFn: () => api.buildings(selectedAreaId),
    enabled: Boolean(selectedAreaId)
  });
  const rootCategories = useMemo(() => props.categories.filter((category) => !category.parentId), [props.categories]);
  const childCategories = useMemo(
    () => props.categories.filter((category) => category.parentId === selectedParentCategoryId),
    [props.categories, selectedParentCategoryId]
  );
  const selectedCategoryId = childCategories.length > 0 ? selectedChildCategoryId : selectedParentCategoryId;
  const totalSelectedFiles = itemFiles.length + evidenceFiles.length;

  useEffect(() => {
    const urls = itemFiles.map((file) => URL.createObjectURL(file));
    setItemImagePreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [itemFiles]);

  useEffect(() => {
    const urls = evidenceFiles.map((file) => URL.createObjectURL(file));
    setEvidenceImagePreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [evidenceFiles]);

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await api.createPost({
        type,
        title: String(formData.get("title")),
        description: String(formData.get("description")),
        categoryId: selectedCategoryId,
        areaId: emptyToNull(formData.get("areaId")),
        buildingId: emptyToNull(formData.get("buildingId")),
        roomText: emptyToNull(formData.get("roomText")),
        customLocation: emptyToNull(formData.get("customLocation")),
        contactInfo: String(formData.get("contactInfo")),
        lostFoundAt: toDateTimeIso(formData.get("lostFoundAt")),
        handoverPointId: type === "FOUND" ? emptyToNull(formData.get("handoverPointId")) : null,
        secretVerification: type === "LOST" ? String(formData.get("secretVerification")) : null
      });

      let matchSuggestions = result.matchSuggestions ?? [];
      let suggestedCategory: { id: string; name: string; score: number } | null = null;
      if (totalSelectedFiles > 0) {
        const mediaResult = await api.uploadPostImages(result.post.id, itemFiles, evidenceFiles);
        if (mediaResult.matchSuggestions.length > 0) {
          matchSuggestions = mediaResult.matchSuggestions;
        }
        suggestedCategory = mediaResult.ai
          .flatMap((analysis) => analysis.suggestedCategories)
          .sort((left, right) => right.score - left.score)[0] ?? null;
      }

      return { post: result.post, matchSuggestions, suggestedCategory };
    },
    onSuccess: async (result) => {
      if (
        result.suggestedCategory &&
        result.suggestedCategory.id !== selectedCategoryId &&
        window.confirm(
          `Google Vision gợi ý danh mục "${result.suggestedCategory.name}" (${Math.round(result.suggestedCategory.score * 100)}%). Bạn có muốn áp dụng không?`
        )
      ) {
        await api.updatePost(result.post.id, { categoryId: result.suggestedCategory.id });
      }
      setMessage(
        result.matchSuggestions.length > 0
        ? `Đã tạo bài và tìm thấy ${result.matchSuggestions.length} gợi ý phù hợp.`
          : "Đã tạo bài. Hệ thống đã kiểm tra matching tự động."
      );
      await props.onCreated(result.post.id, result.matchSuggestions);
    }
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (!selectedParentCategoryId) {
      setMessage("Vui lòng chọn nhóm danh mục.");
      return;
    }
    if (childCategories.length > 0 && !selectedChildCategoryId) {
      setMessage("Vui lòng chọn danh mục cụ thể.");
      return;
    }
    const validationErrors = validateImageFiles([...itemFiles, ...evidenceFiles], props.imageRules, props.imageRules.maxImages);
    if (validationErrors.length > 0) {
      setMessage(validationErrors[0]);
      return;
    }
    createMutation.mutate(new FormData(event.currentTarget));
  }

  function selectFiles(fileList: FileList | null, kind: "ITEM" | "EVIDENCE") {
    const incomingFiles = Array.from(fileList ?? []);
    const targetFiles = kind === "ITEM" ? itemFiles : evidenceFiles;
    const otherFiles = kind === "ITEM" ? evidenceFiles : itemFiles;
    const nextFiles = [...targetFiles];
    const existingKeys = new Set(nextFiles.map(fileKey));

    for (const file of incomingFiles) {
      const key = fileKey(file);
      if (!existingKeys.has(key)) {
        nextFiles.push(file);
        existingKeys.add(key);
      }
    }

    const validationErrors = validateImageFiles([...otherFiles, ...nextFiles], props.imageRules, props.imageRules.maxImages);
    if (validationErrors.length > 0) {
      setMessage(validationErrors[0]);
      return;
    }

    if (kind === "ITEM") {
      setItemFiles(nextFiles);
    } else {
      setEvidenceFiles(nextFiles);
    }
    setMessage(`${otherFiles.length + nextFiles.length} ảnh đã sẵn sàng upload.`);
  }

  function removeFile(index: number, kind: "ITEM" | "EVIDENCE") {
    const setter = kind === "ITEM" ? setItemFiles : setEvidenceFiles;
    setter((current) => {
      const nextFiles = current.filter((_, fileIndex) => fileIndex !== index);
      const otherCount = kind === "ITEM" ? evidenceFiles.length : itemFiles.length;
      const total = otherCount + nextFiles.length;
    setMessage(total > 0 ? `${total} ảnh đã sẵn sàng upload.` : null);
      return nextFiles;
    });
  }

  if (!props.signedIn) {
    return (
      <div className="empty-state">
        <ShieldCheck size={30} />
          <strong>Cần đăng nhập để đăng tin</strong>
          <span>Bấm đăng nhập hoặc đăng ký ở thanh trên để tiếp tục.</span>
      </div>
    );
  }

  return (
    <div className="create-page">
      <section className="create-intro">
            <span className="eyebrow">Tạo bài trong cộng đồng</span>
            <h2>Báo cáo Mất / Nhặt được đồ</h2>
            <p>Điền đủ thông tin để cộng đồng và hệ thống matching có thể giúp bạn tìm lại hoặc trả đồ đúng người.</p>
      </section>

      <form className="form-panel create-report-form" onSubmit={submit}>
      <div className="segmented">
        <button className={type === "LOST" ? "active" : ""} type="button" onClick={() => setType("LOST")}>
            Tôi làm mất
        </button>
        <button className={type === "FOUND" ? "active" : ""} type="button" onClick={() => setType("FOUND")}>
            Tôi nhặt được
        </button>
      </div>
      <div className="form-section-heading">
        <span>01</span>
        <div>
          <strong>Thông tin cơ bản</strong>
          <small>Tiêu đề rõ, mô tả cụ thể và chọn đúng danh mục.</small>
        </div>
      </div>
      <label>
            Tiêu đề
            <input name="title" required minLength={3} placeholder="Ví dụ: Tai nghe Sony màu đen" />
      </label>
      <label>
            Mô tả
            <textarea name="description" required minLength={10} rows={4} placeholder="Mô tả đặc điểm, nơi thấy/mất..." />
      </label>
      <label>
            Thông tin liên hệ
            <input name="contactInfo" required minLength={3} placeholder="SĐT, email hoặc Zalo để người liên quan liên hệ" />
      </label>
      <div className="form-grid">
        <label>
            Nhóm danh mục
          <select
            required
            value={selectedParentCategoryId}
            onChange={(event) => {
              setSelectedParentCategoryId(event.target.value);
              setSelectedChildCategoryId("");
            }}
          >
            <option value="">Chọn nhóm đồ</option>
            {rootCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
            Danh mục cụ thể
          <select
            required={childCategories.length > 0}
            disabled={!selectedParentCategoryId || childCategories.length === 0}
            value={selectedChildCategoryId}
            onChange={(event) => setSelectedChildCategoryId(event.target.value)}
          >
            <option value="">
              {!selectedParentCategoryId
                ? "Chọn nhóm trước"
                : childCategories.length === 0
                  ? "Nhóm này chưa có danh mục cụ thể"
                  : "Chọn danh mục cụ thể"}
            </option>
            {childCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-section-heading">
        <span>02</span>
        <div>
          <strong>Vị trí & thời gian</strong>
          <small>Chọn nơi gần đúng, rồi bổ sung vị trí tự nhập nếu cần.</small>
        </div>
      </div>
      <div className="form-grid">
        <label>
            Khu vực
          <select
            name="areaId"
            value={selectedAreaId}
            onChange={(event) => {
              setSelectedAreaId(event.target.value);
              setSelectedBuildingId("");
            }}
          >
            <option value="">Chọn khu vực</option>
            {props.areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Địa điểm cụ thể
          <select
            name="buildingId"
            disabled={!selectedAreaId}
            value={selectedBuildingId}
            onChange={(event) => setSelectedBuildingId(event.target.value)}
          >
            <option value="">{selectedAreaId ? "Chọn địa điểm cụ thể" : "Chọn khu vực trước"}</option>
            {(buildingsQuery.data?.buildings ?? []).map((building) => (
              <option key={building.id} value={building.id}>
                {building.name}
              </option>
            ))}
          </select>
          {selectedAreaId && buildingsQuery.data?.buildings.length === 0 && <small className="form-hint">Khu vực này chưa có địa điểm cụ thể active.</small>}
        </label>
        <label>
          Phòng
          <input name="roomText" placeholder="VD: A101, LAB 302, hành lang tầng 2..." />
        </label>
      </div>
      <div className="form-grid">
        <label>
          Vị trí tự nhập
          <input name="customLocation" placeholder="VD: Alpha tầng 2, thư viện..." />
        </label>
        <label>
          Thời gian
          <input name="lostFoundAt" type="datetime-local" />
        </label>
      </div>
      <div className="form-section-heading">
        <span>03</span>
        <div>
          <strong>Xác minh & hình ảnh</strong>
          <small>Ảnh và câu xác minh giúp giảm nhận nhầm đồ.</small>
        </div>
      </div>
      {type === "FOUND" ? (
        <label>
          Điểm bàn giao nếu đã gửi về trường
          <select name="handoverPointId">
            <option value="">Tôi đang giữ đồ / chưa gửi về điểm bàn giao</option>
            {props.handoverPoints.map((point) => (
              <option key={point.id} value={point.id}>
                {point.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label>
          Mô tả chi tiết về dấu hiệu chứng minh quyền sở hữu
          <textarea
            name="secretVerification"
            required
            minLength={3}
            rows={3}
            placeholder="Nêu dấu hiệu riêng, mã/serial, vết trầy, vật bên trong, nội dung hóa đơn hoặc chi tiết chỉ chủ sở hữu biết"
          />
        </label>
      )}
      <div className="upload-guide-panel">
        <strong>Gợi ý chụp ảnh đồ vật</strong>
        <div className="upload-guide-grid">
          <span>Chụp mặt trước, mặt sau và hai cạnh để hệ thống nhìn vật theo nhiều góc.</span>
          <span>Thêm ảnh cận cảnh logo, vết trầy, serial, phụ kiện hoặc dấu hiệu riêng.</span>
          <span>Nếu có thể, xoay quanh vật như chụp 3D: trên, dưới, trái, phải. Không bắt buộc.</span>
        </div>
      </div>
      <div className="upload-split-grid">
        <label className="upload-dropzone">
          <Upload size={22} />
          <strong>Ảnh đồ vật</strong>
          <span>Ưu tiên ảnh rõ vật, nền sáng, không che khuất. Ảnh đầu tiên sẽ làm ảnh bìa.</span>
          <input
            type="file"
            accept={acceptAttribute(props.imageRules)}
            multiple
            onChange={(event) => {
              selectFiles(event.target.files, "ITEM");
              event.currentTarget.value = "";
            }}
          />
        </label>
        <label className="upload-dropzone evidence-dropzone">
          <Upload size={22} />
          <strong>Bằng chứng kèm theo</strong>
          <span>Không bắt buộc. Có thể thêm bill, hóa đơn, ảnh từng sử dụng, khung hình camera hoặc giấy tờ liên quan.</span>
          <input
            type="file"
            accept={acceptAttribute(props.imageRules)}
            multiple
            onChange={(event) => {
              selectFiles(event.target.files, "EVIDENCE");
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>
      {itemImagePreviews.length > 0 && (
        <>
          <strong className="preview-section-title">Ảnh đồ vật</strong>
          <div className="preview-grid">
            {itemImagePreviews.map((previewUrl, index) => (
              <div className="preview-item" key={previewUrl}>
                <img src={previewUrl} alt={`Ảnh đồ vật ${index + 1}`} />
                <button type="button" onClick={() => removeFile(index, "ITEM")} aria-label={`Xóa ảnh đồ vật ${index + 1}`}>
                  Xóa
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      {evidenceImagePreviews.length > 0 && (
        <>
          <strong className="preview-section-title">Ảnh bằng chứng</strong>
          <div className="preview-grid">
            {evidenceImagePreviews.map((previewUrl, index) => (
              <div className="preview-item" key={previewUrl}>
                <img src={previewUrl} alt={`Ảnh bằng chứng ${index + 1}`} />
                <button type="button" onClick={() => removeFile(index, "EVIDENCE")} aria-label={`Xóa ảnh bằng chứng ${index + 1}`}>
                  Xóa
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      <small className="form-hint">
          Tối đa {props.imageRules.maxImages} ảnh cho cả ảnh đồ vật và bằng chứng, mỗi ảnh {props.imageRules.maxImageSizeMb}MB, định dạng{" "}
        {props.imageRules.allowedFormats.join(", ").toUpperCase()}.
      </small>
      {createMutation.error instanceof Error && <div className="notice error">{createMutation.error.message}</div>}
      {message && <div className="notice success">{message}</div>}
      <button className="primary-button wide" disabled={createMutation.isPending} type="submit">
        <Upload size={18} />
        {createMutation.isPending ? "Đang đăng..." : "Đăng tin"}
      </button>
      </form>
    </div>
  );
}

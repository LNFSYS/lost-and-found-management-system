import { Archive, FileLock2, ImagePlus, Pencil } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type PrivateProofType } from "../../services/api";

const proofLabels: Record<PrivateProofType, string> = {
  PURCHASE_RECEIPT: "Hóa đơn mua hàng",
  PRE_LOSS_IMAGE: "Ảnh trước khi mất",
  SERIAL_SUFFIX: "Bốn số cuối serial",
  UNIQUE_MARK: "Dấu hiệu riêng",
  ACCESSORY: "Phụ kiện đi kèm",
  OWNERSHIP_NOTE: "Ghi chú sở hữu"
};

export function ProofVaultPanel() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const proofsQuery = useQuery({ queryKey: ["private-proof-vault"], queryFn: () => api.privateProofs(), retry: false });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["private-proof-vault"] });
  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.createPrivateProof({
      itemName: data.get("itemName"),
      proofType: data.get("proofType"),
      privateDescription: data.get("privateDescription") || null,
      secretValue: data.get("secretValue") || null
    }),
    onSuccess: async () => { setMessage("Đã lưu bằng chứng riêng tư."); await refresh(); }
  });
  const archiveMutation = useMutation({ mutationFn: api.archivePrivateProof, onSuccess: refresh });
  const updateMutation = useMutation({
    mutationFn: ({ id, itemName, privateDescription }: { id: string; itemName: string; privateDescription: string | null }) =>
      api.updatePrivateProof(id, { itemName, privateDescription }),
    onSuccess: refresh
  });
  const mediaMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => api.uploadPrivateProofMedia(id, file),
    onSuccess: refresh
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createMutation.mutate(new FormData(event.currentTarget));
    event.currentTarget.reset();
  }

  return (
    <section className="proof-vault-panel" aria-labelledby="proof-vault-title">
      <div className="panel-heading compact">
        <div><span className="eyebrow">Private Proof Vault</span><h2 id="proof-vault-title">Kho bằng chứng của tôi</h2></div>
        <FileLock2 size={20} />
      </div>
      <p className="proof-vault-note">Chỉ bạn và người có quyền review claim đã attach mới xem được. Secret được hash, ảnh luôn đi qua proxy xác thực.</p>
      <form className="proof-vault-form" onSubmit={submit}>
        <input name="itemName" required minLength={2} placeholder="Tên vật phẩm" />
        <select name="proofType" defaultValue="PRE_LOSS_IMAGE">
          {Object.entries(proofLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input name="secretValue" placeholder="Serial/mã bí mật (không bắt buộc)" />
        <textarea name="privateDescription" rows={2} placeholder="Mô tả riêng chỉ dùng khi review" />
        <button className="primary-button" disabled={createMutation.isPending} type="submit">Lưu bằng chứng</button>
      </form>
      {proofsQuery.isLoading && <div className="loading-state">Đang tải Kho bằng chứng...</div>}
      {proofsQuery.error instanceof Error && <div className="notice error">{proofsQuery.error.message}</div>}
      <div className="proof-vault-list">
        {(proofsQuery.data?.proofs ?? []).map((proof) => (
          <article className={proof.status === "ARCHIVED" ? "archived" : ""} key={proof.id}>
            <div><strong>{proof.itemName}</strong><span>{proofLabels[proof.proofType]}</span></div>
            <small>{proof.privateDescription || "Không có mô tả"}{proof.maskedValue ? ` · ${proof.maskedValue}` : ""}</small>
            <div className="proof-vault-actions">
              {proof.status !== "ARCHIVED" && <>
                <button className="icon-button" title="Sửa" type="button" onClick={() => {
                  const itemName = window.prompt("Tên vật phẩm", proof.itemName)?.trim();
                  if (itemName) updateMutation.mutate({ id: proof.id, itemName, privateDescription: proof.privateDescription });
                }}><Pencil size={16} /></button>
                <label className="icon-button" title="Tải ảnh riêng tư"><ImagePlus size={16} /><input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) mediaMutation.mutate({ id: proof.id, file });
                }} /></label>
                <button className="icon-button" title="Lưu trữ" type="button" onClick={() => archiveMutation.mutate(proof.id)}><Archive size={16} /></button>
              </>}
              {proof.hasMedia && <span className="proof-media-badge">Có ảnh riêng tư</span>}
            </div>
          </article>
        ))}
      </div>
      {!proofsQuery.isLoading && (proofsQuery.data?.proofs.length ?? 0) === 0 && <div className="empty-state compact">Chưa có bằng chứng. Hãy lưu ảnh cũ, hóa đơn hoặc dấu hiệu chỉ bạn biết.</div>}
      {message && <div className="notice success">{message}</div>}
      {(createMutation.error || archiveMutation.error || updateMutation.error || mediaMutation.error) instanceof Error && (
        <div className="notice error">{String((createMutation.error || archiveMutation.error || updateMutation.error || mediaMutation.error) instanceof Error ? (createMutation.error || archiveMutation.error || updateMutation.error || mediaMutation.error)?.message : "Không thể cập nhật Vault")}</div>
      )}
    </section>
  );
}

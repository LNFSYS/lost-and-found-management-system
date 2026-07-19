import { Upload, MessageCircle } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { io } from "socket.io-client";
import {
  api,
  getApiOrigin,
  getStoredAccessToken,
  hasAccessToken
} from "../../services/api";
import type { ChatMessageView } from "../../app/types";
import { ClaimChatImage } from "../../app/MediaWidgets";
import "./claim-chat.css";

export function ClaimVerificationBadge(props: { claimId: string }) {
  const verificationQuery = useQuery({
    queryKey: ["claim-verification", props.claimId],
    queryFn: () => api.claimVerification(props.claimId),
    enabled: hasAccessToken(),
    retry: false
  });
  const verification = verificationQuery.data?.verification;

  if (verificationQuery.isLoading) {
    return <small>Đang tính xác thực...</small>;
  }
  if (!verification) {
    return null;
  }

  return (
    <small className={`claim-verification-badge level-${verification.level.toLowerCase()}`}>
      M&#7913;c h&#7895; tr&#7907; x&#225;c th&#7921;c: {verification.ownershipConfidence}% - match {verification.breakdown.matchScore}% - b&#7857;ng ch&#7913;ng {verification.breakdown.evidenceScore}%
    </small>
  );
}

export function ClaimChatBox(props: { claimId: string; currentUserId?: string }) {
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [status, setStatus] = useState<"idle" | "connecting" | "ready" | "error">("idle");
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const unreadCount = messages.filter((message) => message.sender.id !== props.currentUserId && !message.isRead).length;

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) {
      setStatus("error");
      return;
    }
    setStatus("connecting");
    const socket = io(getApiOrigin(), {
      auth: { token },
      transports: ["websocket", "polling"]
    });
    socketRef.current = socket;
    socket.on("chat:message", (message: ChatMessageView) => {
      if (message.sender.id !== props.currentUserId) {
        socket.emit("chat:seen", { claimId: props.claimId });
      }
      setMessages((current) => {
        if (current.some((item) => item.id === message.id)) {
          return current;
        }
        return [...current, message];
      });
    });
    socket.on("chat:seen", (payload: { readerId?: string }) => {
      if (!payload.readerId) {
        return;
      }
      setMessages((current) =>
        current.map((message) => (message.sender.id !== payload.readerId ? { ...message, isRead: true } : message))
      );
    });
    socket.emit("claim:join", { claimId: props.claimId }, (payload: { ok: boolean; messages?: ChatMessageView[] }) => {
      if (payload.ok) {
        setMessages(payload.messages ?? []);
        setStatus("ready");
        socket.emit("chat:seen", { claimId: props.claimId });
      } else {
        setStatus("error");
      }
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [props.claimId, props.currentUserId]);

  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const content = String(data.get("content") ?? "").trim();
    if (!content || !socketRef.current) {
      return;
    }
    socketRef.current.emit("chat:message", { claimId: props.claimId, content }, (payload: { ok: boolean }) => {
      if (payload.ok) {
        form.reset();
      } else {
        setStatus("error");
      }
    });
  }

  async function sendImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem("image") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file || !socketRef.current) {
      return;
    }
    setImageError(null);
    setImageUploading(true);
    try {
      const uploaded = await api.uploadClaimChatImage(props.claimId, file);
      socketRef.current.emit(
        "chat:image",
        { claimId: props.claimId, mediaPublicId: uploaded.image.publicId },
        (payload: { ok: boolean }) => {
          if (payload.ok) {
            form.reset();
          } else {
            setStatus("error");
          }
        }
      );
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Không thể tải ảnh chat.");
    } finally {
      setImageUploading(false);
    }
  }

  return (
    <section className="claim-chat-box">
      <div className="claim-chat-heading">
        <MessageCircle size={15} />
        {unreadCount > 0 && <span className="chat-unread-badge">{unreadCount} mới</span>}
        <strong>Trao đổi về yêu cầu nhận đồ</strong>
        <small>{status === "ready" ? "Realtime" : status === "connecting" ? "Đang nối" : "Chưa sẵn sàng"}</small>
      </div>
      <div className="claim-chat-messages">
        {messages.map((message) => (
          <div className="claim-chat-message" key={message.id}>
            <strong>{message.sender.fullName ?? "Người dùng"}</strong>
            {message.messageType === "IMAGE" ? (
              <ClaimChatImage claimId={props.claimId} mediaPublicId={message.mediaPublicId} />
            ) : (
              <span>{message.content}</span>
            )}
          </div>
        ))}
        {messages.length === 0 && <small>Chưa có tin nhắn.</small>}
      </div>
      <form className="claim-chat-form" onSubmit={send}>
        <input name="content" placeholder="Nhập tin nhắn" disabled={status !== "ready"} />
        <button className="secondary-button" disabled={status !== "ready"} type="submit">
          Gửi
        </button>
      </form>
      <form className="claim-chat-form image" onSubmit={sendImage}>
        <input name="image" type="file" accept="image/*" disabled={status !== "ready" || imageUploading} />
        <button className="secondary-button" disabled={status !== "ready" || imageUploading} type="submit">
          <Upload size={15} /> Ảnh
        </button>
      </form>
      {imageError && <div className="notice error">{imageError}</div>}
    </section>
  );
}

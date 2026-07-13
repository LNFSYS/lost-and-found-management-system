import { useEffect, useState } from "react";
import { api } from "../services/api";

export function AppointmentProofImage(props: { appointmentId: string; alt: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let revokedUrl: string | null = null;
    let mounted = true;
    setImageUrl(null);
    setError(null);
    api
      .appointmentProofImage(props.appointmentId)
      .then((url) => {
        revokedUrl = url;
        if (mounted) {
          setImageUrl(url);
        } else {
          URL.revokeObjectURL(url);
        }
      })
      .catch((fetchError: unknown) => {
        if (mounted) {
          setError(fetchError instanceof Error ? fetchError.message : "Không tải được chứng từ bàn giao");
        }
      });
    return () => {
      mounted = false;
      if (revokedUrl) {
        URL.revokeObjectURL(revokedUrl);
      }
    };
  }, [props.appointmentId]);

  if (error) {
    return <small className="notice error">{error}</small>;
  }
  if (!imageUrl) {
    return <small>Đang tải chứng từ...</small>;
  }
  return <img src={imageUrl} alt={props.alt} />;
}

export function ClaimEvidenceImage(props: { claimId: string; evidenceId: string; alt: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let revokedUrl: string | null = null;
    let mounted = true;
    setImageUrl(null);
    setError(null);
    api
      .claimEvidenceImage(props.claimId, props.evidenceId)
      .then((url) => {
        revokedUrl = url;
        if (mounted) {
          setImageUrl(url);
        } else {
          URL.revokeObjectURL(url);
        }
      })
      .catch((fetchError: unknown) => {
        if (mounted) {
          setError(fetchError instanceof Error ? fetchError.message : "Không tải được ảnh bằng chứng");
        }
      });
    return () => {
      mounted = false;
      if (revokedUrl) {
        URL.revokeObjectURL(revokedUrl);
      }
    };
  }, [props.claimId, props.evidenceId]);

  if (error) {
    return <small className="notice error">{error}</small>;
  }
  if (!imageUrl) {
    return <small>Đang tải ảnh bằng chứng...</small>;
  }
  return <img src={imageUrl} alt={props.alt} />;
}

export function ClaimChatImage(props: { claimId: string; mediaPublicId: string | null }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!props.mediaPublicId) {
      setImageUrl(null);
      setError("Ảnh chat cũ không có mã phương tiện hợp lệ.");
      return;
    }

    let revokedUrl: string | null = null;
    let mounted = true;
    setImageUrl(null);
    setError(null);
    api
      .claimChatImage(props.claimId, props.mediaPublicId)
      .then((url) => {
        revokedUrl = url;
        if (mounted) {
          setImageUrl(url);
        } else {
          URL.revokeObjectURL(url);
        }
      })
      .catch((fetchError: unknown) => {
        if (mounted) {
          setError(fetchError instanceof Error ? fetchError.message : "Không thể tải ảnh chat.");
        }
      });
    return () => {
      mounted = false;
      if (revokedUrl) {
        URL.revokeObjectURL(revokedUrl);
      }
    };
  }, [props.claimId, props.mediaPublicId]);

  if (error) {
    return <small className="notice error">{error}</small>;
  }
  if (!imageUrl) {
    return <small>Đang tải ảnh...</small>;
  }
  return <img src={imageUrl} alt="" />;
}

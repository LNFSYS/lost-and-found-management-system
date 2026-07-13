import { Upload, UserCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, type PublicUser } from "../../services/api";
import { acceptAttribute, fieldLabel, validateImageFiles } from "../../app/helpers";
import type { AudienceRole, ImageUploadRules } from "../../app/types";

export function ProfileForm({ user, onUpdated }: { user: PublicUser; onUpdated: () => void }) {
  const mutation = useMutation({
    mutationFn: (formData: FormData) =>
      api.updateProfile({
        fullName: formData.get("fullName"),
        studentCode: formData.get("studentCode"),
        phoneNumber: formData.get("phoneNumber")
      }),
    onSuccess: onUpdated
  });

  return (
    <form className="inline-profile-form" onSubmit={(event) => {
      event.preventDefault();
      mutation.mutate(new FormData(event.currentTarget));
    }}>
      <label>
        Họ tên
        <input name="fullName" required minLength={2} defaultValue={user.fullName} />
      </label>
      <label>
        Mã sinh viên
        <input name="studentCode" defaultValue={user.studentCode ?? ""} />
      </label>
      <label>
        Số điện thoại
        <input name="phoneNumber" defaultValue={user.phoneNumber ?? ""} />
      </label>
      <button className="secondary-button" disabled={mutation.isPending} type="submit">
        Lưu hồ sơ
      </button>
    </form>
  );
}

export function LoginForm(props: {
  pending: boolean;
  error: unknown;
  onForgotPassword: () => void;
  onRegister: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <form className="form-panel compact-form" onSubmit={(event) => {
      event.preventDefault();
      props.onSubmit(new FormData(event.currentTarget));
    }}>
      <label>
        Email
        <input name="email" type="email" required />
      </label>
      <label>
        Mật khẩu
        <input name="password" type="password" required minLength={8} />
      </label>
      <button className="secondary-button google-login-button" type="button" onClick={() => {
        window.location.href = api.googleLoginUrl();
      }}>
        <UserCircle size={16} /> Đăng nhập với Google
      </button>
      <button className="text-link auth-forgot-link" type="button" onClick={props.onForgotPassword}>
        Quên mật khẩu?
      </button>
      {props.error instanceof Error && <div className="notice error">{props.error.message}</div>}
      <div className="auth-submit-row">
        <button className="primary-button" disabled={props.pending} type="submit">
          {props.pending ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
        <span>
          Bạn chưa có tài khoản?{" "}
          <button className="text-link" type="button" onClick={props.onRegister}>
            Đăng ký
          </button>
        </span>
      </div>
    </form>
  );
}

export function RegisterForm(props: {
  defaultEmail: string;
  pending: boolean;
  error: unknown;
  requestPending: boolean;
  requestError: unknown;
  onRequestOtp: (email: string) => void;
  onLogin: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  const [email, setEmail] = useState(props.defaultEmail);

  return (
    <form className="form-panel compact-form" onSubmit={(event) => {
      event.preventDefault();
      props.onSubmit(new FormData(event.currentTarget));
    }}>
      <label>
        Họ tên
        <input name="fullName" required minLength={2} />
      </label>
      <label>
        Loại tài khoản
        <select name="accountType" defaultValue={"STUDENT" satisfies AudienceRole}>
          <option value="STUDENT">Sinh viên</option>
          <option value="LECTURER">Giảng viên</option>
        </select>
      </label>
      <label>
        Email
        <div className="otp-request-row">
          <input
            name="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button
            className="secondary-button"
            disabled={!email || props.requestPending}
            type="button"
            onClick={() => props.onRequestOtp(email)}
          >
            {props.requestPending ? "Đang gửi..." : "Nhận mã"}
          </button>
        </div>
      </label>
      <label>
        Mã sinh viên / giảng viên
        <input name="studentCode" />
      </label>
      <label>
        Mật khẩu
        <input name="password" type="password" required minLength={8} />
      </label>
      <label>
        OTP
        <input name="otp" required inputMode="numeric" minLength={6} maxLength={6} pattern="[0-9]{6}" />
      </label>
      {props.requestError instanceof Error && <div className="notice error">{props.requestError.message}</div>}
      {props.error instanceof Error && <div className="notice error">{props.error.message}</div>}
      <div className="auth-submit-row">
        <button className="primary-button" disabled={props.pending} type="submit">
          {props.pending ? "Đang tạo..." : "Tạo tài khoản"}
        </button>
        <span>
          Đã có tài khoản?{" "}
          <button className="text-link" type="button" onClick={props.onLogin}>
            Đăng nhập
          </button>
        </span>
      </div>
    </form>
  );
}

export function AuthForm(props: {
  fields: string[];
  submitLabel: string;
  pending: boolean;
  error: unknown;
  defaults?: Record<string, string>;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <form className="form-panel compact-form" onSubmit={(event) => {
      event.preventDefault();
      props.onSubmit(new FormData(event.currentTarget));
    }}>
      {props.fields.map((field) => (
        <label key={field}>
          {fieldLabel(field)}
          <input
            name={field}
            defaultValue={props.defaults?.[field] ?? ""}
            type={field.toLowerCase().includes("password") ? "password" : field === "email" ? "email" : "text"}
            required={field !== "studentCode"}
            minLength={field.toLowerCase().includes("password") ? 8 : undefined}
          />
        </label>
      ))}
      {props.error instanceof Error && <div className="notice error">{props.error.message}</div>}
      <button className="primary-button wide" disabled={props.pending} type="submit">
        {props.pending ? "Đang xử lý..." : props.submitLabel}
      </button>
    </form>
  );
}

export function AvatarForm({ imageRules, onUploaded }: { imageRules: ImageUploadRules; onUploaded: () => void }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (file: File) => api.uploadAvatar(file),
    onSuccess: onUploaded
  });

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function selectAvatar(file: File | undefined) {
    setError(null);
    if (!file) {
      return;
    }

    const validationErrors = validateImageFiles([file], imageRules, 1);
    if (validationErrors.length > 0) {
      setError(validationErrors[0]);
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(file));
    mutation.mutate(file);
  }

  return (
    <div className="avatar-upload-panel">
      {previewUrl && <img src={previewUrl} alt="Ảnh đại diện xem trước" />}
      <label className="upload-strip">
        <Upload size={18} />
        {mutation.isPending ? "Đang tải ảnh đại diện..." : "Tải ảnh đại diện"}
        <input type="file" accept={acceptAttribute(imageRules)} onChange={(event) => selectAvatar(event.target.files?.[0])} />
      </label>
      {error && <div className="notice error">{error}</div>}
      {mutation.error instanceof Error && <div className="notice error">{mutation.error.message}</div>}
    </div>
  );
}

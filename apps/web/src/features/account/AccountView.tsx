import { Bell, CheckCircle2, LogOut, ShieldCheck, UserCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, saveTokens, type PublicUser } from "../../services/api";
import { formatDate } from "../../app/helpers";
import type { AuthEntryMode, AuthMode, ImageUploadRules } from "../../app/types";
import { AuthForm, AvatarForm, LoginForm, ProfileForm, RegisterForm } from "./AccountForms";
import "./account.css";

export function AccountView(props: {
  user?: PublicUser;
  entryMode: AuthEntryMode;
  entryKey: number;
  oauthError: string | null;
  imageRules: ImageUploadRules;
  onAuthChange: () => void;
  onSignedIn: () => void;
  onSignedOut: () => void;
}) {
  const [mode, setMode] = useState<AuthMode>(props.entryMode);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!props.user) {
      setAuthMessage(null);
      setMode(props.entryMode);
    }
  }, [props.entryKey, props.entryMode, props.user]);

  const activityQuery = useQuery({ queryKey: ["activity"], queryFn: () => api.activity(), enabled: Boolean(props.user) });
  const reputationQuery = useQuery({ queryKey: ["reputation"], queryFn: () => api.reputation(), enabled: Boolean(props.user) });
  const loginMutation = useMutation({
    mutationFn: (formData: FormData) => api.login({ email: formData.get("email"), password: formData.get("password") }),
    onSuccess: (result) => {
      saveTokens(result.tokens);
      props.onSignedIn();
    }
  });
  const registerMutation = useMutation({
    mutationFn: (formData: FormData) => {
      const email = String(formData.get("email"));
      setRegisteredEmail(email);
      return api.register({
        email,
        password: formData.get("password"),
        fullName: formData.get("fullName"),
        accountType: formData.get("accountType"),
        studentCode: formData.get("studentCode"),
        otp: formData.get("otp")
      });
    },
    onSuccess: (result) => {
      saveTokens(result.tokens);
      props.onSignedIn();
    }
  });
  const requestRegistrationOtpMutation = useMutation({
    mutationFn: (email: string) => {
      setRegisteredEmail(email);
      return api.requestRegistrationOtp({ email });
    },
    onSuccess: () => {
      setAuthMessage("Đã gửi mã OTP đăng ký. Vui lòng kiểm tra email hoặc liên hệ quản trị viên nếu chưa nhận được mã.");
    }
  });
  const forgotMutation = useMutation({
    mutationFn: (formData: FormData) => {
      const email = String(formData.get("email"));
      setRegisteredEmail(email);
      return api.forgotPassword({ email });
    },
    onSuccess: () => {
      setAuthMessage("Nếu email đã kích hoạt, mã đặt lại mật khẩu đã được gửi.");
      setMode("reset");
    }
  });
  const resetMutation = useMutation({
    mutationFn: (formData: FormData) =>
      api.resetPassword({
        email: formData.get("email"),
        otp: formData.get("otp"),
        newPassword: formData.get("newPassword")
      }),
    onSuccess: () => {
      setAuthMessage("Đã đặt lại mật khẩu. Bạn có thể đăng nhập bằng mật khẩu mới.");
      setMode("login");
    }
  });
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.logout();
    },
    onSettled: props.onSignedOut
  });

  if (props.user) {
    return (
      <section className="account-panel">
        <div className="profile-card">
          {props.user.avatarUrl ? <img src={props.user.avatarUrl} alt="" /> : <UserCircle size={56} />}
          <div>
            <h2>{props.user.fullName}</h2>
            <p>{props.user.email}</p>
          </div>
        </div>
        <ProfileForm user={props.user} onUpdated={props.onAuthChange} />
        <AvatarForm imageRules={props.imageRules} onUploaded={props.onAuthChange} />
        <div className="account-grid">
          <article className="mini-panel">
            <Bell size={18} />
            <strong>{reputationQuery.data?.reputation.level ?? "NEW"}</strong>
            <span>{reputationQuery.data?.reputation.totalPoints ?? 0} điểm uy tín</span>
          </article>
          <article className="mini-panel">
            <CheckCircle2 size={18} />
            <strong>{activityQuery.data?.activity.length ?? 0}</strong>
            <span>hoạt động gần đây</span>
          </article>
        </div>
        <div className="activity-list">
          {(activityQuery.data?.activity ?? []).slice(0, 5).map((activity) => (
            <span key={activity.id}>
              {activity.action} · {formatDate(activity.createdAt)}
            </span>
          ))}
        </div>
        <div className="reputation-history">
          <div className="panel-heading compact">
            <div>
              <span className="eyebrow">Uy tín</span>
              <h2>Lịch sử điểm</h2>
            </div>
            <ShieldCheck size={18} />
          </div>
          {(reputationQuery.data?.reputation.recentLogs ?? []).map((entry) => (
            <div className="reputation-history-row" key={entry.id}>
              <strong className={entry.delta >= 0 ? "positive" : "negative"}>
                {entry.delta >= 0 ? "+" : ""}{entry.delta}
              </strong>
              <span>{entry.reason}</span>
              <small>{formatDate(entry.createdAt)}</small>
            </div>
          ))}
          {(reputationQuery.data?.reputation.recentLogs ?? []).length === 0 && <small>Chưa có lịch sử điểm.</small>}
        </div>
        <button className="secondary-button" type="button" onClick={() => logoutMutation.mutate()}>
          <LogOut size={18} /> Đăng xuất
        </button>
      </section>
    );
  }

  return (
    <section className={`account-panel auth-card ${mode === "register" ? "register-mode" : ""}`}>
      <div className="auth-card-heading">
        <span className="eyebrow">FPTU Lost & Found</span>
        <h2>{mode === "register" ? "Tạo tài khoản" : mode === "forgot" ? "Lấy lại mật khẩu" : mode === "reset" ? "Đặt mật khẩu mới" : "Đăng nhập"}</h2>
        <p>
          {mode === "register"
            ? "Xác thực email bằng OTP trước khi tham gia cộng đồng Lost & Found."
            : mode === "forgot" || mode === "reset"
              ? "Nhập email và mã OTP để đặt lại mật khẩu tài khoản của bạn."
              : "Đăng nhập để đăng tin, gửi yêu cầu nhận đồ và theo dõi bài viết của bạn."}
        </p>
      </div>

      {(mode === "forgot" || mode === "reset") && (
        <button className="text-link auth-back-link" type="button" onClick={() => {
          setAuthMessage(null);
          setMode("login");
        }}>
          Quay lại đăng nhập
        </button>
      )}

      {props.oauthError && <div className="notice error">{props.oauthError}</div>}
      {authMessage && <div className="notice success">{authMessage}</div>}
      {mode === "login" && (
        <LoginForm
          pending={loginMutation.isPending}
          error={loginMutation.error}
          onForgotPassword={() => {
            setAuthMessage(null);
            setMode("forgot");
          }}
          onRegister={() => {
            setAuthMessage(null);
            setMode("register");
          }}
          onSubmit={(data) => loginMutation.mutate(data)}
        />
      )}
      {mode === "register" && (
        <RegisterForm
          defaultEmail={registeredEmail}
          pending={registerMutation.isPending}
          error={registerMutation.error}
          requestPending={requestRegistrationOtpMutation.isPending}
          requestError={requestRegistrationOtpMutation.error}
          onRequestOtp={(email) => requestRegistrationOtpMutation.mutate(email)}
          onLogin={() => {
            setAuthMessage(null);
            setMode("login");
          }}
          onSubmit={(data) => registerMutation.mutate(data)}
        />
      )}
      {mode === "forgot" && (
        <AuthForm
          fields={["email"]}
          submitLabel="Gửi mã đặt lại mật khẩu"
          pending={forgotMutation.isPending}
          error={forgotMutation.error}
          defaults={{ email: registeredEmail }}
          onSubmit={(data) => forgotMutation.mutate(data)}
        />
      )}
      {mode === "reset" && (
        <AuthForm
          fields={["email", "otp", "newPassword"]}
          submitLabel="Đặt lại mật khẩu"
          pending={resetMutation.isPending}
          error={resetMutation.error}
          defaults={{ email: registeredEmail }}
          onSubmit={(data) => resetMutation.mutate(data)}
        />
      )}
    </section>
  );
}

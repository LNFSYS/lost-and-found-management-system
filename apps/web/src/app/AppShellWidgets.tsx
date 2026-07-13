import { Bell, LayoutDashboard, LogOut, UserCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { NotificationItem, PublicUser } from "../services/api";
import { avatarInitials, formatDate } from "./helpers";

export function RealtimeNotificationToast(props: {
  notification: NotificationItem;
  onClose: () => void;
  onOpen: () => void;
}) {
  return (
    <aside className="realtime-toast" role="status" aria-live="polite">
      <Bell size={18} />
      <div>
        <strong>{props.notification.title}</strong>
        {props.notification.body && <span>{props.notification.body}</span>}
      </div>
      {props.notification.entityType === "POST" && props.notification.entityId && (
        <button className="text-button" type="button" onClick={props.onOpen}>
          Mở
        </button>
      )}
        <button className="icon-button" type="button" onClick={props.onClose} aria-label="Đóng thông báo">
        <X size={16} />
      </button>
    </aside>
  );
}

export function UserMenu(props: {
  user: PublicUser;
  notifications: NotificationItem[];
  unreadCount: number;
  canUseAdmin: boolean;
  isAdmin: boolean;
  adminMode: boolean;
  logoutPending: boolean;
  markAllPending: boolean;
  onProfile: () => void;
  onToggleAdmin: () => void;
  onNotification: (notification: NotificationItem) => void;
  onMarkAllRead: () => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const unreadLabel = props.unreadCount > 9 ? "9+" : String(props.unreadCount);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div className="avatar-menu">
      <button
        className="avatar-menu-trigger"
        type="button"
        onClick={() => setOpen((value) => !value)}
          aria-label="Mở menu tài khoản"
        aria-expanded={open}
      >
        {props.user.avatarUrl ? <img src={props.user.avatarUrl} alt="" /> : <span>{avatarInitials(props.user.fullName)}</span>}
        {props.unreadCount > 0 && <em>{unreadLabel}</em>}
      </button>

      {open && (
        <div className="avatar-dropdown">
          <div className="avatar-dropdown-profile">
            {props.user.avatarUrl ? <img src={props.user.avatarUrl} alt="" /> : <span>{avatarInitials(props.user.fullName)}</span>}
            <div>
              <strong>{props.user.fullName}</strong>
              <small>{props.user.email}</small>
            </div>
          </div>

          <button type="button" onClick={() => {
            setOpen(false);
            props.onProfile();
          }}>
            <UserCircle size={17} /> Hồ sơ
          </button>

          {props.canUseAdmin && (
            <button type="button" onClick={() => {
              setOpen(false);
              props.onToggleAdmin();
            }}>
            <LayoutDashboard size={17} /> {props.adminMode ? "Về cộng đồng" : props.isAdmin ? "Mở bảng quản trị" : "Mở bảng nhân viên"}
            </button>
          )}

          <div className="notification-menu">
            <div className="notification-menu-heading">
          <span><Bell size={16} /> Thông báo</span>
              {props.unreadCount > 0 && (
                <button disabled={props.markAllPending} type="button" onClick={props.onMarkAllRead}>
                  Đọc hết
                </button>
              )}
            </div>
            <div className="notification-list">
              {props.notifications.slice(0, 5).map((notification) => (
                <button
                  className={notification.isRead ? "" : "unread"}
                  key={notification.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    props.onNotification(notification);
                  }}
                >
                  <strong>{notification.title}</strong>
                  {notification.body && <span>{notification.body}</span>}
                  <small>{formatDate(notification.createdAt)}</small>
                </button>
              ))}
        {props.notifications.length === 0 && <small className="notification-empty">Chưa có thông báo.</small>}
            </div>
          </div>

          <button className="logout-menu-button" disabled={props.logoutPending} type="button" onClick={() => {
            setOpen(false);
            props.onLogout();
          }}>
        <LogOut size={17} /> {props.logoutPending ? "Đang đăng xuất..." : "Đăng xuất"}
          </button>
        </div>
      )}
    </div>
  );
}

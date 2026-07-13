import type { ReactNode } from "react";
import type { AdminNamedResource, AdminRole } from "../services/api";

export function DashboardRankList(props: { items: Array<[string, number]> }) {
  const max = Math.max(1, ...props.items.map((item) => item[1]));

  return (
    <div className="dashboard-rank-list">
      {props.items.map(([label, total], index) => (
        <div key={`${label}-${index}`}>
          <span>{label}</span>
          <strong>{total}</strong>
          <i style={{ width: `${Math.max(8, (total / max) * 100)}%` }} />
        </div>
      ))}
      {props.items.length === 0 && <small>Chưa có dữ liệu.</small>}
    </div>
  );
}

export function AdminActiveBadge({ active }: { active: boolean }) {
  return <span className={`admin-active-badge ${active ? "active" : "inactive"}`}>{active ? "Đang hoạt động" : "Đã ẩn"}</span>;
}

export function primaryAdminRole(roles: string[]): AdminRole {
  if (roles.includes("ADMIN")) {
    return "ADMIN";
  }
  if (roles.includes("STAFF")) {
    return "STAFF";
  }
  if (roles.includes("LECTURER")) {
    return "LECTURER";
  }
  if (roles.includes("STUDENT")) {
    return "STUDENT";
  }
  return "USER";
}

export function resourceLabel(resource: AdminNamedResource) {
  return `${resource.name}${resource.isActive ? "" : " (ẩn)"}`;
}

export function AdminListPanel(props: { title: string; icon: ReactNode; items: string[] }) {
  return (
    <article className="admin-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">CRUD</span>
          <h2>{props.title}</h2>
        </div>
        {props.icon}
      </div>
      <div className="admin-chip-list">
        {props.items.slice(0, 8).map((item, index) => (
          <span key={`${item}-${index}`}>{item}</span>
        ))}
        {props.items.length === 0 && <small>Chưa có dữ liệu.</small>}
      </div>
    </article>
  );
}

export function Metric({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <article className="metric-card">
      <span>{icon}</span>
      <strong>{value}</strong>
      <small>{label}</small>
    </article>
  );
}

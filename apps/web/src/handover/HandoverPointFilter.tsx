import { Filter, Search } from "lucide-react";
import { handoverAreaOptions } from "./handover-data";
import type { HandoverFilters } from "./types";

export function HandoverPointFilter(props: {
  filters: HandoverFilters;
  total: number;
  onChange: (filters: HandoverFilters) => void;
}) {
  return (
    <section className="handover-filter-bar" aria-label="Bộ lọc điểm bàn giao">
      <label className="search-box">
        <Search size={18} />
        <input
          value={props.filters.query}
          onChange={(event) => props.onChange({ ...props.filters, query: event.target.value })}
          placeholder="Tìm điểm bàn giao..."
        />
      </label>
      <label>
        <span><Filter size={15} /> Khu vực</span>
        <select
          value={props.filters.area}
          onChange={(event) => props.onChange({ ...props.filters, area: event.target.value as HandoverFilters["area"] })}
        >
          {handoverAreaOptions.map((area) => (
            <option key={area} value={area}>{area === "all" ? "Tất cả khu vực" : area}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Trạng thái</span>
        <select
          value={props.filters.status}
          onChange={(event) => props.onChange({ ...props.filters, status: event.target.value as HandoverFilters["status"] })}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="closed">Tạm đóng</option>
        </select>
      </label>
      <div className="handover-filter-count">
        <strong>{props.total}</strong>
        <span>điểm phù hợp</span>
      </div>
    </section>
  );
}

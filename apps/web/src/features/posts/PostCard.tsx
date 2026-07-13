import { Calendar, CheckCircle2, MapPin, Search, UserCircle } from "lucide-react";
import { locationText } from "../../app/helpers";
import type { BoardPost } from "../../services/api";

export function PostCard({ post, onSelect }: { post: BoardPost; onSelect: (id: string) => void }) {
  const displayDate = post.lostFoundAt
    ? (() => {
        const date = new Date(post.lostFoundAt);
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
      })()
    : "Chưa rõ thời gian";

  return (
    <article className="feed-post-card" onClick={() => onSelect(post.id)}>
      <div className="card-media">
        {post.coverImageUrl ? (
          <img src={post.coverImageUrl} alt={post.title} loading="lazy" />
        ) : (
          <div className="card-placeholder-image">
            {post.type === "FOUND" ? <CheckCircle2 size={32} /> : <Search size={32} />}
          </div>
        )}
        <span className={`card-type-badge ${post.type.toLowerCase()}`}>
          {post.type === "FOUND" ? "Đồ nhặt được" : "Đồ bị mất"}
        </span>
      </div>

      <div className="card-body">
        <h3 className="card-title" title={post.title}>{post.title}</h3>
        <div className="card-metadata-grid">
          <div className="card-metadata-left">
            <div className="card-info-item" title={locationText(post)}>
              <MapPin size={12} />
              <span>{locationText(post)}</span>
            </div>
            <div className="card-info-item">
              <Calendar size={12} />
              <span>{displayDate}</span>
            </div>
          </div>
          <div className="card-metadata-right">
            {post.category?.name ? (
              <span className="card-category-tag" title={post.category.name}>{post.category.name}</span>
            ) : (
              <span className="card-category-tag empty">-</span>
            )}
            <div className="card-info-item card-owner" title={post.owner.fullName}>
              <UserCircle size={12} />
              <span>{post.owner.fullName}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

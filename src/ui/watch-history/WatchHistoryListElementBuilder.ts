import type { WatchHistoryEntry } from "../../database/types/watch-history.js";
import { VideoRepository, type ID } from "../../database/index.js";
import type { IElementBuilder } from "../../renderer/types.js";
import { buildSearchUrl, buildUserSpaceUrl, buildVideoUrl } from "../../utils/url-builder.js";
import { createDraggableTagPill } from "../shared/index.js";
import { formatDate, formatDateTime, formatDuration, formatProgress } from "./helpers.js";

const DEFAULT_COVER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180'%3E%3Crect width='320' height='180' fill='%23d8dee9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='18' fill='%235b6475'%3ENo Cover%3C/text%3E%3C/svg%3E";

export class WatchHistoryListElementBuilder implements IElementBuilder<WatchHistoryEntry, HTMLElement> {
  private readonly videoRepository = new VideoRepository();
  private readonly coverUrlCache = new Map<ID, string>();
  private readonly loadingCovers = new Set<ID>();

  async buildElement(item: WatchHistoryEntry): Promise<HTMLElement> {
    const card = document.createElement("article");
    card.className = "history-card";
    card.dataset.videoId = String(item.videoId);
    card.addEventListener("click", () => {
      window.open(buildVideoUrl(item.bv), "_blank", "noopener,noreferrer");
    });

    const coverWrapper = document.createElement("div");
    coverWrapper.className = "history-cover";

    const coverLink = document.createElement("a");
    coverLink.href = buildVideoUrl(item.bv);
    coverLink.target = "_blank";
    coverLink.rel = "noopener noreferrer";
    coverLink.addEventListener("click", (event) => event.stopPropagation());

    const cover = document.createElement("img");
    cover.alt = item.title;
    cover.loading = "lazy";
    cover.src = DEFAULT_COVER;
    await this.applyCoverSource(cover, item);
    coverLink.appendChild(cover);
    coverWrapper.appendChild(coverLink);
    card.appendChild(coverWrapper);

    const info = document.createElement("div");
    info.className = "history-info";

    const title = document.createElement("a");
    title.className = "history-title";
    title.href = buildVideoUrl(item.bv);
    title.target = "_blank";
    title.rel = "noopener noreferrer";
    title.textContent = item.title;
    title.addEventListener("click", (event) => event.stopPropagation());
    info.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "history-meta";

    const creatorLink = document.createElement("a");
    creatorLink.href = buildUserSpaceUrl(item.creatorId);
    creatorLink.target = "_blank";
    creatorLink.rel = "noopener noreferrer";
    creatorLink.textContent = `@${item.creatorName}`;
    creatorLink.addEventListener("click", (event) => event.stopPropagation());
    meta.appendChild(creatorLink);

    const publishTime = document.createElement("span");
    publishTime.textContent = `发布 ${formatDate(item.publishTime)}`;
    meta.appendChild(publishTime);

    const duration = document.createElement("span");
    duration.textContent = `片长 ${formatDuration(item.duration)}`;
    meta.appendChild(duration);

    const bv = document.createElement("span");
    bv.textContent = item.bv;
    meta.appendChild(bv);
    info.appendChild(meta);

    if (item.description) {
      const desc = document.createElement("div");
      desc.className = "history-description";
      desc.textContent = item.description;
      info.appendChild(desc);
    }

    const stats = document.createElement("div");
    stats.className = "history-stats";
    stats.appendChild(this.createMetric("首看", formatDateTime(item.watchTime)));
    stats.appendChild(this.createMetric("最近", formatDateTime(item.endTime)));
    stats.appendChild(this.createMetric("已看", formatDuration(item.watchDuration)));
    stats.appendChild(this.createMetric("进度", formatProgress(item.progress)));
    stats.appendChild(this.createMetric("状态", item.isComplete ? "已看完" : "未看完"));
    stats.appendChild(this.createMetric("重看", item.progress > 1 || item.watchDuration > item.videoDuration ? "是" : "否"));
    info.appendChild(stats);

    const progressSection = document.createElement("div");
    progressSection.className = "history-progress";
    const progressLabel = document.createElement("div");
    progressLabel.className = "history-progress-label";
    progressLabel.textContent = `${formatProgress(item.progress)} · ${formatDuration(item.watchDuration)} / ${formatDuration(item.videoDuration)}`;
    progressSection.appendChild(progressLabel);

    const progressTrack = document.createElement("div");
    progressTrack.className = "history-progress-track";
    const progressFill = document.createElement("div");
    progressFill.className = "history-progress-fill";
    progressFill.style.width = `${Math.max(4, Math.min(item.progress * 100, 100))}%`;
    progressTrack.appendChild(progressFill);
    progressSection.appendChild(progressTrack);
    info.appendChild(progressSection);

    const tags = document.createElement("div");
    tags.className = "history-tags";
    item.tags.forEach((tagId, index) => {
      const tagName = item.tagNames[index] ?? `Tag ${tagId}`;
      const pill = createDraggableTagPill({
        text: tagName,
        tagName,
        className: "history-tag",
        createDragContext: () => ({
          tagId,
          tagName,
          dropped: false,
          isFilterTag: false
        }),
        onClick: (event) => {
          event.stopPropagation();
          window.open(buildSearchUrl(tagName), "_blank", "noopener,noreferrer");
        }
      });
      tags.appendChild(pill);
    });
    info.appendChild(tags);

    if (item.isInvalid) {
      const invalidBadge = document.createElement("span");
      invalidBadge.className = "history-invalid-badge";
      invalidBadge.textContent = "已失效";
      info.appendChild(invalidBadge);
    }

    card.appendChild(info);
    return card;
  }

  async buildElements(items: WatchHistoryEntry[]): Promise<HTMLElement[]> {
    return Promise.all(items.map((item) => this.buildElement(item)));
  }

  private async applyCoverSource(image: HTMLImageElement, item: WatchHistoryEntry): Promise<void> {
    try {
      const cachedUrl = this.coverUrlCache.get(item.videoId);
      if (cachedUrl) {
        image.src = cachedUrl;
        return;
      }

      if (item.picture) {
        const coverBlob = await this.videoRepository.getVideoPicture(item.videoId);
        if (coverBlob) {
          const objectUrl = URL.createObjectURL(coverBlob);
          this.coverUrlCache.set(item.videoId, objectUrl);
          image.src = objectUrl;
          return;
        }
      }
    } catch (error) {
      console.error(`[WatchHistoryListElementBuilder] 加载本地封面失败 (videoId: ${item.videoId}):`, error);
    }

    this.cacheRemoteCoverIfNeeded(item);
    this.applyRemoteCoverFallback(image, item.coverUrl);
  }

  private cacheRemoteCoverIfNeeded(item: WatchHistoryEntry): void {
    if (!item.coverUrl || item.picture || this.loadingCovers.has(item.videoId)) {
      return;
    }

    this.loadingCovers.add(item.videoId);
    void this.downloadAndPersistCover(item);
  }

  private async downloadAndPersistCover(item: WatchHistoryEntry): Promise<void> {
    try {
      const response = await fetch(item.coverUrl!);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      await this.videoRepository.updateVideoPicture(item.videoId, blob, item.coverUrl);

      const objectUrl = URL.createObjectURL(blob);
      this.coverUrlCache.set(item.videoId, objectUrl);
    } catch (error) {
      console.error(`[WatchHistoryListElementBuilder] 远程封面缓存失败 (videoId: ${item.videoId}):`, error);
    } finally {
      this.loadingCovers.delete(item.videoId);
    }
  }

  private applyRemoteCoverFallback(image: HTMLImageElement, coverUrl?: string): void {
    if (!coverUrl) {
      image.src = DEFAULT_COVER;
      return;
    }

    image.onerror = () => {
      image.onerror = null;
      image.src = DEFAULT_COVER;
    };
    image.src = coverUrl;
  }

  private createMetric(label: string, value: string): HTMLElement {
    const metric = document.createElement("div");
    metric.className = "history-metric";
    metric.title = `${label} ${value}`;

    const metricLabel = document.createElement("span");
    metricLabel.className = "history-metric-label";
    metricLabel.textContent = label;

    const metricValue = document.createElement("strong");
    metricValue.className = "history-metric-value";
    metricValue.textContent = value;

    metric.appendChild(metricLabel);
    metric.appendChild(metricValue);
    return metric;
  }
}

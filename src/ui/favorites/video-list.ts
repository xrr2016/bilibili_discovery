import type { FavoritesState, AggregatedVideo } from "./types.js";
import { formatDuration, colorFromTag } from "./helpers.js";
import { DBUtils, STORE_NAMES } from "../../database/indexeddb/index.js";
import type { Tag } from "../../database/types/semantic.js";
import { bindCoverImageWithLazyLoad } from "./cover-cache.js";

import { LRUCache } from "./cache.js";
import { createLink } from "./dom.js";
import { BiliURL } from "./bili-url.js";

type RefreshFn = () => void;

const tagCache = new LRUCache<string, string>(100);

async function getTagName(tagId: string): Promise<string> {
  const cached = tagCache.get(tagId);
  if (cached) return cached;

  try {
    const tag = await DBUtils.get<Tag>(STORE_NAMES.TAGS, tagId);
    const name = tag?.name || tagId;
    tagCache.set(tagId, name);
    return name;
  } catch {
    return tagId;
  }
}

export async function createVideoCard(
  video: AggregatedVideo
): Promise<HTMLElement> {
  const card = document.createElement("div");
  card.className = "video-card";

  // 封面
  const coverLink = createLink(BiliURL.video(video.videoId));
  const cover = document.createElement("div");
  cover.className = "video-cover";

  const img = document.createElement("img");
  img.alt = video.title;
  bindCoverImageWithLazyLoad(img, video);

  cover.appendChild(img);
  coverLink.appendChild(cover);
  card.appendChild(coverLink);

  // 信息
  const info = document.createElement("div");
  info.className = "video-info";

  // 标题
  const titleLink = createLink(
    BiliURL.video(video.videoId),
    video.title,
    "video-title"
  );
  info.appendChild(titleLink);

  // 描述
  const desc = document.createElement("div");
  desc.className = "video-description";
  desc.textContent =
    video.description.substring(0, 100) +
    (video.description.length > 100 ? "..." : "");
  info.appendChild(desc);

  // 元信息
  const meta = document.createElement("div");
  meta.className = "video-meta";

  meta.appendChild(document.createTextNode("创作者: "));
  meta.appendChild(
    createLink(
      BiliURL.user(video.creatorId),
      video.creatorName || video.creatorId
    )
  );

  meta.appendChild(
    document.createTextNode(
      ` | 时长: ${formatDuration(video.duration)}`
    )
  );

  info.appendChild(meta);

  // 标签
  if (video.tags?.length) {
    const tags = document.createElement("div");
    tags.className = "video-tags";

    const tagElements = await Promise.all(
      video.tags.map(async (tagId) => {
        const tagName = await getTagName(tagId);

        const tagLink = createLink(
          BiliURL.search(tagName),
          tagName,
          "video-tag tag-pill"
        );

        tagLink.style.backgroundColor = colorFromTag(tagName);
        tagLink.draggable = true;

        tagLink.addEventListener("dragstart", (e) => {
          e.dataTransfer?.setData("application/x-bili-tag", tagId);
        });

        return tagLink;
      })
    );

    tagElements.forEach((t) => tags.appendChild(t));
    info.appendChild(tags);
  }

  card.appendChild(info);
  return card;
}

export async function renderVideos(
  state: FavoritesState,
  elements: Record<string, HTMLElement | null>
): Promise<void> {
  if (elements.videoList) {
    elements.videoList.innerHTML = "";
  }

  const start = state.currentPage * state.pageSize;
  const end = start + state.pageSize;
  const pageVideos = state.filteredVideos.slice(start, end);

  if (pageVideos.length === 0) {
    elements.empty && (elements.empty.style.display = "block");
    elements.pagination && (elements.pagination.style.display = "none");
    return;
  }

  elements.empty && (elements.empty.style.display = "none");

  await Promise.all(
    pageVideos.map(async (video) => {
      const card = await createVideoCard(video);
      elements.videoList?.appendChild(card);
    })
  );
}

export async function changePage(
  state: FavoritesState,
  delta: number,
  refresh: RefreshFn
): Promise<void> {
  const totalPages = Math.ceil(
    state.filteredVideos.length / state.pageSize
  );

  const newPage = state.currentPage + delta;
  if (newPage < 0 || newPage >= totalPages) return;

  state.currentPage = newPage;
  await refresh();
}
import type { WatchHistoryEntry } from "../../database/types/watch-history.js";
import type { BookQueryOptions } from "../../database/query-server/book/types.js";
import { RenderList } from "../../renderer/RenderList.js";
import type { RenderListConfig } from "../../renderer/types.js";
import { bindPaginationElements } from "../shared/index.js";
import type { WatchHistoryListConfig } from "./watch-history-list-types.js";

export class WatchHistoryListRender extends RenderList<WatchHistoryEntry, HTMLElement> {
  private readonly onPageChange?: (page: number) => void;

  constructor(config: WatchHistoryListConfig) {
    const renderListConfig: RenderListConfig<WatchHistoryEntry, HTMLElement> = {
      renderBook: config.renderBook,
      container: config.container,
      autoRender: config.autoRender ?? false
    };

    super(renderListConfig);
    this.onPageChange = config.onPageChange;
  }

  async initialize(page = 0): Promise<void> {
    this.autoRender = true;
    await this.renderPage(page);
  }

  async renderPage(page: number, options?: BookQueryOptions): Promise<void> {
    await super.renderPage(page, options);
    this.onPageChange?.(this.getCurrentPage());
  }

  protected renderElements(elements: HTMLElement[]): void {
    const fragment = document.createDocumentFragment();
    elements.forEach((element) => {
      fragment.appendChild(element);
    });
    this.container.replaceChildren(fragment);
    this.renderPagination();
  }

  protected async deleteElement(_element: HTMLElement, _data: WatchHistoryEntry): Promise<void> {
    return;
  }

  private renderPagination(): void {
    const pagination = document.getElementById("pagination");
    const prev = document.getElementById("prevPage") as HTMLButtonElement | null;
    const next = document.getElementById("nextPage") as HTMLButtonElement | null;
    const info = document.getElementById("pageInfo");
    if (!pagination || !prev || !next || !info) {
      return;
    }

    const totalPages = this.getTotalPages();
    pagination.style.display = totalPages > 1 ? "flex" : "none";

    bindPaginationElements({
      prevButton: prev,
      nextButton: next,
      infoElement: info,
      state: {
        currentPage: this.getCurrentPage(),
        totalPages
      },
      actions: {
        onPrev: async () => this.previousPage(),
        onNext: async () => this.nextPage()
      }
    });
  }
}

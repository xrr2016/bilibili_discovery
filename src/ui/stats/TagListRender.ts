import type { Tag } from "../../database/types/semantic.js";
import type { RenderListConfig } from "../../renderer/types.js";
import { RenderList } from "../../renderer/RenderList.js";
import { RenderBook } from "../../renderer/RenderBook.js";

interface TagListRenderConfig {
  container: HTMLElement;
  renderBook: RenderBook<Tag, HTMLElement>;
  autoRender?: boolean;
}

export class TagListRender extends RenderList<Tag, HTMLElement> {
  private renderBookInstance: RenderBook<Tag, HTMLElement>;

  constructor(config: TagListRenderConfig) {
    const renderListConfig: RenderListConfig<Tag, HTMLElement> = {
      renderBook: config.renderBook,
      container: config.container,
      autoRender: config.autoRender ?? false
    };

    super(renderListConfig);
    this.renderBookInstance = config.renderBook;
  }

  async initialize(page: number = 0): Promise<void> {
    this.autoRender = true;
    this.currentPage = page;
    await this.renderPage(page);
  }

  setTargetPage(page: number): void {
    this.currentPage = Math.max(0, page);
  }

  protected renderElements(elements: HTMLElement[]): void {
    this.container.innerHTML = "";
    elements.forEach(element => {
      this.container.appendChild(element);
    });

    this.renderPagination();
  }

  protected async deleteElement(element: HTMLElement, data: Tag): Promise<void> {
    console.log("[TagListRender] deleteElement 被调用，但标签列表不需要删除功能", {
      element,
      data
    });
  }

  private renderPagination(): void {
    const paginationContainer = document.getElementById("tag-pagination");
    if (!paginationContainer) {
      return;
    }

    paginationContainer.innerHTML = "";

    const currentPage = this.getCurrentPage();
    const totalPages = this.getTotalPages();

    const prevBtn = document.createElement("button");
    prevBtn.className = "pagination-btn";
    prevBtn.textContent = "上一页";
    prevBtn.disabled = currentPage === 0;
    prevBtn.addEventListener("click", async () => {
      await this.previousPage();
    });
    paginationContainer.appendChild(prevBtn);

    const pageInfo = document.createElement("span");
    pageInfo.className = "pagination-info";
    pageInfo.textContent = `${currentPage + 1} / ${totalPages || 1}`;
    paginationContainer.appendChild(pageInfo);

    const nextBtn = document.createElement("button");
    nextBtn.className = "pagination-btn";
    nextBtn.textContent = "下一页";
    nextBtn.disabled = currentPage >= totalPages - 1;
    nextBtn.addEventListener("click", async () => {
      await this.nextPage();
    });
    paginationContainer.appendChild(nextBtn);
  }

  destroy(): void {
    this.renderBookInstance.destroy();
    super.destroy();
  }
}

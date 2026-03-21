export function colorFromTag(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i += 1) {
    hash = (hash * 31 + tag.charCodeAt(i)) % 360;
  }
  const hue = Math.abs(hash) % 360;
  const sat = 70 + (Math.abs(hash * 7) % 21);
  const light = 85 + (Math.abs(hash * 13) % 11);
  return `hsl(${hue} ${sat}% ${light}%)`;
}

let dragGhost: HTMLElement | null = null;
let globalDragOverHandler: ((event: DragEvent) => void) | null = null;

export function createTagPill(tag: string): HTMLSpanElement {
  const pill = document.createElement("span");
  pill.className = "tag-pill";
  pill.textContent = tag;
  pill.style.backgroundColor = colorFromTag(tag);
  pill.addEventListener("click", () => {
    const keyword = encodeURIComponent(tag);
    window.open(`https://search.bilibili.com/all?keyword=${keyword}`, "_blank", "noreferrer");
  });
  return pill;
}

export function createDragGhost(e: DragEvent, tag: string): void {
  removeDragGhost();
  const ghost = document.createElement("div");
  ghost.className = "drag-ghost";
  ghost.textContent = tag;
  ghost.style.backgroundColor = colorFromTag(tag);
  ghost.style.padding = "8px 16px";
  ghost.style.borderRadius = "999px";
  ghost.style.color = "#1f2430";
  ghost.style.fontSize = "13px";
  ghost.style.fontWeight = "600";
  document.body.appendChild(ghost);
  dragGhost = ghost;

  if (e.dataTransfer) {
    e.dataTransfer.setDragImage(ghost, 0, 0);
  }

  if (!globalDragOverHandler) {
    globalDragOverHandler = (event: DragEvent) => {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }
    };
    document.addEventListener("dragover", globalDragOverHandler);
  }

  const moveGhost = (moveEvent: MouseEvent) => {
    if (dragGhost) {
      dragGhost.style.left = `${moveEvent.clientX}px`;
      dragGhost.style.top = `${moveEvent.clientY}px`;
    }
  };

  document.addEventListener("mousemove", moveGhost);
  document.addEventListener(
    "mouseup",
    () => {
      document.removeEventListener("mousemove", moveGhost);
      setTimeout(() => removeDragGhost(), 100);
    },
    { once: true }
  );
}

export function removeDragGhost(): void {
  if (dragGhost) {
    dragGhost.remove();
    dragGhost = null;
  }
  if (globalDragOverHandler) {
    document.removeEventListener("dragover", globalDragOverHandler);
    globalDragOverHandler = null;
  }
}

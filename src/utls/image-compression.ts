const TARGET_WIDTH = 640;
const TARGET_HEIGHT = 360;

/**
 * 获取图片尺寸
 */
async function getImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * 压缩并裁剪为 640×360（cover 模式）
 */
export async function compressToTarget(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = TARGET_WIDTH;
      canvas.height = TARGET_HEIGHT;

      const ctx = canvas.getContext("2d")!;
      
      // 计算 cover 缩放比例（保证填满）
      const scale = Math.max(
        TARGET_WIDTH / img.width,
        TARGET_HEIGHT / img.height
      );

      const newWidth = img.width * scale;
      const newHeight = img.height * scale;

      // 居中裁剪
      const dx = (TARGET_WIDTH - newWidth) / 2;
      const dy = (TARGET_HEIGHT - newHeight) / 2;

      ctx.drawImage(img, dx, dy, newWidth, newHeight);

      const result = canvas.toDataURL("image/jpeg", 0.7);
      resolve(result);
    };
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * 判断是否需要压缩
 */
export async function shouldCompress(src: string): Promise<boolean> {
  const { width, height } = await getImageSize(src);
  return width > TARGET_WIDTH || height > TARGET_HEIGHT;
}
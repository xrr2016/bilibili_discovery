/**
 * ID 生成工具
 * 提供统一的数字类型 ID 生成方法
 */

/**
 * 生成数字类型的 ID
 * 使用时间戳作为基础，然后取一个随机数
 * @returns 数字类型的 ID
 */
export function generateId(): number {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return timestamp * 10000 + random;
}

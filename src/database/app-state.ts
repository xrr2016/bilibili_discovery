import { DBUtils, STORE_NAMES } from "./indexeddb/index.js";

interface AppMetaRecord<T = unknown> {
  key: string;
  value: T;
  updatedAt: number;
}

export async function setAppState<T>(key: string, value: T): Promise<void> {
  await DBUtils.put<AppMetaRecord<T>>(STORE_NAMES.APP_META, {
    key,
    value,
    updatedAt: Date.now()
  });
}

export async function getAppState<T>(key: string): Promise<T | null> {
  const record = await DBUtils.get<AppMetaRecord<T>>(STORE_NAMES.APP_META, key);
  return record?.value ?? null;
}

export async function deleteAppState(key: string): Promise<void> {
  await DBUtils.delete(STORE_NAMES.APP_META, key);
}

export async function clearAppStateByPrefix(prefix: string): Promise<void> {
  const records = await DBUtils.getAll<AppMetaRecord>(STORE_NAMES.APP_META);
  const keys = records.filter((record) => record.key.startsWith(prefix)).map((record) => record.key);
  if (keys.length > 0) {
    await DBUtils.deleteBatch(STORE_NAMES.APP_META, keys);
  }
}

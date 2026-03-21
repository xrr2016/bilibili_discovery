import { test, assert } from "./test-runner.js";
import { setupTestDatabase, cleanupTestDatabase } from "./db-test-utils.js";
import {
  saveUPList,
  addTagToLibrary,
  updateUPTagWeights,
  getUPTagCounts,
  upsertTrackedVideo,
  recordWatchProgressEvent,
  getAggregatedWatchStats
} from "../implementations/bilibili-data-access.impl.js";

test("getUPTagCounts should return creator tags sorted by count descending", async () => {
  const dbManager = await setupTestDatabase();

  try {
    await saveUPList([
      {
        mid: 1001,
        name: "Test UP",
        face: "",
        sign: "",
        follow_time: Date.now(),
        is_followed: true
      }
    ]);

    const [tagA, tagB, tagC] = await Promise.all([
      addTagToLibrary("Tag A", false),
      addTagToLibrary("Tag B", false),
      addTagToLibrary("Tag C", false)
    ]);

    await updateUPTagWeights(1001, [tagB.id, tagB.id, tagB.id], false);
    await updateUPTagWeights(1001, [tagA.id], false);
    await updateUPTagWeights(1001, [tagC.id, tagC.id], false);

    const upTagCounts = await getUPTagCounts();
    const tags = upTagCounts["1001"]?.tags ?? [];

    assert(tags.length === 3, "Should return 3 tags");
    assert(tags[0]?.tag === tagB.id, "Highest-count tag should be first");
    assert(tags[1]?.tag === tagC.id, "Second-highest tag should be second");
    assert(tags[2]?.tag === tagA.id, "Lowest-count tag should be last");
  } finally {
    await cleanupTestDatabase(dbManager);
  }
});

test("getAggregatedWatchStats should read video titles and tags from database tables", async () => {
  const dbManager = await setupTestDatabase();

  try {
    const [tagA, tagB] = await Promise.all([
      addTagToLibrary("音乐", false),
      addTagToLibrary("翻唱", false)
    ]);

    await upsertTrackedVideo(
      {
        bvid: "BV1test123456",
        title: "测试视频标题",
        upMid: 2001,
        duration: 180,
        timestamp: 1710000000000
      },
      [tagA.id, tagB.id]
    );

    await recordWatchProgressEvent({
      bvid: "BV1test123456",
      title: "测试视频标题",
      upMid: 2001,
      watchedSeconds: 42,
      currentTime: 60,
      duration: 180,
      timestamp: 1710000005000
    });

    const stats = await getAggregatedWatchStats();

    assert(Boolean(stats), "Should aggregate watch stats");
    assert(stats?.videoTitles["BV1test123456"] === "测试视频标题", "Should return stored video title");
    assert(stats?.videoTags["BV1test123456"]?.length === 2, "Should return stored tag ids");
    assert(stats?.videoTags["BV1test123456"]?.includes(tagA.id) === true, "Should include first stored tag");
    assert(stats?.videoTags["BV1test123456"]?.includes(tagB.id) === true, "Should include second stored tag");
    assert(stats?.videoSeconds["BV1test123456"] === 42, "Should aggregate watch duration");
  } finally {
    await cleanupTestDatabase(dbManager);
  }
});

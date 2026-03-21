import { test, assert } from "./test-runner.js";
import { setupTestDatabase, cleanupTestDatabase } from "./db-test-utils.js";
import { saveUPList, addTagToLibrary, updateUPTagWeights, getUPTagCounts } from "../implementations/bilibili-data-access.impl.js";

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

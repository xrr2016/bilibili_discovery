import { buildInterestRows, colorFromTag, countUpTags, countVideoTotals } from "../stats/stats.js";
import { assert, test } from "../../tests/test-runner.js";
test("countVideoTotals sums counts", () => {
    const count = countVideoTotals({
        "1": 1,
        "2": 2
    });
    assert(count === 3, "expected 3 videos");
});
test("countUpTags sums tags", () => {
    const count = countUpTags({
        "1": ["AI", "Tech"],
        "2": ["Music"]
    });
    assert(count === 3, "expected 3 tags");
});
test("buildInterestRows sorts by score", () => {
    const rows = buildInterestRows({
        AI: { tag: "AI", score: 2 },
        Music: { tag: "Music", score: 5 }
    });
    assert(rows[0].tag === "Music", "expected Music first");
});
test("colorFromTag returns hsl", () => {
    const color = colorFromTag("AI");
    assert(color.startsWith("hsl("), "expected hsl color");
});

import { describe, it, expect } from "vitest";
import { calculateBeanRestingInfo, offsetRoastDateForThaw } from "./restingUtils";
import { Bean } from "./types";
import { INDUSTRIAL_PRECISION_THEME } from "./theme";

describe("calculateBeanRestingInfo", () => {
  const baseBean: Bean = {
    id: "b-1",
    name: "Worka",
    roaster: "Sey",
    flavorNotes: [],
    createdAt: "2026-09-01T00:00:00Z",
  };

  it("calculates default 5-day resting status on shelf", () => {
    const bean1: Bean = { ...baseBean, roastDate: "2026-09-19" };
    const today = new Date("2026-09-22T12:00:00Z");
    const info1 = calculateBeanRestingInfo(bean1, today);

    expect(info1.effectiveDays).toBe(3);
    expect(info1.status).toBe("resting");
    expect(info1.stageLabel).toBe("Needs Rest (De-gassing)");
    expect(info1.label).toBe("Needs Rest (De-gassing)");
    expect(info1.badgeLabel).toBe("Needs Rest • Day 3 of 5");
    expect(info1.isFrozen).toBe(false);
    expect(info1.badgeColor).toBe(INDUSTRIAL_PRECISION_THEME.colors.statusWarning);
    expect(info1.progressPercent).toBe(10);
    expect(info1.recommendedRestDays).toBe(5);

    const bean2: Bean = { ...baseBean, roastDate: "2026-09-12" };
    const info2 = calculateBeanRestingInfo(bean2, today);
    expect(info2.effectiveDays).toBe(10);
    expect(info2.status).toBe("peak");
    expect(info2.stageLabel).toBe("Peak Flavor Window");
    expect(info2.badgeLabel).toBe("Peak Window • Day 10");
    expect(info2.badgeColor).toBe(INDUSTRIAL_PRECISION_THEME.colors.statusSuccess);
    expect(info2.progressPercent).toBe(33);
  });

  it("adapts resting window when custom recommendedRestDays is provided", () => {
    const bean: Bean = { ...baseBean, roastDate: "2026-09-12", recommendedRestDays: 14 };
    const today = new Date("2026-09-22T12:00:00Z");
    const info = calculateBeanRestingInfo(bean, today);

    expect(info.effectiveDays).toBe(10);
    expect(info.recommendedRestDays).toBe(14);
    expect(info.status).toBe("resting");
    expect(info.badgeLabel).toBe("Needs Rest • Day 10 of 14");
  });

  it("halts aging and produces frozen badge when bean is in freezer vault", () => {
    const frozenBean: Bean = {
      ...baseBean,
      roastDate: "2026-08-23",
      isFrozen: true,
      frozenDate: "2026-09-04",
    };
    const today = new Date("2026-09-22T12:00:00Z");
    const info = calculateBeanRestingInfo(frozenBean, today);

    expect(info.isFrozen).toBe(true);
    expect(info.effectiveDays).toBe(12);
    expect(info.status).toBe("peak");
    expect(info.badgeLabel).toBe("❄️ Frozen at Day 12 (Peak Window)");
    expect(info.badgeColor).toBe(INDUSTRIAL_PRECISION_THEME.colors.statusInfo);
  });
});

describe("offsetRoastDateForThaw", () => {
  it("offsets roast date forward by the number of days spent in the freezer", () => {
    const originalRoast = "2026-06-01";
    const frozenDate = "2026-06-11";
    const thawDate = new Date("2026-09-23T12:00:00Z");

    const newRoast = offsetRoastDateForThaw(originalRoast, frozenDate, thawDate);
    expect(newRoast).toBe("2026-09-13");
  });
});

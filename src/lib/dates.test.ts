import { describe, expect, it } from "vitest";
import {
  addDays,
  deadlineLabel,
  diffDays,
  eachDay,
  expandTaskDates,
  formatBR,
  subjectStatus,
  todayISO,
} from "./dates";

describe("dates", () => {
  it("todayISO usa o fuso local", () => {
    expect(todayISO(new Date(2026, 8, 20, 23, 59))).toBe("2026-09-20");
  });

  it("addDays atravessa mês e ano", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("diffDays conta dias inteiros com sinal", () => {
    expect(diffDays("2026-09-20", "2026-09-25")).toBe(5);
    expect(diffDays("2026-09-25", "2026-09-20")).toBe(-5);
    expect(diffDays("2026-09-20", "2026-09-20")).toBe(0);
  });

  it("eachDay é inclusivo e respeita o limite", () => {
    expect(eachDay("2026-09-20", "2026-09-22")).toEqual(["2026-09-20", "2026-09-21", "2026-09-22"]);
    expect(eachDay("2026-01-01", "2030-01-01")).toHaveLength(366);
  });

  it("expandTaskDates", () => {
    expect(expandTaskDates("2026-09-20", "2026-09-22", false)).toEqual(["2026-09-20"]);
    expect(expandTaskDates("2026-09-20", "2026-09-22", true)).toHaveLength(3);
    expect(expandTaskDates("2026-09-25", "2026-09-22", true)).toEqual(["2026-09-25"]);
  });

  it("subjectStatus", () => {
    expect(subjectStatus("2026-10-01", "2026-10-30", "2026-09-20")).toBe("upcoming");
    expect(subjectStatus("2026-09-01", "2026-09-30", "2026-09-20")).toBe("active");
    expect(subjectStatus("2026-09-20", "2026-09-20", "2026-09-20")).toBe("active");
    expect(subjectStatus("2026-08-01", "2026-08-30", "2026-09-20")).toBe("done");
  });

  it("formatBR e deadlineLabel", () => {
    expect(formatBR("2026-09-05")).toBe("05/09/2026");
    expect(deadlineLabel("2026-09-20", "2026-09-20")).toBe("termina hoje");
    expect(deadlineLabel("2026-09-21", "2026-09-20")).toBe("termina amanhã");
    expect(deadlineLabel("2026-09-30", "2026-09-20")).toBe("faltam 10 dias");
    expect(deadlineLabel("2026-09-19", "2026-09-20")).toBe("encerrou há 1 dia");
  });
});

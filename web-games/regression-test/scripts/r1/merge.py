"""Merge R1 phase results into stage-results-R1-readonly.md.

Usage: python3 -I merge.py <appendix.md> <out.md>
Rows from results-P2.md replace phase-1 rows with the same ID.
"""
import re
import sys
from pathlib import Path

R1 = Path(__file__).resolve().parent
SOURCES = [("A", R1 / "results-A.md"), ("B", R1 / "results-B.md"), ("P2", R1 / "results-P2.md")]
MCP = ["RT-MCP-004", "RT-MCP-005", "RT-MCP-006", "RT-MCP-007", "RT-MCP-009", "RT-MCP-011", "RT-MCP-024"]
ROW = re.compile(r"^\| (RT-[A-Z0-9]+-\d{3}) \|")


def split(path):
    """Return (main-table rows by ID, tail sections text). Main table = rows before the first ### heading."""
    text = path.read_text(encoding="utf-8")
    head, _, tail = text.partition("\n### ")
    rows = {}
    for line in head.splitlines():
        m = ROW.match(line)
        if m:
            rows[m.group(1)] = line
    return rows, ("### " + tail) if tail else ""


def result_of(row):
    cell = row.split("|")[3].replace("*", "").strip()
    for key in ("PASS（部分）", "FAIL", "BLOCKED", "N/A", "PASS"):
        if cell.startswith(key):
            return key
    return "?"


def demote(md):
    return re.sub(r"(?m)^### ", "#### ", md)


def main(appendix, out):
    order = [m.group(1) for m in map(ROW.match, Path(appendix).read_text(encoding="utf-8").splitlines()) if m]
    parsed = {name: split(path) for name, path in SOURCES}
    final, superseded = {}, []
    for name, _ in SOURCES:
        for id_, row in parsed[name][0].items():
            if id_ in final:
                superseded.append(final[id_])
            final[id_] = (name, row)

    ids = sorted(final, key=lambda i: order.index(i) if i in order else 10_000)
    unknown = [i for i in ids if i not in order]
    if len(final) != 70 or unknown:
        sys.exit(f"count={len(final)} unknown={unknown}")

    counts = {}
    lines = ["| ID | 来源 | 优先级 | 结果 | 时间（UTC ISO） | 加载方式 | 实际行为 | 证据 | 局限 |",
             "|---|---|---|---|---|---|---|---|---|"]
    for id_ in ids:
        name, row = final[id_]
        counts[result_of(row)] = counts.get(result_of(row), 0) + 1
        cells = row.split("|")
        lines.append("|".join(cells[:2] + [f" {name} "] + cells[2:]))
    for id_ in MCP:
        counts["N/A"] = counts.get("N/A", 0) + 1
        lines.append(f"| {id_} | — | — | N/A | — | — | stage 构建 c1b5e37 没有 MCP 登录 | — | 部署包含 MCP 的构建后再测 |")

    body = Path(R1 / "header.md").read_text(encoding="utf-8").rstrip()
    body = body.replace("{{COUNTS}}", " / ".join(f"{k} {counts.get(k, 0)}" for k in ("PASS", "PASS（部分）", "FAIL", "BLOCKED", "N/A")))
    parts = [body, "", "## 1. 结果（70 + 7 条）", "", *lines, ""]
    parts += ["## 附录 A：agent A（T4 + T5）的说明与新发现", "", demote(parsed["A"][1]).strip(), ""]
    parts += ["## 附录 B：agent B（T2 + T3）的说明与新发现", "", demote(parsed["B"][1]).strip(), ""]
    parts += ["## 附录 C：阶段 2 的状态恢复清单与新发现", "", demote(parsed["P2"][1]).strip(), ""]
    parts += ["## 附录 D：阶段 1 原始记录（已被阶段 2 取代）", "",
              "| ID | 来源 | 优先级 | 结果 | 时间（UTC ISO） | 加载方式 | 实际行为 | 证据 | 局限 |",
              "|---|---|---|---|---|---|---|---|---|"]
    for name, row in superseded:
        cells = row.split("|")
        parts.append("|".join(cells[:2] + [f" {name} "] + cells[2:]))
    Path(out).write_text("\n".join(parts) + "\n", encoding="utf-8")
    print(counts, "superseded", len(superseded))


if __name__ == "__main__":
    main(*sys.argv[1:3])

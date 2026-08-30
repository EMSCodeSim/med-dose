from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
IMPORT_LINE = 'import MedicationBuilderShell from "./MedicationBuilderShell";'


def ensure_shell_import(text: str) -> str:
    if IMPORT_LINE in text:
        return text
    marker = 'from "./CalculationBoard"'
    marker_at = text.index(marker)
    line_end = text.find("\n", marker_at)
    if line_end < 0:
        raise RuntimeError("CalculationBoard import line has no newline")
    return text[: line_end + 1] + IMPORT_LINE + "\n" + text[line_end + 1 :]


def remove_outer_layout_close(body: str) -> str:
    # Specialized builders all open one outer `versed-layout` div before the
    # left calculation column. Versed also renders a safety modal *after* that
    # layout div, so the layout close is not always the final tag in the body.
    marker = "\n    </div>"
    close_at = body.rfind(marker)
    if close_at < 0:
        raise RuntimeError("Expected specialized builder layout closing div")
    return (body[:close_at] + body[close_at + len(marker):]).rstrip()


def wrap_specialized(path: Path, start_marker: str, medication_expr: str, left_tools_expr: str) -> None:
    text = ensure_shell_import(path.read_text(encoding="utf-8"))

    if start_marker not in text:
        if "<MedicationBuilderShell" in text:
            path.write_text(text, encoding="utf-8")
            return
        raise RuntimeError(f"{path.name}: render start marker not found")

    start = text.index(start_marker)
    left_marker = '<aside className="versed-left-column" aria-label="Calculation controls">'
    left_start = text.index(left_marker, start)
    left_end = text.index("</aside>", left_start) + len("</aside>")
    main_close = "\n  </main>;"
    close_at = text.index(main_close, left_end)
    body = remove_outer_layout_close(text[left_end:close_at])
    body = body.replace("\n        {medicationReference}", "")
    body = body.replace("{medicationReference}", "")

    new_render = (
        f"  return <MedicationBuilderShell medication={{{medication_expr}}} boxes={{board}} close={{close}} reset={{close}} "
        f"calculationComplete={{calculationReady}} leftTools={{{left_tools_expr}}}>\n"
        + body.lstrip("\n")
        + "\n  </MedicationBuilderShell>;"
    )
    text = text[:start] + new_render + text[close_at + len(main_close):]
    path.write_text(text, encoding="utf-8")


def wrap_generic(path: Path) -> None:
    text = ensure_shell_import(path.read_text(encoding="utf-8"))
    start_marker = '  return <main className="generic-calc unified-medication-shell generic-unified-medication-shell"'
    if start_marker not in text:
        if "<MedicationBuilderShell" in text:
            path.write_text(text, encoding="utf-8")
            return
        raise RuntimeError("DmpMedicationCalculator: render start not found")

    start = text.index(start_marker)
    opening_end = text.index(">", start) + 1
    board_start = text.index('    <CalculationBoard className="generic-status-board" boxes={[', opening_end)
    board_end_marker = "    ]}/>"
    board_end = text.index(board_end_marker, board_start) + len(board_end_marker)
    board_markup = text[board_start:board_end]
    boxes_start = board_markup.index("boxes=") + len("boxes=")
    boxes_expr = board_markup[boxes_start: board_markup.rfind("/>")].strip()
    main_close = "\n  </main>;"
    close_at = text.index(main_close, board_end)
    body = text[board_end:close_at]

    new_render = (
        '  return <MedicationBuilderShell medication={{name:selectedAgent||medication.name,subtitle:medication.name,protocolId:medication.protocolId}} '
        + f"boxes={boxes_expr} close={{close}} reset={{close}} calculationComplete={{step===\"result\"&&safetyComplete}}>\n"
        + body.lstrip("\n")
        + "\n  </MedicationBuilderShell>;"
    )
    text = text[:start] + new_render + text[close_at + len(main_close):]
    path.write_text(text, encoding="utf-8")


def main() -> None:
    wrap_specialized(
        SRC / "FentanylBuilder.tsx",
        '  return <main className="versed-builder fentanyl-builder">',
        '{name:"Fentanyl",subtitle:"Opioid analgesic",protocolId:"9230",vialLabel:"Fentanyl"}',
        '<div id="versed-left-tools" className="versed-left-tools" aria-label="Report treatment and protocol tools"/>',
    )
    wrap_specialized(
        SRC / "VersedBuilder.tsx",
        '  return <main className="versed-builder">',
        '{name:"Midazolam (Versed)",subtitle:"Benzodiazepine",protocolId:"9070",vialLabel:"Midazolam"}',
        '<div id="versed-left-tools" className="versed-left-tools" aria-label="Report treatment and protocol tools"/>',
    )
    wrap_specialized(
        SRC / "KetamineBuilder.tsx",
        '  return <main className="versed-builder ketamine-builder">',
        '{name:"Ketamine",subtitle:"Adult analgesia waiver",protocolId:"500:62",vialLabel:"Ketamine"}',
        '<div id="versed-left-tools" className="versed-left-tools"/>',
    )
    wrap_generic(SRC / "DmpMedicationCalculator.tsx")


if __name__ == "__main__":
    main()

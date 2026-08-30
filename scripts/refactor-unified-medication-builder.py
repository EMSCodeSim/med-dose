from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"


def add_import(text: str, anchor: str) -> str:
    line = 'import MedicationBuilderShell from "./MedicationBuilderShell";'
    if line in text:
        return text
    if anchor not in text:
        raise RuntimeError(f"Import anchor not found: {anchor}")
    return text.replace(anchor, anchor + "\n" + line, 1)


def wrap_specialized(path: Path, start_marker: str, medication_expr: str, left_tools_expr: str) -> None:
    text = path.read_text(encoding="utf-8")
    text = add_import(text, 'import CalculationBoard',) if False else text
    import_line = 'import MedicationBuilderShell from "./MedicationBuilderShell";'
    if import_line not in text:
        calc_line_end = text.find("\n", text.index('from "./CalculationBoard"'))
        text = text[: calc_line_end + 1] + import_line + "\n" + text[calc_line_end + 1 :]

    if start_marker not in text:
        if "<MedicationBuilderShell" in text:
            path.write_text(text, encoding="utf-8")
            return
        raise RuntimeError(f"{path.name}: render start marker not found")

    start = text.index(start_marker)
    left_marker = '<aside className="versed-left-column" aria-label="Calculation controls">'
    left_start = text.index(left_marker, start)
    left_end = text.index("</aside>", left_start) + len("</aside>")
    suffix = "\n    </div>\n  </main>;"
    suffix_at = text.index(suffix, left_end)
    body = text[left_end:suffix_at]
    body = body.replace("\n        {medicationReference}", "")
    body = body.replace("{medicationReference}", "")
    new_render = (
        f"  return <MedicationBuilderShell medication={{{medication_expr}}} boxes={{board}} close={{close}} reset={{close}} "
        f"calculationComplete={{calculationReady}} leftTools={{{left_tools_expr}}}>"
        + body
        + "\n  </MedicationBuilderShell>;"
    )
    text = text[:start] + new_render + text[suffix_at + len(suffix):]
    path.write_text(text, encoding="utf-8")


def wrap_generic(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    import_line = 'import MedicationBuilderShell from "./MedicationBuilderShell";'
    if import_line not in text:
        anchor = 'import CalculationBoard from "./CalculationBoard";'
        if anchor not in text:
            raise RuntimeError("DmpMedicationCalculator: CalculationBoard import not found")
        text = text.replace(anchor, anchor + "\n" + import_line, 1)

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
    close_marker = "\n  </main>;"
    close_at = text.index(close_marker, board_end)
    body = text[board_end:close_at]
    new_render = (
        '  return <MedicationBuilderShell medication={{name:selectedAgent||medication.name,subtitle:medication.name,protocolId:medication.protocolId}} '
        + f"boxes={boxes_expr} close={{close}} reset={{close}} calculationComplete={{step===\"result\"&&safetyComplete}}>"
        + body
        + "\n  </MedicationBuilderShell>;"
    )
    text = text[:start] + new_render + text[close_at + len(close_marker):]
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

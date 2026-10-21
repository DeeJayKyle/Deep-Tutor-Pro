"""Build the PDF fixtures used by the end-to-end tests (e2e/fixtures/).

Run: python3 scripts/make_fixtures.py   (needs reportlab and Pillow)
"""
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, PageBreak
from reportlab.lib.units import cm
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent.parent / "e2e" / "fixtures"
OUT.mkdir(parents=True, exist_ok=True)
styles = getSampleStyleSheet()
H1, H2, P = styles["Title"], styles["Heading2"], styles["Normal"]

UNITS = [
    ("CP 111", "Pharmaceutics I", 1, 1, 45, [
        ("Introduction to pharmaceutics", 6, ["Define pharmaceutics and dosage form", "Classify dosage forms"]),
        ("Solutions and suspensions", 15, ["Prepare oral solutions", "Explain suspending agents"]),
        ("Tablets and capsules", 24, ["Describe tablet manufacture", "Compare tablets and capsules"]),
    ]),
    ("CP 112", "Pharmacology I", 1, 1, 60, [
        ("Principles of pharmacology", 10, ["Define drug, receptor and dose"]),
        ("Pharmacokinetics", 25, ["Explain absorption, distribution, metabolism and excretion"]),
        ("Pharmacodynamics", 25, ["Describe drug-receptor interactions", "Explain dose-response curves"]),
    ]),
    ("CP 211", "Dispensing Practice", 2, 1, 40, [
        ("The prescription", 10, ["Interpret a prescription", "Identify prescription errors"]),
        ("Labelling and counselling", 30, ["Label dispensed medicines", "Counsel patients on use"]),
    ]),
]


def curriculum():
    story = [Paragraph("Certificate in Pharmacy Curriculum", H1),
             Paragraph("Allied Health Examinations Board — Teacher's Guide", P), Spacer(1, 12),
             Paragraph("Programme overview", H2),
             Paragraph("The Certificate in Pharmacy is a two-year programme that prepares pharmacy "
                       "assistants to dispense medicines safely in community and hospital pharmacies. "
                       "Assessment: continuous assessment 40% and final examination 60%; pass mark 50%.", P),
             Spacer(1, 12), Paragraph("Course structure", H2)]
    rows = [["Year", "Semester", "Code", "Course unit", "Contact hours"]]
    rows += [[str(y), str(s), c, t, str(h)] for c, t, y, s, h, _ in UNITS]
    story += [Table(rows, colWidths=[1.5 * cm, 2 * cm, 2.2 * cm, 6 * cm, 3 * cm]), PageBreak()]
    for code, title, year, sem, hours, topics in UNITS:
        story += [Paragraph(f"{code} {title}", H2),
                  Paragraph(f"Year {year}, Semester {sem}. Contact hours: {hours}.", P),
                  Paragraph(f"Course description: This unit introduces learners to {title.lower()}.", P),
                  Spacer(1, 6)]
        for i, (topic, h, objectives) in enumerate(topics, 1):
            story.append(Paragraph(f"<b>Topic {i}: {topic}</b> ({h} hours)", P))
            story.append(Paragraph("Learning objectives: by the end of this topic the learner should be able to: "
                                   + "; ".join(objectives) + ".", P))
            story.append(Spacer(1, 4))
        story.append(Spacer(1, 10))
    SimpleDocTemplate(str(OUT / "curriculum.pdf"), pagesize=A4).build(story)


def scanned():
    img = Image.new("RGB", (1240, 1754), "white")
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 44)
    except OSError:
        font = ImageFont.load_default()
    lines = ["PHARMACY PRACTICE HANDOUT", "", "Storage of medicines", "Keep vaccines between 2 and 8 degrees.",
             "Protect tablets from moisture and light.", "Check expiry dates every month."]
    for i, line in enumerate(lines):
        d.text((110, 160 + i * 90), line, fill="black", font=font)
    img.save(OUT / "scanned-page.pdf", "PDF", resolution=150)


def past_paper():
    story = [Paragraph("CP 112 Pharmacology I — End of Semester Examination", H1),
             Paragraph("Time allowed: 3 hours. Answer ALL questions in Sections A and B and any TWO in Section C.", P),
             Spacer(1, 10), Paragraph("SECTION A: Multiple choice questions (20 marks, 1 mark each)", H2)]
    for i in range(1, 4):
        story.append(Paragraph(f"{i}. Which of the following best describes bioavailability? "
                               "A. Rate of excretion B. Fraction reaching circulation C. Half-life D. Potency", P))
    story += [Paragraph("SECTION B: Short answer questions (40 marks, 5 marks each)", H2),
              Paragraph("21. Explain first-pass metabolism. (5 marks)", P),
              Paragraph("22. List four routes of drug administration. (5 marks)", P),
              Paragraph("SECTION C: Long essay questions (40 marks, 20 marks each; answer any two)", H2),
              Paragraph("29. Describe the factors affecting drug absorption. (20 marks)", P),
              Paragraph("30. Discuss drug-receptor interactions. (20 marks)", P),
              Paragraph("31. Explain the dose-response relationship. (20 marks)", P)]
    SimpleDocTemplate(str(OUT / "past-paper.pdf"), pagesize=A4).build(story)


if __name__ == "__main__":
    curriculum()
    scanned()
    past_paper()
    print("Fixtures written to", OUT)

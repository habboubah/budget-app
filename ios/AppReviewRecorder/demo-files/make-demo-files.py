"""Demo files for the Spartopf App Review screen recording.

Regenerate for another month: change the dates below, then
  python3 make-demo-files.py .   (needs openpyxl and Pillow)
spartopf-demo-backup.spartopf comes from npm run rehearse:app-review instead.

All names and amounts are invented. Writes into the folder given as argv[1]:
  spartopf-demo-history.xlsx  - Jun-Oct 2026, laid out like My_expense.xlsx
  spartopf-demo-bank.csv      - Sparkasse CSV-CAMT export, November 2026
  spartopf-demo-banking-app.png - a banking-app transaction list to photograph
"""
import sys
from pathlib import Path

from openpyxl import Workbook
from PIL import Image, ImageDraw, ImageFont

out = Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------- Excel
# Each category: header in row 1 over three columns (name, paid, open),
# starting at column C like the original sheet.
CATS = ["Income", "Home", "Car", "Groceries & drugstore", "Restaurants", "Family", "Children", "Others", "Investments"]

CHILDREN = {
    "06.2026": [("Daycare", 280.00, None), ("Nappies", 64.90, None), ("Kids' clothes", 118.40, None)],
    "07.2026": [("Daycare", 280.00, None), ("Nappies", 59.80, None), ("Toys", 42.99, None), ("Swimming course", 120.00, None)],
    "08.2026": [("Daycare", 280.00, None), ("Nappies", 61.20, None), ("Kids' clothes", 96.50, None)],
    "09.2026": [("Daycare", 280.00, None), ("Nappies", 63.45, None), ("Toys", 24.99, None), ("Kids' shoes", 59.95, None)],
    "10.2026": [("Daycare", 280.00, None), ("Nappies", 58.30, None), ("Toys", 35.99, None), ("Winter jacket", 89.95, None)],
}
# November opens with what October left (paid entries only), so the setup
# balance typed in the recording (7,500.00 with salary received and the
# 25.00 phone bill paid) lines up with the history: 7,500 - 3,200 + 25.
TARGET_OCT_NOW = 4325.00

MONTHS = {
    "06.2026": {
        "Income": [("Before", 1420.00, None), ("Salary", 3200.00, None), ("Child benefit", 255.00, None)],
        "Home": [("Rent(3)", 950.00, None), ("Electricity(5)", 85.00, None), ("Mobile phone", 25.00, None), ("Internet", 39.99, None), ("Netflix", 13.99, None)],
        "Car": [("Fuel", 112.40, None), ("Car insurance", 48.60, None)],
        "Groceries & drugstore": [("Rewe", 212.35, None), ("Lidl", 168.90, None), ("Aldi", 94.20, None), ("dm", 38.75, None)],
        "Restaurants": [("Pizzeria", 42.50, None), ("Bakery", 31.20, None)],
        "Family": [("Day out", 64.00, None)],
        "Others": [("Gym", 29.90, None), ("Amazon", 57.80, None)],
        "Investments": [("ETF savings plan", 150.00, None)],
    },
    "07.2026": {
        "Income": [("Salary", 3200.00, None), ("Child benefit", 255.00, None)],
        "Home": [("Rent(3)", 950.00, None), ("Electricity(5)", 85.00, None), ("Mobile phone", 25.00, None), ("Internet", 39.99, None), ("Netflix", 13.99, None)],
        "Car": [("Fuel", 124.10, None), ("Car insurance", 48.60, None), ("Car tax", 154.00, None)],
        "Groceries & drugstore": [("Rewe", 198.60, None), ("Lidl", 181.45, None), ("Aldi", 88.30, None), ("dm", 41.10, None)],
        "Restaurants": [("Pizzeria", 38.00, None), ("Bakery", 27.60, None), ("Ice cream", 18.40, None)],
        "Family": [("Gift", 45.00, None)],
        "Others": [("Gym", 29.90, None), ("Amazon", 34.99, None)],
        "Investments": [("ETF savings plan", 150.00, None)],
    },
    "08.2026": {
        "Income": [("Salary", 3200.00, None), ("Child benefit", 255.00, None)],
        "Home": [("Rent(3)", 950.00, None), ("Electricity(5)", 85.00, None), ("Mobile phone", 25.00, None), ("Internet", 39.99, None), ("Netflix", 13.99, None)],
        "Car": [("Fuel", 168.70, None), ("Car insurance", 48.60, None)],
        "Groceries & drugstore": [("Rewe", 225.80, None), ("Lidl", 159.30, None), ("Aldi", 101.75, None), ("dm", 36.40, None)],
        "Restaurants": [("Pizzeria", 46.00, None), ("Bakery", 29.80, None)],
        "Family": [("Day out", 92.00, None)],
        "Others": [("Gym", 29.90, None), ("Holiday flat", 680.00, None)],
        "Investments": [("ETF savings plan", 150.00, None)],
    },
    "09.2026": {
        "Income": [("Salary", 3200.00, None), ("Child benefit", 255.00, None)],
        "Home": [("Rent(3)", 950.00, None), ("Electricity(5)", 85.00, None), ("Mobile phone", 25.00, None), ("Internet", 39.99, None), ("Netflix", 13.99, None)],
        "Car": [("Fuel", 118.90, None), ("Car insurance", 48.60, None)],
        "Groceries & drugstore": [("Rewe", 207.15, None), ("Lidl", 172.60, None), ("Aldi", 97.40, None), ("dm", 44.25, None)],
        "Restaurants": [("Pizzeria", 41.50, None), ("Bakery", 33.10, None)],
        "Family": [("School supplies", 76.30, None)],
        "Others": [("Gym", 29.90, None), ("Amazon", 48.60, None)],
        "Investments": [("ETF savings plan", 150.00, None)],
    },
    "10.2026": {
        "Income": [("Salary", 3200.00, None), ("Child benefit", 255.00, None)],
        "Home": [("Rent(3)", 950.00, None), ("Electricity(5)", 85.00, None), ("Mobile phone", 25.00, None), ("Internet", 39.99, None), ("Netflix", 15.99, None)],
        "Car": [("Fuel", 121.30, None), ("Car insurance", 48.60, None), ("Garage", None, 210.00)],
        "Groceries & drugstore": [("Rewe", 219.40, None), ("Lidl", 166.85, None), ("Aldi", 92.10, None), ("dm", 39.90, None)],
        "Restaurants": [("Pizzeria", 58.00, None), ("Bakery", 36.40, None), ("Restaurant", 96.50, None)],
        "Family": [("Birthday party", 120.00, None)],
        "Others": [("Gym", 29.90, None), ("Amazon", 41.20, None)],
        "Investments": [("ETF savings plan", 150.00, None)],
    },
}

for tab, rows in CHILDREN.items():
    MONTHS[tab]["Children"] = rows
# Work out "Before" so October ends (paid only) on TARGET_OCT_NOW.
net = 0.0
for tab, data in MONTHS.items():
    for cat, rows in data.items():
        for name, paid, _open in rows:
            if name == "Before" or paid is None:
                continue
            net += paid if cat == "Income" else -paid
before = round(TARGET_OCT_NOW - net, 2)
assert before > 0, before
MONTHS["06.2026"]["Income"][0] = ("Before", before, None)
print("Before =", before)

wb = Workbook()
wb.remove(wb.active)
for tab, data in MONTHS.items():
    ws = wb.create_sheet(tab)
    for i, cat in enumerate(CATS):
        col = 3 + i * 3  # C, F, I, ...
        ws.cell(row=1, column=col, value=cat)
        for r, (name, paid, open_) in enumerate(data.get(cat, []), start=2):
            ws.cell(row=r, column=col, value=name)
            if paid is not None:
                ws.cell(row=r, column=col + 1, value=paid)
            if open_ is not None:
                ws.cell(row=r, column=col + 2, value=open_)
wb.save(out / "spartopf-demo-history.xlsx")

# ---------------------------------------------------------------- bank CSV
HEADER = ["Auftragskonto", "Buchungstag", "Valutadatum", "Buchungstext", "Verwendungszweck",
          "Glaeubiger ID", "Mandatsreferenz", "Kundenreferenz (End-to-End)", "Sammlerreferenz",
          "Lastschrift Ursprungsbetrag", "Auslagenersatz Ruecklastschrift",
          "Beguenstigter/Zahlungspflichtiger", "Kontonummer/IBAN", "BIC (SWIFT-Code)",
          "Betrag", "Waehrung", "Info"]
ROWS = [
    ("01.11.26", "GUTSCHR. UEBERWEISUNG", "LOHN/GEHALT 11/2026", "Muster Software GmbH", "3200,00"),
    ("03.11.26", "DAUERAUFTRAG", "Miete November Whg. 2. OG", "Muster Wohnbau GmbH", "-950,00"),
    ("04.11.26", "KARTENZAHLUNG", "2026-11-04T18:42 Debitk.1 VISA Debit", "REWE", "-64,37"),
    ("05.11.26", "FOLGELASTSCHRIFT", "Netflix Monatsabo", "Netflix International B.V.", "-15,99"),
    ("06.11.26", "KARTENZAHLUNG", "2026-11-06T08:15 Debitk.1 VISA Debit", "Shell", "-58,40"),
    ("07.11.26", "KARTENZAHLUNG", "2026-11-07T11:03 Debitk.1 VISA Debit", "dm-drogerie markt", "-23,15"),
    ("09.11.26", "GUTSCHR. UEBERWEISUNG", "Kindergeld 11/2026", "Familienkasse", "255,00"),
]
lines = [";".join(f'"{h}"' for h in HEADER)]
for day, kind, purpose, payee, amount in ROWS:
    cells = ["DE00000000000000000000", day, day, kind, purpose, "", "", "", "", "", "",
             payee, "", "", amount, "EUR", "Umsatz gebucht"]
    lines.append(";".join(f'"{c}"' for c in cells))
(out / "spartopf-demo-bank.csv").write_text("\r\n".join(lines) + "\r\n", encoding="utf-8")

# ---------------------------------------------------------------- banking-app picture
W, H = 900, 1250
img = Image.new("RGB", (W, H), "white")
d = ImageDraw.Draw(img)
def font(size, bold=False):
    # DejaVu on Linux, Arial on a Mac.
    for path in (f"/usr/share/fonts/truetype/dejavu/DejaVuSans{'-Bold' if bold else ''}.ttf",
                 f"/System/Library/Fonts/Supplemental/Arial{' Bold' if bold else ''}.ttf"):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            pass
    return ImageFont.load_default(size)

bold = font(58, True)
reg = font(56)
small = font(44)
title = font(70, True)

d.text((60, 60), "Umsätze", font=title, fill="black")
d.line((60, 165, W - 60, 165), fill="#cccccc", width=3)
y = 230
d.text((60, y), "09.11.2026", font=small, fill="#444444")
y += 100
PHOTO = [("Bäckerei Schmidt", "6,80 €"), ("Aral Tankstelle", "61,25 €"),
         ("Rossmann", "12,49 €"), ("Pizzeria Roma", "34,50 €")]
for payee, amount in PHOTO:
    d.text((60, y), payee, font=reg, fill="black")
    w = d.textlength(amount, font=bold)
    d.text((W - 60 - w, y), amount, font=bold, fill="black")
    y += 80
    d.line((60, y + 20, W - 60, y + 20), fill="#e0e0e0", width=2)
    y += 70
img.save(out / "spartopf-demo-banking-app.png")
print("ok", sorted(p.name for p in out.iterdir()))

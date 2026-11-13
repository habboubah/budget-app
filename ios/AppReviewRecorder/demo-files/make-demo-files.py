"""Demo files for the Spartopf App Review screen recording.

Regenerate for another month: change the dates below, then
  python3 make-demo-files.py .   (needs Pillow, reportlab and segno)
spartopf-demo-backup.spartopf comes from npm run rehearse:app-review instead.
The recording shows the main features only (13 Nov 2026) and imports none of
these files any more; they are kept for trying the imports by hand. The
earlier months come from More > Settings > Add test data.

All names, IBANs and amounts are invented. Writes into the folder given as argv[1]:
  spartopf-demo-bank.csv        - Sparkasse CSV-CAMT export, November 2026
  spartopf-demo-banking-app.png - a banking-app transaction list to photograph
  spartopf-demo-statement.pdf   - a bank statement as PDF (for banks without CSV)
  spartopf-demo-other-app.csv   - an export from another budget app (Cashew-style columns)
  spartopf-demo-invoice.png     - an invoice with a payment QR code (GiroCode)
  spartopf-demo-receipt.png     - a shop receipt to attach to an entry
"""
import sys
from pathlib import Path

import io

import segno
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

out = Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)

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
             payee, "", "", amount, "USD", "Umsatz gebucht"]  # the recording runs in US dollars (scene 1)
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

# ---------------------------------------------------------------- statement PDF
# Two days after the CSV's last booking, so nothing in it is "already entered".
STATEMENT = [
    ("10.11.2026", "10.11.2026", "Kartenzahlung", "Apotheke am Markt", "Debitk.1 2026-11-10", "-18,45"),
    ("11.11.2026", "11.11.2026", "Lastschrift", "Stadtbibliothek Muster", "Jahresausweis 2027", "-24,00"),
]
pdf = canvas.Canvas(str(out / "spartopf-demo-statement.pdf"), pagesize=A4)
pdf.setTitle("Kontoauszug 11/2026")
w, h = A4
y = h - 70
pdf.setFont("Helvetica-Bold", 15); pdf.drawString(50, y, "Musterbank eG"); y -= 22
pdf.setFont("Helvetica", 10)
pdf.drawString(50, y, "Kontoauszug vom 01.11.2026 bis 11.11.2026"); y -= 14
pdf.drawString(50, y, "Girokonto DE00 0000 0000 0000 0000 00 - Max Mustermann"); y -= 30
pdf.setFont("Helvetica-Bold", 10)
pdf.drawString(50, y, "Buchung"); pdf.drawString(120, y, "Valuta"); pdf.drawString(190, y, "Vorgang"); pdf.drawRightString(w - 50, y, "Betrag EUR"); y -= 18
pdf.setFont("Helvetica", 10)
for day, value, kind, payee, detail, amount in STATEMENT:
    pdf.drawString(50, y, day); pdf.drawString(120, y, value); pdf.drawString(190, y, kind); pdf.drawRightString(w - 50, y, amount); y -= 14
    pdf.drawString(190, y, payee); y -= 14
    pdf.drawString(190, y, detail); y -= 20
pdf.save()

# ---------------------------------------------------------------- another budget app's CSV
# Cashew's export columns; the app recognises them by their titles.
OTHER = [
    ("2026-11-10 19:30:00.000", "-32.80", "Dining", "Sushi Bar", "Dinner"),
    ("2026-11-11 08:05:00.000", "-4.20", "Dining", "Coffee", ""),
]
lines = ["Date,Amount,Category,Title,Note,Account"]
for date, amount, cat, title, note in OTHER:
    lines.append(",".join([date, amount, cat, title, note, "Main"]))
(out / "spartopf-demo-other-app.csv").write_text("\n".join(lines) + "\n", encoding="utf-8")

# ---------------------------------------------------------------- invoice with a GiroCode
# EPC069-12 "SEPA credit transfer" QR code; the IBAN is the standard example IBAN.
giro = "\n".join(["BCD", "002", "1", "SCT", "", "Stadtwerke Muster GmbH", "DE02120300000000202051",
                  "EUR89.00", "", "", "Rechnung 2026-4711 Kundennr. 10023", ""])
qr = io.BytesIO()
segno.make(giro, error="m").save(qr, kind="png", scale=12, border=4)
qr_img = Image.open(io.BytesIO(qr.getvalue())).convert("RGB")
W, H = 1240, 1754
inv = Image.new("RGB", (W, H), "white")
d = ImageDraw.Draw(inv)
d.text((90, 90), "Stadtwerke Muster GmbH", font=font(54, True), fill="black")
d.text((90, 170), "Musterstraße 1 · 12345 Musterstadt", font=font(32), fill="#444444")
d.text((90, 320), "Rechnung 2026-4711", font=font(46, True), fill="black")
d.text((90, 390), "Kundennummer 10023 · 02.11.2026", font=font(32), fill="#444444")
yy = 500
for item, price in [("Strom Oktober 2026", "71,40 €"), ("Grundpreis", "17,60 €")]:
    d.text((90, yy), item, font=font(36), fill="black")
    tw = d.textlength(price, font=font(36)); d.text((W - 90 - tw, yy), price, font=font(36), fill="black"); yy += 70
d.line((90, yy + 10, W - 90, yy + 10), fill="black", width=3); yy += 40
d.text((90, yy), "Zu zahlen bis 20.11.2026", font=font(40, True), fill="black")
tw = d.textlength("89,00 €", font=font(40, True)); d.text((W - 90 - tw, yy), "89,00 €", font=font(40, True), fill="black")
d.text((90, yy + 140), "Bequem bezahlen mit GiroCode:", font=font(32), fill="#444444")
inv.paste(qr_img, (90, yy + 200))
inv.save(out / "spartopf-demo-invoice.png")

# ---------------------------------------------------------------- receipt photo
W, H = 760, 1100
rc = Image.new("RGB", (W, H), "#fbfbf8")
d = ImageDraw.Draw(rc)
def centred(y, text, f):
    d.text(((W - d.textlength(text, font=f)) / 2, y), text, font=f, fill="black")
centred(60, "ELEKTRO MUSTERMARKT", font(46, True))
centred(125, "Hauptstraße 12 · Musterstadt", font(28))
centred(165, "12.11.2026  14:32", font(28))
yy = 260
for item, price in [("Kopfhörer Bluetooth", "59,99")]:
    d.text((50, yy), item, font=font(34), fill="black")
    tw = d.textlength(price, font=font(34)); d.text((W - 50 - tw, yy), price, font=font(34), fill="black"); yy += 60
d.line((50, yy + 10, W - 50, yy + 10), fill="black", width=3); yy += 40
d.text((50, yy), "SUMME EUR", font=font(44, True), fill="black")
tw = d.textlength("59,99", font=font(44, True)); d.text((W - 50 - tw, yy), "59,99", font=font(44, True), fill="black"); yy += 90
d.text((50, yy), "MwSt 19 %", font=font(28), fill="#333333")
tw = d.textlength("9,58", font=font(28)); d.text((W - 50 - tw, yy), "9,58", font=font(28), fill="#333333"); yy += 60
centred(yy + 60, "Umtausch innerhalb 14 Tagen", font(28))
centred(yy + 105, "nur mit Kassenbon", font(28))
rc.save(out / "spartopf-demo-receipt.png")
print("ok", sorted(p.name for p in out.iterdir()))

"""Build the seeded rules PDFs from the structured rules content.

Usage: python3 db/seed/tools/build_rule_pdfs.py rules.json db/seed/files
(rules.json is RULE_DOCUMENTS from apps/api/src/seed/sports.ts.)
Re-run whenever the seeded rules text changes.
"""
import json, sys, os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem, Image
from reportlab.lib.styles import ParagraphStyle

MAROON = colors.HexColor('#7A1F1A'); INK = colors.HexColor('#24100D'); CLAY = colors.HexColor('#6F6251')
src, out = sys.argv[1], sys.argv[2]
logo = os.path.join(os.path.dirname(__file__), 'logo-print.jpg')
title = ParagraphStyle('t', fontName='Helvetica-Bold', fontSize=18, leading=22, textColor=INK, spaceAfter=4)
sub = ParagraphStyle('s', fontName='Helvetica', fontSize=9.5, leading=13, textColor=CLAY, spaceAfter=14)
h = ParagraphStyle('h', fontName='Helvetica-Bold', fontSize=11.5, leading=15, textColor=MAROON, spaceBefore=12, spaceAfter=6)
body = ParagraphStyle('b', fontName='Helvetica', fontSize=10, leading=14.5, textColor=INK)

def footer(c, d):
    c.saveState(); c.setFont('Helvetica', 8); c.setFillColor(CLAY)
    c.drawString(20*mm, 12*mm, 'Bhutan Indigenous Games and Sports Association · Changlimithang, Thimphu · bigsabt@gmail.com · +975 2 332834')
    c.drawRightString(190*mm, 12*mm, str(d.page)); c.restoreState()

for doc in json.load(open(src)):
    path = os.path.join(out, doc['file'])
    d = SimpleDocTemplate(path, pagesize=A4, leftMargin=20*mm, rightMargin=20*mm, topMargin=18*mm, bottomMargin=20*mm,
                          title=doc['title'], author='BIGSA')
    story = [Image(logo, width=22*mm, height=22*mm*652/696, hAlign='LEFT'), Spacer(1, 6), Paragraph(doc['title'], title), Paragraph(doc['description'], sub)]
    for sec in doc['sections']:
        story.append(Paragraph(sec['title'], h))
        story.append(ListFlowable([ListItem(Paragraph(i.replace('&', '&amp;'), body), leftIndent=12) for i in sec['items']],
                                  bulletType='1', start='1', leftIndent=14, bulletFontSize=9, bulletColor=CLAY))
    d.build(story, onFirstPage=footer, onLaterPages=footer)
    print(path, os.path.getsize(path)//1024, 'KB')

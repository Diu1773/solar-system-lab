"""Build the shared lesson data, eight classroom PDFs, planet CSV and lesson ZIP.

Requires reportlab and Malgun Gothic (Windows). Run from the repository root.
The JSON is the single source for both browser and print lesson content.
"""
import csv
import io
import json
from html import escape
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'lessons' / 'downloads'
DATA = json.loads((ROOT / 'data-sources' / 'lessons.json').read_text(encoding='utf-8'))
URL = 'https://diu1773.github.io/solar-system-lab/'
INK = colors.HexColor('#18394f')
TEAL = colors.HexColor('#13778a')
LIGHT = colors.HexColor('#eef4f8')
LINE = colors.HexColor('#afc4d2')
pdfmetrics.registerFont(TTFont('Malgun', r'C:\Windows\Fonts\malgun.ttf'))
pdfmetrics.registerFont(TTFont('MalgunBold', r'C:\Windows\Fonts\malgunbd.ttf'))
ST = {
    'body': ParagraphStyle('body', fontName='Malgun', fontSize=9.2, leading=14, textColor=INK, wordWrap='CJK', spaceAfter=5),
    'small': ParagraphStyle('small', fontName='Malgun', fontSize=7.5, leading=11.5, textColor=INK, wordWrap='CJK'),
    'cell': ParagraphStyle('cell', fontName='Malgun', fontSize=8.4, leading=12.2, textColor=INK, wordWrap='CJK'),
    'title': ParagraphStyle('title', fontName='MalgunBold', fontSize=20, leading=28, textColor=INK, spaceAfter=12),
    'h2': ParagraphStyle('h2', fontName='MalgunBold', fontSize=11.5, leading=17, textColor=TEAL, spaceBefore=13, spaceAfter=7, keepWithNext=True),
    'label': ParagraphStyle('label', fontName='MalgunBold', fontSize=9, leading=14, textColor=INK, wordWrap='CJK'),
    'kicker': ParagraphStyle('kicker', fontName='MalgunBold', fontSize=8, leading=12, textColor=TEAL, spaceAfter=7),
}


def p(text, style='body'):
    return Paragraph(escape(str(text)).replace('\n', '<br/>'), ST[style])


def link(title, url):
    return Paragraph(f'<link href="{escape(url, quote=True)}" color="#13778a">{escape(title)} ↗</link>', ST['small'])


def table(rows, widths, header=False, font='cell', heights=None, padding=8):
    data = [[v if isinstance(v, Paragraph) else p(v, font) for v in row] for row in rows]
    t = Table(data, colWidths=widths, rowHeights=heights, repeatRows=1 if header else 0, hAlign='LEFT')
    styles = [('GRID', (0, 0), (-1, -1), .5, LINE), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
              ('LEFTPADDING', (0, 0), (-1, -1), 8), ('RIGHTPADDING', (0, 0), (-1, -1), 8),
              ('TOPPADDING', (0, 0), (-1, -1), padding), ('BOTTOMPADDING', (0, 0), (-1, -1), padding)]
    if header:
        styles.append(('BACKGROUND', (0, 0), (-1, 0), LIGHT))
    else:
        styles.append(('BACKGROUND', (0, 0), (0, -1), LIGHT))
    t.setStyle(TableStyle(styles))
    return t


def footer(canvas, doc):
    canvas.saveState()
    w, h = doc.pagesize
    canvas.setStrokeColor(LINE)
    canvas.line(30, 26, w-30, 26)
    canvas.setFillColor(INK)
    canvas.setFont('Malgun', 7)
    canvas.drawString(32, 14, 'SOLAR SYSTEM LAB · 수업 세트 2026.10.10 · '+URL)
    canvas.drawRightString(w-32, 14, str(doc.page))
    canvas.restoreState()


def heading(l, kind):
    return [p('LESSON '+l['number']+' / '+kind+' / 기본 50분', 'kicker'), p(l['title'], 'title')]


def teacher(topic, l):
    w, h = landscape(A4)
    usable = w-64
    story = heading(l, '교사용 수업지도안')
    story += [p('교수·학습 과정안', 'h2'), table([
        ['일시·장소 / 지도교사', '____________________ / ____________________ / ____________________'],
        ['교과·대상 / 단원', DATA['audience']+' / '+l['unit']],
        ['차시·시간 / 조직', '1차시 50분; 심화 별도 30–50분 / '+DATA['organization']],
        ['학습 모형 / 선수 학습', DATA['method']+' / '+l['prior']],
        ['교육과정 연결', l['alignment']],
        ['학습 자료·준비', l['materials']],
    ], [110, usable-110]), p('학습목표', 'h2')]
    story += [p(f'{i+1}. {x}') for i, x in enumerate(l['objectives'])]
    story += [p('자료 확인·수업 전 유의점', 'h2'), p(l['data']['name']+' · '+l['data']['period']), p(l['data']['limits']),
              p('탐구 질문: '+l['question'], 'label'), Spacer(1, 12),
              p('양식 참고: '+DATA['formatReference']['note']+' NASA·교육청의 공식 지도안이 아닌 수업 제안이다. 교과서 판본·쪽수는 교수자 교재에 맞춰 보완한다.', 'small'), PageBreak()]
    story += heading(l, '본시 교수·학습 과정')
    rows = [['단계', '시간', '학습 내용', '교사 활동', '학생 활동', '주요 발문', '자료·유의점', '형성평가']]
    rows += [[s['stage'], str(s['minutes'])+'분', s['content'], s['teacher'], s['student'], s['question'], s['resource'], s['assessment']] for s in l['steps']]
    story += [table(rows, [51, 34, 78, 145, 145, 110, 95, usable-658], header=True), Spacer(1, 12),
              p('총 50분. 측정이 늦어지면 모둠당 표본을 나누어 기록하고 근거 검토를 공동으로 진행한다. 심화 도구는 별도 차시로 운영한다.', 'small'),
              p('출구 질문: '+l['exit'], 'label'), PageBreak()]
    story += heading(l, '평가·지원·자료 출처')
    story += [p('평가 계획 · 10점', 'h2'), p('제출물: '+l['submission']),
              table([['평가 요소', '배점', '충분히 충족', '부분 충족의 예']]+[[r['item'], r['points'], r['full'], r['partial']] for r in l['rubric']], [110, 35, (usable-145)/2, (usable-145)/2], header=True, font='small', padding=5),
              p('충분 충족: 만점 / 부분 충족: 배점의 절반(0.5점 단위) / 미제출·근거 없음: 0점. 정답 수치 일치보다 절차와 근거를 평가한다.', 'small'),
              p('예상 오개념·교사용 지원', 'h2'),
              table([[m['wrong'], m['support']] for m in l['misconceptions']], [usable*.36, usable*.64], font='small', padding=5),
              p('차시 확장', 'h2'), p(l['extension'], 'small'),
              p('관측·처리·출처', 'h2'), p(l['data']['units']+' / '+l['data']['processing'], 'small'), p(l['data']['credit'], 'small'),
              link('실제 자료: '+l['data']['name'], l['data']['url']), Spacer(1, 7)]
    refs = [DATA['formatReference'], DATA['curriculumSource'], *l['references']]
    story += [link(r['title'], r['url']) for r in refs]
    doc = SimpleDocTemplate(str(OUT / (topic+'-teacher.pdf')), pagesize=(w, h), rightMargin=32, leftMargin=32, topMargin=28, bottomMargin=38, title=l['title']+' · 수업지도안', author='Solar System Lab')
    doc.build(story, onFirstPage=footer, onLaterPages=footer)


def writing(label, height):
    t = Table([[p(label, 'label')], ['']], colWidths=[A4[0]-64], rowHeights=[None, height])
    t.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP'), ('BOX', (0,1), (-1,1), .5, LINE),
                          ('TOPPADDING', (0,0), (-1,0), 8), ('BOTTOMPADDING', (0,0), (-1,0), 6)]))
    return t


def student(topic, l):
    usable = A4[0]-64
    story = heading(l, '학생 활동지')
    story += [table([['이름', '________________', '모둠·역할', '________________'], ['학과·학년 / 반', '________________', '활동일', '________________']], [85, usable/2-85, 85, usable/2-85]),
              p(l['question'], 'h2'), p('1. 예측하고 자료 확인하기', 'h2')]
    story += [p(f'{i+1}. {x}', 'small') for i, x in enumerate(l['procedure'])]
    story += [p('자료: '+l['data']['name']+' / '+l['data']['units'], 'small')]
    for f in l['fields'][:2]:
        story.append(writing(f['label'], 48))
    story += [p('2. 측정·비교 기록', 'h2')]
    headers = l['recordColumns']
    story += [table([headers]+[['']*len(headers) for _ in range(l['blankRows'])], [usable/len(headers)]*len(headers), header=True, font='small', heights=[None]+[31]*l['blankRows']),
              p('웹 활동지의 측정값 가져오기를 사용하면 출처·조건이 함께 기록된다. 종이 활동지에는 핵심 값을 쓰고 상세 CSV를 별도로 제출한다.', 'small'), PageBreak()]
    story += heading(l, '학생 활동지 · 해석과 결론')
    story += [p('3. 그래프와 해석', 'h2'), table([['측정 그래프를 붙이거나 그리세요. 축 이름·단위·사용 자료를 표시하세요.'], ['']], [usable], heights=[27, 137], font='small')]
    for f, height in zip(l['fields'][2:], [42, 35, 54, 54]):
        story.append(writing(f['label'], height))
    story += [writing('출구 질문: '+l['exit'], 32), Spacer(1, 10), p('제출 전 확인: '+l['submission'], 'small'),
              p('평가(10점): '+' / '.join(r['item']+' '+str(r['points'])+'점' for r in l['rubric']), 'small'),
              p(l['data']['credit'], 'small'), link('실습실에서 활동지·분석 도구 열기', URL+'#'+topic)]
    doc = SimpleDocTemplate(str(OUT / (topic+'-student.pdf')), pagesize=A4, rightMargin=32, leftMargin=32, topMargin=28, bottomMargin=38, title=l['title']+' · 학생 활동지', author='Solar System Lab')
    doc.build(story, onFirstPage=footer, onLaterPages=footer)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    (ROOT / 'docs' / 'lesson-data.js').write_text('window.LESSON_DATA = '+json.dumps(DATA, ensure_ascii=False, indent=2)+';\n', encoding='utf-8')
    for topic, lesson in DATA['lessons'].items():
        teacher(topic, lesson)
        student(topic, lesson)
        print('PDF pair:', topic)
    c = DATA['planetCatalog']
    buf = io.StringIO(newline='')
    cw = csv.writer(buf, lineterminator='\n')
    cw.writerow(['planet','a_AU','eccentricity','sidereal_T_year','a_source','T_source','a_epoch','retrieved','note'])
    for r in c['rows']:
        cw.writerow([r['name'], r['a'], r['e'], r['T'], c['aSource'], c['periodSource'], c['epoch'], c['retrieved'], c['note'] if r['name']=='지구*' else ''])
    (OUT / 'JPL-inner-planets.csv').write_text(buf.getvalue(), encoding='utf-8-sig')
    guide = '''태양계천문학 수업 세트 · 2026.10.10
네 활동마다 교사용 수업지도안(과정안·평가표·자료 출처)과 학생 활동지를 제공합니다.
기본 활동은 50분, FITS·3D·등가폭 등은 별도 심화 30–50분으로 제안합니다.

실습실: '''+URL+'''
수업 공유·Codex 활용: '''+URL+'''class/
전체 소스·실제 FITS: https://github.com/Diu1773/solar-system-lab

각 탭 → 수업 안내 → 교사용 지도안 / 학생 활동지 / 분석 도구.
분석 도구에서 측정한 후 학생 활동지로 값을 가져오세요.
활동지 글과 기록은 해당 브라우저에만 저장됩니다. JSON 백업·CSV·그래프 PNG·작성 활동지 인쇄를 지원합니다.
이 묶음의 PDF는 빈 활동지입니다. 작성한 결과는 웹 활동지에서 인쇄/PDF로 저장합니다.

자료 범위
태양: NASA/SDO HMI 2017 JPG 실제 영상; 교육용 좌표 보정.
소행성: DAMIT Pallas 1971 실제 측광 155점; CC BY 4.0. SOURCE.txt 유지.
별도 소행성 FITS는 138205 (2000 EZ148); The Schools’ Observatory/LJMU, CC BY-NC 4.0.
스펙트럼: BASS2000 가시광 아틀라스, 원형식 ASCII. 별도 Birr FITS는 전파 자료.
행성: JPL 두 공개 표의 J2000 평균 a·e와 항성 주기; 원시 FITS가 아님.
2체 궤도·타원체·합성 스펙트럼은 교육용 모형이며 관측과 구분합니다.

교과서 판본·쪽수는 해당 교수자의 교재에 맞춰 보완합니다.
경기도교육청 과정안의 구성, NASA·Schools’ Observatory 활동 사례를 참고해 새로 설계한 수업 제안입니다.
공식 NASA·교육부·OpenAI 서비스가 아닙니다. 원문 내용·원 PDF는 재배포하지 않습니다.
'''
    (OUT / 'START-HERE.txt').write_text(guide, encoding='utf-8')
    with ZipFile(OUT / 'solar-system-lesson-sets.zip', 'w', ZIP_DEFLATED, compresslevel=7) as z:
        for f in OUT.glob('*.pdf'):
            z.write(f, f.name)
        for filename in ['JPL-inner-planets.csv', 'START-HERE.txt']:
            z.write(OUT / filename, filename)
        z.write(ROOT / 'data-sources' / 'lessons.json', 'lesson-content/lessons.json')
        for filename in ['pallas-1971.csv','SOURCE.txt']:
            z.write(ROOT / 'docs' / 'class' / 'data' / filename, 'data/'+filename)
        z.write(ROOT / 'docs' / 'class' / 'downloads' / 'prompts.txt', 'Codex-prompts.txt')
    print('Lesson ZIP:', OUT / 'solar-system-lesson-sets.zip')


if __name__ == '__main__':
    main()

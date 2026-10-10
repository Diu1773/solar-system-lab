"""Build classroom CSV, copyable prompts, QR, and narrowly scoped download kits.

Run with: python tools/build_classroom.py
Optional: --offline-html PATH --release-dir PATH
Only the optional QR step needs the qrcode package (python -m pip install qrcode[pil]).
"""
import argparse
import csv
import json
import shutil
from html.parser import HTMLParser
from io import StringIO
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

REPO = Path(__file__).resolve().parents[1]
CLASS = REPO / 'docs' / 'class'
LAB_URL = 'https://diu1773.github.io/solar-system-lab/'
CLASS_URL = LAB_URL + 'class/'


class Prompts(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.items = []
        self.current = None
        self.identifier = ''

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'data-prompt-id' in attrs:
            self.identifier = attrs['data-prompt-id']
        if tag == 'pre' and 'data-prompt' in attrs:
            self.current = []

    def handle_data(self, text):
        if self.current is not None:
            self.current.append(text)

    def handle_endtag(self, tag):
        if tag == 'pre' and self.current is not None:
            self.items.append((self.identifier, ''.join(self.current).strip()))
            self.current = None


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value, encoding='utf-8', newline='\n')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--offline-html', type=Path)
    parser.add_argument('--release-dir', type=Path, default=REPO.parent / 'classroom-release')
    args = parser.parse_args()
    raw = json.loads((REPO / 'data-sources' / 'pallas-lc.json').read_text(encoding='utf-8'))
    selected = [r for r in raw if int(r['LightCurve']['id']) in (26, 27, 28)]
    selected.sort(key=lambda r: int(r['LightCurve']['id']))
    output = StringIO(newline='')
    writer = csv.writer(output, lineterminator='\n')
    writer.writerow(['curve_id', 'JD_light_time_corrected', 'intensity_relative',
                     'sun_x_AU', 'sun_y_AU', 'sun_z_AU',
                     'earth_x_AU', 'earth_y_AU', 'earth_z_AU', 'source_url'])
    counts = {}
    refs = []
    for row in selected:
        curve = row['LightCurve']
        identifier = str(curve['id'])
        points = [line.split() for line in curve['points'].splitlines() if line.strip()]
        if any(len(point) != 8 for point in points):
            raise ValueError('Unexpected DAMIT column count')
        counts[identifier] = len(points)
        for point in points:
            writer.writerow([identifier, *point,
                             f'https://damit.cuni.cz/projects/damit/light_curves/view/{identifier}'])
        refs.append(f"curve_id {identifier}: {curve.get('comment', '')}")
        refs.extend(f"  {r.get('author_short', '')} ({r.get('year', '')}). {r.get('title', '')} {r.get('journal', '')}" for r in row.get('Reference', []))
    if set(counts) != {'26', '27', '28'} or sum(counts.values()) != 155:
        raise ValueError('Expected the classroom 1971 selection (155 points)')
    write(CLASS / 'data' / 'pallas-1971.csv', output.getvalue())
    source = f'''팔라스 실제 측광 · Codex 수업 실습 자료
대상: (2) Pallas / 팔라스
관측 묶음: 1971.11.28–30, curve_id 26·27·28
점 수: {', '.join(k + '=' + str(v) for k, v in counts.items())}; 전체 155점
원자료 수집일: 2026-10-08

출처: DAMIT / Astronomical Institute of Charles University
https://damit.cuni.cz/projects/damit/light_curves/exportAllForAsteroid/101/json
설명: https://damit.cuni.cz/pages/documentation
라이선스: CC BY 4.0, https://creativecommons.org/licenses/by/4.0/
크레딧: Charles University · Josef Ďurech · Vojtěch Sidorin 및 아래 원 관측자
원본 JSON은 공개 저장소의 data-sources/pallas-lc.json에 보존합니다.
이 CSV는 세 회차를 선택해 열 이름·curve_id·source_url을 붙인 발췌 자료입니다.
각 숫자의 원문 표기는 그대로 옮겼습니다. 합성 관측이나 새 오차를 추가하지 않았습니다.

열 설명
curve_id: DAMIT의 관측 회차 식별자. 천체 번호가 아닙니다.
JD_light_time_corrected: 빛 도달 시간 보정 Julian Date, 단위 day.
intensity_relative: 상대 강도 F (scale=0). 절대 플럭스·등급이 아닙니다.
sun_x_AU, sun_y_AU, sun_z_AU: DAMIT 태양 방향 위치 벡터의 세 성분, AU.
earth_x_AU, earth_y_AU, earth_z_AU: DAMIT 지구 방향 위치 벡터의 세 성분, AU.
source_url: 해당 회차의 공개 출처.

첫 그래프를 만들 때
m = -2.5 log10(F), F > 0인 값에만 적용합니다.
위상 = frac[24(JD - JD0) / P], P는 hour, JD0는 선택 자료의 최소 JD.
위상 비교의 첫 실습에서는 회차별 평균 m을 빼고 색을 구분합니다.
이는 기존 실습실의 푸리에·회차별 영점 동시 적합과 다른 처리입니다.
오차 열이 없어 비가중 분석입니다. 이 CSV는 FITS 영상이 아닌 처리된 실제 측광 자료입니다.
주기 후보만으로 복잡하거나 유일한 3D 형상을 확정할 수 없습니다.
FITS 6장의 138205 (2000 EZ148)와 다른 소행성이므로 서로 합쳐 분석하지 않습니다.

원 관측 기록
{chr(10).join(refs)}

수업 안내: {CLASS_URL}
실습실: {LAB_URL}#asteroid
'''
    write(CLASS / 'data' / 'SOURCE.txt', source)
    parsed = Prompts()
    parsed.feed((CLASS / 'index.html').read_text(encoding='utf-8'))
    prompts = dict(parsed.items)
    titles = {'inspect':'1. 자료 먼저 확인', 'build':'2. 광도곡선 첫 도구 만들기',
              'sun-csv':'3. 내 흑점 측정 CSV 분석', 'fits':'4. FITS 헤더와 픽셀',
              'period':'5. 주기 비교 버튼', 'shape':'6. 기존 3D 도구 수정',
              'curriculum':'7. 실제 교재와 연결', 'debug':'8. 오류 수정'}
    prompt_text = '태양계천문학 × Codex · 수업용 요청문\n' + CLASS_URL + '\n\n'
    prompt_text += '파일명과 조건을 자신의 프로젝트에 맞게 바꾸세요. 생성 결과는 원자료와 대조하세요.\n\n'
    prompt_text += '\n\n'.join(titles[identifier] + '\n' + text for identifier, text in parsed.items) + '\n'
    write(CLASS / 'downloads' / 'prompts.txt', prompt_text)
    try:
        import qrcode
    except ImportError:
        if not (CLASS / 'class-qr.png').exists():
            raise SystemExit('QR image missing: install qrcode[pil], or supply class-qr.png')
    else:
        qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M,
                           box_size=10, border=4)
        qr.add_data(CLASS_URL)
        qr.make(fit=True)
        qr.make_image(fill_color='#132b43', back_color='white').save(CLASS / 'class-qr.png')
    image = REPO / 'docs' / 'assets' / '20170708_120000_1024_HMIIC.jpg'
    shutil.copyfile(image, CLASS / 'sun-observation.jpg')
    start = 'Codex에서 이 starter 폴더를 로컬 프로젝트로 여세요.\n먼저 SOURCE.txt와 CSV를 읽은 뒤 아래 순서로 요청합니다.\n\n' + titles['inspect'] + '\n' + prompts['inspect'] + '\n\n' + titles['build'] + '\n' + prompts['build'] + '\n\n수업 안내: ' + CLASS_URL + '\n'
    google = f'''Google Drive·Sites 공유용 문구와 주소

제목: 태양계천문학 × Codex 실습 자료
소개: 태양흑점·소행성·스펙트럼 실습, Codex 따라 하기, 실제 관측 CSV와 복사용 요청문을 모았습니다.
수업 안내: {CLASS_URL}
실습실: {LAB_URL}
전체 소스: https://github.com/Diu1773/solar-system-lab

버튼 이름 예시: 실습실 열기 / Codex 따라 하기 / 실습 키트 받기
수업 키트: {CLASS_URL}downloads/solar-system-lab-class-kit.zip
오프라인 앱: https://github.com/Diu1773/solar-system-lab/releases/download/classroom-2026-10/Solar-System-Lab-offline.zip

Drive: ZIP·QR를 올려 링크와 함께 공유합니다. 파일의 보기 권한을 수업 대상에게 설정합니다.
Sites: 수업 안내·실습실 주소를 버튼으로 연결합니다.
Drive에 저장한 HTML은 내려받아 브라우저로 여는 자료입니다. 실행되는 웹 앱은 위 공개 주소에 있습니다.
'''
    write(CLASS / 'downloads' / 'google-share.txt', google)
    kit_start = f'''태양계천문학 × Codex 수업 실습 키트

가장 간단한 시작: {CLASS_URL}
만든 실습실: {LAB_URL}

체험하기: 웹 주소에서 활동을 선택합니다. 설치·로그인은 필요 없습니다.
Codex로 만들기: starter 폴더를 Codex 로컬 프로젝트로 열고 START.txt의 요청문을 순서대로 사용합니다.
Codex 접근·설정은 자신의 계정에서 준비합니다: https://learn.chatgpt.com/docs/quickstart
안내 보기: guide/index.html을 브라우저로 엽니다. 실습 앱 링크는 인터넷이 필요합니다.
기록하기: worksheet.html을 열어 작성하고 TXT 또는 브라우저 인쇄 메뉴에서 PDF로 저장합니다.
공유하기: class-qr.png 또는 google-share.txt의 문구와 주소를 사용합니다.

포함 자료: 실제 팔라스 1971년 측광 155점, 원자료 설명, 요청문, 활동 기록지, 공유 QR.
FITS 원본과 전체 앱은 이 가벼운 키트에 포함되지 않습니다. 수업 웹 페이지의 전체 소스·오프라인 앱에서 받으세요.
측광 자료의 CC BY 4.0 출처는 starter/SOURCE.txt를 참고하고 재사용할 때 유지하세요.
'''
    guide = (CLASS / 'index.html').read_text(encoding='utf-8')
    kit_guide = guide.replace('href="../#', 'href="' + LAB_URL + '#')
    kit_guide = kit_guide.replace('href="downloads/solar-system-lab-class-kit.zip"', 'href="' + CLASS_URL + 'downloads/solar-system-lab-class-kit.zip"')
    kit_guide = kit_guide.replace('href="../lessons/', 'href="' + LAB_URL + 'lessons/')
    kit_file = CLASS / 'downloads' / 'solar-system-lab-class-kit.zip'
    with ZipFile(kit_file, 'w', ZIP_DEFLATED, compresslevel=7) as archive:
        for filename in ['class.css','class.js','worksheet.html','worksheet.css','class-qr.png','sun-observation.jpg']:
            archive.write(CLASS / filename, 'guide/' + filename)
        archive.writestr('guide/index.html', kit_guide)
        for filename in ['pallas-1971.csv','SOURCE.txt']:
            archive.write(CLASS / 'data' / filename, 'guide/data/' + filename)
        archive.write(CLASS / 'downloads' / 'prompts.txt','guide/downloads/prompts.txt')
        archive.writestr('START-HERE.txt', kit_start)
        archive.writestr('starter/START.txt',start)
        archive.writestr('starter/SOURCE.txt',source)
        archive.write(CLASS / 'data' / 'pallas-1971.csv','starter/data/pallas-1971.csv')
        archive.writestr('prompts.txt',prompt_text)
        archive.writestr('google-share.txt',google)
        archive.writestr('worksheet.html', (CLASS / 'worksheet.html').read_text(encoding='utf-8').replace('href="index.html"', 'href="guide/index.html"'))
        archive.write(CLASS / 'worksheet.css','worksheet.css')
        archive.write(CLASS / 'class-qr.png','class-qr.png')
    if args.offline_html:
        args.release_dir.mkdir(parents=True, exist_ok=True)
        offline_file = args.release_dir / 'Solar-System-Lab-offline.zip'
        offline_guide = guide.replace('href="../#','href="../Solar-System-Lab.html#')
        offline_readme = f'''태양계천문학 실습실 · 오프라인 수업용

압축을 모두 푼 다음 Solar-System-Lab.html을 브라우저로 엽니다.
관측 자료와 FITS 바이트가 포함된 단일 HTML이므로 실습에 인터넷이 필요하지 않습니다.
수업 안내는 class/index.html, 기록지는 class/worksheet.html입니다.
외부 출처·공식 문서·온라인 소스 링크를 여는 데는 인터넷이 필요합니다.
온라인 최신 안내: {CLASS_URL}

소행성 FITS: The Schools’ Observatory / Liverpool John Moores University, CC BY-NC 4.0.
팔라스 광도곡선·문헌 형상: Charles University / DAMIT, CC BY 4.0.
NASA/SDO and the AIA, EVE, and HMI science teams; SunPy sample data;
Birr / e-CALLISTO; BASS2000 / Observatoire de Paris / Delbouille, Roland & Neven (1973).
기타 출처·모형 가정은 앱 화면과 FITS-README.txt에 표시됩니다. 재사용할 때 유지하세요.
교육용 비상업 실습실이며 NASA·OpenAI의 공식 서비스가 아닙니다.
'''
        with ZipFile(offline_file, 'w', ZIP_DEFLATED, compresslevel=7) as archive:
            archive.write(args.offline_html, 'Solar-System-Lab.html')
            archive.writestr('README.txt', offline_readme)
            archive.write(REPO / 'data-sources' / 'FITS-README.md','FITS-README.txt')
            for path in CLASS.rglob('*'):
                if path.is_file() and path.name != 'index.html':
                    archive.write(path, 'class/' + path.relative_to(CLASS).as_posix())
            archive.writestr('class/index.html',offline_guide)
        print('Offline archive:', offline_file, offline_file.stat().st_size, 'bytes')
    print('Classroom observations:', counts)
    print('Classroom kit:', kit_file, kit_file.stat().st_size, 'bytes')


if __name__ == '__main__':
    main()

# Solar System Lab · 태양계천문학 실습실

상단 탭으로 태양흑점, 행성 궤도, 소행성, 스펙트럼과 교육과정 활동을 선택하는 교육용 웹 실습실입니다.

## 주제별 수업 세트 · 2026.10.10

상단 탭은 **태양흑점 분석 활동 / 소행성 밝기 분석 활동 / 태양 스펙트럼 분석 활동 / 행성 궤도 분석 활동**입니다. 각 주제 안에서 수업 안내·교사용 지도안·학생 활동지·분석 도구를 오갈 수 있습니다.

- 기본 50분 과정안: 학습목표, 준비물, 교사·학생 활동, 발문, 시간, 형성평가, 10점 평가표, 오개념 지원.
- 학생 활동지: 예측·자료 확인, 현재 측정값 가져오기, 비교표, 그래프 첨부, 주장·근거·한계 작성.
- 브라우저 저장, JSON 백업·복원, 기록 CSV, 그래프 PNG, 작성 활동지 인쇄/PDF.
- [지도안·활동지 PDF 8개와 자료 ZIP](https://diu1773.github.io/solar-system-lab/lessons/downloads/solar-system-lesson-sets.zip).
- 소행성 3D·FITS, 자기장·전파 FITS, 등가폭은 별도 심화로 운영합니다.

지도안 구성은 경기도교육청의 실제 교수·학습 과정안과 NASA·Schools’ Observatory 활동을 참고해 새로 설계했습니다. 각 지도안에 참고 링크·자료의 단위·처리·한계를 표시합니다. 특정 교과서 판본·쪽수는 교수자 교재에 맞춰 보완해야 합니다.

행성 활동의 공개 값은 JPL의 J2000 평균 a·e 표와 별도의 항성 공전주기 표에서 전사했습니다. 원시 관측 FITS가 아닌 기관 자료입니다. 지구의 a·e는 지구–달 질량중심, T는 지구의 값이라는 근사를 표시합니다. 모형 주기는 케플러 법칙으로 계산되므로 독립 관측 검증으로 해석하지 않습니다.

수업 내용의 원본은 `data-sources/lessons.json`입니다. `python tools/build_lessons.py`는 동일 내용으로 `lesson-data.js`, PDF 8개, JPL CSV와 수업 ZIP을 생성합니다. PDF 생성에는 `reportlab`과 Windows 맑은 고딕 글꼴이 필요합니다.

## 수업에서 공유하기

- **수업 공유실:** https://diu1773.github.io/solar-system-lab/class/
- **실습실:** https://diu1773.github.io/solar-system-lab/
- **Codex 실습 키트:** https://diu1773.github.io/solar-system-lab/class/downloads/solar-system-lab-class-kit.zip
- **오프라인 실습 앱:** https://github.com/Diu1773/solar-system-lab/releases/download/classroom-2026-10/Solar-System-Lab-offline.zip

수업 공유실은 활동별 따라 하기, Codex로 실제 팔라스 CSV를 읽어 첫 도구를 만드는 방법, 복사용 요청문, 브라우저에서 작성·인쇄할 기록지, QR와 자료 출처를 모았습니다. 웹 실습은 설치·로그인 없이 열립니다. Codex 제작 실습에는 본인의 Codex 접근 환경이 필요합니다.

키트의 `starter` 폴더를 Codex 로컬 프로젝트로 열고 `START.txt` 순서대로 요청하면 됩니다. 팔라스 1971년 실제 측광 155점(관측 회차 26: 41점, 27: 91점, 28: 23점)을 발췌했습니다. 원본 수치는 변형 없이 옮기고 출처 열을 붙였습니다. 전체 DAMIT JSON은 `data-sources/pallas-lc.json`에 보존합니다.

전체 소스를 내려받은 뒤 Python이 있다면 저장소에서 `python serve.py`를 실행하고 http://127.0.0.1:4317/class/ 를 엽니다. 실제 FITS 파일을 읽는 전체 앱은 로컬 서버 또는 공개 주소로 여세요. 첫 Codex 도구는 CSV 파일 선택 방식을 사용해 단일 HTML로 만들 수 있습니다.

`python tools/build_classroom.py`는 CSV·요청문·실습 키트를 다시 만듭니다. QR 재생성에는 `qrcode[pil]` 패키지가 필요하며, 패키지가 없을 때는 포함된 QR 이미지를 유지합니다. 공개 배포는 `main`의 `/docs`를 사용합니다.

## 활동

- NASA/SDO 영상에서 흑점 이동과 태양 자전 측정.
- 케플러 법칙의 궤도·면적·주기 모형 비교.
- 실제 팔라스 광도곡선의 주기 찾기와 교육용 3D 타원체 비교·적합.
- DAMIT의 문헌 팔라스 3D 메시 비교.
- 138205 (2000 EZ148)의 실제 FITS 6장: 헤더·픽셀 읽기, 깜빡임, 대상·비교별의 원형 측광.
- HMI 자기장 FITS, Birr 태양 전파 FITS, BASS2000 가시광 스펙트럼 분석.
- 2022 개정 과학과 교육과정과 연결한 탐구·평가 예시.

FITS 영상과 팔라스 광도곡선은 서로 다른 소행성 자료입니다. 타원체 활동은 교육용 비교·적합이며 유일한 3D 형상 역산을 수행하지 않습니다. 문헌 메시 출처와 모형의 가정은 화면에 명시합니다.

## 배포

GitHub Pages의 `main` 브랜치 `/docs` 폴더를 게시합니다. 서버 없이 HTML·CSS·JavaScript로 실행하며 FITS는 선택한 활동에서 원본 파일을 읽습니다. 관측·측광 결과는 브라우저에서 CSV로 저장할 수 있습니다.

## 관측 자료 출처

NASA/SDO and the HMI science team; Charles University / DAMIT (CC BY 4.0); The Schools’ Observatory / Liverpool John Moores University (소행성 FITS: CC BY-NC 4.0); SunPy sample data; BASS2000 / Observatoire de Paris; NASA JPL; NIST.

원본 FITS와 문헌 형상의 출처·라이선스는 [FITS 자료 설명](data-sources/FITS-README.md)과 각 활동의 출처 표시를 참고하세요. 교육용 비상업 실습실이며 NASA·교육부의 공식 서비스가 아닙니다.

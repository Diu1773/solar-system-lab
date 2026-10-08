# Solar System Lab · 태양계천문학 실습실

상단 탭으로 태양흑점, 행성 궤도, 소행성, 스펙트럼과 교육과정 활동을 선택하는 교육용 웹 실습실입니다.

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
# FITS와 형상 원자료

수집일: 2026-10-08. FITS는 영상 재표본화나 형식 변환 없이 원본 바이트로 `dist/fits/`에 보존했습니다. `dist/fits-data.js`에 원본 이름·메타데이터·SHA-256을 기록합니다.

## 소행성 FITS

- 대상: **138205 (2000 EZ148)**, 2025-09-25–26 UTC. LCO 0.4 m, 기기 sq32, rp 필터. 2400×2400 픽셀, BITPIX=16, BSCALE=1, BZERO=32768. 6장.
- [The Schools’ Observatory 원자료](https://www.schoolsobservatory.org/media/1465), [Asteroid Watch 활동](https://www.schoolsobservatory.org/discover/projects/asteroidwatch).
- [원본 ZIP](https://www.schoolsobservatory.org/sites/default/files/138205%20%282000%20EZ148%29.zip). The Schools’ Observatory / Liverpool John Moores University, **CC BY-NC 4.0**.
- ZIP 내부 FITS를 `asteroid-1.fits`–`asteroid-6.fits`로 이름만 바꾸어 저장합니다. 헤더의 DATE-OBS, EXPTIME, 원본 파일명은 보존됩니다. BUNIT이 없으므로 보정된 물리 단위나 ADU 단위를 확정하지 않습니다.
- 팔라스 광도곡선과 **다른 대상**입니다. 6장의 짧은 영상으로 움직임·원형 측광을 연습하며, 이 자료에서 팔라스 모양을 복원했다고 주장하지 않습니다.

## 태양 FITS

- [SDO/HMI 자기장 FITS](https://github.com/sunpy/data/blob/main/sunpy/v1/HMI20110607_063211_los_lowres.fits): 2011-06-07T06:32:11 UTC, 1024×1024, BITPIX=-64, 시선 방향 자기장, BUNIT=Gauss. NASA/SDO and the HMI science team; SunPy sample data에 배포된 저해상도 파일. 2017년 흑점 추적 JPG와 다른 날짜·관측량입니다.
- [Birr 전파 동적 스펙트럼 FITS](https://github.com/sunpy/data/blob/main/sunpy/v1/BIR_20110607_062400_10.fit): 2011-06-07 06:24–06:39 UTC, 3600×200, BITPIX=8, BUNIT=digits, e-CALLISTO / Birr radio spectrometer. 주파수 축이 균등하지 않다는 헤더 설명을 보존합니다. 화면은 원본 픽셀 격자로 표시하며 CDELT2만으로 정밀 주파수를 계산하지 않습니다.
- 원본 배포: [SunPy sample data](https://github.com/sunpy/data/tree/main/sunpy/v1). 가시광 BASS2000 아틀라스는 원형식 ASCII로 별도 보존합니다.

## 팔라스 형상

- [DAMIT Model 101](https://damit.cuni.cz/projects/damit/asteroid_models/view/101), [shape.txt](https://damit.cuni.cz/projects/damit/stored_files/open/10/shape.txt), [spin.txt](https://damit.cuni.cz/projects/damit/generated_files/open/AsteroidModel/101/spin.txt).
- 꼭짓점 1022개, 삼각 면 2040개. 크기 단위 km, 문헌 주기 7.81323 h, 모형 버전 2011-02-20. Torppa et al. (2003), Ďurech et al. (2011). Charles University / DAMIT, CC BY 4.0.
- 문헌 메시를 비교용으로 표시합니다. 앱이 새로 역산한 메시가 아닙니다. 전시용 회전은 특정 관측 시각의 천구 방향을 재현하지 않습니다.

## 재생성

`node fetch-shape-fits.mjs`로 원본 ZIP·태양 FITS·형상 파일을 받습니다. Python의 astropy와 numpy가 있는 환경에서 `python prepare-shape-fits.py`로 ZIP을 풀고 메타데이터·형상 배열을 만듭니다. 원본 ZIP은 큰 중복 파일이어서 Git에서 제외하지만 추출한 FITS 원본은 사이트 소스에 포함됩니다.

FITS 파서는 80문자 카드, 2880바이트 블록과 big-endian 배열을 읽으며 BSCALE·BZERO를 적용합니다. 비압축 영상의 첫 2차원 평면만 표시합니다. 타일 압축 및 표 전용 자료는 지원하지 않습니다. WCS 재투영·천구 북쪽 정렬·연구용 광도 보정은 수행하지 않습니다.

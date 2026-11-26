---
name: ascii-christmas-overlay
description: 웹사이트 화면 위에 눈·글자로 그린 3D 크리스마스트리·별·산타 썰매를 겹쳐 띄운다. React 프로젝트에는 Snow 같은 컴포넌트를, 일반 HTML 사이트에는 script 태그 한 줄을 넣는다. "내 사이트에 눈 내려줘", "크리스마스 장식 넣어줘", "트리 띄워줘" 같은 요청에 쓴다. 장식은 브라우저의 Canvas 2D로 그리며 별도 패키지가 필요 없다.
license: MIT
---

# 웹사이트에 눈·ASCII 트리·별·산타 장식 넣기

사용자의 웹사이트 화면 위에 투명한 층을 겹쳐 눈·트리·별·산타를 띄운다. 아래 글과 버튼은 그대로 보이고 눌린다. 필요한 파일은 이 스킬의 `assets/snow/`에 모두 있으며 설치할 패키지가 없다.

## 순서

1. **프로젝트 종류를 본다.**
   - `package.json`의 `dependencies`나 `devDependencies`에 `react`가 있으면 **React**.
   - 그렇지 않고 `.html` 파일로 된 사이트면 **일반 HTML**.
   - 둘 다 아니거나 애매하면 사용자에게 어느 화면에 넣을지 묻는다.
2. **켤 효과를 정한다.** 사용자가 말한 것만 켠다(「눈」만 말하면 눈만). 「크리스마스 장식」처럼 효과를 고르지 않았으면 눈·트리·별·산타 넷을 기본값으로 켠다.
3. **파일을 복사한다.** 이 스킬 폴더의 `assets/snow/` 전체를
   - React: `src/snow/`로(Next.js App Router는 `app/snow/` 또는 `src/snow/`)
   - 일반 HTML: 사이트 루트의 `snow/`로
   복사한다. 같은 이름의 폴더가 이미 있으면 덮어쓰기 전에 묻는다. 명령 예: `cp -R <이 스킬 폴더>/assets/snow ./snow`(React는 `./src/snow`).
4. **한 곳에 넣는다.**
   - React: 앱의 가장 바깥 컴포넌트(`App.jsx`·`App.tsx`, Next.js는 `app/layout`)의 JSX 끝에 `<Snow />`, `<AsciiTree />`, `<AsciiStars />`, `<AsciiSanta />` 중 고른 것을 넣고 `import { Snow, AsciiTree, AsciiStars, AsciiSanta } from './snow'`(파일 위치에 맞는 경로)를 더한다. Next.js App Router의 서버 컴포넌트에서 쓸 때는 `'use client'`를 첫 줄에 둔 작은 래퍼 컴포넌트를 만들어 그 안에 넣는다.
   - 일반 HTML: 효과를 띄울 페이지의 `</body>` 바로 앞에 `<script type="module" src="snow/start.js"></script>` 한 줄을 넣는다(경로는 페이지 위치에 맞게). 일부만 켜려면 `snow`·`tree`·`stars`·`santa` 네 값을 모두 명시한다. 눈만 요청했다면 `snow/start.js?snow=1&tree=0&stars=0&santa=0`으로 넣는다(생략한 효과는 켜진다).
5. **확인한다.** 프로젝트의 기존 개발 서버나 HTTP 미리보기에서 페이지를 열어 효과가 화면 위에 겹치고 아래 버튼이 눌리는지 본다. 모듈을 `file://`로 열지 않는다. 열어 볼 수 없으면 실행 확인은 미검증으로 남기고, 고친 파일과 기존 서버 실행 방법을 알려 준다.
6. **알린다.** 고친 파일과 넣은 줄, 끄는 방법(React는 넣은 JSX를 제거하고, 일반 HTML은 `snowOverlay.stop()`으로 일시 중단하거나 script 태그를 제거)을 짧게 알려 준다.

## 조절(props·옵션)

React는 props, 일반 HTML은 `start.js` 대신 `snow/snow.js`의 `createSnow(옵션)` 등을 직접 불러 쓴다. 전체 목록과 기본값은 `assets/snow/snow.d.ts`에 있다.

| 효과 | 자주 쓰는 값 |
| --- | --- |
| `<Snow />` | `count`(기본 250), `speed`, `wind`, `size`, `color` |
| `<AsciiTree />` | `rows`, `fontSize`, `align`, `bottom`, `rotate` |
| `<AsciiStars />` | `count`, `shootOnClick`(누르면 별똥별) |
| `<AsciiSanta />` | `every`(간격 초), `duration`(건너는 시간), `path`, `dropOnClick`(누르면 선물) |

## 지킬 것

- 네트워크 요청·분석·추적 코드를 더하지 않는다. 이 효과는 화면에만 그린다.
- 기기의 「동작 줄이기」 설정이면 효과는 멈춘 한 장면만 그린다. 이 동작을 끄지 않는다.
- 흰 배경 사이트에서는 흰 눈이 잘 안 보인다. 그럴 땐 `color`를 바꾸자고 제안한다.

## 한계

- 데스크톱 Chromium에서 확인했다. 실제 휴대폰과 Firefox·Safari는 확인하지 않았다.
- 이 스킬 판은 Canvas 2D만 쓴다. 눈의 `renderer`를 지정해야 한다면 `canvas`를 쓴다. `webgpu` 강제 지정은 지원하지 않는다.
- Next.js App Router의 client 래퍼 방법은 안내에 포함하지만 실제 Next.js 프로젝트 실행은 확인하지 않았다.

## 실패와 종료

- 대상 페이지나 프레임워크가 불분명하면 파일을 고치기 전에 확인한다. 같은 이름의 폴더가 있으면 기존 파일을 보존하고 복사 위치를 정한다.
- import·CSP·Canvas 오류가 나면 원인을 보고하고 기존 페이지가 동작하도록 이번에 넣은 줄을 되돌린다. 사이트의 보안 설정을 임의로 완화하지 않는다.
- 완료: 요청한 효과가 보이고, 아래 버튼을 누를 수 있고, 제거 뒤 캔버스가 남지 않는 것을 확인했다. 실행하지 못했으면 파일 수정과 실행 검증을 구분해 보고한다.

// web/js/app.js
import { ShapeSimulator } from './simulator.js';
import { BlueprintGenerator } from './blueprint.js';
import { MathQuiz } from './quiz.js';
import { DiyGuide } from './guide.js';

document.addEventListener('DOMContentLoaded', () => {
  // 모듈 인스턴스 생성
  const simulator = new ShapeSimulator('canvas3d-container');
  const blueprint = new BlueprintGenerator('blueprint-preview');
  const guide = new DiyGuide('guide-container');

  const quiz = new MathQuiz('quiz-container', (action) => {
    if (action === 'correct') {
      // 퀴즈 정답 시 3D로 도형 완성 세레모니 애니메이션
      let p = 0;
      const interval = setInterval(() => {
        p += 0.05;
        if (p >= 1) {
          p = 1;
          clearInterval(interval);
        }
        updateAllProgress(p);
      }, 20);
    }
  });

  guide.render();
  blueprint.render();
  quiz.render();

  // 도형 메타 정보
  const shapeInfoData = {
    cube: {
      name: '직육면체 / 정육면체 (Cube)',
      grade: '초등 5-2 직육면체',
      faces: '면 6개 (합동인 정사각형)',
      edges: '모서리 12개',
      vertices: '꼭짓점 8개',
      desc: '십자형 전개도에서 마주보는 밑면 1개를 고정하고 양쪽 실을 앞으로 당기면 좌우 옆면과 윗면이 90도로 꺾여 올라와 순식간에 상자가 닫힙니다.'
    },
    prism: {
      name: '삼각기둥 (Triangular Prism)',
      grade: '초등 6-1 각기둥과 각뿔',
      faces: '면 5개 (직사각형 3개 + 삼각형 2개)',
      edges: '모서리 9개',
      vertices: '꼭짓점 6개',
      desc: '직사각형 옆면 3개가 나란히 이어지고 양쪽에 정삼각형 밑면이 위치합니다. 실을 당기면 텐트 지붕이 닫히듯 순식간에 3면이 결합합니다.'
    },
    cylinder: {
      name: '원기둥 (Cylinder)',
      grade: '초등 6-2 원기둥, 원뿔, 구',
      faces: '면 3개 (직사각형 1개 + 원 2개)',
      edges: '모서리 2개 (곡선)',
      vertices: '꼭짓점 0개',
      desc: '직사각형 옆면의 양 끝 타공 라인에 실을 교차로 꿰어 당기면 직사각형이 둥글게 말리며 위아래 원형 뚜껑과 완벽히 결합합니다. (가로길이 = 2×π×r)'
    },
    pyramid: {
      name: '육각뿔 (Hexagonal Pyramid)',
      grade: '초등 6-1 각기둥과 각뿔',
      faces: '면 7개 (정육각형 1개 + 삼각형 6개)',
      edges: '모서리 12개',
      vertices: '꼭짓점 7개',
      desc: '중앙의 정육각형 밑면 둘레에 6개의 삼각형이 별(Star) 모양으로 펼쳐진 전개도입니다. 꼭짓점들을 연결한 링 실을 위로 당기면 6개 모서리가 하나의 상단 꼭짓점으로 모입니다.'
    }
  };

  // State
  let currentShape = 'cube';
  let currentMode = 'sim'; // 'sim' | 'quiz' | 'blueprint' | 'guide'

  // DOM Elements
  const shapeTabs = document.querySelectorAll('.shape-tab-btn');
  const modeTabs = document.querySelectorAll('.mode-tab-btn');
  const modePanels = {
    sim: document.getElementById('panel-sim'),
    quiz: document.getElementById('panel-quiz'),
    blueprint: document.getElementById('panel-blueprint'),
    guide: document.getElementById('panel-guide')
  };

  const pullSlider = document.getElementById('pull-slider');
  const pullPercentage = document.getElementById('pull-percentage');
  const pullHandle = document.getElementById('pull-handle');
  const pullStringVis = document.getElementById('pull-string-vis');

  const btnResetCam = document.getElementById('btn-reset-cam');
  const btnWireframe = document.getElementById('btn-wireframe');
  const btnShadow = document.getElementById('btn-shadow');
  const btnAutoPlay = document.getElementById('btn-autoplay');

  // 도형 변경 함수
  function switchShape(shapeKey) {
    currentShape = shapeKey;

    shapeTabs.forEach(tab => {
      if (tab.dataset.shape === shapeKey) {
        tab.className = 'shape-tab-btn px-4 py-2 text-sm font-bold rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200 transition-all';
      } else {
        tab.className = 'shape-tab-btn px-4 py-2 text-sm font-medium rounded-xl text-slate-600 hover:bg-slate-100 transition-all';
      }
    });

    simulator.setShape(shapeKey);
    blueprint.setShape(shapeKey);
    quiz.setShape(shapeKey);

    updateAllProgress(0);
    updateShapeInfo();
  }

  // 모드 변경 함수
  function switchMode(modeKey) {
    currentMode = modeKey;

    modeTabs.forEach(tab => {
      if (tab.dataset.mode === modeKey) {
        tab.className = 'mode-tab-btn px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white transition-all';
      } else {
        tab.className = 'mode-tab-btn px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition-all';
      }
    });

    Object.keys(modePanels).forEach(k => {
      if (k === modeKey) {
        modePanels[k].classList.remove('hidden');
      } else {
        modePanels[k].classList.add('hidden');
      }
    });

    if (modeKey === 'blueprint') {
      blueprint.render();
    }
  }

  // 슬라이더 및 시뮬레이터 진행도 동기화
  function updateAllProgress(val) {
    const p = Math.max(0, Math.min(1, val));
    pullSlider.value = Math.round(p * 100);
    pullPercentage.textContent = `${Math.round(p * 100)}%`;
    simulator.setProgress(p);

    // 손잡이 위치 및 가상 실 길이 시각화 (당김 제스처 효과)
    const pullOffset = p * 60; // px
    pullHandle.style.transform = `translateY(${pullOffset}px)`;
    pullStringVis.style.height = `${40 + pullOffset}px`;
  }

  function updateShapeInfo() {
    const info = shapeInfoData[currentShape];
    if (!info) return;

    document.getElementById('info-title').textContent = info.name;
    document.getElementById('info-grade').textContent = info.grade;
    document.getElementById('info-faces').textContent = info.faces;
    document.getElementById('info-edges').textContent = info.edges;
    document.getElementById('info-vertices').textContent = info.vertices;
    document.getElementById('info-desc').textContent = info.desc;
  }

  // 이벤트 바인딩
  shapeTabs.forEach(tab => {
    tab.addEventListener('click', () => switchShape(tab.dataset.shape));
  });

  modeTabs.forEach(tab => {
    tab.addEventListener('click', () => switchMode(tab.dataset.mode));
  });

  pullSlider.addEventListener('input', (e) => {
    updateAllProgress(parseFloat(e.target.value) / 100);
  });

  // PULL 손잡이 드래그 제스처 지원
  let isDragging = false;
  let startY = 0;
  let startVal = 0;

  pullHandle.addEventListener('pointerdown', (e) => {
    isDragging = true;
    startY = e.clientY;
    startVal = parseFloat(pullSlider.value);
    pullHandle.setPointerCapture(e.pointerId);
  });

  pullHandle.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dy = e.clientY - startY;
    const deltaP = (dy / 100) * 100; // 100px 당기면 100%
    const newVal = Math.max(0, Math.min(100, startVal + deltaP));
    updateAllProgress(newVal / 100);
  });

  pullHandle.addEventListener('pointerup', (e) => {
    isDragging = false;
    try { pullHandle.releasePointerCapture(e.pointerId); } catch (_) {}
  });

  // 3D 뷰어 툴바 버튼 이벤트
  btnResetCam.addEventListener('click', () => simulator.resetCamera());

  let wireframeActive = false;
  btnWireframe.addEventListener('click', () => {
    wireframeActive = !wireframeActive;
    btnWireframe.classList.toggle('bg-indigo-100', wireframeActive);
    simulator.setWireframe(wireframeActive);
  });

  let shadowActive = false;
  btnShadow.addEventListener('click', () => {
    shadowActive = !shadowActive;
    btnShadow.classList.toggle('bg-amber-100', shadowActive);
    simulator.setShadowMode(shadowActive);
  });

  btnAutoPlay.addEventListener('click', () => {
    const isPlaying = simulator.toggleAutoPlay((p) => {
      pullSlider.value = Math.round(p * 100);
      pullPercentage.textContent = `${Math.round(p * 100)}%`;
      const pullOffset = p * 60;
      pullHandle.style.transform = `translateY(${pullOffset}px)`;
      pullStringVis.style.height = `${40 + pullOffset}px`;
    });
    btnAutoPlay.classList.toggle('bg-rose-100', isPlaying);
    btnAutoPlay.innerHTML = isPlaying ? `<span>⏸</span> 정지` : `<span>▶</span> 자동재생`;
  });

  // 도안 옵션 체크박스
  document.getElementById('bp-layer-cut')?.addEventListener('change', (e) => blueprint.setLayer('cut', e.target.checked));
  document.getElementById('bp-layer-fold')?.addEventListener('change', (e) => blueprint.setLayer('fold', e.target.checked));
  document.getElementById('bp-layer-punch')?.addEventListener('change', (e) => blueprint.setLayer('punch', e.target.checked));
  document.getElementById('bp-layer-thread')?.addEventListener('change', (e) => blueprint.setLayer('thread', e.target.checked));

  document.getElementById('btn-download-svg')?.addEventListener('click', () => blueprint.downloadSVG());
  document.getElementById('btn-print-bp')?.addEventListener('click', () => blueprint.printBlueprint());

  // 초기화
  switchShape('cube');
  switchMode('sim');
});

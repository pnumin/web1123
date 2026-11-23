// web/js/quiz.js
export class MathQuiz {
  constructor(containerId, onAction) {
    this.container = document.getElementById(containerId);
    this.onAction = onAction; // 퀴즈 정답 시 3D 시뮬레이터와 상호작용
    this.currentShape = 'cube';
    this.currentQuestionIdx = 0;

    this.quizBank = {
      cube: [
        {
          grade: '초등 5학년 2학기 [직육면체]',
          q: '실을 끝까지 당겼을 때, 파란색 [밑면]과 마주보는(평행한) 면은 무엇일까요?',
          options: ['앞면', '윗면(뚜껑)', '좌측면', '뒷면'],
          answer: 1,
          explain: '마주보는 두 밑면은 서로 평행하며 절대 만나지 않습니다! 실을 당기면 윗면이 90도로 꺾여 바닥 밑면과 평행해집니다.'
        },
        {
          grade: '초등 5학년 2학기 [직육면체]',
          q: '정육면체 전개도에서 만나는 두 모서리의 길이는 어떠해야 할까요?',
          options: ['서로 길이가 달라야 한다', '항상 길이가 같아야 한다', '비율이 2:1이어야 한다', '상관없다'],
          answer: 1,
          explain: '접었을 때 꼭 들어맞으려면 서로 맞닿는 모서리의 길이가 반드시 같아야 합니다!'
        }
      ],
      prism: [
        {
          grade: '초등 6학년 1학기 [각기둥과 각뿔]',
          q: '삼각기둥의 밑면은 2개이며 무슨 모양일까요?',
          options: ['직사각형', '정삼각형', '오각형', '원'],
          answer: 1,
          explain: '삼각기둥은 마주보는 두 밑면이 합동인 삼각형이며, 옆면은 3개의 직사각형으로 이루어져 있습니다.'
        },
        {
          grade: '초등 6학년 1학기 [각기둥과 각뿔]',
          q: '실을 당겨 삼각기둥을 완성하면 꼭짓점은 모두 몇 개가 될까요?',
          options: ['4개', '5개', '6개', '8개'],
          answer: 2,
          explain: '삼각기둥의 꼭짓점 수는 (밑면의 변의 수 3 × 2) = 6개입니다!'
        }
      ],
      cylinder: [
        {
          grade: '초등 6학년 2학기 [원기둥, 원뿔, 구]',
          q: '원기둥 옆면인 직사각형의 [가로 길이]는 밑면인 원의 무엇과 완벽히 일치해야 할까요?',
          options: ['원의 지름', '원의 넓이', '원의 원주(둘레)', '원의 반지름'],
          answer: 2,
          explain: '옆면이 둥글게 말려 원형 밑면을 딱 맞게 감싸야 하므로 [옆면 가로길이 = 밑면 원의 둘레(2 × π × r)]입니다!'
        }
      ],
      pyramid: [
        {
          grade: '초등 6학년 1학기 [각기둥과 각뿔]',
          q: '육각뿔의 옆면 삼각형 6개의 꼭짓점은 실을 당기면 어디로 모일까요?',
          options: ['바닥 중심점', '하늘을 향한 하나의 꼭짓점', '밑면의 각 모서리', '모이지 않는다'],
          answer: 1,
          explain: '각뿔은 모든 옆면이 하나의 공통된 꼭짓점(각뿔의 꼭짓점)으로 모이는 웅장한 구조를 가집니다.'
        }
      ]
    };
  }

  setShape(shapeKey) {
    this.currentShape = shapeKey;
    this.currentQuestionIdx = 0;
    this.render();
  }

  render() {
    if (!this.container) return;
    const questions = this.quizBank[this.currentShape] || [];
    const item = questions[this.currentQuestionIdx];

    if (!item) {
      this.container.innerHTML = `<div class="p-4 text-center text-slate-500">이 도형의 퀴즈를 준비 중입니다.</div>`;
      return;
    }

    let cylinderCalcHtml = '';
    if (this.currentShape === 'cylinder') {
      cylinderCalcHtml = `
        <div class="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
          <h4 class="font-bold text-indigo-900 text-sm flex items-center gap-1">
            <span>📐</span> 원기둥 원주 공식 실증 계산기
          </h4>
          <p class="text-xs text-indigo-700 mt-1">밑면 반지름을 바꾸면 전개도 옆면 가로 길이가 어떻게 결정되는지 확인해보세요!</p>
          <div class="mt-3 flex items-center gap-3">
            <label class="text-xs font-semibold text-slate-700">밑면 반지름(r):</label>
            <input type="range" id="calc-radius" min="1.5" max="4.0" step="0.1" value="2.86" class="w-32">
            <span id="calc-radius-val" class="text-xs font-mono font-bold text-indigo-600">2.86 cm</span>
          </div>
          <div class="mt-2 text-xs font-mono bg-white p-2 rounded border border-indigo-100 text-slate-700">
            공식: 2 × 3.14 × <span id="calc-r-text">2.86</span> = <span id="calc-result" class="text-indigo-600 font-bold">18.0</span> cm (옆면 가로길이)
          </div>
        </div>
      `;
    }

    this.container.innerHTML = `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
            ${item.grade}
          </span>
          <span class="text-xs text-slate-400 font-medium">Q ${this.currentQuestionIdx + 1} / ${questions.length}</span>
        </div>

        <h3 class="text-base font-bold text-slate-800 leading-snug">
          ${item.q}
        </h3>

        <div class="space-y-2 mt-3" id="quiz-options">
          ${item.options.map((opt, idx) => `
            <button data-idx="${idx}" class="quiz-opt-btn w-full text-left px-4 py-2.5 rounded-lg border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 text-sm font-medium text-slate-700 transition flex items-center justify-between">
              <span>${idx + 1}. ${opt}</span>
              <span class="check-icon opacity-0">✓</span>
            </button>
          `).join('')}
        </div>

        <div id="quiz-feedback" class="hidden p-3 rounded-lg text-sm mt-3"></div>

        ${questions.length > 1 ? `
          <div class="flex justify-end gap-2 pt-2">
            <button id="btn-next-quiz" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition">
              다음 문제 →
            </button>
          </div>
        ` : ''}

        ${cylinderCalcHtml}
      </div>
    `;

    this.bindEvents(item, questions);
  }

  bindEvents(item, questions) {
    const btns = this.container.querySelectorAll('.quiz-opt-btn');
    const feedback = this.container.querySelector('#quiz-feedback');

    btns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const selected = parseInt(btn.dataset.idx);
        btns.forEach(b => b.disabled = true);

        if (selected === item.answer) {
          btn.classList.add('bg-emerald-50', 'border-emerald-500', 'text-emerald-700');
          feedback.className = 'p-3 rounded-lg text-sm mt-3 bg-emerald-50 border border-emerald-200 text-emerald-800 block';
          feedback.innerHTML = `<strong>🎉 정답입니다!</strong><br><span class="text-xs mt-1 block">${item.explain}</span>`;
          if (this.onAction) this.onAction('correct');
        } else {
          btn.classList.add('bg-rose-50', 'border-rose-500', 'text-rose-700');
          btns[item.answer].classList.add('bg-emerald-50', 'border-emerald-500', 'text-emerald-700');
          feedback.className = 'p-3 rounded-lg text-sm mt-3 bg-rose-50 border border-rose-200 text-rose-800 block';
          feedback.innerHTML = `<strong>💡 아쉬워요! 정답은 ${item.answer + 1}번입니다.</strong><br><span class="text-xs mt-1 block">${item.explain}</span>`;
        }
      });
    });

    const nextBtn = this.container.querySelector('#btn-next-quiz');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.currentQuestionIdx = (this.currentQuestionIdx + 1) % questions.length;
        this.render();
      });
    }

    // 원기둥 계산기 이벤트
    const calcRadius = this.container.querySelector('#calc-radius');
    if (calcRadius) {
      calcRadius.addEventListener('input', (e) => {
        const r = parseFloat(e.target.value);
        const w = (2 * 3.14 * r).toFixed(1);
        this.container.querySelector('#calc-radius-val').textContent = `${r} cm`;
        this.container.querySelector('#calc-r-text').textContent = `${r}`;
        this.container.querySelector('#calc-result').textContent = `${w}`;
      });
    }
  }
}

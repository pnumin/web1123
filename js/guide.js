// web/js/guide.js
export class DiyGuide {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="space-y-6">
        <!-- 준비물 체크리스트 -->
        <div class="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
          <h4 class="font-bold text-amber-900 text-sm flex items-center gap-1.5 mb-2.5">
            <span>📦</span> DIY 필수 준비물 체크리스트
          </h4>
          <ul class="text-xs text-amber-900/80 space-y-1.5 list-disc list-inside">
            <li><strong>종이:</strong> 180g~220g 도화지/색지 (일반 A4는 힘이 없어 무너지므로 빳빳한 종이 필수)</li>
            <li><strong>끈(실):</strong> 털실, 면끈, 지끈 또는 얇은 운동화끈 (1.5~2mm 굵기 추천)</li>
            <li><strong>타공 도구:</strong> 1구 펀치 (가장 편리) 또는 송곳</li>
            <li><strong>제작 도구:</strong> 자(30cm), 가위/칼, 다 쓴 볼펜/칼등 (접는 선 누름용), 투명테이프</li>
          </ul>
        </div>

        <!-- 5단계 제작 스텝 -->
        <div>
          <h4 class="font-bold text-slate-800 text-sm mb-3 flex items-center gap-1.5">
            <span>✂️</span> 30분 완성 5단계 제작 가이드
          </h4>
          <div class="space-y-3">
            <div class="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
              <div class="flex items-center gap-2 mb-1">
                <span class="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">1</span>
                <span class="text-xs font-bold text-slate-800">전개도 작도 및 정밀 재단</span>
              </div>
              <p class="text-xs text-slate-600 pl-7">도화지에 실측 치수를 그린 후 외곽선을 따라 오립니다. (풀칠 날개는 필요 없습니다!)</p>
            </div>

            <div class="p-3 bg-indigo-50/50 border border-indigo-200 rounded-lg shadow-sm">
              <div class="flex items-center gap-2 mb-1">
                <span class="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">2</span>
                <span class="text-xs font-bold text-indigo-900">접는 선 누르기 (Scoring) ★가장 중요!</span>
              </div>
              <p class="text-xs text-indigo-800 pl-7">접히는 모든 모서리 안쪽을 '다 쓴 볼펜'이나 '자+칼등'으로 꾹 눌러 접힘 길을 내줍니다. 이 작업을 거쳐야 실을 당길 때 구겨지지 않고 칼같이 접힙니다.</p>
            </div>

            <div class="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
              <div class="flex items-center gap-2 mb-1">
                <span class="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">3</span>
                <span class="text-xs font-bold text-slate-800">꼭짓점 및 연결부 타공 (Punching)</span>
              </div>
              <p class="text-xs text-slate-600 pl-7">모서리가 만나는 외곽 꼭짓점 안쪽 5~7mm 지점에 1구 펀치로 구멍을 뚫습니다.</p>
            </div>

            <div class="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
              <div class="flex items-center gap-2 mb-1">
                <span class="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">4</span>
                <span class="text-xs font-bold text-slate-800">실 꿰기 (Threading Pattern)</span>
              </div>
              <p class="text-xs text-slate-600 pl-7">기둥형은 좌우 대칭으로 지그재그 통과, 뿔형은 꼭짓점들을 링(Ring) 형태로 둘러 뀁니다.</p>
            </div>

            <div class="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
              <div class="flex items-center gap-2 mb-1">
                <span class="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">5</span>
                <span class="text-xs font-bold text-slate-800">바닥 고정 및 당김 손잡이(PULL) 완성</span>
              </div>
              <p class="text-xs text-slate-600 pl-7">기준이 되는 밑면 1개를 받침 보드에 테이프로 고정하고 실 끝에 종이 조각 'PULL' 라벨을 붙이면 완성!</p>
            </div>
          </div>
        </div>

        <!-- 실패 없는 꿀팁 2가지 -->
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <h4 class="font-bold text-emerald-900 text-sm flex items-center gap-1.5 mb-2">
            <span>💡</span> 실패 없는 DIY 제작 핵심 꿀팁
          </h4>
          <div class="space-y-2 text-xs text-emerald-900">
            <div>
              <strong>1. 구멍 찢어짐 방지:</strong> 펀치로 뚫기 전 구멍 위치에 <strong>투명 스카치테이프를 앞뒤로 미리 붙인 후</strong> 펀칭하면 강하게 잡아당겨도 절대 찢어지지 않습니다!
            </div>
            <div>
              <strong>2. 부드러운 슬라이딩:</strong> 실 표면이 매끄러운 <strong>코팅 끈</strong>이나 <strong>왁스 코팅사</strong>를 쓰면 마찰 없이 매끄럽게 솟아오릅니다.
            </div>
          </div>
        </div>

        <!-- 3가지 심화 놀이 -->
        <div class="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <h4 class="font-bold text-purple-900 text-sm flex items-center gap-1.5 mb-2">
            <span>✨</span> 200% 활용하는 3가지 심화 놀이
          </h4>
          <ul class="text-xs text-purple-900 space-y-1.5 list-disc list-inside">
            <li><strong>깜짝 팝업 보물상자:</strong> 도형 밑면 위에 작은 젤리나 피규어를 숨겨두고 실을 늦추어 덮었다가 당겨서 여는 마술 놀이</li>
            <li><strong>그림자 탐정 놀이:</strong> 불을 끄고 스마트폰 손전등을 비추어 평면일 때와 입체일 때의 그림자 변화 관찰</li>
            <li><strong>나만의 컬러 패턴 디자인:</strong> 각 면에 서로 다른 색과 무늬를 칠한 뒤 접혔을 때 어떤 면들이 이웃하는지 탐구</li>
          </ul>
        </div>
      </div>
    `;
  }
}

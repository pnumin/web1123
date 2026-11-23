// web/js/blueprint.js
export class BlueprintGenerator {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentShape = 'cube';
    this.showCut = true;
    this.showFold = true;
    this.showPunch = true;
    this.showThread = true;

    // 도형별 기본 치수 (cm 단위)
    this.dimensions = {
      cube: { size: 5 },
      prism: { width: 5, length: 8 },
      cylinder: { width: 18, height: 9, radius: 2.86 },
      pyramid: { radius: 4.5, slant: 8 }
    };
  }

  setShape(shapeKey) {
    this.currentShape = shapeKey;
    this.render();
  }

  setLayer(layerName, visible) {
    if (layerName === 'cut') this.showCut = visible;
    if (layerName === 'fold') this.showFold = visible;
    if (layerName === 'punch') this.showPunch = visible;
    if (layerName === 'thread') this.showThread = visible;
    this.render();
  }

  updateDimension(key, value) {
    if (this.dimensions[this.currentShape]) {
      this.dimensions[this.currentShape][key] = parseFloat(value);
      if (this.currentShape === 'cylinder') {
        if (key === 'width') {
          this.dimensions.cylinder.radius = parseFloat((value / (2 * Math.PI)).toFixed(2));
        } else if (key === 'radius') {
          this.dimensions.cylinder.width = parseFloat((2 * Math.PI * value).toFixed(1));
        }
      }
      this.render();
    }
  }

  render() {
    if (!this.container) return;
    let svgContent = '';

    switch (this.currentShape) {
      case 'cube':
        svgContent = this.generateCubeSVG();
        break;
      case 'prism':
        svgContent = this.generatePrismSVG();
        break;
      case 'cylinder':
        svgContent = this.generateCylinderSVG();
        break;
      case 'pyramid':
        svgContent = this.generatePyramidSVG();
        break;
    }

    this.container.innerHTML = svgContent;
  }

  // 1. 정육면체 십자형 전개도 SVG
  generateCubeSVG() {
    const s = this.dimensions.cube.size * 20; // 픽셀 스케일
    const ox = 250;
    const oy = 250;

    const cutColor = this.showCut ? '#1e293b' : 'none';
    const foldColor = this.showFold ? '#4f46e5' : 'none';
    const punchColor = this.showPunch ? '#ef4444' : 'none';
    const threadColor = this.showThread ? '#0284c7' : 'none';

    return `
      <svg viewBox="0 0 500 500" class="w-full h-full max-h-[460px] mx-auto bg-white border border-slate-200 rounded-lg shadow-inner">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" stroke-width="1"/>
          </pattern>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#0284c7" />
          </marker>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        <!-- 6개 면 채우기 -->
        <g fill="#eff6ff" fill-opacity="0.6">
          <rect x="${ox - s/2}" y="${oy - s/2}" width="${s}" height="${s}" /> <!-- 밑면(중앙) -->
          <rect x="${ox - s/2}" y="${oy - 1.5*s}" width="${s}" height="${s}" /> <!-- 뒷면 -->
          <rect x="${ox - s/2}" y="${oy + s/2}" width="${s}" height="${s}" /> <!-- 앞면 -->
          <rect x="${ox - s/2}" y="${oy + 1.5*s}" width="${s}" height="${s}" /> <!-- 윗면(뚜껑) -->
          <rect x="${ox - 1.5*s}" y="${oy - s/2}" width="${s}" height="${s}" /> <!-- 좌측면 -->
          <rect x="${ox + s/2}" y="${oy - s/2}" width="${s}" height="${s}" /> <!-- 우측면 -->
        </g>

        <!-- [외곽선] 자르는 선 -->
        <path d="
          M ${ox - s/2} ${oy - 1.5*s}
          H ${ox + s/2}
          V ${oy - s/2}
          H ${ox + 1.5*s}
          V ${oy + s/2}
          H ${ox + s/2}
          V ${oy + 2.5*s}
          H ${ox - s/2}
          V ${oy + s/2}
          H ${ox - 1.5*s}
          V ${oy - s/2}
          H ${ox - s/2}
          Z
        " fill="none" stroke="${cutColor}" stroke-width="2.5" />

        <!-- [접는 선] 점선 누르기 (Scoring) -->
        <g stroke="${foldColor}" stroke-width="2" stroke-dasharray="5,4">
          <line x1="${ox - s/2}" y1="${oy - s/2}" x2="${ox + s/2}" y2="${oy - s/2}" />
          <line x1="${ox - s/2}" y1="${oy + s/2}" x2="${ox + s/2}" y2="${oy + s/2}" />
          <line x1="${ox - s/2}" y1="${oy + 1.5*s}" x2="${ox + s/2}" y2="${oy + 1.5*s}" />
          <line x1="${ox - s/2}" y1="${oy - s/2}" x2="${ox - s/2}" y2="${oy + s/2}" />
          <line x1="${ox + s/2}" y1="${oy - s/2}" x2="${ox + s/2}" y2="${oy + s/2}" />
        </g>

        <!-- [타공 위치] 펀칭 구멍 -->
        <g fill="${punchColor}" stroke="#b91c1c" stroke-width="1.5">
          <circle cx="${ox - s/2 + 10}" cy="${oy + 2.5*s - 10}" r="5" />
          <circle cx="${ox + s/2 - 10}" cy="${oy + 2.5*s - 10}" r="5" />
          <circle cx="${ox - 1.5*s + 10}" cy="${oy - s/2 + 10}" r="5" />
          <circle cx="${ox + 1.5*s - 10}" cy="${oy - s/2 + 10}" r="5" />
        </g>

        <!-- [실 꿰기 경로] -->
        <g stroke="${threadColor}" stroke-width="2" stroke-dasharray="3,3" fill="none" marker-end="url(#arrow)">
          <path d="M ${ox - s/2 + 10} ${oy + 2.5*s - 10} Q ${ox - s} ${oy + s} ${ox - 1.5*s + 10} ${oy - s/2 + 10}" />
          <path d="M ${ox + s/2 - 10} ${oy + 2.5*s - 10} Q ${ox + s} ${oy + s} ${ox + 1.5*s - 10} ${oy - s/2 + 10}" />
        </g>

        <!-- 면 이름 레이블 -->
        <text x="${ox}" y="${oy + 5}" text-anchor="middle" font-size="12" fill="#475569" font-weight="bold">밑면(바닥고정)</text>
        <text x="${ox}" y="${oy + s + 5}" text-anchor="middle" font-size="11" fill="#64748b">앞면</text>
        <text x="${ox}" y="${oy + 2*s + 5}" text-anchor="middle" font-size="11" fill="#64748b">윗면 (PULL)</text>
        <text x="${ox}" y="${oy - s + 5}" text-anchor="middle" font-size="11" fill="#64748b">뒷면</text>
        <text x="${ox - s}" y="${oy + 5}" text-anchor="middle" font-size="11" fill="#64748b">왼쪽면</text>
        <text x="${ox + s}" y="${oy + 5}" text-anchor="middle" font-size="11" fill="#64748b">오른쪽면</text>
      </svg>
    `;
  }

  // 2. 삼각기둥 전개도 SVG
  generatePrismSVG() {
    const w = this.dimensions.prism.width * 18;
    const l = this.dimensions.prism.length * 18;
    const triH = (Math.sqrt(3) / 2) * w;
    const ox = 250;
    const oy = 250;

    const cutColor = this.showCut ? '#1e293b' : 'none';
    const foldColor = this.showFold ? '#4f46e5' : 'none';
    const punchColor = this.showPunch ? '#ef4444' : 'none';

    return `
      <svg viewBox="0 0 500 500" class="w-full h-full max-h-[460px] mx-auto bg-white border border-slate-200 rounded-lg shadow-inner">
        <!-- 배경 그리드 -->
        <rect width="100%" height="100%" fill="#fafafa" />

        <!-- 3개 직사각형 옆면 + 2개 삼각형 밑면 -->
        <g fill="#f0fdf4" fill-opacity="0.6">
          <rect x="${ox - 1.5*w}" y="${oy - l/2}" width="${3*w}" height="${l}" />
          <!-- 앞쪽 삼각형 -->
          <polygon points="${ox - w/2},${oy + l/2} ${ox + w/2},${oy + l/2} ${ox},${oy + l/2 + triH}" />
          <!-- 뒤쪽 삼각형 -->
          <polygon points="${ox - w/2},${oy - l/2} ${ox + w/2},${oy - l/2} ${ox},${oy - l/2 - triH}" />
        </g>

        <!-- 외곽선 (자르기) -->
        <path d="
          M ${ox - 1.5*w} ${oy - l/2}
          H ${ox - w/2}
          L ${ox} ${oy - l/2 - triH}
          L ${ox + w/2} ${oy - l/2}
          H ${ox + 1.5*w}
          V ${oy + l/2}
          H ${ox + w/2}
          L ${ox} ${oy + l/2 + triH}
          L ${ox - w/2} ${oy + l/2}
          H ${ox - 1.5*w}
          Z
        " fill="none" stroke="${cutColor}" stroke-width="2.5" />

        <!-- 접는 선 (누르기) -->
        <g stroke="${foldColor}" stroke-width="2" stroke-dasharray="5,4">
          <line x1="${ox - w/2}" y1="${oy - l/2}" x2="${ox - w/2}" y2="${oy + l/2}" />
          <line x1="${ox + w/2}" y1="${oy - l/2}" x2="${ox + w/2}" y2="${oy + l/2}" />
          <line x1="${ox - w/2}" y1="${oy - l/2}" x2="${ox + w/2}" y2="${oy - l/2}" />
          <line x1="${ox - w/2}" y1="${oy + l/2}" x2="${ox + w/2}" y2="${oy + l/2}" />
        </g>

        <!-- 타공 위치 -->
        <g fill="${punchColor}" stroke="#b91c1c" stroke-width="1.5">
          <circle cx="${ox}" cy="${oy - l/2 - triH + 12}" r="5" />
          <circle cx="${ox}" cy="${oy + l/2 + triH - 12}" r="5" />
          <circle cx="${ox - 1.5*w + 10}" cy="${oy}" r="5" />
          <circle cx="${ox + 1.5*w - 10}" cy="${oy}" r="5" />
        </g>

        <text x="${ox}" y="${oy}" text-anchor="middle" font-size="12" fill="#475569" font-weight="bold">중앙 직사각형(밑면)</text>
        <text x="${ox - w}" y="${oy}" text-anchor="middle" font-size="11" fill="#64748b">옆면 1</text>
        <text x="${ox + w}" y="${oy}" text-anchor="middle" font-size="11" fill="#64748b">옆면 2</text>
        <text x="${ox}" y="${oy - l/2 - 20}" text-anchor="middle" font-size="10" fill="#64748b">정삼각형</text>
        <text x="${ox}" y="${oy + l/2 + 25}" text-anchor="middle" font-size="10" fill="#64748b">정삼각형</text>
      </svg>
    `;
  }

  // 3. 원기둥 전개도 SVG (가로 18cm, 높이 9cm, 반지름 2.86cm)
  generateCylinderSVG() {
    const w = this.dimensions.cylinder.width * 14;
    const h = this.dimensions.cylinder.height * 14;
    const r = this.dimensions.cylinder.radius * 14;
    const ox = 250;
    const oy = 250;

    const cutColor = this.showCut ? '#1e293b' : 'none';
    const foldColor = this.showFold ? '#4f46e5' : 'none';
    const punchColor = this.showPunch ? '#ef4444' : 'none';

    return `
      <svg viewBox="0 0 500 500" class="w-full h-full max-h-[460px] mx-auto bg-white border border-slate-200 rounded-lg shadow-inner">
        <rect width="100%" height="100%" fill="#fffbf5" />

        <!-- 원 2개 + 직사각형 옆면 -->
        <g fill="#fef3c7" fill-opacity="0.6">
          <rect x="${ox - w/2}" y="${oy - h/2}" width="${w}" height="${h}" />
          <circle cx="${ox}" cy="${oy - h/2 - r}" r="${r}" />
          <circle cx="${ox}" cy="${oy + h/2 + r}" r="${r}" />
        </g>

        <!-- 외곽선 (자르기) -->
        <g stroke="${cutColor}" stroke-width="2.5" fill="none">
          <rect x="${ox - w/2}" y="${oy - h/2}" width="${w}" height="${h}" />
          <circle cx="${ox}" cy="${oy - h/2 - r}" r="${r}" />
          <circle cx="${ox}" cy="${oy + h/2 + r}" r="${r}" />
        </g>

        <!-- 원기둥 접촉선 (접는 선) -->
        <g stroke="${foldColor}" stroke-width="2" stroke-dasharray="5,4">
          <line x1="${ox - 15}" y1="${oy - h/2}" x2="${ox + 15}" y2="${oy - h/2}" />
          <line x1="${ox - 15}" y1="${oy + h/2}" x2="${ox + 15}" y2="${oy + h/2}" />
        </g>

        <!-- 타공 위치: 양쪽 끝단 세로 지그재그 -->
        <g fill="${punchColor}" stroke="#b91c1c" stroke-width="1.5">
          <circle cx="${ox - w/2 + 8}" cy="${oy - h/3}" r="4" />
          <circle cx="${ox - w/2 + 8}" cy="${oy}" r="4" />
          <circle cx="${ox - w/2 + 8}" cy="${oy + h/3}" r="4" />

          <circle cx="${ox + w/2 - 8}" cy="${oy - h/3}" r="4" />
          <circle cx="${ox + w/2 - 8}" cy="${oy}" r="4" />
          <circle cx="${ox + w/2 - 8}" cy="${oy + h/3}" r="4" />
        </g>

        <!-- 치수 주석 안내 -->
        <text x="${ox}" y="${oy}" text-anchor="middle" font-size="12" fill="#475569" font-weight="bold">옆면 직사각형 (${this.dimensions.cylinder.width}cm × ${this.dimensions.cylinder.height}cm)</text>
        <text x="${ox}" y="${oy - h/2 - r + 4}" text-anchor="middle" font-size="11" fill="#64748b">밑면 원 (반지름 ${this.dimensions.cylinder.radius}cm)</text>
        <text x="${ox}" y="${oy + h/2 + r + 4}" text-anchor="middle" font-size="11" fill="#64748b">밑면 원 (둘레 = 옆면 가로길이)</text>
      </svg>
    `;
  }

  // 4. 육각뿔 전개도 SVG (Star 형태)
  generatePyramidSVG() {
    const r = this.dimensions.pyramid.radius * 16;
    const slant = this.dimensions.pyramid.slant * 16;
    const ox = 250;
    const oy = 250;

    const cutColor = this.showCut ? '#1e293b' : 'none';
    const foldColor = this.showFold ? '#4f46e5' : 'none';
    const punchColor = this.showPunch ? '#ef4444' : 'none';

    // 정육각형 꼭짓점 계산
    const hexPoints = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      hexPoints.push({
        x: ox + r * Math.cos(angle),
        y: oy + r * Math.sin(angle)
      });
    }

    // 각 변에 이등변삼각형 붙이기
    let triPaths = '';
    let punchPoints = [];
    for (let i = 0; i < 6; i++) {
      const p1 = hexPoints[i];
      const p2 = hexPoints[(i + 1) % 6];
      const midAngle = (i * Math.PI) / 3 + Math.PI / 6;
      const tipDist = (Math.sqrt(3)/2 * r) + slant;
      const tipX = ox + tipDist * Math.cos(midAngle);
      const tipY = oy + tipDist * Math.sin(midAngle);

      triPaths += `M ${p1.x} ${p1.y} L ${tipX} ${tipY} L ${p2.x} ${p2.y} `;
      punchPoints.push({ x: tipX, y: tipY, angle: midAngle });
    }

    const hexPoly = hexPoints.map(p => `${p.x},${p.y}`).join(' ');

    return `
      <svg viewBox="0 0 500 500" class="w-full h-full max-h-[460px] mx-auto bg-white border border-slate-200 rounded-lg shadow-inner">
        <rect width="100%" height="100%" fill="#fdf2f8" />

        <!-- 정육각형 및 6개 삼각형 채우기 -->
        <polygon points="${hexPoly}" fill="#e0e7ff" fill-opacity="0.8" />
        <path d="${triPaths}" fill="#fce7f3" fill-opacity="0.6" stroke="${cutColor}" stroke-width="2" />

        <!-- 접는 선 (정육각형 둘레 점선) -->
        <polygon points="${hexPoly}" fill="none" stroke="${foldColor}" stroke-width="2" stroke-dasharray="5,4" />

        <!-- 타공 위치: 6개 삼각형 꼭짓점 -->
        <g fill="${punchColor}" stroke="#b91c1c" stroke-width="1.5">
          ${punchPoints.map(p => {
            const hx = p.x - 10 * Math.cos(p.angle);
            const hy = p.y - 10 * Math.sin(p.angle);
            return `<circle cx="${hx}" cy="${hy}" r="5" />`;
          }).join('')}
        </g>

        <!-- 원형 링 실 유도선 -->
        <circle cx="${ox}" cy="${oy}" r="${(Math.sqrt(3)/2 * r) + slant - 10}" fill="none" stroke="#0284c7" stroke-width="1.5" stroke-dasharray="4,4" />

        <text x="${ox}" y="${oy + 5}" text-anchor="middle" font-size="12" fill="#475569" font-weight="bold">정육각형 밑면 (바닥)</text>
      </svg>
    `;
  }

  downloadSVG() {
    const svgElem = this.container.querySelector('svg');
    if (!svgElem) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgElem);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `마법전개도_${this.currentShape}_도안.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  printBlueprint() {
    const printArea = document.getElementById('print-area');
    const svgElem = this.container.querySelector('svg');
    if (printArea && svgElem) {
      printArea.innerHTML = `
        <div style="padding: 24px; text-align: center; font-family: sans-serif;">
          <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 8px;">마법 전개도 실측 도안 - ${this.currentShape.toUpperCase()}</h2>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 20px;">
            [검은 실선: 자르기] | [파란 점선: 접는 선(Scoring)] | [빨간 원: 펀치 구멍 타공]
          </p>
          <div style="display: flex; justify-content: center;">
            ${svgElem.outerHTML}
          </div>
          <p style="font-size: 11px; color: #94a3b8; margin-top: 16px;">
            * 인쇄 시 배율을 '100%(실제 크기)'로 설정해주세요. (180g~220g 도화지 권장)
          </p>
        </div>
      `;
      window.print();
    } else {
      window.print();
    }
  }
}

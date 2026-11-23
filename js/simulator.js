// web/js/simulator.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class ShapeSimulator {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentShape = 'cube';
    this.progress = 0; // 0 (완전 평면) ~ 1 (완전 입체)
    this.wireframe = false;
    this.shadowMode = false;
    this.autoPlay = false;
    this.playDirection = 1;

    this.initScene();
    this.buildCurrentShape();
    this.animate();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf8fafc);

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 7, 9);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02; // 바닥 아래로 안 내려가게
    this.controls.minDistance = 3;
    this.controls.maxDistance = 20;
    this.controls.target.set(0, 0.5, 0);

    // 조명 설정
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    this.dirLight.position.set(5, 12, 7);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);

    // 바닥판 (스케치북 느낌)
    const groundGeo = new THREE.PlaneGeometry(16, 16);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.1
    });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -0.01;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    // 그리드 보조선
    this.grid = new THREE.GridHelper(16, 16, 0xc7d2fe, 0xe2e8f0);
    this.grid.position.y = 0;
    this.scene.add(this.grid);

    // 실(String) 표현을 위한 메쉬 그룹
    this.stringGroup = new THREE.Group();
    this.scene.add(this.stringGroup);

    // 도형 메쉬 그룹
    this.shapeGroup = new THREE.Group();
    this.scene.add(this.shapeGroup);
  }

  setShape(shapeKey) {
    this.currentShape = shapeKey;
    this.progress = 0;
    this.buildCurrentShape();
  }

  setProgress(p) {
    this.progress = Math.max(0, Math.min(1, p));
    this.updateFolding();
  }

  setWireframe(enabled) {
    this.wireframe = enabled;
    this.shapeGroup.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.wireframe = enabled);
        } else {
          child.material.wireframe = enabled;
        }
      }
    });
  }

  setShadowMode(enabled) {
    this.shadowMode = enabled;
    if (enabled) {
      this.ambientLight.intensity = 0.2;
      this.dirLight.intensity = 1.4;
      this.scene.background = new THREE.Color(0x0f172a);
      this.ground.material.color.set(0x1e293b);
    } else {
      this.ambientLight.intensity = 0.7;
      this.dirLight.intensity = 0.9;
      this.scene.background = new THREE.Color(0xf8fafc);
      this.ground.material.color.set(0xffffff);
    }
  }

  resetCamera() {
    this.camera.position.set(0, 7, 9);
    this.controls.target.set(0, 0.5, 0);
    this.controls.update();
  }

  toggleAutoPlay(callback) {
    this.autoPlay = !this.autoPlay;
    this.onProgressChange = callback;
    return this.autoPlay;
  }

  createFaceMesh(geometry, color, doubleSided = true) {
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.4,
      metalness: 0.1,
      side: doubleSided ? THREE.DoubleSide : THREE.FrontSide,
      wireframe: this.wireframe
    });
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // 모서리 테두리 라인
    const edgesGeo = new THREE.EdgesGeometry(geometry);
    const edgesMat = new THREE.LineBasicMaterial({ color: 0x334155, linewidth: 2 });
    const edges = new THREE.LineSegments(edgesGeo, edgesMat);
    mesh.add(edges);

    return mesh;
  }

  // 펀칭 구멍 표시용 마커
  createPunchHoleMarker() {
    const geo = new THREE.RingGeometry(0.04, 0.08, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0x1e293b, side: THREE.DoubleSide });
    const marker = new THREE.Mesh(geo, mat);
    marker.rotation.x = -Math.PI / 2;
    marker.position.y = 0.01;
    return marker;
  }

  clearShape() {
    while (this.shapeGroup.children.length > 0) {
      const obj = this.shapeGroup.children[0];
      this.shapeGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }
    this.clearStrings();
  }

  clearStrings() {
    while (this.stringGroup.children.length > 0) {
      const obj = this.stringGroup.children[0];
      this.stringGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    }
  }

  // ===================== 도형별 빌드 로직 =====================

  buildCurrentShape() {
    this.clearShape();
    switch (this.currentShape) {
      case 'cube':
        this.buildCube();
        break;
      case 'prism':
        this.buildPrism();
        break;
      case 'cylinder':
        this.buildCylinder();
        break;
      case 'pyramid':
        this.buildPyramid();
        break;
    }
    this.updateFolding();
  }

  // 1. 정육면체 (Cube - 십자형 전개도)
  buildCube() {
    const S = 1.6; // 한 변의 길이
    this.cubeParts = {};

    // 중앙 바닥면 (Fixed Base)
    const baseGeo = new THREE.PlaneGeometry(S, S);
    const baseMesh = this.createFaceMesh(baseGeo, 0x60a5fa);
    baseMesh.rotation.x = -Math.PI / 2;
    this.shapeGroup.add(baseMesh);

    // 앞면 힌지 그룹 (Z+)
    const frontHinge = new THREE.Group();
    frontHinge.position.set(0, 0, S / 2);
    const frontGeo = new THREE.PlaneGeometry(S, S);
    const frontMesh = this.createFaceMesh(frontGeo, 0xf87171);
    frontMesh.rotation.x = -Math.PI / 2;
    frontMesh.position.set(0, 0, S / 2);
    frontHinge.add(frontMesh);

    // 윗면(뚜껑) 힌지 그룹 (앞면 끝에 부착)
    const topHinge = new THREE.Group();
    topHinge.position.set(0, 0, S);
    const topGeo = new THREE.PlaneGeometry(S, S);
    const topMesh = this.createFaceMesh(topGeo, 0x34d399);
    topMesh.rotation.x = -Math.PI / 2;
    topMesh.position.set(0, 0, S / 2);
    topHinge.add(topMesh);
    frontHinge.add(topHinge);
    this.shapeGroup.add(frontHinge);

    // 뒷면 힌지 그룹 (Z-)
    const backHinge = new THREE.Group();
    backHinge.position.set(0, 0, -S / 2);
    const backGeo = new THREE.PlaneGeometry(S, S);
    const backMesh = this.createFaceMesh(backGeo, 0xfbbf24);
    backMesh.rotation.x = -Math.PI / 2;
    backMesh.position.set(0, 0, -S / 2);
    backHinge.add(backMesh);
    this.shapeGroup.add(backHinge);

    // 좌측면 힌지 그룹 (X-)
    const leftHinge = new THREE.Group();
    leftHinge.position.set(-S / 2, 0, 0);
    const leftGeo = new THREE.PlaneGeometry(S, S);
    const leftMesh = this.createFaceMesh(leftGeo, 0xa78bfa);
    leftMesh.rotation.x = -Math.PI / 2;
    leftMesh.position.set(-S / 2, 0, 0);
    leftHinge.add(leftMesh);
    this.shapeGroup.add(leftHinge);

    // 우측면 힌지 그룹 (X+)
    const rightHinge = new THREE.Group();
    rightHinge.position.set(S / 2, 0, 0);
    const rightGeo = new THREE.PlaneGeometry(S, S);
    const rightMesh = this.createFaceMesh(rightGeo, 0xf472b6);
    rightMesh.rotation.x = -Math.PI / 2;
    rightMesh.position.set(S / 2, 0, 0);
    rightHinge.add(rightMesh);
    this.shapeGroup.add(rightHinge);

    // 타공 마커들
    const hole1 = this.createPunchHoleMarker();
    hole1.position.set(-S / 2 + 0.15, 0.01, S - 0.15);
    topMesh.add(hole1);

    const hole2 = this.createPunchHoleMarker();
    hole2.position.set(S / 2 - 0.15, 0.01, S - 0.15);
    topMesh.add(hole2);

    this.cubeParts = { frontHinge, topHinge, backHinge, leftHinge, rightHinge, topMesh, S };
  }

  // 2. 삼각기둥 (Triangular Prism)
  buildPrism() {
    const W = 1.6; // 폭
    const L = 2.4; // 길이
    this.prismParts = {};

    // 중앙 바닥 직사각형 (Fixed Base)
    const baseGeo = new THREE.PlaneGeometry(W, L);
    const baseMesh = this.createFaceMesh(baseGeo, 0x60a5fa);
    baseMesh.rotation.x = -Math.PI / 2;
    this.shapeGroup.add(baseMesh);

    // 좌측 직사각형 힌지 (X-)
    const leftHinge = new THREE.Group();
    leftHinge.position.set(-W / 2, 0, 0);
    const leftGeo = new THREE.PlaneGeometry(W, L);
    const leftMesh = this.createFaceMesh(leftGeo, 0x34d399);
    leftMesh.rotation.x = -Math.PI / 2;
    leftMesh.position.set(-W / 2, 0, 0);
    leftHinge.add(leftMesh);
    this.shapeGroup.add(leftHinge);

    // 우측 직사각형 힌지 (X+)
    const rightHinge = new THREE.Group();
    rightHinge.position.set(W / 2, 0, 0);
    const rightGeo = new THREE.PlaneGeometry(W, L);
    const rightMesh = this.createFaceMesh(rightGeo, 0xfbbf24);
    rightMesh.rotation.x = -Math.PI / 2;
    rightMesh.position.set(W / 2, 0, 0);
    rightHinge.add(rightMesh);
    this.shapeGroup.add(rightHinge);

    // 앞쪽 정삼각형 밑면 힌지 (Z+)
    const triH = (Math.sqrt(3) / 2) * W;
    const triShape = new THREE.Shape();
    triShape.moveTo(-W / 2, 0);
    triShape.lineTo(W / 2, 0);
    triShape.lineTo(0, triH);
    triShape.closePath();
    const triGeo = new THREE.ShapeGeometry(triShape);

    const frontTriHinge = new THREE.Group();
    frontTriHinge.position.set(0, 0, L / 2);
    const frontTriMesh = this.createFaceMesh(triGeo, 0xf87171);
    frontTriMesh.rotation.x = -Math.PI / 2;
    frontTriHinge.add(frontTriMesh);
    this.shapeGroup.add(frontTriHinge);

    // 뒤쪽 정삼각형 밑면 힌지 (Z-)
    const backTriHinge = new THREE.Group();
    backTriHinge.position.set(0, 0, -L / 2);
    const backTriMesh = this.createFaceMesh(triGeo, 0xa78bfa);
    backTriMesh.rotation.x = Math.PI / 2;
    backTriMesh.rotation.z = Math.PI;
    backTriHinge.add(backTriMesh);
    this.shapeGroup.add(backTriHinge);

    this.prismParts = { leftHinge, rightHinge, frontTriHinge, backTriHinge, W, L, triH };
  }

  // 3. 육각뿔 (Hexagonal Pyramid)
  buildPyramid() {
    const R = 1.4; // 밑면 정육각형 외접원 반지름
    const H = 2.4; // 뿔 높이
    this.pyramidParts = { hinges: [], R, H };

    // 정육각형 밑면 (Fixed Base)
    const hexShape = new THREE.Shape();
    const sideLen = R; // 정육각형의 한 변 = R
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = R * Math.cos(angle);
      const z = R * Math.sin(angle);
      if (i === 0) hexShape.moveTo(x, z);
      else hexShape.lineTo(x, z);
    }
    hexShape.closePath();
    const hexGeo = new THREE.ShapeGeometry(hexShape);
    const hexMesh = this.createFaceMesh(hexGeo, 0x60a5fa);
    hexMesh.rotation.x = -Math.PI / 2;
    this.shapeGroup.add(hexMesh);

    // 정육각형 중심에서 변까지 거리 (Apothem)
    const apothem = (Math.sqrt(3) / 2) * R;
    // 뿔 옆면 삼각형의 빗변 높이 (Slant height)
    const slantH = Math.sqrt(H * H + apothem * apothem);

    const colors = [0xf87171, 0xfbbf24, 0x34d399, 0x22d3ee, 0xa78bfa, 0xf472b6];

    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 + Math.PI / 6; // 변 중심 각도
      const midX = apothem * Math.cos(angle);
      const midZ = apothem * Math.sin(angle);

      const hinge = new THREE.Group();
      hinge.position.set(midX, 0, midZ);
      hinge.rotation.y = -angle + Math.PI / 2;

      // 이등변삼각형 전개도
      const triShape = new THREE.Shape();
      triShape.moveTo(-sideLen / 2, 0);
      triShape.lineTo(sideLen / 2, 0);
      triShape.lineTo(0, slantH);
      triShape.closePath();

      const triGeo = new THREE.ShapeGeometry(triShape);
      const triMesh = this.createFaceMesh(triGeo, colors[i]);
      triMesh.rotation.x = -Math.PI / 2;
      hinge.add(triMesh);

      // 꼭짓점 타공 마커
      const marker = this.createPunchHoleMarker();
      marker.position.set(0, 0.01, slantH - 0.15);
      triMesh.add(marker);

      this.shapeGroup.add(hinge);
      this.pyramidParts.hinges.push(hinge);
    }
  }

  // 4. 원기둥 (Cylinder)
  buildCylinder() {
    const R = 0.9;
    const H = 2.0;
    const segments = 24;
    const circumference = 2 * Math.PI * R;
    const segWidth = circumference / segments;

    this.cylinderParts = { segments: [], R, H, circumference, segWidth };

    // 옆면 분할 메쉬 생성 (중앙 세그먼트 고정 후 좌우로 연결)
    const segGroup = new THREE.Group();
    this.cylinderSegments = [];

    for (let i = 0; i < segments; i++) {
      const geo = new THREE.PlaneGeometry(segWidth, H);
      const mesh = this.createFaceMesh(geo, 0x818cf8);
      mesh.rotation.x = -Math.PI / 2;
      this.cylinderSegments.push(mesh);
      segGroup.add(mesh);
    }
    this.shapeGroup.add(segGroup);

    // 위 / 아래 원형 밑면
    const circleGeo = new THREE.CircleGeometry(R, 32);

    const topCircleHinge = new THREE.Group();
    topCircleHinge.position.set(0, 0, -H / 2);
    const topCircleMesh = this.createFaceMesh(circleGeo, 0xf43f5e);
    topCircleMesh.rotation.x = -Math.PI / 2;
    topCircleMesh.position.set(0, 0, -R);
    topCircleHinge.add(topCircleMesh);
    this.shapeGroup.add(topCircleHinge);

    const btmCircleHinge = new THREE.Group();
    btmCircleHinge.position.set(0, 0, H / 2);
    const btmCircleMesh = this.createFaceMesh(circleGeo, 0x10b981);
    btmCircleMesh.rotation.x = -Math.PI / 2;
    btmCircleMesh.position.set(0, 0, R);
    btmCircleHinge.add(btmCircleMesh);
    this.shapeGroup.add(btmCircleHinge);

    this.cylinderParts.topCircleHinge = topCircleHinge;
    this.cylinderParts.btmCircleHinge = btmCircleHinge;
  }

  // ===================== 접힘(Folding) 애니메이션 업데이트 =====================

  updateFolding() {
    const t = this.progress; // 0 (펼쳐짐) ~ 1 (완성)
    this.clearStrings();

    switch (this.currentShape) {
      case 'cube':
        this.foldCube(t);
        break;
      case 'prism':
        this.foldPrism(t);
        break;
      case 'pyramid':
        this.foldPyramid(t);
        break;
      case 'cylinder':
        this.foldCylinder(t);
        break;
    }
  }

  foldCube(t) {
    const p = this.cubeParts;
    if (!p.frontHinge) return;

    const angle = (Math.PI / 2) * t;

    // 앞, 뒤, 좌, 우 90도 회전
    p.frontHinge.rotation.x = -angle;
    p.topHinge.rotation.x = -angle;
    p.backHinge.rotation.x = angle;
    p.leftHinge.rotation.z = angle;
    p.rightHinge.rotation.z = -angle;

    // 실(Strings) 시각화: 바닥 앞단에서 나와 윗면 구멍까지 이어지는 라인
    const stringPoints1 = [
      new THREE.Vector3(-p.S * 0.35, 0.05, p.S * 1.5 - t * 0.8),
      new THREE.Vector3(-p.S * 0.35, 0.05, p.S * 0.55),
    ];
    // 윗면 구멍 월드 좌표 가져오기
    const holePos = new THREE.Vector3();
    p.topMesh.getWorldPosition(holePos);
    stringPoints1.push(new THREE.Vector3(holePos.x - 0.3, holePos.y + 0.1, holePos.z));

    this.drawStrings([
      stringPoints1,
      [
        new THREE.Vector3(p.S * 0.35, 0.05, p.S * 1.5 - t * 0.8),
        new THREE.Vector3(p.S * 0.35, 0.05, p.S * 0.55),
        new THREE.Vector3(holePos.x + 0.3, holePos.y + 0.1, holePos.z)
      ]
    ]);
  }

  foldPrism(t) {
    const p = this.prismParts;
    if (!p.leftHinge) return;

    // 정삼각형 기둥이므로 옆면은 60도 접힘
    const sideAngle = (Math.PI / 3) * t;
    p.leftHinge.rotation.z = sideAngle;
    p.rightHinge.rotation.z = -sideAngle;

    // 앞뒤 밑면 정삼각형은 90도 직각으로 일어남
    const capAngle = (Math.PI / 2) * t;
    p.frontTriHinge.rotation.x = -capAngle;
    p.backTriHinge.rotation.x = capAngle;

    // 실(Strings) 시각화: 지붕 끝단 손잡이 당김
    const pullZ = p.L * 0.8 - t * 0.6;
    this.drawStrings([
      [
        new THREE.Vector3(0, 0.05, pullZ),
        new THREE.Vector3(0, (p.triH) * t, p.L / 2)
      ]
    ]);
  }

  foldPyramid(t) {
    const p = this.pyramidParts;
    if (!p.hinges) return;

    const apothem = (Math.sqrt(3) / 2) * p.R;
    const finalAngle = Math.atan2(p.H, apothem); // 완성 시 접히는 각도
    const currentAngle = finalAngle * t;

    const ringPoints = [];

    p.hinges.forEach((hinge) => {
      hinge.rotation.x = currentAngle;
      // 꼭짓점 위치 수집
      const tipPos = new THREE.Vector3(0, 0, Math.sqrt(p.H * p.H + apothem * apothem));
      hinge.localToWorld(tipPos);
      ringPoints.push(tipPos);
    });

    // 6개 꼭짓점을 둘러싸는 원형 링 실 시각화
    if (ringPoints.length > 0) {
      ringPoints.push(ringPoints[0].clone()); // 루프 닫기
      this.drawStrings([ringPoints]);
    }
  }

  foldCylinder(t) {
    const p = this.cylinderParts;
    if (!this.cylinderSegments) return;

    const segs = this.cylinderSegments;
    const n = segs.length;
    const targetR = p.R;

    // 평면(-circumference/2 ~ circumference/2)에서 원형 곡면으로 보간
    for (let i = 0; i < n; i++) {
      const segMesh = segs[i];
      const flatX = (i - n / 2 + 0.5) * p.segWidth;

      // 둥글게 말렸을 때 각도
      const curvedAngle = ((i - n / 2 + 0.5) / n) * (2 * Math.PI) * t;
      const curvedX = targetR * Math.sin(curvedAngle);
      const curvedZ = -targetR * Math.cos(curvedAngle) + targetR * (1 - t);

      // 선형 보간 (Lerp)
      segMesh.position.x = THREE.MathUtils.lerp(flatX, curvedX, t);
      segMesh.position.z = THREE.MathUtils.lerp(0, curvedZ, t);
      segMesh.position.y = THREE.MathUtils.lerp(0, targetR * (1 - Math.cos(curvedAngle / 2)) * 0.3 * t, t);
      segMesh.rotation.y = -curvedAngle;
    }

    // 뚜껑 90도 회전
    const capAngle = (Math.PI / 2) * t;
    p.topCircleHinge.rotation.x = capAngle;
    p.btmCircleHinge.rotation.x = -capAngle;
  }

  drawStrings(lines) {
    const mat = new THREE.LineBasicMaterial({
      color: 0xef4444,
      linewidth: 3
    });

    lines.forEach((pts) => {
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, mat);
      this.stringGroup.add(line);
    });
  }

  onWindowResize() {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (this.autoPlay) {
      this.progress += 0.008 * this.playDirection;
      if (this.progress >= 1) {
        this.progress = 1;
        this.playDirection = -1;
      } else if (this.progress <= 0) {
        this.progress = 0;
        this.playDirection = 1;
      }
      this.updateFolding();
      if (this.onProgressChange) this.onProgressChange(this.progress);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

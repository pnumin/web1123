// web/bundle.js
// 단일 번들 파일: file:/// 프로토콜 및 http:// 모두 완벽 지원

(function() {
  const THREE = window.THREE;
  const OrbitControls = THREE.OrbitControls;

  // ===================== 1. 3D 시뮬레이터 엔진 =====================
  class ShapeSimulator {
    constructor(containerId) {
      this.container = document.getElementById(containerId);
      this.currentShape = 'cube';
      this.progress = 0;
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

      const width = this.container.clientWidth || 800;
      const height = this.container.clientHeight || 500;

      this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      this.camera.position.set(0, 6, 8);

      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.container.appendChild(this.renderer.domElement);

      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.maxPolarAngle = Math.PI / 2 - 0.02;
      this.controls.minDistance = 3;
      this.controls.maxDistance = 20;
      this.controls.target.set(0, 0.8, 0);

      this.ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      this.scene.add(this.ambientLight);

      this.dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
      this.dirLight.position.set(6, 12, 7);
      this.dirLight.castShadow = true;
      this.dirLight.shadow.mapSize.width = 2048;
      this.dirLight.shadow.mapSize.height = 2048;
      this.dirLight.shadow.bias = -0.0005;
      this.scene.add(this.dirLight);

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

      this.grid = new THREE.GridHelper(16, 16, 0xc7d2fe, 0xe2e8f0);
      this.grid.position.y = 0;
      this.scene.add(this.grid);

      this.stringGroup = new THREE.Group();
      this.scene.add(this.stringGroup);

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

    updateFolding() {
      const t = this.progress;
      this.clearStrings();
      switch (this.currentShape) {
        case 'cube': this.foldCube(t); break;
        case 'prism': this.foldPrism(t); break;
        case 'cylinder': this.foldCylinder(t); break;
        case 'pyramid': this.foldPyramid(t); break;
      }
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
      this.camera.position.set(0, 6, 8);
      this.controls.target.set(0, 0.8, 0);
      this.controls.update();
    }

    toggleAutoPlay(callback) {
      this.autoPlay = !this.autoPlay;
      this.onProgressChange = callback;
      return this.autoPlay;
    }

    createFaceMesh(geometry, color) {
      const mat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.35,
        metalness: 0.1,
        side: THREE.DoubleSide,
        wireframe: this.wireframe
      });
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const edgesGeo = new THREE.EdgesGeometry(geometry);
      const edgesMat = new THREE.LineBasicMaterial({ color: 0x1e293b, linewidth: 2 });
      const edges = new THREE.LineSegments(edgesGeo, edgesMat);
      mesh.add(edges);

      return mesh;
    }

    createPunchHoleMarker() {
      const geo = new THREE.RingGeometry(0.04, 0.08, 16);
      const mat = new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide });
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

    buildCurrentShape() {
      this.clearShape();
      switch (this.currentShape) {
        case 'cube': this.buildCube(); break;
        case 'prism': this.buildPrism(); break;
        case 'cylinder': this.buildCylinder(); break;
        case 'pyramid': this.buildPyramid(); break;
      }
      this.updateFolding();
    }

    // ================= 1. 정육면체 (Cube) =================
    buildCube() {
      const S = 1.6; // 한 변 길이
      this.cubeParts = { S };

      // [1] 중앙 바닥면 (Fixed Base) - 파란색
      const baseGeo = new THREE.PlaneGeometry(S, S);
      const baseMesh = this.createFaceMesh(baseGeo, 0x3b82f6);
      baseMesh.rotation.x = -Math.PI / 2;
      this.shapeGroup.add(baseMesh);

      // [2] 앞면 힌지 (Z = +S/2 모서리 축)
      const frontHinge = new THREE.Group();
      frontHinge.position.set(0, 0, S / 2);
      const frontGeo = new THREE.PlaneGeometry(S, S);
      const frontMesh = this.createFaceMesh(frontGeo, 0xef4444); // 빨간색
      frontMesh.rotation.x = -Math.PI / 2;
      frontMesh.position.set(0, 0, S / 2);
      frontHinge.add(frontMesh);

      // [3] 윗면(뚜껑) 힌지 (앞면 끝단 Z = +S 축)
      const topHinge = new THREE.Group();
      topHinge.position.set(0, 0, S);
      const topGeo = new THREE.PlaneGeometry(S, S);
      const topMesh = this.createFaceMesh(topGeo, 0x10b981); // 초록색
      topMesh.rotation.x = -Math.PI / 2;
      topMesh.position.set(0, 0, S / 2);
      topHinge.add(topMesh);
      frontHinge.add(topHinge);
      this.shapeGroup.add(frontHinge);

      // [4] 뒷면 힌지 (Z = -S/2 모서리 축)
      const backHinge = new THREE.Group();
      backHinge.position.set(0, 0, -S / 2);
      const backGeo = new THREE.PlaneGeometry(S, S);
      const backMesh = this.createFaceMesh(backGeo, 0xf59e0b); // 노란색
      backMesh.rotation.x = -Math.PI / 2;
      backMesh.position.set(0, 0, -S / 2);
      backHinge.add(backMesh);
      this.shapeGroup.add(backHinge);

      // [5] 좌측면 힌지 (X = -S/2 모서리 축)
      const leftHinge = new THREE.Group();
      leftHinge.position.set(-S / 2, 0, 0);
      const leftGeo = new THREE.PlaneGeometry(S, S);
      const leftMesh = this.createFaceMesh(leftGeo, 0x8b5cf6); // 보라색
      leftMesh.rotation.x = -Math.PI / 2;
      leftMesh.position.set(-S / 2, 0, 0);
      leftHinge.add(leftMesh);
      this.shapeGroup.add(leftHinge);

      // [6] 우측면 힌지 (X = +S/2 모서리 축)
      const rightHinge = new THREE.Group();
      rightHinge.position.set(S / 2, 0, 0);
      const rightGeo = new THREE.PlaneGeometry(S, S);
      const rightMesh = this.createFaceMesh(rightGeo, 0xec4899); // 분홍색
      rightMesh.rotation.x = -Math.PI / 2;
      rightMesh.position.set(S / 2, 0, 0);
      rightHinge.add(rightMesh);
      this.shapeGroup.add(rightHinge);

      // 윗면 구멍 마커
      const h1 = this.createPunchHoleMarker();
      h1.position.set(-S * 0.35, 0.01, S * 0.85);
      topMesh.add(h1);
      const h2 = this.createPunchHoleMarker();
      h2.position.set(S * 0.35, 0.01, S * 0.85);
      topMesh.add(h2);

      this.cubeParts = { frontHinge, topHinge, backHinge, leftHinge, rightHinge, topMesh, S };
    }

    foldCube(t) {
      const p = this.cubeParts;
      if (!p.frontHinge) return;

      const angle = (Math.PI / 2) * t;

      // 앞면: -X축 회전으로 위(+Y)로 90도 일어섬
      p.frontHinge.rotation.x = -angle;

      // 윗면(뚜껑): 앞면에 대해 또 -X축 회전으로 90도 꺾여 수평 상단 덮개가 됨
      p.topHinge.rotation.x = -angle;

      // 뒷면: +X축 회전으로 위(+Y)로 90도 일어섬
      p.backHinge.rotation.x = angle;

      // 좌측면: -Z축 회전으로 위(+Y)로 90도 일어섬
      p.leftHinge.rotation.z = -angle;

      // 우측면: +Z축 회전으로 위(+Y)로 90도 일어섬
      p.rightHinge.rotation.z = angle;

      // 실(String) 시각화: 바닥 앵커에서 윗면 구멍까지 이어지는 라인
      const holePos = new THREE.Vector3();
      p.topMesh.getWorldPosition(holePos);

      const pullZ = p.S * 1.5 - t * 0.7;
      this.drawStrings([
        [
          new THREE.Vector3(-p.S * 0.35, 0.05, pullZ),
          new THREE.Vector3(-p.S * 0.35, 0.05, p.S * 0.55),
          new THREE.Vector3(holePos.x - 0.35, holePos.y + 0.05, holePos.z)
        ],
        [
          new THREE.Vector3(p.S * 0.35, 0.05, pullZ),
          new THREE.Vector3(p.S * 0.35, 0.05, p.S * 0.55),
          new THREE.Vector3(holePos.x + 0.35, holePos.y + 0.05, holePos.z)
        ]
      ]);
    }

    // ================= 2. 삼각기둥 (Triangular Prism) =================
    buildPrism() {
      const W = 1.6;
      const L = 2.4;
      const triH = (Math.sqrt(3) / 2) * W; // 정삼각형 높이

      // 중앙 바닥 직사각형 (Fixed Base)
      const baseGeo = new THREE.PlaneGeometry(W, L);
      const baseMesh = this.createFaceMesh(baseGeo, 0x3b82f6);
      baseMesh.rotation.x = -Math.PI / 2;
      this.shapeGroup.add(baseMesh);

      // 좌측 직사각형 힌지 (X = -W/2)
      const leftHinge = new THREE.Group();
      leftHinge.position.set(-W / 2, 0, 0);
      const leftGeo = new THREE.PlaneGeometry(W, L);
      const leftMesh = this.createFaceMesh(leftGeo, 0x10b981);
      leftMesh.rotation.x = -Math.PI / 2;
      leftMesh.position.set(-W / 2, 0, 0);
      leftHinge.add(leftMesh);
      this.shapeGroup.add(leftHinge);

      // 우측 직사각형 힌지 (X = +W/2)
      const rightHinge = new THREE.Group();
      rightHinge.position.set(W / 2, 0, 0);
      const rightGeo = new THREE.PlaneGeometry(W, L);
      const rightMesh = this.createFaceMesh(rightGeo, 0xf59e0b);
      rightMesh.rotation.x = -Math.PI / 2;
      rightMesh.position.set(W / 2, 0, 0);
      rightHinge.add(rightMesh);
      this.shapeGroup.add(rightHinge);

      // 앞쪽 정삼각형 밑면 (Z = +L/2)
      const triShape = new THREE.Shape();
      triShape.moveTo(-W / 2, 0);
      triShape.lineTo(W / 2, 0);
      triShape.lineTo(0, triH);
      triShape.closePath();
      const triGeo = new THREE.ShapeGeometry(triShape);

      const frontTriHinge = new THREE.Group();
      frontTriHinge.position.set(0, 0, L / 2);
      const frontTriMesh = this.createFaceMesh(triGeo, 0xef4444);
      frontTriMesh.rotation.x = Math.PI / 2; // 바깥(+Z) 방향으로 눕힘
      frontTriHinge.add(frontTriMesh);
      this.shapeGroup.add(frontTriHinge);

      // 뒤쪽 정삼각형 밑면 (Z = -L/2)
      const backTriHinge = new THREE.Group();
      backTriHinge.position.set(0, 0, -L / 2);
      const backTriMesh = this.createFaceMesh(triGeo, 0x8b5cf6);
      backTriMesh.rotation.x = -Math.PI / 2; // 뒤쪽(-Z) 방향으로 눕힘
      backTriHinge.add(backTriMesh);
      this.shapeGroup.add(backTriHinge);

      this.prismParts = { leftHinge, rightHinge, frontTriHinge, backTriHinge, W, L, triH };
    }

    foldPrism(t) {
      const p = this.prismParts;
      if (!p.leftHinge) return;

      // 정삼각형 단면이므로 옆면은 120도(2*PI/3) 접혀서 위 꼭짓점에서 만남
      const sideAngle = (2 * Math.PI / 3) * t;
      p.leftHinge.rotation.z = -sideAngle;
      p.rightHinge.rotation.z = sideAngle;

      // 앞뒤 정삼각형 밑면은 90도로 기립
      const capAngle = (Math.PI / 2) * t;
      p.frontTriHinge.rotation.x = -capAngle;
      p.backTriHinge.rotation.x = capAngle;

      // 실 시각화
      const apexY = p.triH * t;
      const pullZ = p.L * 0.8 - t * 0.6;
      this.drawStrings([
        [
          new THREE.Vector3(0, 0.05, pullZ),
          new THREE.Vector3(0, apexY + 0.05, p.L / 2)
        ]
      ]);
    }

    // ================= 3. 육각뿔 (Hexagonal Pyramid) =================
    buildPyramid() {
      const R = 1.4; // 밑면 정육각형 외접원 반지름
      const H = 2.4; // 뿔 높이
      const apothem = (Math.sqrt(3) / 2) * R; // 중심에서 변까지 수직 거리
      const slantH = Math.sqrt(H * H + apothem * apothem); // 옆면 삼각형 높이
      this.pyramidParts = { foldHinges: [], R, H, apothem, slantH };

      // 정육각형 밑면 (Fixed Base)
      const hexShape = new THREE.Shape();
      const sideLen = R;
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const x = R * Math.cos(angle);
        const z = R * Math.sin(angle);
        if (i === 0) hexShape.moveTo(x, z);
        else hexShape.lineTo(x, z);
      }
      hexShape.closePath();
      const hexGeo = new THREE.ShapeGeometry(hexShape);
      const hexMesh = this.createFaceMesh(hexGeo, 0x3b82f6);
      hexMesh.rotation.x = -Math.PI / 2;
      this.shapeGroup.add(hexMesh);

      const colors = [0xef4444, 0xf59e0b, 0x10b981, 0x06b6d4, 0x8b5cf6, 0xec4899];

      for (let i = 0; i < 6; i++) {
        const midAngle = (i * Math.PI) / 3 + Math.PI / 6;
        const midX = apothem * Math.cos(midAngle);
        const midZ = apothem * Math.sin(midAngle);

        // 1) 고정 정렬 부모 힌지: 변의 위치와 바깥 방향으로 회전 (+Math.PI로 바깥쪽 별 모양 정렬)
        const orientHinge = new THREE.Group();
        orientHinge.position.set(midX, 0, midZ);
        orientHinge.rotation.y = Math.PI / 2 - midAngle + Math.PI;

        // 2) 회전 접힘 자식 힌지: 오직 로컬 X축 접힘만 담당 (오일러 축 왜곡 100% 방지)
        const foldHinge = new THREE.Group();
        orientHinge.add(foldHinge);

        // 이등변삼각형: 밑변 [-sideLen/2, sideLen/2], 높이 [0, slantH]
        const triShape = new THREE.Shape();
        triShape.moveTo(-sideLen / 2, 0);
        triShape.lineTo(sideLen / 2, 0);
        triShape.lineTo(0, slantH);
        triShape.closePath();

        const triGeo = new THREE.ShapeGeometry(triShape);
        const triMesh = this.createFaceMesh(triGeo, colors[i]);
        // 평면 상태에서 바닥에 눕혀 로컬 +Z 바깥쪽을 향하게 함
        triMesh.rotation.x = -Math.PI / 2;
        foldHinge.add(triMesh);

        // 꼭짓점 구멍 마커
        const hole = this.createPunchHoleMarker();
        hole.position.set(0, 0.01, slantH - 0.15);
        triMesh.add(hole);

        this.shapeGroup.add(orientHinge);
        this.pyramidParts.foldHinges.push(foldHinge);
      }
    }

    foldPyramid(t) {
      const p = this.pyramidParts;
      if (!p.foldHinges) return;

      // 밑면에서 꼭짓점으로 완벽히 모이는 회전 각도 (180도 - 내부 경사각)
      const foldTargetAngle = Math.PI - Math.atan2(p.H, p.apothem);
      const currentAngle = foldTargetAngle * t;

      const ringPoints = [];
      p.foldHinges.forEach((foldHinge) => {
        // 바깥으로 펼쳐진 삼각형이 90도를 넘어 안쪽으로 기울어져 (0, H, 0)에서 수렴
        foldHinge.rotation.x = currentAngle;

        const tipPos = new THREE.Vector3(0, 0, p.slantH);
        foldHinge.localToWorld(tipPos);
        ringPoints.push(tipPos);
      });

      if (ringPoints.length > 0) {
        ringPoints.push(ringPoints[0].clone());
        this.drawStrings([ringPoints]);
      }
    }

    // ================= 4. 원기둥 (Cylinder) =================
    buildCylinder() {
      const R = 0.9;
      const H = 2.0;
      const circumference = 2 * Math.PI * R;

      this.cylinderParts = { R, H, circumference };

      // 옆면을 담을 컨테이너 그룹
      this.cylinderWallGroup = new THREE.Group();
      this.shapeGroup.add(this.cylinderWallGroup);

      // 상단(뒤쪽 Z-) / 하단(앞쪽 Z+) 원형 뚜껑
      const circleGeo = new THREE.CircleGeometry(R, 32);

      // 뒤쪽 원형 뚜껑 (Z = -H/2)
      const topCapHinge = new THREE.Group();
      topCapHinge.position.set(0, 0, -H / 2);
      const topCapMesh = this.createFaceMesh(circleGeo, 0xef4444);
      topCapMesh.rotation.x = -Math.PI / 2;
      topCapMesh.position.set(0, 0, -R);
      topCapHinge.add(topCapMesh);
      this.shapeGroup.add(topCapHinge);

      // 앞쪽 원형 뚜껑 (Z = +H/2)
      const btmCapHinge = new THREE.Group();
      btmCapHinge.position.set(0, 0, H / 2);
      const btmCapMesh = this.createFaceMesh(circleGeo, 0x10b981);
      btmCapMesh.rotation.x = -Math.PI / 2;
      btmCapMesh.position.set(0, 0, R);
      btmCapHinge.add(btmCapMesh);
      this.shapeGroup.add(btmCapHinge);

      this.cylinderParts.topCapHinge = topCapHinge;
      this.cylinderParts.btmCapHinge = btmCapHinge;
    }

    foldCylinder(t) {
      const p = this.cylinderParts;
      if (!this.cylinderWallGroup) return;

      while (this.cylinderWallGroup.children.length > 0) {
        const obj = this.cylinderWallGroup.children[0];
        this.cylinderWallGroup.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
      }

      const R = p.R;
      const H = p.H;

      if (t <= 0.001) {
        // 완전 평면 (0%): 바닥에 펼쳐진 직사각형
        const flatGeo = new THREE.PlaneGeometry(p.circumference, H);
        const flatMesh = this.createFaceMesh(flatGeo, 0x6366f1);
        flatMesh.rotation.x = -Math.PI / 2;
        this.cylinderWallGroup.add(flatMesh);
      } else {
        // 둥글게 말려가는 원통 아크 (X축 90도 회전하여 Z축을 원통 중심축으로 설정)
        const arcAngle = 2 * Math.PI * t;
        const startAngle = -arcAngle / 2;
        const curvedGeo = new THREE.CylinderGeometry(R, R, H, 48, 1, true, startAngle, arcAngle);
        const curvedMesh = this.createFaceMesh(curvedGeo, 0x6366f1);
        curvedMesh.rotation.x = Math.PI / 2; // Z축 방향으로 눕힘
        curvedMesh.position.set(0, R * t, 0); // 원통 중심을 Y=R만큼 띄움
        this.cylinderWallGroup.add(curvedMesh);
      }

      // 상하(앞뒤) 원형 뚜껑 90도 기립 (회전 반경 R에 의해 자동으로 원통 중심 Y=R*t로 위치 정렬)
      const capAngle = (Math.PI / 2) * t;
      p.topCapHinge.rotation.x = capAngle;
      p.topCapHinge.position.y = 0;
      p.btmCapHinge.rotation.x = -capAngle;
      p.btmCapHinge.position.y = 0;
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

  // ===================== 2. 도안 생성기 =====================
  class BlueprintGenerator {
    constructor(containerId) {
      this.container = document.getElementById(containerId);
      this.currentShape = 'cube';
      this.showCut = true;
      this.showFold = true;
      this.showPunch = true;
      this.showThread = true;
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

    render() {
      if (!this.container) return;
      let svgContent = '';
      switch (this.currentShape) {
        case 'cube': svgContent = this.generateCubeSVG(); break;
        case 'prism': svgContent = this.generatePrismSVG(); break;
        case 'cylinder': svgContent = this.generateCylinderSVG(); break;
        case 'pyramid': svgContent = this.generatePyramidSVG(); break;
      }
      this.container.innerHTML = svgContent;
    }

    generateCubeSVG() {
      const s = this.dimensions.cube.size * 20;
      const ox = 250, oy = 250;
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
          <g fill="#eff6ff" fill-opacity="0.6">
            <rect x="${ox - s/2}" y="${oy - s/2}" width="${s}" height="${s}" />
            <rect x="${ox - s/2}" y="${oy - 1.5*s}" width="${s}" height="${s}" />
            <rect x="${ox - s/2}" y="${oy + s/2}" width="${s}" height="${s}" />
            <rect x="${ox - s/2}" y="${oy + 1.5*s}" width="${s}" height="${s}" />
            <rect x="${ox - 1.5*s}" y="${oy - s/2}" width="${s}" height="${s}" />
            <rect x="${ox + s/2}" y="${oy - s/2}" width="${s}" height="${s}" />
          </g>
          <path d="
            M ${ox - s/2} ${oy - 1.5*s} H ${ox + s/2} V ${oy - s/2} H ${ox + 1.5*s} V ${oy + s/2} H ${ox + s/2} V ${oy + 2.5*s} H ${ox - s/2} V ${oy + s/2} H ${ox - 1.5*s} V ${oy - s/2} H ${ox - s/2} Z
          " fill="none" stroke="${cutColor}" stroke-width="2.5" />
          <g stroke="${foldColor}" stroke-width="2" stroke-dasharray="5,4">
            <line x1="${ox - s/2}" y1="${oy - s/2}" x2="${ox + s/2}" y2="${oy - s/2}" />
            <line x1="${ox - s/2}" y1="${oy + s/2}" x2="${ox + s/2}" y2="${oy + s/2}" />
            <line x1="${ox - s/2}" y1="${oy + 1.5*s}" x2="${ox + s/2}" y2="${oy + 1.5*s}" />
            <line x1="${ox - s/2}" y1="${oy - s/2}" x2="${ox - s/2}" y2="${oy + s/2}" />
            <line x1="${ox + s/2}" y1="${oy - s/2}" x2="${ox + s/2}" y2="${oy + s/2}" />
          </g>
          <g fill="${punchColor}" stroke="#b91c1c" stroke-width="1.5">
            <circle cx="${ox - s/2 + 10}" cy="${oy + 2.5*s - 10}" r="5" />
            <circle cx="${ox + s/2 - 10}" cy="${oy + 2.5*s - 10}" r="5" />
            <circle cx="${ox - 1.5*s + 10}" cy="${oy - s/2 + 10}" r="5" />
            <circle cx="${ox + 1.5*s - 10}" cy="${oy - s/2 + 10}" r="5" />
          </g>
          <g stroke="${threadColor}" stroke-width="2" stroke-dasharray="3,3" fill="none" marker-end="url(#arrow)">
            <path d="M ${ox - s/2 + 10} ${oy + 2.5*s - 10} Q ${ox - s} ${oy + s} ${ox - 1.5*s + 10} ${oy - s/2 + 10}" />
            <path d="M ${ox + s/2 - 10} ${oy + 2.5*s - 10} Q ${ox + s} ${oy + s} ${ox + 1.5*s - 10} ${oy - s/2 + 10}" />
          </g>
          <text x="${ox}" y="${oy + 5}" text-anchor="middle" font-size="12" fill="#475569" font-weight="bold">밑면(바닥고정)</text>
          <text x="${ox}" y="${oy + s + 5}" text-anchor="middle" font-size="11" fill="#64748b">앞면</text>
          <text x="${ox}" y="${oy + 2*s + 5}" text-anchor="middle" font-size="11" fill="#64748b">윗면 (PULL)</text>
          <text x="${ox}" y="${oy - s + 5}" text-anchor="middle" font-size="11" fill="#64748b">뒷면</text>
          <text x="${ox - s}" y="${oy + 5}" text-anchor="middle" font-size="11" fill="#64748b">왼쪽면</text>
          <text x="${ox + s}" y="${oy + 5}" text-anchor="middle" font-size="11" fill="#64748b">오른쪽면</text>
        </svg>
      `;
    }

    generatePrismSVG() {
      const w = this.dimensions.prism.width * 18;
      const l = this.dimensions.prism.length * 18;
      const triH = (Math.sqrt(3) / 2) * w;
      const ox = 250, oy = 250;
      const cutColor = this.showCut ? '#1e293b' : 'none';
      const foldColor = this.showFold ? '#4f46e5' : 'none';
      const punchColor = this.showPunch ? '#ef4444' : 'none';

      return `
        <svg viewBox="0 0 500 500" class="w-full h-full max-h-[460px] mx-auto bg-white border border-slate-200 rounded-lg shadow-inner">
          <rect width="100%" height="100%" fill="#fafafa" />
          <g fill="#f0fdf4" fill-opacity="0.6">
            <rect x="${ox - 1.5*w}" y="${oy - l/2}" width="${3*w}" height="${l}" />
            <polygon points="${ox - w/2},${oy + l/2} ${ox + w/2},${oy + l/2} ${ox},${oy + l/2 + triH}" />
            <polygon points="${ox - w/2},${oy - l/2} ${ox + w/2},${oy - l/2} ${ox},${oy - l/2 - triH}" />
          </g>
          <path d="
            M ${ox - 1.5*w} ${oy - l/2} H ${ox - w/2} L ${ox} ${oy - l/2 - triH} L ${ox + w/2} ${oy - l/2} H ${ox + 1.5*w} V ${oy + l/2} H ${ox + w/2} L ${ox} ${oy + l/2 + triH} L ${ox - w/2} ${oy + l/2} H ${ox - 1.5*w} Z
          " fill="none" stroke="${cutColor}" stroke-width="2.5" />
          <g stroke="${foldColor}" stroke-width="2" stroke-dasharray="5,4">
            <line x1="${ox - w/2}" y1="${oy - l/2}" x2="${ox - w/2}" y2="${oy + l/2}" />
            <line x1="${ox + w/2}" y1="${oy - l/2}" x2="${ox + w/2}" y2="${oy + l/2}" />
            <line x1="${ox - w/2}" y1="${oy - l/2}" x2="${ox + w/2}" y2="${oy - l/2}" />
            <line x1="${ox - w/2}" y1="${oy + l/2}" x2="${ox + w/2}" y2="${oy + l/2}" />
          </g>
          <g fill="${punchColor}" stroke="#b91c1c" stroke-width="1.5">
            <circle cx="${ox}" cy="${oy - l/2 - triH + 12}" r="5" />
            <circle cx="${ox}" cy="${oy + l/2 + triH - 12}" r="5" />
            <circle cx="${ox - 1.5*w + 10}" cy="${oy}" r="5" />
            <circle cx="${ox + 1.5*w - 10}" cy="${oy}" r="5" />
          </g>
          <text x="${ox}" y="${oy}" text-anchor="middle" font-size="12" fill="#475569" font-weight="bold">중앙 직사각형(밑면)</text>
          <text x="${ox - w}" y="${oy}" text-anchor="middle" font-size="11" fill="#64748b">옆면 1</text>
          <text x="${ox + w}" y="${oy}" text-anchor="middle" font-size="11" fill="#64748b">옆면 2</text>
        </svg>
      `;
    }

    generateCylinderSVG() {
      const w = this.dimensions.cylinder.width * 14;
      const h = this.dimensions.cylinder.height * 14;
      const r = this.dimensions.cylinder.radius * 14;
      const ox = 250, oy = 250;
      const cutColor = this.showCut ? '#1e293b' : 'none';
      const foldColor = this.showFold ? '#4f46e5' : 'none';
      const punchColor = this.showPunch ? '#ef4444' : 'none';

      return `
        <svg viewBox="0 0 500 500" class="w-full h-full max-h-[460px] mx-auto bg-white border border-slate-200 rounded-lg shadow-inner">
          <rect width="100%" height="100%" fill="#fffbf5" />
          <g fill="#fef3c7" fill-opacity="0.6">
            <rect x="${ox - w/2}" y="${oy - h/2}" width="${w}" height="${h}" />
            <circle cx="${ox}" cy="${oy - h/2 - r}" r="${r}" />
            <circle cx="${ox}" cy="${oy + h/2 + r}" r="${r}" />
          </g>
          <g stroke="${cutColor}" stroke-width="2.5" fill="none">
            <rect x="${ox - w/2}" y="${oy - h/2}" width="${w}" height="${h}" />
            <circle cx="${ox}" cy="${oy - h/2 - r}" r="${r}" />
            <circle cx="${ox}" cy="${oy + h/2 + r}" r="${r}" />
          </g>
          <g stroke="${foldColor}" stroke-width="2" stroke-dasharray="5,4">
            <line x1="${ox - 15}" y1="${oy - h/2}" x2="${ox + 15}" y2="${oy - h/2}" />
            <line x1="${ox - 15}" y1="${oy + h/2}" x2="${ox + 15}" y2="${oy + h/2}" />
          </g>
          <g fill="${punchColor}" stroke="#b91c1c" stroke-width="1.5">
            <circle cx="${ox - w/2 + 8}" cy="${oy - h/3}" r="4" />
            <circle cx="${ox - w/2 + 8}" cy="${oy}" r="4" />
            <circle cx="${ox - w/2 + 8}" cy="${oy + h/3}" r="4" />
            <circle cx="${ox + w/2 - 8}" cy="${oy - h/3}" r="4" />
            <circle cx="${ox + w/2 - 8}" cy="${oy}" r="4" />
            <circle cx="${ox + w/2 - 8}" cy="${oy + h/3}" r="4" />
          </g>
          <text x="${ox}" y="${oy}" text-anchor="middle" font-size="12" fill="#475569" font-weight="bold">옆면 직사각형 (${this.dimensions.cylinder.width}cm × ${this.dimensions.cylinder.height}cm)</text>
          <text x="${ox}" y="${oy - h/2 - r + 4}" text-anchor="middle" font-size="11" fill="#64748b">밑면 원 (반지름 ${this.dimensions.cylinder.radius}cm)</text>
        </svg>
      `;
    }

    generatePyramidSVG() {
      const r = this.dimensions.pyramid.radius * 16;
      const slant = this.dimensions.pyramid.slant * 16;
      const ox = 250, oy = 250;
      const cutColor = this.showCut ? '#1e293b' : 'none';
      const foldColor = this.showFold ? '#4f46e5' : 'none';
      const punchColor = this.showPunch ? '#ef4444' : 'none';

      const hexPoints = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        hexPoints.push({
          x: ox + r * Math.cos(angle),
          y: oy + r * Math.sin(angle)
        });
      }

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
          <polygon points="${hexPoly}" fill="#e0e7ff" fill-opacity="0.8" />
          <path d="${triPaths}" fill="#fce7f3" fill-opacity="0.6" stroke="${cutColor}" stroke-width="2" />
          <polygon points="${hexPoly}" fill="none" stroke="${foldColor}" stroke-width="2" stroke-dasharray="5,4" />
          <g fill="${punchColor}" stroke="#b91c1c" stroke-width="1.5">
            ${punchPoints.map(p => {
              const hx = p.x - 10 * Math.cos(p.angle);
              const hy = p.y - 10 * Math.sin(p.angle);
              return `<circle cx="${hx}" cy="${hy}" r="5" />`;
            }).join('')}
          </g>
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

  // ===================== 3. 초등 교과 퀴즈 =====================
  class MathQuiz {
    constructor(containerId, onAction) {
      this.container = document.getElementById(containerId);
      this.onAction = onAction;
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
            explain: '각뿔은 모든 옆면이 하나의 공통된 꼭짓점(각뿔의 꼭짓점)으로 모이는 구조를 가집니다.'
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
          <h3 class="text-base font-bold text-slate-800 leading-snug">${item.q}</h3>
          <div class="space-y-2 mt-3" id="quiz-options">
            ${item.options.map((opt, idx) => `
              <button data-idx="${idx}" class="quiz-opt-btn w-full text-left px-4 py-2.5 rounded-lg border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 text-sm font-medium text-slate-700 transition flex items-center justify-between">
                <span>${idx + 1}. ${opt}</span>
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
        btn.addEventListener('click', () => {
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

  // ===================== 4. DIY 제작 가이드 =====================
  class DiyGuide {
    constructor(containerId) {
      this.container = document.getElementById(containerId);
    }

    render() {
      if (!this.container) return;
      this.container.innerHTML = `
        <div class="space-y-6">
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
        </div>
      `;
    }
  }

  // ===================== 5. 앱 초기화 및 이벤트 연결 =====================
  function initApp() {
    const simulator = new ShapeSimulator('canvas3d-container');
    const blueprint = new BlueprintGenerator('blueprint-preview');
    const guide = new DiyGuide('guide-container');

    const quiz = new MathQuiz('quiz-container', (action) => {
      if (action === 'correct') {
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

    let currentShape = 'cube';
    let currentMode = 'sim';

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
        if (k === modeKey) modePanels[k].classList.remove('hidden');
        else modePanels[k].classList.add('hidden');
      });
      if (modeKey === 'blueprint') blueprint.render();
    }

    function updateAllProgress(val) {
      const p = Math.max(0, Math.min(1, val));
      pullSlider.value = Math.round(p * 100);
      pullPercentage.textContent = `${Math.round(p * 100)}%`;
      simulator.setProgress(p);

      const pullOffset = p * 60;
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

    shapeTabs.forEach(tab => {
      tab.addEventListener('click', () => switchShape(tab.dataset.shape));
    });

    modeTabs.forEach(tab => {
      tab.addEventListener('click', () => switchMode(tab.dataset.mode));
    });

    pullSlider.addEventListener('input', (e) => {
      updateAllProgress(parseFloat(e.target.value) / 100);
    });

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
      const deltaP = (dy / 100) * 100;
      const newVal = Math.max(0, Math.min(100, startVal + deltaP));
      updateAllProgress(newVal / 100);
    });

    pullHandle.addEventListener('pointerup', (e) => {
      isDragging = false;
      try { pullHandle.releasePointerCapture(e.pointerId); } catch (_) {}
    });

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

    document.getElementById('bp-layer-cut')?.addEventListener('change', (e) => blueprint.setLayer('cut', e.target.checked));
    document.getElementById('bp-layer-fold')?.addEventListener('change', (e) => blueprint.setLayer('fold', e.target.checked));
    document.getElementById('bp-layer-punch')?.addEventListener('change', (e) => blueprint.setLayer('punch', e.target.checked));
    document.getElementById('bp-layer-thread')?.addEventListener('change', (e) => blueprint.setLayer('thread', e.target.checked));

    document.getElementById('btn-download-svg')?.addEventListener('click', () => blueprint.downloadSVG());
    document.getElementById('btn-print-bp')?.addEventListener('click', () => blueprint.printBlueprint());

    switchShape('cube');
    switchMode('sim');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();

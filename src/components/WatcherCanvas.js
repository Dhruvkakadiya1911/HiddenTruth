'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import s from './WatcherCanvas.module.css';

export default function WatcherCanvas() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0.4, 4.6);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.domElement.className = s.webglCanvas;
    container.appendChild(renderer.domElement);

    // 2. Character Group (Centered in background)
    const characterGroup = new THREE.Group();
    characterGroup.position.set(0, -0.4, 0);
    scene.add(characterGroup);

    // ─── Human Detective Materials ───
    // Natural warm bronze/dusk human skin with smooth organic shading
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xb48464, // Natural warm detective complexion
      roughness: 0.58,
      metalness: 0.04,
      flatShading: false,
    });

    const lipMat = new THREE.MeshStandardMaterial({
      color: 0x8b5548,
      roughness: 0.5,
      metalness: 0.05,
      flatShading: false,
    });

    const hairBrowMat = new THREE.MeshStandardMaterial({
      color: 0x181318,
      roughness: 0.8,
      metalness: 0.1,
    });

    const suitWoolMat = new THREE.MeshStandardMaterial({
      color: 0x0f1220, // Deep midnight charcoal wool suit
      roughness: 0.45,
      metalness: 0.25,
      flatShading: false,
    });

    const lapelMat = new THREE.MeshStandardMaterial({
      color: 0x0a0c16,
      roughness: 0.35,
      metalness: 0.3,
      flatShading: false,
    });

    const shirtMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc, // Crisp white dress shirt
      roughness: 0.45,
      metalness: 0.05,
    });

    const tieMat = new THREE.MeshStandardMaterial({
      color: 0xe11d48, // Crimson silk necktie
      roughness: 0.3,
      metalness: 0.25,
    });

    const glassesFrameMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37, // Polished gold wireframes
      roughness: 0.2,
      metalness: 0.9,
    });

    const glassesLensMat = new THREE.MeshStandardMaterial({
      color: 0x05070d, // Dark polarized noir lenses
      roughness: 0.12,
      metalness: 0.85,
    });

    const fedoraMat = new THREE.MeshStandardMaterial({
      color: 0x121524,
      roughness: 0.4,
      metalness: 0.3,
      flatShading: false,
    });

    const ribbonMat = new THREE.MeshStandardMaterial({
      color: 0xff2a51,
      emissive: 0xff2a51,
      emissiveIntensity: 0.45,
      roughness: 0.25,
      metalness: 0.3,
    });

    // ─── Head Group (Tracks mouse cursor) ───
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.48, 0);
    characterGroup.add(headGroup);

    // Cranium (Oval human skull)
    const craniumGeo = new THREE.SphereGeometry(0.48, 32, 24);
    const craniumMesh = new THREE.Mesh(craniumGeo, skinMat);
    craniumMesh.scale.set(0.92, 1.05, 1.02);
    craniumMesh.position.set(0, 0.12, -0.04);
    headGroup.add(craniumMesh);

    // Jaw & Chin (Sculpted human jawline tapering to chin)
    const jawGeo = new THREE.CylinderGeometry(0.25, 0.45, 0.44, 32);
    const jawMesh = new THREE.Mesh(jawGeo, skinMat);
    jawMesh.position.set(0, -0.15, 0.04);
    jawMesh.scale.set(0.85, 1, 0.95);
    headGroup.add(jawMesh);

    const chinGeo = new THREE.SphereGeometry(0.13, 24, 18);
    const chinMesh = new THREE.Mesh(chinGeo, skinMat);
    chinMesh.position.set(0, -0.34, 0.18);
    chinMesh.scale.set(1.2, 0.85, 1.1);
    headGroup.add(chinMesh);

    // Cheekbones
    const cheekGeo = new THREE.SphereGeometry(0.14, 16, 16);
    const leftCheek = new THREE.Mesh(cheekGeo, skinMat);
    leftCheek.position.set(-0.31, -0.05, 0.14);
    leftCheek.scale.set(0.8, 1.1, 0.8);
    headGroup.add(leftCheek);

    const rightCheek = new THREE.Mesh(cheekGeo, skinMat);
    rightCheek.position.set(0.31, -0.05, 0.14);
    rightCheek.scale.set(0.8, 1.1, 0.8);
    headGroup.add(rightCheek);

    // Ears
    const earGeo = new THREE.TorusGeometry(0.08, 0.025, 12, 24, Math.PI * 1.35);
    const leftEar = new THREE.Mesh(earGeo, skinMat);
    leftEar.position.set(-0.43, 0.02, -0.05);
    leftEar.rotation.y = 0.35;
    leftEar.rotation.z = -0.1;
    headGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, skinMat);
    rightEar.position.set(0.43, 0.02, -0.05);
    rightEar.rotation.y = -0.35;
    rightEar.rotation.z = 0.1;
    headGroup.add(rightEar);

    // Nose (Bridge, tip, nostrils)
    const noseBridgeGeo = new THREE.CylinderGeometry(0.04, 0.065, 0.22, 16);
    const noseBridge = new THREE.Mesh(noseBridgeGeo, skinMat);
    noseBridge.position.set(0, 0.03, 0.44);
    noseBridge.rotation.x = -0.22;
    headGroup.add(noseBridge);

    const noseTipGeo = new THREE.SphereGeometry(0.065, 16, 16);
    const noseTip = new THREE.Mesh(noseTipGeo, skinMat);
    noseTip.position.set(0, -0.07, 0.48);
    headGroup.add(noseTip);

    const nostrilGeo = new THREE.SphereGeometry(0.038, 12, 12);
    const leftNostril = new THREE.Mesh(nostrilGeo, skinMat);
    leftNostril.position.set(-0.065, -0.08, 0.43);
    headGroup.add(leftNostril);

    const rightNostril = new THREE.Mesh(nostrilGeo, skinMat);
    rightNostril.position.set(0.065, -0.08, 0.43);
    headGroup.add(rightNostril);

    // Lips & Mouth
    const upperLipGeo = new THREE.CylinderGeometry(0.024, 0.028, 0.16, 12);
    const upperLip = new THREE.Mesh(upperLipGeo, lipMat);
    upperLip.position.set(0, -0.19, 0.38);
    upperLip.rotation.z = Math.PI / 2;
    headGroup.add(upperLip);

    const lowerLipGeo = new THREE.SphereGeometry(0.044, 16, 12);
    const lowerLip = new THREE.Mesh(lowerLipGeo, lipMat);
    lowerLip.position.set(0, -0.23, 0.37);
    lowerLip.scale.set(1.5, 0.7, 0.8);
    headGroup.add(lowerLip);

    // Eyebrows
    const browGeo = new THREE.BoxGeometry(0.19, 0.035, 0.05);
    const leftBrow = new THREE.Mesh(browGeo, hairBrowMat);
    leftBrow.position.set(-0.16, 0.20, 0.44);
    leftBrow.rotation.z = -0.08;
    headGroup.add(leftBrow);

    const rightBrow = new THREE.Mesh(browGeo, hairBrowMat);
    rightBrow.position.set(0.16, 0.20, 0.44);
    rightBrow.rotation.z = 0.08;
    headGroup.add(rightBrow);

    // ─── Sleek Noir Investigator Sunglasses ───
    const glassesGroup = new THREE.Group();
    glassesGroup.position.set(0, 0.12, 0.40);

    // Bridge bar
    const bridgeGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8);
    const bridgeMesh = new THREE.Mesh(bridgeGeo, glassesFrameMat);
    bridgeMesh.rotation.z = Math.PI / 2;
    bridgeMesh.position.set(0, 0.02, 0.05);
    glassesGroup.add(bridgeMesh);

    // Left and Right Lenses (Aviator teardrop shape)
    const lensGeo = new THREE.CylinderGeometry(0.14, 0.12, 0.03, 24);
    lensGeo.rotateX(Math.PI / 2);

    const leftLens = new THREE.Mesh(lensGeo, glassesLensMat);
    leftLens.position.set(-0.17, -0.01, 0.04);
    leftLens.scale.set(1.1, 0.95, 1);
    glassesGroup.add(leftLens);

    const rightLens = new THREE.Mesh(lensGeo, glassesLensMat);
    rightLens.position.set(0.17, -0.01, 0.04);
    rightLens.scale.set(1.1, 0.95, 1);
    glassesGroup.add(rightLens);

    // Thin wire rims
    const rimGeo = new THREE.TorusGeometry(0.14, 0.012, 12, 28);
    const leftRim = new THREE.Mesh(rimGeo, glassesFrameMat);
    leftRim.position.set(-0.17, -0.01, 0.045);
    glassesGroup.add(leftRim);

    const rightRim = new THREE.Mesh(rimGeo, glassesFrameMat);
    rightRim.position.set(0.17, -0.01, 0.045);
    glassesGroup.add(rightRim);

    // Crimson optical HUD glint behind glasses
    const glintGeo = new THREE.BoxGeometry(0.10, 0.02, 0.02);
    const glintMat = new THREE.MeshBasicMaterial({ color: 0xff2a51 });
    const leftGlint = new THREE.Mesh(glintGeo, glintMat);
    leftGlint.position.set(-0.17, 0, 0.055);
    glassesGroup.add(leftGlint);

    const rightGlint = new THREE.Mesh(glintGeo, glintMat);
    rightGlint.position.set(0.17, 0, 0.055);
    glassesGroup.add(rightGlint);

    headGroup.add(glassesGroup);

    // Visor point light casting dramatic crimson aura forward
    const visorLight = new THREE.PointLight(0xff2a51, 3.2, 2.5);
    visorLight.position.set(0, 0.12, 0.6);
    headGroup.add(visorLight);

    // ─── Sculpted Noir Fedora Hat ───
    const hatGroup = new THREE.Group();
    hatGroup.position.set(0, 0.44, 0.02);
    hatGroup.rotation.x = -0.10; // Jaunty forward dip
    hatGroup.rotation.z = -0.04;

    // Curved Brim (Iconic detective swoop)
    const brimGeo = new THREE.CylinderGeometry(0.88, 0.88, 0.035, 32);
    brimGeo.scale(1.0, 1.0, 1.18);
    const brimPos = brimGeo.attributes.position;
    for (let i = 0; i < brimPos.count; i++) {
      const z = brimPos.getZ(i);
      const x = brimPos.getX(i);
      let y = brimPos.getY(i);
      if (z > 0.2) y -= Math.pow(z - 0.2, 1.8) * 0.16;
      if (Math.abs(x) > 0.5) y += Math.pow(Math.abs(x) - 0.5, 2) * 0.18;
      if (z < -0.3) y += Math.pow(Math.abs(z) - 0.3, 1.5) * 0.08;
      brimPos.setY(i, y);
    }
    brimGeo.computeVertexNormals();
    const brimMesh = new THREE.Mesh(brimGeo, fedoraMat);
    hatGroup.add(brimMesh);

    // Pinched Crown
    const crownGeo = new THREE.CylinderGeometry(0.40, 0.48, 0.50, 32, 12);
    crownGeo.scale(0.92, 1.0, 1.05);
    const crownPos = crownGeo.attributes.position;
    for (let i = 0; i < crownPos.count; i++) {
      const y = crownPos.getY(i);
      const x = crownPos.getX(i);
      const z = crownPos.getZ(i);
      if (y > 0 && Math.abs(x) > 0.18 && z > -0.1) {
        crownPos.setX(i, x * 0.82);
      }
      if (y > 0.16 && Math.abs(x) < 0.14) {
        crownPos.setY(i, y - 0.08 * (1 - Math.abs(x) / 0.14));
      }
    }
    crownGeo.computeVertexNormals();
    const crownMesh = new THREE.Mesh(crownGeo, fedoraMat);
    crownMesh.position.set(0, 0.25, 0);
    hatGroup.add(crownMesh);

    // Crimson Silk Hat Ribbon
    const ribbonGeo = new THREE.CylinderGeometry(0.482, 0.486, 0.085, 32);
    const ribbonMesh = new THREE.Mesh(ribbonGeo, ribbonMat);
    ribbonMesh.position.set(0, 0.075, 0);
    ribbonMesh.scale.set(0.93, 1.0, 1.06);
    hatGroup.add(ribbonMesh);

    headGroup.add(hatGroup);

    // ─── Human Neck & Tailored Suit Body Structure ───
    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.20, 0.24, 0.38, 24);
    const neckMesh = new THREE.Mesh(neckGeo, skinMat);
    neckMesh.position.set(0, 0.12, 0);
    neckMesh.rotation.x = 0.05;
    characterGroup.add(neckMesh);

    // Crisp White Shirt Collar
    const shirtCollarGeo = new THREE.ConeGeometry(0.32, 0.28, 4);
    const shirtCollarMesh = new THREE.Mesh(shirtCollarGeo, shirtMat);
    shirtCollarMesh.position.set(0, 0.04, 0.12);
    shirtCollarMesh.rotation.x = 0.55;
    shirtCollarMesh.scale.set(1.1, 1, 0.3);
    characterGroup.add(shirtCollarMesh);

    // Crimson Silk Tie
    const tieGroup = new THREE.Group();
    tieGroup.position.set(0, -0.05, 0.20);

    const tieKnotGeo = new THREE.CylinderGeometry(0.045, 0.03, 0.08, 4);
    const tieKnot = new THREE.Mesh(tieKnotGeo, tieMat);
    tieKnot.rotation.y = Math.PI / 4;
    tieGroup.add(tieKnot);

    const tieBladeGeo = new THREE.BoxGeometry(0.07, 0.38, 0.02);
    const tieBlade = new THREE.Mesh(tieBladeGeo, tieMat);
    tieBlade.position.set(0, -0.22, 0.01);
    tieGroup.add(tieBlade);

    characterGroup.add(tieGroup);

    // Tailored Suit Jacket (Broad masculine silhouette)
    const suitChestGeo = new THREE.CylinderGeometry(0.48, 0.96, 0.95, 24);
    const suitChest = new THREE.Mesh(suitChestGeo, suitWoolMat);
    suitChest.position.set(0, -0.46, 0);
    suitChest.scale.set(1.42, 1, 0.76);
    characterGroup.add(suitChest);

    // Deltoids / Shoulder Caps
    const deltoidGeo = new THREE.SphereGeometry(0.24, 18, 18);
    const leftDeltoid = new THREE.Mesh(deltoidGeo, suitWoolMat);
    leftDeltoid.position.set(-0.70, -0.22, 0);
    leftDeltoid.scale.set(1.1, 1.2, 0.85);
    characterGroup.add(leftDeltoid);

    const rightDeltoid = new THREE.Mesh(deltoidGeo, suitWoolMat);
    rightDeltoid.position.set(0.70, -0.22, 0);
    rightDeltoid.scale.set(1.1, 1.2, 0.85);
    characterGroup.add(rightDeltoid);

    // Peaked Suit Lapels
    const lapelGeo = new THREE.BoxGeometry(0.18, 0.52, 0.06);
    const leftLapel = new THREE.Mesh(lapelGeo, lapelMat);
    leftLapel.position.set(-0.25, -0.15, 0.16);
    leftLapel.rotation.z = -0.32;
    leftLapel.rotation.y = 0.28;
    characterGroup.add(leftLapel);

    const rightLapel = new THREE.Mesh(lapelGeo, lapelMat);
    rightLapel.position.set(0.25, -0.15, 0.16);
    rightLapel.rotation.z = 0.32;
    rightLapel.rotation.y = -0.28;
    characterGroup.add(rightLapel);

    // 3. High-Contrast Neo-Noir Studio Lighting
    const ambientLight = new THREE.AmbientLight(0x181c2e, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xdbeafe, 2.8);
    keyLight.position.set(0, 2.5, 3.5);
    scene.add(keyLight);

    const topLight = new THREE.PointLight(0x38bdf8, 4.2, 7);
    topLight.position.set(0, 3.0, 0.6);
    scene.add(topLight);

    const redRimLight = new THREE.PointLight(0xff2a51, 9.5, 9);
    redRimLight.position.set(-2.2, 0.6, 1.0);
    scene.add(redRimLight);

    const cyanRimLight = new THREE.PointLight(0x00f0ff, 9.0, 9);
    cyanRimLight.position.set(2.2, 0.6, 1.0);
    scene.add(cyanRimLight);

    const violetBackLight = new THREE.PointLight(0xa855f7, 6.0, 8);
    violetBackLight.position.set(0, 1.5, -2.0);
    scene.add(violetBackLight);

    // 4. Interactive Cursor Tracking & Animation Loop
    let targetRotY = 0;
    let targetRotX = 0;
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e) => {
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseX = normX;
      mouseY = normY;
      targetRotY = normX * 0.45;
      targetRotX = -normY * 0.25;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Handle Resize
    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      characterGroup.position.x = 0;
    };

    window.addEventListener('resize', handleResize);

    // Render loop
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Biomechanical Head & Torso tracking
      headGroup.rotation.y += (targetRotY * 1.15 - headGroup.rotation.y) * 0.06;
      headGroup.rotation.x += (targetRotX * 0.90 - headGroup.rotation.x) * 0.06;
      characterGroup.rotation.y += (targetRotY * 0.30 - characterGroup.rotation.y) * 0.04;

      // Subtle breathing oscillation
      characterGroup.position.y = -0.4 + Math.sin(elapsedTime * 1.5) * 0.025;

      renderer.render(scene, camera);
    };

    animate();

    // 5. Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);

      // Recursively dispose scene geometries and materials
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });

      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} className={s.canvasContainer} />;
}

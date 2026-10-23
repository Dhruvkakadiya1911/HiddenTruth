'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import s from './RoleModelCanvas.module.css';

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROLE CONFIGURATIONS & ACCENTS                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */
const ROLE_CONFIGS = {
  detective: {
    accent: 0x22d3ee,
    accentHex: '#22d3ee',
    glowClass: s.glowDetective,
    label: 'The Detective',
  },
  killer: {
    accent: 0xff1744,
    accentHex: '#ff1744',
    glowClass: s.glowKiller,
    label: 'The Killer',
  },
  suspect: {
    accent: 0xa855f7,
    accentHex: '#a855f7',
    glowClass: s.glowSuspect,
    label: 'Prime Suspect',
  },
  witness: {
    accent: 0xfbbf24,
    accentHex: '#fbbf24',
    glowClass: s.glowWitness,
    label: 'The Witness',
  },
};

function normalizeRole(role) {
  const r = (role || '').toLowerCase();
  if (r.includes('detective')) return 'detective';
  if (r.includes('killer')) return 'killer';
  if (r.includes('witness')) return 'witness';
  return 'suspect';
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  PROCEDURAL CONTACT SHADOW TEXTURE                                          */
/* ═══════════════════════════════════════════════════════════════════════════ */
function createShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  gradient.addColorStop(0.35, 'rgba(0, 0, 0, 0.42)');
  gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.12)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  STYLIZED PROPER EYES & BLINK RIG                                          */
/* ═══════════════════════════════════════════════════════════════════════════ */
function createStylizedEyes({
  irisColor = 0x0ea5e9,
  eyeSpacing = 0.14,
  eyeY = 0.04,
  eyeZ = 0.35,
  eyeScale = 1.0,
  browAngle = 0,
  browY = 0.14,
  isPredator = false,
}) {
  const eyesGroup = new THREE.Group();

  const eyeWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xfafafa,
    roughness: 0.15,
    metalness: 0.05,
  });

  const irisMat = new THREE.MeshStandardMaterial({
    color: irisColor,
    roughness: 0.2,
    metalness: 0.2,
    ...(isPredator ? { emissive: irisColor, emissiveIntensity: 2.2 } : {}),
  });

  const pupilMat = new THREE.MeshStandardMaterial({
    color: 0x050508,
    roughness: 0.1,
    metalness: 0.1,
  });

  const specularMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });

  const browMat = new THREE.MeshStandardMaterial({
    color: 0x242430,
    roughness: 0.6,
    metalness: 0.1,
  });

  // Helper to build a single eye
  function buildEye(side) {
    const eyeAnchor = new THREE.Group();
    eyeAnchor.position.set(side * eyeSpacing, eyeY, eyeZ);

    if (isPredator) {
      // Menacing glowing slit/almond eye for Killer
      const slitGeo = new THREE.BoxGeometry(0.08 * eyeScale, 0.022 * eyeScale, 0.02);
      const slit = new THREE.Mesh(slitGeo, irisMat);
      slit.rotation.z = side * -0.22;
      eyeAnchor.add(slit);
      return { anchor: eyeAnchor, pupils: [] };
    }

    // Normal expressive collectible vinyl eye
    const scleraGeo = new THREE.SphereGeometry(0.065 * eyeScale, 16, 14);
    scleraGeo.scale(1, 1.2, 0.6);
    const sclera = new THREE.Mesh(scleraGeo, eyeWhiteMat);
    eyeAnchor.add(sclera);

    // Iris disc
    const irisGeo = new THREE.CylinderGeometry(
      0.042 * eyeScale,
      0.042 * eyeScale,
      0.015,
      16
    );
    irisGeo.rotateX(Math.PI / 2);
    const iris = new THREE.Mesh(irisGeo, irisMat);
    iris.position.set(0, 0, 0.035 * eyeScale);
    eyeAnchor.add(iris);

    // Dark pupil
    const pupilGeo = new THREE.CylinderGeometry(
      0.024 * eyeScale,
      0.024 * eyeScale,
      0.018,
      14
    );
    pupilGeo.rotateX(Math.PI / 2);
    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.set(0, 0, 0.038 * eyeScale);
    eyeAnchor.add(pupil);

    // Glossy catchlight gleams
    const gleam1 = new THREE.Mesh(
      new THREE.SphereGeometry(0.012 * eyeScale, 8, 8),
      specularMat
    );
    gleam1.position.set(0.014 * eyeScale, 0.018 * eyeScale, 0.046 * eyeScale);
    eyeAnchor.add(gleam1);

    const gleam2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.007 * eyeScale, 6, 6),
      specularMat
    );
    gleam2.position.set(-0.012 * eyeScale, -0.014 * eyeScale, 0.046 * eyeScale);
    eyeAnchor.add(gleam2);

    return { anchor: eyeAnchor, pupils: [pupil, iris] };
  }

  const leftEyeData = buildEye(-1);
  const rightEyeData = buildEye(1);
  eyesGroup.add(leftEyeData.anchor, rightEyeData.anchor);

  // Eyebrows
  const leftBrow = new THREE.Mesh(
    new THREE.BoxGeometry(0.09 * eyeScale, 0.024, 0.025),
    browMat
  );
  leftBrow.position.set(-eyeSpacing, browY, eyeZ + 0.03);
  leftBrow.rotation.z = browAngle;
  eyesGroup.add(leftBrow);

  const rightBrow = new THREE.Mesh(
    new THREE.BoxGeometry(0.09 * eyeScale, 0.024, 0.025),
    browMat
  );
  rightBrow.position.set(eyeSpacing, browY, eyeZ + 0.03);
  rightBrow.rotation.z = -browAngle;
  eyesGroup.add(rightBrow);

  return {
    eyesGroup,
    leftEyeAnchor: leftEyeData.anchor,
    rightEyeAnchor: rightEyeData.anchor,
    leftBrow,
    rightBrow,
    setBlink(val) {
      leftEyeData.anchor.scale.y = val;
      rightEyeData.anchor.scale.y = val;
    },
    setPupilShift(x, y) {
      leftEyeData.pupils.forEach((p) => {
        p.position.x = x * 0.015;
        p.position.y = y * 0.015;
      });
      rightEyeData.pupils.forEach((p) => {
        p.position.x = x * 0.015;
        p.position.y = y * 0.015;
      });
    },
  };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SHARED BASE FIGURINE BUILDER                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */
function createBaseFigurine(accentHex) {
  const rootGroup = new THREE.Group();
  const bodyGroup = new THREE.Group();
  rootGroup.add(bodyGroup);

  // 1. Soft Contact Shadow Plane
  const shadowTex = createShadowTexture();
  const shadowGeo = new THREE.PlaneGeometry(1.6, 1.6);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = -0.84;
  rootGroup.add(shadowMesh);

  // 2. Premium Vinyl Plinth Stand
  const plinthGeo = new THREE.CylinderGeometry(0.56, 0.6, 0.07, 36);
  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0x0c0e16,
    roughness: 0.35,
    metalness: 0.25,
  });
  const plinth = new THREE.Mesh(plinthGeo, plinthMat);
  plinth.position.y = -0.81;
  rootGroup.add(plinth);

  // Plinth metallic accent trim ring
  const trimGeo = new THREE.TorusGeometry(0.58, 0.012, 16, 40);
  const trimMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    roughness: 0.25,
    metalness: 0.85,
    emissive: accentHex,
    emissiveIntensity: 0.2,
  });
  const trim = new THREE.Mesh(trimGeo, trimMat);
  trim.rotation.x = Math.PI / 2;
  trim.position.y = -0.78;
  rootGroup.add(trim);

  // 3. Hierarchical Body Nodes
  const legsGroup = new THREE.Group();
  legsGroup.position.set(0, -0.42, 0);
  bodyGroup.add(legsGroup);

  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0, 0);
  bodyGroup.add(torsoGroup);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.42, 0);
  bodyGroup.add(headGroup);

  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-0.32, 0.24, 0);
  bodyGroup.add(leftArmGroup);

  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(0.32, 0.24, 0);
  bodyGroup.add(rightArmGroup);

  // Shared Vinyl Materials
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xf1cbab,
    roughness: 0.45,
    metalness: 0.05,
  });

  // Base Chibi Head
  const headGeo = new THREE.SphereGeometry(0.38, 32, 24);
  headGeo.scale(1, 0.98, 0.95);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headGroup.add(headMesh);

  // Cute Little Neck
  const neckGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.15, 16);
  const neck = new THREE.Mesh(neckGeo, skinMat);
  neck.position.set(0, -0.22, 0);
  headGroup.add(neck);

  return {
    rootGroup,
    bodyGroup,
    legsGroup,
    torsoGroup,
    headGroup,
    leftArmGroup,
    rightArmGroup,
    headMesh,
    skinMat,
    shadowTex,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  1. DETECTIVE AVATAR BUILDER                                                */
/* ═══════════════════════════════════════════════════════════════════════════ */
function buildDetective(accentHex) {
  const base = createBaseFigurine(accentHex);
  const { legsGroup, torsoGroup, headGroup, leftArmGroup, rightArmGroup } = base;

  // Materials
  const trenchMat = new THREE.MeshStandardMaterial({
    color: 0xb5895c, // Camel-tan warm vinyl
    roughness: 0.45,
    metalness: 0.1,
  });

  const lapelMat = new THREE.MeshStandardMaterial({
    color: 0x9f7347,
    roughness: 0.4,
    metalness: 0.12,
  });

  const scarfMat = new THREE.MeshStandardMaterial({
    color: 0xa82835, // Deep crimson silk scarf
    roughness: 0.35,
    metalness: 0.2,
  });

  const trouserMat = new THREE.MeshStandardMaterial({
    color: 0x222633, // Charcoal wool
    roughness: 0.55,
    metalness: 0.1,
  });

  const bootMat = new THREE.MeshStandardMaterial({
    color: 0x2a1a12, // Dark brogue leather
    roughness: 0.35,
    metalness: 0.2,
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.22,
    metalness: 0.88,
  });

  // Optical Transparent Glass Lens
  const glassLensMat = new THREE.MeshPhysicalMaterial({
    color: 0xe0f7fa,
    transmission: 0.94,
    roughness: 0.06,
    ior: 1.52,
    thickness: 0.28,
    transparent: true,
  });

  // ─── Legs & Shoes ───
  [-0.14, 0.14].forEach((x) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.085, 0.36, 16), trouserMat);
    leg.position.set(x, -0.06, 0);
    legsGroup.add(leg);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.11, 0.22), bootMat);
    boot.position.set(x, -0.28, 0.03);
    legsGroup.add(boot);
  });

  // ─── Torso & Trench Coat ───
  // Coat Main Body
  const torsoMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.45, 20), trenchMat);
  torsoMesh.position.set(0, 0.02, 0);
  torsoGroup.add(torsoMesh);

  // Flared Coat Lower Hem
  const skirtMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.46, 0.32, 22), trenchMat);
  skirtMesh.position.set(0, -0.25, 0);
  torsoGroup.add(skirtMesh);

  // Waist Belt with Brass Buckle
  const beltMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.365, 0.06, 22), lapelMat);
  beltMesh.position.set(0, -0.08, 0);
  torsoGroup.add(beltMesh);

  const buckleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.03), brassMat);
  buckleMesh.position.set(0, -0.08, 0.36);
  torsoGroup.add(buckleMesh);

  // Popped Collar / Lapels
  const leftLapel = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.28, 0.04), lapelMat);
  leftLapel.position.set(-0.12, 0.15, 0.23);
  leftLapel.rotation.set(-0.1, 0.25, -0.2);
  torsoGroup.add(leftLapel);

  const rightLapel = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.28, 0.04), lapelMat);
  rightLapel.position.set(0.12, 0.15, 0.23);
  rightLapel.rotation.set(-0.1, -0.25, 0.2);
  torsoGroup.add(rightLapel);

  // Double-breasted horn buttons
  [-0.08, 0.08].forEach((bx) => {
    [0.08, 0.18].forEach((by) => {
      const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 10), brassMat);
      btn.rotation.x = Math.PI / 2;
      btn.position.set(bx, by, 0.28);
      torsoGroup.add(btn);
    });
  });

  // Silk Scarf tucked in
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 12, 24), scarfMat);
  scarf.rotation.x = Math.PI / 2.2;
  scarf.position.set(0, 0.23, 0.05);
  torsoGroup.add(scarf);

  // ─── Arms & Props ───
  // Left arm resting in coat pocket
  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.36, 14), trenchMat);
  leftArm.position.set(-0.06, -0.14, 0.08);
  leftArm.rotation.set(0.3, 0, -0.28);
  leftArmGroup.add(leftArm);

  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), base.skinMat);
  leftHand.position.set(-0.12, -0.3, 0.16);
  leftArmGroup.add(leftHand);

  // Right arm raised holding magnifying glass
  const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.34, 14), trenchMat);
  rightArm.position.set(0.06, -0.08, 0.14);
  rightArm.rotation.set(0.85, 0.2, 0.2);
  rightArmGroup.add(rightArm);

  const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), base.skinMat);
  rightHand.position.set(0.12, -0.22, 0.28);
  rightArmGroup.add(rightHand);

  // Brass Magnifying Glass Assembly
  const glassAssembly = new THREE.Group();
  glassAssembly.position.set(0.12, -0.22, 0.28);
  glassAssembly.rotation.set(-0.4, 0.35, 0.1);

  // Handle
  const handleMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.26, 12), brassMat);
  handleMesh.position.set(0, -0.13, 0);
  glassAssembly.add(handleMesh);

  // Brass Ring Frame
  const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.02, 16, 32), brassMat);
  ringMesh.position.set(0, 0.17, 0);
  glassAssembly.add(ringMesh);

  // Physical Glass Lens
  const lensMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.022, 32), glassLensMat);
  lensMesh.rotation.x = Math.PI / 2;
  lensMesh.position.set(0, 0.17, 0);
  glassAssembly.add(lensMesh);

  rightArmGroup.add(glassAssembly);

  // ─── Head, Fedora & Face ───
  const fedoraMat = new THREE.MeshStandardMaterial({
    color: 0x222633, // Midnight slate
    roughness: 0.42,
    metalness: 0.18,
  });

  const hatBandMat = new THREE.MeshStandardMaterial({
    color: accentHex, // Cyan ribbon
    roughness: 0.3,
    metalness: 0.5,
    emissive: accentHex,
    emissiveIntensity: 0.3,
  });

  // Fedora Group (tilted thoughtfully)
  const fedoraGroup = new THREE.Group();
  fedoraGroup.position.set(0, 0.24, -0.02);
  fedoraGroup.rotation.set(0.14, 0.08, -0.06);

  // Crown
  const crownMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.37, 0.28, 24), fedoraMat);
  crownMesh.position.set(0, 0.14, 0);
  fedoraGroup.add(crownMesh);

  // Hat Band
  const bandMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.372, 0.06, 24), hatBandMat);
  bandMesh.position.set(0, 0.04, 0);
  fedoraGroup.add(bandMesh);

  // Curved Brim (Lathe)
  const brimPoints = [
    new THREE.Vector2(0.34, -0.03),
    new THREE.Vector2(0.48, 0.01),
    new THREE.Vector2(0.52, 0.03),
    new THREE.Vector2(0.48, 0.04),
    new THREE.Vector2(0.34, 0.02),
  ];
  const brimMesh = new THREE.Mesh(new THREE.LatheGeometry(brimPoints, 28), fedoraMat);
  fedoraGroup.add(brimMesh);

  headGroup.add(fedoraGroup);

  // Eyes & Eyebrows
  const eyeRig = createStylizedEyes({
    irisColor: 0x0ea5e9, // Cyan steel iris
    eyeSpacing: 0.13,
    eyeY: 0.02,
    eyeZ: 0.34,
    eyeScale: 0.95,
    browAngle: 0.14, // Determined, focused
    browY: 0.11,
  });
  headGroup.add(eyeRig.eyesGroup);

  // ─── Floating 3D Beveled Forensic Star Badge Overhead ───
  const starGroup = new THREE.Group();
  starGroup.position.set(0, 0.74, 0);

  const starShape = new THREE.Shape();
  const numPoints = 5;
  const outerRadius = 0.17;
  const innerRadius = 0.082;
  for (let i = 0; i < numPoints * 2; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const a = (i / (numPoints * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) starShape.moveTo(x, y);
    else starShape.lineTo(x, y);
  }
  starShape.closePath();

  // Central circular hole
  const centerHole = new THREE.Path();
  centerHole.absarc(0, 0, 0.035, 0, Math.PI * 2, true);
  starShape.holes.push(centerHole);

  const starGeom = new THREE.ExtrudeGeometry(starShape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.015,
    bevelThickness: 0.015,
  });
  starGeom.center();

  const starMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    roughness: 0.2,
    metalness: 0.55,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.75,
  });
  const starMesh = new THREE.Mesh(starGeom, starMat);
  starGroup.add(starMesh);

  // Central glowing core jewel
  const jewelMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.038, 12, 12),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: accentHex,
      emissiveIntensity: 1.8,
      roughness: 0.1,
    })
  );
  starGroup.add(jewelMesh);

  headGroup.add(starGroup);

  return {
    ...base,
    accentHex,
    update(time) {
      // Floating Forensic Star Badge bob & rotation
      starGroup.position.y = 0.74 + Math.sin(time * 2.2) * 0.05;
      starGroup.rotation.y = Math.sin(time * 1.5) * 0.35;

      // Idle: magnifying glass slowly sweeps with subtle wrist rotation
      glassAssembly.rotation.x = -0.4 + Math.sin(time * 1.6) * 0.18;
      glassAssembly.rotation.y = 0.35 + Math.cos(time * 1.6) * 0.12;

      // Thoughtful head tilt
      headGroup.rotation.z = Math.sin(time * 1.2) * 0.06;
      headGroup.rotation.x = 0.04 + Math.cos(time * 1.4) * 0.04;

      // Natural blink
      const blinkCycle = time % 3.6;
      const blink = blinkCycle < 0.15 ? Math.sin((blinkCycle / 0.15) * Math.PI) : 0;
      eyeRig.setBlink(1 - blink * 0.92);
    },
  };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  2. KILLER AVATAR BUILDER (UPGRADED NOIR PHANTOM ASSASSIN)                 */
/* ═══════════════════════════════════════════════════════════════════════════ */
function buildKiller(accentHex) {
  const base = createBaseFigurine(accentHex);
  const { legsGroup, torsoGroup, headGroup, leftArmGroup, rightArmGroup } = base;

  // ─── Materials ───
  const cloakMat = new THREE.MeshStandardMaterial({
    color: 0x0a0b12, // Obsidian dark matte wool
    roughness: 0.55,
    metalness: 0.18,
  });

  const innerVelvetMat = new THREE.MeshStandardMaterial({
    color: 0x881337, // Rich deep crimson velvet lining
    roughness: 0.35,
    metalness: 0.25,
  });

  const maskMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9, // Bone-white porcelain phantom skull mask
    roughness: 0.22,
    metalness: 0.12,
  });

  const silverMat = new THREE.MeshStandardMaterial({
    color: 0xc8d1dc, // Engraved antique silver
    roughness: 0.18,
    metalness: 0.9,
  });

  const leatherMat = new THREE.MeshStandardMaterial({
    color: 0x141622, // Dark tactical leather
    roughness: 0.35,
    metalness: 0.25,
  });

  const steelBladeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0, // Polished surgical damascus steel
    roughness: 0.08,
    metalness: 0.96,
  });

  const bloodMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626, // Wet arterial crimson blood
    roughness: 0.18,
    metalness: 0.25,
    emissive: 0x991b1b,
    emissiveIntensity: 0.85,
  });

  const poisonMat = new THREE.MeshStandardMaterial({
    color: 0xff1744, // Lethal glowing crimson poison
    roughness: 0.15,
    metalness: 0.2,
    emissive: 0xdc2626,
    emissiveIntensity: 1.6,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 0.95,
    roughness: 0.05,
    ior: 1.5,
    transparent: true,
  });

  const rubyMat = new THREE.MeshStandardMaterial({
    color: 0xff1744,
    roughness: 0.15,
    metalness: 0.3,
    emissive: 0xff1744,
    emissiveIntensity: 1.8,
  });

  const skullEmblemMat = new THREE.MeshStandardMaterial({
    color: 0xff1744,
    roughness: 0.2,
    metalness: 0.5,
    emissive: 0x991b1b,
    emissiveIntensity: 0.75,
  });

  // ─── 1. Legs & Tactical High Boots with Silver Buckles ───
  [-0.14, 0.14].forEach((x) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.085, 0.36, 16), cloakMat);
    leg.position.set(x, -0.06, 0);
    legsGroup.add(leg);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.12, 0.24), leatherMat);
    boot.position.set(x, -0.28, 0.03);
    legsGroup.add(boot);

    // Silver Boot Buckles
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.015), silverMat);
    buckle.position.set(x, -0.24, 0.15);
    legsGroup.add(buckle);
  });

  // ─── 2. Torso, Layered Cloak & Crimson Silk Lining ───
  const torsoMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.5, 20), cloakMat);
  torsoMesh.position.set(0, 0.04, 0);
  torsoGroup.add(torsoMesh);

  // Inner Crimson Lining (peeks out when viewing from front/angle)
  const innerLapelLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 0.04), innerVelvetMat);
  innerLapelLeft.position.set(-0.11, 0.03, 0.26);
  innerLapelLeft.rotation.y = 0.25;
  torsoGroup.add(innerLapelLeft);

  const innerLapelRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 0.04), innerVelvetMat);
  innerLapelRight.position.set(0.11, 0.03, 0.26);
  innerLapelRight.rotation.y = -0.25;
  torsoGroup.add(innerLapelRight);

  // Cloak Lower Flared Hem
  const hemMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.54, 0.38, 24), cloakMat);
  hemMesh.position.set(0, -0.26, 0);
  torsoGroup.add(hemMesh);

  // Jagged cloak tear wedges along the bottom hem
  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2;
    const rip = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.14, 4), cloakMat);
    rip.rotation.z = Math.PI;
    rip.position.set(Math.cos(angle) * 0.5, -0.46, Math.sin(angle) * 0.5);
    torsoGroup.add(rip);
  }

  // Layered Shoulder Mantle / Spaulders (Overlapping Cowl Plates)
  const mantleGroup = new THREE.Group();
  mantleGroup.position.set(0, 0.26, 0);

  const mantleMain = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.44, 0.16, 22), cloakMat);
  mantleGroup.add(mantleMain);

  // Left & Right Shoulder Armor Plates with Silver Studs
  [-0.32, 0.32].forEach((sx, i) => {
    const spaulder = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.08, 16), cloakMat);
    spaulder.position.set(sx, -0.04, 0);
    spaulder.rotation.z = i === 0 ? 0.35 : -0.35;
    mantleGroup.add(spaulder);

    const stud = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), silverMat);
    stud.position.set(sx * 1.15, 0.02, 0.08);
    mantleGroup.add(stud);
  });

  // Silver Chest Chain & Glowing Ruby Talisman
  const chainMesh = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.015, 10, 24, Math.PI * 0.9), silverMat);
  chainMesh.rotation.x = Math.PI / 1.7;
  chainMesh.position.set(0, 0.15, 0.24);
  torsoGroup.add(chainMesh);

  const rubyBrooch = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), rubyMat);
  rubyBrooch.position.set(0, 0.17, 0.3);
  rubyBrooch.scale.set(1.2, 1.2, 0.7);
  torsoGroup.add(rubyBrooch);

  // Tactical Leather Waist Belt & Silver Skull Buckle
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.375, 0.055, 22), leatherMat);
  belt.position.set(0, -0.1, 0);
  torsoGroup.add(belt);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.03), silverMat);
  buckle.position.set(0, -0.1, 0.37);
  torsoGroup.add(buckle);

  torsoGroup.add(mantleGroup);

  // ─── 3. Right Arm: Ornate Curved Assassin Stiletto Dagger ───
  const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.34, 14), cloakMat);
  rightArm.position.set(0.06, -0.06, 0.12);
  rightArm.rotation.set(0.7, -0.1, 0.15);
  rightArmGroup.add(rightArm);

  const rightGlove = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), leatherMat);
  rightGlove.position.set(0.12, -0.2, 0.28);
  rightArmGroup.add(rightGlove);

  // Ceremonial Stiletto Dagger Assembly
  const daggerGroup = new THREE.Group();
  daggerGroup.position.set(0.12, -0.2, 0.28);
  daggerGroup.rotation.set(0.4, 0.1, -0.2);

  // Skull Pommel
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 10), silverMat);
  pommel.position.set(0, -0.14, 0);
  daggerGroup.add(pommel);

  // Braided Grip
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.14, 12), leatherMat);
  grip.position.set(0, -0.06, 0);
  daggerGroup.add(grip);

  // Swept Silver Crossguard
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.028, 0.038), silverMat);
  guard.position.set(0, 0.02, 0);
  daggerGroup.add(guard);

  // Curved Double-Edged Damascus Steel Blade
  const bladePoints = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.032, 0.08),
    new THREE.Vector2(0.038, 0.2),
    new THREE.Vector2(0.022, 0.32),
    new THREE.Vector2(0, 0.4),
    new THREE.Vector2(-0.014, 0.32),
    new THREE.Vector2(-0.02, 0.2),
    new THREE.Vector2(-0.014, 0.08),
  ];
  const bladeShape = new THREE.Shape(bladePoints);
  const bladeGeom = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.01,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.005,
    bevelThickness: 0.005,
  });
  bladeGeom.center();
  const blade = new THREE.Mesh(bladeGeom, steelBladeMat);
  blade.position.set(0, 0.22, 0);
  daggerGroup.add(blade);

  // Wet Crimson Blood along curved edge & tip
  const bloodTip = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.15, 4), bloodMat);
  bloodTip.position.set(0, 0.38, 0);
  bloodTip.rotation.y = Math.PI / 4;
  daggerGroup.add(bloodTip);

  rightArmGroup.add(daggerGroup);

  // ─── 4. Left Arm: Holding Glowing Lethal Poison Phial ───
  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.34, 14), cloakMat);
  leftArm.position.set(-0.06, -0.08, 0.1);
  leftArm.rotation.set(0.65, 0.12, -0.18);
  leftArmGroup.add(leftArm);

  const leftGlove = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), leatherMat);
  leftGlove.position.set(-0.12, -0.22, 0.26);
  leftArmGroup.add(leftGlove);

  // Poison Phial Assembly
  const vialGroup = new THREE.Group();
  vialGroup.position.set(-0.12, -0.22, 0.26);

  // Glass Cylinder
  const vialGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.15, 16), glassMat);
  vialGroup.add(vialGlass);

  // Glowing Poison Liquid Inside
  const poisonLiquid = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.11, 16), poisonMat);
  poisonLiquid.position.set(0, -0.015, 0);
  vialGroup.add(poisonLiquid);

  // Silver Stopper
  const stopper = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.038, 0.035, 12), silverMat);
  stopper.position.set(0, 0.09, 0);
  vialGroup.add(stopper);

  // Poison Glow Light
  const poisonGlow = new THREE.PointLight(0xff1744, 1.4, 0.9);
  poisonGlow.position.set(0, 0, 0.05);
  vialGroup.add(poisonGlow);

  leftArmGroup.add(vialGroup);

  // ─── 5. Head: Peaked Assassin Cowl & Porcelain Phantom Skull Mask ───
  // Outer Assassin Hood (with dramatic pointed visor peak over brow)
  const hoodGroup = new THREE.Group();
  hoodGroup.position.set(0, 0.06, -0.02);

  const hoodMain = new THREE.Mesh(new THREE.SphereGeometry(0.48, 24, 20), cloakMat);
  hoodMain.scale.set(1.02, 1.15, 1.18);
  hoodGroup.add(hoodMain);

  // Pointed Cowl Visor Peak
  const cowlPeak = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.24, 4), cloakMat);
  cowlPeak.position.set(0, 0.32, 0.42);
  cowlPeak.rotation.set(-1.15, 0, 0);
  cowlPeak.scale.set(1.5, 0.7, 0.8);
  hoodGroup.add(cowlPeak);

  headGroup.add(hoodGroup);

  // Inner Crimson Velvet Lining inside the hood rim
  const innerCowlRim = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.035, 12, 28, Math.PI * 1.3), innerVelvetMat);
  innerCowlRim.position.set(0, 0.04, 0.32);
  innerCowlRim.rotation.x = 0.2;
  headGroup.add(innerCowlRim);

  // Bone-White Porcelain Phantom Skull Mask
  const maskGroup = new THREE.Group();
  maskGroup.position.set(0, 0.02, 0.18);

  const maskCranium = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 16), maskMat);
  maskCranium.scale.set(0.9, 0.95, 0.65);
  maskGroup.add(maskCranium);

  // Sculpted Jaw & Chin
  const jawMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.14), maskMat);
  jawMesh.position.set(0, -0.16, 0.08);
  maskGroup.add(jawMesh);

  // Sharp Angular Cheekbones
  [-0.14, 0.14].forEach((cx) => {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), maskMat);
    cheek.position.set(cx, -0.02, 0.15);
    cheek.scale.set(0.7, 1.2, 0.8);
    maskGroup.add(cheek);
  });

  headGroup.add(maskGroup);

  // Piercing Glowing Ruby Eyes
  const eyeRig = createStylizedEyes({
    irisColor: 0xff1744,
    eyeSpacing: 0.12,
    eyeY: 0.04,
    eyeZ: 0.36,
    eyeScale: 1.05,
    browAngle: 0.24, // Menacing sharp predatory brow
    browY: 0.13,
    isPredator: false, // Proper eyes with ruby iris, dark pupil and catchlight!
  });
  headGroup.add(eyeRig.eyesGroup);

  // Sinister Red Light Glow inside hood
  const innerLight = new THREE.PointLight(0xff1744, 2.5, 1.4);
  innerLight.position.set(0, 0.06, 0.38);
  headGroup.add(innerLight);

  // ─── 6. Floating 3D Beveled Skull Emblem Overhead ───
  const skullGroup = new THREE.Group();
  skullGroup.position.set(0, 0.74, 0);

  const skullShape = new THREE.Shape();
  skullShape.moveTo(-0.15, 0.08);
  skullShape.bezierCurveTo(-0.15, 0.36, 0.15, 0.36, 0.15, 0.08);
  skullShape.bezierCurveTo(0.17, -0.02, 0.11, -0.08, 0.09, -0.15);
  skullShape.lineTo(-0.09, -0.15);
  skullShape.bezierCurveTo(-0.11, -0.08, -0.17, -0.02, -0.15, 0.08);
  skullShape.closePath();

  const lEye = new THREE.Path();
  lEye.absellipse(-0.055, 0.075, 0.032, 0.042, 0, Math.PI * 2, true);
  skullShape.holes.push(lEye);

  const rEye = new THREE.Path();
  rEye.absellipse(0.055, 0.075, 0.032, 0.042, 0, Math.PI * 2, true);
  skullShape.holes.push(rEye);

  const skullGeom = new THREE.ExtrudeGeometry(skullShape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.015,
    bevelThickness: 0.015,
  });
  skullGeom.center();
  const skullMesh = new THREE.Mesh(skullGeom, skullEmblemMat);
  skullGroup.add(skullMesh);

  headGroup.add(skullGroup);

  return {
    ...base,
    accentHex,
    update(time) {
      // 1. Heavy menacing breathing (chest and layered shoulder mantle expand/contract)
      const breath = Math.sin(time * 2.0);
      torsoGroup.scale.set(1 + breath * 0.035, 1 + breath * 0.02, 1 + breath * 0.035);
      mantleGroup.position.y = 0.26 + breath * 0.012;

      // 2. Ceremonial dagger tilt catches dramatic specular highlights
      daggerGroup.rotation.x = 0.4 + Math.sin(time * 1.8) * 0.14;
      daggerGroup.rotation.z = -0.2 + Math.cos(time * 1.5) * 0.08;

      // 3. Left hand poison vial subtle swirl
      vialGroup.rotation.z = Math.sin(time * 2.2) * 0.12;
      poisonGlow.intensity = 1.2 + Math.sin(time * 3.0) * 0.5;

      // 4. Pulsing red eye glow intensity
      innerLight.intensity = 2.0 + Math.sin(time * 2.8) * 0.9;
      rubyBrooch.material.emissiveIntensity = 1.4 + Math.sin(time * 2.8) * 0.6;

      // 5. Floating Skull Emblem slow bob & revolution
      skullGroup.position.y = 0.74 + Math.sin(time * 2.2) * 0.05;
      skullGroup.rotation.y = Math.sin(time * 1.5) * 0.35;

      // 6. Sinister slow head sway
      headGroup.rotation.y = Math.sin(time * 0.8) * 0.08;
      headGroup.rotation.x = 0.02 + Math.cos(time * 1.0) * 0.03;
    },
  };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  3. PRIME SUSPECT AVATAR BUILDER                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */
function buildSuspect(accentHex) {
  const base = createBaseFigurine(accentHex);
  const { legsGroup, torsoGroup, headGroup, leftArmGroup, rightArmGroup } = base;

  // Materials
  const suitMat = new THREE.MeshStandardMaterial({
    color: 0x1b1828, // Midnight violet-navy tailored suit
    roughness: 0.45,
    metalness: 0.2,
  });

  const shirtMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc, // White dress shirt
    roughness: 0.35,
    metalness: 0.05,
  });

  const tieMat = new THREE.MeshStandardMaterial({
    color: 0x9333ea, // Violet silk necktie
    roughness: 0.3,
    metalness: 0.35,
    emissive: 0x581c87,
    emissiveIntensity: 0.25,
  });

  const shoeMat = new THREE.MeshStandardMaterial({
    color: 0x0f1015,
    roughness: 0.25,
    metalness: 0.3,
  });

  const questionMat = new THREE.MeshStandardMaterial({
    color: 0xc084fc,
    roughness: 0.2,
    metalness: 0.5,
    emissive: 0x7e22ce,
    emissiveIntensity: 0.65,
  });

  const sweatMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    transmission: 0.88,
    roughness: 0.08,
    ior: 1.33,
    transparent: true,
  });

  // ─── Legs & Shoes ───
  [-0.14, 0.14].forEach((x) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.085, 0.36, 16), suitMat);
    leg.position.set(x, -0.06, 0);
    legsGroup.add(leg);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.11, 0.22), shoeMat);
    shoe.position.set(x, -0.28, 0.03);
    legsGroup.add(shoe);
  });

  // ─── Torso, Shirt & Loosened Tie ───
  const jacketMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 0.46, 20), suitMat);
  jacketMesh.position.set(0, 0.02, 0);
  torsoGroup.add(jacketMesh);

  // Shirt V-insert
  const shirtV = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.26, 0.04), shirtMat);
  shirtV.position.set(0, 0.14, 0.25);
  torsoGroup.add(shirtV);

  // Loosened Necktie (askew and crooked)
  const tieKnot = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.06, 0.035), tieMat);
  tieKnot.position.set(0.015, 0.18, 0.28);
  tieKnot.rotation.z = 0.22; // Loosened tilt
  torsoGroup.add(tieKnot);

  const tieBody = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.025), tieMat);
  tieBody.position.set(0.04, 0.06, 0.28);
  tieBody.rotation.z = -0.15;
  torsoGroup.add(tieBody);

  // ─── Fidgeting Hands / Arms ───
  // Both hands clasped nervously near the chest
  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.32, 14), suitMat);
  leftArm.position.set(-0.06, -0.06, 0.12);
  leftArm.rotation.set(0.8, 0.3, -0.3);
  leftArmGroup.add(leftArm);

  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), base.skinMat);
  leftHand.position.set(-0.05, -0.18, 0.26);
  leftArmGroup.add(leftHand);

  const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.32, 14), suitMat);
  rightArm.position.set(0.06, -0.06, 0.12);
  rightArm.rotation.set(0.8, -0.3, 0.3);
  rightArmGroup.add(rightArm);

  const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), base.skinMat);
  rightHand.position.set(0.05, -0.18, 0.26);
  rightArmGroup.add(rightHand);

  // ─── Head, Hair & Anxious Face ───
  // Tousled Dark Hair
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1f1b29, roughness: 0.7 });
  const hairDome = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 16), hairMat);
  hairDome.position.set(0, 0.12, -0.05);
  hairDome.scale.set(1.02, 0.95, 1.05);
  headGroup.add(hairDome);

  // Hair Bangs
  [-0.15, 0.0, 0.15].forEach((hx, i) => {
    const tuft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.08), hairMat);
    tuft.position.set(hx, 0.32, 0.28);
    tuft.rotation.z = (i - 1) * 0.25;
    headGroup.add(tuft);
  });

  // Anxious Eyes & Raised Worried Brows
  const eyeRig = createStylizedEyes({
    irisColor: 0x3d281a, // Dark nervous hazel
    eyeSpacing: 0.13,
    eyeY: 0.03,
    eyeZ: 0.34,
    eyeScale: 1.05, // Wider anxious eyes
    browAngle: -0.22, // Raised inner brows (\ / worried angle)
    browY: 0.13,
  });
  headGroup.add(eyeRig.eyesGroup);

  // 3D Translucent Sweat Drop near temple
  const dropPoints = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const y = t * 0.12;
    const r = Math.sin(t * Math.PI) * (1 - t * 0.4) * 0.038;
    dropPoints.push(new THREE.Vector2(r, y));
  }
  const sweatDrop = new THREE.Mesh(new THREE.LatheGeometry(dropPoints, 16), sweatMat);
  sweatDrop.position.set(0.28, 0.16, 0.24);
  sweatDrop.rotation.z = 0.3;
  headGroup.add(sweatDrop);

  // ─── 3D Extruded Bevelled Question Mark "?" ───
  const qGroup = new THREE.Group();
  qGroup.position.set(0, 0.72, 0);

  const qShape = new THREE.Shape();
  qShape.moveTo(-0.12, 0.34);
  qShape.bezierCurveTo(-0.12, 0.6, 0.3, 0.6, 0.3, 0.34);
  qShape.bezierCurveTo(0.3, 0.18, 0.07, 0.14, 0.07, -0.04);
  qShape.lineTo(-0.04, -0.04);
  qShape.bezierCurveTo(-0.04, 0.16, 0.18, 0.2, 0.18, 0.32);
  qShape.bezierCurveTo(0.18, 0.48, -0.02, 0.48, -0.02, 0.34);
  qShape.closePath();

  const qGeom = new THREE.ExtrudeGeometry(qShape, {
    depth: 0.07,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.018,
    bevelThickness: 0.018,
  });
  qGeom.center();
  const qMesh = new THREE.Mesh(qGeom, questionMat);
  qMesh.position.set(0, 0.12, 0);
  qGroup.add(qMesh);

  // Dot of the "?"
  const dotMesh = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 14), questionMat);
  dotMesh.position.set(0, -0.16, 0);
  qGroup.add(dotMesh);

  headGroup.add(qGroup);

  return {
    ...base,
    accentHex,
    update(time) {
      // Floating "?" slow bob & rotation
      qGroup.position.y = 0.72 + Math.sin(time * 2.2) * 0.05;
      qGroup.rotation.y = Math.sin(time * 1.5) * 0.35;

      // Nervous fidgeting hands
      leftArmGroup.position.y = 0.24 + Math.sin(time * 3.5) * 0.015;
      rightArmGroup.position.y = 0.24 + Math.cos(time * 3.5) * 0.015;

      // Shifty eye glances (darting sideways)
      const glance = Math.sin(time * 1.8);
      const shiftX = glance > 0.6 ? 1 : glance < -0.6 ? -1 : 0;
      eyeRig.setPupilShift(shiftX, 0);

      // Frequent nervous blinking
      const blinkCycle = time % 2.8;
      const blink = blinkCycle < 0.12 ? Math.sin((blinkCycle / 0.12) * Math.PI) : 0;
      eyeRig.setBlink(1 - blink * 0.95);
    },
  };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  4. WITNESS AVATAR BUILDER                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */
function buildWitness(accentHex) {
  const base = createBaseFigurine(accentHex);
  const { bodyGroup, legsGroup, torsoGroup, headGroup, rightArmGroup, leftArmGroup } = base;

  // Slightly smaller, cuter proportions
  bodyGroup.scale.set(0.94, 0.94, 0.94);

  // Materials
  const coatMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15, // Sunny pale yellow raincoat vinyl
    roughness: 0.35,
    metalness: 0.12,
  });

  const buttonMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.4,
  });

  const bootMat = new THREE.MeshStandardMaterial({
    color: 0xe11d48, // Glossy red rubber boots
    roughness: 0.2,
    metalness: 0.1,
  });

  const trouserMat = new THREE.MeshStandardMaterial({
    color: 0x1e2238, // Navy rain trousers
    roughness: 0.5,
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xb45309, // Antique dark brass
    roughness: 0.28,
    metalness: 0.85,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 0.95,
    roughness: 0.05,
    transparent: true,
  });

  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.8,
    roughness: 0.1,
  });

  const exclMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.2,
    metalness: 0.5,
    emissive: 0xd97706,
    emissiveIntensity: 0.7,
  });

  // ─── Legs & Glossy Rain Boots ───
  [-0.13, 0.13].forEach((x) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.36, 16), trouserMat);
    leg.position.set(x, -0.06, 0);
    legsGroup.add(leg);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.22), bootMat);
    boot.position.set(x, -0.28, 0.03);
    legsGroup.add(boot);
  });

  // ─── Yellow Raincoat Torso ───
  const coatMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 0.48, 20), coatMat);
  coatMesh.position.set(0, 0.02, 0);
  torsoGroup.add(coatMesh);

  // Toggle Buttons
  [-0.05, 0.06, 0.17].forEach((by) => {
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 12), buttonMat);
    btn.rotation.x = Math.PI / 2;
    btn.position.set(0, by, 0.32);
    torsoGroup.add(btn);
  });

  // Pushed-back Rain Hood Collar
  const hoodCollar = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 12, 24), coatMat);
  hoodCollar.rotation.x = Math.PI / 2.3;
  hoodCollar.position.set(0, 0.25, -0.04);
  torsoGroup.add(hoodCollar);

  // ─── Left Arm & Peeking Hand ───
  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.32, 14), coatMat);
  leftArm.position.set(-0.06, -0.1, 0.06);
  leftArm.rotation.set(0.4, 0, -0.2);
  leftArmGroup.add(leftArm);

  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), base.skinMat);
  leftHand.position.set(-0.1, -0.26, 0.14);
  leftArmGroup.add(leftHand);

  // ─── Right Arm Holding Vintage Lantern ───
  const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.32, 14), coatMat);
  rightArm.position.set(0.06, -0.08, 0.1);
  rightArm.rotation.set(0.6, -0.1, 0.2);
  rightArmGroup.add(rightArm);

  const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), base.skinMat);
  rightHand.position.set(0.12, -0.24, 0.24);
  rightArmGroup.add(rightHand);

  // Storm Lantern Assembly (sways on wrist)
  const lantern = new THREE.Group();
  lantern.position.set(0.12, -0.32, 0.24);

  // Brass Cap & Base
  const lCap = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.04, 16), brassMat);
  lCap.position.set(0, 0.1, 0);
  lantern.add(lCap);

  const lBase = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.04, 16), brassMat);
  lBase.position.set(0, -0.1, 0);
  lantern.add(lBase);

  // Clear Glass Cage
  const lGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.16, 16), glassMat);
  lantern.add(lGlass);

  // Glowing Filament Bulb
  const lBulb = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 12), bulbMat);
  lantern.add(lBulb);

  // Warm Golden Light from Lantern
  const lLight = new THREE.PointLight(0xfbbf24, 2.0, 1.8);
  lantern.add(lLight);

  rightArmGroup.add(lantern);

  // ─── Head, Hair & Wide Curious Eyes (Normal Pair) ───
  // Soft brown hair bangs
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x4a3423, roughness: 0.65 });
  const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.39, 20, 16), hairMat);
  hairMesh.position.set(0, 0.08, -0.06);
  hairMesh.scale.set(1.02, 1.0, 1.02);
  headGroup.add(hairMesh);

  // Two normal wide, curious, innocent eyes
  const eyeRig = createStylizedEyes({
    irisColor: 0xf59e0b, // Golden-amber irises
    eyeSpacing: 0.13,
    eyeY: 0.03,
    eyeZ: 0.35,
    eyeScale: 1.15, // Wide, open curiosity
    browAngle: 0.1, // Gently arched inquisitive brows
    browY: 0.13,
  });
  headGroup.add(eyeRig.eyesGroup);

  // ─── 3D Extruded Bevelled Exclamation Mark "!" ───
  const exclGroup = new THREE.Group();
  exclGroup.position.set(0, 0.72, 0);

  const exclShape = new THREE.Shape();
  exclShape.moveTo(-0.055, 0.42);
  exclShape.lineTo(0.055, 0.42);
  exclShape.lineTo(0.03, 0.06);
  exclShape.lineTo(-0.03, 0.06);
  exclShape.closePath();

  const exclGeom = new THREE.ExtrudeGeometry(exclShape, {
    depth: 0.07,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.016,
    bevelThickness: 0.016,
  });
  exclGeom.center();
  const exclMesh = new THREE.Mesh(exclGeom, exclMat);
  exclMesh.position.set(0, 0.1, 0);
  exclGroup.add(exclMesh);

  // Dot of the "!"
  const exclDot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 14), exclMat);
  exclDot.position.set(0, -0.16, 0);
  exclGroup.add(exclDot);

  headGroup.add(exclGroup);

  return {
    ...base,
    accentHex,
    update(time) {
      // Peeking motion: head and body lean curiously
      headGroup.rotation.z = Math.sin(time * 1.8) * 0.08;
      headGroup.rotation.y = Math.cos(time * 1.4) * 0.12;

      // Lantern swings like a pendulum
      lantern.rotation.z = Math.sin(time * 2.2) * 0.22;
      lantern.rotation.x = Math.cos(time * 2.2) * 0.1;

      // Floating "!" bobs with a gentle rhythmic bounce
      exclGroup.position.y = 0.72 + Math.sin(time * 2.4) * 0.06;

      // Natural blink
      const blinkCycle = time % 3.2;
      const blink = blinkCycle < 0.14 ? Math.sin((blinkCycle / 0.14) * Math.PI) : 0;
      eyeRig.setBlink(1 - blink * 0.95);
    },
  };
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  AVATAR FACTORY FUNCTION                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */
function createAvatar(role) {
  const normRole = normalizeRole(role);
  const config = ROLE_CONFIGS[normRole] || ROLE_CONFIGS.suspect;

  switch (normRole) {
    case 'detective':
      return buildDetective(config.accentHex);
    case 'killer':
      return buildKiller(config.accentHex);
    case 'witness':
      return buildWitness(config.accentHex);
    case 'suspect':
    default:
      return buildSuspect(config.accentHex);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROLEMODELCANVAS COMPONENT                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */
export default function RoleModelCanvas({ role = 'suspect', size = 'large', hidden = false }) {
  const containerRef = useRef(null);
  const [isRevealed, setIsRevealed] = useState(!hidden);
  const avatarRef = useRef(null);
  const animFrameRef = useRef(null);

  // Sync hidden state with reveal transition
  useEffect(() => {
    if (!hidden) {
      setIsRevealed(true);
    }
  }, [hidden]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check reduced motion preference
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. WebGL Renderer
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return; // Fail gracefully if WebGL is unavailable
    }

    const normRole = normalizeRole(role);
    const config = ROLE_CONFIGS[normRole] || ROLE_CONFIGS.suspect;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      38,
      container.clientWidth / container.clientHeight,
      0.1,
      50
    );
    camera.position.set(0, 0.12, 3.8);

    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    if (renderer.outputColorSpace !== undefined) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    renderer.domElement.className = s.webglCanvas;
    container.appendChild(renderer.domElement);

    // 2. 3-Point Lighting Setup + Accent Rim Light
    // Soft Ambient fill
    const ambientLight = new THREE.AmbientLight(0x1a1c28, 0.6);
    scene.add(ambientLight);

    // Key Light (Warm Front-Right)
    const keyLight = new THREE.DirectionalLight(0xfff8ee, 1.8);
    keyLight.position.set(2.5, 3.5, 3.0);
    scene.add(keyLight);

    // Soft Fill Light (Cool Front-Left)
    const fillLight = new THREE.DirectionalLight(0xd8e4f0, 0.75);
    fillLight.position.set(-2.5, 1.5, 2.0);
    scene.add(fillLight);

    // Dramatic Role Accent Rim Light (Back-Left)
    const rimLight = new THREE.DirectionalLight(config.accent, 4.0);
    rimLight.position.set(-2.2, 2.8, -2.5);
    scene.add(rimLight);

    // Secondary Accent Spot below for cinematic ground bounce
    const underGlow = new THREE.PointLight(config.accent, 2.0, 3.0);
    underGlow.position.set(0, -0.7, 0.8);
    scene.add(underGlow);

    // 3. Construct Avatar via Factory
    const avatar = createAvatar(role);
    avatarRef.current = avatar;
    scene.add(avatar.rootGroup);

    // 4. Reveal & Drag-to-Rotate State
    let currentRotationY = 0;
    let targetRotationY = 0;
    let isDragging = false;
    let lastX = 0;

    // Entrance Animation State
    let revealTimer = prefersReducedMotion ? 1.0 : 0.0;
    const revealDuration = 0.65; // Seconds

    // Pointer Drag Listeners
    const onPointerDown = (e) => {
      isDragging = true;
      lastX = e.clientX;
      if (container.setPointerCapture) {
        container.setPointerCapture(e.pointerId);
      }
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const delta = e.clientX - lastX;
      targetRotationY += delta * 0.009;
      lastX = e.clientX;
    };

    const onPointerUp = (e) => {
      isDragging = false;
      if (container.releasePointerCapture && e.pointerId) {
        try {
          container.releasePointerCapture(e.pointerId);
        } catch {
          // Ignore
        }
      }
    };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', onPointerUp);

    // 5. Visibility & Intersection Observers
    let isVisible = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.1 }
    );
    observer.observe(container);

    const onVisibilityChange = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) return;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
    });
    resizeObserver.observe(container);

    // 6. Animation Render Loop
    const clock = new THREE.Clock();

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);

      // Skip rendering if offscreen or hidden
      if (!isVisible || hidden) return;

      const dt = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Entrance animation progression (Spring scale + Spin)
      if (revealTimer < 1.0) {
        revealTimer = Math.min(1.0, revealTimer + dt / revealDuration);
        const t = revealTimer;

        // Spring overshoot easing
        const c4 = (2 * Math.PI) / 3;
        const spring = t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;

        avatar.rootGroup.scale.set(spring, spring, spring);

        // Spin in
        if (!prefersReducedMotion) {
          avatar.rootGroup.rotation.y = currentRotationY + (1 - t) * -Math.PI;
          // Initial accent rim light flash surge
          rimLight.intensity = 4.0 + (1 - t) * 5.0;
        }
      } else {
        avatar.rootGroup.scale.set(1, 1, 1);
        rimLight.intensity = 4.0;
      }

      // Drag Damping & Auto-rotation
      if (!isDragging && !prefersReducedMotion) {
        targetRotationY += 0.0035; // Slow gentle auto-rotation
      }
      currentRotationY += (targetRotationY - currentRotationY) * 0.08;
      avatar.rootGroup.rotation.y = currentRotationY;

      // Character-specific Idle Animations
      if (avatar.update) {
        avatar.update(elapsed, dt);
      }

      renderer.render(scene, camera);
    };

    render();

    // 7. Comprehensive Cleanup on Unmount
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerUp);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      observer.disconnect();
      resizeObserver.disconnect();

      // Dispose shadow texture
      if (avatar.shadowTex) {
        avatar.shadowTex.dispose();
      }

      // Deep Scene Traversal & Disposal
      scene.traverse((obj) => {
        if (obj.geometry) {
          obj.geometry.dispose();
        }
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
  }, [role, hidden]);

  const normRole = normalizeRole(role);
  const config = ROLE_CONFIGS[normRole] || ROLE_CONFIGS.suspect;
  const wrapClass = `${s.canvasWrap}${size === 'small' ? ` ${s.canvasWrapSmall}` : ''} ${
    hidden ? s.hiddenShield : s.visibleShield
  }`;

  return (
    <div className={wrapClass}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }} />
      <div className={`${s.roleGlow} ${config.glowClass}`} />
      <span className={s.dragHint}>Drag to Inspect</span>
    </div>
  );
}

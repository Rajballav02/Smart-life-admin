import React, { useEffect, useRef } from 'react';

const MODULE_COLORS = [0x6C5CE7, 0x00B894, 0xFF9F43]; // Personal, Finance, Documents

/**
 * A tasteful, lightweight 3D scene: a central rotating "hub" icosahedron with three
 * flat "card" meshes orbiting it — visually representing Personal / Finance / Documents
 * feeding into the Life Hub. Built with raw three.js (no extra renderer dependency),
 * fully cleaned up on unmount so it's safe to mount/unmount across route changes.
 */
export default function ThreeScene({ height = 380, compact = false, hubColor = 0x6C5CE7 }) {
  const mountRef = useRef(null);

  useEffect(() => {
    // Keep phones smooth and cool: no WebGL scene (and no three.js download) on small screens
    // or when reduced motion is requested.
    if (window.matchMedia('(max-width: 767px), (prefers-reduced-motion: reduce)').matches) return undefined;

    let cancelled = false;
    let cleanup = null;
    import('three').then((THREE) => {
      if (!cancelled) cleanup = start(THREE);
    }).catch(() => { /* decorative only: the page works without it */ });
    return () => { cancelled = true; if (cleanup) cleanup(); };

    function start(THREE) {
    const container = mountRef.current;
    if (!container) return undefined;

    const width = container.clientWidth || 1;
    const containerHeight = container.clientHeight || height;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(42, width / containerHeight, 0.1, 100);
    camera.position.set(0, compact ? 0.8 : 1.1, compact ? 5.5 : 6.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, containerHeight);
    container.appendChild(renderer.domElement);

    // Lighting — soft, premium, not harsh.
    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x6C5CE7, 0.6, 20);
    rimLight.position.set(-4, -2, 3);
    scene.add(rimLight);

    // Central hub.
    const hubGeometry = new THREE.IcosahedronGeometry(compact ? 0.85 : 1.15, 1);
    const hubMaterial = new THREE.MeshStandardMaterial({
      color: hubColor, roughness: 0.35, metalness: 0.15, flatShading: true,
    });
    const hub = new THREE.Mesh(hubGeometry, hubMaterial);
    scene.add(hub);

    // Thin ring around the hub for a "hub / network" feel.
    const ringGeometry = new THREE.TorusGeometry(compact ? 1.5 : 2.0, 0.02, 8, 64);
    const ringMaterial = new THREE.MeshStandardMaterial({ color: 0xC9C3F5, roughness: 0.5, transparent: true, opacity: 0.55 });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2.4;
    scene.add(ring);

    // Three orbiting "module cards".
    const orbitRadius = compact ? 1.9 : 2.6;
    const cardGeometry = new THREE.BoxGeometry(0.62, 0.42, 0.06);
    const cards = MODULE_COLORS.map((color, i) => {
      const material = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.1 });
      const mesh = new THREE.Mesh(cardGeometry, material);
      mesh.userData.phase = (i / MODULE_COLORS.length) * Math.PI * 2;
      mesh.userData.speed = 0.45 + i * 0.05;
      scene.add(mesh);
      return mesh;
    });

    // A scattering of tiny particles for depth — purely decorative, very cheap to render.
    const particleCount = compact ? 40 : 70;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      const radius = 3 + Math.random() * 2.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.6;
      particlePositions[i * 3 + 2] = radius * Math.cos(phi);
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({ color: 0xC9C3F5, size: 0.035, transparent: true, opacity: 0.6 });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Mouse-parallax: the whole scene gently tilts toward the pointer for a subtle,
    // interactive feel. Target values are lerped each frame so motion stays smooth.
    let targetRotX = 0;
    let targetRotY = 0;
    const handlePointerMove = (e) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      targetRotY = nx * 0.35;
      targetRotX = ny * 0.2;
    };
    container.addEventListener('pointermove', handlePointerMove);

    let frameId;
    const clock = new THREE.Clock();
    const sceneGroupRotation = { x: 0, y: 0 };

    const animate = () => {
      const t = clock.getElapsedTime();
      hub.rotation.y = t * 0.35;
      hub.rotation.x = Math.sin(t * 0.3) * 0.15;
      ring.rotation.z = t * 0.15;
      particles.rotation.y = t * 0.03;

      cards.forEach((card) => {
        const angle = t * card.userData.speed + card.userData.phase;
        card.position.set(Math.cos(angle) * orbitRadius, Math.sin(t * 0.6 + card.userData.phase) * 0.4, Math.sin(angle) * orbitRadius);
        card.lookAt(0, card.position.y, 0);
      });

      // Smoothly ease the whole scene toward the pointer target (parallax tilt).
      sceneGroupRotation.x += (targetRotX - sceneGroupRotation.x) * 0.04;
      sceneGroupRotation.y += (targetRotY - sceneGroupRotation.y) * 0.04;
      scene.rotation.x = sceneGroupRotation.x;
      scene.rotation.y = sceneGroupRotation.y;

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || height;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      container.removeEventListener('pointermove', handlePointerMove);
      hubGeometry.dispose();
      hubMaterial.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      cardGeometry.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      cards.forEach((c) => c.material.dispose());
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
    }
  }, [height, compact, hubColor]);

  return <div ref={mountRef} style={{ width: '100%', height }} aria-hidden="true" />;
}

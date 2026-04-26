"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

const MODEL_URL = "/models/LeePerrySmith.glb";

// Apollo avatar — loads a real head bust (LeePerrySmith.glb), reskins it as a
// dark cyber-deity, frames it with a halo + halo rays + drifting particles,
// and rotates it toward the cursor. Bloom turns the eye sockets into actual
// glow on screen.
//
// Heartbeat is interaction-driven: the eyes/halo only pulse when something
// dispatches a `window` event named `apollo:beat`. This keeps Apollo still
// in the idle state and reactive only when the user does something.
export function ApolloAvatar({ compact = false }: { compact?: boolean } = {}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [loadProgress, setLoadProgress] = useState<number>(0);
  const [loadFailed, setLoadFailed] = useState<boolean>(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W0 = mount.clientWidth || 800;
    const H0 = mount.clientHeight || 600;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W0, H0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(34, W0 / H0, 0.1, 100);
    camera.position.set(0, 0.05, 4.4);
    camera.lookAt(0, 0.1, 0);

    // ── Lights ──────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.06));

    const keyLight = new THREE.DirectionalLight(0xff3850, 1.7);
    keyLight.position.set(-2.6, 1.5, 2.4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xff5070, 0.95);
    rimLight.position.set(2.0, 0.4, -1.6);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0x4060ff, 0.18);
    fillLight.position.set(1.5, -1, 2);
    scene.add(fillLight);

    // ── Figure group (rotates toward cursor) ────────────────────────────
    const figure = new THREE.Group();
    scene.add(figure);

    // Halo + backdrop disk + rays — built immediately so the frame isn't
    // empty while the model is loading.
    const halo = new THREE.Group();
    halo.position.set(0, 0.1, -0.5);
    figure.add(halo);
    const haloRadii = [
      { r: 1.85, t: 0.05, c: 0xff2030, o: 1.0 },
      { r: 1.92, t: 0.018, c: 0xff5070, o: 0.55 },
      { r: 2.02, t: 0.012, c: 0xff7090, o: 0.35 },
    ];
    for (const ring of haloRadii) {
      const g = new THREE.TorusGeometry(ring.r, ring.t, 16, 160);
      const m = new THREE.MeshBasicMaterial({
        color: ring.c,
        transparent: true,
        opacity: ring.o,
      });
      halo.add(new THREE.Mesh(g, m));
    }

    const diskGeo = new THREE.CircleGeometry(2.6, 64);
    const diskMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {},
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          float d = distance(vUv, vec2(0.5));
          float a = pow(smoothstep(0.5, 0.05, d), 1.4);
          gl_FragColor = vec4(1.0, 0.16, 0.22, a * 0.55);
        }
      `,
    });
    const disk = new THREE.Mesh(diskGeo, diskMat);
    disk.position.set(0, 0.1, -0.65);
    figure.add(disk);

    const rayGroup = new THREE.Group();
    rayGroup.position.set(0, 0.1, -0.55);
    const rayCount = 64;
    for (let i = 0; i < rayCount; i++) {
      const a = (i / rayCount) * Math.PI * 2;
      const r1 = 1.95;
      const r2 = i % 4 === 0 ? 2.45 : i % 2 === 0 ? 2.25 : 2.15;
      const points = [
        new THREE.Vector3(Math.cos(a) * r1, Math.sin(a) * r1, 0),
        new THREE.Vector3(Math.cos(a) * r2, Math.sin(a) * r2, 0),
      ];
      const lg = new THREE.BufferGeometry().setFromPoints(points);
      const lm = new THREE.LineBasicMaterial({
        color: 0xff5070,
        transparent: true,
        opacity: 0.35,
      });
      rayGroup.add(new THREE.Line(lg, lm));
    }
    figure.add(rayGroup);

    // Drifting particles
    const particleCount = 240;
    const ppos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      ppos[i * 3 + 0] = (Math.random() - 0.5) * 9;
      ppos[i * 3 + 1] = (Math.random() - 0.5) * 7;
      ppos[i * 3 + 2] = (Math.random() - 0.5) * 5 - 1.5;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(ppos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xff5070,
      size: 0.026,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // ── Postprocessing ──────────────────────────────────────────────────
    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    composer.setSize(W0, H0);
    composer.addPass(new RenderPass(scene, camera));
    // The console wants Apollo's eyes to read as a beacon; the sidebar mini
    // stays subtle so it doesn't fight with the rest of the chrome.
    const bloomStrength = compact ? 1.35 : 2.1;
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(W0, H0),
      bloomStrength,
      0.55,
      compact ? 0.22 : 0.16,
    );
    composer.addPass(bloom);

    // ── Load the head bust ──────────────────────────────────────────────
    const headGroup = new THREE.Group();
    figure.add(headGroup);

    // Eye glow holders (positioned after we know the model bbox)
    const lEyeLight = new THREE.PointLight(0xff2030, 0, 4, 2);
    const rEyeLight = new THREE.PointLight(0xff2030, 0, 4, 2);
    headGroup.add(lEyeLight, rEyeLight);

    let leftEye: THREE.Mesh | null = null;
    let rightEye: THREE.Mesh | null = null;
    let leftCore: THREE.Mesh | null = null;
    let rightCore: THREE.Mesh | null = null;

    const loader = new GLTFLoader();
    loader.load(
      MODEL_URL,
      (gltf) => {
        const model = gltf.scene;

        // Reskin every mesh — dark gunmetal, almost no diffuse, slight
        // sheen so the rim catches the red key light.
        model.traverse((node) => {
          if ((node as THREE.Mesh).isMesh) {
            const mesh = node as THREE.Mesh;
            mesh.material = new THREE.MeshStandardMaterial({
              color: 0x16101a,
              roughness: 0.45,
              metalness: 0.72,
              envMapIntensity: 0.35,
            });
          }
        });

        // Center + scale so the head fills more of the frame.
        const bbox = new THREE.Box3().setFromObject(model);
        const size = bbox.getSize(new THREE.Vector3());
        const center = bbox.getCenter(new THREE.Vector3());
        const targetH = 2.6;
        const scale = targetH / size.y;
        model.position.set(-center.x * scale, -center.y * scale + 0.05, -center.z * scale);
        model.scale.setScalar(scale);
        headGroup.add(model);

        // Recompute bbox after scaling for eye placement.
        // LeePerrySmith faces +Z; the bust includes neck so eyes sit ABOVE
        // bbox center. Anchor placement to bbox.max instead.
        const sb = new THREE.Box3().setFromObject(model);
        const ssize = sb.getSize(new THREE.Vector3());

        // Eye line — measured from the top of the bbox down. The LeePerrySmith
        // bbox is taller than the visible face suggests; empirically the eye
        // sockets land ~16% of bbox height below the top. Larger values drift
        // the glow onto the cheekbones.
        const eyeY = sb.max.y - ssize.y * 0.16;
        const eyeXOff = ssize.x * 0.078;
        const eyeZ = sb.max.z - ssize.z * 0.06;

        // Small bright eye orbs — bloom does the spreading. Console mode
        // gets larger, hotter orbs so the gaze reads as a clear beacon
        // across the room; the sidebar mini stays subtle.
        const orbR = compact ? 0.04 : 0.052;
        const orbColor = compact ? 0xff3040 : 0xff5060;
        const socketGeo = new THREE.SphereGeometry(orbR, 24, 24);
        const socketMat = new THREE.MeshBasicMaterial({ color: orbColor });
        leftEye = new THREE.Mesh(socketGeo, socketMat);
        leftEye.position.set(-eyeXOff, eyeY, eyeZ);
        rightEye = new THREE.Mesh(socketGeo, socketMat);
        rightEye.position.set(eyeXOff, eyeY, eyeZ);
        headGroup.add(leftEye, rightEye);

        const coreR = compact ? 0.018 : 0.024;
        const coreGeo = new THREE.SphereGeometry(coreR, 16, 16);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xffeaea });
        leftCore = new THREE.Mesh(coreGeo, coreMat);
        leftCore.position.set(-eyeXOff, eyeY, eyeZ + 0.015);
        rightCore = new THREE.Mesh(coreGeo, coreMat);
        rightCore.position.set(eyeXOff, eyeY, eyeZ + 0.015);
        headGroup.add(leftCore, rightCore);

        // Third-eye sigil at the brow — same red palette, smaller, centered.
        // Sits ~7% of bbox above the eye line, on the forehead.
        const thirdGeo = new THREE.SphereGeometry(0.022, 16, 16);
        const thirdMat = new THREE.MeshBasicMaterial({ color: 0xff4040 });
        const third = new THREE.Mesh(thirdGeo, thirdMat);
        third.position.set(0, sb.max.y - ssize.y * 0.09, eyeZ + 0.005);
        headGroup.add(third);

        lEyeLight.position.set(-eyeXOff, eyeY, eyeZ + 0.04);
        rEyeLight.position.set(eyeXOff, eyeY, eyeZ + 0.04);
        lEyeLight.intensity = 3.6;
        rEyeLight.intensity = 3.6;

        setLoadProgress(1);
        // First-contact pulse — one welcoming beat as Apollo materialises.
        onBeat();
      },
      (xhr) => {
        if (xhr.total) setLoadProgress(xhr.loaded / xhr.total);
      },
      (err) => {
        console.error("Apollo model load failed", err);
        setLoadFailed(true);
      },
    );

    // ── Cursor follow + idle life ───────────────────────────────────────
    const start = performance.now();
    const cursorTarget = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let lastMoveT = -Infinity; // seconds; -∞ so we start in idle wander
    const onMove = (e: MouseEvent) => {
      const r = mount.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 2 - 1;
      const y = ((e.clientY - r.top) / r.height) * 2 - 1;
      cursorTarget.x = Math.max(-1.4, Math.min(1.4, x));
      cursorTarget.y = Math.max(-1.0, Math.min(1.0, y));
      lastMoveT = (performance.now() - start) / 1000;
    };
    if (!compact) {
      window.addEventListener("mousemove", onMove, { passive: true });
    }

    // Heartbeat is interaction-driven. We track the time of the last triggered
    // beat and decay from there inside the tick loop.
    let lastBeatT = -Infinity;
    const onBeat = () => {
      lastBeatT = (performance.now() - start) / 1000;
    };
    window.addEventListener("apollo:beat", onBeat);

    // Speaking state — ramps eye intensity + bloom while Apollo is generating
    // a response. We use a smoothed activation so the boost glides instead of
    // popping. 0 = idle, 1 = speaking.
    let speakingTarget = 0;
    let speakingNow = 0;
    const onSpeaking = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const active = !!(detail && detail.active);
      speakingTarget = active ? 1 : 0;
    };
    window.addEventListener("apollo:speaking", onSpeaking as EventListener);

    // Saccade — short flick to a new gaze target, then snap back
    let saccadeT = 0;
    let saccade = { x: 0, y: 0, active: false };

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    let raf = 0;
    let running = true;
    let lastBlink = 0;
    let blinkTimer = 0;
    let nextSaccade = 4;
    const tick = () => {
      if (!running) return;
      const t = (performance.now() - start) / 1000;

      // Idle gaze drift — when the cursor's been still for a while, the
      // head wanders on its own. Two incommensurate sine pairs make it
      // feel organic rather than clockwork.
      const sinceMove = t - lastMoveT;
      const idleBlend = Math.min(1, Math.max(0, (sinceMove - 1.5) / 2.0));
      const idleX =
        (Math.sin(t * 0.13) * 0.55 + Math.cos(t * 0.09) * 0.25) * idleBlend;
      const idleY =
        (Math.cos(t * 0.11) * 0.40 + Math.sin(t * 0.071) * 0.18) * idleBlend;

      // Saccades — every few seconds, flick gaze briefly to a new spot
      saccadeT += 0.016;
      if (!saccade.active && saccadeT > nextSaccade) {
        saccade.active = true;
        saccade.x = (Math.random() - 0.5) * 0.9;
        saccade.y = (Math.random() - 0.5) * 0.5;
        saccadeT = 0;
        nextSaccade = 0.45;
      } else if (saccade.active && saccadeT > nextSaccade) {
        saccade.active = false;
        saccade.x = 0;
        saccade.y = 0;
        saccadeT = 0;
        nextSaccade = 3.5 + Math.random() * 4;
      }

      // Combined target — cursor (when active) + idle drift + saccade
      const tx = cursorTarget.x * (1 - idleBlend * 0.7) + idleX + saccade.x * 0.3;
      const ty = cursorTarget.y * (1 - idleBlend * 0.7) + idleY + saccade.y * 0.3;
      current.x += (tx - current.x) * 0.085;
      current.y += (ty - current.y) * 0.085;

      figure.rotation.y = current.x * 0.42;
      figure.rotation.x = current.y * 0.28;

      // Breathing — figure rises and falls, with tiny shoulder roll. In the
      // big console view we drop Apollo a touch so his face sits just below
      // centre and the speech panel has room to breathe; the sidebar mini
      // stays centred.
      const breath = Math.sin(t * 0.85);
      const baseY = compact ? 0 : -0.32;
      figure.position.y = baseY + breath * 0.028;
      figure.rotation.z = Math.sin(t * 0.6) * 0.014;

      // Heartbeat — fires only when something dispatches `apollo:beat`. The
      // dual-pulse decays over ~1.4s, then Apollo goes still again.
      const sinceBeat = t - lastBeatT;
      let heart = 0;
      if (sinceBeat >= 0 && sinceBeat < 1.4) {
        const beat1 = Math.exp(-Math.pow(sinceBeat * 14, 2));
        const beat2 = Math.exp(-Math.pow((sinceBeat - 0.18) * 14, 2));
        heart = beat1 * 1.0 + beat2 * 0.6;
      }

      // Speaking smoothing — glide toward target so brightness ease in/out.
      speakingNow += (speakingTarget - speakingNow) * 0.08;

      // Eye glow modulation — base + cursor-distance ramp + heartbeat +
      // speaking boost. The console gets a hotter ramp so the eyes read like
      // a beacon; the sidebar mini keeps the original calmer levels. While
      // Apollo is speaking we add a strong steady boost so the operator can
      // see him "lit up".
      const dist = Math.hypot(current.x, current.y);
      const speakingBoost = speakingNow * 2.4;
      const ramp =
        2.8 + (1 - Math.min(1, dist)) * 1.4 + heart * 1.6 + speakingBoost;
      const eyeMul = compact ? 1.0 : 1.7;
      lEyeLight.intensity = ramp * eyeMul;
      rEyeLight.intensity = ramp * eyeMul;

      // Bloom strength + tone exposure also rise while speaking so the whole
      // figure brightens, not just the eyes.
      bloom.strength = bloomStrength + speakingNow * (compact ? 0.6 : 1.1);
      renderer.toneMappingExposure = 1.05 + speakingNow * 0.35;

      // Halo subtly pulses with the heart, plus a slow rotation.
      const haloPulse = 1 + heart * 0.04 + breath * 0.008;
      halo.scale.set(haloPulse, haloPulse, 1);
      halo.rotation.z = t * 0.06;
      rayGroup.rotation.z = -t * 0.04;
      rayGroup.scale.setScalar(1 + heart * 0.02);

      particles.rotation.y = t * 0.025;
      particles.rotation.x = Math.sin(t * 0.1) * 0.03;

      // Blinks — slightly more frequent, harder squash for visibility.
      blinkTimer += 0.016;
      if (blinkTimer - lastBlink > 3.2 + Math.random() * 2.4) {
        lastBlink = blinkTimer;
      }
      const sinceBlink = blinkTimer - lastBlink;
      const blink = sinceBlink < 0.16 ? 1 - Math.sin((sinceBlink / 0.16) * Math.PI) * 0.92 : 1;
      if (leftEye) leftEye.scale.y = blink;
      if (rightEye) rightEye.scale.y = blink;
      if (leftCore) leftCore.scale.y = blink;
      if (rightCore) rightCore.scale.y = blink;

      composer.render();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const io = new IntersectionObserver(
      (entries) => {
        running = entries[0].isIntersecting;
        if (running && !raf) {
          raf = requestAnimationFrame(tick);
        }
      },
      { threshold: 0.01 },
    );
    io.observe(mount);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      if (!compact) window.removeEventListener("mousemove", onMove);
      window.removeEventListener("apollo:beat", onBeat);
      window.removeEventListener("apollo:speaking", onSpeaking as EventListener);
      ro.disconnect();
      io.disconnect();
      composer.dispose();
      renderer.dispose();
      diskGeo.dispose();
      diskMat.dispose();
      pGeo.dispose();
      pMat.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
      }}
    >
      {(loadProgress < 1 || loadFailed) && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "52%",
            transform: "translate(-50%, -50%)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "oklch(72% 0.012 250)",
            pointerEvents: "none",
            textAlign: "center",
          }}
        >
          {loadFailed
            ? "oracle offline · model unavailable"
            : `summoning apollo · ${Math.round(loadProgress * 100)}%`}
        </div>
      )}
    </div>
  );
}

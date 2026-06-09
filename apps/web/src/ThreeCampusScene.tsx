import { useEffect, useRef } from "react";
import {
  AmbientLight,
  BoxGeometry,
  Color,
  ConeGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  TorusGeometry,
  Vector3,
  WebGLRenderer
} from "three";

const brandColors = ["#f37124", "#0651a0", "#53b848", "#008dde"];

export function ThreeCampusScene() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new Scene();
    scene.background = new Color("#fff4ed");

    const camera = new PerspectiveCamera(36, host.clientWidth / host.clientHeight, 0.1, 100);
    camera.position.set(0, 2.1, 9.4);

    const renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setSize(host.clientWidth, host.clientHeight);
    host.appendChild(renderer.domElement);

    const root = new Group();
    scene.add(root);

    const ambient = new AmbientLight("#ffffff", 1.25);
    scene.add(ambient);

    const keyLight = new DirectionalLight("#ffffff", 2.4);
    keyLight.position.set(2.8, 5.4, 4.2);
    scene.add(keyLight);

    const rimLight = new DirectionalLight("#008dde", 1.1);
    rimLight.position.set(-4, 2.4, -2);
    scene.add(rimLight);

    const floor = new Mesh(
      new PlaneGeometry(10.5, 8),
      new MeshStandardMaterial({
        color: "#fffdf9",
        roughness: 0.72,
        metalness: 0.02
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.75;
    root.add(floor);

    const building = new Group();
    root.add(building);

    const wallMaterial = new MeshStandardMaterial({
      color: "#f9fbff",
      roughness: 0.42,
      metalness: 0.03
    });
    const blueGlass = new MeshStandardMaterial({
      color: "#0651a0",
      roughness: 0.16,
      metalness: 0.22
    });
    const skyGlass = new MeshStandardMaterial({
      color: "#008dde",
      roughness: 0.12,
      metalness: 0.18
    });
    const orangeMaterial = new MeshStandardMaterial({
      color: "#f37124",
      roughness: 0.34,
      metalness: 0.08
    });
    const greenMaterial = new MeshStandardMaterial({
      color: "#53b848",
      roughness: 0.38,
      metalness: 0.05
    });

    const podium = new Mesh(new BoxGeometry(5.9, 0.65, 3.15), wallMaterial);
    podium.position.set(0, -1.42, -0.15);
    building.add(podium);

    const mainBlock = new Mesh(new BoxGeometry(3.15, 5.25, 2.35), wallMaterial);
    mainBlock.position.set(0, 1.22, -0.2);
    building.add(mainBlock);

    const leftWing = new Mesh(new BoxGeometry(1.6, 3.55, 2.15), wallMaterial);
    leftWing.position.set(-2.45, 0.38, -0.28);
    building.add(leftWing);

    const rightWing = new Mesh(new BoxGeometry(1.55, 3.15, 2.1), wallMaterial);
    rightWing.position.set(2.42, 0.18, -0.28);
    building.add(rightWing);

    const roof = new Mesh(new BoxGeometry(3.55, 0.32, 2.68), orangeMaterial);
    roof.position.set(0, 3.98, -0.2);
    building.add(roof);

    const greenRoof = new Mesh(new BoxGeometry(5.2, 0.18, 0.34), greenMaterial);
    greenRoof.position.set(0, -1.0, 1.54);
    building.add(greenRoof);

    const interiorDeck = new Mesh(
      new BoxGeometry(4.8, 0.12, 2.05),
      new MeshStandardMaterial({
        color: "#eef7ff",
        roughness: 0.5,
        metalness: 0.02
      })
    );
    interiorDeck.position.set(0, 0.18, 1.1);
    building.add(interiorDeck);

    const corridor = new Mesh(new BoxGeometry(0.42, 0.1, 1.78), orangeMaterial);
    corridor.position.set(0, 0.28, 1.18);
    building.add(corridor);

    const crossCorridor = new Mesh(new BoxGeometry(3.8, 0.1, 0.34), orangeMaterial);
    crossCorridor.position.set(0, 0.3, 1.18);
    building.add(crossCorridor);

    const rooms = [
      { x: -1.65, z: 0.58, color: "#ffffff" },
      { x: 1.65, z: 0.58, color: "#ffffff" },
      { x: -1.65, z: 1.72, color: "#ffffff" },
      { x: 1.65, z: 1.72, color: "#ffffff" }
    ];

    rooms.forEach((room, index) => {
      const roomMesh = new Mesh(
        new BoxGeometry(1.06, 0.42, 0.66),
        new MeshStandardMaterial({
          color: room.color,
          roughness: 0.36,
          metalness: 0.02
        })
      );
      roomMesh.position.set(room.x, 0.58, room.z);
      building.add(roomMesh);

      const door = new Mesh(new BoxGeometry(0.34, 0.34, 0.06), index % 2 === 0 ? greenMaterial : skyGlass);
      door.position.set(room.x > 0 ? room.x - 0.54 : room.x + 0.54, 0.6, room.z);
      building.add(door);
    });

    const entrance = new Mesh(new BoxGeometry(1.15, 1.1, 0.12), blueGlass);
    entrance.position.set(0, -1.06, 1.43);
    building.add(entrance);

    const sign = new Mesh(new BoxGeometry(2.45, 0.42, 0.16), orangeMaterial);
    sign.position.set(0, 1.15, 1.1);
    building.add(sign);

    const glassSpine = new Mesh(new BoxGeometry(0.62, 4.7, 0.14), skyGlass);
    glassSpine.position.set(0, 1.38, 1.02);
    building.add(glassSpine);

    const makeWindow = (x: number, y: number, z: number, material = blueGlass) => {
      const windowMesh = new Mesh(new BoxGeometry(0.34, 0.24, 0.1), material);
      windowMesh.position.set(x, y, z);
      building.add(windowMesh);
    };

    [-1.14, -0.58, 0.58, 1.14].forEach((x) => {
      [-0.3, 0.34, 0.98, 1.62, 2.26, 2.9].forEach((y, rowIndex) => {
        makeWindow(x, y, 1.02, rowIndex % 2 === 0 ? blueGlass : skyGlass);
      });
    });

    [-2.86, -2.32, 2.12, 2.68].forEach((x) => {
      [-0.48, 0.16, 0.8, 1.44].forEach((y) => makeWindow(x, y, 0.88, skyGlass));
    });

    const path = new Mesh(
      new PlaneGeometry(1.55, 3.9),
      new MeshStandardMaterial({
        color: "#f37124",
        roughness: 0.58,
        metalness: 0.01
      })
    );
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, -1.735, 2.58);
    root.add(path);

    const lawnLeft = new Mesh(new PlaneGeometry(2.4, 2.2), greenMaterial);
    lawnLeft.rotation.x = -Math.PI / 2;
    lawnLeft.position.set(-2.9, -1.73, 2.25);
    root.add(lawnLeft);

    const lawnRight = new Mesh(new PlaneGeometry(2.4, 2.2), greenMaterial);
    lawnRight.rotation.x = -Math.PI / 2;
    lawnRight.position.set(2.9, -1.73, 2.25);
    root.add(lawnRight);

    const ring = new Mesh(
      new TorusGeometry(2.55, 0.035, 12, 90),
      new MeshStandardMaterial({
        color: "#f37124",
        roughness: 0.26,
        metalness: 0.12
      })
    );
    ring.position.set(0.15, 0.65, 0.05);
    ring.rotation.set(1.22, 0.14, 0.28);
    root.add(ring);

    const routePoints = [
      new Vector3(0, -1.16, 2.48),
      new Vector3(0, -0.08, 1.78),
      new Vector3(0, 0.36, 1.18),
      new Vector3(-1.48, 0.74, 1.72),
      new Vector3(1.46, 0.74, 0.58)
    ];

    const routeLine = new Group();
    building.add(routeLine);

    for (let index = 0; index < routePoints.length - 1; index += 1) {
      const start = routePoints[index];
      const end = routePoints[index + 1];
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const length = Math.hypot(dx, dz);
      const segment = new Mesh(new BoxGeometry(0.12, 0.08, length), greenMaterial);
      segment.position.set((start.x + end.x) / 2, start.y + 0.14, (start.z + end.z) / 2);
      segment.rotation.y = Math.atan2(dx, dz);
      routeLine.add(segment);
    }

    const marker = new Group();
    const markerBody = new Mesh(new ConeGeometry(0.22, 0.55, 4), orangeMaterial);
    markerBody.rotation.x = Math.PI / 2;
    marker.add(markerBody);
    const markerBase = new Mesh(new BoxGeometry(0.32, 0.12, 0.32), blueGlass);
    markerBase.position.y = -0.2;
    marker.add(markerBase);
    building.add(marker);

    const dots = Array.from({ length: 28 }, (_, index) => {
      const dot = new Mesh(
        new BoxGeometry(0.12, 0.12, 0.12),
        new MeshStandardMaterial({
          color: brandColors[index % brandColors.length],
          roughness: 0.4
        })
      );
      const angle = index * 0.82;
      const radius = 3.2 + (index % 5) * 0.14;
      dot.position.set(Math.cos(angle) * radius, -0.15 + Math.sin(index * 0.54) * 1.9, Math.sin(angle) * 1.1);
      root.add(dot);
      return dot;
    });

    const dragState = {
      active: false,
      lastX: 0,
      lastY: 0,
      targetYaw: -0.32,
      targetPitch: 0.04,
      yawVelocity: 0,
      pitchVelocity: 0
    };

    const onPointerDown = (event: PointerEvent) => {
      dragState.active = true;
      dragState.lastX = event.clientX;
      dragState.lastY = event.clientY;
      host.setPointerCapture(event.pointerId);
      host.classList.add("is-dragging");
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragState.active) return;
      const dx = event.clientX - dragState.lastX;
      const dy = event.clientY - dragState.lastY;
      dragState.lastX = event.clientX;
      dragState.lastY = event.clientY;
      dragState.yawVelocity = dx * 0.006;
      dragState.pitchVelocity = dy * 0.003;
      dragState.targetYaw += dragState.yawVelocity;
      dragState.targetPitch = Math.max(-0.32, Math.min(0.42, dragState.targetPitch + dragState.pitchVelocity));
    };

    const onPointerUp = (event: PointerEvent) => {
      dragState.active = false;
      if (host.hasPointerCapture(event.pointerId)) {
        host.releasePointerCapture(event.pointerId);
      }
      host.classList.remove("is-dragging");
    };

    host.addEventListener("pointerdown", onPointerDown);
    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerup", onPointerUp);
    host.addEventListener("pointercancel", onPointerUp);

    let frame = 0;
    let currentYaw = -0.32;
    let currentPitch = 0.04;
    const animate = () => {
      frame = window.requestAnimationFrame(animate);
      const t = performance.now() * 0.001;
      const routeIndex = Math.floor((t * 0.75) % routePoints.length);
      const nextRouteIndex = (routeIndex + 1) % routePoints.length;
      const routeProgress = (t * 0.75) % 1;
      const previousPoint = routePoints[routeIndex];
      const nextPoint = routePoints[nextRouteIndex];
      const targetPoint = previousPoint.clone().lerp(nextPoint, routeProgress);
      marker.position.copy(targetPoint);
      marker.position.y += 0.52 + Math.sin(t * 5) * 0.04;
      marker.rotation.y = Math.atan2(nextPoint.x - previousPoint.x, nextPoint.z - previousPoint.z);

      if (!dragState.active) {
        dragState.targetYaw += dragState.yawVelocity;
        dragState.targetPitch = Math.max(-0.32, Math.min(0.42, dragState.targetPitch + dragState.pitchVelocity));
        dragState.yawVelocity *= 0.93;
        dragState.pitchVelocity *= 0.9;
      }

      currentYaw += (dragState.targetYaw - currentYaw) * 0.12;
      currentPitch += (dragState.targetPitch - currentPitch) * 0.1;
      building.rotation.y = currentYaw + Math.sin(t * 0.3) * 0.012;
      building.rotation.x = currentPitch + Math.sin(t * 0.24) * 0.01;
      root.rotation.y = Math.sin(t * 0.26) * 0.035;
      root.rotation.x = Math.sin(t * 0.22) * 0.035;
      ring.rotation.z += 0.006;
      dots.forEach((dot, index) => {
        dot.rotation.x += 0.012 + index * 0.0005;
        dot.rotation.y += 0.01;
        dot.position.y += Math.sin(t + index) * 0.0018;
      });
      renderer.render(scene, camera);
    };

    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    animate();

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      host.removeEventListener("pointerdown", onPointerDown);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerup", onPointerUp);
      host.removeEventListener("pointercancel", onPointerUp);
      renderer.dispose();
      host.removeChild(renderer.domElement);
      scene.traverse((object) => {
        if (object instanceof Mesh) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) {
            material.forEach((item) => item.dispose());
          } else {
            material.dispose();
          }
        }
      });
    };
  }, []);

  return <div className="three-scene" ref={hostRef} aria-hidden="true" />;
}

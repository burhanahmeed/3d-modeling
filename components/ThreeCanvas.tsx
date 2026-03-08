'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
// @ts-ignore - OrbitControls types not available in this version
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export interface ThreeCanvasRef {
  runCode: (codeString: string) => void;
}

interface ThreeCanvasProps {
  isLoading?: boolean;
}

const ThreeCanvas = forwardRef<ThreeCanvasRef, ThreeCanvasProps>(({ isLoading }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const frameIdRef = useRef<number | null>(null);

  const runCode = (codeString: string) => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;

    // Log the received code for debugging
    console.log('Received code:', codeString);

    // Clear previous user-added meshes
    const toRemove: THREE.Object3D[] = [];
    scene.traverse((obj) => {
      if (obj.userData.userAdded) {
        toRemove.push(obj);
      }
    });
    toRemove.forEach((obj) => scene.remove(obj));

    // Eval and run the code
    try {
      // Extract code from markdown code blocks if present
      let cleanCode = codeString.trim();

      // Remove markdown code blocks (```javascript ... ```)
      const codeBlockMatch = cleanCode.match(/```(?:javascript|js)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        cleanCode = codeBlockMatch[1].trim();
      }

      // Remove function declaration if present
      cleanCode = cleanCode.replace(/^function\s+\w*\s*\([^)]*\)\s*\{|\}$/g, '');
      cleanCode = cleanCode.replace(/^\{|\}$/g, '');
      cleanCode = cleanCode.trim();

      console.log('Cleaned code:', cleanCode);

      if (!cleanCode) {
        console.error('No valid code to execute');
        return;
      }

      const fn = new Function('scene', 'THREE', cleanCode);
      fn(scene, THREE);
    } catch (error) {
      console.error('Error executing code:', error);
      console.error('Code that failed:', codeString);
    }
  };

  useImperativeHandle(ref, () => ({
    runCode,
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(5, 5, 5);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Grid helper
    const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
    scene.add(gridHelper);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // Animation loop
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);

      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
      }

      if (controls) {
        controls.dispose();
      }

      if (renderer) {
        renderer.dispose();
        if (containerRef.current && renderer.domElement) {
          containerRef.current.removeChild(renderer.domElement);
        }
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {isLoading && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-900/90 rounded-xl border border-zinc-700">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              <span className="text-white font-medium">Generating...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

ThreeCanvas.displayName = 'ThreeCanvas';

export default ThreeCanvas;

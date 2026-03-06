import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, OrbitControls, Points, PointMaterial, Html, Float, useTexture, MeshTransmissionMaterial } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { Component, useRef, useState, useEffect, Suspense, useMemo, useCallback, lazy } from 'react';
import { HalfFloatType, Vector3, Quaternion, Color } from 'three';
import * as random from 'maath/random/dist/maath-random.esm';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { playHoverSound, playClickSound } from '../utils/sounds';
import { loadConstellationData } from '../constellation/data/loader';
import { resolveMediaUrl } from '../constellation/media/resolveMediaUrl';
import { curateMemories } from './universe/curateMemories';
import { layoutMemories, getEpochCentroids } from './universe/layoutMemories';
import './UniversePage.css';

const MemoryDetailOverlay = lazy(() => import('./universe/MemoryDetailOverlay'));

/* ─── Error Boundary ─── */
class PolaroidErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return this.props.fallback || null;
    return this.props.children;
  }
}

/* ─── Shared mouse state (updated once per frame, read by all polaroids) ─── */
const mouseState = { x: 0, y: 0 };

function MouseTracker() {
  useFrame(({ pointer }) => {
    mouseState.x = pointer.x;
    mouseState.y = pointer.y;
  });
  return null;
}

/* ─── Starfield ─── */
function Starfield(props) {
  const ref = useRef();
  const [sphere] = useState(() => random.inSphere(new Float32Array(12000), { radius: 18 }));
  useFrame((state, delta) => {
    ref.current.rotation.x -= delta / 15;
    ref.current.rotation.y -= delta / 20;
  });
  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={sphere} stride={3} frustumCulled={false} {...props}>
        <PointMaterial transparent color="#0ea5e9" size={0.025} sizeAttenuation depthWrite={false} />
      </Points>
    </group>
  );
}

/* ─── Dust cloud — second layer of warm-colored particles ─── */
function DustCloud() {
  const ref = useRef();
  const [positions] = useState(() => random.inSphere(new Float32Array(6000), { radius: 25 }));
  useFrame((state, delta) => {
    ref.current.rotation.y += delta / 40;
    ref.current.rotation.z += delta / 60;
  });
  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial transparent color="#a78bfa" size={0.015} sizeAttenuation depthWrite={false} opacity={0.4} />
    </Points>
  );
}

/* ─── Epoch thread — faint glowing line connecting epoch memories ─── */
function EpochThread({ positions, color }) {
  const ref = useRef();
  const linePositions = useMemo(() => {
    if (positions.length < 2) return null;
    const arr = [];
    for (const p of positions) arr.push(p[0], p[1], p[2]);
    return new Float32Array(arr);
  }, [positions]);
  if (!linePositions) return null;
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length} array={linePositions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color={color} size={0.08} transparent opacity={0.5} sizeAttenuation depthWrite={false} />
    </points>
  );
}

/* ─── Memory Polaroid — faces center, mouse-reactive tilt ─── */
const _lookTarget = new Vector3();
const _q = new Quaternion();

function MemoryPolaroid({ memory, onDiscover, onClick }) {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef();
  const imgUrl = resolveMediaUrl(memory.heroImage);

  const width = 1.8;
  const height = 1.8;

  useFrame(() => {
    if (!groupRef.current) return;
    // Face toward center with gentle mouse-reactive tilt
    _lookTarget.set(0, 0, 0);
    groupRef.current.lookAt(_lookTarget);
    // Add mouse-reactive rotation offset
    groupRef.current.rotation.x += mouseState.y * 0.04;
    groupRef.current.rotation.y += mouseState.x * 0.04;
  });

  return (
    <group ref={groupRef} position={memory.position}>
      <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.8}>
        <mesh
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
            document.body.style.cursor = 'pointer';
            playHoverSound();
            if (onDiscover) onDiscover(memory.id);
          }}
          onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
          onClick={(e) => {
            e.stopPropagation();
            playClickSound();
            document.body.style.cursor = 'auto';
            if (onClick) onClick(memory);
          }}
        >
          {/* White border */}
          <planeGeometry args={[width + 0.3, height + 0.55]} />
          <meshStandardMaterial
            color="#fff"
            emissive={hovered ? '#fff' : '#000'}
            emissiveIntensity={hovered ? 0.4 : 0}
          />

          {/* Photo texture */}
          <Suspense fallback={
            <mesh position={[0, 0.1, 0.01]}>
              <planeGeometry args={[width, height]} />
              <meshBasicMaterial color={memory.epochColor} transparent opacity={0.15} />
            </mesh>
          }>
            <PolaroidImage src={imgUrl} width={width} height={height} />
          </Suspense>

          {/* Epoch accent strip */}
          <mesh position={[0, -(height + 0.55) / 2 + 0.03, 0.01]}>
            <planeGeometry args={[width + 0.3, 0.05]} />
            <meshBasicMaterial color={memory.epochColor} />
          </mesh>

          {/* Glow ring on hover */}
          {hovered && (
            <mesh position={[0, 0, -0.02]}>
              <planeGeometry args={[width + 0.6, height + 0.85]} />
              <meshBasicMaterial color={memory.epochColor} transparent opacity={0.15} />
            </mesh>
          )}
        </mesh>

        {/* Caption below polaroid — screen-space HTML so it stays readable */}
        {hovered && (
          <Html position={[0, -(height + 0.55) / 2 - 0.15, 0]} center zIndexRange={[100, 0]}>
            <div className="memory-hover-caption">
              <span className="memory-hover-epoch" style={{ color: memory.epochColor }}>
                {memory.epoch}
              </span>
              <span className="memory-hover-title">
                {(memory.title || '').length > 35
                  ? (memory.title || '').substring(0, 35) + '...'
                  : (memory.title || '')}
              </span>
            </div>
          </Html>
        )}
      </Float>
    </group>
  );
}

function PolaroidImage({ src, width, height }) {
  const texture = useTexture(src);
  return (
    <mesh position={[0, 0.1, 0.01]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

function PolaroidPlaceholder({ position, epochColor }) {
  const groupRef = useRef();
  useFrame(() => {
    if (!groupRef.current) return;
    _lookTarget.set(0, 0, 0);
    groupRef.current.lookAt(_lookTarget);
  });
  return (
    <group ref={groupRef} position={position}>
      <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.8}>
        <mesh>
          <planeGeometry args={[2.1, 2.35]} />
          <meshStandardMaterial
            color={epochColor || '#333'}
            transparent opacity={0.12}
            emissive={epochColor || '#333'}
            emissiveIntensity={0.3}
          />
        </mesh>
      </Float>
    </group>
  );
}

/* ─── Epoch Labels ─── */
function EpochLabels({ epochs, centroids }) {
  return (
    <>
      {epochs.map(epoch => {
        const center = centroids[epoch.label];
        if (!center) return null;
        return (
          <group key={epoch.id} position={center}>
            <Html position={[0, 3, 0]} center zIndexRange={[50, 0]}>
              <div className="epoch-label-pill" style={{ borderColor: epoch.color, color: epoch.color }}>
                {epoch.label}
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
}

/* ─── Navigation Nodes ─── */
const nodes = [
  { id: 'projects', label: 'The Workshop', color: '#7c3aed', link: '/workshop', speed: 0.2, orbitRadius: 4, tilt: [0.1, 0, 0.2] },
  { id: 'starseed', label: 'Starseed Labs', color: '#38bdf8', link: '/projects/starseed', speed: 0.3, orbitRadius: 5, tilt: [-0.2, 0, 0.1] },
  { id: 'patcher', label: 'SD Patcher', color: '#f472b6', link: '/tools/sd-profile-patcher', speed: 0.15, orbitRadius: 3.5, tilt: [0.3, 0, -0.1] },
  { id: 'garden', label: 'Brain Dump', color: '#10b981', link: '/garden', speed: 0.25, orbitRadius: 4.5, tilt: [-0.1, 0, -0.2] },
  { id: 'now', label: 'Now', color: '#f59e0b', link: '/now', speed: 0.1, orbitRadius: 5.5, tilt: [0.2, 0, 0.3] },
  { id: 'favorites', label: 'Into Right Now', color: '#ec4899', link: '/favorites', speed: 0.18, orbitRadius: 6, tilt: [0.15, 0, -0.15] },
  { id: 'vault', label: 'The Vault', color: '#ef4444', link: '/vault', speed: 0.08, orbitRadius: 7, tilt: [-0.1, 0, 0.2] },
  { id: 'constellation', label: 'Full Constellation', color: '#a855f7', link: '/constellation', speed: 0.12, orbitRadius: 7.5, tilt: [0.05, 0, -0.1], geometry: 'dodecahedron' },
];

function CoreNode() {
  const mesh = useRef();
  useFrame((state, delta) => {
    mesh.current.rotation.x += delta * 0.2;
    mesh.current.rotation.y += delta * 0.3;
    mesh.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.05);
  });
  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={1}>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={1} wireframe />
        <mesh scale={0.8}>
          <sphereGeometry args={[1, 32, 32]} />
          <MeshTransmissionMaterial backside thickness={1} roughness={0} transmission={1} ior={1.5} chromaticAberration={1} anisotropy={0.1} />
        </mesh>
      </mesh>
    </Float>
  );
}

function InteractiveNode({ id, label, color, link, speed, orbitRadius, tilt, geometry, onDiscover }) {
  const group = useRef();
  const mesh = useRef();
  const [hovered, setHover] = useState(false);
  const navigate = useNavigate();
  const { camera } = useThree();
  const initialAngle = useMemo(() => Math.random() * Math.PI * 2, []);
  const isConstellation = geometry === 'dodecahedron';

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime * speed + initialAngle;
    group.current.position.set(Math.cos(t) * orbitRadius, 0, Math.sin(t) * orbitRadius);
    mesh.current.rotation.x += delta;
    mesh.current.rotation.y += delta;
    if (hovered) mesh.current.scale.lerp(new Vector3(1.5, 1.5, 1.5), 0.1);
    else mesh.current.scale.lerp(new Vector3(1, 1, 1), 0.1);
  });

  return (
    <group rotation={tilt}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[orbitRadius, 0.01, 16, 100]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>
      <group ref={group}>
        <mesh
          ref={mesh}
          onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; playHoverSound(); if (onDiscover) onDiscover(id); }}
          onPointerOut={() => { setHover(false); document.body.style.cursor = 'auto'; }}
          onClick={(e) => {
            e.stopPropagation(); playClickSound(); document.body.style.cursor = 'auto';
            gsap.to(camera.position, {
              x: group.current.position.x * 1.5, y: group.current.position.y * 1.5, z: group.current.position.z * 1.5,
              duration: 1, ease: 'power3.inOut',
              onComplete: () => {
                if (link.startsWith('/#')) { navigate('/'); setTimeout(() => { const el = document.getElementById(link.substring(2)); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 500); }
                else navigate(link);
              }
            });
          }}
        >
          {isConstellation ? <dodecahedronGeometry args={[0.7, 0]} /> : <octahedronGeometry args={[0.6, 0]} />}
          <meshStandardMaterial color={hovered ? '#fff' : color} wireframe={hovered} emissive={color} emissiveIntensity={hovered ? 2 : isConstellation ? 1.2 : 0.8} />
        </mesh>
        {hovered && (
          <Html position={[0, 1.2, 0]} center zIndexRange={[100, 0]}>
            <div className="node-label" style={{ background: 'rgba(0,0,0,0.8)', border: `1px solid ${color}`, padding: '8px 16px', borderRadius: '20px', color: '#fff', fontWeight: 'bold', whiteSpace: 'nowrap', boxShadow: `0 0 10px ${color}` }}>
              {label}
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

/* ─── Main Page ─── */
export default function UniversePage() {
  const [discovered, setDiscovered] = useState(() => {
    const saved = localStorage.getItem('jarowe_discovered_nodes');
    return saved ? JSON.parse(saved) : [];
  });
  const [memories, setMemories] = useState([]);
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [epochs, setEpochs] = useState([]);
  const [epochCentroids, setEpochCentroids] = useState({});
  const [isMobile] = useState(() => window.innerWidth < 600);

  // Epoch threads — positions grouped by epoch for connecting particles
  const epochThreads = useMemo(() => {
    const threads = {};
    for (const mem of memories) {
      if (!threads[mem.epoch]) threads[mem.epoch] = { positions: [], color: mem.epochColor };
      threads[mem.epoch].positions.push(mem.position);
    }
    return threads;
  }, [memories]);

  useEffect(() => {
    loadConstellationData().then(data => {
      if (data.epochs) setEpochs(data.epochs);
      const curated = curateMemories(data.nodes, { mobile: isMobile });
      const laid = layoutMemories(curated);
      setMemories(laid);
      setEpochCentroids(getEpochCentroids(laid));
    });
  }, [isMobile]);

  const handleDiscover = useCallback((nodeId) => {
    setDiscovered(prev => {
      if (prev.includes(nodeId)) return prev;
      const next = [...prev, nodeId];
      localStorage.setItem('jarowe_discovered_nodes', JSON.stringify(next));
      if (nodeId.startsWith('ig-') || nodeId.startsWith('fb-') || nodeId.startsWith('cm-')) {
        window.dispatchEvent(new CustomEvent('add-xp', { detail: { amount: 5, source: 'memory-discovery' } }));
      }
      return next;
    });
  }, []);

  const discoveredZones = discovered.filter(id => nodes.some(n => n.id === id)).length;
  const discoveredMemories = discovered.filter(id =>
    id.startsWith('ig-') || id.startsWith('fb-') || id.startsWith('cm-')
  ).length;

  return (
    <div className="universe-container">
      <motion.div
        className="universe-ui"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        <Link to="/" className="back-link" onClick={() => playClickSound()}>
          <ArrowLeft size={18} /> BACK TO HUB
        </Link>
        <div className="universe-title">
          <h1 style={{ textShadow: '0 0 20px rgba(124, 58, 237, 0.8)' }}>The Constellation</h1>
          <p>A universe of moments. Orbit, zoom, explore.</p>
          <div className="discovery-counter">
            <span>{discoveredZones} / {nodes.length} zones</span>
            {memories.length > 0 && (
              <>
                <span className="discovery-sep">|</span>
                <span>{discoveredMemories} / {memories.length} memories</span>
              </>
            )}
          </div>
        </div>
      </motion.div>

      <div className="canvas-wrapper">
        <Canvas camera={{ position: [0, 3, 14], fov: 55 }}>
          <MouseTracker />
          <ambientLight intensity={0.4} />
          <pointLight position={[10, 10, 10]} intensity={2} color="#7c3aed" />
          <pointLight position={[-10, -10, -10]} intensity={1} color="#0ea5e9" />
          <pointLight position={[0, 15, 0]} intensity={0.8} color="#22d3ee" />

          <Starfield />
          <DustCloud />
          <Stars radius={60} depth={60} count={6000} factor={5} saturation={1} fade speed={1.5} />

          <CoreNode />

          {nodes.map(node => (
            <InteractiveNode key={node.id} {...node} onDiscover={handleDiscover} />
          ))}

          {/* Epoch labels at centroids */}
          {epochs.length > 0 && <EpochLabels epochs={epochs} centroids={epochCentroids} />}

          {/* Epoch threads — faint particle trails connecting memories in same epoch */}
          {Object.entries(epochThreads).map(([epoch, data]) => (
            <EpochThread key={epoch} positions={data.positions} color={data.color} />
          ))}

          {/* Memory polaroids */}
          {memories.map(mem => (
            <PolaroidErrorBoundary
              key={mem.id}
              fallback={<PolaroidPlaceholder position={mem.position} epochColor={mem.epochColor} />}
            >
              <Suspense fallback={<PolaroidPlaceholder position={mem.position} epochColor={mem.epochColor} />}>
                <MemoryPolaroid memory={mem} onDiscover={handleDiscover} onClick={setSelectedMemory} />
              </Suspense>
            </PolaroidErrorBoundary>
          ))}

          <EffectComposer frameBufferType={HalfFloatType} disableNormalPass>
            <Bloom luminanceThreshold={0.15} luminanceSmoothing={0.9} intensity={1.8} mipmapBlur />
            <ChromaticAberration offset={[0.0015, 0.0015]} />
            <Vignette eskil={false} offset={0.1} darkness={0.85} />
          </EffectComposer>

          <OrbitControls
            enableZoom enablePan={false}
            autoRotate autoRotateSpeed={0.3}
            minDistance={3} maxDistance={40}
          />
        </Canvas>
      </div>

      <AnimatePresence>
        {selectedMemory && (
          <Suspense fallback={null}>
            <MemoryDetailOverlay memory={selectedMemory} onClose={() => setSelectedMemory(null)} />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
}

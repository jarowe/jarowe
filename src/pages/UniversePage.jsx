import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, OrbitControls, Points, PointMaterial, Html, Float, useTexture, MeshTransmissionMaterial } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { Component, useRef, useState, useEffect, Suspense, useMemo, useCallback, lazy } from 'react';
import { HalfFloatType, Vector3 } from 'three';
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

/* ─── Error Boundary: silently swallows texture load failures ─── */
class PolaroidErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return this.props.fallback || null;
    return this.props.children;
  }
}

/* ─── Starfield ─── */
function Starfield(props) {
  const ref = useRef();
  const [sphere] = useState(() => random.inSphere(new Float32Array(8000), { radius: 12 }));
  useFrame((state, delta) => {
    ref.current.rotation.x -= delta / 15;
    ref.current.rotation.y -= delta / 20;
  });
  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={sphere} stride={3} frustumCulled={false} {...props}>
        <PointMaterial transparent color="#0ea5e9" size={0.03} sizeAttenuation depthWrite={false} />
      </Points>
    </group>
  );
}

/* ─── Memory Polaroid ─── */
function MemoryPolaroid({ memory, onDiscover, onClick }) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef();
  const imgUrl = resolveMediaUrl(memory.heroImage);

  // Width capped at 2.5 to prevent panoramic images from creating huge cards
  const width = 2;
  const height = 2;

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={1} position={memory.position}>
      <group rotation={memory.rotation}>
        <mesh
          ref={meshRef}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
            document.body.style.cursor = 'pointer';
            playHoverSound();
            if (onDiscover) onDiscover(memory.id);
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = 'auto';
          }}
          onClick={(e) => {
            e.stopPropagation();
            playClickSound();
            document.body.style.cursor = 'auto';
            if (onClick) onClick(memory);
          }}
        >
          {/* White border */}
          <planeGeometry args={[width + 0.4, height + 0.7]} />
          <meshStandardMaterial
            color="#fff"
            emissive={hovered ? '#fff' : '#000'}
            emissiveIntensity={hovered ? 0.3 : 0}
          />

          {/* Photo texture — loaded via Suspense parent */}
          <Suspense fallback={
            <mesh position={[0, 0.15, 0.01]}>
              <planeGeometry args={[width, height]} />
              <meshBasicMaterial color={memory.epochColor} transparent opacity={0.2} />
            </mesh>
          }>
            <PolaroidImage src={imgUrl} width={width} height={height} />
          </Suspense>

          {/* Epoch accent strip at bottom */}
          <mesh position={[0, -(height + 0.7) / 2 + 0.04, 0.01]}>
            <planeGeometry args={[width + 0.4, 0.06]} />
            <meshBasicMaterial color={memory.epochColor} />
          </mesh>

          {/* Caption on hover — contained within border */}
          {hovered && (
            <Html position={[0, -(height / 2) - 0.1, 0.02]} center transform zIndexRange={[100, 0]}>
              <div className="memory-polaroid-caption">
                <span className="memory-polaroid-epoch" style={{ color: memory.epochColor }}>
                  {memory.epoch}
                </span>
                <span className="memory-polaroid-title">
                  {(memory.title || '').substring(0, 40)}
                  {(memory.title || '').length > 40 ? '...' : ''}
                </span>
              </div>
            </Html>
          )}
        </mesh>
      </group>
    </Float>
  );
}

/* Separated texture loader so each polaroid can Suspense independently */
function PolaroidImage({ src, width, height }) {
  const texture = useTexture(src);
  return (
    <mesh position={[0, 0.15, 0.01]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

/* ─── Placeholder glow card while texture loads ─── */
function PolaroidPlaceholder({ position, rotation, epochColor }) {
  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={1} position={position}>
      <group rotation={rotation}>
        <mesh>
          <planeGeometry args={[2.4, 2.7]} />
          <meshStandardMaterial
            color={epochColor || '#333'}
            transparent
            opacity={0.15}
            emissive={epochColor || '#333'}
            emissiveIntensity={0.3}
          />
        </mesh>
      </group>
    </Float>
  );
}

/* ─── Epoch Labels (positioned at centroid of each epoch's memories) ─── */
function EpochLabels({ epochs, centroids }) {
  return (
    <>
      {epochs.map(epoch => {
        const center = centroids[epoch.label];
        if (!center) return null;
        return (
          <group key={epoch.id} position={center}>
            <Html position={[0, 3.5, 0]} center zIndexRange={[50, 0]}>
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
          <MeshTransmissionMaterial
            backside
            thickness={1}
            roughness={0}
            transmission={1}
            ior={1.5}
            chromaticAberration={1}
            anisotropy={0.1}
          />
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
    const x = Math.cos(t) * orbitRadius;
    const z = Math.sin(t) * orbitRadius;
    group.current.position.set(x, 0, z);
    mesh.current.rotation.x += delta;
    mesh.current.rotation.y += delta;
    if (hovered) {
      mesh.current.scale.lerp(new Vector3(1.5, 1.5, 1.5), 0.1);
    } else {
      mesh.current.scale.lerp(new Vector3(1, 1, 1), 0.1);
    }
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
            e.stopPropagation();
            playClickSound();
            document.body.style.cursor = 'auto';
            gsap.to(camera.position, {
              x: group.current.position.x * 1.5,
              y: group.current.position.y * 1.5,
              z: group.current.position.z * 1.5,
              duration: 1,
              ease: 'power3.inOut',
              onComplete: () => {
                if (link.startsWith('/#')) {
                  navigate('/');
                  setTimeout(() => {
                    const el = document.getElementById(link.substring(2));
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }, 500);
                } else {
                  navigate(link);
                }
              }
            });
          }}
        >
          {isConstellation
            ? <dodecahedronGeometry args={[0.7, 0]} />
            : <octahedronGeometry args={[0.6, 0]} />
          }
          <meshStandardMaterial
            color={hovered ? '#fff' : color}
            wireframe={hovered}
            emissive={color}
            emissiveIntensity={hovered ? 2 : isConstellation ? 1.2 : 0.8}
          />
        </mesh>

        {hovered && (
          <Html position={[0, 1.2, 0]} center zIndexRange={[100, 0]}>
            <div className="node-label" style={{
              background: 'rgba(0,0,0,0.8)',
              border: `1px solid ${color}`,
              padding: '8px 16px',
              borderRadius: '20px',
              color: '#fff',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              boxShadow: `0 0 10px ${color}`
            }}>
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

  // Load constellation data and curate memories
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
      // Award XP on first memory discovery
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
          <p>Everything I'm building, all connected. Hover to discover. Click to travel.</p>
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
        <Canvas camera={{ position: [0, 2, 10], fov: 60 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={2} color="#7c3aed" />
          <pointLight position={[-10, -10, -10]} intensity={1} color="#0ea5e9" />

          <Starfield />
          <Stars radius={50} depth={50} count={5000} factor={6} saturation={1} fade speed={2} />

          <CoreNode />

          {nodes.map(node => (
            <InteractiveNode key={node.id} {...node} onDiscover={handleDiscover} />
          ))}

          {/* Epoch nebulae backgrounds */}
          {epochs.length > 0 && <EpochLabels epochs={epochs} centroids={epochCentroids} />}

          {/* Memory polaroids — each with independent Suspense */}
          {memories.map(mem => (
            <PolaroidErrorBoundary
              key={mem.id}
              fallback={<PolaroidPlaceholder position={mem.position} rotation={mem.rotation} epochColor={mem.epochColor} />}
            >
              <Suspense
                fallback={<PolaroidPlaceholder position={mem.position} rotation={mem.rotation} epochColor={mem.epochColor} />}
              >
                <MemoryPolaroid
                  memory={mem}
                  onDiscover={handleDiscover}
                  onClick={setSelectedMemory}
                />
              </Suspense>
            </PolaroidErrorBoundary>
          ))}

          <EffectComposer frameBufferType={HalfFloatType} disableNormalPass>
            <Bloom luminanceThreshold={0.1} luminanceSmoothing={0.9} intensity={2.0} mipmapBlur />
            <ChromaticAberration offset={[0.002, 0.002]} />
            <Vignette eskil={false} offset={0.1} darkness={0.9} />
          </EffectComposer>

          <OrbitControls
            enableZoom
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.5}
            minDistance={3}
            maxDistance={30}
          />
        </Canvas>
      </div>

      {/* Memory detail overlay */}
      <AnimatePresence>
        {selectedMemory && (
          <Suspense fallback={null}>
            <MemoryDetailOverlay
              memory={selectedMemory}
              onClose={() => setSelectedMemory(null)}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
}

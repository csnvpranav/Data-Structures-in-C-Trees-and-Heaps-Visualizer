import React, { useRef, useState } from 'react';
import { VisualNode, VisualLink, TreeType, KeyType } from '../types';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface VisualViewportProps {
  nodes: VisualNode[];
  links: VisualLink[];
  treeType: TreeType;
  highlightedIds: string[];
  activePaths?: string[];
  heapArray: KeyType[];
  darkMode: boolean;
}

export const VisualViewport: React.FC<VisualViewportProps> = ({
  nodes,
  links,
  treeType,
  highlightedIds,
  activePaths = [],
  heapArray,
  darkMode,
}) => {
  const [scale, setScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);

  // Mouse event handlers for dragging the SVG around
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    // Only drag with left click
    if (e.button !== 0) return;
    setIsDragging(true);
    setIsPinching(false);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Touch variables for SVG Panning & Pinch-zooming (Mobile Optimization)
  const touchStartRef = useRef<{ x: number; y: number; distance: number | null }>({ x: 0, y: 0, distance: null });

  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 1) {
      // Single finger pan
      const touch = e.touches[0];
      setIsDragging(true);
      setIsPinching(false);
      setDragStart({ x: touch.clientX - panOffset.x, y: touch.clientY - panOffset.y });
      touchStartRef.current.distance = null;
    } else if (e.touches.length === 2) {
      // Two finger pinch scale calculation initialization
      setIsDragging(false);
      setIsPinching(true);
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      touchStartRef.current.distance = distance;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 1) {
      // Single finger drag for scrolling viewport view
      if (!isDragging) return;
      const touch = e.touches[0];
      setPanOffset({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      });
    } else if (e.touches.length === 2) {
      // Pinch to zoom scaling
      if (!isPinching) return;
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const prevDistance = touchStartRef.current.distance;
      if (prevDistance && prevDistance > 0) {
        const factor = distance / prevDistance;
        setScale(prev => Math.min(Math.max(prev * factor, 0.4), 2.5));
      }
      touchStartRef.current.distance = distance;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<SVGSVGElement>) => {
    setIsDragging(false);
    setIsPinching(false);
    touchStartRef.current.distance = null;

    // Smooth handoff: if exactly one finger is still touching, resume panning seamlessly
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - panOffset.x, y: touch.clientY - panOffset.y });
    }
  };

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.15, 2.5));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.15, 0.4));
  const handleResetZoom = () => {
    if (nodes.length === 0) {
      setScale(1);
      setPanOffset({ x: 0, y: 0 });
      return;
    }

    // 1. Query the current coordinates of the active Tree's root node (no incoming links)
    const candidateRoots = nodes.filter(node => !links.some(link => link.toId === node.id));
    let rootNode = candidateRoots.sort((a, b) => a.y - b.y)[0];
    
    // Fallback: use first sorted node by y coordinate
    if (!rootNode) {
      rootNode = [...nodes].sort((a, b) => a.y - b.y)[0];
    }

    if (rootNode) {
      const width = viewportRef.current?.clientWidth || 800;
      const height = viewportRef.current?.clientHeight || 600;

      // 3. Scale the zoom factor to a comfortable default level (e.g. 1.0)
      const targetScale = 1.0;

      // 2. Center precisely on those root node coordinates
      const targetX = width / 2 - rootNode.x * targetScale;
      const targetY = height / 2 - rootNode.y * targetScale;

      setScale(targetScale);
      setPanOffset({ x: targetX, y: targetY });
    } else {
      setScale(1);
      setPanOffset({ x: 0, y: 0 });
    }
  };

  const getNodeColors = (colorType: VisualNode['colorType']) => {
    if (darkMode) {
      switch (colorType) {
        case 'scanning':
          return {
            bg: 'fill-black',
            border: 'stroke-amber-400',
            text: 'fill-amber-300 font-semibold',
            glow: 'drop-shadow-[0_0_10px_rgba(245,158,11,0.55)]',
          };
        case 'pivot':
          return {
            bg: 'fill-cyan-400',
            border: 'stroke-white',
            text: 'fill-black font-extrabold',
            glow: 'drop-shadow-[0_0_15px_rgba(34,211,238,0.7)]',
          };
        case 'success':
          return {
            bg: 'fill-emerald-950/40',
            border: 'stroke-emerald-400',
            text: 'fill-emerald-400 font-bold',
            glow: 'drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]',
          };
        case 'red':
          return {
            bg: 'fill-rose-950/40',
            border: 'stroke-rose-500',
            text: 'fill-rose-400 font-bold',
            glow: 'drop-shadow-[0_0_10px_rgba(244,63,94,0.35)]',
          };
        case 'black':
          return {
            bg: 'fill-zinc-900',
            border: 'stroke-zinc-500',
            text: 'fill-zinc-100',
            glow: '',
          };
        case 'warning':
          return {
            bg: 'fill-amber-950/40',
            border: 'stroke-amber-500',
            text: 'fill-amber-300',
            glow: 'drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]',
          };
        default:
          return {
            bg: 'fill-zinc-950',
            border: 'stroke-zinc-700',
            text: 'fill-zinc-100',
            glow: '',
          };
      }
    } else {
      switch (colorType) {
        case 'scanning':
          return {
            bg: 'fill-amber-50',
            border: 'stroke-amber-500',
            text: 'fill-amber-900 font-semibold',
            glow: 'drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]',
          };
        case 'pivot':
          return {
            bg: 'fill-cyan-100',
            border: 'stroke-cyan-600',
            text: 'fill-cyan-950 font-extrabold',
            glow: 'drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]',
          };
        case 'success':
          return {
            bg: 'fill-emerald-50',
            border: 'stroke-emerald-600',
            text: 'fill-emerald-900 font-bold',
            glow: 'drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]',
          };
        case 'red':
          return {
            bg: 'fill-rose-100',
            border: 'stroke-rose-600',
            text: 'fill-rose-950 font-bold',
            glow: 'drop-shadow-[0_0_8px_rgba(244,63,94,0.3)]',
          };
        case 'black':
          return {
            bg: 'fill-zinc-800',
            border: 'stroke-zinc-950',
            text: 'fill-zinc-50 font-bold',
            glow: '',
          };
        case 'warning':
          return {
            bg: 'fill-amber-105',
            border: 'stroke-amber-605',
            text: 'fill-amber-955',
            glow: 'drop-shadow-[0_0_6px_rgba(245,158,11,0.25)]',
          };
        default:
          return {
            bg: 'fill-white',
            border: 'stroke-slate-300',
            text: 'fill-slate-900',
            glow: '',
          };
      }
    }
  };

  const isHeapType = ['max-heap', 'min-heap', 'binary-heap'].includes(treeType);

  // Get nodes involved in traversal or rebalancing in order
  const getPathNodes = (): VisualNode[] => {
    // 0. Prioritize activePaths over standard highlightedIds
    if (activePaths && activePaths.length > 0) {
      return activePaths
        .map(id => nodes.find(n => n.id === id))
        .filter((n): n is VisualNode => !!n);
    }

    // 1. If highlightedIds has at least some elements, follow its exact order
    if (highlightedIds && highlightedIds.length > 0) {
      return highlightedIds
        .map(id => nodes.find(n => n.id === id))
        .filter((n): n is VisualNode => !!n);
    }

    // 2. Otherwise fall back to any scanning or active nodes in index level order
    const activeNodes = nodes.filter(n =>
      n.colorType === 'scanning' ||
      n.colorType === 'pivot' ||
      n.colorType === 'success' ||
      n.colorType === 'warning'
    );

    if (isHeapType) {
      return activeNodes.sort((a, b) => {
        const idxA = parseInt(a.id.replace('heap_', ''), 10) || 0;
        const idxB = parseInt(b.id.replace('heap_', ''), 10) || 0;
        return idxA - idxB;
      });
    }

    return activeNodes.sort((a, b) => a.y - b.y);
  };

  const rootNode = React.useMemo(() => {
    const explicitRoot = nodes.find(n => n.isRoot);
    if (explicitRoot) return explicitRoot;
    if (nodes.length === 0) return null;
    let minNode = nodes[0];
    for (const n of nodes) {
      if (n.y < minNode.y) {
        minNode = n;
      }
    }
    return minNode;
  }, [nodes]);

  return (
    <div className="relative flex flex-col flex-1 h-full select-none touch-none" ref={viewportRef}>
      {/* Dynamic Viewport Controls */}
      <div className={`absolute top-4 left-1/2 -translate-x-1/2 md:left-4 md:translate-x-0 z-20 flex items-center gap-1 p-1.5 ${
        darkMode ? 'bg-black/70 border-white/10' : 'bg-white/90 border-slate-200 shadow-md text-slate-800'
      } border rounded-lg shadow-2xl backdrop-blur-md`}>
        <button
          onClick={handleZoomIn}
          id="btn_zoom_in"
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            darkMode ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          id="btn_zoom_out"
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            darkMode ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className={`h-4 w-[1px] ${darkMode ? 'bg-white/10' : 'bg-slate-200'} mx-1`} />
        <button
          onClick={handleResetZoom}
          id="btn_zoom_reset"
          className={`p-1.5 rounded transition-colors flex items-center gap-1 text-xs px-2 cursor-pointer ${
            darkMode ? 'hover:bg-white/5 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
          title="Reset View"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-500 z-10 pointer-events-none">
          <p className="text-sm font-medium text-slate-400">The data structure is empty</p>
          <p className="text-xs mt-1">Input variables to insert numbers step-by-step</p>
        </div>
      )}

      {/* Main SVG Stage */}
      <div className={`flex-1 w-full ${darkMode ? 'bg-[#0a0a0a]' : 'bg-slate-50'} overflow-hidden cursor-grab active:cursor-grabbing relative`}>
        {/* Grid Pattern Overlay */}
        <div 
          className={`absolute inset-0 ${darkMode ? 'opacity-[0.03]' : 'opacity-[0.06]'} pointer-events-none z-0`} 
          style={{ backgroundImage: `radial-gradient(${darkMode ? '#fff' : '#000'} 1px, transparent 0)`, backgroundSize: '24px 24px' }}
        ></div>
        
        <svg
          className="w-full h-full transition-transform duration-75 relative z-10 touch-none select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          id="viewport_svg"
        >
          {/* Arrow definitions for directed margins/pointers */}
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={darkMode ? '#94a3b8' : '#64748b'} />
            </marker>
          </defs>
 
          {/* Scale and pan transformations container */}
          <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${scale})`} className={(isDragging || isPinching) ? "" : "transition-transform duration-500 ease-out"}>
            {/* Draw links first to float nodes above them */}
            {links.map((link, idx) => {
              const isDotted = link.colorType === 'dotted';
              const isLinkActive = activePaths && activePaths.length > 1 && (
                activePaths.includes(link.fromId) && activePaths.includes(link.toId)
              );
 
              const fromNode = nodes.find(n => n.id === link.fromId);
              const toNode = nodes.find(n => n.id === link.toId);
              const x1 = fromNode ? fromNode.x : link.fromX;
              const y1 = fromNode ? fromNode.y : link.fromY;
              const x2 = toNode ? toNode.x : link.toX;
              const y2 = toNode ? toNode.y : link.toY;

              let strokeColor = darkMode ? 'rgba(255,255,255,0.15)' : '#cbd5e1';
              if (isLinkActive) {
                strokeColor = darkMode ? '#06b6d4' : '#0891b2'; // Standard active flow cyan
                if (fromNode?.colorType === 'scanning' || toNode?.colorType === 'scanning') {
                  strokeColor = darkMode ? '#f59e0b' : '#b45309'; // Amber warning flow
                } else if (fromNode?.colorType === 'success' && toNode?.colorType === 'success') {
                  strokeColor = darkMode ? '#10b981' : '#047857'; // Green success flow
                } else if (fromNode?.colorType === 'pivot' || toNode?.colorType === 'pivot') {
                  strokeColor = darkMode ? '#22d3ee' : '#0ea5e9'; // Highlight pivot flow
                }
              }
 
              return (
                <g key={`l-${link.fromId}-${link.toId}-${idx}`}>
                  {isLinkActive && (
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={strokeColor}
                      strokeWidth="7"
                      opacity="0.35"
                      className="transition-all duration-300"
                      style={{ filter: `drop-shadow(0 0 8px ${strokeColor})` }}
                    />
                  )}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isLinkActive ? strokeColor : (darkMode ? 'rgba(255,255,255,0.15)' : '#cbd5e1')}
                    strokeWidth={isLinkActive ? 3.5 : (isDotted ? 2.5 : 2)}
                    strokeDasharray={isLinkActive ? undefined : (isDotted ? '4,4' : undefined)}
                    className={`transition-all duration-300 ${isLinkActive ? 'flowing-path' : ''}`}
                  />
                  {/* Subtle directional markers if needed */}
                  {isDotted && (
                    <circle
                      cx={(x1 + x2) / 2}
                      cy={(y1 + y2) / 2}
                      r="2.5"
                      fill={darkMode ? '#22d3ee' : '#0ea5e9'}
                    />
                  )}
                </g>
              );
            })}
 
            {/* Traversal/Rebalancing Highlighted Animated Sibling/Path Layer */}
            {(() => {
              const pathNodes = getPathNodes();
              if (pathNodes.length < 2) return null;

              // Filter out any stale IDs or nodes not in the current active memory list
              const activeNodeIds = new Set(nodes.map(n => n.id));
              const validPathNodes = pathNodes.filter(n => activeNodeIds.has(n.id));
              if (validPathNodes.length < 2) return null;

              // Construct standard sequential SVG path d coordinate string containing ONLY coordinates 
              // connected by active, valid structural branch links in the physical links array
              const segments: string[] = [];
              for (let i = 1; i < validPathNodes.length; i++) {
                const nodeA = validPathNodes[i - 1];
                const nodeB = validPathNodes[i];
                
                const hasEdge = links.some(
                  link =>
                    (link.fromId === nodeA.id && link.toId === nodeB.id) ||
                    (link.fromId === nodeB.id && link.toId === nodeA.id)
                );
                
                if (hasEdge) {
                  segments.push(`M ${nodeA.x} ${nodeA.y} L ${nodeB.x} ${nodeB.y}`);
                }
              }

              if (segments.length === 0) return null;

              const pathD = segments.join(' ');
              const lastNode = validPathNodes[validPathNodes.length - 1];

              // Dynamically configure accent coloring based on operational priorities
              let pathColor = darkMode ? '#06b6d4' : '#0891b2'; // Vibrant standard Cyan lab-visualizer color
              if (validPathNodes.some(n => n.colorType === 'scanning')) {
                pathColor = darkMode ? '#f59e0b' : '#b45309'; // Amber Warning/Scrutiny color
              } else if (validPathNodes.some(n => n.colorType === 'pivot')) {
                pathColor = darkMode ? '#22d3ee' : '#0ea5e9'; // Highlight cyan rotation pivot
              } else if (validPathNodes.some(n => n.colorType === 'red')) {
                pathColor = darkMode ? '#f43f5e' : '#dc2626'; // Red-Black tree coloring highlight
              } else if (validPathNodes.some(n => n.colorType === 'success')) {
                pathColor = darkMode ? '#10b981' : '#047857'; // Solved node success sequence color
              }

              return (
                <g key="visual-traversal-flow-path">
                  {/* Glowing wide background trace */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={pathColor}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.25"
                    className="transition-all duration-300"
                    style={{
                      filter: `drop-shadow(0 0 10px ${pathColor})`,
                    }}
                  />
                  {/* Flowing animated sharp foreground trace */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={pathColor}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="flowing-path transition-all duration-300"
                  />
                  {/* Pulse circle at active tail check node */}
                  <circle
                    cx={lastNode.x}
                    cy={lastNode.y}
                    r="24"
                    fill="none"
                    stroke={pathColor}
                    strokeWidth="1.5"
                    strokeDasharray="4,4"
                    className="animate-spin"
                    opacity="0.6"
                    style={{
                      transformOrigin: `${lastNode.x}px ${lastNode.y}px`,
                      animationDuration: '6s'
                    }}
                  />
                </g>
              );
            })()}

            {/* Render node objects */}
            {nodes.map((node) => {
              const colors = getNodeColors(node.colorType);
              const isBTreeNode = node.keys && node.keys.length > 0;
              const isNodeActive = activePaths && activePaths.includes(node.id);
              const glowStyle = isNodeActive
                ? 'drop-shadow-[0_0_12px_rgba(34,211,238,0.85)] scale-105 duration-300'
                : colors.glow;

              return (
                <g
                  key={`n-${node.id}`}
                  transform={`translate(${node.x}, ${node.y})`}
                  className={`transition-all duration-300 cursor-pointer ${glowStyle}`}
                >
                  {isBTreeNode ? (
                    // Draw Rounded Rectangles block for multi-key B / B+ tree nodes
                    <g>
                      {(node.isRoot || node.id === rootNode?.id) && (
                        <rect
                          x="-62"
                          y="-22"
                          width="124"
                          height="44"
                          rx="9"
                          fill="none"
                          stroke={darkMode ? 'rgba(34, 211, 238, 0.4)' : 'rgba(8, 145, 178, 0.35)'}
                          strokeWidth="1.5"
                          className="animate-pulse"
                          style={{
                            filter: darkMode 
                              ? 'drop-shadow(0 0 6px rgba(34, 211, 238, 0.25))' 
                              : 'drop-shadow(0 0 6px rgba(14, 165, 233, 0.2))'
                          }}
                        />
                      )}
                      <rect
                        x="-55"
                        y="-15"
                        width="110"
                        height="30"
                        rx="6"
                        fill={darkMode ? '#121212' : '#ffffff'}
                        stroke={isNodeActive ? '#22d3ee' : (node.colorType === 'success' ? '#10b981' : (darkMode ? 'rgba(255,255,255,0.15)' : '#cbd5e1'))}
                        strokeWidth={isNodeActive ? '3.5' : '2.5'}
                        className="transition-colors duration-300"
                      />
                      {/* Vertical key separators if node has multiple keys */}
                      {node.keys!.length > 1 && (
                        <g>
                          {node.keys!.length === 2 && (
                            <line x1="0" y1="-15" x2="0" y2="15" stroke={darkMode ? 'rgba(255,255,255,0.15)' : '#cbd5e1'} strokeDasharray="2" />
                          )}
                          {node.keys!.length === 3 && (
                            <>
                              <line x1="-18" y1="-15" x2="-18" y2="15" stroke={darkMode ? 'rgba(255,255,255,0.15)' : '#cbd5e1'} strokeDasharray="2" />
                              <line x1="18" y1="-15" x2="18" y2="15" stroke={darkMode ? 'rgba(255,255,255,0.15)' : '#cbd5e1'} strokeDasharray="2" />
                            </>
                          )}
                        </g>
                      )}
                      {/* Dynamic keys rendering */}
                      <text
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className={`font-mono text-xs font-bold ${darkMode ? 'fill-white' : 'fill-slate-800'}`}
                      >
                        {node.label}
                      </text>
                    </g>
                  ) : (
                    // Classical Circle shape for binary tree search indices, individual trees & Fib elements
                    <g>
                      {(node.isRoot || node.id === rootNode?.id) && (
                        <circle
                          r="26"
                          fill="none"
                          stroke={darkMode ? 'rgba(34, 211, 238, 0.4)' : 'rgba(8, 145, 178, 0.35)'}
                          strokeWidth="1.5"
                          className="animate-pulse"
                          style={{
                            filter: darkMode 
                              ? 'drop-shadow(0 0 6px rgba(34, 211, 238, 0.25))' 
                              : 'drop-shadow(0 0 6px rgba(14, 165, 233, 0.2))'
                          }}
                        />
                      )}
                      <circle
                        r="20"
                        className={`transition-all duration-300 ${colors.bg} ${isNodeActive ? 'stroke-cyan-400 stroke-[3px]' : `stroke-2 ${colors.border}`}`}
                      />
                      <text
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className={`font-sans text-xs font-semibold ${colors.text} select-none`}
                      >
                        {node.label}
                      </text>
                    </g>
                  )}

                  {/* Render node sub-labels such as height or balance factors outside circle */}
                  {node.subLabel && (
                    <text
                      y={isBTreeNode ? 26 : 28}
                      textAnchor="middle"
                      className={`font-mono text-[9px] font-bold tracking-tight ${darkMode ? 'fill-slate-400' : 'fill-slate-600'} select-none uppercase`}
                    >
                      {node.subLabel}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Heap-Array Sequential Layout Panel */}
      {isHeapType && heapArray.length > 0 && (
        <div className={`absolute bottom-4 left-4 right-4 p-3 ${
          darkMode ? 'bg-black/60 border-white/10' : 'bg-white/90 border-slate-200 shadow-md'
        } border rounded-xl shadow-2xl z-15 backdrop-blur-md`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[11px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'} tracking-wider uppercase font-mono`}>
              Flat Array Representation (Sequential Memory Layout)
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Parent Index = ⌊(i-1)/2⌋ &nbsp;|&nbsp; Child Indices = 2i+1, 2i+2
            </span>
          </div>
          <div className="flex flex-wrap gap-1 items-center font-mono text-xs">
            {heapArray.map((val, idx) => {
              const isSearching = nodes.find(n => n.id === `heap_${idx}`)?.colorType === 'scanning';
              const isSwapping = nodes.find(n => n.id === `heap_${idx}`)?.colorType === 'pivot';

              let cellStyle = darkMode
                ? 'bg-[#121212] hover:bg-[#1a1a1a] border-white/5 text-slate-300'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800';
              if (isSearching) {
                cellStyle = darkMode
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'bg-amber-50 text-amber-800 border-amber-400 shadow-sm';
              } else if (isSwapping) {
                cellStyle = darkMode
                  ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/40 shadow-xl shadow-cyan-500/5'
                  : 'bg-cyan-50 text-cyan-800 border-cyan-400 shadow-sm';
              }

              return (
                <div
                  key={`heap-cell-${idx}`}
                  className={`flex flex-col items-center justify-center border-2 rounded-md py-1.5 px-3 min-w-[42px] transition-all ${cellStyle}`}
                >
                  <span className={`${darkMode ? 'text-slate-500' : 'text-slate-400'} text-[9px] mb-0.5`}>[{idx}]</span>
                  <span className="font-bold">{val}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

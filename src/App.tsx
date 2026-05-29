import React, { useState, useEffect, useRef } from 'react';
import { TreeType, AnimationStep, KeyType } from './types';
import { VisualizerEngine } from './structures/treeAlgorithms';
import { ControlPanel } from './components/ControlPanel';
import { VisualViewport } from './components/VisualViewport';
import { ExplanationSidebar } from './components/ExplanationSidebar';
import { PlaybackControls } from './components/PlaybackControls';
import { PseudocodeLinker } from './components/PseudocodeLinker';
import { Sun, Moon, Info, HelpCircle, Database, Code, List, ChevronLeft, ChevronRight, Sparkles, ChevronsLeft, ChevronsRight, Play, Pause, Sliders } from 'lucide-react';
import { computeTraversals } from './utils/traversalHelper';

export default function App() {
  const [treeType, setTreeType] = useState<TreeType>('bst');
  const [bTreeOrder, setBTreeOrder] = useState<number>(3);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const local = localStorage.getItem('tree-animator-dark-mode');
    return local !== 'false'; // Default to Elegant Dark indeed!
  });

  // Mobile layout UX states
  const [isStructureModalOpen, setIsStructureModalOpen] = useState<boolean>(false);
  const [isParamsPopupOpen, setIsParamsPopupOpen] = useState<boolean>(false);
  const [openBottomSheet, setOpenBottomSheet] = useState<'code' | 'ledger' | null>(null);
  const [mobileInput, setMobileInput] = useState<string>('');

  // Resizable panel widths (desktop view)
  const [leftWidth, setLeftWidth] = useState<number>(330);
  const [rightWidth, setRightWidth] = useState<number>(340);
  const [isDraggingLeft, setIsDraggingLeft] = useState<boolean>(false);
  const [isDraggingRight, setIsDraggingRight] = useState<boolean>(false);

  const startDragLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingLeft(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const calculatedWidth = moveEvent.clientX;
      if (calculatedWidth < 120) {
        setLeftWidth(0);
      } else {
        const newWidth = Math.max(180, Math.min(500, calculatedWidth));
        setLeftWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const startDragRight = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingRight(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const calculatedWidth = window.innerWidth - moveEvent.clientX;
      if (calculatedWidth < 120) {
        setRightWidth(0);
      } else {
        const newWidth = Math.max(180, Math.min(550, calculatedWidth));
        setRightWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingRight(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // State instances for steps and playback speed
  const [steps, setSteps] = useState<AnimationStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1000); // ms per transition step

  // Maintain active algorithm engine instance in state
  const [engine, setEngine] = useState<VisualizerEngine>(() => {
    const eng = new VisualizerEngine('bst');
    eng.initializeWithDefaultData();
    return eng;
  });

  // Autoplay intervals setup
  useEffect(() => {
    let timer: any = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          // Advance State Snapshot inside the engine to support linear timeline progress
          const nextIdx = prev + 1;
          if (steps[nextIdx]) {
            engine.loadStateFromSnapshot(steps[nextIdx].structureSnapshot);
          }
          return nextIdx;
        });
      }, speed);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, steps, speed, engine]);

  // Synchronize CSS class for dark mode tracking
  useEffect(() => {
    localStorage.setItem('tree-animator-dark-mode', darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Populate first steps upon mounting or changing structure types
  useEffect(() => {
    const eng = new VisualizerEngine(treeType);
    eng.bTreeOrder = bTreeOrder;
    eng.initializeWithDefaultData();
    setEngine(eng);
    setSteps(eng.steps);
    setCurrentStepIndex(eng.steps.length - 1);
    setIsPlaying(false);
  }, [treeType, bTreeOrder]);

  // Sync internal engine structure state reference whenever currentStepIndex is scrubbed
  const handleStepSelect = (idx: number) => {
    if (steps[idx]) {
      engine.loadStateFromSnapshot(steps[idx].structureSnapshot);
    }
    setCurrentStepIndex(idx);
    setIsPlaying(false);
  };

  const currentStepData = steps[currentStepIndex] || null;

  // Active operations handlers
  const handleInsert = (value: KeyType) => {
    setIsPlaying(false);
    // Ensure the engine operates on the starting state of the CURRENT step in timelines (State Travel!)
    if (steps[currentStepIndex]) {
      engine.loadStateFromSnapshot(steps[currentStepIndex].structureSnapshot);
    }
    engine.bTreeOrder = bTreeOrder;
    engine.runInsert(value);
    setSteps(engine.steps);
    setCurrentStepIndex(0); // Start animation playing from step 0 of the insert transition
    if (engine.steps.length > 1) {
      setIsPlaying(true); // Auto-play the transition!
    }
  };

  const handleDelete = (value: KeyType) => {
    setIsPlaying(false);
    if (steps[currentStepIndex]) {
      engine.loadStateFromSnapshot(steps[currentStepIndex].structureSnapshot);
    }
    engine.bTreeOrder = bTreeOrder;
    engine.runDelete(value);
    setSteps(engine.steps);
    setCurrentStepIndex(0);
    if (engine.steps.length > 1) {
      setIsPlaying(true);
    }
  };

  const handleExtractMinFib = () => {
    setIsPlaying(false);
    if (steps[currentStepIndex]) {
      engine.loadStateFromSnapshot(steps[currentStepIndex].structureSnapshot);
    }
    engine.runDelete(0); // Deletion code runs Fib Extract Min internally
    setSteps(engine.steps);
    setCurrentStepIndex(0);
    if (engine.steps.length > 1) {
      setIsPlaying(true);
    }
  };

  const handleRandomInsert = () => {
    const randomVal = Math.floor(Math.random() * 90) + 7; // range: 7 to 96
    handleInsert(randomVal);
  };

  const handleLoadScenario = (scenarioKey: string) => {
    setIsPlaying(false);

    // Clear first
    engine.binaryRoot = null;
    engine.bTreeRoot = null;
    engine.bPlusTreeRoot = null;
    engine.heapArray = [];
    engine.fibRoots = [];
    engine.steps = [];

    let targetType: TreeType = 'bst';
    let targetKeys: KeyType[] = [];
    let scenarioTitle = '';
    let scenarioDesc = '';

    if (scenarioKey === 'degenerate-bst') {
      targetType = 'bst';
      targetKeys = [10, 20, 30, 40, 50, 60];
      scenarioTitle = 'Skewed Degenerate BST Chain';
      scenarioDesc = 'Unbalanced consecutive inputs form a linear linked-list layout, showcasing O(N) lookup degradation.';
    } else if (scenarioKey === 'cascading-avl') {
      targetType = 'avl';
      targetKeys = [50, 25, 75, 12, 37, 62, 87, 6, 18, 30, 40, 5, 8];
      scenarioTitle = 'Cascading AVL Rotations';
      scenarioDesc = 'Balanced insertion sequence with cascading double and single rotations to restore strict height factors.';
    } else if (scenarioKey === 'rb-double-rotate') {
      targetType = 'red-black';
      targetKeys = [50, 25, 75, 12, 37, 62, 87, 30, 35];
      scenarioTitle = 'Red-Black Double Rotation';
      scenarioDesc = 'Complex recoloring and double rotation split to balance node heights on insertion.';
    } else if (scenarioKey === 'btree-split') {
      targetType = 'b-tree';
      setBTreeOrder(3);
      targetKeys = [10, 20, 30, 40, 50, 60, 70];
      scenarioTitle = 'B-Tree Multi-level Split';
      scenarioDesc = 'Sequential inserts leading to node splitting, key promotion, and height expansion under Order 3 limitations.';
    } else if (scenarioKey === 'heapify-bubble') {
      targetType = 'max-heap';
      targetKeys = [10, 20, 30, 40, 50, 60, 75];
      scenarioTitle = 'Max Heap Bubble-Up';
      scenarioDesc = 'Heap bubble-up progression, demonstrating index bubble swaps until the root holds the maximum element.';
    } else if (scenarioKey === 'fib-consolidate') {
      targetType = 'fibonacci-heap';
      targetKeys = [10, 20, 30, 40, 50, 60, 70, 80];
      scenarioTitle = 'Fibonacci Consolidate';
      scenarioDesc = 'Multiple single-level trees in root list being consolidated circularly down to a single tree after Extract Min.';
    }

    if (!scenarioKey) return;

    setTreeType(targetType);

    const newEngine = new VisualizerEngine(targetType);
    newEngine.bTreeOrder = targetType === 'b-tree' ? 3 : bTreeOrder;

    if (targetKeys.length > 0) {
      newEngine.runInsert(targetKeys[0]);
      for (let i = 1; i < targetKeys.length; i++) {
        const lastStep = newEngine.steps[newEngine.steps.length - 1];
        newEngine.loadStateFromSnapshot(lastStep.structureSnapshot);
        newEngine.runInsert(targetKeys[i]);
      }
    }

    if (scenarioKey === 'fib-consolidate') {
      const lastStep = newEngine.steps[newEngine.steps.length - 1];
      newEngine.loadStateFromSnapshot(lastStep.structureSnapshot);
      newEngine.runDelete(0); // Extract Min
    }

    // Insert introduction step at the beginning
    const initialIntroStep: AnimationStep = {
      title: scenarioTitle,
      explanation: `Scenario Loaded: ${scenarioDesc} Click Play or Next to step through this sequence step-by-step.`,
      nodes: newEngine.steps[0]?.nodes || [],
      links: newEngine.steps[0]?.links || [],
      highlightedNodeIds: [],
      structureSnapshot: newEngine.steps[0]?.structureSnapshot || ''
    };

    newEngine.steps.unshift(initialIntroStep);

    setEngine(newEngine);
    setSteps(newEngine.steps);
    setCurrentStepIndex(0);
    if (newEngine.steps.length > 1) {
      setIsPlaying(true);
    }
  };

  const handleClear = () => {
    setIsPlaying(false);
    engine.binaryRoot = null;
    engine.bTreeRoot = null;
    engine.bPlusTreeRoot = null;
    engine.heapArray = [];
    engine.fibRoots = [];
    engine.steps = [];

    const emptyStep: AnimationStep = {
      title: 'Cleared Structure',
      explanation: 'All node elements have been cleared. Ready for custom keys insertion sequence.',
      nodes: [],
      links: [],
      highlightedNodeIds: [],
      structureSnapshot: '',
    };

    setSteps([emptyStep]);
    setCurrentStepIndex(0);
  };

  // Playback stepping controls handlers
  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      const nextIdx = currentStepIndex + 1;
      engine.loadStateFromSnapshot(steps[nextIdx].structureSnapshot);
      setCurrentStepIndex(nextIdx);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      engine.loadStateFromSnapshot(steps[prevIdx].structureSnapshot);
      setCurrentStepIndex(prevIdx);
    }
  };

  const handleFirst = () => {
    engine.loadStateFromSnapshot(steps[0].structureSnapshot);
    setCurrentStepIndex(0);
  };

  const handleLast = () => {
    const finalIdx = steps.length - 1;
    engine.loadStateFromSnapshot(steps[finalIdx].structureSnapshot);
    setCurrentStepIndex(finalIdx);
  };

  const structureMetadata: Record<TreeType, {
    title: string;
    category: string;
    insertTime: string;
    deleteTime: string;
    spaceComp: string;
    details: string;
  }> = {
    'binary-tree': {
      title: 'Binary Tree',
      category: 'Unbalanced Trees',
      insertTime: 'O(1) / O(N)',
      deleteTime: 'O(N)',
      spaceComp: 'O(N)',
      details: 'Hierarchical node network with complete left-to-right filling progression.',
    },
    'bst': {
      title: 'Binary Search Tree (BST)',
      category: 'Search Trees',
      insertTime: 'O(log N) avg / O(N) worst',
      deleteTime: 'O(log N) avg / O(N) worst',
      spaceComp: 'O(N)',
      details: 'Strict left-less-than, right-greater-than pointer arrangement layout.',
    },
    'avl': {
      title: 'AVL Tree',
      category: 'Balanced Trees',
      insertTime: 'O(log N)',
      deleteTime: 'O(log N)',
      spaceComp: 'O(N)',
      details: 'Self-balancing search tree. Demands height differences (balance factors) stay between -1 and 1 via single/double rotations.',
    },
    'splay': {
      title: 'Splay Tree',
      category: 'Balanced Trees',
      insertTime: 'O(log N) amortized',
      deleteTime: 'O(log N) amortized',
      spaceComp: 'O(N)',
      details: 'Binary search tree which splays recently requested items up to the root via splay rotations.',
    },
    'red-black': {
      title: 'Red-Black Tree',
      category: 'Balanced Trees',
      insertTime: 'O(log N)',
      deleteTime: 'O(log N)',
      spaceComp: 'O(N)',
      details: 'Guarantees balanced properties by enforcing dual color patterns (Red/Black) and parent-uncle color splits.',
    },
    'b-tree': {
      title: 'B-Tree (Order 3)',
      category: 'Multi-way Trees',
      insertTime: 'O(log N)',
      deleteTime: 'O(log N)',
      spaceComp: 'O(N)',
      details: 'Self-balancing multi-way search tree. Allows multiple keys inside a single node, maximizing disk lookup density.',
    },
    'b-plus-tree': {
      title: 'B+ Tree (Order 3)',
      category: 'Multi-way Trees',
      insertTime: 'O(log N)',
      deleteTime: 'O(log N)',
      spaceComp: 'O(N)',
      details: 'Optimized search tree. Leaves store copy duplicate links and form a circular singly-linked chain to accommodate range queries.',
    },
    'max-heap': {
      title: 'Max Heap',
      category: 'Priority Queues',
      insertTime: 'O(log N)',
      deleteTime: 'O(log N) (Extract Max)',
      spaceComp: 'O(N)',
      details: 'Complete binary tree where parent key values are consistently larger than or equal to their children.',
    },
    'min-heap': {
      title: 'Min Heap',
      category: 'Priority Queues',
      insertTime: 'O(log N)',
      deleteTime: 'O(log N) (Extract Min)',
      spaceComp: 'O(N)',
      details: 'Complete binary tree where parent key values are consistently smaller than or equal to their children.',
    },
    'binary-heap': {
      title: 'Binary Heap',
      category: 'Priority Queues',
      insertTime: 'O(log N)',
      deleteTime: 'O(log N)',
      spaceComp: 'O(N)',
      details: 'Standard min-priority queue demonstrating mapping from a complete tree visual structure down to a math index list.',
    },
    'fibonacci-heap': {
      title: 'Fibonacci Heap',
      category: 'Advanced Heaps',
      insertTime: 'O(1) amortized',
      deleteTime: 'O(log N) amortized',
      spaceComp: 'O(N)',
      details: 'A forest of min-heap-ordered trees utilizing lazy unification. Links equal degrees upon extraction.',
    },
  };

  const currentMeta = structureMetadata[treeType];

  return (
    <div className={`flex flex-col justify-between h-[100dvh] min-h-[100dvh] w-screen ${darkMode ? 'dark-mode bg-[#0a0a0a] text-slate-300' : 'light-mode bg-slate-100 text-slate-900'} font-sans overflow-hidden select-none`}>
      {/* Top Application Header Bar */}
      <header className={`h-16 border-b ${darkMode ? 'border-white/10 bg-[#0f0f0f]' : 'border-slate-200 bg-white shadow-sm'} flex items-center justify-between px-6 z-10 flex-shrink-0 shadow-lg`}>
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-cyan-500 rounded flex items-center justify-center text-black font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <h1 className={`text-xl font-medium tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'} flex items-center`}>
            AlgoViz <span className="text-cyan-500 font-mono text-xs opacity-80 ml-1.5 uppercase tracking-widest font-bold">v2.4</span>
          </h1>
        </div>

        {/* Dynamic Dark Mode / Settings Controls */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-block text-[10px] font-bold text-cyan-400 uppercase tracking-widest font-mono bg-cyan-950/40 px-2.5 py-1 rounded-md border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]">
            Interactive Digital Lab
          </span>
          <button
            onClick={() => setDarkMode(!darkMode)}
            id="btn_toggle_dark_mode"
            className={`p-2 border rounded-lg transition-all cursor-pointer ${
              darkMode ? 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5' : 'border-slate-200 text-slate-500 hover:text-slate-950 hover:bg-slate-100'
            }`}
            title="Toggle Visual Theme"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Dedicated Top Timeline Panel for Mobile - Compact Horizontal Dock */}
      <div className={`md:hidden flex-shrink-0 z-20 border-b p-2 px-3 flex flex-col gap-1.5 transition-colors ${
        darkMode 
          ? 'bg-[#0b0b0b] border-white/10 text-slate-300' 
          : 'bg-white border-slate-200 text-slate-800 shadow-sm'
      }`}>
        <div className="flex items-center justify-between gap-2.5">
          {/* Controls Mini-Group */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleFirst}
              disabled={currentStepIndex === 0 || steps.length <= 1}
              className={`p-1.5 border rounded-lg transition-colors cursor-pointer disabled:opacity-30 flex items-center justify-center ${
                darkMode 
                  ? 'border-white/10 bg-[#121212] hover:bg-zinc-900 text-slate-300 shadow-sm' 
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 shadow-sm'
              }`}
              title="First Step"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handlePrev}
              disabled={currentStepIndex === 0 || steps.length <= 1}
              className={`p-1.5 border rounded-lg transition-colors cursor-pointer disabled:opacity-30 flex items-center justify-center ${
                darkMode 
                  ? 'border-white/10 bg-[#121212] hover:bg-[#1c1c1c] text-slate-300 shadow-sm' 
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 shadow-sm'
              }`}
              title="Prev Step"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={steps.length <= 1}
              className={`h-7 px-2.5 rounded-lg text-black font-extrabold flex items-center gap-1 text-[10px] uppercase tracking-wider transition-all duration-300 cursor-pointer select-none ${
                isPlaying
                  ? 'bg-amber-400 hover:bg-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.25)] animate-pulse'
                  : 'bg-cyan-400 hover:bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.3)]'
              } disabled:opacity-40`}
            >
              {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
              <span>{isPlaying ? 'Pause' : 'Animate'}</span>
            </button>

            <button
              onClick={handleNext}
              disabled={currentStepIndex === steps.length - 1 || steps.length <= 1}
              className={`p-1.5 border rounded-lg transition-colors cursor-pointer disabled:opacity-30 flex items-center justify-center ${
                darkMode 
                  ? 'border-white/10 bg-[#121212] hover:bg-[#1c1c1c] text-slate-300 shadow-sm' 
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 shadow-sm'
              }`}
              title="Next Step"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleLast}
              disabled={currentStepIndex === steps.length - 1 || steps.length <= 1}
              className={`p-1.5 border rounded-lg transition-colors cursor-pointer disabled:opacity-30 flex items-center justify-center ${
                darkMode 
                  ? 'border-white/10 bg-[#121212] hover:bg-zinc-900 text-slate-300 shadow-sm' 
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 shadow-sm'
              }`}
              title="Last Step"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Vertical divider line */}
          <div className={`h-6 w-[1px] ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`} />

          {/* Steps tracking view */}
          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono leading-none ${
            darkMode ? 'bg-black/40 border-white/5 text-slate-300' : 'bg-slate-100 border-slate-250 text-slate-600'
          }`}>
            <span className="font-bold">{steps.length > 0 ? currentStepIndex + 1 : 0}</span>
            <span className="opacity-40">/</span>
            <span>{steps.length}</span>
          </div>

          {/* Active Cycle Status Indicator Node */}
          <div className="flex items-center gap-1 text-[9px] uppercase tracking-wide font-bold font-mono">
            <span className="relative flex h-2 w-2">
              {isPlaying && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isPlaying ? 'bg-cyan-400' : 'bg-slate-500'}`}></span>
            </span>
            <span className={isPlaying ? "text-cyan-400" : darkMode ? "text-slate-500" : "text-slate-400"}>
              {isPlaying ? "ACTIVE" : "IDLE"}
            </span>
          </div>
        </div>

        {/* Speed slider row + compact scrubber progress */}
        <div className="flex items-center justify-between gap-3 text-[10px]">
          {/* Progress bar scrubber */}
          <div className="flex-1 flex items-center gap-1.5">
            <input
              type="range"
              min={0}
              max={Math.max(0, steps.length - 1)}
              value={currentStepIndex}
              onChange={(e) => handleStepSelect(parseInt(e.target.value, 10))}
              disabled={steps.length <= 1}
              className="w-full h-1 rounded appearance-none cursor-pointer accent-cyan-400 disabled:opacity-40"
              style={{ background: darkMode ? '#1a1a1a' : '#e2e8f0' }}
            />
          </div>

          {/* Speed settings slider */}
          <div className="flex items-center gap-1.5 font-mono min-w-[125px]">
            <Sliders className="w-3 h-3 text-cyan-400 flex-shrink-0" />
            <span className={`text-[9px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'} uppercase font-mono`}>
              {speed}ms
            </span>
            <input
              type="range"
              min={250}
              max={2500}
              step={150}
              value={speed}
              onChange={(e) => setSpeed(parseInt(e.target.value, 10))}
              className="w-16 h-1 rounded appearance-none cursor-pointer accent-cyan-400"
              style={{ background: darkMode ? '#1a1a1a' : '#e2e8f0' }}
              title="Animation speed"
            />
          </div>
        </div>
      </div>

      {/* Main Core Work Area */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Left Hand Controls Panel - Hidden on Mobile */}
        <div 
          className="hidden md:flex h-full flex-shrink-0 relative"
          style={{ width: `${leftWidth}px`, display: leftWidth === 0 ? 'none' : undefined }}
        >
          <ControlPanel
            currentType={treeType}
            onChangeType={setTreeType}
            onInsert={handleInsert}
            onDelete={handleDelete}
            onRandomInsert={handleRandomInsert}
            onClear={handleClear}
            onExtractMinFib={handleExtractMinFib}
            bTreeOrder={bTreeOrder}
            onChangeBTreeOrder={setBTreeOrder}
            onLoadScenario={handleLoadScenario}
            darkMode={darkMode}
          />
        </div>

        {/* Left Vertical Divider Splitter */}
        <div
          onMouseDown={startDragLeft}
          className={`hidden md:block w-[5px] self-stretch relative z-30 cursor-col-resize select-none transition-all duration-150 flex-shrink-0 ${
            isDraggingLeft ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'bg-transparent hover:bg-cyan-500/40 border-r border-white/5'
          }`}
          title="Drag to resize, or double-click to collapse"
          onDoubleClick={() => setLeftWidth(prev => prev === 0 ? 330 : 0)}
        >
          <div className={`absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] ${isDraggingLeft ? 'bg-white' : 'bg-white/10'}`}></div>
        </div>

        {/* Central Visualization Canvas */}
        <div className="flex-1 flex flex-col h-full bg-[#0a0a0a] relative overflow-hidden">
          {/* Main Visual Viewport container */}
          <div className="flex-1 relative overflow-hidden">
            <VisualViewport
              nodes={currentStepData?.nodes || []}
              links={currentStepData?.links || []}
              treeType={treeType}
              highlightedIds={currentStepData?.highlightedNodeIds || []}
              activePaths={currentStepData?.activePaths || []}
              heapArray={engine.heapArray}
              darkMode={darkMode}
            />

            {/* Quick restore bar on margins for collapsed panels */}
            {leftWidth === 0 && (
              <button
                onClick={() => setLeftWidth(330)}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-5 h-20 bg-cyan-950/70 hover:bg-cyan-900 border-y border-r border-cyan-500/30 rounded-r-lg text-cyan-400 font-bold transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer"
                title="Expand Left Panel"
              >
                <ChevronRight className="w-4 h-4 animate-pulse" />
              </button>
            )}

            {rightWidth === 0 && (
              <button
                onClick={() => setRightWidth(340)}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-5 h-20 bg-cyan-950/70 hover:bg-cyan-900 border-y border-l border-cyan-500/30 rounded-l-lg text-cyan-400 font-bold transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer"
                title="Expand Right Panel"
              >
                <ChevronLeft className="w-4 h-4 animate-pulse" />
              </button>
            )}

            {/* Vertical Floating Control Actions (Mobile View Only) - Aligned Vertically Centered on Right Edge */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3.5 md:hidden">
              {/* Select Structure Overlay Toggle - Button 1 (Top) */}
              <button
                onClick={() => setIsStructureModalOpen(true)}
                className={`w-[52px] h-[52px] rounded-full shadow-xl flex items-center justify-center transition-all cursor-pointer border ${
                  darkMode 
                    ? 'bg-[#0f0f0f] border-cyan-500/30 hover:border-cyan-400 text-cyan-400 hover:bg-zinc-900' 
                    : 'bg-white border-slate-205 text-cyan-600 hover:text-cyan-700 hover:bg-slate-50 shadow-md'
                }`}
                title="Select Data Structure"
              >
                <Database className="w-[24px] h-[24px]" />
              </button>

              {/* Active Parameters info panel Toggle - Button 2 (Bottom) */}
              <button
                onClick={() => setIsParamsPopupOpen(!isParamsPopupOpen)}
                className={`w-[52px] h-[52px] border rounded-full shadow-xl flex items-center justify-center transition-all cursor-pointer ${
                  isParamsPopupOpen
                    ? darkMode
                      ? 'bg-cyan-950/80 border-cyan-400 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                      : 'bg-cyan-50 border-cyan-500 text-cyan-600 shadow-[0_0_12px_rgba(8,145,178,0.15)] shadow-md'
                    : darkMode
                      ? 'bg-[#0f0f0f] border-white/10 text-slate-400 hover:text-white hover:bg-zinc-900'
                      : 'bg-white border-slate-205 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-md'
                }`}
                title="Active Parameters"
              >
                <Info className="w-[24px] h-[24px]" />
              </button>
            </div>

            {/* Float Menu Overlay: Parameters and Complexity content list */}
            {isParamsPopupOpen && (
              <div className={`absolute right-16 top-1/2 -translate-y-1/2 z-30 w-[240px] border rounded-xl p-4 shadow-2xl backdrop-blur-md md:hidden animate-fade-in transition-colors ${
                darkMode 
                  ? 'bg-black/95 border-cyan-500/30 text-slate-300' 
                  : 'bg-white border-slate-200 text-slate-700 shadow-xl'
              }`}>
                <div className={`flex items-center justify-between mb-2 pb-1 border-b ${
                  darkMode ? 'border-white/10' : 'border-slate-100'
                }`}>
                  <span className={`text-[9px] uppercase font-mono font-bold tracking-widest ${
                    darkMode ? 'text-cyan-400' : 'text-cyan-600'
                  }`}>Structure Details</span>
                  <button 
                    onClick={() => setIsParamsPopupOpen(false)} 
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      darkMode ? 'text-slate-500 hover:text-white bg-white/5' : 'text-slate-400 hover:text-slate-800 bg-slate-100'
                    }`}
                  >✕</button>
                </div>
                <div className={`text-xs font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {treeType === 'b-tree' 
                    ? `B-Tree (Order ${bTreeOrder})` 
                    : treeType === 'b-plus-tree' 
                    ? `B+ Tree (Order ${bTreeOrder})` 
                    : currentMeta.title}
                </div>
                <p className={`text-[10px] leading-relaxed mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {currentMeta.details}
                </p>
                <div className={`space-y-1 text-[9px] font-mono border-t pt-2 ${
                  darkMode ? 'border-white/10' : 'border-slate-100'
                }`}>
                  <div className="flex justify-between">
                    <span className={`${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Insert:</span>
                    <span className={`font-bold ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>{currentMeta.insertTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Delete:</span>
                    <span className={`font-bold ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>{currentMeta.deleteTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Memory:</span>
                    <span className={`font-bold ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>{currentMeta.spaceComp}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Desktop playback controls - Hidden on Mobile */}
          <div className="hidden md:block">
            <PlaybackControls
              currentStep={currentStepIndex}
              totalSteps={steps.length}
              isPlaying={isPlaying}
              speed={speed}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              onNext={handleNext}
              onPrev={handlePrev}
              onFirst={handleFirst}
              onLast={handleLast}
              onChangeSpeed={setSpeed}
              onChangeStep={handleStepSelect}
              darkMode={darkMode}
            />
          </div>

          {/* Mobile Bottom Section: Tree Operations bar and Stacked triggers */}
          <div className={`md:hidden border-t p-3.5 pb-8 flex items-center justify-between gap-3 z-25 flex-shrink-0 transition-colors ${
            darkMode 
              ? 'border-white/10 bg-[#0c0c0c] text-white' 
              : 'border-slate-200 bg-white text-slate-800 shadow-[0_-4px_12px_rgba(0,0,0,0.055)]'
          }`}>
            {/* Left/Middle: Operations Input & Buttons Form */}
            <div className="flex-1 flex gap-1 items-center">
              <input
                type="text"
                value={mobileInput}
                onChange={(e) => setMobileInput(e.target.value)}
                placeholder="Key"
                className={`w-12 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none font-bold text-center ${
                  darkMode 
                    ? 'bg-black border border-white/10 text-cyan-400 placeholder-[#334155]' 
                    : 'bg-slate-50 border border-slate-205 text-cyan-705 placeholder-slate-400'
                }`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = mobileInput.trim();
                    if (val) {
                      handleInsert(isNaN(Number(val)) ? val : Number(val));
                      setMobileInput('');
                    }
                  }
                }}
              />

              {treeType === 'fibonacci-heap' ? (
                <button
                  onClick={handleExtractMinFib}
                  className={`flex-1 h-8 rounded-lg text-[10px] font-bold transition-all ${
                    darkMode 
                      ? 'bg-cyan-600 hover:bg-cyan-500 text-white' 
                      : 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-sm'
                  }`}
                >
                  Ext Min
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      const val = mobileInput.trim();
                      if (!val) return;
                      handleInsert(isNaN(Number(val)) ? val : Number(val));
                      setMobileInput('');
                    }}
                    className={`flex-1 h-8 rounded-lg text-[10px] font-bold transition-all ${
                      darkMode 
                        ? 'bg-cyan-600 hover:bg-cyan-500 text-white' 
                        : 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-sm'
                    }`}
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      const val = mobileInput.trim();
                      if (!val) return;
                      handleDelete(isNaN(Number(val)) ? val : Number(val));
                      setMobileInput('');
                    }}
                    className={`flex-1 h-8 border rounded-lg text-[10px] font-medium transition-all ${
                      darkMode 
                        ? 'border-white/10 hover:border-rose-500 text-slate-400 hover:text-rose-400' 
                        : 'border-slate-200 hover:border-rose-500 text-slate-600 hover:text-rose-600 shadow-sm'
                    }`}
                  >
                    Del
                  </button>
                </>
              )}

              <button
                onClick={handleRandomInsert}
                className={`px-2 h-8 border text-[10px] font-medium rounded-lg transition-all ${
                  darkMode 
                    ? 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5' 
                    : 'border-slate-205 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-sm'
                }`}
              >
                Random Add
              </button>
              <button
                onClick={handleClear}
                className={`px-2 h-8 border text-[10px] font-medium rounded-lg transition-all ${
                  darkMode 
                    ? 'border-white/10 text-rose-400 hover:text-rose-350 hover:bg-rose-950/20' 
                    : 'border-slate-205 text-rose-600 hover:text-rose-700 hover:bg-rose-50 shadow-sm'
                }`}
              >
                Clear
              </button>
            </div>

            {/* Right: Two small stacked button toggles */}
            <div className={`flex flex-col gap-1 pl-1.5 border-l ${
              darkMode ? 'border-l-white/10' : 'border-l-slate-200'
            }`}>
              <button
                onClick={() => setOpenBottomSheet(openBottomSheet === 'code' ? null : 'code')}
                className={`w-7 h-7 border rounded-md transition-all flex items-center justify-center cursor-pointer ${
                  openBottomSheet === 'code'
                    ? (darkMode ? 'bg-cyan-950/80 border-cyan-400 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.25)]' : 'bg-cyan-50 border-cyan-500 text-cyan-600 shadow-sm')
                    : (darkMode ? 'bg-black border-white/10 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-205 text-slate-600 hover:text-slate-900 shadow-sm')
                }`}
                title="Algorithmic Line Tracker"
              >
                <Code className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setOpenBottomSheet(openBottomSheet === 'ledger' ? null : 'ledger')}
                className={`w-7 h-7 border rounded-md transition-all flex items-center justify-center cursor-pointer ${
                  openBottomSheet === 'ledger'
                    ? (darkMode ? 'bg-cyan-950/80 border-cyan-400 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.25)]' : 'bg-cyan-50 border-cyan-500 text-cyan-600 shadow-sm')
                    : (darkMode ? 'bg-black border-white/10 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-205 text-slate-600 hover:text-slate-900 shadow-sm')
                }`}
                title="Sequence Log Ledger"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Vertical Divider Splitter */}
        <div
          onMouseDown={startDragRight}
          className={`hidden md:block w-[5px] self-stretch relative z-30 cursor-col-resize select-none transition-all duration-150 flex-shrink-0 ${
            isDraggingRight ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'bg-transparent hover:bg-cyan-500/40 border-l border-white/5'
          }`}
          title="Drag to resize, or double-click to collapse"
          onDoubleClick={() => setRightWidth(prev => prev === 0 ? 340 : 0)}
        >
          <div className={`absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] ${isDraggingRight ? 'bg-white' : 'bg-white/10'}`}></div>
        </div>

        {/* Right Hand Technical explanations ledger sidebar - Hidden on Mobile */}
        <div 
          className="hidden md:flex h-full flex-shrink-0 relative"
          style={{ width: `${rightWidth}px`, display: rightWidth === 0 ? 'none' : undefined }}
        >
          <ExplanationSidebar
            currentStepData={currentStepData}
            allSteps={steps}
            currentStepIndex={currentStepIndex}
            onStepSelect={handleStepSelect}
            treeType={treeType}
            darkMode={darkMode}
          />
        </div>
      </div>

      {/* --- Mobile overlay modals and bottom sheets --- */}

      {/* 1. Modal Overlay for selecting the Data Structure (TreeType selection) */}
      {isStructureModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:hidden">
          <div className={`${
            darkMode ? 'bg-[#0f0f0f] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'
          } border rounded-2xl w-full max-w-sm max-h-[80vh] overflow-y-auto p-5 relative shadow-2xl flex flex-col font-sans`}>
            <div className={`flex items-center justify-between border-b ${
              darkMode ? 'border-white/15' : 'border-slate-100'
            } pb-3 mb-4`}>
              <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'} flex items-center gap-2`}>
                <Database className="w-4 h-4 text-cyan-400" />
                <span>Select Data Structure</span>
              </h3>
              <button
                onClick={() => setIsStructureModalOpen(false)}
                className={`text-slate-400 hover:text-white text-xs ${
                  darkMode ? 'bg-white/5' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                } px-2.5 py-1 rounded-md`}
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5 overflow-y-auto pr-1 flex-1 max-h-[55vh]">
              {(Object.keys(structureMetadata) as TreeType[]).map((type) => {
                const meta = structureMetadata[type];
                const isSelected = type === treeType;
                return (
                  <button
                    key={type}
                    onClick={() => {
                      setTreeType(type);
                      setIsStructureModalOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500/55 text-cyan-400 font-semibold'
                        : darkMode 
                          ? 'bg-black/30 border-white/5 text-slate-400 hover:text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="text-xs font-bold">{meta.title}</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">{meta.category}</div>
                    </div>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee50]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. Slide up bottom sheet for C Code Tracker */}
      {openBottomSheet === 'code' && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setOpenBottomSheet(null)} />
      )}
      <div className={`fixed inset-x-0 bottom-0 ${
        darkMode ? 'bg-[#0d0d0d] border-white/15' : 'bg-white border-slate-250 shadow-2xl'
      } border-t rounded-t-2xl z-45 transition-transform duration-300 md:hidden flex flex-col max-h-[80vh] overflow-hidden ${
        openBottomSheet === 'code' ? 'translate-y-0' : 'translate-y-full'
      }`}>
        <div className="p-4 flex flex-col h-full min-h-0">
          <div className={`flex items-center justify-between border-b ${
            darkMode ? 'border-white/5' : 'border-slate-100'
          } pb-2.5 mb-3 select-none`}>
            <span className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-900'} flex items-center gap-2`}>
              <Code className="w-4 h-4 text-cyan-400" />
              <span>Algorithmic Line Tracker</span>
            </span>
            <button
              onClick={() => setOpenBottomSheet(null)}
              className={`text-slate-400 hover:text-white text-[11px] ${
                darkMode ? 'bg-white/5' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              } px-3 py-1 rounded`}
            >
              ✕ Close
            </button>
          </div>

          {/* Highly useful compact playback bar right inside sheet context */}
          <div className={`flex items-center gap-2 p-1.5 rounded-lg border mb-3 ${
            darkMode 
              ? 'bg-black/40 border-white/5 text-slate-300' 
              : 'bg-slate-50 border-slate-100 text-slate-700'
          }`}>
            <span className="text-[10px] font-bold font-mono tracking-wider">Play Control:</span>
            <button
              onClick={handlePrev}
              disabled={currentStepIndex === 0 || steps.length <= 1}
              className={`p-1 px-1.5 border disabled:opacity-30 rounded-md text-[10px] flex items-center justify-center cursor-pointer ${
                darkMode ? 'border-white/10 bg-[#121212] text-slate-300 hover:bg-black' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              ◀ Prev
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={steps.length <= 1}
              className={`p-1 px-2.5 text-[10px] rounded-md font-bold text-black cursor-pointer transition-all ${
                isPlaying ? 'bg-amber-400' : 'bg-cyan-400 hover:brightness-110'
              }`}
            >
              {isPlaying ? 'Pause' : 'Auto'}
            </button>
            <button
              onClick={handleNext}
              disabled={currentStepIndex === steps.length - 1 || steps.length <= 1}
              className={`p-1 px-1.5 border disabled:opacity-30 rounded-md text-[10px] flex items-center justify-center cursor-pointer ${
                darkMode ? 'border-white/10 bg-[#121212] text-slate-300 hover:bg-black' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Next ▶
            </button>
            <div className="flex-1" />
            <div className={`text-[9px] font-mono font-bold leading-none px-2 py-1 rounded border ${
              darkMode ? 'bg-black/30 border-black/10' : 'bg-slate-100/55 border-slate-200/50'
            }`}>
              {currentStepIndex + 1} / {steps.length}
            </div>
          </div>

          <div className="overflow-y-auto flex-1 min-h-0 space-y-4 pr-1">
            <PseudocodeLinker treeType={treeType} currentStepData={currentStepData} darkMode={darkMode} />

            {/* Tree Traversals Section cleanly placed inside code bottom sheet */}
            {(() => {
              const traversals = currentStepData
                ? computeTraversals(currentStepData.structureSnapshot)
                : { preorder: 'N/A', inorder: 'N/A', postorder: 'N/A' };
              return (
                <div className={`p-3 rounded-xl border ${
                  darkMode 
                    ? 'bg-[#0f0f0f] border-white/5 text-slate-300 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]'
                    : 'bg-slate-50/50 border-slate-200 text-slate-800 shadow-sm'
                }`} id="mobile_tree_traversals">
                  <div className="flex items-center gap-1.5 mb-2.5 border-b pb-1 border-slate-200/50 dark:border-white/5 select-none">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
                    <span className={`text-[10px] font-bold ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    } uppercase tracking-wider font-mono`}>
                      Live Tree Traversals
                    </span>
                  </div>
                  <div className="space-y-2 text-[10.5px] font-mono leading-relaxed">
                    <div className="flex items-start gap-1">
                      <span className={`font-bold min-w-[72px] inline-block ${
                        darkMode ? 'text-cyan-400' : 'text-cyan-600'
                      }`}>Preorder:</span>
                      <span className="break-all font-semibold flex-1 leading-snug">{traversals.preorder}</span>
                    </div>
                    <div className="flex items-start gap-1">
                      <span className={`font-bold min-w-[72px] inline-block ${
                        darkMode ? 'text-cyan-400' : 'text-cyan-600'
                      }`}>Inorder:</span>
                      <span className="break-all font-semibold flex-1 leading-snug">{traversals.inorder}</span>
                    </div>
                    <div className="flex items-start gap-1">
                      <span className={`font-bold min-w-[72px] inline-block ${
                        darkMode ? 'text-cyan-400' : 'text-cyan-600'
                      }`}>Postorder:</span>
                      <span className="break-all font-semibold flex-1 leading-snug">{traversals.postorder}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* 3. Slide up bottom sheet for Sequence Log Ledger */}
      {openBottomSheet === 'ledger' && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setOpenBottomSheet(null)} />
      )}
      <div className={`fixed inset-x-0 bottom-0 ${
        darkMode ? 'bg-[#0d0d0d] border-white/15' : 'bg-white border-slate-250 shadow-2xl'
      } border-t rounded-t-2xl z-45 transition-transform duration-300 md:hidden flex flex-col max-h-[75vh] overflow-hidden ${
        openBottomSheet === 'ledger' ? 'translate-y-0' : 'translate-y-full'
      }`}>
        <div className="p-4 flex flex-col h-full min-h-0">
          <div className={`flex items-center justify-between border-b ${
            darkMode ? 'border-white/5' : 'border-slate-100'
          } pb-2.5 mb-3 select-none`}>
            <span className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-900'} flex items-center gap-2`}>
              <List className="w-4 h-4 text-cyan-400" />
              <span>Sequence Log Ledger</span>
            </span>
            <button
              onClick={() => setOpenBottomSheet(null)}
              className={`text-slate-400 hover:text-white text-[11px] ${
                darkMode ? 'bg-white/5' : 'bg-slate-100 text-slate-650 hover:bg-slate-200'
              } px-3 py-1 rounded`}
            >
              ✕ Close
            </button>
          </div>

          {/* Highly useful compact playback bar right inside sheet context */}
          <div className={`flex items-center gap-2 p-1.5 rounded-lg border mb-3 ${
            darkMode 
              ? 'bg-black/40 border-white/5 text-slate-300' 
              : 'bg-slate-50 border-slate-100 text-slate-700'
          }`}>
            <span className="text-[10px] font-bold font-mono tracking-wider">Play Control:</span>
            <button
              onClick={handlePrev}
              disabled={currentStepIndex === 0 || steps.length <= 1}
              className={`p-1 px-1.5 border disabled:opacity-30 rounded-md text-[10px] flex items-center justify-center cursor-pointer ${
                darkMode ? 'border-white/10 bg-[#121212] text-slate-300 hover:bg-black' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              ◀ Prev
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={steps.length <= 1}
              className={`p-1 px-2.5 text-[10px] rounded-md font-bold text-black cursor-pointer transition-all ${
                isPlaying ? 'bg-amber-400' : 'bg-cyan-400 hover:brightness-110'
              }`}
            >
              {isPlaying ? 'Pause' : 'Auto'}
            </button>
            <button
              onClick={handleNext}
              disabled={currentStepIndex === steps.length - 1 || steps.length <= 1}
              className={`p-1 px-1.5 border disabled:opacity-30 rounded-md text-[10px] flex items-center justify-center cursor-pointer ${
                darkMode ? 'border-white/10 bg-[#121212] text-slate-300 hover:bg-black' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Next ▶
            </button>
            <div className="flex-1" />
            <div className={`text-[9px] font-mono font-bold leading-none px-2 py-1 rounded border ${
              darkMode ? 'bg-black/30 border-black/10' : 'bg-slate-100/55 border-slate-200/50'
            }`}>
              {currentStepIndex + 1} / {steps.length}
            </div>
          </div>

          <div className="overflow-y-auto space-y-2 pr-1 flex-1 min-h-0" id="mobile_ledger_scrollable">
            {steps.map((step, idx) => {
              const isActive = idx === currentStepIndex;

              const getStepPlainEnglishDetailLocal = (): string => {
                const title = (step.title || '').toLowerCase();
                const exp = (step.explanation || '').toLowerCase();
                const numbers = exp.match(/\b\d+\b/g) || [];
                const valA = numbers[0] || 'target';
                const valB = numbers[1] || 'current node';

                if (treeType === 'bst' || treeType === 'binary-tree') {
                  if (title.includes('find') || title.includes('search') || title.includes('compare') || exp.includes('compar')) {
                    return `We compare the target key ${valA} with our node key ${valB}. If smaller we must descend left; if larger we search right. This leverages binary search tree ordering to prune search steps.`;
                  }
                  if (title.includes('insert') || exp.includes('created') || exp.includes('added')) {
                    return `We have located the leaf insertion boundary. We allocate a new tree node to store the key ${valA}, attaching it securely to preserve the sorted binary lookup sequence.`;
                  }
                  if (title.includes('delete') || title.includes('remove') || exp.includes('delete') || exp.includes('replaces')) {
                    return `Deleting node keys requires structured redistribution. We re-route left and right sub-pointers, finding an in-order replacement key where necessary to preserve overall search properties.`;
                  }
                }

                if (treeType === 'avl') {
                  if (title.includes('rotate') || exp.includes('rotate') || title.includes('single') || title.includes('double')) {
                    return `AVL rules mandate a strict balance factor difference of at most 1 between subtrees. We trigger quick pointer rotations near unbalanced pivots to preserve logarithmic branch heights.`;
                  }
                  if (title.includes('find') || title.includes('search') || exp.includes('compar')) {
                    return `Searching AVL nodes relies on binary properties. We evaluate target key ${valA} against parent ${valB}, using height balance guarantees to execute search steps in strict O(log N) operations.`;
                  }
                  if (exp.includes('height') || exp.includes('balance') || exp.includes('factor')) {
                    return `The algorithm calculates new heights upward from the leaves. We trace balancing factors to detect node differences that could trigger AVL rotation corrections.`;
                  }
                }

                if (treeType === 'red-black') {
                  if (title.includes('recolor') || exp.includes('recolor') || exp.includes('color')) {
                    return `We flip node color assignments. Red-Black rules forbid adjacent red nodes and require identical paths to contain equal black nodes. Recoloring quickly reconciles node balance.`;
                  }
                  if (title.includes('rotate') || exp.includes('rotate')) {
                    return `Recoloring alone didn't resolve adjacent red conflicts. We execute a physical path rotation, adjusting left/right branch alignments to re-balance local subtree structure.`;
                  }
                }

                if (treeType === 'splay') {
                  if (title.includes('zig') || title.includes('zag') || exp.includes('zig') || exp.includes('zag')) {
                    return `Splay operations (Zigs and Zags) restructure the node tree. Rotations run on each ancestor, moving the accessed element ${valA} to the root node for fast subsequent lookups.`;
                  }
                }

                if (treeType === 'b-tree' || treeType === 'b-plus-tree') {
                  if (title.includes('split') || exp.includes('split')) {
                    return `With keys exceeding order limits, we split the node. We partition the sorting array, promoting the median key to the parent node to manage B-Tree child constraints.`;
                  }
                  if (title.includes('borrow') || exp.includes('borrow')) {
                    return `A child node had too few keys. We borrow a key from its left or right sibling via parent keys to balance the index structure without structural height growth.`;
                  }
                  if (title.includes('merge') || exp.includes('merge')) {
                    return `When both siblings are at min key counts, we merge them into a single node. This pulls down the separator key from the parent, maintaining strict B-Tree properties.`;
                  }
                }

                if (['max-heap', 'min-heap', 'binary-heap'].includes(treeType)) {
                  if (title.includes('compare') || exp.includes('compare') || exp.includes('bubble')) {
                    return `We compare parent and child indices is this array-backed heap tree. For a ${treeType === 'max-heap' ? 'Max' : 'Min'} Heap, each parent must be ${treeType === 'max-heap' ? 'larger' : 'smaller'} than its child.`;
                  }
                  if (title.includes('swap') || exp.includes('swapped') || exp.includes('swap') || title.includes('delete') || exp.includes('replac')) {
                    return `Values are swapped between parents and children. Sorting of physical array positions is adjusted until all elements conform to standard heap order guidelines.`;
                  }
                }

                if (treeType === 'fibonacci-heap') {
                  if (title.includes('link') || exp.includes('link')) {
                    return `We link two binomial trees of identical degree. The tree holding the larger root key is attached under the smaller root key, lowering the active forest degree count.`;
                  }
                  if (title.includes('consolidat') || exp.includes('consolidat')) {
                    return `Following an extract-min step, the algorithm consolidates root forest nodes of the same degree circularly doubly-linked to streamline future search runtimes.`;
                  }
                }

                return `The algorithm executes this specific step (${step.title}) to safely realign tree elements and balance state conditions in accordance with mathematical structure laws.`;
              };

              return (
                <div
                  key={`mobile-step-ledger-${idx}`}
                  onClick={() => handleStepSelect(idx)}
                  className={`w-full p-2.5 rounded-lg border text-left transition-all flex flex-col gap-1.5 cursor-pointer ${
                    isActive
                      ? darkMode
                        ? 'bg-cyan-950/45 border-cyan-500/40 text-cyan-300 ring-1 ring-cyan-500/15 font-medium'
                        : 'bg-cyan-50 border-cyan-300 text-cyan-900 ring-1 ring-cyan-500/5 font-semibold shadow-sm'
                      : darkMode
                        ? 'bg-[#121212]/40 border-white/5 text-slate-400 hover:text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-2 w-full">
                    <span className={`font-mono text-[9px] font-black opacity-70 ${
                      darkMode ? 'bg-black text-slate-400' : 'bg-slate-100 text-slate-700'
                    } rounded px-1.5 py-0.5 mt-0.5 shrink-0`}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold truncate leading-tight">
                        {step.title}
                      </div>
                      {!isActive && (
                        <div className={`text-[9px] truncate opacity-70 mt-0.5 max-w-full ${
                          darkMode ? 'text-slate-400' : 'text-slate-550'
                        }`}>
                          {step.explanation}
                        </div>
                      )}
                    </div>
                  </div>

                  {isActive && (
                    <div className={`mt-1 pl-7 pr-1 space-y-1 border-t ${
                      darkMode ? 'border-cyan-500/10' : 'border-cyan-200'
                    } pt-1.5 accordion-expand`}>
                      <span className="font-semibold text-[8px] text-cyan-500 uppercase tracking-widest block font-mono mb-0.5">
                        In-depth Behavior Analysis
                      </span>
                      <p className={`text-[10px] ${
                        darkMode ? 'text-slate-300' : 'text-slate-755'
                      } leading-normal font-sans text-left font-normal animate-fade-in pb-1`}>
                        {getStepPlainEnglishDetailLocal()}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

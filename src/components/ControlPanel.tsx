import React, { useState } from 'react';
import { TreeType, KeyType } from '../types';
import { Plus, Trash2, Shuffle, HardDrive, RefreshCw } from 'lucide-react';

interface ControlPanelProps {
  currentType: TreeType;
  onChangeType: (type: TreeType) => void;
  onInsert: (value: KeyType) => void;
  onDelete: (value: KeyType) => void;
  onRandomInsert: () => void;
  onClear: () => void;
  onExtractMinFib: () => void;
  bTreeOrder: number;
  onChangeBTreeOrder: (order: number) => void;
  onLoadScenario: (scenarioKey: string) => void;
  darkMode: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  currentType,
  onChangeType,
  onInsert,
  onDelete,
  onRandomInsert,
  onClear,
  onExtractMinFib,
  bTreeOrder,
  onChangeBTreeOrder,
  onLoadScenario,
  darkMode,
}) => {
  const [singleInput, setSingleInput] = useState<string>('');

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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = singleInput.trim();
    if (!cleanInput) return;

    // Split by comma
    const parts = cleanInput.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length > 0) {
      parts.forEach(part => {
        const num = Number(part);
        if (!isNaN(num) && part !== '') {
          onInsert(num);
        } else {
          onInsert(part);
        }
      });
      setSingleInput('');
    }
  };

  const currentMeta = structureMetadata[currentType];

  return (
    <div id="control_panel" className={`w-full h-full ${
      darkMode ? 'bg-[#0d0d0d] text-slate-350' : 'bg-white border-r border-slate-200 text-slate-800'
    } flex flex-col overflow-y-auto`}>
      {/* App Branding Block */}
      <div className={`p-5 border-b ${
        darkMode ? 'border-white/10 bg-[#070707]' : 'border-slate-200 bg-slate-50'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-cyan-500 flex items-center justify-center text-black font-extrabold shadow-[0_0_12px_rgba(6,182,212,0.35)]">
            Ω
          </div>
          <div>
            <h1 className={`text-sm font-semibold ${
              darkMode ? 'text-white' : 'text-slate-900'
            } tracking-tight`}>
              Tree & Heap Animator
            </h1>
            <p className={`text-[10px] ${
              darkMode ? 'text-slate-500' : 'text-slate-450'
            } font-mono tracking-wider uppercase`}>
              Interactive Digital Lab
            </p>
          </div>
        </div>
      </div>

      {/* Structure Selector Groups */}
      <div className="p-4 flex-1 space-y-4">
        <div>
          <label className={`text-[10px] font-bold ${
            darkMode ? 'text-slate-500' : 'text-slate-450'
          } uppercase tracking-widest block mb-2 font-mono`}>
            Select Data Structure
          </label>
          <div className="grid grid-cols-1 gap-1" id="structure_picker">
            {(Object.keys(structureMetadata) as TreeType[]).map((type) => {
              const meta = structureMetadata[type];
              const isSelected = type === currentType;
              const titleToShow = type === 'b-tree' 
                ? `B-Tree (Order ${bTreeOrder})` 
                : type === 'b-plus-tree' 
                ? `B+ Tree (Order ${bTreeOrder})` 
                : meta.title;

              return (
                <button
                  key={type}
                  id={`btn_pick_${type}`}
                  onClick={() => onChangeType(type)}
                  className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-500/55 text-cyan-400 ring-2 ring-cyan-500/20 font-semibold'
                      : darkMode 
                        ? 'bg-[#121212]/50 hover:bg-white/5 border-white/5 text-slate-400 hover:text-white'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm'
                  }`}
                >
                  <span className="text-xs font-sans flex items-center justify-between w-full">
                    <span className="font-bold">{titleToShow}</span>
                    <span className={`text-[8px] font-mono opacity-80 ${
                      darkMode ? 'bg-white/5' : 'bg-slate-200/80 text-slate-700'
                    } rounded px-1.5 py-0.5 scale-90`}>
                      {meta.category}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic B-Tree Parameter Controls */}
        {(currentType === 'b-tree' || currentType === 'b-plus-tree') && (
          <div className={`pt-3 pb-2 border-t ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
            <label className={`text-[10px] font-bold ${
              darkMode ? 'text-slate-500' : 'text-slate-450'
            } uppercase tracking-widest block mb-2 font-mono`}>
              B-Tree / B+ Tree Order (M)
            </label>
            <select
              value={bTreeOrder}
              onChange={(e) => onChangeBTreeOrder(parseInt(e.target.value, 10))}
              className={`w-full ${
                darkMode ? 'bg-black border-white/10 text-cyan-400' : 'bg-white border-slate-200 text-cyan-805 font-bold'
              } border rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-cyan-500 transition-all cursor-pointer`}
            >
              {[3, 4, 5, 6, 7].map((m) => (
                <option key={m} value={m}>Order {m} (Max {m - 1} Keys)</option>
              ))}
            </select>
          </div>
        )}

        {/* Adversarial Scenarios Section */}
        <div className={`pt-3 pb-2 border-t ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
          <label className={`text-[10px] font-bold ${
            darkMode ? 'text-slate-550' : 'text-slate-450'
          } uppercase tracking-widest block mb-2 font-mono`}>
            Load Special Scenarios
          </label>
          <select
            defaultValue=""
            id="scenario_selector"
            onChange={(e) => {
              if (e.target.value) {
                onLoadScenario(e.target.value);
                // Reset select value to allow re-triggering
                e.target.value = "";
              }
            }}
            className={`w-full ${
              darkMode ? 'bg-black border-cyan-500/20 text-cyan-400' : 'bg-white border-slate-200 text-cyan-705 font-bold'
            } border rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-cyan-500 transition-all cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.05)]`}
          >
            <option value="" disabled hidden>-- Select Scenario... --</option>
            <option value="degenerate-bst">BST: Skewed Degenerate BST Chain</option>
            <option value="cascading-avl">AVL: Cascading Multi-level Rotations</option>
            <option value="rb-double-rotate">Red-Black: Double Rotation Fix</option>
            <option value="btree-split">B-Tree: Multi-level Split (Order 3)</option>
            <option value="heapify-bubble">Heap: Max Heap Bubble-Up</option>
            <option value="fib-consolidate">Fib Heap: Consolidate Roots Cascade</option>
          </select>
        </div>

        {/* Inputs Section */}
        <div className={`space-y-3 pt-4 border-t ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
          <label className={`text-[10px] font-bold ${
            darkMode ? 'text-slate-500' : 'text-slate-450'
          } uppercase tracking-widest block font-mono`}>
            Add / Remove Elements
          </label>

          <form onSubmit={handleFormSubmit} className="flex gap-2">
            <input
              type="text"
              value={singleInput}
              onChange={(e) => setSingleInput(e.target.value)}
              placeholder="e.g. 15, JAN, A"
              id="num_input"
              className={`flex-1 min-w-0 ${
                darkMode ? 'bg-black border-white/10 text-cyan-400 placeholder-slate-700' : 'bg-white border-slate-250 text-slate-850 placeholder-slate-400 font-bold'
              } border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all`}
            />
            <button
              type="submit"
              id="btn_insert"
              className="px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer select-none transition-colors shadow-[0_0_15px_rgba(8,145,178,0.25)]"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </form>

          <div className="flex gap-1.5">
            {/* Quick action buttons depending on structural parameters */}
            {currentType === 'fibonacci-heap' ? (
              <button
                onClick={onExtractMinFib}
                id="btn_extract_min_fib"
                className="flex-1 h-9 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer select-none transition-colors shadow-[0_0_15px_rgba(8,145,178,0.25)]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Extract Min</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  const cleanInput = singleInput.trim();
                  if (!cleanInput) {
                    alert('Input a target node key or a comma-separated list of keys above to delete.');
                    return;
                  }
                  const parts = cleanInput.split(',').map(s => s.trim()).filter(Boolean);
                  if (parts.length > 0) {
                    parts.forEach(part => {
                      const num = Number(part);
                      if (!isNaN(num) && part !== '') {
                        onDelete(num);
                      } else {
                        onDelete(part);
                      }
                    });
                    setSingleInput('');
                  }
                }}
                id="btn_delete animate"
                className={`flex-1 h-9 border ${
                  darkMode 
                    ? 'border-white/10 hover:border-rose-500/50 text-slate-400 hover:text-rose-400 hover:bg-rose-950/20' 
                    : 'border-slate-200 hover:border-rose-500 text-slate-600 hover:text-rose-600 hover:bg-rose-50 shadow-sm'
                } rounded-lg flex items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer transition-all`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Key</span>
              </button>
            )}

            <button
              onClick={onRandomInsert}
              id="btn_random"
              className={`h-9 px-3 border ${
                darkMode 
                  ? 'border-white/10 hover:bg-white/5 text-slate-400 hover:text-white' 
                  : 'border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 shadow-sm'
              } rounded-lg flex items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer transition-colors`}
              title="Add random number"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Random</span>
            </button>
          </div>
        </div>

        {/* Clear / Demo triggers */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClear}
            id="btn_clear"
            className={`w-full py-1.5 border ${
              darkMode 
                ? 'border-white/10 hover:bg-white/5 hover:border-white/20 text-slate-400 hover:text-slate-100' 
                : 'border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 shadow-sm'
            } rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-medium transition-colors cursor-pointer`}
          >
            <RefreshCw className="w-3 h-3" />
            <span>Clear Layout</span>
          </button>
        </div>

        {/* Technical complexity table inside card */}
        <div className={`pt-4 border-t ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
          <div className={`p-3 ${
            darkMode ? 'bg-black/40 border-white/5' : 'bg-slate-50 border-slate-200 shadow-sm'
          } rounded-xl border`}>
            <span className={`text-[9px] font-mono ${
              darkMode ? 'text-cyan-500' : 'text-cyan-600'
            } tracking-wider font-bold block uppercase mb-1`}>
              Active Parameters
            </span>
            <div className={`text-xs font-sans font-bold ${
              darkMode ? 'text-white' : 'text-slate-900'
            } mb-2`}>
              {currentType === 'b-tree' 
                ? `B-Tree (Order ${bTreeOrder})` 
                : currentType === 'b-plus-tree' 
                ? `B+ Tree (Order ${bTreeOrder})` 
                : currentMeta.title}
            </div>
            <p className={`text-[10px] ${
              darkMode ? 'text-slate-405' : 'text-slate-600'
            } leading-relaxed mb-3`}>
              {currentMeta.details}
            </p>

            <div className={`grid grid-cols-2 gap-2 text-[10px] font-mono border-t ${
              darkMode ? 'border-white/5' : 'border-slate-200/50'
            } pt-2`}>
              <div>
                <span className="text-slate-500 font-sans block text-[9px] uppercase tracking-tighter">Insert Complexity</span>
                <span className={`font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{currentMeta.insertTime}</span>
              </div>
              <div>
                <span className="text-slate-500 font-sans block text-[9px] uppercase tracking-tighter">Delete Complexity</span>
                <span className={`font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{currentMeta.deleteTime}</span>
              </div>
              <div className={`col-span-2 pt-1 border-t ${
                darkMode ? 'border-white/5' : 'border-slate-200/50'
              } mt-1`}>
                <span className="text-slate-500 font-sans block text-[9px] uppercase tracking-tighter">Worst-Case Memory</span>
                <span className={`font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{currentMeta.spaceComp}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

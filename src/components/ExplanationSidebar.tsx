import React from 'react';
import { AnimationStep, TreeType } from '../types';
import { BookOpen, Sparkles, HelpCircle } from 'lucide-react';
import { PseudocodeLinker } from './PseudocodeLinker';
import { computeTraversals } from '../utils/traversalHelper';

interface ExplanationSidebarProps {
  currentStepData: AnimationStep | null;
  allSteps: AnimationStep[];
  currentStepIndex: number;
  onStepSelect: (idx: number) => void;
  treeType: TreeType;
  darkMode: boolean;
}

export const ExplanationSidebar: React.FC<ExplanationSidebarProps> = ({
  currentStepData,
  allSteps,
  currentStepIndex,
  onStepSelect,
  treeType,
  darkMode,
}) => {
  // Compute preorder, inorder, postorder sequences dynamically based on current snap
  const traversals = currentStepData
    ? computeTraversals(currentStepData.structureSnapshot)
    : { preorder: 'N/A', inorder: 'N/A', postorder: 'N/A' };

  return (
    <div
      id="explanation_sidebar"
      className={`w-full ${
        darkMode ? 'bg-[#0d0d0d] text-slate-350' : 'bg-white text-slate-800'
      } flex flex-col h-full overflow-y-auto`}
    >
      {/* Sidebar Header */}
      <div className={`p-4 border-b ${
        darkMode ? 'border-white/10 bg-[#070707]' : 'border-slate-200 bg-slate-50'
      } flex items-center gap-2`}>
        <BookOpen className="w-4 h-4 text-cyan-500" />
        <span className={`text-[10px] font-bold ${
          darkMode ? 'text-slate-400' : 'text-slate-500'
        } uppercase tracking-widest font-mono`}>
          Technical Ledger
        </span>
      </div>

      {!currentStepData ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
          <HelpCircle className="w-8 h-8 text-neutral-450 mb-2 stroke-1" />
          <p className={`text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>No steps recorded yet</p>
          <p className="text-[10px] mt-0.5 leading-relaxed text-slate-500">
            Create operations such as inserts or deletions to record algorithmic steps
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between">
          {/* Active Step Content */}
          <div className="p-5 space-y-5">
            <div>
              <span className={`inline-block py-0.5 px-2 rounded-full text-[8.5px] font-bold font-mono tracking-wider ${
                darkMode ? 'bg-cyan-950/40 text-cyan-400 border-cyan-500/20' : 'bg-cyan-50 text-cyan-800 border-cyan-200'
              } border mb-2 uppercase`}>
                Active Operation Step
              </span>
              <h2 className={`text-sm font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'} tracking-tight leading-snug`}>
                {currentStepData.title}
              </h2>
            </div>

            {/* Explanation paragraph */}
            <div className={`${
              darkMode ? 'bg-black/40 border-white/5' : 'bg-slate-50 border-slate-200'
            } border rounded-xl p-4 shadow`}>
              <span className="text-[9px] font-bold text-cyan-500 uppercase font-mono tracking-wider mb-1 block">
                Operation Commentary
              </span>
              <p className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-655'} leading-relaxed font-sans`}>
                {currentStepData.explanation}
              </p>
            </div>

            {/* C Pseudocode algorithm line tracker */}
            <PseudocodeLinker treeType={treeType} currentStepData={currentStepData} darkMode={darkMode} />

            {/* Step Indicators Metadata */}
            <div className="space-y-2 pt-1">
              <span className={`text-[9px] font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'} uppercase font-mono tracking-wider block`}>
                State Variables
              </span>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div className={`p-2 border ${
                  darkMode ? 'border-white/5 bg-[#121212]/55' : 'border-slate-200 bg-slate-50/50'
                } rounded-lg`}>
                  <span className={`${darkMode ? 'text-slate-500' : 'text-slate-400'} block text-[9px]`}>Highlights</span>
                  <span className={`font-bold ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                    {currentStepData.highlightedNodeIds.length > 0
                      ? currentStepData.highlightedNodeIds.map(nid => nid.split('_')[1] || nid).join(', ')
                      : 'None'}
                  </span>
                </div>
                <div className={`p-2 border ${
                  darkMode ? 'border-white/5 bg-[#121212]/55' : 'border-slate-200 bg-slate-50/50'
                } rounded-lg`}>
                  <span className={`${darkMode ? 'text-slate-500' : 'text-slate-400'} block text-[9px]`}>Total Steps</span>
                  <span className={`font-bold ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                    {allSteps.length} Steps
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Horizontal / Vertical Ledger of all transaction sub-steps */}
          <div className={`border-t ${
            darkMode ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50/60'
          } p-4`}>
            <span className={`text-[9px] font-bold ${
              darkMode ? 'text-slate-450' : 'text-slate-500'
            } uppercase font-mono tracking-wider block mb-2.5`}>
              Sequence Log Ledger (Jump directly to step)
            </span>
            <div className="max-h-[200px] overflow-y-auto space-y-1.5 pr-1" id="ledger_list">
              {allSteps.map((step, idx) => {
                const isActive = idx === currentStepIndex;

                // Simple plain-English generator tailored to the specific step sequence behavior
                const getStepPlainEnglishDetail = (): string => {
                  const title = (step.title || '').toLowerCase();
                  const exp = (step.explanation || '').toLowerCase();

                  // Grab any digits from the explanation to inject contextual metrics
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
                    key={`step-ledger-${idx}`}
                    onClick={() => onStepSelect(idx)}
                    id={`btn_ledger_step_${idx}`}
                    className={`w-full p-2.5 rounded-lg border text-left transition-all flex flex-col gap-1.5 cursor-pointer select-none ${
                      isActive
                        ? darkMode
                          ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300 ring-1 ring-cyan-500/15 shadow-[0_0_15px_rgba(6,182,212,0.05)] font-medium'
                          : 'bg-cyan-50 border-cyan-300 text-cyan-900 ring-1 ring-cyan-500/5 shadow-[0_0_15px_rgba(6,182,212,0.05)] font-semibold'
                        : darkMode
                          ? 'bg-[#121212]/40 hover:bg-white/5 border-white/5 text-slate-405 hover:text-white'
                          : 'bg-white hover:bg-slate-100 border-slate-205 text-slate-600 hover:text-slate-900 shadow-sm'
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
                            darkMode ? 'text-slate-400' : 'text-slate-500'
                          }`}>
                            {step.explanation}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Smoothly transition active detail paragraph */}
                    {isActive && (
                      <div className={`mt-1 pl-7 pr-1 space-y-1 border-t ${
                        darkMode ? 'border-cyan-500/10' : 'border-cyan-200'
                      } pt-1.5 accordion-expand`}>
                        <span className="font-semibold text-[8px] text-cyan-500 uppercase tracking-widest block font-mono mb-0.5">
                          In-depth Behavior Analysis
                        </span>
                        <p className={`text-[10px] ${
                          darkMode ? 'text-slate-300' : 'text-slate-700'
                        } leading-normal font-sans antialiased text-left font-normal`}>
                          {getStepPlainEnglishDetail()}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Tree Traversals Section cleanly placed right below the logs */}
            <div className={`mt-4 p-3 rounded-xl border ${
              darkMode 
                ? 'bg-[#0f0f0f] border-white/5 text-slate-300 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]'
                : 'bg-white border-slate-200 text-slate-800 shadow-sm'
            }`} id="panel_tree_traversals">
              <div className="flex items-center gap-1.5 mb-2.5 border-b pb-1 border-slate-200/50 dark:border-white/5 select-none">
                <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                <span className={`text-[10px] font-bold ${
                  darkMode ? 'text-slate-400' : 'text-slate-550'
                } uppercase tracking-wider font-mono`}>
                  Tree Traversals
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
          </div>
        </div>
      )}
    </div>
  );
};


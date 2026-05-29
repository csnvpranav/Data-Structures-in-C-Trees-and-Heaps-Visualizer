export type TreeType =
  | 'binary-tree'
  | 'bst'
  | 'avl'
  | 'splay'
  | 'red-black'
  | 'b-tree'
  | 'b-plus-tree'
  | 'max-heap'
  | 'min-heap'
  | 'binary-heap'
  | 'fibonacci-heap';

export type KeyType = number | string;

export interface VisualNode {
  id: string;
  label: string; // Text shown inside node
  subLabel?: string; // Text shown beneath/above node (like balance factor, height, degree etc.)
  keys?: KeyType[]; // For B-tree/B+tree nodes
  x: number;
  y: number;
  colorType?: 'default' | 'highlight' | 'success' | 'danger' | 'warning' | 'red' | 'black' | 'scanning' | 'pivot';
  isLeaf?: boolean; // Special marker if needed
  linkToNextLeaf?: boolean; // For B+ tree leaf chains
  isRoot?: boolean; // Root flag to render subtle visual highlights
}

export interface VisualLink {
  fromId: string;
  toId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  colorType?: 'default' | 'accent' | 'dotted';
  directed?: boolean;
}

export interface AnimationStep {
  nodes: VisualNode[];
  links: VisualLink[];
  explanation: string;
  title: string;
  highlightedNodeIds: string[];
  activePaths?: string[]; // Traversal/rebalancing path node tracking references
  structureSnapshot: string; // JSON serialized string of the actual state for quick review
}

export interface TimelineState {
  steps: AnimationStep[];
  currentStepIndex: number;
  isPlaying: boolean;
  speed: number; // ms per step (e.g. 1000ms)
}

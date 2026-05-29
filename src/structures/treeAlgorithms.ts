import { VisualNode, VisualLink, AnimationStep, TreeType, KeyType } from '../types';

// Helper to compare keys (both numbers and strings)
export function compareKeys(a: KeyType, b: KeyType): number {
  if (a === b) return 0;
  const strA = String(a).trim();
  const strB = String(b).trim();
  const isANumeric = /^-?\d+(\.\d+)?$/.test(strA);
  const isBNumeric = /^-?\d+(\.\d+)?$/.test(strB);
  if (isANumeric && isBNumeric) {
    const numA = parseFloat(strA);
    const numB = parseFloat(strB);
    return numA - numB;
  }
  return strA.localeCompare(strB);
}

// Helper to generate a unique ID
let idCounter = 1;
export function getUniqueId(): string {
  return `node_${idCounter++}_${Date.now() % 1000}`;
}

// ----------------------------------------------------
// BINARY-STYLE TREE DATA STRUCTURE REPS
// ----------------------------------------------------

export interface BinaryNode {
  id: string;
  value: KeyType;
  left: BinaryNode | null;
  right: BinaryNode | null;
  height: number; // For AVL
  color: 'red' | 'black' | 'default'; // For RB Tree
  parent: BinaryNode | null; // useful for Splay / RB Tree
}

// Deep clone a binary tree node
export function cloneBinaryTree(node: BinaryNode | null, parent: BinaryNode | null = null): BinaryNode | null {
  if (!node) return null;
  const clone: BinaryNode = {
    id: node.id,
    value: node.value,
    left: null,
    right: null,
    height: node.height,
    color: node.color,
    parent: parent
  };
  clone.left = cloneBinaryTree(node.left, clone);
  clone.right = cloneBinaryTree(node.right, clone);
  return clone;
}

// Lay out a binary tree and return VisualNodes and VisualLinks
export function computeBinaryTreeLayout(
  root: BinaryNode | null,
  highlightIds: string[] = [],
  scanningId: string | null = null,
  pivotId: string | null = null,
  treeType: TreeType = 'bst'
): { nodes: VisualNode[]; links: VisualLink[] } {
  const nodes: VisualNode[] = [];
  const links: VisualLink[] = [];

  if (!root) return { nodes, links };

  // Calculate size of each subtree in terms of horizontal span
  // Sibling spacing will shrink at deeper levels to avoid overlap
  const positionNode = (
    node: BinaryNode,
    x: number,
    y: number,
    depth: number,
    horizontalShift: number
  ) => {
    let colorType: VisualNode['colorType'] = 'default';
    if (treeType === 'red-black') {
      colorType = node.color === 'red' ? 'red' : 'black';
    }

    if (node.id === scanningId) {
      colorType = 'scanning';
    } else if (node.id === pivotId) {
      colorType = 'pivot';
    } else if (highlightIds.includes(node.id)) {
      colorType = 'success';
    }

    // Attach custom balance factors/metadata for presentation
    let subLabel = '';
    if (treeType === 'avl') {
      const bFactor = getBalanceFactor(node);
      subLabel = `H:${node.height} BF:${bFactor}`;
    } else if (treeType === 'red-black') {
      subLabel = node.color.toUpperCase();
    }

    nodes.push({
      id: node.id,
      label: node.value.toString(),
      subLabel,
      x,
      y,
      colorType,
      isRoot: depth === 0,
    });

    const nextShift = horizontalShift / 1.7; // shrink spacing per level
    const childY = y + 75;

    if (node.left) {
      const childX = x - horizontalShift;
      links.push({
        fromId: node.id,
        toId: node.left.id,
        fromX: x,
        fromY: y,
        toX: childX,
        toY: childY,
      });
      positionNode(node.left, childX, childY, depth + 1, nextShift);
    }

    if (node.right) {
      const childX = x + horizontalShift;
      links.push({
        fromId: node.id,
        toId: node.right.id,
        fromX: x,
        fromY: y,
        toX: childX,
        toY: childY,
      });
      positionNode(node.right, childX, childY, depth + 1, nextShift);
    }
  };

  // Start in the horizontal center
  positionNode(root, 400, 60, 0, 160);
  return { nodes, links };
}

// AVL Tree specific helpers
function getHeight(node: BinaryNode | null): number {
  return node ? node.height : 0;
}

function getBalanceFactor(node: BinaryNode | null): number {
  return node ? getHeight(node.left) - getHeight(node.right) : 0;
}

function updateHeight(node: BinaryNode) {
  node.height = 1 + Math.max(getHeight(node.left), getHeight(node.right));
}

// ----------------------------------------------------
// B-TREE & B+ TREE REPS
// ----------------------------------------------------

export interface BNode {
  id: string;
  keys: KeyType[];
  children: BNode[];
  isLeaf: boolean;
  nextLeaf?: BNode | null; // Only for B+ Tree leaf chain
}

export function cloneBTree(node: BNode | null): BNode | null {
  if (!node) return null;
  const clone: BNode = {
    id: node.id,
    keys: [...node.keys],
    children: [],
    isLeaf: node.isLeaf,
    nextLeaf: null,
  };
  for (const child of node.children) {
    clone.children.push(cloneBTree(child)!);
  }
  return clone;
}

// Post-process leaves of cloned B+ tree to rewire sibling pointers
export function rewireBPlusTreeLeaves(clonedRoot: BNode | null): BNode | null {
  if (!clonedRoot) return null;
  const leafList: BNode[] = [];
  const traverse = (n: BNode) => {
    if (n.isLeaf) {
      leafList.push(n);
    } else {
      for (const child of n.children) {
        traverse(child);
      }
    }
  };
  traverse(clonedRoot);
  for (let i = 0; i < leafList.length - 1; i++) {
    leafList[i].nextLeaf = leafList[i + 1];
  }
  if (leafList.length > 0) {
    leafList[leafList.length - 1].nextLeaf = null;
  }
  return clonedRoot;
}

// Generate layouts for Multi-Way Trees (B-Tree and B+ Tree)
export function computeBTreeLayout(
  root: BNode | null,
  highlightIds: string[] = [],
  treeType: TreeType = 'b-tree'
): { nodes: VisualNode[]; links: VisualLink[] } {
  const nodes: VisualNode[] = [];
  const links: VisualLink[] = [];

  if (!root) return { nodes, links };

  // Group nodes by depth to calculate level horizontal layouts gracefully and avoid overlaps
  const nodesByDepth: BNode[][] = [];
  const collectByDepth = (node: BNode, depth: number) => {
    if (!nodesByDepth[depth]) {
      nodesByDepth[depth] = [];
    }
    nodesByDepth[depth].push(node);
    for (const child of node.children) {
      collectByDepth(child, depth + 1);
    }
  };
  collectByDepth(root, 0);

  const verticalSpacing = 95;
  const nodeHorizontalWidth = 110;
  const nodeMap = new Map<string, { x: number; y: number }>();

  // Place nodes on a grid level-by-level
  nodesByDepth.forEach((levelNodes, depth) => {
    const totalLevelWidth = (levelNodes.length - 1) * (nodeHorizontalWidth + 35);
    const startX = 400 - totalLevelWidth / 2;
    const y = 60 + depth * verticalSpacing;

    levelNodes.forEach((node, idx) => {
      const x = startX + idx * (nodeHorizontalWidth + 35);
      nodeMap.set(node.id, { x, y });

      const isNodeHighlighted = highlightIds.includes(node.id);

      nodes.push({
        id: node.id,
        label: node.keys.join(', '),
        keys: node.keys,
        x,
        y,
        colorType: isNodeHighlighted ? 'success' : 'default',
        isLeaf: node.isLeaf,
        isRoot: depth === 0,
      });
    });
  });

  // Now create the linkage links
  const drawLinks = (node: BNode) => {
    const fromPos = nodeMap.get(node.id);
    if (!fromPos) return;

    if (!node.isLeaf && node.children.length > 0) {
      node.children.forEach((child, childIdx) => {
        const toPos = nodeMap.get(child.id);
        if (toPos) {
          links.push({
            fromId: node.id,
            toId: child.id,
            fromX: fromPos.x,
            fromY: fromPos.y + 12,
            toX: toPos.x,
            toY: toPos.y - 12,
          });
        }
        drawLinks(child);
      });
    }

    // Connect leaves if B+ tree
    if (treeType === 'b-plus-tree' && node.isLeaf && node.nextLeaf) {
      const toPos = nodeMap.get(node.nextLeaf.id);
      if (toPos) {
        links.push({
          fromId: node.id,
          toId: node.nextLeaf.id,
          fromX: fromPos.x + 35,
          fromY: fromPos.y,
          toX: toPos.x - 35,
          toY: toPos.y,
          colorType: 'dotted', // leaf forward link representations
        });
      }
    }
  };

  drawLinks(root);
  return { nodes, links };
}

// ----------------------------------------------------
// FIBONACCI HEAP REPRESENTATION
// ----------------------------------------------------

export interface FibNode {
  id: string;
  value: KeyType;
  degree: number;
  marked: boolean;
  parent: FibNode | null;
  children: FibNode[];
  left: FibNode; // doubly linked sibling pointers
  right: FibNode;
}

export function cloneFibonacciHeap(roots: FibNode[]): FibNode[] {
  const map = new Map<string, FibNode>();

  // Deep clone structural elements recursively
  const cloneSingle = (n: FibNode): FibNode => {
    const clone: FibNode = {
      id: n.id,
      value: n.value,
      degree: n.degree,
      marked: n.marked,
      parent: null,
      children: [],
      left: null as any,
      right: null as any,
    };
    map.set(n.id, clone);

    clone.children = n.children.map((child) => {
      const childClone = cloneSingle(child);
      childClone.parent = clone;
      return childClone;
    });

    return clone;
  };

  const clonedRoots = roots.map((root) => cloneSingle(root));

  // Wire back doubly linked list pointers
  const wireSiblings = (nodes: FibNode[]) => {
    for (let i = 0; i < nodes.length; i++) {
      const leftIdx = i === 0 ? nodes.length - 1 : i - 1;
      const rightIdx = i === nodes.length - 1 ? 0 : i + 1;
      nodes[i].left = nodes[leftIdx];
      nodes[i].right = nodes[rightIdx];

      if (nodes[i].children.length > 0) {
        wireSiblings(nodes[i].children);
      }
    }
  };

  if (clonedRoots.length > 0) {
    wireSiblings(clonedRoots);
  }

  return clonedRoots;
}

// Compute Fibonacci Heap graphical coordinates
export function computeFibonacciHeapLayout(
  roots: FibNode[],
  highlightIds: string[] = []
): { nodes: VisualNode[]; links: VisualLink[] } {
  const nodes: VisualNode[] = [];
  const links: VisualLink[] = [];

  if (roots.length === 0) return { nodes, links };

  const startY = 70;
  const rootSpacingX = 145;

  // Let's place roots horizontally side by side
  // And their children recursively downwards
  const layoutTree = (node: FibNode, x: number, y: number, siblingSpread: number) => {
    const isHighlighted = highlightIds.includes(node.id);

    nodes.push({
      id: node.id,
      label: node.value.toString(),
      subLabel: `Deg:${node.degree}${node.marked ? ' M' : ''}`,
      x,
      y,
      colorType: isHighlighted ? 'success' : 'default',
    });

    const childY = y + 70;
    const numKids = node.children.length;
    if (numKids > 0) {
      const kidSpread = siblingSpread * 0.7;
      const totalSpread = (numKids - 1) * kidSpread;
      const startKidX = x - totalSpread / 2;

      node.children.forEach((child, idx) => {
        const kidX = startKidX + idx * kidSpread;
        links.push({
          fromId: node.id,
          toId: child.id,
          fromX: x,
          fromY: y,
          toX: kidX,
          toY: childY,
        });
        layoutTree(child, kidX, childY, kidSpread * 0.7);
      });
    }
  };

  // Layout all roots along a dynamic horizontal line
  const totalRootsSpacing = (roots.length - 1) * rootSpacingX;
  const startRootsX = 400 - totalRootsSpacing / 2;

  roots.forEach((root, idx) => {
    const rx = startRootsX + idx * rootSpacingX;
    layoutTree(root, rx, startY, 90);

    // Also draw link to next root in root list to visually represent the doubly-linked root circle list
    const nextRoot = roots[(idx + 1) % roots.length];
    const nrx = startRootsX + ((idx + 1) % roots.length) * rootSpacingX;
    links.push({
      fromId: root.id,
      toId: nextRoot.id,
      fromX: rx + 15,
      fromY: startY - 15,
      toX: nrx - 15,
      toY: startY - 15,
      colorType: 'dotted', // represents horizontal ring sibling chains
    });
  });

  return { nodes, links };
}

// ----------------------------------------------------
// MAX, MIN AND BINARY HEAPS VISUALIZATION
// ----------------------------------------------------

export function computeHeapLayout(
  heapArray: KeyType[],
  highlightIndex: number | null = null,
  swapIndices: [number, number] | null = null
): { nodes: VisualNode[]; links: VisualLink[] } {
  const nodes: VisualNode[] = [];
  const links: VisualLink[] = [];

  if (heapArray.length === 0) return { nodes, links };

  // Calculate standard Complete Binary Tree mapping
  const getSubtreeWidth = (depth: number) => {
    return 180 / Math.pow(1.6, depth);
  };

  const getPosition = (idx: number, depth: number, parentX: number): number => {
    // Left or right child horizontal adjustment
    const offset = getSubtreeWidth(depth);
    const isLeft = idx % 2 === 1;
    return isLeft ? parentX - offset : parentX + offset;
  };

  // Node position cache
  const posMap = new Map<number, { x: number; y: number }>();

  // Process root
  posMap.set(0, { x: 400, y: 60 });

  // Process rest sequentially to map accurate parent links
  for (let i = 0; i < heapArray.length; i++) {
    const currentVal = heapArray[i];
    let pos = posMap.get(i);
    if (!pos) {
      const parentIdx = Math.floor((i - 1) / 2);
      const parentPos = posMap.get(parentIdx)!;
      const depth = Math.floor(Math.log2(i + 1));
      const x = getPosition(i, depth, parentPos.x);
      const y = 60 + depth * 75;
      pos = { x, y };
      posMap.set(i, pos);

      // Add parent linkage
      links.push({
        fromId: `heap_${parentIdx}`,
        toId: `heap_${i}`,
        fromX: parentPos.x,
        fromY: parentPos.y,
        toX: x,
        toY: y,
      });
    }

    let colorType: VisualNode['colorType'] = 'default';
    if (i === highlightIndex) {
      colorType = 'scanning';
    } else if (swapIndices && swapIndices.includes(i)) {
      colorType = 'pivot';
    }

    nodes.push({
      id: `heap_${i}`,
      label: currentVal.toString(),
      subLabel: `idx:${i}`,
      x: pos.x,
      y: pos.y,
      colorType,
      isRoot: i === 0,
    });
  }

  return { nodes, links };
}

// ----------------------------------------------------
// SEQUENTIAL STEP GENERATOR ENGINE
// ----------------------------------------------------

export class VisualizerEngine {
  steps: AnimationStep[] = [];
  treeType: TreeType;
  public bTreeOrder: number = 3;

  // Active pointer structures
  binaryRoot: BinaryNode | null = null;
  bTreeRoot: BNode | null = null;
  bPlusTreeRoot: BNode | null = null;
  heapArray: KeyType[] = [];
  fibRoots: FibNode[] = [];

  constructor(treeType: TreeType) {
    this.treeType = treeType;
  }

  private findBinaryNodeById(root: BinaryNode | null, id: string): BinaryNode | null {
    if (!root) return null;
    if (root.id === id) return root;
    return this.findBinaryNodeById(root.left, id) || this.findBinaryNodeById(root.right, id);
  }

  private pushStep(title: string, explanation: string, config: { 
    highlightIds?: string[], 
    scanningId?: string | null, 
    pivotId?: string | null, 
    heapHighlight?: number | null, 
    heapSwap?: [number, number] | null,
    activePaths?: string[]
  } = {}) {
    let nodes: VisualNode[] = [];
    let links: VisualLink[] = [];

    const highlightIds = config.highlightIds || [];
    const scanningId = config.scanningId || null;
    const pivotId = config.pivotId || null;

    if (
      this.treeType === 'binary-tree' ||
      this.treeType === 'bst' ||
      this.treeType === 'avl' ||
      this.treeType === 'splay' ||
      this.treeType === 'red-black'
    ) {
      const res = computeBinaryTreeLayout(this.binaryRoot, highlightIds, scanningId, pivotId, this.treeType);
      nodes = res.nodes;
      links = res.links;
    } else if (this.treeType === 'b-tree') {
      const res = computeBTreeLayout(this.bTreeRoot, highlightIds, this.treeType);
      nodes = res.nodes;
      links = res.links;
    } else if (this.treeType === 'b-plus-tree') {
      const res = computeBTreeLayout(this.bPlusTreeRoot, highlightIds, this.treeType);
      nodes = res.nodes;
      links = res.links;
    } else if (
      this.treeType === 'max-heap' ||
      this.treeType === 'min-heap' ||
      this.treeType === 'binary-heap'
    ) {
      const res = computeHeapLayout(this.heapArray, config.heapHighlight, config.heapSwap);
      nodes = res.nodes;
      links = res.links;
    } else if (this.treeType === 'fibonacci-heap') {
      const res = computeFibonacciHeapLayout(this.fibRoots, highlightIds);
      nodes = res.nodes;
      links = res.links;
    }

    // High fidelity active path reconstruction mapping
    let computedActivePaths: string[] = config.activePaths || [];

    if (computedActivePaths.length === 0) {
      if (
        this.treeType === 'binary-tree' ||
        this.treeType === 'bst' ||
        this.treeType === 'avl' ||
        this.treeType === 'splay' ||
        this.treeType === 'red-black'
      ) {
        const findBinaryNodeRootPath = (n: BinaryNode | null, targetId: string, currentPath: string[] = []): string[] | null => {
          if (!n) return null;
          const path = [...currentPath, n.id];
          if (n.id === targetId) return path;
          const leftPath = findBinaryNodeRootPath(n.left, targetId, path);
          if (leftPath) return leftPath;
          return findBinaryNodeRootPath(n.right, targetId, path);
        };

        if (scanningId) {
          const path = findBinaryNodeRootPath(this.binaryRoot, scanningId);
          if (path) computedActivePaths = path;
        } else if (pivotId) {
          const path = findBinaryNodeRootPath(this.binaryRoot, pivotId);
          if (path) {
            computedActivePaths = path;
            const pivotNode = this.findBinaryNodeById(this.binaryRoot, pivotId);
            if (pivotNode) {
              if (pivotNode.left) computedActivePaths.push(pivotNode.left.id);
              if (pivotNode.right) computedActivePaths.push(pivotNode.right.id);
            }
          }
        } else if (highlightIds.length > 0) {
          const path = findBinaryNodeRootPath(this.binaryRoot, highlightIds[0]);
          if (path) {
            computedActivePaths = path;
            for (const hId of highlightIds) {
              if (!computedActivePaths.includes(hId)) {
                computedActivePaths.push(hId);
              }
            }
          } else {
            computedActivePaths = [...highlightIds];
          }
        }
      } else if (this.treeType === 'b-tree' || this.treeType === 'b-plus-tree') {
        const findBNodeRootPath = (n: BNode | null, targetId: string, currentPath: string[] = []): string[] | null => {
          if (!n) return null;
          const path = [...currentPath, n.id];
          if (n.id === targetId) return path;
          if (n.children) {
            for (const child of n.children) {
              const p = findBNodeRootPath(child, targetId, path);
              if (p) return p;
            }
          }
          return null;
        };

        const activeRoot = this.treeType === 'b-tree' ? this.bTreeRoot : this.bPlusTreeRoot;
        if (scanningId) {
          const path = findBNodeRootPath(activeRoot, scanningId);
          if (path) computedActivePaths = path;
        } else if (highlightIds.length > 0) {
          const path = findBNodeRootPath(activeRoot, highlightIds[0]);
          if (path) {
            computedActivePaths = path;
            for (const hId of highlightIds) {
              if (!computedActivePaths.includes(hId)) {
                computedActivePaths.push(hId);
              }
            }
          } else {
            computedActivePaths = [...highlightIds];
          }
        }
      } else if (
        this.treeType === 'max-heap' ||
        this.treeType === 'min-heap' ||
        this.treeType === 'binary-heap'
      ) {
        const getHeapPathToIndex = (idx: number): string[] => {
          const path: string[] = [];
          let current = idx;
          while (current >= 0 && current < this.heapArray.length) {
            path.unshift(`heap_${current}`);
            if (current === 0) break;
            current = Math.floor((current - 1) / 2);
          }
          return path;
        };

        if (config.heapHighlight !== undefined && config.heapHighlight !== null) {
          computedActivePaths = getHeapPathToIndex(config.heapHighlight);
        } else if (config.heapSwap) {
          const [idxA, idxB] = config.heapSwap;
          const pathA = getHeapPathToIndex(idxA);
          const pathB = getHeapPathToIndex(idxB);
          computedActivePaths = Array.from(new Set([...pathA, ...pathB]));
        }
      } else if (this.treeType === 'fibonacci-heap') {
        const findFibNodeRootPath = (roots: FibNode[], targetId: string, currentPath: string[] = []): string[] | null => {
          const findInNode = (node: FibNode, targetId: string, path: string[]): string[] | null => {
            const newPath = [...path, node.id];
            if (node.id === targetId) return newPath;
            for (const child of node.children) {
              const p = findInNode(child, targetId, newPath);
              if (p) return p;
            }
            return null;
          };
          for (const r of roots) {
            const p = findInNode(r, targetId, currentPath);
            if (p) return p;
          }
          return null;
        };

        if (highlightIds.length > 0) {
          const path = findFibNodeRootPath(this.fibRoots, highlightIds[0]);
          if (path) {
            computedActivePaths = path;
            for (const hId of highlightIds) {
              if (!computedActivePaths.includes(hId)) {
                computedActivePaths.push(hId);
              }
            }
          } else {
            computedActivePaths = [...highlightIds];
          }
        }
      }
    }

    this.steps.push({
      title,
      explanation,
      nodes,
      links,
      highlightedNodeIds: highlightIds,
      activePaths: computedActivePaths,
      structureSnapshot: this.serializeCurrentState(),
    });
  }

  private serializeCurrentState(): string {
    if (this.binaryRoot) {
      // Remove parents recursive loop reference for JSON safety
      const getLightTree = (n: BinaryNode | null): any => {
        if (!n) return null;
        return {
          id: n.id,
          value: n.value,
          height: n.height,
          color: n.color,
          left: getLightTree(n.left),
          right: getLightTree(n.right),
        };
      };
      return JSON.stringify({ type: 'binary', root: getLightTree(this.binaryRoot) });
    }
    if (this.bTreeRoot) {
      return JSON.stringify({ type: 'b-tree', root: this.bTreeRoot });
    }
    if (this.bPlusTreeRoot) {
      return JSON.stringify({ type: 'b-plus-tree', root: this.bPlusTreeRoot });
    }
    if (this.heapArray.length > 0) {
      return JSON.stringify({ type: 'heap', array: this.heapArray });
    }
    if (this.fibRoots.length > 0) {
      const getLightFib = (roots: FibNode[]): any[] => {
        return roots.map((r) => ({
          value: r.value,
          degree: r.degree,
          marked: r.marked,
          children: getLightFib(r.children),
        }));
      };
      return JSON.stringify({ type: 'fibonacci', roots: getLightFib(this.fibRoots) });
    }
    return '';
  }

  // Reload internal structure pointers from a step snapshot to support quick timelines scrubbing
  public loadStateFromSnapshot(snapshotStr: string) {
    if (!snapshotStr) {
      this.binaryRoot = null;
      this.bTreeRoot = null;
      this.bPlusTreeRoot = null;
      this.heapArray = [];
      this.fibRoots = [];
      return;
    }

    try {
      const obj = JSON.parse(snapshotStr);
      if (obj.type === 'binary') {
        const buildWithParents = (n: any, parent: BinaryNode | null = null): BinaryNode | null => {
          if (!n) return null;
          const node: BinaryNode = {
            id: n.id,
            value: n.value,
            height: n.height,
            color: n.color,
            left: null,
            right: null,
            parent: parent,
          };
          node.left = buildWithParents(n.left, node);
          node.right = buildWithParents(n.right, node);
          return node;
        };
        this.binaryRoot = buildWithParents(obj.root);
      } else if (obj.type === 'b-tree') {
        this.bTreeRoot = obj.root;
      } else if (obj.type === 'b-plus-tree') {
        this.bPlusTreeRoot = rewireBPlusTreeLeaves(obj.root);
      } else if (obj.type === 'heap') {
        this.heapArray = obj.array;
      } else if (obj.type === 'fibonacci') {
        const buildFib = (list: any[], parent: FibNode | null = null): FibNode[] => {
          const nodes: FibNode[] = list.map((item) => {
            const node: FibNode = {
              id: getUniqueId(),
              value: item.value,
              degree: item.degree,
              marked: item.marked,
              parent,
              children: [],
              left: null as any,
              right: null as any,
            };
            node.children = buildFib(item.children || [], node);
            return node;
          });
          // link doubly list circularly
          for (let i = 0; i < nodes.length; i++) {
            nodes[i].left = nodes[i === 0 ? nodes.length - 1 : i - 1];
            nodes[i].right = nodes[i === nodes.length - 1 ? 0 : i + 1];
          }
          return nodes;
        };
        this.fibRoots = buildFib(obj.roots);
      }
    } catch (e) {
      console.error('Error parsing snapshot', e);
    }
  }

  // Initialize data structures with pre-set structures
  public initializeWithDefaultData() {
    this.steps = [];
    idCounter = 1;

    if (this.treeType === 'binary-tree') {
      // Build a simple balanced levels tree
      this.binaryRoot = { id: getUniqueId(), value: 40, left: null, right: null, height: 1, color: 'default', parent: null };
      this.binaryRoot.left = { id: getUniqueId(), value: 20, left: null, right: null, height: 1, color: 'default', parent: this.binaryRoot };
      this.binaryRoot.right = { id: getUniqueId(), value: 60, left: null, right: null, height: 1, color: 'default', parent: this.binaryRoot };
      this.pushStep('Default Binary Tree Loaded', 'Standard sequential node mapping shown.');
    } else if (this.treeType === 'bst' || this.treeType === 'avl' || this.treeType === 'splay' || this.treeType === 'red-black') {
      const vals = [25, 15, 40, 10, 22];
      for (const v of vals) {
        this.insertBinaryValueImmediate(v);
      }
      this.steps = []; // clear build steps, show final balance
      this.pushStep(`Default ${this.treeType.toUpperCase()} Loaded`, `Successfully bootstrapped structural parameters with starting elements: ${vals.join(', ')}.`);
    } else if (this.treeType === 'b-tree' || this.treeType === 'b-plus-tree') {
      const keys = [10, 20, 30, 40, 50];
      for (const k of keys) {
        this.insertBTreeImmediate(k);
      }
      this.steps = [];
      this.pushStep('Default Multi-Way Tree Loaded', `Successfully initialized sequence: ${keys.join(', ')}`);
    } else if (this.treeType === 'max-heap' || this.treeType === 'min-heap' || this.treeType === 'binary-heap') {
      this.heapArray = [50, 35, 42, 20, 14, 25];
      if (this.treeType === 'min-heap') {
        this.heapArray = [10, 25, 18, 40, 50, 32];
      }
      this.pushStep('Default Binary Heap Loaded', 'Continuous linear array indexed representation and corresponding visual tree output.');
    } else if (this.treeType === 'fibonacci-heap') {
      const sampleVals = [8, 15, 23, 30, 5];
      for (const v of sampleVals) {
        this.insertFibonacciImmediate(v);
      }
      this.steps = [];
      this.pushStep('Default Fibonacci Heap Loaded', `Fibers generated circularly under distinct min root pointers: ${sampleVals.join(', ')}.`);
    }
  }

  // ----------------------------------------------------
  // INSERTION ACTIONS
  // ----------------------------------------------------

  public runInsert(value: KeyType) {
    this.steps = []; // Reset steps container

    if (this.treeType === 'bst') {
      this.insertBST(value);
    } else if (this.treeType === 'avl') {
      this.insertAVL(value);
    } else if (this.treeType === 'splay') {
      this.insertSplay(value);
    } else if (this.treeType === 'red-black') {
      this.insertRedBlack(value);
    } else if (this.treeType === 'binary-tree') {
      this.insertBinaryTreeComplete(value);
    } else if (this.treeType === 'b-tree' || this.treeType === 'b-plus-tree') {
      this.insertBTreeAnimation(value);
    } else if (this.treeType === 'max-heap') {
      this.insertMaxHeapAnimation(value);
    } else if (this.treeType === 'min-heap' || this.treeType === 'binary-heap') {
      this.insertMinHeapAnimation(value);
    } else if (this.treeType === 'fibonacci-heap') {
      this.insertFibonacciAnimation(value);
    }
  }

  // ----------------------------------------------------
  // DELETION ACTIONS
  // ----------------------------------------------------

  public runDelete(value: KeyType) {
    this.steps = [];

    if (this.treeType === 'bst') {
      this.deleteBST(value);
    } else if (this.treeType === 'avl') {
      this.deleteAVL(value);
    } else if (this.treeType === 'splay') {
      this.deleteSplay(value);
    } else if (this.treeType === 'red-black') {
      this.deleteRedBlack(value);
    } else if (this.treeType === 'binary-tree') {
      this.deleteBinaryTreeComplete(value);
    } else if (this.treeType === 'b-tree' || this.treeType === 'b-plus-tree') {
      this.deleteBTreeAnimation(value);
    } else if (this.treeType === 'max-heap') {
      this.deleteMaxHeapAnimation(value);
    } else if (this.treeType === 'min-heap' || this.treeType === 'binary-heap') {
      this.deleteMinHeapAnimation(value);
    } else if (this.treeType === 'fibonacci-heap') {
      this.deleteMinFibonacciAnimation();
    }
  }

  // 1. BINARY SEARCH TREE (BST)
  private insertBST(value: KeyType) {
    if (!this.binaryRoot) {
      this.binaryRoot = { id: getUniqueId(), value, left: null, right: null, height: 1, color: 'default', parent: null };
      this.pushStep(`Inserted ${value} as root`, `The tree was empty. We initialized the root node containing ${value}.`, { highlightIds: [this.binaryRoot.id] });
      return;
    }

    let current: BinaryNode | null = this.binaryRoot;
    let parentNode: BinaryNode | null = null;
    const path: string[] = [];

    this.pushStep(`Inserting ${value}: Begin traversal`, `Starting search traversal path down from the root ${current.value}.`, { scanningId: current.id });

    while (current) {
      parentNode = current;
      path.push(current.id);
      const comp = compareKeys(value, current.value);
      if (comp < 0) {
        this.pushStep(`Insert ${value}: Go left`, `${value} < ${current.value}. Navigating to left subtree of node ${current.value}.`, { scanningId: current.id, highlightIds: [...path] });
        current = current.left;
      } else if (comp > 0) {
        this.pushStep(`Insert ${value}: Go right`, `${value} > ${current.value}. Navigating to right subtree of node ${current.value}.`, { scanningId: current.id, highlightIds: [...path] });
        current = current.right;
      } else {
        this.pushStep(`Value ${value} already exists`, `Binary search trees usually do not allow duplicate keys. Aborting operation.`, { highlightIds: [current.id] });
        return;
      }
    }

    const newNode: BinaryNode = { id: getUniqueId(), value, left: null, right: null, height: 1, color: 'default', parent: parentNode };
    if (compareKeys(value, parentNode!.value) < 0) {
      parentNode!.left = newNode;
    } else {
      parentNode!.right = newNode;
    }

    this.pushStep(`Inserted node ${value}`, `Linked new node ${value} under parent node ${parentNode!.value}.`, { highlightIds: [newNode.id] });
  }

  // BST Deletion
  private deleteBST(value: KeyType) {
    if (!this.binaryRoot) {
      this.pushStep('Delete Failed', 'The tree is completely empty.', {});
      return;
    }

    let current: BinaryNode | null = this.binaryRoot;
    let parentNode: BinaryNode | null = null;
    const path: string[] = [];

    // Traverse to locate the target node
    this.pushStep(`Delete ${value}: Search node`, `Starting navigation from the root node (${current.value}) to find ${value}.`, { scanningId: current.id });

    while (current && compareKeys(value, current.value) !== 0) {
      parentNode = current;
      path.push(current.id);
      if (compareKeys(value, current.value) < 0) {
        current = current.left;
      } else {
        current = current.right;
      }
      if (current) {
        this.pushStep(`Searching for ${value}`, `Continuing traversal. Visiting node ${current.value}.`, { scanningId: current.id, highlightIds: [...path] });
      }
    }

    if (!current) {
      this.pushStep(`Delete ${value} failed`, `Value ${value} is not represented inside this BST.`, {});
      return;
    }

    this.pushStep(`Located Node ${value}`, `Node found. Determining binary tree deletion case.`, { highlightIds: [current.id] });

    // Case 1 & 2: Leaf or Single Child
    if (!current.left || !current.right) {
      const child = current.left ? current.left : current.right;
      if (child) {
        child.parent = parentNode;
      }

      if (!parentNode) {
        this.binaryRoot = child;
        this.pushStep(`Replacing root`, `Target was root. Spliced it and promoted sole child to new root.`, {});
      } else {
        if (parentNode.left === current) {
          parentNode.left = child;
        } else {
          parentNode.right = child;
        }
        this.pushStep(`Spliced child`, `Target deleted. Linked its parent directly to its lone child.`, { highlightIds: parentNode ? [parentNode.id] : [] });
      }
    } else {
      // Case 3: Two Children (Replace with In-order Successor)
      this.pushStep('Two Children Case', 'The node has 2 children. We must locate the In-order Successor (smallest node in the right subtree) to swap values.', { scanningId: current.id });

      let successorParent: BinaryNode = current;
      let successor: BinaryNode = current.right;
      const succPath = [current.id];

      while (successor.left) {
        successorParent = successor;
        succPath.push(successor.id);
        successor = successor.left;
        this.pushStep('Finding In-order Successor', `Searching left child: visiting ${successor.value}.`, { scanningId: successor.id, highlightIds: [...succPath] });
      }

      const successorVal = successor.value;
      const successorId = successor.id;

      this.pushStep('Successor Found', `Minimum node in right subtree is ${successorVal}. Splitting successor node out.`, { highlightIds: [successorId] });

      // Splay or delete successor from right subtree
      if (successorParent.left === successor) {
        successorParent.left = successor.right;
        if (successor.right) successor.right.parent = successorParent;
      } else {
        successorParent.right = successor.right;
        if (successor.right) successor.right.parent = successorParent;
      }

      // Overwrite current node value with successor key
      current.value = successorVal;
      this.pushStep('Value Swapped', `Replaced value of original target node with successor value (${successorVal}) and garbage collected successor leaf.`, { highlightIds: [current.id] });
    }
  }

  // Helper immediate operations
  private insertBinaryValueImmediate(value: KeyType) {
    if (!this.binaryRoot) {
      this.binaryRoot = { id: getUniqueId(), value, left: null, right: null, height: 1, color: 'default', parent: null };
      return;
    }
    let current = this.binaryRoot;
    while (true) {
      const comp = compareKeys(value, current.value);
      if (comp < 0) {
        if (!current.left) {
          current.left = { id: getUniqueId(), value, left: null, right: null, height: 1, color: 'default', parent: current };
          break;
        }
        current = current.left;
      } else if (comp > 0) {
        if (!current.right) {
          current.right = { id: getUniqueId(), value, left: null, right: null, height: 1, color: 'default', parent: current };
          break;
        }
        current = current.right;
      } else {
        break; // Ignore duplicates
      }
    }
    // recalculate heights up
    this.recomputeHeights(this.binaryRoot);
  }

  private recomputeHeights(node: BinaryNode | null) {
    if (!node) return;
    this.recomputeHeights(node.left);
    this.recomputeHeights(node.right);
    updateHeight(node);
  }

  // 2. AVL TREE
  private insertAVL(value: KeyType) {
    this.pushStep(`Insert ${value}`, `Initiating AVL search and rebalance pipeline for ${value}.`);

    const insertHelper = (node: BinaryNode | null, parent: BinaryNode | null): BinaryNode => {
      if (!node) {
        const leaf: BinaryNode = { id: getUniqueId(), value, left: null, right: null, height: 1, color: 'default', parent };
        this.pushStep(`Created node ${value}`, `Created and attached a new AVL leaf node.`, { highlightIds: [leaf.id] });
        return leaf;
      }

      const comp = compareKeys(value, node.value);
      if (comp < 0) {
        this.pushStep(`Go Left`, `${value} < ${node.value}. Navigating left child.`, { scanningId: node.id });
        node.left = insertHelper(node.left, node);
      } else if (comp > 0) {
        this.pushStep(`Go Right`, `${value} > ${node.value}. Navigating right child.`, { scanningId: node.id });
        node.right = insertHelper(node.right, node);
      } else {
        this.pushStep('Duplicate Key', `The value ${value} already exists inside this tree. Skipping...`);
        return node;
      }

      updateHeight(node);
      const balance = getBalanceFactor(node);

      // LL Case
      if (balance > 1 && compareKeys(value, node.left!.value) < 0) {
        this.pushStep(`Left-Left Unbalance at ${node.value}`, `Unbalanced node encountered (Balance Factor = ${balance}). Left-Left case requires a single Right Rotation.`, { pivotId: node.id, highlightIds: [node.left!.id] });
        return this.rightRotate(node);
      }

      // RR Case
      if (balance < -1 && compareKeys(value, node.right!.value) > 0) {
        this.pushStep(`Right-Right Unbalance at ${node.value}`, `Unbalanced node encountered (Balance Factor = ${balance}). Right-Right case requires a single Left Rotation.`, { pivotId: node.id, highlightIds: [node.right!.id] });
        return this.leftRotate(node);
      }

      // LR Case
      if (balance > 1 && compareKeys(value, node.left!.value) > 0) {
        this.pushStep(`Left-Right Unbalance at ${node.value}`, `Unbalanced (Balance factor = ${balance}). LR case: first Left-Rotating child ${node.left!.value} around sibling pivots.`, { pivotId: node.id });
        node.left = this.leftRotate(node.left!);
        this.pushStep(`Completing LR Rotation on ${node.value}`, `Now performing a balancing Right Rotation at pivot ${node.value}.`, { pivotId: node.id });
        return this.rightRotate(node);
      }

      // RL Case
      if (balance < -1 && compareKeys(value, node.right!.value) < 0) {
        this.pushStep(`Right-Left Unbalance at ${node.value}`, `Unbalanced (Balance factor = ${balance}). RL Case: first Right-Rotating child ${node.right!.value} around sibling pivots.`, { pivotId: node.id });
        node.right = this.rightRotate(node.right!);
        this.pushStep(`Completing RL Rotation on ${node.value}`, `Now performing a balancing Left Rotation at pivot ${node.value}.`, { pivotId: node.id });
        return this.leftRotate(node);
      }

      return node;
    };

    this.binaryRoot = insertHelper(this.binaryRoot, null);
    this.pushStep('AVL Insert Complete', `Successfully balanced the tree structure. All heights and balance factors updated successfully.`, { highlightIds: this.binaryRoot ? [this.binaryRoot.id] : [] });
  }

  // AVL Deletion
  private deleteAVL(value: KeyType) {
    this.pushStep(`AVL Delete ${value}`, `Initiating AVL lookup and rebalancing delete operation for ${value}.`);

    const deleteHelper = (node: BinaryNode | null, targetVal: KeyType): BinaryNode | null => {
      if (!node) return null;

      const comp = compareKeys(targetVal, node.value);
      if (comp < 0) {
        node.left = deleteHelper(node.left, targetVal);
      } else if (comp > 0) {
        node.right = deleteHelper(node.right, targetVal);
      } else {
        // Found the node to delete!
        if (!node.left || !node.right) {
          const temp = node.left ? node.left : node.right;
          if (!temp) {
            this.pushStep(`Pruned leaf ${node.value}`, `Directly pruned leaf node ${node.value}.`, {});
            return null;
          } else {
            this.pushStep(`Spliced node ${node.value}`, `Replaced node ${node.value} with single child ${temp.value}.`, {});
            temp.parent = node.parent;
            return temp;
          }
        } else {
          // Double child case: get successor
          let successor = node.right;
          while (successor.left) {
            successor = successor.left;
          }
          this.pushStep(`Succesor Found`, `Using successor key ${successor.value} to safely replace deleted pivot ${node.value}.`, { highlightIds: [successor.id] });
          node.value = successor.value;
          node.right = deleteHelper(node.right, successor.value);
        }
      }

      updateHeight(node);
      const balance = getBalanceFactor(node);

      // LL Case
      if (balance > 1 && getBalanceFactor(node.left) >= 0) {
        this.pushStep(`Balanced ${node.value}: RR Rotation`, `BF is ${balance}. Left heavy. Executing a Right Rotation.`, { pivotId: node.id });
        return this.rightRotate(node);
      }

      // LR Case
      if (balance > 1 && getBalanceFactor(node.left) < 0) {
        this.pushStep(`Balanced ${node.value}: LR Rotation`, `BF is ${balance}. Double rotation required. Rotating left-child, followed by parent pivot.`, { pivotId: node.id });
        node.left = this.leftRotate(node.left!);
        return this.rightRotate(node);
      }

      // RR Case
      if (balance < -1 && getBalanceFactor(node.right) <= 0) {
        this.pushStep(`Balanced ${node.value}: LL Rotation`, `BF is ${balance}. Right heavy. Executing a Left Rotation.`, { pivotId: node.id });
        return this.leftRotate(node);
      }

      // RL Case
      if (balance < -1 && getBalanceFactor(node.right) > 0) {
        this.pushStep(`Balanced ${node.value}: RL Rotation`, `BF is ${balance}. Double rotation required: rotating right child right, then parent left.`, { pivotId: node.id });
        node.right = this.rightRotate(node.right!);
        return this.leftRotate(node);
      }

      return node;
    };

    this.binaryRoot = deleteHelper(this.binaryRoot, value);
    this.pushStep('AVL Deletion Complete', `BST state parsed and balanced with updated heights.`, {});
  }

  // LEFT ROTATE
  private leftRotate(x: BinaryNode): BinaryNode {
    const y = x.right!;
    const T2 = y.left;

    y.left = x;
    x.right = T2;

    if (T2) T2.parent = x;
    y.parent = x.parent;
    x.parent = y;

    updateHeight(x);
    updateHeight(y);

    return y;
  }

  // RIGHT ROTATE
  private rightRotate(y: BinaryNode): BinaryNode {
    const x = y.left!;
    const T2 = x.right;

    x.right = y;
    y.left = T2;

    if (T2) T2.parent = y;
    x.parent = y.parent;
    y.parent = x;

    updateHeight(y);
    updateHeight(x);

    return x;
  }

  // 3. SPLAY TREE
  private insertSplay(value: KeyType) {
    if (!this.binaryRoot) {
      this.binaryRoot = { id: getUniqueId(), value, left: null, right: null, height: 1, color: 'default', parent: null };
      this.pushStep(`Created empty splay tree`, `Inserted ${value} directly as the root splay node.`, { highlightIds: [this.binaryRoot.id] });
      return;
    }

    this.pushStep(`Inserting ${value}`, `Running binary lookup logic to anchor insertion of ${value}.`);
    // Regular BST insert
    let current: BinaryNode | null = this.binaryRoot;
    let parentNode: BinaryNode | null = null;
    while (current) {
      parentNode = current;
      const comp = compareKeys(value, current.value);
      if (comp < 0) {
        current = current.left;
      } else if (comp > 0) {
        current = current.right;
      } else {
        this.pushStep(`Duplicate found`, `The value ${value} exists. Splaying the duplicated node to the root.`, {});
        this.splayNode(current);
        return;
      }
    }

    const newNode: BinaryNode = { id: getUniqueId(), value, left: null, right: null, height: 1, color: 'default', parent: parentNode };
    if (compareKeys(value, parentNode!.value) < 0) {
      parentNode!.left = newNode;
    } else {
      parentNode!.right = newNode;
    }

    this.pushStep(`Node ${value} added`, `Linked leaf. Splaying newly inserted node ${value} to root...`, { highlightIds: [newNode.id] });
    this.splayNode(newNode);
  }

  private deleteSplay(value: KeyType) {
    if (!this.binaryRoot) return;
    this.pushStep(`Delete ${value}`, `Finding and deleting ${value} inside the splay tree.`);

    // Match and splay the search target (or last parent if search failed)
    let current: BinaryNode | null = this.binaryRoot;
    let lastNonNull: BinaryNode | null = null;

    while (current) {
      lastNonNull = current;
      const comp = compareKeys(value, current.value);
      if (comp < 0) {
        current = current.left;
      } else if (comp > 0) {
        current = current.right;
      } else {
        break;
      }
    }

    if (!lastNonNull) return;
    this.splayNode(lastNonNull);

    if (compareKeys(lastNonNull.value, value) !== 0) {
      this.pushStep(`Target ${value} not found`, `Could is not match search parameters. Nearest node splayed instead representing access counters.`, {});
      return;
    }

    // Node is now root!
    const target = lastNonNull;
    this.pushStep(`Splitting root splay node`, `Sinking or grafting child subsets recursively to resolve root deletion.`, { highlightIds: [target.id] });

    if (!target.left) {
      this.binaryRoot = target.right;
      if (this.binaryRoot) this.binaryRoot.parent = null;
    } else if (!target.right) {
      this.binaryRoot = target.left;
      if (this.binaryRoot) this.binaryRoot.parent = null;
    } else {
      const leftSubtree = target.left;
      const rightSubtree = target.right;
      leftSubtree.parent = null;
      this.binaryRoot = leftSubtree;

      // Splay maximum node of left root sub-branch to the top
      let maxNode = leftSubtree;
      while (maxNode.right) {
        maxNode = maxNode.right;
      }
      this.splayNode(maxNode);

      // Now the root of left tree has no right child! Combine with rightSubtree safely
      this.binaryRoot!.right = rightSubtree;
      rightSubtree.parent = this.binaryRoot;
    }

    this.pushStep(`Splay Deletion complete`, 'Target removed. Joined root subcomponents cleanly.', {});
  }

  private splayNode(node: BinaryNode) {
    while (node.parent) {
      const p = node.parent;
      const g = p.parent;

      if (!g) {
        // Zig Case (single pivot rotation)
        if (p.left === node) {
          this.pushStep(`Zig Rotation (Right rotate)`, `Rotating node ${node.value} around parent ${p.value} to elevate it.`, { pivotId: p.id, highlightIds: [node.id] });
          this.binaryRoot = this.rightRotate(p);
        } else {
          this.pushStep(`Zag Rotation (Left rotate)`, `Rotating node ${node.value} around parent ${p.value} to elevate it.`, { pivotId: p.id, highlightIds: [node.id] });
          this.binaryRoot = this.leftRotate(p);
        }
      } else {
        const isLeftChild = p.left === node;
        const isParentLeftChild = g.left === p;

        if (isLeftChild && isParentLeftChild) {
          // Zig-Zig Case
          this.pushStep(`Zig-Zig Rotation`, `Double Right Rotation. First right-rotating parent ${p.value}, then right-rotating grandparent ${g.value}.`, { pivotId: g.id, highlightIds: [node.id] });
          // Rotate g right, then p right
          const gp = g.parent;
          const rotatedP = this.rightRotate(g);
          if (!gp) {
            this.binaryRoot = rotatedP;
          } else if (gp.left === g) {
            gp.left = rotatedP;
          } else {
            gp.right = rotatedP;
          }
          const rotatedNode = this.rightRotate(p);
          if (!gp) {
            this.binaryRoot = rotatedNode;
          } else if (gp.left === rotatedP) {
            gp.left = rotatedNode;
          } else {
            gp.right = rotatedNode;
          }
        } else if (!isLeftChild && !isParentLeftChild) {
          // Zag-Zag Case
          this.pushStep(`Zag-Zag Rotation`, `Double Left Rotation. First left-rotating parent ${p.value}, then left-rotating grandparent ${g.value}.`, { pivotId: g.id, highlightIds: [node.id] });
          const gp = g.parent;
          const rotatedP = this.leftRotate(g);
          if (!gp) {
            this.binaryRoot = rotatedP;
          } else if (gp.left === g) {
            gp.left = rotatedP;
          } else {
            gp.right = rotatedP;
          }
          const rotatedNode = this.leftRotate(p);
          if (!gp) {
            this.binaryRoot = rotatedNode;
          } else if (gp.left === rotatedP) {
            gp.left = rotatedNode;
          } else {
            gp.right = rotatedNode;
          }
        } else if (isLeftChild && !isParentLeftChild) {
          // Zig-Zag Case
          this.pushStep(`Zig-Zag Rotation`, `Right rotation on parent ${p.value}, followed by Left rotation on grandparent ${g.value}.`, { pivotId: g.id, highlightIds: [node.id] });
          g.right = this.rightRotate(p);
          const gp = g.parent;
          const rotatedNode = this.leftRotate(g);
          if (!gp) {
            this.binaryRoot = rotatedNode;
          } else if (gp.left === g) {
            gp.left = rotatedNode;
          } else {
            gp.right = rotatedNode;
          }
        } else {
          // Zag-Zig Case
          this.pushStep(`Zag-Zig Rotation`, `Left rotation on parent ${p.value}, followed by Right rotation on grandparent ${g.value}.`, { pivotId: g.id, highlightIds: [node.id] });
          g.left = this.leftRotate(p);
          const gp = g.parent;
          const rotatedNode = this.rightRotate(g);
          if (!gp) {
            this.binaryRoot = rotatedNode;
          } else if (gp.left === g) {
            gp.left = rotatedNode;
          } else {
            gp.right = rotatedNode;
          }
        }
      }
    }
    if (this.binaryRoot) this.binaryRoot.parent = null;
  }

  // 4. RED-BLACK TREE (Highly detailed transitions!)
  private insertRedBlack(value: KeyType) {
    this.pushStep(`RB-Insert ${value}`, `Inserting ${value} as a RED leaf base following search BST rules.`);

    if (!this.binaryRoot) {
      this.binaryRoot = { id: getUniqueId(), value, left: null, right: null, height: 1, color: 'black', parent: null };
      this.pushStep(`Root colored BLACK`, `The tree was empty. Root is always inserted and colored BLACK to satisfy RB rules.`, { highlightIds: [this.binaryRoot.id] });
      return;
    }

    let current: BinaryNode = this.binaryRoot;
    let parentNode: BinaryNode | null = null;

    while (current) {
      parentNode = current;
      const comp = compareKeys(value, current.value);
      if (comp < 0) {
        if (!current.left) {
          current.left = { id: getUniqueId(), value, left: null, right: null, height: 1, color: 'red', parent: current };
          current = current.left;
          break;
        }
        current = current.left;
      } else if (comp > 0) {
        if (!current.right) {
          current.right = { id: getUniqueId(), value, left: null, right: null, height: 1, color: 'red', parent: current };
          current = current.right;
          break;
        }
        current = current.right;
      } else {
        this.pushStep('Duplicate Refused', 'Duplicate value. Skipping Red-Black tree insert.');
        return;
      }
    }

    const newNode = current;
    this.pushStep(`Attached ${value} (RED)`, `Added RED leaf node ${value}. Violations scan triggered.`, { highlightIds: [newNode.id] });

    this.fixRedBlackInsert(newNode);
  }

  private fixRedBlackInsert(node: BinaryNode) {
    let curr = node;

    while (curr !== this.binaryRoot && curr.parent && curr.parent.color === 'red') {
      const p = curr.parent;
      const g = p.parent;

      if (!g) {
        break; // Root is red but handle black fix later
      }

      if (p === g.left) {
        const u = g.right; // Uncle node

        if (u && u.color === 'red') {
          // Case 1: Uncle is RED -> recolor Parent, Uncle, and Grandparent
          this.pushStep('Uncle is RED (Case 1)', `Violated Rule: parent ${p.value} & uncle ${u.value} are RED. Recoloring parent and uncle to BLACK, and grandparent ${g.value} to RED.`, { highlightIds: [p.id, u.id, g.id] });
          p.color = 'black';
          u.color = 'black';
          g.color = 'red';
          curr = g;
        } else {
          // Case 2: Uncle is BLACK/Null & Triangle -> Rotate left on Parent
          if (curr === p.right) {
            this.pushStep('Uncle is BLACK: Triangle (Case 2)', `We have a Right child of Left parent triangle configuration. Performing Left rotation on parent ${p.value} to produce a straight line.`, { pivotId: p.id });
            curr = p;
            g.left = this.leftRotate(p);
          }

          // Case 3: Uncle is BLACK/Null & Line -> Rotations on Grandparent
          const newP = curr.parent!;
          const newG = newP.parent!;
          this.pushStep('Uncle is BLACK: Line (Case 3)', `We have a Left-Left line. Performing Right Rotation on grandparent ${newG.value} and swapping colors of parent and grandparent.`, { pivotId: newG.id });
          newP.color = 'black';
          newG.color = 'red';

          const gp = newG.parent;
          const rotatedSub = this.rightRotate(newG);
          if (!gp) {
            this.binaryRoot = rotatedSub;
          } else if (gp.left === newG) {
            gp.left = rotatedSub;
          } else {
            gp.right = rotatedSub;
          }
        }
      } else {
        // Parent is right child of grandparent
        const u = g.left;

        if (u && u.color === 'red') {
          this.pushStep('Uncle is RED (Case 1)', `Violated Rule: parent ${p.value} & uncle ${u.value} are RED. Recoloring parent and uncle to BLACK, and grandparent ${g.value} to RED.`, { highlightIds: [p.id, u.id, g.id] });
          p.color = 'black';
          u.color = 'black';
          g.color = 'red';
          curr = g;
        } else {
          if (curr === p.left) {
            this.pushStep('Uncle is BLACK: Triangle (Case 2)', `Left child of Right parent. Performing Right rotation on parent ${p.value} to arrange alignment.`, { pivotId: p.id });
            curr = p;
            g.right = this.rightRotate(p);
          }

          const newP = curr.parent!;
          const newG = newP.parent!;
          this.pushStep('Uncle is BLACK: Line (Case 3)', `Right-Right aligned line. Performing Left rotation on grandparent ${newG.value} and swapping colors.`, { pivotId: newG.id });
          newP.color = 'black';
          newG.color = 'red';

          const gp = newG.parent;
          const rotatedSub = this.leftRotate(newG);
          if (!gp) {
            this.binaryRoot = rotatedSub;
          } else if (gp.left === newG) {
            gp.left = rotatedSub;
          } else {
            gp.right = rotatedSub;
          }
        }
      }
    }

    if (this.binaryRoot && this.binaryRoot.color !== 'black') {
      this.binaryRoot.color = 'black';
      this.pushStep('Enforce Black Root', 'Enforced root node color to satisfy black rule.', { highlightIds: [this.binaryRoot.id] });
    }
  }

  // Red Black deletion
  private rbTransplant(u: BinaryNode, v: BinaryNode | null) {
    if (!u.parent) {
      this.binaryRoot = v;
    } else if (u === u.parent.left) {
      u.parent.left = v;
    } else {
      u.parent.right = v;
    }
    if (v) {
      v.parent = u.parent;
    }
  }

  private fixRedBlackDelete(node: BinaryNode | null, parent: BinaryNode | null) {
    let curr = node;
    let currParent = parent;

    while (curr !== this.binaryRoot && (!curr || curr.color === 'black')) {
      if (!currParent) break;

      if (curr === currParent.left) {
        let s = currParent.right; // sibling

        if (s && s.color === 'red') {
          // Case 1: Sibling is RED
          this.pushStep('Case 1: Sibling is RED', `Sibling ${s.value} is RED. Swapping colors of sibling and parent, and left-rotating at parent ${currParent.value}.`, { pivotId: currParent.id });
          s.color = 'black';
          currParent.color = 'red';
          const gp = currParent.parent;
          const rotated = this.leftRotate(currParent);
          if (!gp) this.binaryRoot = rotated;
          else if (gp.left === currParent) gp.left = rotated;
          else gp.right = rotated;

          currParent = s; // update parent
          s = currParent.right; // update sibling
        }

        if (s && (!s.left || s.left.color === 'black') && (!s.right || s.right.color === 'black')) {
          // Case 2: Sibling and children are BLACK
          this.pushStep('Case 2: Sibling and children are BLACK', `Sibling ${s.value} and its children are BLACK. Recoloring sibling ${s.value} to RED. Moving double-black up to parent ${currParent.value}.`, { highlightIds: [s.id, currParent.id] });
          s.color = 'red';
          curr = currParent;
          currParent = curr.parent;
        } else {
          if (s) {
            if (!s.right || s.right.color === 'black') {
              // Case 3: Sibling's right child is BLACK
              if (s.left) {
                this.pushStep('Case 3: Sibling right child is BLACK', `Sibling's left child ${s.left.value} is RED. Swapping sibling ${s.value} and sibling-left colors, and right-rotating at sibling.`, { pivotId: s.id });
                s.left.color = 'black';
                s.color = 'red';
                currParent.right = this.rightRotate(s);
                s = currParent.right;
              }
            }

            // Case 4: Sibling's right child is RED
            const rc = s.right;
            this.pushStep('Case 4: Sibling right child is RED', `Sibling's right child ${rc ? rc.value : 'null'} is RED. Setting sibling color to parent's color (${currParent.color.toUpperCase()}), parent and sibling-right to BLACK, and left-rotating at parent ${currParent.value}.`, { pivotId: currParent.id });
            s.color = currParent.color;
            currParent.color = 'black';
            if (s.right) s.right.color = 'black';

            const gp = currParent.parent;
            const rotated = this.leftRotate(currParent);
            if (!gp) this.binaryRoot = rotated;
            else if (gp.left === currParent) gp.left = rotated;
            else gp.right = rotated;

            curr = this.binaryRoot; // satisfied!
            currParent = null;
          } else {
            // No sibling available! Move up
            curr = currParent;
            currParent = curr.parent;
          }
        }
      } else {
        // Right child symmetric case
        let s = currParent.left; // sibling

        if (s && s.color === 'red') {
          // Case 1: Sibling is RED
          this.pushStep('Case 1: Sibling is RED (Symmetric)', `Sibling ${s.value} is RED. Swapping colors of sibling and parent, and right-rotating at parent ${currParent.value}.`, { pivotId: currParent.id });
          s.color = 'black';
          currParent.color = 'red';
          const gp = currParent.parent;
          const rotated = this.rightRotate(currParent);
          if (!gp) this.binaryRoot = rotated;
          else if (gp.left === currParent) gp.left = rotated;
          else gp.right = rotated;

          currParent = s;
          s = currParent.left;
        }

        if (s && (!s.left || s.left.color === 'black') && (!s.right || s.right.color === 'black')) {
          // Case 2: Sibling and children are BLACK
          this.pushStep('Case 2: Sibling and children are BLACK (Symmetric)', `Sibling ${s.value} and its children are BLACK. Recoloring sibling ${s.value} to RED. Moving double-black up to parent ${currParent.value}.`, { highlightIds: [s.id, currParent.id] });
          s.color = 'red';
          curr = currParent;
          currParent = curr.parent;
        } else {
          if (s) {
            if (!s.left || s.left.color === 'black') {
              if (s.right) {
                this.pushStep('Case 3: Sibling left child is BLACK (Symmetric)', `Sibling's right child ${s.right.value} is RED. Swapping sibling ${s.value} and sibling-right colors, and left-rotating at sibling.`, { pivotId: s.id });
                s.right.color = 'black';
                s.color = 'red';
                currParent.left = this.leftRotate(s);
                s = currParent.left;
              }
            }

            const lc = s.left;
            this.pushStep('Case 4: Sibling left child is RED (Symmetric)', `Sibling's left child ${lc ? lc.value : 'null'} is RED. Setting sibling color to parent's color (${currParent.color.toUpperCase()}), parent and sibling-left to BLACK, and right-rotating at parent ${currParent.value}.`, { pivotId: currParent.id });
            s.color = currParent.color;
            currParent.color = 'black';
            if (s.left) s.left.color = 'black';

            const gp = currParent.parent;
            const rotated = this.rightRotate(currParent);
            if (!gp) this.binaryRoot = rotated;
            else if (gp.left === currParent) gp.left = rotated;
            else gp.right = rotated;

            curr = this.binaryRoot; // satisfied!
            currParent = null;
          } else {
            curr = currParent;
            currParent = curr.parent;
          }
        }
      }
    }

    if (curr) curr.color = 'black';
  }

  private deleteRedBlack(value: KeyType) {
    if (!this.binaryRoot) return;
    this.pushStep(`Red-Black Delete ${value}`, `Finding and deleting ${value} while maintaining coloring properties.`);

    const findNodeVal = (val: KeyType): BinaryNode | null => {
      let run: BinaryNode | null = this.binaryRoot;
      while (run && compareKeys(val, run.value) !== 0) {
        if (compareKeys(val, run.value) < 0) run = run.left;
        else run = run.right;
      }
      return run;
    };

    const z = findNodeVal(value);
    if (!z) {
      this.pushStep('Node Not Found', `No node match found for key: ${value}.`);
      return;
    }

    let y = z;
    let yOriginalColor = y.color;
    let x: BinaryNode | null = null;
    let xParent: BinaryNode | null = null;

    if (!z.left) {
      x = z.right;
      xParent = z.parent;
      this.rbTransplant(z, z.right);
      if (x) x.parent = xParent;
    } else if (!z.left || !z.right) {
      x = z.left;
      xParent = z.parent;
      this.rbTransplant(z, z.left);
      if (x) x.parent = xParent;
    } else {
      let successor = z.right;
      while (successor.left) {
        successor = successor.left;
      }
      y = successor;
      yOriginalColor = y.color;
      x = y.right;

      this.pushStep('Successor Found', `Node ${z.value} has 2 children. Find successor ${y.value} (min of right subtree). Swapping value.`, { highlightIds: [z.id, y.id] });

      z.value = y.value;
      xParent = y.parent;
      if (y.parent === z) {
        xParent = z;
      }
      this.rbTransplant(y, y.right);
      if (x) x.parent = xParent;
    }

    this.pushStep(`Node Sliced`, `Safely detached the slice target. Original sliced color was ${yOriginalColor.toUpperCase()}.`, { highlightIds: x ? [x.id] : [] });

    if (yOriginalColor === 'black') {
      this.pushStep('Double-Black Violation', `Deleting a BLACK node (${y.value}) reduces black height. Double-black violation triggered at child position. Starting fixups.`, {});
      this.fixRedBlackDelete(x, xParent);
    }

    if (this.binaryRoot) {
      this.binaryRoot.color = 'black';
    }
    this.pushStep('RB-Deletion Completed', 'Root re-verified as BLACK. Safe restructuring and coloring finished successfully.', {});
  }

  // 5. GENERAL BINARY TREE (Completes level order additions)
  private insertBinaryTreeComplete(value: KeyType) {
    const newNode: BinaryNode = { id: getUniqueId(), value, left: null, right: null, height: 1, color: 'default', parent: null };

    if (!this.binaryRoot) {
      this.binaryRoot = newNode;
      this.pushStep('Roots set', `Inserted ${value} as root.`, { highlightIds: [newNode.id] });
      return;
    }

    // Level-order search queue to find first open child spot
    const queue: BinaryNode[] = [this.binaryRoot];
    while (queue.length > 0) {
      const top = queue.shift()!;
      if (!top.left) {
        top.left = newNode;
        newNode.parent = top;
        this.pushStep('Left Leaf Link', `Linked ${value} as left child of ${top.value} in complete level order.`, { highlightIds: [newNode.id] });
        return;
      } else if (!top.right) {
        top.right = newNode;
        newNode.parent = top;
        this.pushStep('Right Leaf Link', `Linked ${value} as right child of ${top.value} in complete level order.`, { highlightIds: [newNode.id] });
        return;
      } else {
        queue.push(top.left);
        queue.push(top.right);
      }
    }
  }

  private deleteBinaryTreeComplete(value: KeyType) {
    if (!this.binaryRoot) return;

    this.pushStep(`Pruning complete binary element ${value}`, `Traversing depth coordinates.`);
    // Prune standard leaf
    this.deleteBST(value);
    this.pushStep('Tree complete prune mapped', 'Pruned visual child.');
  }

  // 6. B-TREE & B+ TREE (Splits, multi-key nodes, Leaf List)
  private insertBTreeImmediate(value: KeyType) {
    const root = this.treeType === 'b-plus-tree' ? this.bPlusTreeRoot : this.bTreeRoot;
    if (!root) {
      const r: BNode = { id: getUniqueId(), keys: [value], children: [], isLeaf: true };
      if (this.treeType === 'b-plus-tree') {
        this.bPlusTreeRoot = r;
      } else {
        this.bTreeRoot = r;
      }
      return;
    }

    // Direct insertion with splits at max size (3 keys max in a 4-way tree)
    const insertNonFull = (n: BNode, k: KeyType) => {
      let idx = n.keys.length - 1;
      if (n.isLeaf) {
        n.keys.push(k);
        n.keys.sort(compareKeys);
      } else {
        while (idx >= 0 && compareKeys(k, n.keys[idx]) < 0) {
          idx--;
        }
        idx++;
        const child = n.children[idx];
        if (child.keys.length >= 3) {
          // split
          const midVal = child.keys[1];
          const rightSibling: BNode = { id: getUniqueId(), keys: [child.keys[2]], children: [], isLeaf: child.isLeaf };
          if (this.treeType === 'b-plus-tree' && child.isLeaf) {
            // copy mid key to leaf right
            rightSibling.keys.unshift(child.keys[1]);
          }
          if (!child.isLeaf) {
            rightSibling.children = child.children.slice(2);
            child.children = child.children.slice(0, 2);
          }
          child.keys = child.keys.slice(0, this.treeType === 'b-plus-tree' && child.isLeaf ? 2 : 1);

          n.keys.splice(idx, 0, midVal);
          n.children.splice(idx + 1, 0, rightSibling);

          if (compareKeys(k, midVal) > 0) {
            insertNonFull(rightSibling, k);
          } else {
            insertNonFull(child, k);
          }
        } else {
          insertNonFull(child, k);
        }
      }
    };

    let activeRoot = root;
    if (activeRoot.keys.length >= 3) {
      const newRoot: BNode = { id: getUniqueId(), keys: [], children: [activeRoot], isLeaf: false };
      const midVal = activeRoot.keys[1];
      const rightSibling: BNode = { id: getUniqueId(), keys: [activeRoot.keys[2]], children: [], isLeaf: activeRoot.isLeaf };
      if (this.treeType === 'b-plus-tree' && activeRoot.isLeaf) {
        rightSibling.keys.unshift(activeRoot.keys[1]);
      }
      if (!activeRoot.isLeaf) {
        rightSibling.children = activeRoot.children.slice(2);
        activeRoot.children = activeRoot.children.slice(0, 2);
      }
      activeRoot.keys = activeRoot.keys.slice(0, this.treeType === 'b-plus-tree' && activeRoot.isLeaf ? 2 : 1);

      newRoot.keys.push(midVal);
      newRoot.children.push(rightSibling);
      activeRoot = newRoot;
    }

    insertNonFull(activeRoot, value);

    if (this.treeType === 'b-plus-tree') {
      this.bPlusTreeRoot = rewireBPlusTreeLeaves(activeRoot);
    } else {
      this.bTreeRoot = activeRoot;
    }
  }

  private insertBTreeAnimation(value: KeyType) {
    const M = this.bTreeOrder || 3;
    let root = this.treeType === 'b-plus-tree' ? this.bPlusTreeRoot : this.bTreeRoot;
    
    this.pushStep(`B-Tree Insert ${value}`, `Searching target insert node with B-Tree Order ${M} constraints.`);

    if (!root) {
      const r: BNode = { id: getUniqueId(), keys: [value], children: [], isLeaf: true };
      if (this.treeType === 'b-plus-tree') {
        this.bPlusTreeRoot = r;
      } else {
        this.bTreeRoot = r;
      }
      this.pushStep(`Root Node Created`, `Tree was empty. Created a new leaf root with key [${value}].`, { highlightIds: [r.id] });
      return;
    }

    const traverseAndInsert = (node: BNode, k: KeyType, parentNode: BNode | null = null, childIdx: number = -1): boolean => {
      this.pushStep(`Traversing B-Tree Node`, `Visiting node with keys [${node.keys.join(', ')}]. checking keys for descent path.`, { highlightIds: [node.id] });
      
      if (node.isLeaf) {
        node.keys.push(k);
        node.keys.sort(compareKeys);
        this.pushStep(`Inserted Key [${k}]`, `Placed key [${k}] inside leaf node. Keys: [${node.keys.join(', ')}].`, { highlightIds: [node.id] });
        return true;
      }

      let idx = 0;
      while (idx < node.keys.length && compareKeys(k, node.keys[idx]) > 0) {
        idx++;
      }

      const child = node.children[idx];
      
      if (child.keys.length >= M - 1) {
        this.pushStep(`Node Full Alert`, `Child node with keys [${child.keys.join(', ')}] is at/above maximum capacity (limit: ${M - 1} keys). Preparing preemptive split.`, { highlightIds: [child.id] });
        
        const midIdx = Math.floor(child.keys.length / 2);
        const midVal = child.keys[midIdx];
        
        let rightSiblingKeys: KeyType[];
        let childKeys: KeyType[];
        
        if (this.treeType === 'b-plus-tree' && child.isLeaf) {
          rightSiblingKeys = child.keys.slice(midIdx);
          childKeys = child.keys.slice(0, midIdx);
        } else {
          rightSiblingKeys = child.keys.slice(midIdx + 1);
          childKeys = child.keys.slice(0, midIdx);
        }

        const rightSibling: BNode = {
          id: getUniqueId(),
          keys: rightSiblingKeys,
          children: [],
          isLeaf: child.isLeaf
        };

        if (!child.isLeaf) {
          rightSibling.children = child.children.slice(midIdx + 1);
          child.children = child.children.slice(0, midIdx + 1);
        }

        child.keys = childKeys;

        node.keys.splice(idx, 0, midVal);
        node.children.splice(idx + 1, 0, rightSibling);

        this.pushStep(`Split Completed`, `Split child node. Promoted key [${midVal}] to parent node. Left: [${child.keys.join(', ')}], Right: [${rightSibling.keys.join(', ')}].`, { highlightIds: [node.id, child.id, rightSibling.id] });

        if (compareKeys(k, midVal) > 0) {
          return traverseAndInsert(rightSibling, k, node, idx + 1);
        } else {
          return traverseAndInsert(child, k, node, idx);
        }
      }

      return traverseAndInsert(child, k, node, idx);
    };

    let activeRoot = root;
    if (activeRoot.keys.length >= M - 1) {
      this.pushStep(`Root Node Full Alert`, `Root node with keys [${activeRoot.keys.join(', ')}] exceeds maximum key size of ${M - 1}. Splitting root node to increase tree height.`, { highlightIds: [activeRoot.id] });
      
      const midIdx = Math.floor(activeRoot.keys.length / 2);
      const midVal = activeRoot.keys[midIdx];

      let rightSiblingKeys: KeyType[];
      let activeRootKeys: KeyType[];

      if (this.treeType === 'b-plus-tree' && activeRoot.isLeaf) {
        rightSiblingKeys = activeRoot.keys.slice(midIdx);
        activeRootKeys = activeRoot.keys.slice(0, midIdx);
      } else {
        rightSiblingKeys = activeRoot.keys.slice(midIdx + 1);
        activeRootKeys = activeRoot.keys.slice(0, midIdx);
      }

      const rightSibling: BNode = {
        id: getUniqueId(),
        keys: rightSiblingKeys,
        children: [],
        isLeaf: activeRoot.isLeaf
      };

      if (!activeRoot.isLeaf) {
        rightSibling.children = activeRoot.children.slice(midIdx + 1);
        activeRoot.children = activeRoot.children.slice(0, midIdx + 1);
      }

      activeRoot.keys = activeRootKeys;

      const newRoot: BNode = {
        id: getUniqueId(),
        keys: [midVal],
        children: [activeRoot, rightSibling],
        isLeaf: false
      };

      activeRoot = newRoot;
      
      if (this.treeType === 'b-plus-tree') {
        this.bPlusTreeRoot = rewireBPlusTreeLeaves(activeRoot);
      } else {
        this.bTreeRoot = activeRoot;
      }

      this.pushStep(`Root Split Completed`, `New root created with promoted key [${midVal}]. Heights increased.`, { highlightIds: [newRoot.id, rightSibling.id] });
    }

    traverseAndInsert(activeRoot, value);

    if (this.treeType === 'b-plus-tree') {
      this.bPlusTreeRoot = rewireBPlusTreeLeaves(activeRoot);
      this.pushStep(`B+ Tree Structure Re-wired`, `Successfully linked leaf node data blocks horizontally via pointers.`, {});
    } else {
      this.bTreeRoot = activeRoot;
      this.pushStep(`B-Tree Structure Settled`, `Successfully completed key insertion and validated invariants.`, {});
    }
  }

  private deleteBTreeAnimation(value: KeyType) {
    const M = this.bTreeOrder || 3;
    const minKeys = Math.ceil(M / 2) - 1;
    let root = this.treeType === 'b-plus-tree' ? this.bPlusTreeRoot : this.bTreeRoot;

    this.pushStep(`B-Tree Delete ${value}`, `Initiating B-Tree deletion for key: ${value} (Order M = ${M}, Min Keys = ${minKeys}).`);

    if (!root) {
      this.pushStep(`Delete failed`, `Tree is empty. Cannot delete key ${value}.`, {});
      return;
    }

    const findNodeAndAncestors = (curr: BNode, k: KeyType, path: { node: BNode; parent: BNode | null; index: number }[] = []): { node: BNode; parent: BNode | null; index: number }[] | null => {
      let idx = 0;
      while (idx < curr.keys.length && compareKeys(k, curr.keys[idx]) > 0) {
        idx++;
      }
      const contains = curr.keys.some(key => compareKeys(key, k) === 0);
      if (contains) {
        path.push({ node: curr, parent: path.length > 0 ? path[path.length - 1].node : null, index: idx });
        return path;
      }
      if (curr.isLeaf) {
        return null;
      }
      const child = curr.children[idx];
      path.push({ node: curr, parent: path.length > 0 ? path[path.length - 1].node : null, index: idx });
      return findNodeAndAncestors(child, k, path);
    };

    const pathTrace = findNodeAndAncestors(root, value);
    if (!pathTrace) {
      this.pushStep(`Key Not Found`, `Key ${value} is not represented in the B-Tree keys index. Aborting deletion.`, {});
      return;
    }

    const activeRoot = this.treeType === 'b-plus-tree' ? this.bPlusTreeRoot! : this.bTreeRoot!;

    const deleteRecursive = (n: BNode, k: KeyType): boolean => {
      let idx = 0;
      while (idx < n.keys.length && compareKeys(k, n.keys[idx]) > 0) {
        idx++;
      }

      const found = n.keys[idx] !== undefined && compareKeys(n.keys[idx], k) === 0;

      if (found) {
        if (n.isLeaf) {
          n.keys.splice(idx, 1);
          this.pushStep(`Deleted from Leaf`, `Successfully removed key [${k}] from leaf node. Keys are now: [${n.keys.join(', ')}].`, { highlightIds: [n.id] });
          return true;
        } else {
          if (this.treeType === 'b-plus-tree') {
            let child = n.children[idx + 1];
            while (!child.isLeaf) {
              child = child.children[0];
            }
            const successorKey = child.keys[0];
            this.pushStep(`Duplicate Index Replacement`, `Key ${k} found in internal index. Finding leaf successor key [${successorKey}] to replace internal pointer separator.`, { highlightIds: [n.id, child.id] });
            n.keys[idx] = successorKey;
            deleteRecursive(n.children[idx + 1], k);
            return true;
          } else {
            const leftChild = n.children[idx];
            const rightChild = n.children[idx + 1];

            if (leftChild.keys.length > minKeys) {
              let predNode = leftChild;
              while (!predNode.isLeaf) {
                predNode = predNode.children[predNode.keys.length];
              }
              const predKey = predNode.keys[predNode.keys.length - 1];
              this.pushStep(`Successor/Predecessor Borrow`, `Left child has keys to spare. Swapping target key [${k}] with in-order predecessor [${predKey}] from left subtree.`, { highlightIds: [n.id, predNode.id] });
              n.keys[idx] = predKey;
              deleteRecursive(leftChild, predKey);
            } else if (rightChild.keys.length > minKeys) {
              let succNode = rightChild;
              while (!succNode.isLeaf) {
                succNode = succNode.children[0];
              }
              const succKey = succNode.keys[0];
              this.pushStep(`Successor/Predecessor Borrow`, `Right child has keys to spare. Swapping target key [${k}] with in-order successor [${succKey}] from right subtree.`, { highlightIds: [n.id, succNode.id] });
              n.keys[idx] = succKey;
              deleteRecursive(rightChild, succKey);
            } else {
              this.pushStep(`Merging Sibling Branches`, `Both children have only ${minKeys} keys. Merging left child [${leftChild.keys.join(', ')}] and right child [${rightChild.keys.join(', ')}] along with separating key [${k}].`, { highlightIds: [leftChild.id, rightChild.id] });
              leftChild.keys.push(k);
              leftChild.keys.push(...rightChild.keys);
              if (!leftChild.isLeaf) {
                leftChild.children.push(...rightChild.children);
              }
              n.keys.splice(idx, 1);
              n.children.splice(idx + 1, 1);
              deleteRecursive(leftChild, k);
            }
            return true;
          }
        }
      } else {
        if (n.isLeaf) {
          return false;
        }

        const child = n.children[idx];
        if (child.keys.length <= minKeys) {
          const leftSibling = idx > 0 ? n.children[idx - 1] : null;
          const rightSibling = idx < n.children.length - 1 ? n.children[idx + 1] : null;

          if (leftSibling && leftSibling.keys.length > minKeys) {
            this.pushStep(`Underflow Fixup: Borrow Left Sibling`, `Descent path child [${child.keys.join(', ')}] requires keys (under limit ${minKeys}). Borrowing largest key [${leftSibling.keys[leftSibling.keys.length - 1]}] from left sibling.`, { highlightIds: [child.id, leftSibling.id] });
            
            if (this.treeType === 'b-plus-tree' && child.isLeaf) {
              const borrowedKey = leftSibling.keys.pop()!;
              child.keys.unshift(borrowedKey);
              n.keys[idx - 1] = child.keys[0];
            } else {
              child.keys.unshift(n.keys[idx - 1]);
              n.keys[idx - 1] = leftSibling.keys.pop()!;
              if (!child.isLeaf) {
                child.children.unshift(leftSibling.children.pop()!);
              }
            }
            this.pushStep(`Borrow Left Complete`, `Keys redistributed successfully.`, { highlightIds: [n.id, child.id] });
          } else if (rightSibling && rightSibling.keys.length > minKeys) {
            this.pushStep(`Underflow Fixup: Borrow Right Sibling`, `Descent path child [${child.keys.join(', ')}] requires keys (under limit ${minKeys}). Borrowing smallest key [${rightSibling.keys[0]}] from right sibling.`, { highlightIds: [child.id, rightSibling.id] });
            
            if (this.treeType === 'b-plus-tree' && child.isLeaf) {
              const borrowedKey = rightSibling.keys.shift()!;
              child.keys.push(borrowedKey);
              n.keys[idx] = rightSibling.keys[0];
            } else {
              child.keys.push(n.keys[idx]);
              n.keys[idx] = rightSibling.keys.shift()!;
              if (!child.isLeaf) {
                child.children.push(rightSibling.children.shift()!);
              }
            }
            this.pushStep(`Borrow Right Complete`, `Keys redistributed successfully.`, { highlightIds: [n.id, child.id] });
          } else {
            if (leftSibling) {
              this.pushStep(`Underflow Fixup: Merge Left`, `Descent path child [${child.keys.join(', ')}] has no sibling with extra keys. Merging child with left sibling [${leftSibling.keys.join(', ')}].`, { highlightIds: [child.id, leftSibling.id] });
              if (this.treeType === 'b-plus-tree' && child.isLeaf) {
                leftSibling.keys.push(...child.keys);
              } else {
                leftSibling.keys.push(n.keys[idx - 1]);
                leftSibling.keys.push(...child.keys);
                if (!leftSibling.isLeaf) {
                  leftSibling.children.push(...child.children);
                }
              }
              n.keys.splice(idx - 1, 1);
              n.children.splice(idx, 1);
              idx--;
            } else if (rightSibling) {
              this.pushStep(`Underflow Fixup: Merge Right`, `Descent path child [${child.keys.join(', ')}] has no sibling with extra keys. Merging right sibling [${rightSibling.keys.join(', ')}] into child.`, { highlightIds: [child.id, rightSibling.id] });
              if (this.treeType === 'b-plus-tree' && child.isLeaf) {
                child.keys.push(...rightSibling.keys);
              } else {
                child.keys.push(n.keys[idx]);
                child.keys.push(...rightSibling.keys);
                if (!child.isLeaf) {
                  child.children.push(...rightSibling.children);
                }
              }
              n.keys.splice(idx, 1);
              n.children.splice(idx + 1, 1);
            }
            this.pushStep(`Merge Complete`, `Merged sibling nodes, pulling down parent separator. Checking for propagating underflow.`, { highlightIds: [n.id] });
          }
        }
        return deleteRecursive(n.children[idx], k);
      }
    };

    const rootCopy = cloneBTree(activeRoot)!;
    deleteRecursive(rootCopy, value);

    let finalRoot: BNode | null = rootCopy;
    if (finalRoot.keys.length === 0 && finalRoot.children.length > 0) {
      this.pushStep(`Root Demoted`, `Root had 0 keys left. Demoting root; its child becomes the new root node. New keys: [${finalRoot.children[0].keys.join(', ')}].`, { highlightIds: [finalRoot.id] });
      finalRoot = finalRoot.children[0];
    } else if (finalRoot.keys.length === 0) {
      finalRoot = null;
    }

    if (this.treeType === 'b-plus-tree') {
      this.bPlusTreeRoot = rewireBPlusTreeLeaves(finalRoot);
    } else {
      this.bTreeRoot = finalRoot;
    }

    this.pushStep(`B-Tree Restructure Complete`, `Keys and layouts recalibrated successfully according to order rules.`, {});
  }

  // 7. HEAPS: MAX & MIN (Highly illustrative step-by-step arrays!)
  private insertMaxHeapAnimation(value: KeyType) {
    this.heapArray.push(value);
    let currentIdx = this.heapArray.length - 1;

    this.pushStep(`Max-Heap Insert: Add ${value}`, `Appending ${value} at end of structure (array index ${currentIdx}). Triggering bubble up (heapify).`, { heapHighlight: currentIdx });

    while (currentIdx > 0) {
      const parentIdx = Math.floor((currentIdx - 1) / 2);
      this.pushStep(`Heapify: Compare with Parent`, `Comparing child ${this.heapArray[currentIdx]} at index ${currentIdx} against parent ${this.heapArray[parentIdx]} at index ${parentIdx}.`, { heapHighlight: currentIdx, heapSwap: [currentIdx, parentIdx] });

      if (compareKeys(this.heapArray[currentIdx], this.heapArray[parentIdx]) > 0) {
        // Swap values
        const temp = this.heapArray[currentIdx];
        this.heapArray[currentIdx] = this.heapArray[parentIdx];
        this.heapArray[parentIdx] = temp;

        this.pushStep(`Heapify: Swap Swapped!`, `Child was larger (${value} > ${this.heapArray[currentIdx]}). Swapping them.`, { heapHighlight: parentIdx, heapSwap: [currentIdx, parentIdx] });
        currentIdx = parentIdx;
      } else {
        this.pushStep(`Heapify: Settled`, `Child values are balanced (${this.heapArray[currentIdx]} <= parent ${this.heapArray[parentIdx]}). Bubble up terminates safely.`, { heapHighlight: currentIdx });
        return;
      }
    }
  }

  private deleteMaxHeapAnimation(value: KeyType) {
    const idx = this.heapArray.findIndex(val => compareKeys(val, value) === 0);
    if (idx === -1) {
      this.pushStep('Delete Failed', `Value ${value} is not in the heap array.`, {});
      return;
    }

    const lastIdx = this.heapArray.length - 1;
    this.pushStep(`Delete ${value}`, `Extracting node ${value} at index ${idx}. Swapping it with the last element ${this.heapArray[lastIdx]} at index ${lastIdx}.`, { heapSwap: [idx, lastIdx] });

    if (idx === lastIdx) {
      this.heapArray.pop();
      this.pushStep('Heap element popped', 'Removed last tail elements directly.', {});
      return;
    }

    const replacedVal = this.heapArray[lastIdx];
    this.heapArray[idx] = replacedVal;
    this.heapArray.pop();

    this.pushStep('Replaced target with last element', `Deleted ${value} at index ${idx}, replaced with ${replacedVal}. Determining whether to bubble up/down.`, { heapHighlight: idx });

    const parentIdx = Math.floor((idx - 1) / 2);
    if (idx > 0 && compareKeys(this.heapArray[idx], this.heapArray[parentIdx]) > 0) {
      this.pushStep('Bubble-Up Required', `Replaced value ${this.heapArray[idx]} is greater than parent ${this.heapArray[parentIdx]}. Starting bubble-up heapify.`, { heapHighlight: idx });
      this.heapifyMaxUp(idx);
    } else {
      this.pushStep('Bubble-Down Required', `Replaced value ${this.heapArray[idx]} is smaller or equal to parent. Starting bubble-down sink analysis.`, { heapHighlight: idx });
      this.heapifyMaxDown(idx);
    }
  }

  private heapifyMaxUp(index: number) {
    let currentIdx = index;
    while (currentIdx > 0) {
      const parentIdx = Math.floor((currentIdx - 1) / 2);
      this.pushStep(`Heapify Up: Compare with Parent`, `Comparing child ${this.heapArray[currentIdx]} against parent ${this.heapArray[parentIdx]}.`, { heapHighlight: currentIdx, heapSwap: [currentIdx, parentIdx] });

      if (compareKeys(this.heapArray[currentIdx], this.heapArray[parentIdx]) > 0) {
        const temp = this.heapArray[currentIdx];
        this.heapArray[currentIdx] = this.heapArray[parentIdx];
        this.heapArray[parentIdx] = temp;
        this.pushStep(`Heapify Up: Swapped!`, `Child was larger (${this.heapArray[parentIdx]} < child ${this.heapArray[currentIdx]}). Swapping parent and child.`, { heapHighlight: parentIdx, heapSwap: [currentIdx, parentIdx] });
        currentIdx = parentIdx;
      } else {
        this.pushStep(`Heapify Up: Settled`, `Heap property satisfied (child ${this.heapArray[currentIdx]} <= parent). Bubble-up terminates.`, { heapHighlight: currentIdx });
        break;
      }
    }
  }

  private heapifyMaxDown(index: number) {
    let active = index;
    const len = this.heapArray.length;

    while (true) {
      const left = 2 * active + 1;
      const right = 2 * active + 2;
      let largest = active;

      if (left < len && compareKeys(this.heapArray[left], this.heapArray[largest]) > 0) {
        largest = left;
      }
      if (right < len && compareKeys(this.heapArray[right], this.heapArray[largest]) > 0) {
        largest = right;
      }

      if (largest !== active) {
        this.pushStep('Compare values: Swap available', `Parent ${this.heapArray[active]} is out of position. Swapping with child ${this.heapArray[largest]}.`, { heapSwap: [active, largest] });
        const temp = this.heapArray[active];
        this.heapArray[active] = this.heapArray[largest];
        this.heapArray[largest] = temp;
        active = largest;
      } else {
        this.pushStep('Heap stable', 'All nodes have bubble properties correct.', { heapHighlight: active });
        break;
      }
    }
  }

  // Min Heap standard insert bubble-up flow
  private insertMinHeapAnimation(value: KeyType) {
    this.heapArray.push(value);
    let currentIdx = this.heapArray.length - 1;

    this.pushStep(`Min-Heap Insert: Add ${value}`, `Appending ${value} at end of structure (array index ${currentIdx}). Triggering bubble up.`, { heapHighlight: currentIdx });

    this.heapifyMinUp(currentIdx);
  }

  private heapifyMinUp(index: number) {
    let currentIdx = index;
    while (currentIdx > 0) {
      const parentIdx = Math.floor((currentIdx - 1) / 2);
      this.pushStep(`Heapify Up: Compare with Parent`, `Comparing child ${this.heapArray[currentIdx]} at index ${currentIdx} against parent ${this.heapArray[parentIdx]} at index ${parentIdx}.`, { heapHighlight: currentIdx, heapSwap: [currentIdx, parentIdx] });

      if (compareKeys(this.heapArray[currentIdx], this.heapArray[parentIdx]) < 0) {
        const temp = this.heapArray[currentIdx];
        this.heapArray[currentIdx] = this.heapArray[parentIdx];
        this.heapArray[parentIdx] = temp;

        this.pushStep(`Heapify Up: Swapped!`, `Child was smaller (${temp} < ${this.heapArray[currentIdx]}). Swapping parent and child.`, { heapHighlight: parentIdx, heapSwap: [currentIdx, parentIdx] });
        currentIdx = parentIdx;
      } else {
        this.pushStep(`Heapify Up: Settled`, `Values are balanced (child ${this.heapArray[currentIdx]} >= parent ${this.heapArray[parentIdx]}). Bubble up terminates safely.`, { highlightIds: [], heapHighlight: currentIdx });
        break;
      }
    }
  }

  private deleteMinHeapAnimation(value: KeyType) {
    const idx = this.heapArray.findIndex(val => compareKeys(val, value) === 0);
    if (idx === -1) {
      this.pushStep('Delete Failed', `Value ${value} is not inside the heap arrays.`, {});
      return;
    }

    const lastIdx = this.heapArray.length - 1;
    this.pushStep(`Delete ${value}`, `Swapping key with last index element ${this.heapArray[lastIdx]}.`, { heapSwap: [idx, lastIdx] });

    if (idx === lastIdx) {
      this.heapArray.pop();
      return;
    }

    const replacedVal = this.heapArray[lastIdx];
    this.heapArray[idx] = replacedVal;
    this.heapArray.pop();

    this.pushStep('Replaced target with last element', `Deleted ${value} at index ${idx}, replaced with ${replacedVal}. Determining whether to bubble up/down.`, { heapHighlight: idx });

    const parentIdx = Math.floor((idx - 1) / 2);
    if (idx > 0 && compareKeys(this.heapArray[idx], this.heapArray[parentIdx]) < 0) {
      this.pushStep('Bubble-Up Required', `Replaced value ${this.heapArray[idx]} is smaller than parent ${this.heapArray[parentIdx]}. Starting bubble-up heapify.`, { heapHighlight: idx });
      this.heapifyMinUp(idx);
    } else {
      this.pushStep('Bubble-Down Required', `Replaced value ${this.heapArray[idx]} is greater or equal to parent. Starting bubble-down sink analysis.`, { heapHighlight: idx });
      this.heapifyMinDown(idx);
    }
  }

  private heapifyMinDown(index: number) {
    let active = index;
    const len = this.heapArray.length;

    while (true) {
      const left = 2 * active + 1;
      const right = 2 * active + 2;
      let smallest = active;

      if (left < len && compareKeys(this.heapArray[left], this.heapArray[smallest]) < 0) {
        smallest = left;
      }
      if (right < len && compareKeys(this.heapArray[right], this.heapArray[smallest]) < 0) {
        smallest = right;
      }

      if (smallest !== active) {
        this.pushStep('Min-swap triggered', `Swapped parent ${this.heapArray[active]} with smallest children ${this.heapArray[smallest]}.`, { heapSwap: [active, smallest] });
        const temp = this.heapArray[active];
        this.heapArray[active] = this.heapArray[smallest];
        this.heapArray[smallest] = temp;
        active = smallest;
      } else {
        this.pushStep('Min-heap stabilized', 'Order satisfied.', { heapHighlight: active });
        break;
      }
    }
  }

  // 8. FIBONACCI HEAP
  private insertFibonacciImmediate(value: KeyType) {
    const newNode: FibNode = {
      id: getUniqueId(),
      value,
      degree: 0,
      marked: false,
      parent: null,
      children: [],
      left: null as any,
      right: null as any,
    };
    newNode.left = newNode;
    newNode.right = newNode;

    this.fibRoots.push(newNode);
  }

  private insertFibonacciAnimation(value: KeyType) {
    this.insertFibonacciImmediate(value);
    // Sort array so that min root is prominently placed or highlighted if needed
    this.pushStep(`Fibonacci Insert: Added ${value}`, `Created new individual node root containing key ${value} and linked it to the root circularly doubly list. Degree is initialized to 0.`);
  }

  private deleteMinFibonacciAnimation() {
    if (this.fibRoots.length === 0) {
      this.pushStep('Extraction Failed', 'The Fibonacci Heap is completely empty.');
      return;
    }

    // Find root with minimum value
    let minNode = this.fibRoots[0];
    for (const r of this.fibRoots) {
      if (compareKeys(r.value, minNode.value) < 0) minNode = r;
    }

    this.pushStep(`Fibonacci Heap: Extract Min (${minNode.value})`, `Located min root pointer containing key ${minNode.value}. Proceeding to detach and consolidate.`, { highlightIds: [minNode.id] });

    // Promote all children of min root lists
    if (minNode.children.length > 0) {
      this.pushStep('Promote Children of Min', `Extracting children: [${minNode.children.map((c) => c.value).join(', ')}] and hoisting them up to the root sibling list.`, { highlightIds: minNode.children.map((c) => c.id) });
      minNode.children.forEach((child) => {
        child.parent = null;
        this.fibRoots.push(child);
      });
    }

    // Slice out the main extracted node from roots
    this.fibRoots = this.fibRoots.filter((r) => r.id !== minNode.id);

    if (this.fibRoots.length === 0) {
      this.pushStep('Min Extracted', 'Fibonacci heap is now empty.');
      return;
    }

    this.pushStep('Consolidation Triggered', 'Consolidating roots of same degree to complete extract-min requirements...', {});

    // Fibonacci Heap consolidation: link roots of same degree
    let degreeTable: (FibNode | null)[] = Array(15).fill(null);
    let i = 0;

    while (i < this.fibRoots.length) {
      let x = this.fibRoots[i];
      let deg = x.degree;

      while (degreeTable[deg] !== null && degreeTable[deg] !== x) {
        let y = degreeTable[deg]!; // Another tree root with the exact same degree has been found!
        if (compareKeys(x.value, y.value) > 0) {
          // Swap pointers so x is always the parent with smaller value
          const temp = x;
          x = y;
          y = temp;
        }

        this.pushStep(`Linking Node ${y.value} under Parent ${x.value}`, `Both roots have degree ${deg}. Since parent value must be smaller (${x.value} < ${y.value}), we link ${y.value} as a child of ${x.value}.`, { highlightIds: [x.id, y.id] });

        // Remove node y from roots list
        this.fibRoots = this.fibRoots.filter((n) => n.id !== y.id);
        if (i >= this.fibRoots.length) {
          i = Math.max(0, this.fibRoots.length - 1);
        }

        // Link y under x
        y.parent = x;
        x.children.push(y);
        x.degree++;
        y.marked = false;

        degreeTable[deg] = null;
        deg = x.degree;
      }

      degreeTable[deg] = x;
      i++;
    }

    // Filter out nulls to generate new consolidated clean root levels representation
    this.fibRoots = degreeTable.filter((n): n is FibNode => n !== null);
    this.pushStep('Consolidation completed!', 'Trees consolidated accurately. Sibling pointer list rebuilt circularly.', {});
  }
}

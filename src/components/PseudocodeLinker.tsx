import React, { useEffect, useRef } from 'react';
import { TreeType, AnimationStep } from '../types';

interface PseudocodeLinkerProps {
  treeType: TreeType;
  currentStepData: AnimationStep | null;
  darkMode?: boolean;
}

export const PseudocodeLinker: React.FC<PseudocodeLinkerProps> = ({
  treeType,
  currentStepData,
  darkMode = true,
}) => {
  const activeLineRef = useRef<HTMLDivElement | null>(null);

  // Dictionary of standard C algorithm implementations
  const pseudocodeMap: Record<string, string[]> = {
    'bst_binary': [
      "// Insert key into Binary Search Tree",
      "Node* insert(Node* node, Key key) {",
      "  if (node == NULL) return newNode(key);",
      "  if (key < node->key)",
      "    node->left = insert(node->left, key);",
      "  else if (key > node->key)",
      "    node->right = insert(node->right, key);",
      "  return node;",
      "}",
      "// Delete key from Binary Search Tree",
      "Node* deleteNode(Node* root, Key key) {",
      "  if (root == NULL) return root;",
      "  if (key < root->key) root->left = deleteNode(root->left, key);",
      "  else if (key > root->key) root->right = deleteNode(root->right, key);",
      "  else {",
      "    if (root->left == NULL) {",
      "      Node* temp = root->right; free(root); return temp;",
      "    }",
      "    if (root->right == NULL) {",
      "      Node* temp = root->left; free(root); return temp;",
      "    }",
      "    Node* temp = minValueNode(root->right);",
      "    root->key = temp->key;",
      "    root->right = deleteNode(root->right, temp->key);",
      "  }",
      "  return root;",
      "}"
    ],
    'avl': [
      "Node* insert(Node* node, Key key) {",
      "  if (node == NULL) return newNode(key);",
      "  if (key < node->key)",
      "    node->left = insert(node->left, key);",
      "  else if (key > node->key)",
      "    node->right = insert(node->right, key);",
      "  node->height = 1 + max(h(node->left), h(node->right));",
      "  int balance = getBalance(node);",
      "  // Left Left case (Single Right rotation)",
      "  if (balance > 1 && key < node->left->key)",
      "    return rightRotate(node);",
      "  // Right Right case (Single Left rotation)",
      "  if (balance < -1 && key > node->right->key)",
      "    return leftRotate(node);",
      "  // Left Right case (Double Left-Right)",
      "  if (balance > 1 && key > node->left->key) {",
      "    node->left = leftRotate(node->left);",
      "    return rightRotate(node);",
      "  }",
      "  // Right Left case (Double Right-Left)",
      "  if (balance < -1 && key < node->right->key) {",
      "    node->right = rightRotate(node->right);",
      "    return leftRotate(node);",
      "  }",
      "  return node;",
      "}"
    ],
    'red-black': [
      "void insertFixUp(Node** root, Node* z) {",
      "  while (z->parent && z->parent->color == RED) {",
      "    if (z->parent == z->parent->parent->left) {",
      "      Node* y = z->parent->parent->right; // Uncle y",
      "      if (y && y->color == RED) { // Case 1: Recolor",
      "        z->parent->color = BLACK; y->color = BLACK;",
      "        z->parent->parent->color = RED;",
      "        z = z->parent->parent;",
      "      } else {",
      "        if (z == z->parent->right) { // Case 2",
      "          z = z->parent; leftRotate(root, z);",
      "        }",
      "        z->parent->color = BLACK; // Case 3",
      "        z->parent->parent->color = RED;",
      "        rightRotate(root, z->parent->parent);",
      "      }",
      "    }",
      "  }",
      "  (*root)->color = BLACK;",
      "}"
    ],
    'splay': [
      "Node* splay(Node* root, Key key) {",
      "  if (root == NULL || root->key == key) return root;",
      "  if (root->key > key) { // Left subtree",
      "    if (root->left == NULL) return root;",
      "    if (root->left->key > key) { // Zig-Zig",
      "      root->left->left = splay(root->left->left, key);",
      "      root = rightRotate(root);",
      "    } else if (root->left->key < key) { // Zig-Zag",
      "      root->left->right = splay(root->left->right, key);",
      "      if (root->left->right != NULL) root->left = leftRotate(root->left);",
      "    }",
      "    return (root->left == NULL)? root: rightRotate(root);",
      "  } else { // Right subtree",
      "    if (root->right == NULL) return root;",
      "    if (root->right->key > key) { // Zag-Zig",
      "      root->right->left = splay(root->right->left, key);",
      "      if (root->right->left != NULL) root->right = rightRotate(root->right);",
      "    } else if (root->right->key < key) { // Zag-Zag",
      "      root->right->right = splay(root->right->right, key);",
      "      root = leftRotate(root);",
      "    }",
      "    return (root->right == NULL)? root: leftRotate(root);",
      "  }",
      "}"
    ],
    'b-tree': [
      "void insertNonFull(BNode* x, Key k) {",
      "  int i = x->n - 1;",
      "  if (x->isLeaf) {",
      "    while (i >= 0 && x->keys[i] > k) {",
      "      x->keys[i+1] = x->keys[i]; i--;",
      "    }",
      "    x->keys[i+1] = k; x->n++;",
      "  } else {",
      "    while (i >= 0 && x->keys[i] > k) i--;",
      "    if (x->children[i+1]->n == 2*T - 1) {",
      "      splitChild(x, i+1, x->children[i+1]);",
      "      if (x->keys[i+1] < k) i++;",
      "    }",
      "    insertNonFull(x->children[i+1], k);",
      "  }",
      "}",
      "void splitChild(BNode* x, int i, BNode* y) {",
      "  BNode* z = allocateNode();",
      "  z->isLeaf = y->isLeaf; z->n = T - 1;",
      "  for (int j=0; j < T-1; j++) z->keys[j] = y->keys[j+T];",
      "  if (!y->isLeaf) {",
      "    for (int j=0; j < T; j++) z->children[j] = y->children[j+T];",
      "  }",
      "  y->n = T - 1;",
      "}"
    ],
    'heap': [
      "void heapifyUp(int i) {",
      "  while (i > 0 && compare(heap[i], heap[parent(i)])) {",
      "    swap(&heap[i], &heap[parent(i)]);",
      "    i = parent(i);",
      "  }",
      "}",
      "void heapifyDown(int i) {",
      "  int target = i;",
      "  int l = left(i), r = right(i);",
      "  if (l < size && compare(heap[l], heap[target])) target = l;",
      "  if (r < size && compare(heap[r], heap[target])) target = r;",
      "  if (target != i) {",
      "    swap(&heap[i], &heap[target]);",
      "    heapifyDown(target);",
      "  }",
      "}"
    ],
    'fibonacci-heap': [
      "void link(FibHeap* H, Node* y, Node* x) {",
      "  removeYFromRootList(y);",
      "  makeYChildOfX(y, x);",
      "  x->degree++; y->mark = FALSE;",
      "}",
      "void consolidate(FibHeap* H) {",
      "  for (int i=0; i < max_degree; i++) A[i] = NULL;",
      "  for (each root x in root list) {",
      "    int d = x->degree;",
      "    while (A[d] != NULL) {",
      "      Node* y = A[d];",
      "      if (x->key > y->key) swap(&x, &y);",
      "      link(H, y, x);",
      "      A[d] = NULL; d++;",
      "    }",
      "    A[d] = x;",
      "  }",
      "}"
    ]
  };

  // Select key based on family of structures
  let codeKey = 'bst_binary';
  if (treeType === 'binary-tree' || treeType === 'bst') {
    codeKey = 'bst_binary';
  } else if (treeType === 'avl') {
    codeKey = 'avl';
  } else if (treeType === 'red-black') {
    codeKey = 'red-black';
  } else if (treeType === 'splay') {
    codeKey = 'splay';
  } else if (treeType === 'b-tree' || treeType === 'b-plus-tree') {
    codeKey = 'b-tree';
  } else if (['max-heap', 'min-heap', 'binary-heap'].includes(treeType)) {
    codeKey = 'heap';
  } else if (treeType === 'fibonacci-heap') {
    codeKey = 'fibonacci-heap';
  }

  const lines = pseudocodeMap[codeKey] || [];

  const getActiveLine = (): number => {
    if (!currentStepData) return -1;
    const { title = '', explanation = '' } = currentStepData;
    const lTitle = title.toLowerCase();
    const lExp = explanation.toLowerCase();

    if (codeKey === 'bst_binary') {
      if (lTitle.includes('find') || lTitle.includes('search') || lTitle.includes('travers') || lTitle.includes('compare')) {
        if (lExp.includes('left') || lExp.includes('less')) return 3;
        if (lExp.includes('right') || lExp.includes('greater')) return 5;
        return 2;
      }
      if (lTitle.includes('insert') || lExp.includes('created new') || lExp.includes('parent')) {
        if (lExp.includes('inserted') || lExp.includes('null')) return 2;
        return 1;
      }
      if (lTitle.includes('delete') || lTitle.includes('removing')) {
        if (lExp.includes('left') && lExp.includes('null')) return 15;
        if (lExp.includes('right') && lExp.includes('null')) return 18;
        return 10;
      }
      if (lExp.includes('successor') || lExp.includes('smallest') || lExp.includes('replacement')) {
        return 22;
      }
      if (lExp.includes('replace') || lExp.includes('swap') || lExp.includes('copy')) {
        return 23;
      }
    }

    if (codeKey === 'avl') {
      if (lTitle.includes('left-left') || lTitle.includes('right rotate') || (lExp.includes('right rotation') && !lExp.includes('double'))) {
        return 10;
      }
      if (lTitle.includes('right-right') || lTitle.includes('left rotate') || (lExp.includes('left rotation') && !lExp.includes('double'))) {
        return 13;
      }
      if (lTitle.includes('left-right') || (lExp.includes('left-right') && lExp.includes('rotation'))) {
        return 16;
      }
      if (lTitle.includes('right-left') || (lExp.includes('right-left') && lExp.includes('rotation'))) {
        return 21;
      }
      if (lExp.includes('height') || lExp.includes('recalculated')) {
        return 6;
      }
      if (lExp.includes('balance') || lExp.includes('factor')) {
        return 7;
      }
      if (lExp.includes('inserted') || lExp.includes('leaf')) {
        return 1;
      }
    }

    if (codeKey === 'red-black') {
      if (lExp.includes('recolor') || lTitle.includes('recolor') || lExp.includes('uncle')) {
        return 5;
      }
      if (lExp.includes('left rotate') || lTitle.includes('left rotate') || lExp.includes('rotate left')) {
        return 10;
      }
      if (lExp.includes('right rotate') || lTitle.includes('right rotate') || lExp.includes('rotate right')) {
        return 14;
      }
      if (lExp.includes('root') || lExp.includes('black')) {
        if (!lExp.includes('recolor')) return 18;
      }
      if (lExp.includes('parent') && lExp.includes('red')) {
        return 1;
      }
    }

    if (codeKey === 'splay') {
      if (lTitle.includes('zig-zig') || lExp.includes('zig-zig')) return 6;
      if (lTitle.includes('zig-zag') || lExp.includes('zig-zag')) return 9;
      if (lTitle.includes('zag-zag') || lExp.includes('zag-zag')) return 19;
      if (lTitle.includes('zag-zig') || lExp.includes('zag-zig')) return 16;
      if (lExp.includes('rotation') || lExp.includes('rotate')) return 11;
      if (lExp.includes('finding') || lExp.includes('searching') || lExp.includes('splay')) return 1;
    }

    if (codeKey === 'b-tree') {
      if (lTitle.includes('split') || lExp.includes('splitting') || lExp.includes('split')) {
        if (lExp.includes('new node')) return 17;
        if (lExp.includes('copy keys') || lExp.includes('distribute')) return 19;
        return 16;
      }
      if (lExp.includes('descent') || lExp.includes('traversing') || lExp.includes('checked child')) {
        return 9;
      }
      if (lExp.includes('placed') || lExp.includes('insert key') || lExp.includes('inserting to leaf')) {
        return 6;
      }
      if (lExp.includes('underflow') || lTitle.includes('borrow') || lTitle.includes('merge')) {
        return 10;
      }
    }

    if (codeKey === 'heap') {
      if (lTitle.includes('compare with parent') || lExp.includes('comparing child')) {
        return 1;
      }
      if (lTitle.includes('swapped!') || lExp.includes('swapping parent')) {
        return 2;
      }
      if (lTitle.includes('bubble-up required')) return 0;
      if (lTitle.includes('bubble-down required')) return 6;
      if (lExp.includes('sink') || lExp.includes('compare values') || lExp.includes('heapifydown')) {
        return 9;
      }
      if (lExp.includes('stable') || lExp.includes('stabilized') || lTitle.includes('settled')) {
        return 11;
      }
    }

    if (codeKey === 'fibonacci-heap') {
      if (lTitle.includes('linking node') || lExp.includes('link') || lExp.includes('child')) {
        return 2;
      }
      if (lTitle.includes('consolidation triggered') || lExp.includes('consolidating')) {
        return 5;
      }
      if (lExp.includes('extract min') || lTitle.includes('extract min')) {
        return 5;
      }
    }

    return -1;
  };

  const activeIdx = getActiveLine();

  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIdx, treeType]);

  if (!currentStepData) return null;

  return (
    <div className={`${
      darkMode 
        ? 'bg-[#050505] border-white/5 text-slate-300' 
        : 'bg-slate-50 border-slate-200 text-slate-900 shadow'
    } border rounded-xl p-3 shadow-xl overflow-hidden font-mono text-[10px]`}>
      <div className={`flex items-center justify-between border-b ${
        darkMode ? 'border-white/5' : 'border-slate-200/60'
      } pb-2 mb-2.5`}>
        <span className={`text-[9px] font-bold ${
          darkMode ? 'text-cyan-400' : 'text-cyan-600'
        } uppercase tracking-wider block`}>
          Algorithmic Line Tracker (C Code)
        </span>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${
            darkMode ? 'bg-cyan-400 animate-pulse' : 'bg-cyan-500'
          }`} />
          <span className={`text-[8px] uppercase tracking-widest ${
            darkMode ? 'text-slate-500' : 'text-slate-400'
          } font-bold`}>Active tracing</span>
        </div>
      </div>
      <div className="max-h-[170px] overflow-y-auto space-y-0.5 scrollbar-thin pr-1">
        {lines.map((line, idx) => {
          const isActive = idx === activeIdx;
          return (
            <div
              key={`pseudocode-line-${idx}`}
              ref={isActive ? activeLineRef : undefined}
              className={`flex items-start rounded px-2 py-0.5 transition-all duration-150 ${
                isActive
                  ? darkMode
                    ? 'bg-cyan-950/50 text-cyan-300 font-bold border-l-2 border-cyan-400 shadow-[inset_4px_0_10px_rgba(6,182,212,0.1)]'
                    : 'bg-cyan-100/70 text-cyan-900 font-bold border-l-2 border-cyan-600 shadow-sm'
                  : darkMode
                    ? 'text-slate-400 opacity-60'
                    : 'text-slate-650 opacity-80'
              }`}
            >
              <span className={`w-5 flex-shrink-0 ${
                darkMode ? 'text-slate-600' : 'text-slate-400'
              } block text-right pr-2 select-none`}>
                {idx + 1}
              </span>
              <pre className="whitespace-pre overflow-x-auto select-text font-mono leading-tight">{line}</pre>
            </div>
          );
        })}
      </div>
    </div>
  );
};

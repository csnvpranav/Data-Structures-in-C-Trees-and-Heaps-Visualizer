import { KeyType } from '../types';

export interface TraversalResults {
  preorder: string;
  inorder: string;
  postorder: string;
}

export function computeTraversals(snapshotStr: string): TraversalResults {
  const fallback: TraversalResults = { preorder: 'N/A', inorder: 'N/A', postorder: 'N/A' };
  if (!snapshotStr) return fallback;

  try {
    const obj = JSON.parse(snapshotStr);
    
    if (obj.type === 'binary') {
      const root = obj.root;
      if (!root) return fallback;

      const pre: KeyType[] = [];
      const ino: KeyType[] = [];
      const post: KeyType[] = [];

      const traversePre = (node: any) => {
        if (!node) return;
        pre.push(node.value);
        traversePre(node.left);
        traversePre(node.right);
      };

      const traverseIn = (node: any) => {
        if (!node) return;
        traverseIn(node.left);
        ino.push(node.value);
        traverseIn(node.right);
      };

      const traversePost = (node: any) => {
        if (!node) return;
        traversePost(node.left);
        traversePost(node.right);
        post.push(node.value);
      };

      traversePre(root);
      traverseIn(root);
      traversePost(root);

      return {
        preorder: pre.join(', ') || 'Empty',
        inorder: ino.join(', ') || 'Empty',
        postorder: post.join(', ') || 'Empty',
      };
    }

    if (obj.type === 'b-tree' || obj.type === 'b-plus-tree') {
      const root = obj.root;
      if (!root) return fallback;

      const pre: KeyType[] = [];
      const ino: KeyType[] = [];
      const post: KeyType[] = [];

      const traversePre = (node: any) => {
        if (!node) return;
        if (node.keys) {
          pre.push(...node.keys);
        }
        if (node.children) {
          for (const child of node.children) {
            traversePre(child);
          }
        }
      };

      const traverseIn = (node: any) => {
        if (!node) return;
        if (node.children && node.children.length > 0) {
          for (let i = 0; i < node.keys.length; i++) {
            traverseIn(node.children[i]);
            ino.push(node.keys[i]);
          }
          traverseIn(node.children[node.keys.length]);
        } else if (node.keys) {
          ino.push(...node.keys);
        }
      };

      const traversePost = (node: any) => {
        if (!node) return;
        if (node.children) {
          for (const child of node.children) {
            traversePost(child);
          }
        }
        if (node.keys) {
          post.push(...node.keys);
        }
      };

      traversePre(root);
      traverseIn(root);
      traversePost(root);

      return {
        preorder: pre.join(', ') || 'Empty',
        inorder: ino.join(', ') || 'Empty',
        postorder: post.join(', ') || 'Empty',
      };
    }

    if (obj.type === 'heap') {
      const arr = obj.array;
      if (!arr || !Array.isArray(arr) || arr.length === 0) return fallback;

      const pre: KeyType[] = [];
      const ino: KeyType[] = [];
      const post: KeyType[] = [];

      const traversePre = (idx: number) => {
        if (idx >= arr.length) return;
        pre.push(arr[idx]);
        traversePre(2 * idx + 1);
        traversePre(2 * idx + 2);
      };

      const traverseIn = (idx: number) => {
        if (idx >= arr.length) return;
        traverseIn(2 * idx + 1);
        ino.push(arr[idx]);
        traverseIn(2 * idx + 2);
      };

      const traversePost = (idx: number) => {
        if (idx >= arr.length) return;
        traversePost(2 * idx + 1);
        traversePost(2 * idx + 2);
        post.push(arr[idx]);
      };

      traversePre(0);
      traverseIn(0);
      traversePost(0);

      return {
        preorder: pre.join(', ') || 'Empty',
        inorder: ino.join(', ') || 'Empty',
        postorder: post.join(', ') || 'Empty',
      };
    }

    if (obj.type === 'fibonacci') {
      const roots = obj.roots;
      if (!roots || !Array.isArray(roots) || roots.length === 0) return fallback;

      const pre: KeyType[] = [];
      const ino: KeyType[] = [];
      const post: KeyType[] = [];

      const traversePre = (nodeList: any[]) => {
        for (const n of nodeList) {
          if (!n) continue;
          pre.push(n.value);
          if (n.children && n.children.length > 0) {
            traversePre(n.children);
          }
        }
      };

      const traverseIn = (nodeList: any[]) => {
        for (const n of nodeList) {
          if (!n) continue;
          if (!n.children || n.children.length === 0) {
            ino.push(n.value);
          } else {
            traverseIn([n.children[0]]);
            ino.push(n.value);
            if (n.children.length > 1) {
              traverseIn(n.children.slice(1));
            }
          }
        }
      };

      const traversePost = (nodeList: any[]) => {
        for (const n of nodeList) {
          if (!n) continue;
          if (n.children && n.children.length > 0) {
            traversePost(n.children);
          }
          post.push(n.value);
        }
      };

      traversePre(roots);
      traverseIn(roots);
      traversePost(roots);

      return {
        preorder: pre.join(', ') || 'Empty',
        inorder: ino.join(', ') || 'Empty',
        postorder: post.join(', ') || 'Empty',
      };
    }

    return fallback;
  } catch (e) {
    console.error('Error computing tree traversals from snapshot:', e);
    return fallback;
  }
}

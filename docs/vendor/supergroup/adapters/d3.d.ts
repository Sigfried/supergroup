import type { SGNode } from '../node.js';
import { Supergroup } from '../collection.js';
export interface D3Node<R> {
    id: string;
    name: string;
    key: unknown;
    records: R[];
    children?: D3Node<R>[];
}
export interface ToD3Opts {
    onRepeat?: 'firstOccurrence' | 'repeat';
}
export declare function toD3<R>(target: SGNode<R> | Supergroup<R>, opts?: ToD3Opts): D3Node<R>;

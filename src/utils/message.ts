/**
 * Define the format for RPC Message between embedded page and content script.
 */
export interface RPCMessage {
    className: string;
    method: string;
    args: any[];
}
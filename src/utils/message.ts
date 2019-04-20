/**
 * Define the format for RPC Message between embedded page and content script.
 */
export interface RPCMessage {
    id?: number;
    extensionId?: string;
    className: string;
    method: string;
    args: any[];
    type?: string;
}


export interface RPCResult {
    extensionId: string;
    messageId: number;
    error: any | null;
    result: any | null;
    type?: string;
}
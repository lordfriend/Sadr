export interface CacheItem<V> {
    payload: V;
    timestamp: number; // item put time
    invalid: boolean; // when item is invalid, cache will miss
}

export class VolatileCache<V> {
    private _items = new Map<string, CacheItem<V>>();

    /**
     * Init a cache
     * @param {number} _expiredTime expired time for a cache in milliseconds.
     */
    constructor(private _expiredTime: number) {}

    getItem(key: string): V | null {
        let item = this._items.get(key);
        if (!item || item.invalid || Date.now() - item.timestamp > this._expiredTime) {
            return null;
        }
        return item.payload;
    }

    putItem(key: string, payload: V): void {
        this._items.set(key, {
            payload: payload,
            timestamp: Date.now(),
            invalid: false
        });
    }

    invalidate(key: string) {
        let item = this._items.get(key);
        if (item) {
            item.invalid = true;
        }
    }

    clear(): void {
        this._items.clear();
    }
}
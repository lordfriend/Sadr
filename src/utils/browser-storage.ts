import { injectable } from 'inversify';

export interface BrowserStorage {
    get(key: string): Promise<any>;
    set(key: string, item: any): Promise<any>;
    remove(key: string): Promise<any>;
    clear(): Promise<any>;
}

@injectable()
export class ChromeStore implements BrowserStorage {

    get(key: string): Promise<any> {
        return new Promise<any>((resolve) => {
            chrome.storage.local.get({[key]: null}, (items) => {
                resolve(items[key]);
            });
        });
    }

    set(key: string, item: any): Promise<any> {
        return new Promise<any>((resolve) => {
            chrome.storage.local.set({[key]: item}, () => {
                resolve();
            });
        });
    }

    remove(key: string): Promise<any> {
        return new Promise<any>((resolve) => {
            chrome.storage.local.remove([key], () => {
                resolve();
            });
        });
    }

    clear(): Promise<any> {
        return new Promise<any>((resolve) => {
            chrome.storage.local.clear(() => {
                resolve();
            })
        });
    }
}

// export class FirefoxStore implements BrowserStorage {
//
//     get(key: string): Promise<any> {
//         return null;
//     }
//
//     set(key: string, item: any): Promise<any> {
//         return null;
//     }
//
//     remove(key: string): Promise<any> {
//         return null;
//     }
//
//     clear(): Promise<any> {
//         return null;
//     }
// }
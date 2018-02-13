import { restrictToHttps } from '../utils/utils';
import { Export, Remote } from '../utils/rpc';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { BrowserStorage } from '../utils/browser-storage';
import { inject, injectable } from 'inversify';
import { TYPES } from '../utils/types';
import { VolatileCache } from '../utils/cache';

interface IAuthInfo {
    id: string; // user's uid
    url: string; // user url
    username: string; // user's uid, wtf
    nickname: string;
    avatar: {
        large: string, // large image url
        medium: string, // medium image url
        small: string // small image url
    },
    sign: string,
    auth: string, // issued by auth server, used in ${AUTH_TOKEN}
    auth_encode?: string // ${AUTH_TOKEN) encoded by urlencode()
}

type INITIAL_STATE = 0;
type AuthInfo = IAuthInfo | null | INITIAL_STATE;

const INITIAL_STATE = 0;

@Remote()
@injectable()
export class BangumiAPIProxy {
    private _host = 'https://api.bgm.tv';
    private _authInfo: BehaviorSubject<AuthInfo> = new BehaviorSubject<AuthInfo>(INITIAL_STATE);

    get authInfo(): Observable<AuthInfo> {
        return this._authInfo.asObservable();
    }

    cache = new VolatileCache<any>(3600 * 1000);

    constructor(@inject(TYPES.BrowserStorage) private _storage: BrowserStorage) {
        this._storage.get('authInfo')
            .then((authInfo) => {
                console.log(authInfo);
                if (authInfo) {
                    this._authInfo.next(authInfo);
                } else {
                    this._authInfo.next(null);
                }
            });
    }

    @Export()
    auth(username: string, password: string): Promise<any> {
        console.log(username, password);
        const params = new URLSearchParams();
        params.set('username', username);
        params.set('password', password);
        params.set('source', 'onAir');
        params.set('auth', '0');
        params.set('sysuid', '0');
        params.set('sysusername', '0');

        return fetch(`${this._host}/auth?source=onAir`, {
            method: 'POST',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
        })
            .then(resp => resp.json())
            .then(data => {
                if (data.error) {
                    throw data;
                }
                return data;
            })
            .then(data => {
                const processedData = restrictToHttps(data);
                this._authInfo.next(processedData);
                return this._storage.set('authInfo', processedData)
                    .then(() => {
                        return processedData;
                    });
            });
    }

    @Export()
    revokeAuth(): Promise<any> {
        return this._storage.remove('authInfo')
            .then(() => {
                this._authInfo.next(null);
                return {'message': 'ok'};
            });
    }

    @Export()
    bangumiDetail(bangumi_id: number): Promise<any> {
        const reqUrl = `${this._host}/subject/${bangumi_id}?responseGroup=large`;
        if (this.cache.getItem(reqUrl)) {
            return Promise.resolve(this.cache.getItem(reqUrl));
        }
        return fetch(reqUrl, {
            credentials: 'include'
        })
            .then(resp => resp.json())
            .then(data => {
                let processedData = restrictToHttps(data);
                this.cache.putItem(reqUrl, processedData);
                return processedData;
            });
    }

    @Export()
    favoriteStatus(bangumi_id: number): Promise<any> {
        let searchParams = new URLSearchParams();
        return this.addCredentialParams(searchParams)
            .then(() => {
                const reqUrl = `${this._host}/collection/${bangumi_id}?${searchParams.toString()}`;
                return fetch(reqUrl, {
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    },
                    credentials: 'include'
                })
                    .then(resp => resp.json())
                    .then(data => {
                        console.log(data);
                        if (!data.code) {
                            return data;
                        }
                        if (data.code == 401) {
                            return Promise.reject({status: 401});
                        } else if (data.code === 400 && data.error === '40001 Error: Nothing found with that ID') {
                            return Promise.reject({status: 404});
                        }
                        return Promise.reject({status: data.code, message: data.error});
                    })
            })

    }

    @Export()
    userCollection(): Promise<any> {
        let searchParams = new URLSearchParams();
        searchParams.set('cat', 'watching');
        return this.addCredentialParams(searchParams)
            .then(authInfo => {
                return fetch(`${this._host}/user/${(authInfo as IAuthInfo).id}/collection?${searchParams.toString()}`, {
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0',
                    },
                    credentials: 'include'
                });
            })
            .then(res => res.json());
    }

    @Export()
    updateCollection(bangumi_id: number, status: number, rating?: number): Promise<any> {
        let searchParams = new URLSearchParams();
        const status_str = ['', 'wish', 'collect', 'do', 'on_hold', 'dropped'];
        if (status !== 0 && status_str[status]) {
            searchParams.set('status', status_str[status]);
            if (rating) {
                searchParams.set('rating', rating + '');
            }
            return this.addCredentialParams(searchParams)
                .then(() => {
                    return fetch(`${this._host}/collect/${bangumi_id}/update?source=onAir`, {
                        method: 'POST',
                        headers: {
                            'Cache-Control': 'no-cache, no-store, must-revalidate',
                            'Pragma': 'no-cache',
                            'Expires': '0',
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: searchParams.toString(),
                        credentials: 'include'
                    });
                })
                .then(res => res.json());
        } else {
            return Promise.reject({status: 400, message: 'status must be 1 to 5'})
        }
    }

    @Export()
    updateEpisodeStatus(episodeId: number, status: string, watchedEpisodes?: number[]): Promise<any> {
        let searchParams = new URLSearchParams();
        if (status === 'watched' && !!watchedEpisodes) {
            searchParams.set('ep_id', watchedEpisodes.join(','))
        }
        return this.addCredentialParams(searchParams)
            .then(() => {
                return fetch(`${this._host}/ep/${episodeId}/status/${status}?source=onAir`, {
                    method: 'POST',
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0',
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: searchParams.toString(),
                    credentials: 'include'
                });
            })
            .then(res => res.json());
    }

    getProgress(bangumiId: number): Promise<any> {
        let searchParams = new URLSearchParams();
        searchParams.set('subject_id', bangumiId + '');
        searchParams.set('source', 'onAir');
        return this.addCredentialParams(searchParams)
            .then((authInfo) => {
                return fetch(`${this._host}/user/${(authInfo as IAuthInfo).id}/progress?${searchParams.toString()}`, {
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    },
                    credentials: 'include'
                })
            })
            .then(res => res.json())
            .then(result => {
                if (result && Array.isArray(result.eps)) {
                    return result.eps;
                }
                throw result;
            });
    }

    @Export()
    getAuthInfo(): Promise<AuthInfo> {
        console.log('getAuthInfo');
        return this.authInfo
            .filter(authInfo => authInfo !== INITIAL_STATE)
            .first()
            .do(authInfo => console.log(authInfo))
            .toPromise();
    }

    private addCredentialParams(params: URLSearchParams): Promise<any> {
        return this.authInfo
            .filter(authInfo => authInfo !== INITIAL_STATE)
            .map((authInfo: AuthInfo) => {
                if (!authInfo) {
                    return Observable.throw({status: 401});
                }
                // params.set('sysusername', authInfo.id);
                // params.set('sysuid', authInfo.id);
                params.set('source', 'onAir');
                params.set('auth', authInfo.auth);
                return authInfo;
            })
            .first()
            .toPromise();
    }
}
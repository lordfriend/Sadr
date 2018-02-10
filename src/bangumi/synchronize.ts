import { injectable } from 'inversify';
import { BangumiAPIProxy } from './api-proxy';
import { Bangumi } from '../entity/bangumi';
import { Export, Remote } from '../utils/rpc';
import { BangumiWebProxy } from './web-proxy';
import { FavoriteStatus, WatchHistoryRecord } from './interfaces';
import { WatchProgress } from '../entity/watch-progress';
import { Episode } from '../entity/episode';

@Remote()
@injectable()
export class Synchronize {
    private _ablireoHost = ALBIREO_HOST;

    constructor(private _bangumiApiProxy: BangumiAPIProxy,
                private _bangumiWebProxy: BangumiWebProxy) {
    }

    @Export()
    solveConflict(bangumi: Bangumi, bgmFavStatus: number, choice: string): Promise<any> {
        if (choice === 'site') {
            return this._bangumiWebProxy.updateFavoriteStatus(bangumi.bgm_id, {
                interest: bangumi.favorite_status
            })
                .then(() => {
                    return this._bangumiApiProxy.favoriteStatus(bangumi.bgm_id);
                });
        }
        return this.favoriteBangumiInAlbireo(bangumi.id, bgmFavStatus);
    }

    @Export()
    syncOne(bangumi: Bangumi): Promise<any> {
        return this._bangumiApiProxy.favoriteStatus(bangumi.bgm_id)
            .then(data => {
                // faved in bangumi.tv
                if (!bangumi.favorite_status) {
                    return this.favoriteBangumiInAlbireo(bangumi.id, data.status.id)
                        .then(() => {
                            return {status: 0, data: data};
                        })
                } else if (bangumi.favorite_status !== data.status.id) {
                    return {status: 1, data: data, diff: {albireo: bangumi.favorite_status, bgm: data.status.id}};
                }
                return {status: 2, data: data, message: 'nothing to do'};
            }, (error) => {
                // not fav in bangumi.tv but has favorite status in albireo bangumi.
                // write status to bangumi.tv
                if (error && error.status === 404) {
                    if (bangumi.favorite_status) {
                        return this._bangumiWebProxy.updateFavoriteStatus(bangumi.bgm_id, {
                            interest: bangumi.favorite_status
                        })
                            .then(() => {
                                return this._bangumiApiProxy.favoriteStatus(bangumi.bgm_id)
                            })
                            .then(result => {
                                return {status: 0, data: result};
                            })
                    }
                    return {status: 2, data: null, message: 'nothing to do'};
                }
                throw error;
            });
    }

    @Export()
    updateFavorite(bangumi: Bangumi, favoriteStatus: FavoriteStatus): Promise<any> {
        return Promise.all([
            this.favoriteBangumiInAlbireo(bangumi.id, favoriteStatus.interest),
            this._bangumiWebProxy.updateFavoriteStatus(bangumi.bgm_id, favoriteStatus)
        ]);
    }

    @Export()
    deleteFavorite(bangumi: Bangumi): Promise<any> {
        return Promise.all([
            this.deleteFavoriteInAlbireo(bangumi.id),
            this._bangumiWebProxy.removeFavoriteStatus(bangumi.bgm_id)
        ]);
    }

    // @Export()
    // updateEpisode(episodeId: number, status: number): Promise<any> {
    //     const statusInString = ['', 'queue', 'watched', '', '', 'dropped'][status];
    //     if (!status) {
    //         return Promise.reject({status: 400, message: 'status must be 1, 2 or 5'});
    //     }
    //     return this._bangumiApiProxy.updateEpisodeStatus(episodeId, statusInString);
    // }

    /**
     * Synchronize between albireo servern and bangumi of current bangumi progress.
     * @param {Bangumi} bangumi must contain episodes watch_progress info.
     * @returns {Promise<any>}
     */
    @Export()
    syncProgress(bangumi: Bangumi): Promise<any> {
        if (!bangumi.favorite_status || bangumi.favorite_status === Bangumi.WISH) {
            return Promise.resolve({status: 2, data: null, message: 'nothing to do'});
        }
        return this._bangumiApiProxy.getProgress(bangumi.bgm_id)
            .then((episodeList) => {
                console.log(episodeList);
                if (Array.isArray(bangumi.episodes)) {
                    let watchedEpisodes = this.filterWatchedEpisode(bangumi.episodes);
                    if (watchedEpisodes.length > 0) {
                        let maxEpisodeIndex = this.findMaxEpisodeIndex(watchedEpisodes);
                        if (maxEpisodeIndex !== -1) {
                            let episodesNeedSync = watchedEpisodes.slice(0, maxEpisodeIndex + 1).filter((eps) => {
                                for (let i = 0; i < episodeList.length; i++) {
                                    if (episodeList[i].id === eps.bgm_eps_id) {
                                        episodeList.splice(i, 1);
                                        return false;
                                    }
                                }
                                return true;
                            });
                            if (episodesNeedSync.length > 0) {
                                // albireo => bgm.tv
                                return this._bangumiApiProxy.updateEpisodeStatus(
                                    episodesNeedSync[episodesNeedSync.length - 1].bgm_eps_id,
                                    'watched', episodesNeedSync.map(eps => eps.bgm_eps_id))
                                    .then(() => {
                                        if (episodeList.length > 0) {
                                            return this.bgmToAlbireo(bangumi, episodeList);
                                        }
                                        return {status: 1, message: 'albireo => bgm.tv synchronized'};
                                    });
                            }
                        }
                    }
                    if (Array.isArray(episodeList) && episodeList.length > 0) {
                        // bgm.tv => albireo
                        return this.bgmToAlbireo(bangumi, episodeList);
                    }
                }
                return Promise.resolve({status: 2, data: null, message: 'nothing to do'});
            }, () => {
                if (Array.isArray(bangumi.episodes)) {
                    let watchedEpisodes = this.filterWatchedEpisode(bangumi.episodes);
                    if (watchedEpisodes.length > 0) {
                        let maxEpisodeIndex = this.findMaxEpisodeIndex(watchedEpisodes);
                        console.log(maxEpisodeIndex);
                        if (maxEpisodeIndex !== -1) {
                            return this._bangumiApiProxy.updateEpisodeStatus(
                                watchedEpisodes[maxEpisodeIndex].bgm_eps_id,
                                'watched',
                                watchedEpisodes.slice(0, maxEpisodeIndex + 1).map(eps => eps.bgm_eps_id))
                                .then(() => {
                                    return {status: 1, message: 'albireo => bgm.tv synchronized'};
                                });
                        }
                    }
                }
                return Promise.resolve({status: 2, data: null, message: 'nothing to do'});
            });
    }

    // private getFavoritesFromAlbireo(): Promise<Bangumi[]> {
    //     return fetch(`${this._ablireoHost}/api/home/my_bangumi?status=0`, {
    //         credentials: 'include'
    //     })
    //         .then(res => res.json())
    //         .then(result => {
    //             return result.data as Bangumi[];
    //         });
    // }

    private favoriteBangumiInAlbireo(bangumi_uuid: string, favorite_status: number): Promise<any> {
        return fetch(`${this._ablireoHost}/api/watch/favorite/bangumi/${bangumi_uuid}`, {
            method: 'POST',
            body: JSON.stringify({status: favorite_status}),
            credentials: 'include'
        })
            .then(res => res.json());
    }

    private deleteFavoriteInAlbireo(bangumi_uuid: string): Promise<any> {
        return fetch(`${this._ablireoHost}/api/watch/favorite/bangumi/${bangumi_uuid}`, {
            method: 'DELETE',
            credentials: 'include'
        })
            .then(res => res.json());
    }

    private filterWatchedEpisode(episodes: Episode[]): Episode[] {
        return episodes.filter(episode => {
            return !!episode.watch_progress &&
                (episode.watch_progress.watch_status === WatchProgress.WATCHED ||
                    episode.watch_progress.watch_status === WatchProgress.WATCHING);
        }).sort((eps1, eps2) => eps1.episode_no - eps2.episode_no);
    }

    private findMaxEpisodeIndex(episodes: Episode[]): number {
        for (let i = episodes.length - 1; i >= 0; i--) {
            if (episodes[i].watch_progress.watch_status === WatchProgress.WATCHED) {
                return i;
            }
        }
        return -1;
    }

    private batchUpdateWatchProgressToAlbireo(watchProgressList: WatchHistoryRecord[]) {
        return fetch(`${this._ablireoHost}/api/watch/history/synchronize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify({records: watchProgressList}),
            credentials: 'include'
        })
            .then(res => res.json());
    }

    private bgmToAlbireo(bangumi: Bangumi, episodeProgressList: any): Promise<any> {
        let watchProgressList = episodeProgressList.map((eps: any) => {
            let episode = bangumi.episodes.find(episode => episode.bgm_eps_id === eps.id);
            if (!episode) {
                return null;
            }
            let watchHistoryRecord;
            if (!episode.watch_progress) {
                watchHistoryRecord = {
                    bangumi_id: bangumi.id,
                    episode_id: episode.id,
                    last_watch_position: 10, // this is a wrong position, but a safe value.
                    last_watch_time: Date.now(),
                    percentage: 1,
                    is_finished: true
                };
            } else if (episode.watch_progress.watch_status !== eps.status.id) {
                watchHistoryRecord = {
                    bangumi_id: bangumi.id,
                    episode_id: episode.id,
                    last_watch_position: episode.watch_progress.last_watch_position,
                    last_watch_time: Date.now(),
                    percentage: episode.watch_progress.percentage,
                    is_finished: eps.status.id === WatchProgress.WATCHED
                };
            } else {
                watchHistoryRecord = null;
            }
            return watchHistoryRecord;
        }).filter((watchProgress: WatchHistoryRecord) => !!watchProgress);
        if (watchProgressList && watchProgressList.length > 0) {
            return this.batchUpdateWatchProgressToAlbireo(watchProgressList as WatchHistoryRecord[])
                .then(() => {
                    return {status: 0, message: 'bgm.tv => albireo synchronized'};
                });
        }
        return Promise.resolve({status: 2, data: null, message: 'nothing to do'});
    }

    // private getSyncedItem(bangumi_id: number): Promise<any> {
    //     return this._storage.get(`synced_item_${bangumi_id}`);
    // }
    //
    // private updateSyncedItem(bangumi_id: number, favorite_status: FavoriteStatus): Promise<any> {
    //     return this._storage.set(`synced_item_${bangumi_id}`, favorite_status);
    // }

    // @Export()
    // getCollectionFromBgm(): Promise<any> {
    //     return this._bangumiApiProxy.userCollection();
    // }
}
import { Bangumi } from './bangumi';
import { WatchProgress } from './watch-progress';
import { Image } from './image';

export class Episode {

    static EPISODE_TYPE_NORMAL: number = 0;
    static EPISODE_TYPE_SPECIAL: number = 1;

    id: string;
    bangumi_id: string;
    bgm_eps_id: number;
    episode_no: number;
    name: string;
    name_cn: string;
    duration: string;
    airdate: string;
    status: number;
    torrent_id: string;
    create_time: number;
    update_time: number;
    bangumi: Bangumi; // optional
    // @deprecated
    thumbnail: string; // optional

    // @Optional
    delete_mark: number;
    // @Optional
    delete_eta: number;

    // optional
    watch_progress: WatchProgress;

    // deprecated
    thumbnail_color: string;

    thumbnail_image: Image | null;

    static STATUS_NOT_DOWNLOADED = 0;
    static STATUS_DOWNLOADING = 1;
    static STATUS_DOWNLOADED = 2;
}

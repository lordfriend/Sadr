export interface FavoriteStatus {
    interest: number;
    rating?: number;
    tags?: string;
    comment?: string;
}

/**
 * author of a post
 */
export interface PostUser {
    uid: string;
    username: string;
    url: string;
    avatar?: string;
    name: string;
    signature?: string;
}

/**
 * used for reply a post
 */
export interface ReplyParameter {
    topic_id: string;
    post_id: string;
    sub_reply_id: string;
    sub_reply_uid: string;
    post_uid: string;
    sub_post_type: string;
}

/**
 * a quote in a post
 */
export interface Quote {
    author: string;
    content: string;
}

/**
 * represent a comment post
 */
export interface Post {
    id: string;
    date: number;
    author: PostUser;
    content: any;
    quote?: any;
    subPosts: Post[];
    replyParameter?: ReplyParameter;
    is_self?: boolean;
}

/**
 * information of user bangumi.tv favorite
 */
export interface FavoriteInfo {
    name: string;
    ep_status: number;
    lasttouch: string;
    subject: {
        id: number; //bangumi id
        url: string;
        type: number; // bangumi type number, 2 = anime, 6 = tv series;
        name: string;
        name_cn: string;
        summary: string;
        eps: number;
        air_daate: string;
        air_weekday: number;
        images: {
            large: string;
            common: string;
            medium: string;
            small: string;
            grid: string;
        },
        collection: {
            wish: number; // how many users in this status
            collect: number;
            doing: number;
            on_hold: number;
            dropped: number;
        }
    }
}


export interface WatchHistoryRecord {
    bangumi_id: string;
    episode_id: string;
    last_watch_position: number;
    last_watch_time: number;
    percentage: number;
    is_finished: boolean;
}
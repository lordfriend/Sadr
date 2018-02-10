import { FavoriteStatus, Post, PostUser, Quote, ReplyParameter } from './interfaces';
import { Export, Remote } from '../utils/rpc';
import { VolatileCache } from '../utils/cache';
import { injectable } from 'inversify';
import moment = require('moment');
import { Moment } from 'moment';

const POST_ID_PATTERN = /^post_(\d+)$/;
const POST_DATE_PATTERN = /[\s\n]*-\s*(\d{4}-\d{1,2}-\d{1,2}\s*\d{2}:\d{2})[\s\n]*/;
const AVATAR_URL_PATTERN = /background-image:url\('([^']+)'\)/;
const USER_UID_PATTERN = /^\/user\/(\d+)/;
// const BGM_FACE_IMG = /<img\s+src="(\/[\w\d\/.]+)"\s+smileid="\d+"\s+alt="\(bgm(\d+)\)">/gi;
const FACE_IMG = /<img\s+src="(\/[\w\d\/.]+)"\s+smileid="\d+"\s+alt="([^"]+)">/gi;
const REPLY_HANDLER_PATTERN = /subReply\('ep',(\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/;

@Remote()
@injectable()
export class BangumiWebProxy {
    private _host = 'https://bgm.tv';

    private _cache = new VolatileCache<Document>(3600 * 1000);

    @Export()
    clearCache(): Promise<any> {
        this._cache.clear();
        return Promise.resolve({message: 'ok'});
    }

    @Export()
    checkLoginStatus(): Promise<any> {
        return fetch(`${this._host}/about/guideline`, {
            method: 'GET',
            headers: {
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'pragma': 'no-cache',
                'cache-control': 'no-cache',
            },
            credentials: 'include'
        })
            .then(resp => resp.text())
            .then(htmlContent => {
                const parser = new DOMParser();
                return parser.parseFromString(htmlContent, 'text/html');
            })
            .then(doc => {
                let avatar = doc.querySelector('#headerNeue2 .headerNeueInner .idBadgerNeue .avatar');
                console.log(avatar);
                if (avatar) {
                    return {isLogin: true};
                }
                return {isLogin: false};
            });
    }

    /**
     * update an favorite status in bgm.tv use web form submit. this method should not be directly invoked.
     * @param {number} bangumi_id
     * @param {FavoriteStatus} favoriteStatus
     * @returns {Promise<any>}
     */
    updateFavoriteStatus(bangumi_id: number, favoriteStatus: FavoriteStatus): Promise<any> {
        let searchParams = new URLSearchParams();
        searchParams.set('referer', 'subject');
        searchParams.set('interest', favoriteStatus.interest + '');
        if (favoriteStatus.rating) {
            searchParams.set('rating', favoriteStatus.rating + '');
        }
        if (favoriteStatus.tags) {
            searchParams.set('tags', favoriteStatus.tags);
        }
        if (favoriteStatus.comment) {
            searchParams.set('comment', favoriteStatus.comment);
        }
        const reqUrl = `${this._host}/subject/${bangumi_id}`;
        return this.getDocument(reqUrl)
            .then(doc => {
                const collectBoxForm = doc.getElementById('collectBoxForm');
                if (!collectBoxForm) {
                    throw {status: 401, message: 'Unauthorized in Bangumi'};
                }
                const actionUrl = collectBoxForm.getAttribute('action');
                if (!actionUrl) {
                    throw {status: 500, message: 'no action'};
                }
                return actionUrl;
            })
            .then(actionUrl => {
                return fetch(`${this._host}/${actionUrl}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: searchParams.toString(),
                    credentials: 'include',
                    redirect: 'manual'
                });
            })
            .then(() => {
                this._cache.invalidate(reqUrl);
                // ignore redirect response
                return {'message': 'ok'};
            });
    }

    removeFavoriteStatus(bangumi_id: number): Promise<any> {
        const reqUrl = `${this._host}/subject/${bangumi_id}`;
        return this.getDocument(reqUrl)
            .then(doc => {
                const collectBoxForm = doc.getElementById('collectBoxForm');
                if (!collectBoxForm) {
                    throw {status: 401, message: 'Unauthorized in Bangumi'};
                }
                const actionUrl = collectBoxForm.getAttribute('action');
                if (!actionUrl) {
                    throw {status: 500, message: 'no action'};
                }
                return actionUrl;
            })
            .then(actionUrl => {
                let formhashSearchString = actionUrl.split('?')[1];
                return fetch(`${this._host}/subject/${bangumi_id}/remove?${formhashSearchString}`, {
                    method: 'GET',
                    headers: {
                        'origin': 'https://bgm.tv',
                        'referer': `https://bgm.tv/subject/${bangumi_id}`,
                    },
                    credentials: 'include',
                    redirect: 'manual'
                });
            })
            .then(() => {
                this._cache.invalidate(reqUrl);
                // ignore redirect response
                return {'message': 'ok'};
            });
    }

    @Export()
    getCommentForEpisode(episode_id: number): Promise<any> {
        return this.getDocument(`${this._host}/ep/${episode_id}`)
            .then(doc => {
                let commentList = doc.querySelectorAll('#comment_list > .row_reply');
                let posts = [];
                for (let i = 0; i < commentList.length; i++) {
                    let post: any = {};
                    let commentBlock = commentList[i] as HTMLElement;
                    let postId = this.getPostId(commentBlock);
                    let postDate = this.getPostDate(commentBlock);
                    if (!postId || !postDate) {
                        continue;
                    }
                    post.author = this.getPostUser(commentBlock);
                    post.id = postId;
                    // console.log(postDate);
                    post.date = postDate.valueOf();
                    let content = (commentBlock.querySelector('.inner > .reply_content > .message.clearit') as HTMLElement).innerHTML;
                    // TODO: sanitize content html;
                    if (content) {
                        post.content = this.processPostContent(content);
                    }
                    post.replyParameter = this.getReplyParameter(commentBlock);
                    if (post.author && post.replyParameter) {
                        post.author.uid = post.replyParameter.post_uid;
                    }
                    // find reply
                    let replyContainer = commentBlock.querySelector('.topic_sub_reply');
                    if (replyContainer) {
                        post.subPosts = [];
                        for (let j = 0; j < replyContainer.children.length; j++) {
                            let replyBlock = replyContainer.children[j] as HTMLElement;
                            let replyId = this.getPostId(replyBlock);
                            let replyDate = this.getPostDate(replyBlock);
                            if (!replyId || !replyDate) {
                                continue;
                            }
                            let reply: any = {};
                            reply.id = replyId;
                            reply.date = replyDate.valueOf();
                            reply.author = this.getPostUser(replyBlock);
                            reply.quote = this.separateQuote(replyBlock);
                            let replyContent = (replyBlock.querySelector('.inner > .cmt_sub_content') as HTMLElement).innerHTML;
                            if (replyContent) {
                                reply.content = this.processPostContent(replyContent);
                            }
                            reply.replyParameter = this.getReplyParameter(replyBlock);
                            if (reply.author && reply.replyParameter) {
                                reply.author.uid = reply.replyParameter.post_uid;
                            }
                            post.subPosts.push(reply);
                        }
                    }
                    posts.push(post);
                }
                let newComment;
                let newCommentForm = doc.querySelector('#ReplyForm');
                if (newCommentForm) {
                    newComment = {
                        formhash: (newCommentForm.querySelector('input[name="formhash"]') as HTMLElement).getAttribute('value') as string,
                        lastview: (newCommentForm.querySelector('input[name="lastview"]') as HTMLElement).getAttribute('value') as string
                    }
                }
                return {posts: posts, newComment: newComment};
            });
    }

    /**
     * submit an new comment
     * @param {number} episodeId - topic_id or episode id (bgm_eps_id)
     * @param {string} content - reply content
     * @param {number} related_photo - usage unknown, currently always 0
     * @param {string} lastview - an number value provided by current comment page.
     * @param {string} formhash - an hash string provided by current comment page.
     * @param {ReplyParameter} replyParam - depends on behavior this param may not provided.
     * @returns {Promise<any>}
     */
    @Export()
    newComment(episodeId: number,
               content: string,
               related_photo: number,
               lastview: string,
               formhash: string,
               replyParam?: ReplyParameter): Promise<any> {
        let formParams = new URLSearchParams();
        formParams.set('content', content);
        formParams.set('related_photo', '0');
        formParams.set('lastview', lastview);
        formParams.set('formhash', formhash);
        formParams.set('submit', 'submit');
        if (replyParam) {
            formParams.set('topic_id', replyParam.topic_id);
            formParams.set('sub_reply_uid', replyParam.sub_reply_uid);
            formParams.set('post_uid', replyParam.post_uid);
            formParams.set('related', replyParam.post_id);
            // if (replyParam.sub_post_type !== '0') {
            //     formParams.set('sub_post_type', replyParam.sub_post_type);
            // }
        }
        return fetch(`${this._host}/subject/ep/${episodeId}/new_reply?ajax=1`, {
            method: 'POST',
            headers: {
                'accept': 'application/json, text/javascript, */*; q=0.01',
                'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'origin': 'https://bgm.tv',
                'referer': `https://bgm.tv/ep/${episodeId}`,
                'x-requested-with': 'XMLHttpRequest',
                'pragma': 'no-cache',
                'cache-control': 'no-cache',
            },
            body: formParams.toString(),
            credentials: 'include'
        })
            .then(res => res.json())
            .then(result => {
                if (!result || result.status !== 'ok') {
                    throw new Error(result);
                }
                return result.posts;
            })
            .then((posts: any) => {
                // we need invalid this cache because this cache doesn't contains our new added comment
                // but the formhash value is still valid. if user don't live current page, they can continue use the formhash
                this._cache.invalidate(`${this._host}/ep/${episodeId}`);
                let formattedPosts: any = {};
                let postId;
                if (posts.main) {
                    postId = Object.keys(posts.main)[0];
                    formattedPosts.type = 'main';
                    formattedPosts.id = postId;
                    formattedPosts.posts = [this.result2Post(posts.main[postId])];
                } else if (posts.sub) {
                    postId = Object.keys(posts.sub)[0];
                    formattedPosts.type = 'sub';
                    formattedPosts.id = postId;
                    formattedPosts.posts = posts.sub[postId].map((po: any) => {
                        return this.result2Post(po, (replyParam as ReplyParameter).post_id);
                    });
                }
                return formattedPosts;
            });
    }

    @Export()
    deleteComment(postId: string, formhash: string, episodeId: number): Promise<any> {
        let searchParams = new URLSearchParams();
        searchParams.set('gh', formhash);
        searchParams.set('ajax', '1');
        return fetch(`${this._host}/erase/reply/ep/${postId}?${searchParams.toString()}`, {
            method: 'GET',
            headers: {
                'accept': 'application/json, text/javascript, */*; q=0.01',
                'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'origin': 'https://bgm.tv',
                'referer': `https://bgm.tv/ep/${episodeId}`,
                'x-requested-with': 'XMLHttpRequest',
                'pragma': 'no-cache',
                'cache-control': 'no-cache',
            },
            credentials: 'include'
        })
            .then(res => res.json())
            .then((result:any) => {
                if (!result || result.status !== 'ok') {
                    throw new Error(result);
                }
                this._cache.invalidate(`${this._host}/ep/${episodeId}`);
                return result;
            });
    }

    @Export()
    getEditComment(postId: string, episodeId: number): Promise<any> {
        return fetch(`${this._host}/subject/ep/edit_reply/${postId}`, {
            method: 'GET',
            headers: {
                'accept': 'application/json, text/javascript, */*; q=0.01',
                'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'origin': 'https://bgm.tv',
                'referer': `https://bgm.tv/ep/${episodeId}`,
                'pragma': 'no-cache',
                'cache-control': 'no-cache',
            },
            credentials: 'include'
        })
            .then(resp => {
                return resp.text();
            })
            .then(htmlContent => {
                const parser = new DOMParser();
                return parser.parseFromString(htmlContent, 'text/html');
            })
            .then(doc => {
                let textarea = doc.querySelector('#content');
                let formhashInput = doc.querySelector('#ModifyReplyForm input[name="formhash"]');
                let formhash;
                if (formhashInput) {
                    formhash = formhashInput.getAttribute('value');
                }
                if(textarea) {
                    return {content: textarea.textContent, formhash: formhash};
                }
                throw new Error('no editor found');
            });
    }

    @Export()
    editComment(postId: string, content: string, formhash: string, episodeId: number) {
        let formParams = new URLSearchParams();
        formParams.set('formhash', formhash);
        formParams.set('content', content);
        formParams.set('submit', '改好了');
        return fetch(`${this._host}/subject/ep/edit_reply/${postId}`, {
            method: 'POST',
            headers: {
                'accept': 'application/json, text/javascript, */*; q=0.01',
                'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'origin': 'https://bgm.tv',
                'referer': `https://bgm.tv/subject/ep/edit_reply/${postId}`,
                'pragma': 'no-cache',
                'cache-control': 'no-cache',
            },
            body: formParams.toString(),
            credentials: 'include',
            redirect: 'manual'
        })
            .then(() => {
                this._cache.invalidate(`${this._host}/ep/${episodeId}`);
                // ignore redirect response
                return {'message': 'ok'};
            });
    }

    private result2Post(resultPost: any, rootPostId?: string): Post {
        return {
            content: resultPost.pst_content,
            author: {
                uid: resultPost.pst_uid,
                username: resultPost.pst_username,
                avatar: resultPost.avatar,
                url: `https://bgm.tv/user/${resultPost.pst_username}`,
                name: resultPost.nickname,
                signature: resultPost.sign
            },
            id: resultPost.pst_id,
            date: moment(resultPost.dateline, 'YYYY-M-D HH:mm').valueOf(),
            is_self: resultPost.is_self,
            subPosts: [],
            replyParameter: {
                topic_id: resultPost.pst_mid,
                post_id: rootPostId || '0',
                sub_reply_id: resultPost.pst_id,
                sub_reply_uid: resultPost.pst_uid,
                post_uid: resultPost.pst_uid,
                sub_post_type: rootPostId ? '0': '1'
            }
        };
    }

    private getReplyParameter(commentBlock: HTMLElement): ReplyParameter | null {
        let replyButton = commentBlock.querySelector('.inner > a.tip_i.icons_cmt');
        if (replyButton) {
            let replyParam: any = {};
            let match = (replyButton.getAttribute('onclick') as string).match(REPLY_HANDLER_PATTERN);
            if (match && match.length > 0) {
                replyParam.topic_id = match[1]; // episode id
                replyParam.post_id = match[2]; // root post id
                replyParam.sub_reply_id = match[3]; // foor root post, this is 0, for sub post, this is the sub post post id
                replyParam.sub_reply_uid = match[4]; // for root post, this is the login user's uid
                replyParam.post_uid = match[5]; // the post author's uid
                replyParam.sub_post_type = match[6]; // for root post, this is 0, for sub post, this is 1
                return replyParam;
            }
            return null;
        }
        return null;
    }

    private processPostContent(content: string): string {
        // add bgm domain to bangumi face.
        content = content.replace(FACE_IMG, '<img src="https://bgm.tv$1" alt="$2">');
        return content;
    }

    private separateQuote(commentBlock: HTMLElement): Quote | null {
        let contentBlock = commentBlock.querySelector('.cmt_sub_content');
        if (contentBlock) {
            let firstElementChild = contentBlock.firstElementChild;
            let quoteBlock = commentBlock.querySelector('.quote');
            if (quoteBlock === firstElementChild && quoteBlock !== null && quoteBlock.children.length === 1) {
                let qElement = quoteBlock.children[0];
                let firstElofQEl = qElement.firstElementChild;
                if (firstElofQEl && firstElofQEl.tagName.toLowerCase() === 'span') {
                    let authorName = firstElofQEl.textContent as string;
                    qElement.removeChild(firstElofQEl);
                    let content = qElement.innerHTML;
                    contentBlock.removeChild(quoteBlock);
                    return {
                        author: authorName,
                        content: content
                    };
                }
            }
        }
        return null;
    }

    private getPostDate(commentBlock: HTMLElement): Moment | null {
        let dateText = (commentBlock.querySelector('.re_info small') as HTMLElement).childNodes[1].textContent;
        if (!dateText) {
            return null;
        }
        let match = dateText.match(POST_DATE_PATTERN);
        if (!match) {
            return null;
        }
        return moment(match[1], 'YYYY-M-D HH:mm');
    }

    private getPostUser(commentBlock: HTMLElement): PostUser {
        let avatar = commentBlock.querySelector('.avatar > .avatarNeue');
        let postUser: any = {};
        if (avatar) {
            let styleAttr = avatar.getAttribute('style');
            if (styleAttr) {
                let match = styleAttr.match(AVATAR_URL_PATTERN);
                if (match && match.length > 1) {
                    postUser.avatar = match[1];
                }
            }
        }
        let userAnchor = commentBlock.querySelector('.inner > strong > a.l');
        if (userAnchor) {
            let href = userAnchor.getAttribute('href') as string;
            postUser.url = `https://bgm.tv${href}`;
            let match = href.match(USER_UID_PATTERN);
            if (match && match.length > 1) {
                postUser.username = match[1];
            }
            postUser.name = userAnchor.textContent;
        }
        let signEl = commentBlock.querySelector('.inner > .tip_j');
        if (signEl && signEl.textContent) {
            postUser.signature = signEl.textContent.substring(1, signEl.textContent.length - 1);
        }
        return postUser;
    }

    private getPostId(commentBlock: HTMLElement): string | null {
        let postIdAttr = commentBlock.getAttribute('id');
        if (!postIdAttr) {
            return null;
        }
        let match = postIdAttr.match(POST_ID_PATTERN);
        if (!match || match.length < 2) {
            return null;
        }
        return match[1];
    }

    private getDocument(url: string): Promise<Document> {
        let cachedDoc = this._cache.getItem(url);
        if (cachedDoc) {
            return Promise.resolve(cachedDoc);
        }
        return fetch(url, {
            method: 'GET',
            headers: {
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
            },
            credentials: 'include'
        }).then(resp => {
            return resp.text();
        }).then(htmlContent => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            this._cache.putItem(url, doc);
            return doc;
        });
    }

}
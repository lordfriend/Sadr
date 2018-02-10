
export function restrictToHttps(data: any): any {
    let dataCopy = Object.assign({}, data);
    function urlCheck(s: string) {
        if (/^(http)\:\/\/(?:lain\.)?(?:bgm|bangumi)\.tv\/.+/i.test(s)) {
            return s.replace(/^(http)/, 'https');
        }
        return s;
    }
    function typeCheck(o: any) {
        if (o && typeof o === 'string') {
            return urlCheck(o);
        } else if (o && Array.isArray(o)){
            for (let i = 0; i < o.length; i++) {
                o[i] = typeCheck(o[i]);
            }
            return o;
        } if (o && typeof o === 'object') {
            return find(o);
        } else {
            return o;
        }
    }
    function find(obj: any) {
        let key: string;
        for (key of Object.keys(obj)) {
            let o = obj[key];
            obj[key] = typeCheck(o);
        }
        return obj;
    }
    return find(dataCopy);
}

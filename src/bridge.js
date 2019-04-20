// const MESSAGE_TYPE_EXT = 'SADR_FROM_EXT';
const MESSAGE_TYPE_PAGE = 'SADR_FROM_PAGE';
window.addEventListener("message", (event) => {
    if (event.source !== window) {
        return;
    }
    let message = event.data;
    if (message && message.type === MESSAGE_TYPE_PAGE && message.extensionId === chrome.runtime.id) {
        chrome.runtime.sendMessage(message, (resp) => {
            window.postMessage(resp, "*");
        });
    }
});
let avatar = document.querySelector('#headerNeue2 .headerNeueInner .idBadgerNeue .avatar');
let randomIdentifier = 'sadr' + Math.floor(Math.random() * 100);
let result = !!avatar;
if (result) {
    const embeddedElement = document.createElement('div');
    embeddedElement.classList.add(`overlay_${randomIdentifier}`);
    embeddedElement.innerHTML = `<div class="tip-container_${randomIdentifier}">登录成功，即将返回...</div>`;

    const embeddedStyle = document.createElement('style');
    embeddedStyle.innerText = `
     .overlay_${randomIdentifier} {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
     }
     .tip-container_${randomIdentifier} {
        position: absolute;
        width: 15em;
        height: 7em;
        background: #cccccc;
        font-size: 1.2em;
        line-height: 7em;
        text-align: center;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        margin: auto;     
     }`;
    document.head.appendChild(embeddedStyle);
    document.body.appendChild(embeddedElement);
}
result;
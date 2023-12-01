import"../sb-preview/runtime.js";(function(){const _=document.createElement("link").relList;if(_&&_.supports&&_.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))l(t);new MutationObserver(t=>{for(const e of t)if(e.type==="childList")for(const o of e.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&l(o)}).observe(document,{childList:!0,subtree:!0});function s(t){const e={};return t.integrity&&(e.integrity=t.integrity),t.referrerPolicy&&(e.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?e.credentials="include":t.crossOrigin==="anonymous"?e.credentials="omit":e.credentials="same-origin",e}function l(t){if(t.ep)return;t.ep=!0;const e=s(t);fetch(t.href,e)}})();const E="modulepreload",d=function(i,_){return new URL(i,_).href},O={},r=function(_,s,l){if(!s||s.length===0)return _();const t=document.getElementsByTagName("link");return Promise.all(s.map(e=>{if(e=d(e,l),e in O)return;O[e]=!0;const o=e.endsWith(".css"),m=o?'[rel="stylesheet"]':"";if(!!l)for(let c=t.length-1;c>=0;c--){const u=t[c];if(u.href===e&&(!o||u.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${e}"]${m}`))return;const n=document.createElement("link");if(n.rel=o?"stylesheet":E,o||(n.as="script",n.crossOrigin=""),n.href=e,document.head.appendChild(n),o)return new Promise((c,u)=>{n.addEventListener("load",c),n.addEventListener("error",()=>u(new Error(`Unable to preload CSS for ${e}`)))})})).then(()=>_()).catch(e=>{const o=new Event("vite:preloadError",{cancelable:!0});if(o.payload=e,window.dispatchEvent(o),!o.defaultPrevented)throw e})},{createBrowserChannel:p}=__STORYBOOK_MODULE_CHANNELS__,{addons:f}=__STORYBOOK_MODULE_PREVIEW_API__,a=p({page:"preview"});f.setChannel(a);window.__STORYBOOK_ADDONS_CHANNEL__=a;window.CONFIG_TYPE==="DEVELOPMENT"&&(window.__STORYBOOK_SERVER_CHANNEL__=a);const R={"./stories/App.stories.tsx":async()=>r(()=>import("./App.stories-tUQ-U3Lz.js"),__vite__mapDeps([0,1,2,3,4,5]),import.meta.url),"./stories/Configure.mdx":async()=>r(()=>import("./Configure-ts_qn_Xc.js"),__vite__mapDeps([6,2,3,4,7,8,9,10,11,12]),import.meta.url),"./stories/Customizer.stories.tsx":async()=>r(()=>import("./Customizer.stories-D4LKVhwh.js"),__vite__mapDeps([13,2,3,4,1,5]),import.meta.url)};async function w(i){return R[i]()}const{composeConfigs:P,PreviewWeb:T,ClientApi:L}=__STORYBOOK_MODULE_PREVIEW_API__,I=async()=>{const i=await Promise.all([r(()=>import("./entry-preview-OIOrqgri.js"),__vite__mapDeps([14,3,4,15,8]),import.meta.url),r(()=>import("./entry-preview-docs-eqAS1v0x.js"),__vite__mapDeps([16,10,4,11,3]),import.meta.url),r(()=>import("./preview-VI2eoWmp.js"),__vite__mapDeps([17,9]),import.meta.url),r(()=>import("./preview-MdDIAybX.js"),__vite__mapDeps([]),import.meta.url),r(()=>import("./preview-OnO0tzRj.js"),__vite__mapDeps([18,11]),import.meta.url),r(()=>import("./preview-wm7zCcxo.js"),__vite__mapDeps([19,11]),import.meta.url),r(()=>import("./preview-MdQXpms2.js"),__vite__mapDeps([]),import.meta.url),r(()=>import("./preview-u8M_OEO2.js"),__vite__mapDeps([20,11]),import.meta.url),r(()=>import("./preview-bEa2SesL.js"),__vite__mapDeps([]),import.meta.url),r(()=>import("./preview-70qxeh8F.js"),__vite__mapDeps([21,4]),import.meta.url),r(()=>import("./preview-HerMgOYB.js"),__vite__mapDeps([]),import.meta.url)]);return P(i)};window.__STORYBOOK_PREVIEW__=window.__STORYBOOK_PREVIEW__||new T;window.__STORYBOOK_STORY_STORE__=window.__STORYBOOK_STORY_STORE__||window.__STORYBOOK_PREVIEW__.storyStore;window.__STORYBOOK_CLIENT_API__=window.__STORYBOOK_CLIENT_API__||new L({storyStore:window.__STORYBOOK_PREVIEW__.storyStore});window.__STORYBOOK_PREVIEW__.initialize({importFn:w,getProjectAnnotations:I});export{r as _};
function __vite__mapDeps(indexes) {
  if (!__vite__mapDeps.viteFileDeps) {
    __vite__mapDeps.viteFileDeps = ["./App.stories-tUQ-U3Lz.js","./App-si5myQQl.js","./jsx-runtime-5BUNAZ9W.js","./index-4g5l5LRQ.js","./_commonjsHelpers-4gQjN7DL.js","./App-Y30YiKkV.css","./Configure-ts_qn_Xc.js","./index-0QjR6uaX.js","./index-jmm5gWkb.js","./index-ogXoivrg.js","./index-MVbLLYTZ.js","./index-PPLHz8o0.js","./index-Dbo06S9W.js","./Customizer.stories-D4LKVhwh.js","./entry-preview-OIOrqgri.js","./react-18-ba7OOUbL.js","./entry-preview-docs-eqAS1v0x.js","./preview-VI2eoWmp.js","./preview-OnO0tzRj.js","./preview-wm7zCcxo.js","./preview-u8M_OEO2.js","./preview-70qxeh8F.js"]
  }
  return indexes.map((i) => __vite__mapDeps.viteFileDeps[i])
}
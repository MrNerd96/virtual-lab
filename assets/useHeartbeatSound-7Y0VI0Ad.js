import{c as y,r as i}from"./index-ppVKw9NX.js";/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const V=y("Droplets",[["path",{d:"M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z",key:"1ptgy4"}],["path",{d:"M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97",key:"1sl1rz"}]]);/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=y("Square",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}]]);/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A=y("Volume2",[["polygon",{points:"11 5 6 9 2 9 2 15 6 15 11 19 11 5",key:"16drj5"}],["path",{d:"M15.54 8.46a5 5 0 0 1 0 7.07",key:"ltjumu"}],["path",{d:"M19.07 4.93a10 10 0 0 1 0 14.14",key:"1kegas"}]]);/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=y("VolumeX",[["polygon",{points:"11 5 6 9 2 9 2 15 6 15 11 19 11 5",key:"16drj5"}],["line",{x1:"22",x2:"16",y1:"9",y2:"15",key:"1ewh16"}],["line",{x1:"16",x2:"22",y1:"9",y2:"15",key:"5ykzw1"}]]);function S(o,c,l){const e=o.currentTime,p=l==="S1"?55:75,t=l==="S1"?.14:.09,u=.01,f=l==="S1"?1:.75,r=o.createOscillator();r.type="sine",r.frequency.setValueAtTime(p,e),r.frequency.exponentialRampToValueAtTime(p*.6,e+t);const a=o.createGain();a.gain.setValueAtTime(0,e),a.gain.linearRampToValueAtTime(f,e+u),a.gain.exponentialRampToValueAtTime(.001,e+t),r.connect(a),a.connect(c),r.start(e),r.stop(e+t+.02);const n=o.createOscillator();n.type="sine";const m=l==="S1"?110:140;n.frequency.setValueAtTime(m,e),n.frequency.exponentialRampToValueAtTime(m*.5,e+t);const s=o.createGain();s.gain.setValueAtTime(0,e),s.gain.linearRampToValueAtTime(f*.2,e+u),s.gain.exponentialRampToValueAtTime(.001,e+t*.7),n.connect(s),s.connect(c),n.start(e),n.stop(e+t+.02)}function R({isRecording:o,phase:c,volume:l,muted:e,silent:p}){const t=i.useRef(null),u=i.useRef(null),f=i.useRef(!1),r=i.useRef(!1),a=i.useCallback(()=>{t.current||(t.current=new(window.AudioContext||window.webkitAudioContext),u.current=t.current.createGain(),u.current.connect(t.current.destination)),t.current.state==="suspended"&&t.current.resume()},[]);return i.useEffect(()=>{var n;u.current&&u.current.gain.setValueAtTime(e?0:l,((n=t.current)==null?void 0:n.currentTime)||0)},[l,e]),i.useEffect(()=>{if(!o||e){f.current=!1,r.current=!1;return}if(c<0||p){f.current=!1,r.current=!1;return}a();const n=t.current,m=u.current;if(!n||!m)return;const s=c>=.14&&c<.2;s&&!f.current&&S(n,m,"S1"),f.current=s;const T=c>=.54&&c<.6;T&&!r.current&&S(n,m,"S2"),r.current=T},[c,o,e,a]),i.useEffect(()=>()=>{t.current&&(t.current.close(),t.current=null)},[]),{ensureAudioContext:a}}export{V as D,k as S,x as V,A as a,R as u};

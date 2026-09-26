'use client';
import {useId,type CSSProperties} from 'react';

/** Separate the source sprite's warm skin pigment from its original facial ink.
 * Both layers retain exactly the same coordinates; no features are redrawn.
 * Work in sRGB so white sclera, cool irises and pink blush stay outside the skin mask.
 */
export function BaseLayer({src,skinFilter='none',part='both',style}:{src:string;skinFilter?:string;part?:'base'|'face'|'both';style?:CSSProperties}){
 const id=useId().replace(/:/g,''),ink=`${id}-ink`,skin=`${id}-skin`,detail=`${id}-detail`;
 return <svg aria-hidden="true" viewBox="0 0 280 460" style={style}>
  <defs>
   <filter id={ink} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
    <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  100 0 -100 0 -13.5" result="warm"/>
    <feComponentTransfer in="warm" result="warm"><feFuncA type="discrete" tableValues="0 1"/></feComponentTransfer>
    <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 100 -100 0 -4" result="peach"/>
    <feComponentTransfer in="peach" result="peach"><feFuncA type="discrete" tableValues="0 1"/></feComponentTransfer>
    <feComposite in="warm" in2="peach" operator="in" result="pigment"/>
    <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -100 100 0 0 38.5" result="notBlush"/>
    <feComponentTransfer in="notBlush" result="notBlush"><feFuncA type="discrete" tableValues="0 1"/></feComponentTransfer>
    <feComposite in="pigment" in2="notBlush" operator="in"/>
   </filter>
   <mask id={skin} maskUnits="userSpaceOnUse" x="0" y="0" width="280" height="460" style={{maskType:'alpha'}}>
    <image href={src} width="280" height="460" preserveAspectRatio="none" filter={`url(#${ink})`}/>
   </mask>
   <mask id={detail} maskUnits="userSpaceOnUse" x="0" y="0" width="280" height="460">
    <rect width="280" height="460" fill="white"/>
    <g style={{filter:'brightness(0)'}}><image href={src} width="280" height="460" preserveAspectRatio="none" filter={`url(#${ink})`}/></g>
   </mask>
  </defs>
  {part!=='face'&&<g mask={`url(#${skin})`} data-base-part="skin"><image href={src} width="280" height="460" preserveAspectRatio="none" style={{filter:skinFilter}}/></g>}
  {part!=='base'&&<image data-base-part="face" href={src} width="280" height="460" preserveAspectRatio="none" mask={`url(#${detail})`}/>}
 </svg>;
}

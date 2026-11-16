import{at as ns,au as _s,av as Bt,aw as zt,ax as _e,ay as Ds,az as It,aA as os,V as D,aB as Is,aC as Ht,aD as kt,t as ke,aE as Ls,aF as De,aG as As,aH as Cs,f as is,r as p,F as ot,a as Ts,aI as Et,aJ as Rs,m as as,D as ls,j as e,v as cs,aK as Lt,i as ds,aL as hs,u as us,x as ps,w as fs,R as te,y as Ns,aM as Wt,A as Os,M as Gs,b as Us,d as Bs,L as Hs,O as ks}from"./index-DlcMC6vA.js";import{T as q,a as ae,L as At}from"./labelFonts-BZidoGJ7.js";const xs=ns>=125?"uv1":"uv2",Ft=new It,Ve=new D;class Ct extends _s{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry";const s=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],i=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],t=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(t),this.setAttribute("position",new Bt(s,3)),this.setAttribute("uv",new Bt(i,2))}applyMatrix4(s){const i=this.attributes.instanceStart,t=this.attributes.instanceEnd;return i!==void 0&&(i.applyMatrix4(s),t.applyMatrix4(s),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(s){let i;s instanceof Float32Array?i=s:Array.isArray(s)&&(i=new Float32Array(s));const t=new zt(i,6,1);return this.setAttribute("instanceStart",new _e(t,3,0)),this.setAttribute("instanceEnd",new _e(t,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(s,i=3){let t;s instanceof Float32Array?t=s:Array.isArray(s)&&(t=new Float32Array(s));const r=new zt(t,i*2,1);return this.setAttribute("instanceColorStart",new _e(r,i,0)),this.setAttribute("instanceColorEnd",new _e(r,i,i)),this}fromWireframeGeometry(s){return this.setPositions(s.attributes.position.array),this}fromEdgesGeometry(s){return this.setPositions(s.attributes.position.array),this}fromMesh(s){return this.fromWireframeGeometry(new Ds(s.geometry)),this}fromLineSegments(s){const i=s.geometry;return this.setPositions(i.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new It);const s=this.attributes.instanceStart,i=this.attributes.instanceEnd;s!==void 0&&i!==void 0&&(this.boundingBox.setFromBufferAttribute(s),Ft.setFromBufferAttribute(i),this.boundingBox.union(Ft))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new os),this.boundingBox===null&&this.computeBoundingBox();const s=this.attributes.instanceStart,i=this.attributes.instanceEnd;if(s!==void 0&&i!==void 0){const t=this.boundingSphere.center;this.boundingBox.getCenter(t);let r=0;for(let a=0,n=s.count;a<n;a++)Ve.fromBufferAttribute(s,a),r=Math.max(r,t.distanceToSquared(Ve)),Ve.fromBufferAttribute(i,a),r=Math.max(r,t.distanceToSquared(Ve));this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(s){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(s)}}class ms extends Ct{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(s){const i=s.length-3,t=new Float32Array(2*i);for(let r=0;r<i;r+=3)t[2*r]=s[r],t[2*r+1]=s[r+1],t[2*r+2]=s[r+2],t[2*r+3]=s[r+3],t[2*r+4]=s[r+4],t[2*r+5]=s[r+5];return super.setPositions(t),this}setColors(s,i=3){const t=s.length-i,r=new Float32Array(2*t);if(i===3)for(let a=0;a<t;a+=i)r[2*a]=s[a],r[2*a+1]=s[a+1],r[2*a+2]=s[a+2],r[2*a+3]=s[a+3],r[2*a+4]=s[a+4],r[2*a+5]=s[a+5];else for(let a=0;a<t;a+=i)r[2*a]=s[a],r[2*a+1]=s[a+1],r[2*a+2]=s[a+2],r[2*a+3]=s[a+3],r[2*a+4]=s[a+4],r[2*a+5]=s[a+5],r[2*a+6]=s[a+6],r[2*a+7]=s[a+7];return super.setColors(r,i),this}fromLine(s){const i=s.geometry;return this.setPositions(i.attributes.position.array),this}}class Tt extends Is{constructor(s){super({type:"LineMaterial",uniforms:Ht.clone(Ht.merge([kt.common,kt.fog,{worldUnits:{value:1},linewidth:{value:1},resolution:{value:new ke(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}}])),vertexShader:`
				#include <common>
				#include <fog_pars_vertex>
				#include <logdepthbuf_pars_vertex>
				#include <clipping_planes_pars_vertex>

				uniform float linewidth;
				uniform vec2 resolution;

				attribute vec3 instanceStart;
				attribute vec3 instanceEnd;

				#ifdef USE_COLOR
					#ifdef USE_LINE_COLOR_ALPHA
						varying vec4 vLineColor;
						attribute vec4 instanceColorStart;
						attribute vec4 instanceColorEnd;
					#else
						varying vec3 vLineColor;
						attribute vec3 instanceColorStart;
						attribute vec3 instanceColorEnd;
					#endif
				#endif

				#ifdef WORLD_UNITS

					varying vec4 worldPos;
					varying vec3 worldStart;
					varying vec3 worldEnd;

					#ifdef USE_DASH

						varying vec2 vUv;

					#endif

				#else

					varying vec2 vUv;

				#endif

				#ifdef USE_DASH

					uniform float dashScale;
					attribute float instanceDistanceStart;
					attribute float instanceDistanceEnd;
					varying float vLineDistance;

				#endif

				void trimSegment( const in vec4 start, inout vec4 end ) {

					// trim end segment so it terminates between the camera plane and the near plane

					// conservative estimate of the near plane
					float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
					float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
					float nearEstimate = - 0.5 * b / a;

					float alpha = ( nearEstimate - start.z ) / ( end.z - start.z );

					end.xyz = mix( start.xyz, end.xyz, alpha );

				}

				void main() {

					#ifdef USE_COLOR

						vLineColor = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

					#endif

					#ifdef USE_DASH

						vLineDistance = ( position.y < 0.5 ) ? dashScale * instanceDistanceStart : dashScale * instanceDistanceEnd;
						vUv = uv;

					#endif

					float aspect = resolution.x / resolution.y;

					// camera space
					vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
					vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

					#ifdef WORLD_UNITS

						worldStart = start.xyz;
						worldEnd = end.xyz;

					#else

						vUv = uv;

					#endif

					// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
					// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
					// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
					// perhaps there is a more elegant solution -- WestLangley

					bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

					if ( perspective ) {

						if ( start.z < 0.0 && end.z >= 0.0 ) {

							trimSegment( start, end );

						} else if ( end.z < 0.0 && start.z >= 0.0 ) {

							trimSegment( end, start );

						}

					}

					// clip space
					vec4 clipStart = projectionMatrix * start;
					vec4 clipEnd = projectionMatrix * end;

					// ndc space
					vec3 ndcStart = clipStart.xyz / clipStart.w;
					vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

					// direction
					vec2 dir = ndcEnd.xy - ndcStart.xy;

					// account for clip-space aspect ratio
					dir.x *= aspect;
					dir = normalize( dir );

					#ifdef WORLD_UNITS

						// get the offset direction as perpendicular to the view vector
						vec3 worldDir = normalize( end.xyz - start.xyz );
						vec3 offset;
						if ( position.y < 0.5 ) {

							offset = normalize( cross( start.xyz, worldDir ) );

						} else {

							offset = normalize( cross( end.xyz, worldDir ) );

						}

						// sign flip
						if ( position.x < 0.0 ) offset *= - 1.0;

						float forwardOffset = dot( worldDir, vec3( 0.0, 0.0, 1.0 ) );

						// don't extend the line if we're rendering dashes because we
						// won't be rendering the endcaps
						#ifndef USE_DASH

							// extend the line bounds to encompass  endcaps
							start.xyz += - worldDir * linewidth * 0.5;
							end.xyz += worldDir * linewidth * 0.5;

							// shift the position of the quad so it hugs the forward edge of the line
							offset.xy -= dir * forwardOffset;
							offset.z += 0.5;

						#endif

						// endcaps
						if ( position.y > 1.0 || position.y < 0.0 ) {

							offset.xy += dir * 2.0 * forwardOffset;

						}

						// adjust for linewidth
						offset *= linewidth * 0.5;

						// set the world position
						worldPos = ( position.y < 0.5 ) ? start : end;
						worldPos.xyz += offset;

						// project the worldpos
						vec4 clip = projectionMatrix * worldPos;

						// shift the depth of the projected points so the line
						// segments overlap neatly
						vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
						clip.z = clipPose.z * clip.w;

					#else

						vec2 offset = vec2( dir.y, - dir.x );
						// undo aspect ratio adjustment
						dir.x /= aspect;
						offset.x /= aspect;

						// sign flip
						if ( position.x < 0.0 ) offset *= - 1.0;

						// endcaps
						if ( position.y < 0.0 ) {

							offset += - dir;

						} else if ( position.y > 1.0 ) {

							offset += dir;

						}

						// adjust for linewidth
						offset *= linewidth;

						// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
						offset /= resolution.y;

						// select end
						vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

						// back to clip space
						offset *= clip.w;

						clip.xy += offset;

					#endif

					gl_Position = clip;

					vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

					#include <logdepthbuf_vertex>
					#include <clipping_planes_vertex>
					#include <fog_vertex>

				}
			`,fragmentShader:`
				uniform vec3 diffuse;
				uniform float opacity;
				uniform float linewidth;

				#ifdef USE_DASH

					uniform float dashOffset;
					uniform float dashSize;
					uniform float gapSize;

				#endif

				varying float vLineDistance;

				#ifdef WORLD_UNITS

					varying vec4 worldPos;
					varying vec3 worldStart;
					varying vec3 worldEnd;

					#ifdef USE_DASH

						varying vec2 vUv;

					#endif

				#else

					varying vec2 vUv;

				#endif

				#include <common>
				#include <fog_pars_fragment>
				#include <logdepthbuf_pars_fragment>
				#include <clipping_planes_pars_fragment>

				#ifdef USE_COLOR
					#ifdef USE_LINE_COLOR_ALPHA
						varying vec4 vLineColor;
					#else
						varying vec3 vLineColor;
					#endif
				#endif

				vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

					float mua;
					float mub;

					vec3 p13 = p1 - p3;
					vec3 p43 = p4 - p3;

					vec3 p21 = p2 - p1;

					float d1343 = dot( p13, p43 );
					float d4321 = dot( p43, p21 );
					float d1321 = dot( p13, p21 );
					float d4343 = dot( p43, p43 );
					float d2121 = dot( p21, p21 );

					float denom = d2121 * d4343 - d4321 * d4321;

					float numer = d1343 * d4321 - d1321 * d4343;

					mua = numer / denom;
					mua = clamp( mua, 0.0, 1.0 );
					mub = ( d1343 + d4321 * ( mua ) ) / d4343;
					mub = clamp( mub, 0.0, 1.0 );

					return vec2( mua, mub );

				}

				void main() {

					#include <clipping_planes_fragment>

					#ifdef USE_DASH

						if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

						if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

					#endif

					float alpha = opacity;

					#ifdef WORLD_UNITS

						// Find the closest points on the view ray and the line segment
						vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
						vec3 lineDir = worldEnd - worldStart;
						vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

						vec3 p1 = worldStart + lineDir * params.x;
						vec3 p2 = rayEnd * params.y;
						vec3 delta = p1 - p2;
						float len = length( delta );
						float norm = len / linewidth;

						#ifndef USE_DASH

							#ifdef USE_ALPHA_TO_COVERAGE

								float dnorm = fwidth( norm );
								alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

							#else

								if ( norm > 0.5 ) {

									discard;

								}

							#endif

						#endif

					#else

						#ifdef USE_ALPHA_TO_COVERAGE

							// artifacts appear on some hardware if a derivative is taken within a conditional
							float a = vUv.x;
							float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
							float len2 = a * a + b * b;
							float dlen = fwidth( len2 );

							if ( abs( vUv.y ) > 1.0 ) {

								alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

							}

						#else

							if ( abs( vUv.y ) > 1.0 ) {

								float a = vUv.x;
								float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
								float len2 = a * a + b * b;

								if ( len2 > 1.0 ) discard;

							}

						#endif

					#endif

					vec4 diffuseColor = vec4( diffuse, alpha );
					#ifdef USE_COLOR
						#ifdef USE_LINE_COLOR_ALPHA
							diffuseColor *= vLineColor;
						#else
							diffuseColor.rgb *= vLineColor;
						#endif
					#endif

					#include <logdepthbuf_fragment>

					gl_FragColor = diffuseColor;

					#include <tonemapping_fragment>
					#include <${ns>=154?"colorspace_fragment":"encodings_fragment"}>
					#include <fog_fragment>
					#include <premultiplied_alpha_fragment>

				}
			`,clipping:!0}),this.isLineMaterial=!0,this.onBeforeCompile=function(){this.transparent?this.defines.USE_LINE_COLOR_ALPHA="1":delete this.defines.USE_LINE_COLOR_ALPHA},Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(i){this.uniforms.diffuse.value=i}},worldUnits:{enumerable:!0,get:function(){return"WORLD_UNITS"in this.defines},set:function(i){i===!0?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(i){this.uniforms.linewidth.value=i}},dashed:{enumerable:!0,get:function(){return"USE_DASH"in this.defines},set(i){!!i!="USE_DASH"in this.defines&&(this.needsUpdate=!0),i===!0?this.defines.USE_DASH="":delete this.defines.USE_DASH}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(i){this.uniforms.dashScale.value=i}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(i){this.uniforms.dashSize.value=i}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(i){this.uniforms.dashOffset.value=i}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(i){this.uniforms.gapSize.value=i}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(i){this.uniforms.opacity.value=i}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(i){this.uniforms.resolution.value.copy(i)}},alphaToCoverage:{enumerable:!0,get:function(){return"USE_ALPHA_TO_COVERAGE"in this.defines},set:function(i){!!i!="USE_ALPHA_TO_COVERAGE"in this.defines&&(this.needsUpdate=!0),i===!0?(this.defines.USE_ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.USE_ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(s)}}const mt=new De,$t=new D,Vt=new D,B=new De,H=new De,se=new De,jt=new D,gt=new Cs,W=new As,Xt=new D,Xe=new It,Ye=new os,re=new De;let ce,be;function Yt(o,s,i){return re.set(0,0,-s,1).applyMatrix4(o.projectionMatrix),re.multiplyScalar(1/re.w),re.x=be/i.width,re.y=be/i.height,re.applyMatrix4(o.projectionMatrixInverse),re.multiplyScalar(1/re.w),Math.abs(Math.max(re.x,re.y))}function Ws(o,s){const i=o.matrixWorld,t=o.geometry,r=t.attributes.instanceStart,a=t.attributes.instanceEnd,n=Math.min(t.instanceCount,r.count);for(let l=0,h=n;l<h;l++){W.start.fromBufferAttribute(r,l),W.end.fromBufferAttribute(a,l),W.applyMatrix4(i);const c=new D,d=new D;ce.distanceSqToSegment(W.start,W.end,d,c),d.distanceTo(c)<be*.5&&s.push({point:d,pointOnLine:c,distance:ce.origin.distanceTo(d),object:o,face:null,faceIndex:l,uv:null,[xs]:null})}}function Fs(o,s,i){const t=s.projectionMatrix,a=o.material.resolution,n=o.matrixWorld,l=o.geometry,h=l.attributes.instanceStart,c=l.attributes.instanceEnd,d=Math.min(l.instanceCount,h.count),f=-s.near;ce.at(1,se),se.w=1,se.applyMatrix4(s.matrixWorldInverse),se.applyMatrix4(t),se.multiplyScalar(1/se.w),se.x*=a.x/2,se.y*=a.y/2,se.z=0,jt.copy(se),gt.multiplyMatrices(s.matrixWorldInverse,n);for(let b=0,U=d;b<U;b++){if(B.fromBufferAttribute(h,b),H.fromBufferAttribute(c,b),B.w=1,H.w=1,B.applyMatrix4(gt),H.applyMatrix4(gt),B.z>f&&H.z>f)continue;if(B.z>f){const S=B.z-H.z,G=(B.z-f)/S;B.lerp(H,G)}else if(H.z>f){const S=H.z-B.z,G=(H.z-f)/S;H.lerp(B,G)}B.applyMatrix4(t),H.applyMatrix4(t),B.multiplyScalar(1/B.w),H.multiplyScalar(1/H.w),B.x*=a.x/2,B.y*=a.y/2,H.x*=a.x/2,H.y*=a.y/2,W.start.copy(B),W.start.z=0,W.end.copy(H),W.end.z=0;const x=W.closestPointToPointParameter(jt,!0);W.at(x,Xt);const w=is.lerp(B.z,H.z,x),F=w>=-1&&w<=1,Z=jt.distanceTo(Xt)<be*.5;if(F&&Z){W.start.fromBufferAttribute(h,b),W.end.fromBufferAttribute(c,b),W.start.applyMatrix4(n),W.end.applyMatrix4(n);const S=new D,G=new D;ce.distanceSqToSegment(W.start,W.end,G,S),i.push({point:G,pointOnLine:S,distance:ce.origin.distanceTo(G),object:o,face:null,faceIndex:b,uv:null,[xs]:null})}}}class js extends Ls{constructor(s=new Ct,i=new Tt({color:Math.random()*16777215})){super(s,i),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){const s=this.geometry,i=s.attributes.instanceStart,t=s.attributes.instanceEnd,r=new Float32Array(2*i.count);for(let n=0,l=0,h=i.count;n<h;n++,l+=2)$t.fromBufferAttribute(i,n),Vt.fromBufferAttribute(t,n),r[l]=l===0?0:r[l-1],r[l+1]=r[l]+$t.distanceTo(Vt);const a=new zt(r,2,1);return s.setAttribute("instanceDistanceStart",new _e(a,1,0)),s.setAttribute("instanceDistanceEnd",new _e(a,1,1)),this}raycast(s,i){const t=this.material.worldUnits,r=s.camera;r===null&&!t&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');const a=s.params.Line2!==void 0&&s.params.Line2.threshold||0;ce=s.ray;const n=this.matrixWorld,l=this.geometry,h=this.material;be=h.linewidth+a,l.boundingSphere===null&&l.computeBoundingSphere(),Ye.copy(l.boundingSphere).applyMatrix4(n);let c;if(t)c=be*.5;else{const f=Math.max(r.near,Ye.distanceToPoint(ce.origin));c=Yt(r,f,h.resolution)}if(Ye.radius+=c,ce.intersectsSphere(Ye)===!1)return;l.boundingBox===null&&l.computeBoundingBox(),Xe.copy(l.boundingBox).applyMatrix4(n);let d;if(t)d=be*.5;else{const f=Math.max(r.near,Xe.distanceToPoint(ce.origin));d=Yt(r,f,h.resolution)}Xe.expandByScalar(d),ce.intersectsBox(Xe)!==!1&&(t?Ws(this,i):Fs(this,r,i))}onBeforeRender(s){const i=this.material.uniforms;i&&i.resolution&&(s.getViewport(mt),this.material.uniforms.resolution.value.set(mt.z,mt.w))}}class $s extends js{constructor(s=new ms,i=new Tt({color:Math.random()*16777215})){super(s,i),this.isLine2=!0,this.type="Line2"}}const Vs=p.forwardRef(function({points:s,color:i=16777215,vertexColors:t,linewidth:r,lineWidth:a,segments:n,dashed:l,...h},c){var d,f;const b=ot(F=>F.size),U=p.useMemo(()=>n?new js:new $s,[n]),[E]=p.useState(()=>new Tt),x=(t==null||(d=t[0])==null?void 0:d.length)===4?4:3,w=p.useMemo(()=>{const F=n?new Ct:new ms,Z=s.map(S=>{const G=Array.isArray(S);return S instanceof D||S instanceof De?[S.x,S.y,S.z]:S instanceof ke?[S.x,S.y,0]:G&&S.length===3?[S[0],S[1],S[2]]:G&&S.length===2?[S[0],S[1],0]:S});if(F.setPositions(Z.flat()),t){i=16777215;const S=t.map(G=>G instanceof Ts?G.toArray():G);F.setColors(S.flat(),x)}return F},[s,n,t,x]);return p.useLayoutEffect(()=>{U.computeLineDistances()},[s,U]),p.useLayoutEffect(()=>{l?E.defines.USE_DASH="":delete E.defines.USE_DASH,E.needsUpdate=!0},[l,E]),p.useEffect(()=>()=>{w.dispose(),E.dispose()},[w]),p.createElement("primitive",Et({object:U,ref:c},h),p.createElement("primitive",{object:w,attach:"geometry"}),p.createElement("primitive",Et({object:E,attach:"material",color:i,vertexColors:!!t,resolution:[b.width,b.height],linewidth:(f=r??a)!==null&&f!==void 0?f:1,dashed:l,transparent:x===4},h)))}),Pt=p.forwardRef(({threshold:o=15,geometry:s,...i},t)=>{const r=p.useRef(null);p.useImperativeHandle(t,()=>r.current,[]);const a=p.useMemo(()=>[0,0,0,1,0,0],[]),n=p.useRef(),l=p.useRef();return p.useLayoutEffect(()=>{const h=r.current.parent,c=s??(h==null?void 0:h.geometry);if(!c||n.current===c&&l.current===o)return;n.current=c,l.current=o;const f=new Rs(c,o).attributes.position.array;r.current.geometry.setPositions(f),r.current.geometry.attributes.instanceStart.needsUpdate=!0,r.current.geometry.attributes.instanceEnd.needsUpdate=!0,r.current.computeLineDistances()}),p.createElement(Vs,Et({segments:!0,points:a,ref:r,raycast:()=>null},i))}),Xs={rbc:{bulbLen:2.2,bulbR:.4,bore:.03,bead:[.2,.1],beadColor:"#8b1a1a",topMark:"101",mouth:"#e11d27"},wbc:{bulbLen:1.8,bulbR:.33,bore:.06,bead:[.15,.095],beadColor:"#f8fafc",topMark:"11",mouth:"#f4f4f5"}},ie=.2,Ke=.5,ne=6,Ys=1.7,bt=.7,he=.25,_t="#1e3a8a",le="#3b82f6",Ie=({points:o,x0:s,children:i,userData:t})=>{const r=p.useMemo(()=>new cs(o.map(([a,n])=>new ke(a,n)),48),[o]);return e.jsx("mesh",{geometry:r,position:[s,0,0],rotation:[0,0,-Math.PI/2],userData:t,children:i})},Ks=o=>{for(let s=o;s;s=s.parent)if(s.userData.part)return s.userData;return null},Kt=o=>{var i;const s=o.intersections.map(t=>Ks(t.object)).filter(t=>!!t);return((i=s.find(t=>!t.glass)??s[0])==null?void 0:i.part)??null},qe=({lit:o})=>e.jsx("meshPhysicalMaterial",{color:o?le:"#ffffff",transparent:!0,opacity:o?.6:.22,roughness:.03,metalness:0,clearcoat:1,envMapIntensity:1.6,side:Lt,depthWrite:!1,emissive:o?le:"#000000",emissiveIntensity:o?.7:0}),yt=({at:o,children:s,lit:i})=>e.jsx(q,{font:ae,position:[o,0,ie+.012],rotation:[0,0,-Math.PI/2],fontSize:.22,color:i?le:_t,anchorX:"center",anchorY:"middle",children:s}),qt=({kind:o,active:s,onHover:i,onSelect:t})=>{const r=Xs[o],a=ne+r.bulbLen,n=a+.3,l=a+Ys,h=-l/2-.6,c=x=>h+x,d=x=>s===x,f=p.useMemo(()=>{const x=[];for(let w=0;w<=40;w++){const F=w/40;x.push([ie+(r.bulbR-ie)*Math.pow(Math.sin(Math.PI*F),1.6),ne+r.bulbLen*F])}return{tip:[[.05,0],[.12,Ke*.6],[ie,Ke]],stem:[[ie,Ke],[ie,ne]],bulb:x,neck:[[ie,a],[ie,l]],sleeve:[[he+.03,l-bt],[he,l-bt+.12],[he,l+.05]]}},[r.bulbLen,r.bulbR,a,l]),b=p.useMemo(()=>{const x=c(l),w=new as([new D(x,0,0),new D(x+.9,0,-.05),new D(x+1.7,-.5,-.1),new D(x+1.75,-1.5,0),new D(x+.8,-2.1,.15),new D(x-1.6,-2.25,.15),new D(x-4.2,-2.05,0)]),F=w.getPoint(1),Z=w.getTangent(1);return{geometry:new ls(w,120,he*.76,16,!1),end:F,angle:Math.atan2(Z.y,Z.x)}},[l,h]),U=Array.from({length:10},(x,w)=>(w+1)*(ne/10)),E=(x,w)=>e.jsxs("mesh",{position:[c((x+w)/2),0,-.07],children:[e.jsx("boxGeometry",{args:[w-x,.3,.05]}),e.jsx("meshStandardMaterial",{color:"#ffffff",roughness:.55})]});return e.jsxs("group",{onPointerMove:x=>{x.stopPropagation(),i(Kt(x))},onPointerOut:()=>i(null),onClick:x=>{x.stopPropagation();const w=Kt(x);w&&t(w)},children:[e.jsx(Ie,{points:f.tip,x0:h,userData:{part:"tip",glass:!0},children:e.jsx(qe,{lit:d("tip")})}),e.jsx(Ie,{points:f.stem,x0:h,userData:{part:"stem",glass:!0},children:e.jsx(qe,{lit:d("stem")})}),e.jsx(Ie,{points:f.bulb,x0:h,userData:{part:"bulb",glass:!0},children:e.jsx(qe,{lit:d("bulb")})}),e.jsx(Ie,{points:f.neck,x0:h,userData:{part:"top-mark",glass:!0},children:e.jsx(qe,{lit:d("top-mark")})}),E(Ke*.8,ne),E(a,l-bt),e.jsxs("mesh",{position:[c(ne/2+.1),0,0],rotation:[0,0,Math.PI/2],userData:{part:"stem"},children:[e.jsx("cylinderGeometry",{args:[r.bore,r.bore,ne-.2,12]}),e.jsx("meshStandardMaterial",{color:d("stem")?le:"#9aa9b8"})]}),e.jsxs("group",{userData:{part:"marks"},children:[U.map(x=>e.jsx("group",{position:[c(x),0,0],rotation:[0,Math.PI/2,0],children:e.jsxs("mesh",{rotation:[0,0,Math.PI/2],children:[e.jsx("torusGeometry",{args:[ie+.004,.009,4,24,Math.PI]}),e.jsx("meshBasicMaterial",{color:d("marks")?le:_t})]})},x)),e.jsx(yt,{at:c(ne/2-.22),lit:d("marks"),children:"0.5"}),e.jsx(yt,{at:c(ne-.2),lit:d("marks"),children:"1"})]}),e.jsxs("group",{userData:{part:"top-mark"},children:[e.jsx("group",{position:[c(n),0,0],rotation:[0,Math.PI/2,0],children:e.jsxs("mesh",{rotation:[0,0,Math.PI/2],children:[e.jsx("torusGeometry",{args:[ie+.004,.009,4,24,Math.PI]}),e.jsx("meshBasicMaterial",{color:d("top-mark")?le:_t})]})}),e.jsx(yt,{at:c(n+.26),lit:d("top-mark"),children:r.topMark})]}),e.jsxs("mesh",{position:[c(ne+r.bulbLen*.5),-(r.bulbR-r.bead[1]-.06),0],scale:[r.bead[0],r.bead[1],r.bead[1]],userData:{part:"bead"},children:[e.jsx("sphereGeometry",{args:[1,32,24]}),e.jsx("meshStandardMaterial",{color:r.beadColor,roughness:.3,emissive:d("bead")?le:"#000000",emissiveIntensity:d("bead")?.6:0})]}),e.jsxs("group",{userData:{part:"tube"},children:[e.jsx(Ie,{points:f.sleeve,x0:h,children:e.jsx(Zt,{lit:d("tube")})}),e.jsx("mesh",{geometry:b.geometry,children:e.jsx(Zt,{lit:d("tube")})})]}),e.jsxs("group",{position:[b.end.x,b.end.y,b.end.z],rotation:[0,0,b.angle-Math.PI/2],userData:{part:"mouthpiece"},children:[e.jsxs("mesh",{position:[0,.08,0],children:[e.jsx("cylinderGeometry",{args:[he*1.15,he*1.15,.16,24]}),e.jsx("meshStandardMaterial",{color:d("mouthpiece")?le:r.mouth,roughness:.35})]}),e.jsxs("mesh",{position:[0,.42,0],children:[e.jsx("cylinderGeometry",{args:[he*.95,he*.8,.55,24]}),e.jsx("meshStandardMaterial",{color:d("mouthpiece")?le:r.mouth,roughness:.35})]})]})]})},Zt=({lit:o})=>e.jsx("meshPhysicalMaterial",{color:o?le:"#e3d6b4",roughness:.4,transparent:!0,opacity:.82,clearcoat:.4}),Ze=75,Jt=33,Le=6,vt=3,Je=1,qs=7.6,Zs="#2f3f9e",Qe=.02,et=o=>({polygonOffset:!0,polygonOffsetFactor:-o,polygonOffsetUnits:-4*o}),fe="#3b82f6",Js=(()=>{let o=null;return()=>{if(o)return o;const s=2048,i=s/3,t=document.createElement("canvas");t.width=t.height=s;const r=t.getContext("2d");r.strokeStyle="rgba(15, 23, 42, 0.85)";const a=(l,h,c,d,f)=>{r.lineWidth=f,r.beginPath(),r.moveTo(l*i,h*i),r.lineTo(c*i,d*i),r.stroke()},n=(l,h,c,d)=>{for(const f of[-.0125,0,.0125])h?a(l+f,c,l+f,d,3):a(c,l+f,d,l+f,3)};for(let l=0;l<=3;l++)n(l,!0,0,3),n(l,!1,0,3);for(const[l,h]of[[0,0],[2,0],[0,2],[2,2]])for(let c=1;c<4;c++)a(l+c/4,h,l+c/4,h+1,2.5),a(l,h+c/4,l+1,h+c/4,2.5);for(let l=1;l<5;l++)n(1+l/5,!0,0,3),n(1+l/5,!1,0,3);for(let l=1;l<20;l++)l%4!==0&&(a(1+l/20,1,1+l/20,2,1.5),a(1,1+l/20,2,1+l/20,1.5));for(let l=1;l<4;l++)a(1,l/4,2,l/4,2.5),a(1,2+l/4,2,2+l/4,2.5),a(l/4,1,l/4,2,2.5),a(2+l/4,1,2+l/4,2,2.5);return o=new ds(t),o.anisotropy=8,o.colorSpace=hs,o}})(),Qs=o=>{for(let s=o;s;s=s.parent)if(s.userData.part)return s.userData;return null},Qt=o=>{var i;const s=o.intersections.map(t=>Qs(t.object)).filter(t=>!!t);return((i=s.find(t=>!t.glass)??s[0])==null?void 0:i.part)??null},tt=({lit:o,opacity:s=.38})=>e.jsx("meshPhysicalMaterial",{color:o?fe:"#fbf1f7",transparent:!0,opacity:o?.6:s,roughness:.06,metalness:0,clearcoat:1,envMapIntensity:1.4,depthWrite:!1,emissive:o?fe:"#000000",emissiveIntensity:o?.6:0}),st=({x:o,y:s,z:i,children:t,part:r})=>e.jsxs("mesh",{position:[(o[0]+o[1])/2,(s[0]+s[1])/2,(i[0]+i[1])/2],userData:r,children:[e.jsx("boxGeometry",{args:[o[1]-o[0],s[1]-s[0],i[1]-i[0]]}),t]}),Mt=({x:o,z:s,size:i,lit:t,children:r})=>e.jsx(q,{font:At,position:[o,.05,s],rotation:[-Math.PI/2,0,0],fontSize:i,color:t?fe:Zs,anchorX:"center",anchorY:"middle",textAlign:"center",lineHeight:1.15,children:r}),er=({active:o,onHover:s,onSelect:i})=>{const t=c=>o===c,r=p.useMemo(Js,[]),a=Le+vt,n=Jt/2,l=-.1,h=-1;return e.jsxs("group",{onPointerMove:c=>{c.stopPropagation(),s(Qt(c))},onPointerOut:()=>s(null),onClick:c=>{c.stopPropagation();const d=Qt(c);d&&i(d)},children:[e.jsx(st,{x:[-Ze/2,Ze/2],y:[-4,h],z:[-n,n],part:{part:"slide",glass:!0},children:e.jsx(tt,{lit:t("slide")})}),[-1,1].map(c=>e.jsx(st,{x:c<0?[-Ze/2,-a]:[a,Ze/2],y:[h,0],z:[-n,n],part:{part:"platforms",glass:!0},children:e.jsx(tt,{lit:t("platforms")})},c)),[-1,1].map(c=>e.jsx(st,{x:[-Le,Le],y:[h,l],z:c<0?[-n,-Je]:[Je,n],part:{part:"central",glass:!0},children:e.jsx(tt,{lit:t("central")})},c)),[-1,1].map(c=>e.jsxs("mesh",{position:[0,l+Qe,c*(Je+6.5)],rotation:[-Math.PI/2,0,0],userData:{part:"central"},children:[e.jsx("planeGeometry",{args:[7,12.6]}),e.jsx("meshStandardMaterial",{color:t("central")?fe:"#a7afb4",metalness:.85,roughness:.28,...et(1)})]},c)),[-1,1].map(c=>e.jsxs("mesh",{position:[0,l+2*Qe,c*qs],rotation:[-Math.PI/2,0,0],userData:{part:"grid"},children:[e.jsx("planeGeometry",{args:[3,3]}),e.jsx("meshBasicMaterial",{map:r,transparent:!0,color:t("grid")?fe:"#ffffff",...et(2)})]},c)),e.jsxs("group",{userData:{part:"moats"},children:[[-1,1].map(c=>e.jsxs("mesh",{position:[c*(Le+vt/2),h+Qe,0],rotation:[-Math.PI/2,0,0],children:[e.jsx("planeGeometry",{args:[vt,Jt]}),e.jsx("meshStandardMaterial",{color:t("moats")?fe:"#ece6ea",roughness:.95,transparent:!0,opacity:.65,...et(1)})]},c)),e.jsxs("mesh",{position:[0,h+Qe,0],rotation:[-Math.PI/2,0,0],children:[e.jsx("planeGeometry",{args:[Le*2,Je*2]}),e.jsx("meshStandardMaterial",{color:t("moats")?fe:"#ece6ea",roughness:.95,transparent:!0,opacity:.65,...et(1)})]})]}),e.jsxs("group",{userData:{part:"print"},children:[e.jsx(Mt,{x:-23,z:-6,size:2.4,lit:t("print"),children:`Tiefe
Depth
Profondeur
0.100mm`}),e.jsx(Mt,{x:-23,z:11,size:2.4,lit:t("print"),children:"0.0025mm²"}),e.jsx(Mt,{x:23,z:-7,size:2.2,lit:t("print"),children:`NEUBAUER
IMPROVED
BRIGHT-LINE`})]}),e.jsxs(st,{x:[-11,11],y:[0,.4],z:[-11,11],part:{part:"coverslip",glass:!0},children:[e.jsx(tt,{lit:t("coverslip"),opacity:.18}),e.jsx(Pt,{color:t("coverslip")?fe:"#8fa0b4",lineWidth:t("coverslip")?2.5:1.5})]})]})},at=[.12,.25,1.25,2.5,12.5,25,320,640],tr=8,we=7.5,Q=15,lt=7.56,sr=2*Math.PI*we*10,v={w:19,h:19,d:19,y0:1.2},gs=v.y0+v.h,K=gs+.6,oe=v.d/2,it=K+3,bs=9,Ae=it+bs+Q+2.5,k=new D(21,34.5,lt+.32),Ce=k.x,Be=2.2,Dt=3,He="#3b82f6",ze=-2.35,St=.6+ze,ye=1536,ct=ye/(2*Math.PI*lt),ge=Math.round(Q*ct),es=Math.round(1.2*ct),rr=o=>{o.globalCompositeOperation="source-over",o.fillStyle="#17150f",o.fillRect(0,0,ye,ge);for(let s=0;s<260;s++){const i=Math.random()*ye,t=Math.random()*ge,r=8+Math.random()*60,a=o.createRadialGradient(i,t,0,i,t,r),n=Math.random()<.5?"40,36,28":"6,6,5";a.addColorStop(0,`rgba(${n},${.08+Math.random()*.1})`),a.addColorStop(1,`rgba(${n},0)`),o.fillStyle=a,o.fillRect(i-r,t-r,2*r,2*r)}for(let s=0;s<9e3;s++)o.fillStyle=Math.random()<.5?"rgba(60,55,45,0.25)":"rgba(0,0,0,0.3)",o.fillRect(Math.random()*ye,Math.random()*ge,1.2,1.2);o.fillStyle="rgba(0,0,0,0.35)",o.fillRect(0,0,es,ge),o.fillStyle="rgba(120,112,95,0.55)",o.fillRect(es-2,0,2,ge)},nr=o=>{const s=o-.01;return s<=0||s>=.09?0:s<.04?Dt*Math.sin(Math.PI/2*(s/.04))**2:Dt*Math.cos(Math.PI/2*((s-.04)/.05))**2},or=()=>{const[o,s]=p.useState({on:!1,speed:6,clutch:!0,lift:3.5,leverOn:!0,contactStim:!1}),i=p.useRef([]),t=p.useRef(0),[r,a]=p.useState(0),n=p.useCallback(h=>s(c=>({...c,...h})),[]),l=p.useCallback(()=>{i.current.push(t.current)},[]);return{state:o,set:n,stimulate:l,stimuli:i,clock:t,paperKey:r,newPaper:()=>a(h=>h+1)}},ys=o=>o.on&&o.clutch&&o.speed!==tr,ir=o=>{for(let s=o;s;s=s.parent)if(s.userData.part)return s.userData.part;return null},ts=o=>{for(const s of o.intersections){const i=ir(s.object);if(i)return i}return null},O=({lit:o,color:s,metal:i=.3,rough:t=.55})=>e.jsx("meshStandardMaterial",{color:o?He:s,metalness:o?.1:i,roughness:t,emissive:o?He:"#000000",emissiveIntensity:o?.35:0}),T=({lit:o})=>e.jsx(O,{lit:o,color:"#dfe3e7",metal:1,rough:.15}),Te=({lit:o})=>e.jsx(O,{lit:o,color:"#c9cdd1",metal:.85,rough:.35}),Re=({lit:o})=>e.jsx(O,{lit:o,color:"#c9a24a",metal:.9,rough:.3}),de=({lit:o})=>e.jsx(O,{lit:o,color:"#1d1f22",metal:.2,rough:.45}),rt=({lit:o})=>e.jsx(O,{lit:o,color:"#ecebe5",metal:.05,rough:.45}),I=({r:o,h:s,pos:i,rot:t,seg:r=32,r2:a,children:n})=>e.jsxs("mesh",{position:i,rotation:t,children:[e.jsx("cylinderGeometry",{args:[a??o,o,s,r]}),n]}),z=({size:o,pos:s,rot:i,children:t})=>e.jsxs("mesh",{position:s,rotation:i,children:[e.jsx("boxGeometry",{args:o}),t]}),Ne=({r:o,h:s,pos:i,rot:t,lit:r,color:a="#dfe3e7"})=>{const n=p.useMemo(()=>{const l=[];for(let d=0;d<=80;d++){const f=d/80*Math.PI*2,b=d%2?o:o*.92;l.push(new ke(Math.cos(f)*b,Math.sin(f)*b))}const c=new ps(new fs(l),{depth:s,bevelEnabled:!0,bevelSize:o*.04,bevelThickness:o*.04,bevelSegments:1});return c.translate(0,0,-s/2),c.rotateX(Math.PI/2),c},[o,s]);return e.jsx("mesh",{geometry:n,position:i,rotation:t,children:e.jsx(O,{lit:r,color:a,metal:.9,rough:.3})})},Oe=({w:o,h:s,lit:i})=>e.jsx(e.Fragment,{children:[[-1,-1],[1,-1],[-1,1],[1,1]].map(([t,r],a)=>e.jsxs("mesh",{position:[t*(o/2-.9),r*(s/2-.9),.02],scale:[1,1,.45],children:[e.jsx("sphereGeometry",{args:[.32,14,8,0,Math.PI*2,0,Math.PI/2]}),e.jsx(O,{lit:i,color:"#9aa0a6",metal:.9,rough:.3})]},a))}),ar=16.9,lr=.72,Ge=o=>ar-o*lr,cr=({active:o,onHover:s,onSelect:i,kymo:t})=>{const r=u=>o===u,{state:a,stimuli:n,clock:l,paperKey:h}=t,c=p.useRef(a);c.current=a;const d=p.useMemo(()=>{const u=document.createElement("canvas");return u.width=ye,u.height=ge,u},[]),f=p.useMemo(()=>{const u=new ds(d);return u.colorSpace=hs,u.anisotropy=8,u},[d]),b=p.useRef(null);p.useMemo(()=>{rr(d.getContext("2d")),f.needsUpdate=!0,b.current=null},[h,d,f]);const U=p.useRef(null),E=p.useRef(null),x=p.useRef(null),w=p.useRef(null),F=p.useRef(null),Z=p.useRef(null),S=p.useRef(null),G=p.useRef(null),dt=p.useRef(null),ht=p.useRef(null),ut=p.useRef(null),vs=p.useRef({phi:0,rate:0,lift:a.lift,swing:0,slot:Ge(a.speed),clutch:1,t:performance.now()/1e3,flash:0,dirty:0});us(()=>{const u=vs.current,C=c.current,ee=d.getContext("2d"),Nt=performance.now()/1e3,Me=Math.min(.1,Nt-u.t);u.t=Nt;const pt=l.current+Me,Ms=ys(C)?at[C.speed]/10/we:0,We=$=>Math.min(1,Me*$);u.lift+=(C.lift-u.lift)*We(6),u.swing+=((C.leverOn?0:1)-u.swing)*We(5),u.slot+=(Ge(C.speed)-u.slot)*We(12),u.clutch+=((C.clutch?1:0)-u.clutch)*We(10),ee.strokeStyle="rgba(236,230,214,0.92)",ee.lineWidth=2.2,ee.lineCap="round",ee.lineJoin="round",ee.beginPath();let ft=!1;const Ot=Math.max(1,Math.ceil(Me/.002)),xt=Me/Ot;let Fe=0;for(let $=1;$<=Ot;$++){const Ut=pt-Me+$*xt;u.rate+=(Ms-u.rate)*Math.min(1,xt*8),u.rate<1e-5&&(u.rate=0);const ws=u.phi;if(u.phi-=u.rate*xt,u.rate>0&&Math.floor((-ws-St+ze)/(2*Math.PI))!==Math.floor((-u.phi-St+ze)/(2*Math.PI))&&(u.flash=1,C.contactStim&&n.current.push(Ut)),Fe=Math.min(n.current.reduce((Es,Ps)=>Es+nr(Ut-Ps),0),Dt*1.6),u.swing>.04){b.current=null;continue}const zs=k.y+Fe,Se=(it+u.lift+Q-zs)*ct,$e=(-u.phi%(2*Math.PI)+2*Math.PI)%(2*Math.PI)/(2*Math.PI)*ye;if(Se<2||Se>ge-2){b.current=null;continue}const xe=b.current;xe&&Math.abs($e-xe.u)<ye/2&&Math.abs(Se-xe.v)<1.5*ct&&(Math.abs($e-xe.u)>.05||Math.abs(Se-xe.v)>.05)&&(ee.moveTo(xe.u,xe.v),ee.lineTo($e,Se),ft=!0),b.current={u:$e,v:Se}}ft&&(ee.stroke(),u.dirty++),u.dirty&&(u.dirty>1||!ft)&&(f.needsUpdate=!0,u.dirty=0),n.current=n.current.filter($=>pt-$<.2),l.current=pt,U.current&&(U.current.rotation.y=u.phi),E.current&&(E.current.position.y=it+u.lift),w.current&&(w.current.rotation.y=u.swing*.07),x.current&&(x.current.rotation.z=-Math.asin(Fe/Ce)),S.current&&(S.current.position.y=u.slot),G.current&&(G.current.rotation.z=.7-1.4*(1-u.clutch)),dt.current&&(dt.current.rotation.x=C.on?-.22:.22);const Gt=Fe*Be/Ce,Ss=k.y-.3-Gt;if(Z.current){const $=Ss-wt;Z.current.scale.y=$,Z.current.position.y=wt+$/2}if(F.current){const $=Gt/Ee;F.current.scale.set(1+$*2.5,1-$,1+$*2.5)}ht.current&&(ht.current.emissiveIntensity=C.on?1.6:0),u.flash=Math.max(0,u.flash-Me*8),ut.current&&(ut.current.emissiveIntensity=u.flash*3)});const Rt=[Math.sin(ze),Math.cos(ze)];return e.jsxs("group",{onPointerMove:u=>{u.stopPropagation(),s(ts(u))},onPointerOut:()=>s(null),onClick:u=>{u.stopPropagation();const C=ts(u);C&&i(C)},children:[e.jsxs("mesh",{position:[7,-.5,2],children:[e.jsx("boxGeometry",{args:[60,1,38]}),e.jsx("meshStandardMaterial",{color:"#8a6a4a",roughness:.8})]}),e.jsxs("group",{userData:{part:"base"},children:[e.jsx(z,{size:[v.w,v.h,v.d],pos:[0,v.y0+v.h/2,0],children:e.jsx(rt,{lit:r("base")})}),e.jsx(z,{size:[v.w+.6,.6,v.d+.6],pos:[0,gs+.3,0],children:e.jsx(rt,{lit:r("base")})}),e.jsx(z,{size:[v.w+.3,.5,v.d+.3],pos:[0,v.y0+.25,0],children:e.jsx(rt,{lit:r("base")})}),[[-1,-1],[1,-1],[-1,1],[1,1]].map(([u,C],ee)=>e.jsx(I,{r:1.1,r2:1.2,h:1.2,pos:[u*(v.w/2-1.8),.6,C*(v.d/2-1.8)],children:e.jsx(de,{lit:r("base")})},ee)),e.jsx("group",{position:[0,v.y0+v.h/2,oe+.01],children:e.jsx(Oe,{w:v.w,h:v.h,lit:r("base")})}),e.jsx("group",{position:[v.w/2+.01,v.y0+v.h/2,0],rotation:[0,Math.PI/2,0],children:e.jsx(Oe,{w:v.d,h:v.h,lit:r("base")})}),e.jsx("group",{position:[-19/2-.01,v.y0+v.h/2,0],rotation:[0,-Math.PI/2,0],children:e.jsx(Oe,{w:v.d,h:v.h,lit:r("base")})}),e.jsx("group",{position:[0,K+.01,0],rotation:[-Math.PI/2,0,0],children:e.jsx(Oe,{w:v.w+.6,h:v.d+.6,lit:r("base")})}),[-1,1].map(u=>[0,1,2,3,4,5].map(C=>e.jsx(z,{size:[.35,.45,4.2],pos:[-19/2-.12,v.y0+5+C*1.3,u*3.2],rot:[0,0,.5],children:e.jsx(rt,{lit:r("base")})},`${u}${C}`))),e.jsx(Ne,{r:.6,h:.7,pos:[6.5,K+.35,6],lit:r("base")})]}),e.jsxs("group",{userData:{part:"speed"},children:[e.jsxs("group",{position:[0,14,oe+.06],children:[e.jsx(z,{size:[5.8,10.4,.12],pos:[0,0,0],children:e.jsx(O,{lit:r("speed"),color:"#141517",metal:.3,rough:.5})}),e.jsx(Oe,{w:5.8,h:10.4,lit:r("speed")}),e.jsx(q,{font:ae,position:[0,4.5,.08],fontSize:.36,color:"#f2d84b",anchorX:"center",anchorY:"middle",children:"SPEED MM PER SEC."}),e.jsx(q,{font:ae,position:[0,3.95,.08],fontSize:.3,color:"#f2d84b",anchorX:"center",anchorY:"middle",children:'WITH 6" DIA CYLINDER'}),e.jsx(q,{font:ae,position:[0,-4.25,.08],fontSize:.32,color:"#f2d84b",anchorX:"center",anchorY:"middle",children:"E-8 RECORDING DRUM"}),e.jsx(q,{font:At,position:[0,-4.75,.08],fontSize:.28,color:"#f2d84b",anchorX:"center",anchorY:"middle",children:"220 V AC"}),e.jsx(z,{size:[.75,7.3,.05],pos:[-1,Ge(4)-14,.07],children:e.jsx("meshStandardMaterial",{color:"#000000"})}),[...at.map(String),"N"].map((u,C)=>e.jsxs("group",{position:[0,Ge(C)-14,.08],children:[e.jsx(z,{size:[.5,.12,.02],pos:[-.38,0,0],children:e.jsx("meshStandardMaterial",{color:"#000000"})}),e.jsx(q,{font:ae,position:[1.3,0,0],fontSize:.4,color:"#f2d84b",anchorX:"center",anchorY:"middle",children:u.replace(/^0\./,".")})]},u))]}),e.jsxs("group",{ref:S,position:[0,Ge(a.speed),oe+.15],children:[e.jsx(z,{size:[1.3,.45,.9],pos:[-1,0,.45],children:e.jsx(T,{lit:r("speed")})}),e.jsx(z,{size:[1.3,.25,.4],pos:[-1,.3,.75],children:e.jsx(T,{lit:r("speed")})})]})]}),e.jsxs("group",{userData:{part:"switch"},children:[e.jsx(z,{size:[1.7,2.5,.25],pos:[-5.6,5.6,oe+.12],children:e.jsx(de,{lit:r("switch")})}),e.jsx("group",{ref:dt,position:[-5.6,5.6,oe+.3],children:e.jsxs("mesh",{children:[e.jsx("boxGeometry",{args:[1.2,1.95,.35]}),e.jsx("meshStandardMaterial",{ref:ht,color:r("switch")?He:"#c4161c",emissive:"#ff2a1f",emissiveIntensity:0,roughness:.25})]})}),e.jsx(q,{font:ae,position:[-5.6,3.95,oe+.02],fontSize:.35,color:"#3a3a3a",anchorX:"center",anchorY:"middle",children:"ON"}),e.jsx(z,{size:[2.2,1.6,.25],pos:[-5.6,2.6,oe+.12],children:e.jsx(de,{lit:r("switch")})}),e.jsxs("mesh",{position:[-5.6,2.6,oe+1.4],rotation:[Math.PI/2,0,0],children:[e.jsx("cylinderGeometry",{args:[.32,.32,2.5,12]}),e.jsx(O,{lit:r("switch"),color:"#f4f4f2",metal:0,rough:.6})]}),e.jsxs("mesh",{position:[-5.6,1.5,oe+3],rotation:[.9,0,0],children:[e.jsx("cylinderGeometry",{args:[.3,.3,3,12]}),e.jsx(O,{lit:r("switch"),color:"#f4f4f2",metal:0,rough:.6})]}),e.jsxs("mesh",{position:[-5.6,.32,oe+7.5],rotation:[Math.PI/2,0,0],children:[e.jsx("cylinderGeometry",{args:[.3,.3,7,12]}),e.jsx(O,{lit:r("switch"),color:"#f4f4f2",metal:0,rough:.6})]})]}),e.jsxs("group",{userData:{part:"clutch"},position:[v.w/2+.01,13,0],rotation:[0,Math.PI/2,0],children:[e.jsxs("mesh",{position:[0,0,.02],children:[e.jsx("circleGeometry",{args:[3.3,48]}),e.jsx(O,{lit:r("clutch"),color:"#f6f5f0",metal:0,rough:.6})]}),e.jsxs("mesh",{position:[0,0,.03],children:[e.jsx("ringGeometry",{args:[2.85,3.05,64]}),e.jsx(O,{lit:r("clutch"),color:"#d0202a",metal:0,rough:.5})]}),e.jsx(q,{font:ae,position:[0,2.25,.05],fontSize:.36,color:"#c81e28",anchorX:"center",anchorY:"middle",children:"NEUTRALISING CLUTCH"}),e.jsx(q,{font:ae,position:[-1.7,-2.1,.05],fontSize:.36,color:"#c81e28",anchorX:"center",anchorY:"middle",children:"ENG"}),e.jsx(q,{font:ae,position:[1.6,-2.1,.05],fontSize:.36,color:"#c81e28",anchorX:"center",anchorY:"middle",children:"DIS ENG"}),e.jsx(I,{r:.55,h:.5,pos:[0,0,.25],rot:[Math.PI/2,0,0],children:e.jsx(T,{lit:r("clutch")})}),e.jsxs("group",{ref:G,position:[0,0,.55],children:[e.jsx(I,{r:.28,h:2.4,pos:[0,1.2,.2],children:e.jsx(T,{lit:r("clutch")})}),e.jsx(I,{r:.33,h:1.2,pos:[0,2.5,.75],rot:[Math.PI/2,0,0],children:e.jsx(T,{lit:r("clutch")})})]})]}),e.jsxs("group",{userData:{part:"contact"},position:[Rt[0]*8.5,K,Rt[1]*8.5],rotation:[0,ze,0],children:[e.jsxs("mesh",{position:[0,1.1,0],children:[e.jsx("boxGeometry",{args:[5,2.2,2.4]}),e.jsx("meshPhysicalMaterial",{color:r("contact")?He:"#e8f3f6",transparent:!0,opacity:.45,roughness:.08,clearcoat:1,depthWrite:!1})]}),[-1,1].map(u=>e.jsxs("group",{position:[u*1.4,2.2,0],children:[e.jsx(Ne,{r:.5,h:1.1,pos:[0,.55,0],lit:r("contact"),color:u<0?"#c0161c":"#1d1f22"}),e.jsx(I,{r:.18,h:.5,pos:[0,1.3,0],children:e.jsx(Re,{lit:r("contact")})})]},u)),e.jsx(z,{size:[.08,1,3.8],pos:[0,1.6,-3.1],children:e.jsx(Re,{lit:r("contact")})}),e.jsxs("mesh",{position:[0,1.6,-5],children:[e.jsx("sphereGeometry",{args:[.16,10,8]}),e.jsx("meshStandardMaterial",{ref:ut,color:"#fde68a",emissive:"#fff3b0",emissiveIntensity:0})]})]}),e.jsx("group",{userData:{part:"spindle"},children:e.jsx(I,{r:2.6,h:.35,pos:[0,K+.17,0],seg:40,children:e.jsx(T,{lit:r("spindle")})})}),e.jsxs("group",{ref:U,children:[e.jsxs("group",{userData:{part:"spindle"},children:[e.jsx(I,{r:1.5,r2:1.3,h:1.2,pos:[0,K+.9,0],seg:32,children:e.jsx(T,{lit:r("spindle")})}),e.jsx(I,{r:.75,h:Ae-K,pos:[0,(Ae+K)/2,0],seg:24,children:e.jsx(T,{lit:r("spindle")})})]}),e.jsxs("group",{userData:{part:"contact"},rotation:[0,St,0],children:[e.jsx(I,{r:1.2,h:1,pos:[0,K+2,0],children:e.jsx(de,{lit:r("contact")})}),e.jsx(z,{size:[.6,.5,3.2],pos:[0,K+2.1,2.1],children:e.jsx(de,{lit:r("contact")})}),e.jsxs("mesh",{position:[0,K+2.1,3.9],rotation:[Math.PI/2,0,0],children:[e.jsx("coneGeometry",{args:[.32,.9,12]}),e.jsx(de,{lit:r("contact")})]}),e.jsx(I,{r:.25,h:.7,pos:[.85,K+2,0],rot:[0,0,Math.PI/2],children:e.jsx(T,{lit:r("contact")})})]}),e.jsxs("group",{userData:{part:"lift"},children:[e.jsx(I,{r:1,h:1.2,pos:[0,Ae-.2,0],children:e.jsx(T,{lit:r("lift")})}),e.jsx(Ne,{r:.85,h:1.8,pos:[0,Ae+1.3,0],lit:r("lift")}),e.jsx(I,{r:.5,h:.5,pos:[0,Ae+2.45,0],children:e.jsx(T,{lit:r("lift")})})]}),e.jsxs("group",{ref:E,position:[0,it+a.lift,0],children:[e.jsxs("group",{userData:{part:"drum"},children:[e.jsxs("mesh",{position:[0,Q/2,0],children:[e.jsx("cylinderGeometry",{args:[we,we,Q,96,1,!0]}),e.jsx("meshStandardMaterial",{color:r("drum")?He:"#16171a",metalness:.3,roughness:.6,side:Lt})]}),[.15,Q-.4].map(u=>e.jsxs("group",{position:[0,u,0],children:[e.jsx(z,{size:[we*2-.2,.5,.9],pos:[0,0,0],children:e.jsx(de,{lit:r("drum")})}),e.jsx(z,{size:[.9,.5,we*2-.2],pos:[0,0,0],children:e.jsx(de,{lit:r("drum")})}),e.jsx(I,{r:1.6,h:1,pos:[0,0,0],children:e.jsx(de,{lit:r("drum")})})]},u)),e.jsx(I,{r:1.25,h:2,pos:[0,Q+.9,0],children:e.jsx(T,{lit:r("drum")})}),e.jsx(z,{size:[.5,.5,1.6],pos:[0,Q+.6,1.9],children:e.jsx(T,{lit:r("drum")})}),e.jsx(I,{r:.32,h:2.8,pos:[1.2,Q+1.1,2.6],rot:[0,0,-1.1],children:e.jsx(T,{lit:r("drum")})})]}),e.jsxs("mesh",{position:[0,Q/2,0],userData:{part:"paper"},children:[e.jsx("cylinderGeometry",{args:[lt,lt,Q,128,1,!0]}),e.jsx("meshStandardMaterial",{map:f,color:r("paper")?"#9ec5ff":"#ffffff",roughness:.85,metalness:0})]})]})]}),e.jsxs("group",{userData:{part:"stand"},children:[e.jsx(dr,{pos:[R.x+1.5,0,R.z-1],lit:r("stand")}),e.jsx(I,{r:.55,h:44,pos:[R.x,22.6,R.z],seg:20,children:e.jsx(T,{lit:r("stand")})}),e.jsx(z,{size:[2,2,2],pos:[R.x,k.y,R.z],children:e.jsx(Te,{lit:r("stand")})}),e.jsx(Ne,{r:.5,h:1,pos:[R.x,k.y,R.z-1.4],rot:[Math.PI/2,0,0],lit:r("stand"),color:"#1d1f22"}),e.jsx(I,{r:.4,h:R.x-k.x,pos:[(R.x+k.x)/2,k.y,R.z],rot:[0,0,Math.PI/2],children:e.jsx(T,{lit:r("stand")})}),e.jsx(z,{size:[2,2,2],pos:[R.x,Pe-1,R.z],children:e.jsx(Te,{lit:r("stand")})}),e.jsx(Ne,{r:.5,h:1,pos:[R.x,Pe-1,R.z-1.4],rot:[Math.PI/2,0,0],lit:r("stand"),color:"#1d1f22"}),e.jsx(I,{r:.35,h:R.x-Ue,pos:[(R.x+Ue)/2,Pe-1,R.z],rot:[0,0,Math.PI/2],children:e.jsx(T,{lit:r("stand")})}),e.jsx(z,{size:[1.2,1.2,1.8],pos:[Ue,Pe-1,(R.z+k.z)/2],children:e.jsx(Te,{lit:r("stand")})})]}),e.jsxs("group",{ref:w,position:[k.x,k.y,k.z],children:[e.jsxs("group",{userData:{part:"lever"},children:[e.jsx(z,{size:[1.2,2.2,.25],pos:[.6,0,-.9],children:e.jsx(Re,{lit:r("lever")})}),e.jsx(z,{size:[1.2,2.2,.25],pos:[.6,0,.9],children:e.jsx(Re,{lit:r("lever")})}),e.jsx(z,{size:[1.2,.3,2.05],pos:[.6,1.1,0],children:e.jsx(Re,{lit:r("lever")})}),e.jsx(I,{r:.12,h:2.2,pos:[0,0,0],rot:[Math.PI/2,0,0],children:e.jsx(T,{lit:r("lever")})})]}),e.jsxs("group",{ref:x,children:[e.jsxs("group",{userData:{part:"lever"},children:[e.jsx(z,{size:[Ce-.3,.5,.08],pos:[-(Ce-.3)/2,0,0],children:e.jsx(Te,{lit:r("lever")})}),e.jsx(z,{size:[Be+.6,.6,.12],pos:[(Be+.6)/2-.2,0,0],children:e.jsx(Te,{lit:r("lever")})}),e.jsxs("mesh",{position:[Be,-.3,0],rotation:[Math.PI/2,0,0],children:[e.jsx("torusGeometry",{args:[.22,.05,8,16]}),e.jsx(T,{lit:r("lever")})]})]}),e.jsxs("group",{userData:{part:"stylus"},position:[-Ce,0,0],children:[e.jsx(z,{size:[.9,.35,.04],pos:[.3,0,0],children:e.jsx(O,{lit:r("stylus"),color:"#e8dfc8",metal:0,rough:.6})}),e.jsx(z,{size:[.06,.12,.34],pos:[0,0,-.16],rot:[0,.35,0],children:e.jsx(O,{lit:r("stylus"),color:"#e8dfc8",metal:0,rough:.6})})]})]})]}),e.jsxs("mesh",{ref:Z,position:[Ue,wt+2,k.z],userData:{part:"muscle"},children:[e.jsx("cylinderGeometry",{args:[.03,.03,1,6]}),e.jsx("meshStandardMaterial",{color:"#f5f0e1",roughness:.9})]}),e.jsxs("group",{userData:{part:"muscle"},position:[Ue,Pe,k.z],children:[e.jsx(I,{r:.25,h:2.2,pos:[0,-.6,0],children:e.jsx(O,{lit:r("muscle"),color:"#efe7d6",metal:0,rough:.6})}),e.jsxs("group",{ref:F,children:[e.jsxs("mesh",{position:[0,Ee*.42,0],scale:[1,2.6,.9],children:[e.jsx("sphereGeometry",{args:[Ee*.19,24,16]}),e.jsx(O,{lit:r("muscle"),color:"#b4485a",metal:0,rough:.55})]}),e.jsx(I,{r:.08,r2:.05,h:Ee*.32,pos:[0,Ee*.84,0],seg:8,children:e.jsx(O,{lit:r("muscle"),color:"#efe9df",metal:0,rough:.4})})]})]})]})},Ee=4.5,Pe=k.y-13,wt=Pe+Ee,Ue=k.x+Be,R={x:26,z:k.z+1.3},dr=({pos:o,lit:s})=>{const i=p.useMemo(()=>{const t=new fs,r=7;[Math.PI/2,Math.PI/2+2*Math.PI/3,Math.PI/2+4*Math.PI/3].forEach((n,l)=>{const h=Math.cos(n)*r,c=Math.sin(n)*r;l===0?t.moveTo(h,c):t.lineTo(h,c)}),t.closePath();const a=new ps(t,{depth:1.3,bevelEnabled:!0,bevelSize:.5,bevelThickness:.3,bevelSegments:3});return a.rotateX(-Math.PI/2),a},[]);return e.jsx("group",{position:o,rotation:[0,.3,0],children:e.jsx("mesh",{geometry:i,position:[0,.3,0],children:e.jsx(O,{lit:s,color:"#1f2a3a",metal:.4,rough:.5})})})},hr=o=>{const s=sr/o;return s<60?`${s.toFixed(s<10?2:1)} s`:s<3600?`${Math.round(s/60)} min`:`${(s/3600).toFixed(1)} h`},ur=({kymo:o})=>{const{state:s,set:i,stimulate:t,newPaper:r}=o,a=l=>`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${l?"bg-amber-500/20 border-amber-400 text-amber-100":"bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"}`,n=ys(s)?`one turn: ${hr(at[s.speed])}`:s.on?"drum not driven":"motor off";return e.jsxs("section",{className:"space-y-4",children:[e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{onClick:()=>i({on:!s.on}),className:`flex-1 ${a(s.on)}`,children:s.on?"Motor ON":"Motor OFF"}),e.jsx("button",{onClick:()=>i({clutch:!s.clutch}),className:`flex-1 ${a(s.clutch)}`,children:s.clutch?"Clutch engaged":"Clutch disengaged"})]}),e.jsxs("div",{children:[e.jsxs("div",{className:"flex justify-between text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-2",children:[e.jsx("span",{children:"Speed lever (mm/s)"}),e.jsx("span",{className:"normal-case tracking-normal text-slate-400 font-semibold",children:n})]}),e.jsx("div",{className:"grid grid-cols-3 gap-1.5",children:[...at.map(String),"N"].map((l,h)=>e.jsx("button",{onClick:()=>i({speed:h}),className:a(s.speed===h),children:l==="N"?"N (neutral)":l},l))})]}),e.jsxs("label",{className:"block",children:[e.jsxs("span",{className:"flex justify-between text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-1",children:[e.jsx("span",{children:"Drum height (screw lift)"}),e.jsxs("span",{className:"normal-case tracking-normal text-slate-400 font-semibold",children:[s.lift.toFixed(1)," cm"]})]}),e.jsx("input",{type:"range",min:0,max:bs,step:.1,value:s.lift,onChange:l=>i({lift:+l.target.value}),className:"w-full accent-amber-400","aria-label":"Drum height"})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{onClick:t,className:"flex-1 px-3 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-bold",children:"Stimulate"}),e.jsx("button",{onClick:()=>i({contactStim:!s.contactStim}),className:`flex-1 ${a(s.contactStim)}`,children:s.contactStim?"Contact stimulates every turn":"Stimulate from contact"})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{onClick:()=>i({leverOn:!s.leverOn}),className:`flex-1 ${a(s.leverOn)}`,children:s.leverOn?"Lever on drum":"Lever off drum"}),e.jsx("button",{onClick:r,className:"flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 text-xs font-semibold",children:"Fresh smoked paper"})]})]})},N="#3b82f6",ve=o=>o?{emissive:N,emissiveIntensity:.55}:{},M=({lit:o})=>e.jsx("meshStandardMaterial",{color:o?N:"#c9ced3",metalness:.9,roughness:.28,...ve(o)}),V=({lit:o})=>e.jsx("meshStandardMaterial",{color:o?N:"#b8923a",metalness:.85,roughness:.35,...ve(o)}),X=({lit:o,color:s="#f4f5f6"})=>e.jsx("meshStandardMaterial",{color:o?N:s,roughness:.55,...ve(o)}),Y=({lit:o})=>e.jsx("meshStandardMaterial",{color:o?N:"#a8405f",roughness:.8,...ve(o)}),ue=({lit:o})=>e.jsx("meshStandardMaterial",{color:o?N:"#1c1d20",roughness:.6,...ve(o)}),P=({lit:o,opacity:s=.3})=>e.jsx("meshPhysicalMaterial",{color:o?N:"#eef6fa",transparent:!0,opacity:o?.6:s,roughness:.05,clearcoat:1,envMapIntensity:1.5,depthWrite:!1,side:Lt,...ve(o)}),y=({a:o,b:s,r:i,children:t,seg:r=14})=>{const{pos:a,quat:n,len:l}=p.useMemo(()=>{const h=new D(...o),c=new D(...s),d=c.clone().sub(h);return{pos:h.clone().add(c).multiplyScalar(.5),quat:new Ns().setFromUnitVectors(new D(0,1,0),d.clone().normalize()),len:d.length()}},[o,s]);return e.jsxs("mesh",{position:a,quaternion:n,children:[e.jsx("cylinderGeometry",{args:[i,i,l,r,1]}),t]})},L=({pts:o,r:s,children:i,seg:t=48})=>{const r=p.useMemo(()=>new ls(new as(o.map(a=>new D(...a)),!1,"catmullrom",.5),t,s,10,!1),[o,s,t]);return e.jsx("mesh",{geometry:r,children:i})},m=({at:o,size:s,children:i,rot:t})=>e.jsxs("mesh",{position:o,rotation:t,children:[e.jsx("boxGeometry",{args:s}),i]}),J=({at:o,size:s,children:i,color:t="#111827",bold:r,rot:a})=>e.jsx(q,{font:r?ae:At,position:o,rotation:a,fontSize:s,color:t,anchorX:"center",anchorY:"middle",children:i}),pr=o=>{for(let s=o;s;s=s.parent)if(s.userData.part)return s.userData;return null},ss=o=>{var i;const s=o.intersections.map(t=>pr(t.object)).filter(t=>!!t);return((i=s.find(t=>!t.glass)??s[0])==null?void 0:i.part)??null},j={x:11,z:9,y0:38,y1:60},fr=11,A=-4,pe=1.8,me=5,je=1,g=[-1,23.5,7],_=7,xr=(()=>{let o=null;return()=>o??(o=new cs([[0,0],[4.8,0],[5,.4],[5,10.5],[4.4,12.2],[2.2,14.2],[1.8,14.8],[1.8,16.6],[2.3,17],[2.3,17.4],[1.7,17.4]].map(([s,i])=>new ke(s,i)),40))})(),mr=(()=>{const o=[];for(let s=0;s<=140;s++){const i=s/140,t=i*Math.PI*2*7;o.push([-2.6+i*5.2,45.5+Math.sin(t)*1.8,-4+Math.cos(t)*1.8])}return o})(),jr=({active:o,onHover:s,onSelect:i})=>{const t=n=>o===n,r=p.useMemo(xr,[]),a=[-1,1];return e.jsxs("group",{onPointerMove:n=>{n.stopPropagation(),s(ss(n))},onPointerOut:()=>s(null),onClick:n=>{n.stopPropagation();const l=ss(n);l&&i(l)},children:[e.jsxs("group",{userData:{part:"stand"},children:[e.jsx(m,{at:[0,-1,2],size:[46,2,32],children:e.jsx(X,{lit:t("stand")})}),a.map(n=>e.jsxs(te.Fragment,{children:[e.jsx(y,{a:[n*17,0,A],b:[n*17,112,A],r:.6,children:e.jsx(M,{lit:t("stand")})}),e.jsxs("mesh",{position:[n*17,2.2,A],children:[e.jsx("cylinderGeometry",{args:[1.1,1.8,4.4,20]}),e.jsx(X,{lit:t("stand")})]}),e.jsx(y,{a:[n*17,0,6],b:[n*17,n<0?35:30,6],r:.55,children:e.jsx(M,{lit:t("stand")})}),e.jsxs("mesh",{position:[n*17,2.2,6],children:[e.jsx("cylinderGeometry",{args:[1.1,1.8,4.4,20]}),e.jsx(X,{lit:t("stand")})]})]},n)),a.map(n=>a.map(l=>e.jsxs(te.Fragment,{children:[e.jsx(y,{a:[n*j.x,0,l*j.z],b:[n*j.x,27,l*j.z],r:.7,children:e.jsx(M,{lit:t("stand")})}),e.jsx(m,{at:[n*(j.x+.6),44.5,l*(j.z+.6)],size:[2,35,2],children:e.jsx(X,{lit:t("stand")})})]},`${n}${l}`))),a.map(n=>e.jsxs(te.Fragment,{children:[e.jsx(m,{at:[0,37.3,n*(j.z+.6)],size:[2*j.x+1.2,1.4,2],children:e.jsx(X,{lit:t("stand")})}),e.jsx(m,{at:[n*(j.x+.6),37.3,0],size:[2,1.4,2*j.z+1.2],children:e.jsx(X,{lit:t("stand")})}),e.jsx(m,{at:[0,61,n*(j.z+.9)],size:[2*j.x+3.4,2,.9],children:e.jsx(M,{lit:t("stand")})}),e.jsx(m,{at:[n*(j.x+1.25),61,0],size:[.9,2,2*j.z+1.8],children:e.jsx(M,{lit:t("stand")})})]},n)),e.jsx(m,{at:[0,61,j.z+1.4],size:[13,1.5,.08],children:e.jsx("meshBasicMaterial",{color:"#ffffff"})}),e.jsx(J,{at:[0,61,j.z+1.46],size:.82,bold:!0,children:"LANGENDORFF APPARATUS"}),e.jsx(y,{a:[-18.5,23.4,6],b:[18.5,23.4,6],r:.45,children:e.jsx(M,{lit:t("stand")})}),e.jsx(y,{a:[-23,13,6],b:[-2.5,13,6],r:.45,children:e.jsx(M,{lit:t("stand")})}),e.jsx(y,{a:[4,13,6],b:[25,13,6],r:.45,children:e.jsx(M,{lit:t("stand")})}),[[-17,23.4],[17,23.4],[-17,13],[17,13]].map(([n,l])=>e.jsx(m,{at:[n,l,6],size:[1.9,1.9,1.9],children:e.jsx(M,{lit:t("stand")})},`${n}${l}`))]}),e.jsx("group",{userData:{part:"reservoirs"},children:a.map(n=>e.jsxs("group",{position:[n*fr,102,A],children:[e.jsxs("group",{userData:{part:"reservoirs",glass:!0},children:[e.jsx("mesh",{geometry:r,children:e.jsx(P,{lit:t("reservoirs"),opacity:.28})}),e.jsx(y,{a:[-n*4.8,1.7,0],b:[-n*6.6,1.7,0],r:1.05,children:e.jsx(P,{lit:t("reservoirs")})})]}),e.jsxs("mesh",{position:[-n*6.9,1.7,0],rotation:[0,0,Math.PI/2],children:[e.jsx("cylinderGeometry",{args:[.95,.75,1.5,18]}),e.jsx("meshStandardMaterial",{color:t("reservoirs")?N:"#c0392b",roughness:.7})]}),e.jsxs("mesh",{position:[0,-.3,0],children:[e.jsx("cylinderGeometry",{args:[5.7,5.7,.4,36]}),e.jsx(X,{lit:t("reservoirs")})]}),e.jsx(m,{at:[n*5.6,-.3,0],size:[2.4,1.4,2.2],children:e.jsx(X,{lit:t("reservoirs")})}),[0,1,2].map(l=>{const h=l===0?Math.PI/2:l===1?-Math.PI/2:n>0?0:Math.PI;return e.jsx(m,{at:[Math.cos(h)*5.25,6,Math.sin(h)*5.25],size:[.25,12.5,1.6],rot:[0,-h,0],children:e.jsx(X,{lit:t("reservoirs")})},l)})]},n))}),e.jsx("group",{userData:{part:"head-tubes"},children:a.map(n=>e.jsxs(te.Fragment,{children:[e.jsxs("group",{userData:{part:"head-tubes",glass:!0},children:[e.jsxs("mesh",{position:[n*pe,102,A],children:[e.jsx("cylinderGeometry",{args:[.9,.9,22,20,1,!0]}),e.jsx(P,{lit:t("head-tubes")})]}),e.jsxs("mesh",{position:[n*pe,90.2,A],children:[e.jsx("cylinderGeometry",{args:[.9,.35,1.6,20,1,!0]}),e.jsx(P,{lit:t("head-tubes")})]}),e.jsx(y,{a:[n*pe,86.5,A],b:[n*pe,89.4,A],r:.35,children:e.jsx(P,{lit:t("head-tubes")})}),e.jsx(y,{a:[n*(pe+.8),103.7,A],b:[n*4.4,103.7,A],r:.3,children:e.jsx(P,{lit:t("head-tubes")})}),e.jsx(y,{a:[n*pe,97,A],b:[-n*1.6,121-(n>0?2:0),A+n*.6],r:.22,children:e.jsx(P,{lit:t("head-tubes"),opacity:.45})})]}),e.jsx(y,{a:[n*6.5,93,A],b:[n*6.5,101.5,A],r:.35,children:e.jsx(M,{lit:t("head-tubes")})}),e.jsx(y,{a:[n*7.6,95.5,A],b:[n*3.6,95.5,A],r:.3,children:e.jsx(M,{lit:t("head-tubes")})}),e.jsx(m,{at:[n*2.3,95.5,A],size:[2.6,1.3,.25],children:e.jsx(M,{lit:t("head-tubes")})}),e.jsx(m,{at:[n*6.5,95.5,A],size:[.9,.9,.9],children:e.jsx(V,{lit:t("head-tubes")})})]},n))}),e.jsxs("group",{userData:{part:"y-piece"},children:[e.jsxs("group",{userData:{part:"y-piece",glass:!0},children:[e.jsx(y,{a:[1.5,73.5,-1],b:[1.5,77,-1],r:.38,children:e.jsx(P,{lit:t("y-piece"),opacity:.4})}),e.jsx(y,{a:[1.5,77,-1],b:[.1,81,-1.4],r:.36,children:e.jsx(P,{lit:t("y-piece"),opacity:.4})}),e.jsx(y,{a:[1.5,77,-1],b:[2.9,81,-1.4],r:.36,children:e.jsx(P,{lit:t("y-piece"),opacity:.4})})]}),e.jsx(L,{pts:[[-pe,87.2,A],[-1.9,84.5,-3],[.1,80.4,-1.4]],r:.5,children:e.jsx(Y,{lit:t("y-piece")})}),e.jsx(L,{pts:[[pe,87.2,A],[2.6,84.5,-3],[2.9,80.4,-1.4]],r:.5,children:e.jsx(Y,{lit:t("y-piece")})}),e.jsx(L,{pts:[[1.5,74.2,-1],[2.2,69,-.6],[4.6,62,1.2],[5.7,56,1.5],[5.6,46,1.4]],r:.5,children:e.jsx(Y,{lit:t("y-piece")})})]}),e.jsxs("group",{userData:{part:"bath",glass:!0},children:[a.map(n=>e.jsxs(te.Fragment,{children:[e.jsxs(m,{at:[0,(j.y0+j.y1)/2,n*j.z],size:[2*j.x,j.y1-j.y0,.4],children:[e.jsx(P,{lit:t("bath"),opacity:.14}),e.jsx(Pt,{color:t("bath")?N:"#9fb0c2"})]}),e.jsxs(m,{at:[n*j.x,(j.y0+j.y1)/2,0],size:[.4,j.y1-j.y0,2*j.z],children:[e.jsx(P,{lit:t("bath"),opacity:.14}),e.jsx(Pt,{color:t("bath")?N:"#9fb0c2"})]})]},n)),e.jsx(m,{at:[0,j.y0+.2,0],size:[2*j.x,.4,2*j.z],children:e.jsx(P,{lit:t("bath"),opacity:.22})})]}),e.jsxs("group",{userData:{part:"inner-tubes"},children:[a.map(n=>e.jsxs(te.Fragment,{children:[e.jsxs("group",{userData:{part:"inner-tubes",glass:!0},children:[e.jsxs("mesh",{position:[n*me,48.5,je],children:[e.jsx("cylinderGeometry",{args:[1.7,1.7,13,22,1,!0]}),e.jsx(P,{lit:t("inner-tubes"),opacity:.35})]}),e.jsxs("mesh",{position:[n*me,41.3,je],children:[e.jsx("cylinderGeometry",{args:[1.7,.45,1.4,22,1,!0]}),e.jsx(P,{lit:t("inner-tubes"),opacity:.35})]}),e.jsx(y,{a:[n*me,39.4,je],b:[n*me,40.7,je],r:.45,children:e.jsx(P,{lit:t("inner-tubes")})}),e.jsx(L,{pts:[[n*10.5,66.5,.4],[n*6,66.5,.4],[n*4.5,65.6,.5],[n*4.3,62,.6],[n*4.3,44,.6]],r:.33,children:e.jsx(P,{lit:t("inner-tubes"),opacity:.45})})]}),e.jsxs("mesh",{position:[n*me,39,je],children:[e.jsx("cylinderGeometry",{args:[.9,1.15,1.2,18]}),e.jsx(Y,{lit:t("inner-tubes")})]}),e.jsx(m,{at:[n*(j.x+1.25),62.6,.4],size:[1.4,1.2,1.4],children:e.jsx(M,{lit:t("inner-tubes")})}),e.jsx(y,{a:[n*(j.x+1.25),63,.4],b:[n*(j.x+1.25),69,.4],r:.45,children:e.jsx(M,{lit:t("inner-tubes")})}),e.jsx(m,{at:[n*10.4,66.5,.4],size:[2.6,1.1,.3],children:e.jsx(M,{lit:t("inner-tubes")})})]},n)),e.jsx(L,{pts:[[-me,38.4,je],[-5.4,30,.4],[-6,16,-1],[-5,7,-2.5]],r:.45,children:e.jsx(Y,{lit:t("inner-tubes")})}),e.jsx(m,{at:[-5.3,9,-2.2],size:[1.6,.5,.7],children:e.jsx(M,{lit:t("inner-tubes")})})]}),e.jsxs("group",{userData:{part:"coil"},children:[e.jsx("group",{userData:{part:"coil",glass:!0},children:e.jsx(L,{pts:mr,r:.33,seg:420,children:e.jsx(P,{lit:t("coil"),opacity:.5})})}),e.jsx(L,{pts:[[me-.7,40.3,je-.4],[4.2,40.6,-1.5],[3.3,43,-3.2],[2.6,45.5,-2.2]],r:.42,children:e.jsx(Y,{lit:t("coil")})}),e.jsx(L,{pts:[[-2.6,45.5,-2.2],[-3,42,-2.4],[-1.6,39.8,.6],[0,38.6,3]],r:.42,children:e.jsx(Y,{lit:t("coil")})}),e.jsxs("mesh",{position:[0,38.3,3],children:[e.jsx("cylinderGeometry",{args:[.85,1,1,18]}),e.jsx(Y,{lit:t("coil")})]})]}),e.jsxs("group",{userData:{part:"heater"},children:[e.jsx(L,{pts:[[2.2,43.2,9.4],[2.2,43.2,2.2],[2.5,43.2,1.2],[3.3,43.2,.8],[4.1,43.2,1.2],[4.4,43.2,2.2],[4.4,43.2,9.4]],r:.42,children:e.jsx(M,{lit:t("heater")})}),e.jsxs("mesh",{position:[3.3,43.2,11.2],rotation:[Math.PI/2,0,0],children:[e.jsx("cylinderGeometry",{args:[2,2.1,3.6,24]}),e.jsx(ue,{lit:t("heater")})]}),e.jsx(L,{pts:[[3.3,43.2,13],[4,41.5,14.5],[6.5,37.5,14.2],[8,36.2,13]],r:.3,children:e.jsx(ue,{lit:t("heater")})})]}),e.jsxs("group",{userData:{part:"stirrer"},children:[e.jsx(m,{at:[-9,49,-2.5],size:[2.8,4.2,3.4],children:e.jsx(ue,{lit:t("stirrer")})}),e.jsx(y,{a:[-7.6,47.6,-2.5],b:[-6.2,47.6,-2.5],r:.45,children:e.jsx(ue,{lit:t("stirrer")})}),e.jsx(L,{pts:[[-9,51,-2.5],[-10.4,58,-3],[-12.2,62.6,-1],[-13.2,58,4],[-13,44,8.5],[-9,34,9.2],[-5,31.5,10]],r:.28,children:e.jsx(ue,{lit:t("stirrer")})})]}),e.jsxs("group",{userData:{part:"probe"},children:[e.jsx(y,{a:[-9.6,43.5,4],b:[-9.6,62.5,4],r:.28,children:e.jsx(M,{lit:t("probe")})}),e.jsx(m,{at:[-9.6,50.5,4],size:[2.6,.5,1.4],children:e.jsx("meshStandardMaterial",{color:t("probe")?N:"#d9dde2",transparent:!0,opacity:.7})}),e.jsx(L,{pts:[[-9.6,62.5,4],[-11.6,63.4,5],[-13.4,56,7],[-12.6,42,9.4],[-8,32,9.6],[-5,29.5,10]],r:.24,children:e.jsx("meshStandardMaterial",{color:t("probe")?N:"#6b7280",roughness:.7})})]}),e.jsxs("group",{userData:{part:"control"},position:[3,31,12],children:[e.jsx(m,{at:[0,0,0],size:[16,10.5,8],children:e.jsx(X,{lit:t("control")})}),e.jsx(m,{at:[0,0,4.03],size:[15.4,9.9,.06],children:e.jsx("meshStandardMaterial",{color:t("control")?N:"#a9aeb4",roughness:.5,metalness:.3})}),[-5.2,5.2].map(n=>e.jsxs(te.Fragment,{children:[e.jsxs("mesh",{position:[n*.75,3.6,4.3],children:[e.jsx("sphereGeometry",{args:[.62,18,12]}),e.jsx("meshStandardMaterial",{color:"#d92626",emissive:"#7a0c0c",emissiveIntensity:.6,roughness:.3})]}),e.jsx(m,{at:[n,-.4,4.25],size:[2.6,4.6,.4],children:e.jsx(X,{lit:!1,color:"#fafafa"})}),e.jsx(m,{at:[n,-.4,4.5],size:[1.5,2.8,.25],rot:[.12,0,0],children:e.jsx(X,{lit:!1,color:"#ffffff"})}),e.jsx(J,{at:[n,-3.5,4.1],size:.5,color:"#9b1c1c",bold:!0,children:"ON"})]},n)),e.jsx(J,{at:[-5.2,2.5,4.1],size:.5,color:"#9b1c1c",bold:!0,children:"MAIN"}),e.jsx(J,{at:[5.2,2.8,4.1],size:.46,color:"#9b1c1c",bold:!0,children:`HEATER
STIRRER`}),e.jsx(J,{at:[0,3.1,4.1],size:.62,color:"#9b1c1c",bold:!0,children:"TWO UNIT BATH"}),e.jsx(J,{at:[0,-3.9,4.1],size:.5,color:"#9b1c1c",bold:!0,children:"DIGITAL PID CONTROL"}),e.jsx(m,{at:[0,-.4,4.3],size:[5.2,5.2,.6],children:e.jsx(ue,{lit:!1})}),e.jsx(J,{at:[.3,.9,4.62],size:1.05,color:"#ff3b30",bold:!0,children:"37.0"}),e.jsx(J,{at:[.3,-.5,4.62],size:.85,color:"#35d07f",bold:!0,children:"37.0"}),e.jsx(J,{at:[-2,.9,4.62],size:.34,color:"#d1d5db",children:"PV"}),e.jsx(J,{at:[-2,-.5,4.62],size:.34,color:"#d1d5db",children:"SV"}),e.jsx(m,{at:[0,-2.1,4.62],size:[4.4,.9,.05],children:e.jsx("meshStandardMaterial",{color:"#cfd3d8"})})]}),e.jsxs("group",{userData:{part:"cannula"},children:[e.jsx(L,{pts:[[0,37.8,3],[0,33,3.6],[-.7,29,6.2],[g[0],27,g[2]]],r:.45,children:e.jsx(Y,{lit:t("cannula")})}),e.jsxs("group",{userData:{part:"cannula",glass:!0},children:[e.jsx(y,{a:[g[0],24.4,g[2]],b:[g[0],27.6,g[2]],r:.36,children:e.jsx(P,{lit:t("cannula"),opacity:.45})}),e.jsxs("mesh",{position:g,scale:[1,1.15,1],children:[e.jsx("sphereGeometry",{args:[1.35,24,18]}),e.jsx(P,{lit:t("cannula"),opacity:.4})]}),e.jsxs("mesh",{position:[g[0],21.2,g[2]],children:[e.jsx("cylinderGeometry",{args:[.5,.16,2.2,16,1,!0]}),e.jsx(P,{lit:t("cannula"),opacity:.5})]}),e.jsx(y,{a:[g[0]-.2,26,g[2]],b:[g[0]-2.2,27.2,g[2]],r:.3,children:e.jsx(P,{lit:t("cannula"),opacity:.45})}),e.jsx(y,{a:[g[0]+.9,23.4,g[2]],b:[g[0]+3.6,22.7,g[2]],r:.62,children:e.jsx(P,{lit:t("cannula"),opacity:.4})})]}),e.jsx(m,{at:[g[0]+1.1,23.6,g[2]-.6],size:[1.3,1.9,1.1],children:e.jsx(M,{lit:t("cannula")})}),e.jsxs("mesh",{position:[g[0]+1.1,24.9,g[2]-.4],children:[e.jsx("cylinderGeometry",{args:[.55,.55,.5,14]}),e.jsx(M,{lit:t("cannula")})]}),e.jsx(L,{pts:[[g[0],18.6,_],[g[0]+.25,18.1,_],[g[0],17.6,_],[g[0]-.25,18.1,_],[g[0],18.5,_]],r:.06,seg:24,children:e.jsx(M,{lit:t("cannula")})})]}),e.jsxs("group",{userData:{part:"thermometer"},children:[e.jsxs("mesh",{position:[g[0]+3.8,22.65,g[2]],rotation:[0,0,Math.PI/2-.25],children:[e.jsx("cylinderGeometry",{args:[.7,.55,1.1,16]}),e.jsx(Y,{lit:t("thermometer")})]}),e.jsx(y,{a:[g[0]+1.6,23.2,g[2]],b:[g[0]+13,20.3,g[2]],r:.2,children:e.jsx("meshStandardMaterial",{color:t("thermometer")?N:"#f2d43d",roughness:.25,...ve(t("thermometer"))})})]}),e.jsxs("group",{userData:{part:"manometer"},children:[e.jsx(m,{at:[-21.2,23,6.6],size:[7,21,.3],children:e.jsx(M,{lit:t("manometer")})}),a.map(n=>e.jsx(m,{at:[-21.2+n*3.5,23,7.1],size:[.3,21,1.3],children:e.jsx(M,{lit:t("manometer")})},n)),e.jsx(m,{at:[-21.2,22.5,6.85],size:[2.5,11.5,.2],children:e.jsx("meshStandardMaterial",{color:"#ffffff",roughness:.4})}),[0,2,4,6,8,10,12,14,16].map(n=>e.jsxs(te.Fragment,{children:[e.jsx(m,{at:[-21.9,17.6+n*.62,6.97],size:[.9,.05,.02],children:e.jsx("meshBasicMaterial",{color:"#111827"})}),e.jsx(J,{at:[-20.7,17.6+n*.62,6.98],size:.48,children:String(n)})]},n)),e.jsxs("group",{userData:{part:"manometer",glass:!0},children:[e.jsx(L,{pts:[[-23,32.5,7.4],[-23,15.5,7.4],[-22.6,14.4,7.4],[-21.2,14,7.4],[-19.8,14.4,7.4],[-19.4,15.5,7.4],[-19.4,30.6,7.4],[-19,31.6,7.4],[-17.6,31.8,7.4]],r:.34,seg:90,children:e.jsx(P,{lit:t("manometer"),opacity:.4})}),e.jsx(y,{a:[-19.4,28,7.4],b:[-17.6,28,7.4],r:.3,children:e.jsx(P,{lit:t("manometer"),opacity:.4})})]}),e.jsx(L,{pts:[[-23,18,7.4],[-23,15.5,7.4],[-22.6,14.4,7.4],[-21.2,14,7.4],[-19.8,14.4,7.4],[-19.4,15.5,7.4],[-19.4,18,7.4]],r:.2,seg:50,children:e.jsx("meshStandardMaterial",{color:"#9aa1a8",metalness:1,roughness:.15})}),e.jsx(m,{at:[-17.6,27,6.4],size:[1.9,1.9,1.5],children:e.jsx(M,{lit:t("manometer")})}),e.jsx(L,{pts:[[-17.9,31.8,7.4],[-13,32.4,8],[-7,29.6,8],[g[0]-2,27.1,g[2]]],r:.45,children:e.jsx(Y,{lit:t("manometer")})}),e.jsx(L,{pts:[[-17.9,28,7.4],[-13.5,27.6,9],[-10,18,12],[-8,5,14.5],[-5,.6,16.4],[2,.5,17]],r:.45,children:e.jsx(Y,{lit:t("manometer")})})]}),e.jsxs("group",{userData:{part:"pulleys"},children:[[g[0]+1.1,23.6].map(n=>e.jsxs(te.Fragment,{children:[e.jsx(m,{at:[n,11.6,6.3],size:[.9,3,.9],children:e.jsx(V,{lit:t("pulleys")})}),e.jsxs("mesh",{position:[n,13.6,6.3],children:[e.jsx("cylinderGeometry",{args:[.5,.5,.9,14]}),e.jsx(ue,{lit:t("pulleys")})]}),e.jsxs("mesh",{position:[n,10.4,_],rotation:[Math.PI/2,0,0],children:[e.jsx("cylinderGeometry",{args:[1.1,1.1,.25,28]}),e.jsx("meshStandardMaterial",{color:t("pulleys")?N:"#e8edf2",transparent:!0,opacity:.75,roughness:.2})]})]},n)),e.jsx(y,{a:[g[0],17.6,_],b:[g[0],10.4,_],r:.05,seg:6,children:e.jsx("meshBasicMaterial",{color:t("pulleys")?N:"#f8fafc"})}),e.jsx(y,{a:[g[0]+1.1,9.3,_],b:[23.6,9.3,_],r:.05,seg:6,children:e.jsx("meshBasicMaterial",{color:t("pulleys")?N:"#f8fafc"})}),e.jsx(y,{a:[24.7,10.4,_],b:[24.7,20.6,_],r:.05,seg:6,children:e.jsx("meshBasicMaterial",{color:t("pulleys")?N:"#f8fafc"})})]}),e.jsxs("group",{userData:{part:"lever"},children:[e.jsx(y,{a:[20,13,6],b:[20,27,6],r:.4,children:e.jsx(M,{lit:t("lever")})}),e.jsx(m,{at:[20.6,21,_],size:[4.6,.9,.9],children:e.jsx(V,{lit:t("lever")})}),e.jsxs("mesh",{position:[18,21,_],rotation:[0,0,Math.PI/2],children:[e.jsx("cylinderGeometry",{args:[.45,.45,.9,12]}),e.jsx(V,{lit:t("lever")})]}),e.jsx(m,{at:[25.6,20.95,_],size:[5.6,.75,.16],children:e.jsx(V,{lit:t("lever")})}),[0,1,2,3,4,5,6].map(n=>e.jsx(m,{at:[23.3+n*.7,21.4,_],size:[.35,.25,.16],children:e.jsx(V,{lit:t("lever")})},n)),e.jsx(y,{a:[28.4,20.95,_],b:[38,21.6,_],r:.08,seg:6,children:e.jsx(M,{lit:t("lever")})}),e.jsx(m,{at:[38.4,21.65,_],size:[1.3,.7,.03],rot:[0,0,.3],children:e.jsx("meshStandardMaterial",{color:t("lever")?N:"#f1f5f9",transparent:!0,opacity:.85})}),e.jsx(y,{a:[21,21.4,_],b:[21,25.4,_],r:.22,children:e.jsx(V,{lit:t("lever")})}),e.jsx(y,{a:[19.6,24.4,_],b:[24.2,24.4,_],r:.22,children:e.jsx(V,{lit:t("lever")})}),e.jsxs("mesh",{position:[19.4,24.4,_],rotation:[0,0,Math.PI/2],children:[e.jsx("cylinderGeometry",{args:[.42,.42,.8,12]}),e.jsx(V,{lit:t("lever")})]}),e.jsx(L,{pts:Array.from({length:41},(n,l)=>[24.2+Math.sin(l*1.6)*.3,24.2-l*.07,_+Math.cos(l*1.6)*.3]),r:.035,seg:120,children:e.jsx(M,{lit:t("lever")})})]}),e.jsx("group",{userData:{part:"holders"},children:a.map(n=>e.jsxs(te.Fragment,{children:[e.jsx(m,{at:[n*(j.x+1.25),62.6,-4],size:[1.4,1.2,1.4],children:e.jsx(M,{lit:t("holders")})}),e.jsx(y,{a:[n*(j.x+1.25),63,-4],b:[n*(j.x+1.25),71,-4],r:.45,children:e.jsx(M,{lit:t("holders")})}),e.jsx(m,{at:[n*(j.x+1.25),69,-4],size:[1.5,1.5,1.5],children:e.jsx(V,{lit:t("holders")})}),e.jsx(y,{a:[n*16.5,69,-4],b:[n*7,69,-4],r:.34,children:e.jsx(V,{lit:t("holders")})}),e.jsx(m,{at:[n*6.8,69.2,-4],size:[1.3,1.1,1.1],children:e.jsx(V,{lit:t("holders")})}),e.jsxs("mesh",{position:[n*(j.x+1.25),69,-2.9],rotation:[Math.PI/2,0,0],children:[e.jsx("cylinderGeometry",{args:[.45,.45,.6,12]}),e.jsx(ue,{lit:t("holders")})]}),e.jsx(L,{pts:[[n*6.8,69.6,-4],[n*6.2,77.5,-4],[n*5.6,78,-4],[n*5,77.5,-4],[n*4.4,71.5,-4],[n*3.8,71.3,-4]],r:.07,seg:40,children:e.jsx(M,{lit:t("holders")})}),e.jsx(y,{a:[n*6.2,77.6,-4],b:[n*7.4,48,-3.4],r:.07,seg:6,children:e.jsx(M,{lit:t("holders")})})]},n))})]})},gr=({id:o,kymo:s,...i})=>{switch(o){case"rbc-pipette":return e.jsx(qt,{kind:"rbc",...i});case"wbc-pipette":return e.jsx(qt,{kind:"wbc",...i});case"neubauer-chamber":return e.jsx(er,{...i});case"kymograph":return e.jsx(cr,{kymo:s,...i});case"langendorff":return e.jsx(jr,{...i})}},rs={"rbc-pipette":{all:{center:[.25,-1,0],halfW:5.9,halfH:1.6,from:[.2,.3,1]}},"wbc-pipette":{all:{center:[.25,-1,0],halfW:5.7,halfH:1.6,from:[.2,.3,1]}},"neubauer-chamber":{all:{center:[0,-1,0],halfW:44,halfH:21,from:[.15,1.3,.9]},closeUp:{grid:{center:[0,-.1,7.6],halfW:1.7,halfH:1.7,from:[0,1,.3]}}},kymograph:{all:{center:[7,25,3],halfW:21,halfH:26,from:[.4,.3,1]},closeUp:{paper:{center:[0,34.5,7.5],halfW:9,halfH:8,from:[.15,.1,1]},stylus:{center:[1,34.5,7.5],halfW:4,halfH:3.5,from:[.5,.25,1]},speed:{center:[0,14,9.5],halfW:4,halfH:5.6,from:[.05,.08,1]},clutch:{center:[9.5,13,0],halfW:4,halfH:4,from:[1,.12,.1]},contact:{center:[-5.2,22.6,-5.2],halfW:6,halfH:4.5,from:[-.75,.45,-.75]}}},langendorff:{all:{center:[2,59,0],halfW:34,halfH:64,from:[.35,.12,1]},closeUp:{reservoirs:{center:[0,108,-4],halfW:19,halfH:13,from:[.1,.1,1]},"head-tubes":{center:[0,103,-4],halfW:10,halfH:19,from:[.15,.05,1]},"y-piece":{center:[2,76,-1],halfW:9,halfH:14,from:[.2,.1,1]},bath:{center:[0,50,0],halfW:17,halfH:15,from:[.4,.35,1]},"inner-tubes":{center:[0,52,1],halfW:15,halfH:17,from:[.2,.5,1]},coil:{center:[0,44,-3],halfW:8,halfH:7,from:[.3,.8,1]},heater:{center:[3,43,6],halfW:9,halfH:7,from:[.5,.7,1]},stirrer:{center:[-8,50,-2],halfW:8,halfH:8,from:[-.5,.4,1]},probe:{center:[-9.6,53,4],halfW:7,halfH:12,from:[-.5,.3,1]},control:{center:[3,31,16],halfW:10,halfH:7,from:[.05,.05,1]},cannula:{center:[1,22,7],halfW:8,halfH:7,from:[.25,-.3,1]},thermometer:{center:[5,22,7],halfW:9,halfH:5,from:[.1,.1,1]},manometer:{center:[-20,23,7],halfW:7,halfH:12,from:[-.1,.05,1]},pulleys:{center:[11,14,7],halfW:16,halfH:8,from:[.1,.1,1]},lever:{center:[28,21,7],halfW:12,halfH:6,from:[.1,.1,1]},holders:{center:[0,70,-4],halfW:18,halfH:10,from:[.1,.25,1]}}}},br=({id:o,part:s})=>{var c;const i=ot(d=>d.camera),t=ot(d=>d.size.width/d.size.height),r=ot(d=>d.controls),a=p.useRef(null),n=p.useRef(!1),h=(s&&((c=rs[o].closeUp)==null?void 0:c[s])||null)??rs[o].all;return p.useEffect(()=>{const d=Math.tan(is.degToRad(i.fov/2)),f=1.15*Math.max(h.halfH/d,h.halfW/(d*t)),b=new D(...h.center),U=b.clone().add(new D(...h.from).normalize().multiplyScalar(f));n.current?a.current={pos:U,target:b}:(i.position.copy(U),i.lookAt(b),r&&(r.target.copy(b),r.update(),n.current=!0))},[h,t,i,r]),us(()=>{const d=a.current;!d||!r||(i.position.lerp(d.pos,.12),r.target.lerp(d.target,.12),r.update(),i.position.distanceTo(d.pos)<d.pos.distanceTo(d.target)*.002&&(a.current=null))}),null},nt="#CBD5E1",yr="#2F3E46",zr=({id:o,onBack:s,onOpen:i})=>{const t=Wt(o),[r,a]=p.useState(null),[n,l]=p.useState(null),[h,c]=p.useState(nt),d=r??n,f=t.parts.find(E=>E.id===d),b=t.compareWith&&Wt(t.compareWith),U=or();return e.jsxs("div",{className:"w-full h-[100dvh] bg-slate-950 flex flex-col overflow-hidden text-slate-200 font-sans",children:[e.jsxs("header",{className:"z-30 flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 gap-4 flex-none shadow-lg",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("button",{onClick:s,className:"p-2 bg-slate-800 rounded-full shadow-md hover:bg-slate-700 transition-colors border border-slate-700",children:e.jsx(Os,{className:"w-5 h-5 sm:w-6 sm:h-6"})}),e.jsxs("div",{children:[e.jsx("h1",{className:"text-base sm:text-xl font-bold tracking-tight leading-tight",children:t.name}),e.jsx("p",{className:"text-xs text-slate-400",children:t.alsoCalled})]})]}),e.jsx("button",{onClick:()=>c(E=>E===nt?yr:nt),className:"p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 border border-slate-700 transition-colors",title:"Toggle Canvas Background",children:h===nt?e.jsx(Gs,{className:"w-5 h-5"}):e.jsx(Us,{className:"w-5 h-5"})})]}),e.jsxs("main",{className:"flex-1 min-h-0 flex flex-col md:flex-row",children:[e.jsxs("div",{className:"relative h-[42%] md:h-auto md:flex-1 flex-none",children:[e.jsxs(Bs,{camera:{position:[3,4,14],fov:35},style:{background:h},onPointerMissed:()=>l(null),children:[e.jsx("color",{attach:"background",args:[h]},h),e.jsx(Hs,{variant:"studio"}),e.jsx("ambientLight",{intensity:.6}),e.jsx("directionalLight",{position:[5,8,6],intensity:1}),e.jsx(gr,{id:o,active:d,onHover:a,onSelect:l,kymo:U}),e.jsx(ks,{makeDefault:!0,enablePan:!0,screenSpacePanning:!0,zoomToCursor:!0}),e.jsx(br,{id:o,part:n})]}),f?e.jsx("div",{className:"absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 bg-slate-900/90 backdrop-blur-md border border-blue-500/30 rounded-full shadow-lg whitespace-nowrap pointer-events-none",children:e.jsx("div",{className:"text-blue-300 font-bold text-[11px] uppercase tracking-wider",children:f.name})}):e.jsx("div",{className:"absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 bg-slate-900/70 rounded-full text-[11px] text-slate-300 whitespace-nowrap pointer-events-none",children:"Drag to turn · two fingers to pan · tap a part"})]}),e.jsxs("aside",{className:"flex-1 md:flex-none md:w-96 min-h-0 overflow-y-auto bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 p-5 space-y-6 text-sm",children:[e.jsx("p",{className:"text-slate-300",children:t.summary}),o==="kymograph"&&e.jsx(ur,{kymo:U}),e.jsxs("section",{children:[e.jsx("h2",{className:"text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-2",children:"Parts"}),e.jsx("div",{className:"grid grid-cols-2 gap-2",children:t.parts.map(E=>e.jsx("button",{onClick:()=>l(x=>x===E.id?null:E.id),onMouseEnter:()=>a(E.id),onMouseLeave:()=>a(null),className:`text-left px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${d===E.id?"bg-blue-600/20 border-blue-500 text-blue-100":"bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"}`,children:E.name},E.id))})]}),e.jsxs("div",{className:"flex flex-col gap-2",children:[b&&e.jsxs("button",{onClick:()=>i(`instrument-${b.id}`),className:"w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-xl border border-slate-700 transition-colors",children:["Compare with the ",b.name]}),t.experiment&&e.jsxs("button",{onClick:()=>i(t.experiment.view),className:"w-full bg-slate-800 hover:bg-slate-700 text-indigo-200 font-bold py-3 rounded-xl border border-indigo-500/40 transition-colors",children:["Open the ",t.experiment.label," experiment"]})]})]})]})]})};export{zr as InstrumentViewer};

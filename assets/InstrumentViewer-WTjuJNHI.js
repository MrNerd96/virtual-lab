import{au as us,av as Ts,aw as Xt,ax as _t,ay as Ie,az as Gs,aA as Ct,aB as ps,V as I,aC as Os,aD as Yt,aE as Kt,t as Le,aF as Rs,aG as De,aH as Ns,aI as Us,f as xs,r as p,G as at,a as Bs,aJ as It,aK as Hs,m as Tt,D as Gt,j as e,v as Ot,H as Rt,i as fs,aL as ms,u as js,x as gs,w as bs,R as se,y as ks,aM as qt,A as Ws,M as Fs,b as $s,d as Vs,L as Xs,O as Ys}from"./index-DAqUDoX5.js";import{T as K,a as le,L as Nt}from"./labelFonts-HhR_QzLy.js";const ys=us>=125?"uv1":"uv2",Zt=new Ct,Ve=new I;class Ut extends Ts{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry";const s=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],i=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],t=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(t),this.setAttribute("position",new Xt(s,3)),this.setAttribute("uv",new Xt(i,2))}applyMatrix4(s){const i=this.attributes.instanceStart,t=this.attributes.instanceEnd;return i!==void 0&&(i.applyMatrix4(s),t.applyMatrix4(s),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(s){let i;s instanceof Float32Array?i=s:Array.isArray(s)&&(i=new Float32Array(s));const t=new _t(i,6,1);return this.setAttribute("instanceStart",new Ie(t,3,0)),this.setAttribute("instanceEnd",new Ie(t,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(s,i=3){let t;s instanceof Float32Array?t=s:Array.isArray(s)&&(t=new Float32Array(s));const r=new _t(t,i*2,1);return this.setAttribute("instanceColorStart",new Ie(r,i,0)),this.setAttribute("instanceColorEnd",new Ie(r,i,i)),this}fromWireframeGeometry(s){return this.setPositions(s.attributes.position.array),this}fromEdgesGeometry(s){return this.setPositions(s.attributes.position.array),this}fromMesh(s){return this.fromWireframeGeometry(new Gs(s.geometry)),this}fromLineSegments(s){const i=s.geometry;return this.setPositions(i.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Ct);const s=this.attributes.instanceStart,i=this.attributes.instanceEnd;s!==void 0&&i!==void 0&&(this.boundingBox.setFromBufferAttribute(s),Zt.setFromBufferAttribute(i),this.boundingBox.union(Zt))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new ps),this.boundingBox===null&&this.computeBoundingBox();const s=this.attributes.instanceStart,i=this.attributes.instanceEnd;if(s!==void 0&&i!==void 0){const t=this.boundingSphere.center;this.boundingBox.getCenter(t);let r=0;for(let l=0,n=s.count;l<n;l++)Ve.fromBufferAttribute(s,l),r=Math.max(r,t.distanceToSquared(Ve)),Ve.fromBufferAttribute(i,l),r=Math.max(r,t.distanceToSquared(Ve));this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(s){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(s)}}class vs extends Ut{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(s){const i=s.length-3,t=new Float32Array(2*i);for(let r=0;r<i;r+=3)t[2*r]=s[r],t[2*r+1]=s[r+1],t[2*r+2]=s[r+2],t[2*r+3]=s[r+3],t[2*r+4]=s[r+4],t[2*r+5]=s[r+5];return super.setPositions(t),this}setColors(s,i=3){const t=s.length-i,r=new Float32Array(2*t);if(i===3)for(let l=0;l<t;l+=i)r[2*l]=s[l],r[2*l+1]=s[l+1],r[2*l+2]=s[l+2],r[2*l+3]=s[l+3],r[2*l+4]=s[l+4],r[2*l+5]=s[l+5];else for(let l=0;l<t;l+=i)r[2*l]=s[l],r[2*l+1]=s[l+1],r[2*l+2]=s[l+2],r[2*l+3]=s[l+3],r[2*l+4]=s[l+4],r[2*l+5]=s[l+5],r[2*l+6]=s[l+6],r[2*l+7]=s[l+7];return super.setColors(r,i),this}fromLine(s){const i=s.geometry;return this.setPositions(i.attributes.position.array),this}}class Bt extends Os{constructor(s){super({type:"LineMaterial",uniforms:Yt.clone(Yt.merge([Kt.common,Kt.fog,{worldUnits:{value:1},linewidth:{value:1},resolution:{value:new Le(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}}])),vertexShader:`
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
					#include <${us>=154?"colorspace_fragment":"encodings_fragment"}>
					#include <fog_fragment>
					#include <premultiplied_alpha_fragment>

				}
			`,clipping:!0}),this.isLineMaterial=!0,this.onBeforeCompile=function(){this.transparent?this.defines.USE_LINE_COLOR_ALPHA="1":delete this.defines.USE_LINE_COLOR_ALPHA},Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(i){this.uniforms.diffuse.value=i}},worldUnits:{enumerable:!0,get:function(){return"WORLD_UNITS"in this.defines},set:function(i){i===!0?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(i){this.uniforms.linewidth.value=i}},dashed:{enumerable:!0,get:function(){return"USE_DASH"in this.defines},set(i){!!i!="USE_DASH"in this.defines&&(this.needsUpdate=!0),i===!0?this.defines.USE_DASH="":delete this.defines.USE_DASH}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(i){this.uniforms.dashScale.value=i}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(i){this.uniforms.dashSize.value=i}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(i){this.uniforms.dashOffset.value=i}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(i){this.uniforms.gapSize.value=i}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(i){this.uniforms.opacity.value=i}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(i){this.uniforms.resolution.value.copy(i)}},alphaToCoverage:{enumerable:!0,get:function(){return"USE_ALPHA_TO_COVERAGE"in this.defines},set:function(i){!!i!="USE_ALPHA_TO_COVERAGE"in this.defines&&(this.needsUpdate=!0),i===!0?(this.defines.USE_ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.USE_ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(s)}}const bt=new De,Jt=new I,Qt=new I,B=new De,H=new De,re=new De,yt=new I,vt=new Us,k=new Ns,es=new I,Xe=new Ct,Ye=new ps,ne=new De;let de,ve;function ts(o,s,i){return ne.set(0,0,-s,1).applyMatrix4(o.projectionMatrix),ne.multiplyScalar(1/ne.w),ne.x=ve/i.width,ne.y=ve/i.height,ne.applyMatrix4(o.projectionMatrixInverse),ne.multiplyScalar(1/ne.w),Math.abs(Math.max(ne.x,ne.y))}function Ks(o,s){const i=o.matrixWorld,t=o.geometry,r=t.attributes.instanceStart,l=t.attributes.instanceEnd,n=Math.min(t.instanceCount,r.count);for(let a=0,h=n;a<h;a++){k.start.fromBufferAttribute(r,a),k.end.fromBufferAttribute(l,a),k.applyMatrix4(i);const c=new I,d=new I;de.distanceSqToSegment(k.start,k.end,d,c),d.distanceTo(c)<ve*.5&&s.push({point:d,pointOnLine:c,distance:de.origin.distanceTo(d),object:o,face:null,faceIndex:a,uv:null,[ys]:null})}}function qs(o,s,i){const t=s.projectionMatrix,l=o.material.resolution,n=o.matrixWorld,a=o.geometry,h=a.attributes.instanceStart,c=a.attributes.instanceEnd,d=Math.min(a.instanceCount,h.count),x=-s.near;de.at(1,re),re.w=1,re.applyMatrix4(s.matrixWorldInverse),re.applyMatrix4(t),re.multiplyScalar(1/re.w),re.x*=l.x/2,re.y*=l.y/2,re.z=0,yt.copy(re),vt.multiplyMatrices(s.matrixWorldInverse,n);for(let v=0,U=d;v<U;v++){if(B.fromBufferAttribute(h,v),H.fromBufferAttribute(c,v),B.w=1,H.w=1,B.applyMatrix4(vt),H.applyMatrix4(vt),B.z>x&&H.z>x)continue;if(B.z>x){const S=B.z-H.z,R=(B.z-x)/S;B.lerp(H,R)}else if(H.z>x){const S=H.z-B.z,R=(H.z-x)/S;H.lerp(B,R)}B.applyMatrix4(t),H.applyMatrix4(t),B.multiplyScalar(1/B.w),H.multiplyScalar(1/H.w),B.x*=l.x/2,B.y*=l.y/2,H.x*=l.x/2,H.y*=l.y/2,k.start.copy(B),k.start.z=0,k.end.copy(H),k.end.z=0;const f=k.closestPointToPointParameter(yt,!0);k.at(f,es);const z=xs.lerp(B.z,H.z,f),W=z>=-1&&z<=1,q=yt.distanceTo(es)<ve*.5;if(W&&q){k.start.fromBufferAttribute(h,v),k.end.fromBufferAttribute(c,v),k.start.applyMatrix4(n),k.end.applyMatrix4(n);const S=new I,R=new I;de.distanceSqToSegment(k.start,k.end,R,S),i.push({point:R,pointOnLine:S,distance:de.origin.distanceTo(R),object:o,face:null,faceIndex:v,uv:null,[ys]:null})}}}class Ms extends Rs{constructor(s=new Ut,i=new Bt({color:Math.random()*16777215})){super(s,i),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){const s=this.geometry,i=s.attributes.instanceStart,t=s.attributes.instanceEnd,r=new Float32Array(2*i.count);for(let n=0,a=0,h=i.count;n<h;n++,a+=2)Jt.fromBufferAttribute(i,n),Qt.fromBufferAttribute(t,n),r[a]=a===0?0:r[a-1],r[a+1]=r[a]+Jt.distanceTo(Qt);const l=new _t(r,2,1);return s.setAttribute("instanceDistanceStart",new Ie(l,1,0)),s.setAttribute("instanceDistanceEnd",new Ie(l,1,1)),this}raycast(s,i){const t=this.material.worldUnits,r=s.camera;r===null&&!t&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');const l=s.params.Line2!==void 0&&s.params.Line2.threshold||0;de=s.ray;const n=this.matrixWorld,a=this.geometry,h=this.material;ve=h.linewidth+l,a.boundingSphere===null&&a.computeBoundingSphere(),Ye.copy(a.boundingSphere).applyMatrix4(n);let c;if(t)c=ve*.5;else{const x=Math.max(r.near,Ye.distanceToPoint(de.origin));c=ts(r,x,h.resolution)}if(Ye.radius+=c,de.intersectsSphere(Ye)===!1)return;a.boundingBox===null&&a.computeBoundingBox(),Xe.copy(a.boundingBox).applyMatrix4(n);let d;if(t)d=ve*.5;else{const x=Math.max(r.near,Xe.distanceToPoint(de.origin));d=ts(r,x,h.resolution)}Xe.expandByScalar(d),de.intersectsBox(Xe)!==!1&&(t?Ks(this,i):qs(this,r,i))}onBeforeRender(s){const i=this.material.uniforms;i&&i.resolution&&(s.getViewport(bt),this.material.uniforms.resolution.value.set(bt.z,bt.w))}}class Zs extends Ms{constructor(s=new vs,i=new Bt({color:Math.random()*16777215})){super(s,i),this.isLine2=!0,this.type="Line2"}}const Js=p.forwardRef(function({points:s,color:i=16777215,vertexColors:t,linewidth:r,lineWidth:l,segments:n,dashed:a,...h},c){var d,x;const v=at(W=>W.size),U=p.useMemo(()=>n?new Ms:new Zs,[n]),[E]=p.useState(()=>new Bt),f=(t==null||(d=t[0])==null?void 0:d.length)===4?4:3,z=p.useMemo(()=>{const W=n?new Ut:new vs,q=s.map(S=>{const R=Array.isArray(S);return S instanceof I||S instanceof De?[S.x,S.y,S.z]:S instanceof Le?[S.x,S.y,0]:R&&S.length===3?[S[0],S[1],S[2]]:R&&S.length===2?[S[0],S[1],0]:S});if(W.setPositions(q.flat()),t){i=16777215;const S=t.map(R=>R instanceof Bs?R.toArray():R);W.setColors(S.flat(),f)}return W},[s,n,t,f]);return p.useLayoutEffect(()=>{U.computeLineDistances()},[s,U]),p.useLayoutEffect(()=>{a?E.defines.USE_DASH="":delete E.defines.USE_DASH,E.needsUpdate=!0},[a,E]),p.useEffect(()=>()=>{z.dispose(),E.dispose()},[z]),p.createElement("primitive",It({object:U,ref:c},h),p.createElement("primitive",{object:z,attach:"geometry"}),p.createElement("primitive",It({object:E,attach:"material",color:i,vertexColors:!!t,resolution:[v.width,v.height],linewidth:(x=r??l)!==null&&x!==void 0?x:1,dashed:a,transparent:f===4},h)))}),Lt=p.forwardRef(({threshold:o=15,geometry:s,...i},t)=>{const r=p.useRef(null);p.useImperativeHandle(t,()=>r.current,[]);const l=p.useMemo(()=>[0,0,0,1,0,0],[]),n=p.useRef(),a=p.useRef();return p.useLayoutEffect(()=>{const h=r.current.parent,c=s??(h==null?void 0:h.geometry);if(!c||n.current===c&&a.current===o)return;n.current=c,a.current=o;const x=new Hs(c,o).attributes.position.array;r.current.geometry.setPositions(x),r.current.geometry.attributes.instanceStart.needsUpdate=!0,r.current.geometry.attributes.instanceEnd.needsUpdate=!0,r.current.computeLineDistances()}),p.createElement(Js,It({segments:!0,points:l,ref:r,raycast:()=>null},i))}),Qs={rbc:{bulbLen:2.2,bulbR:.4,bore:.03,bead:[.2,.1],beadColor:"#8b1a1a",topMark:"101",mouth:"#e11d27"},wbc:{bulbLen:1.8,bulbR:.33,bore:.06,bead:[.15,.095],beadColor:"#f8fafc",topMark:"11",mouth:"#f4f4f5"}},ae=.2,Ke=.5,oe=6,er=1.7,Mt=.7,ue=.25,Dt="#1e3a8a",ce="#3b82f6",Ae=({points:o,x0:s,children:i,userData:t})=>{const r=p.useMemo(()=>new Ot(o.map(([l,n])=>new Le(l,n)),48),[o]);return e.jsx("mesh",{geometry:r,position:[s,0,0],rotation:[0,0,-Math.PI/2],userData:t,children:i})},tr=o=>{for(let s=o;s;s=s.parent)if(s.userData.part)return s.userData;return null},ss=o=>{var i;const s=o.intersections.map(t=>tr(t.object)).filter(t=>!!t);return((i=s.find(t=>!t.glass)??s[0])==null?void 0:i.part)??null},qe=({lit:o})=>e.jsx("meshPhysicalMaterial",{color:o?ce:"#ffffff",transparent:!0,opacity:o?.6:.22,roughness:.03,metalness:0,clearcoat:1,envMapIntensity:1.6,side:Rt,depthWrite:!1,emissive:o?ce:"#000000",emissiveIntensity:o?.7:0}),St=({at:o,children:s,lit:i})=>e.jsx(K,{font:le,position:[o,0,ae+.012],rotation:[0,0,-Math.PI/2],fontSize:.22,color:i?ce:Dt,anchorX:"center",anchorY:"middle",children:s}),rs=({kind:o,active:s,onHover:i,onSelect:t})=>{const r=Qs[o],l=oe+r.bulbLen,n=l+.3,a=l+er,h=-a/2-.6,c=f=>h+f,d=f=>s===f,x=p.useMemo(()=>{const f=[];for(let z=0;z<=40;z++){const W=z/40;f.push([ae+(r.bulbR-ae)*Math.pow(Math.sin(Math.PI*W),1.6),oe+r.bulbLen*W])}return{tip:[[.05,0],[.12,Ke*.6],[ae,Ke]],stem:[[ae,Ke],[ae,oe]],bulb:f,neck:[[ae,l],[ae,a]],sleeve:[[ue+.03,a-Mt],[ue,a-Mt+.12],[ue,a+.05]]}},[r.bulbLen,r.bulbR,l,a]),v=p.useMemo(()=>{const f=c(a),z=new Tt([new I(f,0,0),new I(f+.9,0,-.05),new I(f+1.7,-.5,-.1),new I(f+1.75,-1.5,0),new I(f+.8,-2.1,.15),new I(f-1.6,-2.25,.15),new I(f-4.2,-2.05,0)]),W=z.getPoint(1),q=z.getTangent(1);return{geometry:new Gt(z,120,ue*.76,16,!1),end:W,angle:Math.atan2(q.y,q.x)}},[a,h]),U=Array.from({length:10},(f,z)=>(z+1)*(oe/10)),E=(f,z)=>e.jsxs("mesh",{position:[c((f+z)/2),0,-.07],children:[e.jsx("boxGeometry",{args:[z-f,.3,.05]}),e.jsx("meshStandardMaterial",{color:"#ffffff",roughness:.55})]});return e.jsxs("group",{onPointerMove:f=>{f.stopPropagation(),i(ss(f))},onPointerOut:()=>i(null),onClick:f=>{f.stopPropagation();const z=ss(f);z&&t(z)},children:[e.jsx(Ae,{points:x.tip,x0:h,userData:{part:"tip",glass:!0},children:e.jsx(qe,{lit:d("tip")})}),e.jsx(Ae,{points:x.stem,x0:h,userData:{part:"stem",glass:!0},children:e.jsx(qe,{lit:d("stem")})}),e.jsx(Ae,{points:x.bulb,x0:h,userData:{part:"bulb",glass:!0},children:e.jsx(qe,{lit:d("bulb")})}),e.jsx(Ae,{points:x.neck,x0:h,userData:{part:"top-mark",glass:!0},children:e.jsx(qe,{lit:d("top-mark")})}),E(Ke*.8,oe),E(l,a-Mt),e.jsxs("mesh",{position:[c(oe/2+.1),0,0],rotation:[0,0,Math.PI/2],userData:{part:"stem"},children:[e.jsx("cylinderGeometry",{args:[r.bore,r.bore,oe-.2,12]}),e.jsx("meshStandardMaterial",{color:d("stem")?ce:"#9aa9b8"})]}),e.jsxs("group",{userData:{part:"marks"},children:[U.map(f=>e.jsx("group",{position:[c(f),0,0],rotation:[0,Math.PI/2,0],children:e.jsxs("mesh",{rotation:[0,0,Math.PI/2],children:[e.jsx("torusGeometry",{args:[ae+.004,.009,4,24,Math.PI]}),e.jsx("meshBasicMaterial",{color:d("marks")?ce:Dt})]})},f)),e.jsx(St,{at:c(oe/2-.22),lit:d("marks"),children:"0.5"}),e.jsx(St,{at:c(oe-.2),lit:d("marks"),children:"1"})]}),e.jsxs("group",{userData:{part:"top-mark"},children:[e.jsx("group",{position:[c(n),0,0],rotation:[0,Math.PI/2,0],children:e.jsxs("mesh",{rotation:[0,0,Math.PI/2],children:[e.jsx("torusGeometry",{args:[ae+.004,.009,4,24,Math.PI]}),e.jsx("meshBasicMaterial",{color:d("top-mark")?ce:Dt})]})}),e.jsx(St,{at:c(n+.26),lit:d("top-mark"),children:r.topMark})]}),e.jsxs("mesh",{position:[c(oe+r.bulbLen*.5),-(r.bulbR-r.bead[1]-.06),0],scale:[r.bead[0],r.bead[1],r.bead[1]],userData:{part:"bead"},children:[e.jsx("sphereGeometry",{args:[1,32,24]}),e.jsx("meshStandardMaterial",{color:r.beadColor,roughness:.3,emissive:d("bead")?ce:"#000000",emissiveIntensity:d("bead")?.6:0})]}),e.jsxs("group",{userData:{part:"tube"},children:[e.jsx(Ae,{points:x.sleeve,x0:h,children:e.jsx(ns,{lit:d("tube")})}),e.jsx("mesh",{geometry:v.geometry,children:e.jsx(ns,{lit:d("tube")})})]}),e.jsxs("group",{position:[v.end.x,v.end.y,v.end.z],rotation:[0,0,v.angle-Math.PI/2],userData:{part:"mouthpiece"},children:[e.jsxs("mesh",{position:[0,.08,0],children:[e.jsx("cylinderGeometry",{args:[ue*1.15,ue*1.15,.16,24]}),e.jsx("meshStandardMaterial",{color:d("mouthpiece")?ce:r.mouth,roughness:.35})]}),e.jsxs("mesh",{position:[0,.42,0],children:[e.jsx("cylinderGeometry",{args:[ue*.95,ue*.8,.55,24]}),e.jsx("meshStandardMaterial",{color:d("mouthpiece")?ce:r.mouth,roughness:.35})]})]})]})},ns=({lit:o})=>e.jsx("meshPhysicalMaterial",{color:o?ce:"#e3d6b4",roughness:.4,transparent:!0,opacity:.82,clearcoat:.4}),Ze=75,os=33,Ce=6,wt=3,Je=1,sr=7.6,rr="#2f3f9e",Qe=.02,et=o=>({polygonOffset:!0,polygonOffsetFactor:-o,polygonOffsetUnits:-4*o}),me="#3b82f6",nr=(()=>{let o=null;return()=>{if(o)return o;const s=2048,i=s/3,t=document.createElement("canvas");t.width=t.height=s;const r=t.getContext("2d");r.strokeStyle="rgba(15, 23, 42, 0.85)";const l=(a,h,c,d,x)=>{r.lineWidth=x,r.beginPath(),r.moveTo(a*i,h*i),r.lineTo(c*i,d*i),r.stroke()},n=(a,h,c,d)=>{for(const x of[-.0125,0,.0125])h?l(a+x,c,a+x,d,3):l(c,a+x,d,a+x,3)};for(let a=0;a<=3;a++)n(a,!0,0,3),n(a,!1,0,3);for(const[a,h]of[[0,0],[2,0],[0,2],[2,2]])for(let c=1;c<4;c++)l(a+c/4,h,a+c/4,h+1,2.5),l(a,h+c/4,a+1,h+c/4,2.5);for(let a=1;a<5;a++)n(1+a/5,!0,0,3),n(1+a/5,!1,0,3);for(let a=1;a<20;a++)a%4!==0&&(l(1+a/20,1,1+a/20,2,1.5),l(1,1+a/20,2,1+a/20,1.5));for(let a=1;a<4;a++)l(1,a/4,2,a/4,2.5),l(1,2+a/4,2,2+a/4,2.5),l(a/4,1,a/4,2,2.5),l(2+a/4,1,2+a/4,2,2.5);return o=new fs(t),o.anisotropy=8,o.colorSpace=ms,o}})(),or=o=>{for(let s=o;s;s=s.parent)if(s.userData.part)return s.userData;return null},is=o=>{var i;const s=o.intersections.map(t=>or(t.object)).filter(t=>!!t);return((i=s.find(t=>!t.glass)??s[0])==null?void 0:i.part)??null},tt=({lit:o,opacity:s=.38})=>e.jsx("meshPhysicalMaterial",{color:o?me:"#fbf1f7",transparent:!0,opacity:o?.6:s,roughness:.06,metalness:0,clearcoat:1,envMapIntensity:1.4,depthWrite:!1,emissive:o?me:"#000000",emissiveIntensity:o?.6:0}),st=({x:o,y:s,z:i,children:t,part:r})=>e.jsxs("mesh",{position:[(o[0]+o[1])/2,(s[0]+s[1])/2,(i[0]+i[1])/2],userData:r,children:[e.jsx("boxGeometry",{args:[o[1]-o[0],s[1]-s[0],i[1]-i[0]]}),t]}),zt=({x:o,z:s,size:i,lit:t,children:r})=>e.jsx(K,{font:Nt,position:[o,.05,s],rotation:[-Math.PI/2,0,0],fontSize:i,color:t?me:rr,anchorX:"center",anchorY:"middle",textAlign:"center",lineHeight:1.15,children:r}),ir=({active:o,onHover:s,onSelect:i})=>{const t=c=>o===c,r=p.useMemo(nr,[]),l=Ce+wt,n=os/2,a=-.1,h=-1;return e.jsxs("group",{onPointerMove:c=>{c.stopPropagation(),s(is(c))},onPointerOut:()=>s(null),onClick:c=>{c.stopPropagation();const d=is(c);d&&i(d)},children:[e.jsx(st,{x:[-Ze/2,Ze/2],y:[-4,h],z:[-n,n],part:{part:"slide",glass:!0},children:e.jsx(tt,{lit:t("slide")})}),[-1,1].map(c=>e.jsx(st,{x:c<0?[-Ze/2,-l]:[l,Ze/2],y:[h,0],z:[-n,n],part:{part:"platforms",glass:!0},children:e.jsx(tt,{lit:t("platforms")})},c)),[-1,1].map(c=>e.jsx(st,{x:[-Ce,Ce],y:[h,a],z:c<0?[-n,-Je]:[Je,n],part:{part:"central",glass:!0},children:e.jsx(tt,{lit:t("central")})},c)),[-1,1].map(c=>e.jsxs("mesh",{position:[0,a+Qe,c*(Je+6.5)],rotation:[-Math.PI/2,0,0],userData:{part:"central"},children:[e.jsx("planeGeometry",{args:[7,12.6]}),e.jsx("meshStandardMaterial",{color:t("central")?me:"#a7afb4",metalness:.85,roughness:.28,...et(1)})]},c)),[-1,1].map(c=>e.jsxs("mesh",{position:[0,a+2*Qe,c*sr],rotation:[-Math.PI/2,0,0],userData:{part:"grid"},children:[e.jsx("planeGeometry",{args:[3,3]}),e.jsx("meshBasicMaterial",{map:r,transparent:!0,color:t("grid")?me:"#ffffff",...et(2)})]},c)),e.jsxs("group",{userData:{part:"moats"},children:[[-1,1].map(c=>e.jsxs("mesh",{position:[c*(Ce+wt/2),h+Qe,0],rotation:[-Math.PI/2,0,0],children:[e.jsx("planeGeometry",{args:[wt,os]}),e.jsx("meshStandardMaterial",{color:t("moats")?me:"#ece6ea",roughness:.95,transparent:!0,opacity:.65,...et(1)})]},c)),e.jsxs("mesh",{position:[0,h+Qe,0],rotation:[-Math.PI/2,0,0],children:[e.jsx("planeGeometry",{args:[Ce*2,Je*2]}),e.jsx("meshStandardMaterial",{color:t("moats")?me:"#ece6ea",roughness:.95,transparent:!0,opacity:.65,...et(1)})]})]}),e.jsxs("group",{userData:{part:"print"},children:[e.jsx(zt,{x:-23,z:-6,size:2.4,lit:t("print"),children:`Tiefe
Depth
Profondeur
0.100mm`}),e.jsx(zt,{x:-23,z:11,size:2.4,lit:t("print"),children:"0.0025mm²"}),e.jsx(zt,{x:23,z:-7,size:2.2,lit:t("print"),children:`NEUBAUER
IMPROVED
BRIGHT-LINE`})]}),e.jsxs(st,{x:[-11,11],y:[0,.4],z:[-11,11],part:{part:"coverslip",glass:!0},children:[e.jsx(tt,{lit:t("coverslip"),opacity:.18}),e.jsx(Lt,{color:t("coverslip")?me:"#8fa0b4",lineWidth:t("coverslip")?2.5:1.5})]})]})},dt=[.12,.25,1.25,2.5,12.5,25,320,640],ar=8,Ee=7.5,ee=15,ht=7.56,lr=2*Math.PI*Ee*10,M={w:19,h:19,d:19,y0:1.2},Ss=M.y0+M.h,Q=Ss+.6,$=M.d/2,lt=Q+3,ws=9,Te=lt+ws+ee+2.5,F=new I(21,34.5,ht+.32),Ge=F.x,He=2.2,At=3,ke="#3b82f6",_e=-2.35,Pt=.6+_e,Me=1536,ut=Me/(2*Math.PI*ht),ye=Math.round(ee*ut),as=Math.round(1.2*ut),cr=o=>{o.globalCompositeOperation="source-over",o.fillStyle="#17150f",o.fillRect(0,0,Me,ye);for(let s=0;s<260;s++){const i=Math.random()*Me,t=Math.random()*ye,r=8+Math.random()*60,l=o.createRadialGradient(i,t,0,i,t,r),n=Math.random()<.5?"40,36,28":"6,6,5";l.addColorStop(0,`rgba(${n},${.08+Math.random()*.1})`),l.addColorStop(1,`rgba(${n},0)`),o.fillStyle=l,o.fillRect(i-r,t-r,2*r,2*r)}for(let s=0;s<9e3;s++)o.fillStyle=Math.random()<.5?"rgba(60,55,45,0.25)":"rgba(0,0,0,0.3)",o.fillRect(Math.random()*Me,Math.random()*ye,1.2,1.2);o.fillStyle="rgba(0,0,0,0.35)",o.fillRect(0,0,as,ye),o.fillStyle="rgba(120,112,95,0.55)",o.fillRect(as-2,0,2,ye)},dr=o=>{const s=o-.01;return s<=0||s>=.09?0:s<.04?At*Math.sin(Math.PI/2*(s/.04))**2:At*Math.cos(Math.PI/2*((s-.04)/.05))**2},hr=()=>{const[o,s]=p.useState({on:!1,speed:6,clutch:!0,lift:3.5,leverOn:!0,contactStim:!1}),i=p.useRef([]),t=p.useRef(0),[r,l]=p.useState(0),n=p.useCallback(h=>s(c=>({...c,...h})),[]),a=p.useCallback(()=>{i.current.push(t.current)},[]);return{state:o,set:n,stimulate:a,stimuli:i,clock:t,paperKey:r,newPaper:()=>l(h=>h+1)}},zs=o=>o.on&&o.clutch&&o.speed!==ar,ur=o=>{for(let s=o;s;s=s.parent)if(s.userData.part)return s.userData.part;return null},ls=o=>{for(const s of o.intersections){const i=ur(s.object);if(i)return i}return null},N=({lit:o,color:s,metal:i=.3,rough:t=.55})=>e.jsx("meshStandardMaterial",{color:o?ke:s,metalness:o?.1:i,roughness:t,emissive:o?ke:"#000000",emissiveIntensity:o?.35:0}),C=({lit:o})=>e.jsx(N,{lit:o,color:"#dfe3e7",metal:1,rough:.15}),Oe=({lit:o})=>e.jsx(N,{lit:o,color:"#c9cdd1",metal:.85,rough:.35}),Re=({lit:o})=>e.jsx(N,{lit:o,color:"#c9a24a",metal:.9,rough:.3}),ie=({lit:o})=>e.jsx(N,{lit:o,color:"#1d1f22",metal:.2,rough:.45}),rt=({lit:o})=>e.jsx(N,{lit:o,color:"#ecebe5",metal:.05,rough:.45}),L=({r:o,h:s,pos:i,rot:t,seg:r=32,r2:l,children:n})=>e.jsxs("mesh",{position:i,rotation:t,children:[e.jsx("cylinderGeometry",{args:[l??o,o,s,r]}),n]}),P=({size:o,pos:s,rot:i,children:t})=>e.jsxs("mesh",{position:s,rotation:i,children:[e.jsx("boxGeometry",{args:o}),t]}),ze=({r:o,h:s,pos:i,rot:t,lit:r,color:l="#dfe3e7"})=>{const n=p.useMemo(()=>{const a=[];for(let d=0;d<=80;d++){const x=d/80*Math.PI*2,v=d%2?o:o*.92;a.push(new Le(Math.cos(x)*v,Math.sin(x)*v))}const c=new gs(new bs(a),{depth:s,bevelEnabled:!0,bevelSize:o*.04,bevelThickness:o*.04,bevelSegments:1});return c.translate(0,0,-s/2),c.rotateX(Math.PI/2),c},[o,s]);return e.jsx("mesh",{geometry:n,position:i,rotation:t,children:e.jsx(N,{lit:r,color:l,metal:.9,rough:.3})})},Ne=({w:o,h:s,lit:i})=>e.jsx(e.Fragment,{children:[[-1,-1],[1,-1],[-1,1],[1,1]].map(([t,r],l)=>e.jsxs("mesh",{position:[t*(o/2-.9),r*(s/2-.9),.02],scale:[1,1,.45],children:[e.jsx("sphereGeometry",{args:[.32,14,8,0,Math.PI*2,0,Math.PI/2]}),e.jsx(N,{lit:i,color:"#9aa0a6",metal:.9,rough:.3})]},l))}),pr=16.9,xr=.72,Ue=o=>pr-o*xr,fr=({active:o,onHover:s,onSelect:i,kymo:t})=>{const r=u=>o===u,{state:l,stimuli:n,clock:a,paperKey:h}=t,c=p.useRef(l);c.current=l;const d=p.useMemo(()=>{const u=document.createElement("canvas");return u.width=Me,u.height=ye,u},[]),x=p.useMemo(()=>{const u=new fs(d);return u.colorSpace=ms,u.anisotropy=8,u},[d]),v=p.useRef(null);p.useMemo(()=>{cr(d.getContext("2d")),x.needsUpdate=!0,v.current=null},[h,d,x]);const U=p.useRef(null),E=p.useRef(null),f=p.useRef(null),z=p.useRef(null),W=p.useRef(null),q=p.useRef(null),S=p.useRef(null),R=p.useRef(null),pt=p.useRef(null),xt=p.useRef(null),ft=p.useRef(null),Es=p.useRef({phi:0,rate:0,lift:l.lift,swing:0,slot:Ue(l.speed),clutch:1,t:performance.now()/1e3,flash:0,dirty:0});js(()=>{const u=Es.current,G=c.current,te=d.getContext("2d"),Wt=performance.now()/1e3,Se=Math.min(.1,Wt-u.t);u.t=Wt;const mt=a.current+Se,_s=zs(G)?dt[G.speed]/10/Ee:0,We=V=>Math.min(1,Se*V);u.lift+=(G.lift-u.lift)*We(6),u.swing+=((G.leverOn?0:1)-u.swing)*We(5),u.slot+=(Ue(G.speed)-u.slot)*We(12),u.clutch+=((G.clutch?1:0)-u.clutch)*We(10),te.strokeStyle="rgba(236,230,214,0.92)",te.lineWidth=2.2,te.lineCap="round",te.lineJoin="round",te.beginPath();let jt=!1;const Ft=Math.max(1,Math.ceil(Se/.002)),gt=Se/Ft;let Fe=0;for(let V=1;V<=Ft;V++){const Vt=mt-Se+V*gt;u.rate+=(_s-u.rate)*Math.min(1,gt*8),u.rate<1e-5&&(u.rate=0);const Ls=u.phi;if(u.phi-=u.rate*gt,u.rate>0&&Math.floor((-Ls-Pt+_e)/(2*Math.PI))!==Math.floor((-u.phi-Pt+_e)/(2*Math.PI))&&(u.flash=1,G.contactStim&&n.current.push(Vt)),Fe=Math.min(n.current.reduce((As,Cs)=>As+dr(Vt-Cs),0),At*1.6),u.swing>.04){v.current=null;continue}const Ds=F.y+Fe,we=(lt+u.lift+ee-Ds)*ut,$e=(-u.phi%(2*Math.PI)+2*Math.PI)%(2*Math.PI)/(2*Math.PI)*Me;if(we<2||we>ye-2){v.current=null;continue}const ge=v.current;ge&&Math.abs($e-ge.u)<Me/2&&Math.abs(we-ge.v)<1.5*ut&&(Math.abs($e-ge.u)>.05||Math.abs(we-ge.v)>.05)&&(te.moveTo(ge.u,ge.v),te.lineTo($e,we),jt=!0),v.current={u:$e,v:we}}jt&&(te.stroke(),u.dirty++),u.dirty&&(u.dirty>1||!jt)&&(x.needsUpdate=!0,u.dirty=0),n.current=n.current.filter(V=>mt-V<.2),a.current=mt,U.current&&(U.current.rotation.y=u.phi),E.current&&(E.current.position.y=lt+u.lift),z.current&&(z.current.rotation.y=u.swing*.07),f.current&&(f.current.rotation.z=-Math.asin(Fe/Ge)),S.current&&(S.current.position.y=u.slot),R.current&&(R.current.rotation.z=.7-1.4*(1-u.clutch)),pt.current&&(pt.current.rotation.x=G.on?-.22:.22);const $t=Fe*He/Ge,Is=F.y-.3-$t;if(q.current){const V=Is-Et;q.current.scale.y=V,q.current.position.y=Et+V/2}if(W.current){const V=$t/ct;W.current.scale.set(1+V*2.5,1-V,1+V*2.5)}xt.current&&(xt.current.emissiveIntensity=G.on?1.6:0),u.flash=Math.max(0,u.flash-Se*8),ft.current&&(ft.current.emissiveIntensity=u.flash*3)});const kt=[Math.sin(_e),Math.cos(_e)];return e.jsxs("group",{onPointerMove:u=>{u.stopPropagation(),s(ls(u))},onPointerOut:()=>s(null),onClick:u=>{u.stopPropagation();const G=ls(u);G&&i(G)},children:[e.jsxs("mesh",{position:[7,-.5,2],children:[e.jsx("boxGeometry",{args:[60,1,38]}),e.jsx("meshStandardMaterial",{color:"#8a6a4a",roughness:.8})]}),e.jsxs("group",{userData:{part:"base"},children:[e.jsx(P,{size:[M.w,M.h,M.d],pos:[0,M.y0+M.h/2,0],children:e.jsx(rt,{lit:r("base")})}),e.jsx(P,{size:[M.w+.6,.6,M.d+.6],pos:[0,Ss+.3,0],children:e.jsx(rt,{lit:r("base")})}),e.jsx(P,{size:[M.w+.3,.5,M.d+.3],pos:[0,M.y0+.25,0],children:e.jsx(rt,{lit:r("base")})}),[[-1,-1],[1,-1],[-1,1],[1,1]].map(([u,G],te)=>e.jsx(L,{r:1.1,r2:1.2,h:1.2,pos:[u*(M.w/2-1.8),.6,G*(M.d/2-1.8)],children:e.jsx(ie,{lit:r("base")})},te)),e.jsx("group",{position:[0,M.y0+M.h/2,$+.01],children:e.jsx(Ne,{w:M.w,h:M.h,lit:r("base")})}),e.jsx("group",{position:[M.w/2+.01,M.y0+M.h/2,0],rotation:[0,Math.PI/2,0],children:e.jsx(Ne,{w:M.d,h:M.h,lit:r("base")})}),e.jsx("group",{position:[-19/2-.01,M.y0+M.h/2,0],rotation:[0,-Math.PI/2,0],children:e.jsx(Ne,{w:M.d,h:M.h,lit:r("base")})}),e.jsx("group",{position:[0,Q+.01,0],rotation:[-Math.PI/2,0,0],children:e.jsx(Ne,{w:M.w+.6,h:M.d+.6,lit:r("base")})}),[-1,1].map(u=>[0,1,2,3,4,5].map(G=>e.jsx(P,{size:[.35,.45,4.2],pos:[-19/2-.12,M.y0+5+G*1.3,u*3.2],rot:[0,0,.5],children:e.jsx(rt,{lit:r("base")})},`${u}${G}`)))]}),e.jsxs("group",{userData:{part:"speed"},children:[e.jsxs("group",{position:[0,14,$+.06],children:[e.jsx(P,{size:[5.8,10.4,.12],pos:[0,0,0],children:e.jsx(N,{lit:r("speed"),color:"#141517",metal:.3,rough:.5})}),e.jsx(Ne,{w:5.8,h:10.4,lit:r("speed")}),e.jsx(K,{font:le,position:[0,4.5,.08],fontSize:.36,color:"#f2d84b",anchorX:"center",anchorY:"middle",children:"SPEED MM PER SEC."}),e.jsx(K,{font:le,position:[0,3.95,.08],fontSize:.3,color:"#f2d84b",anchorX:"center",anchorY:"middle",children:'WITH 6" DIA CYLINDER'}),e.jsx(K,{font:le,position:[0,-4.25,.08],fontSize:.32,color:"#f2d84b",anchorX:"center",anchorY:"middle",children:"E-8 RECORDING DRUM"}),e.jsx(K,{font:Nt,position:[0,-4.75,.08],fontSize:.28,color:"#f2d84b",anchorX:"center",anchorY:"middle",children:"220 V AC"}),e.jsx(P,{size:[.75,7.3,.05],pos:[-1,Ue(4)-14,.07],children:e.jsx("meshStandardMaterial",{color:"#000000"})}),[...dt.map(String),"N"].map((u,G)=>e.jsxs("group",{position:[0,Ue(G)-14,.08],children:[e.jsx(P,{size:[.5,.12,.02],pos:[-.38,0,0],children:e.jsx("meshStandardMaterial",{color:"#000000"})}),e.jsx(K,{font:le,position:[1.3,0,0],fontSize:.4,color:"#f2d84b",anchorX:"center",anchorY:"middle",children:u.replace(/^0\./,".")})]},u))]}),e.jsxs("group",{ref:S,position:[0,Ue(l.speed),$+.15],children:[e.jsx(P,{size:[1.3,.45,.9],pos:[-1,0,.45],children:e.jsx(C,{lit:r("speed")})}),e.jsx(P,{size:[1.3,.25,.4],pos:[-1,.3,.75],children:e.jsx(C,{lit:r("speed")})})]})]}),e.jsxs("group",{userData:{part:"switch"},children:[e.jsx(P,{size:[1.7,2.5,.25],pos:[-5.6,5.6,$+.12],children:e.jsx(ie,{lit:r("switch")})}),e.jsx("group",{ref:pt,position:[-5.6,5.6,$+.3],children:e.jsxs("mesh",{children:[e.jsx("boxGeometry",{args:[1.2,1.95,.35]}),e.jsx("meshStandardMaterial",{ref:xt,color:r("switch")?ke:"#c4161c",emissive:"#ff2a1f",emissiveIntensity:0,roughness:.25})]})}),e.jsx(K,{font:le,position:[-5.6,3.95,$+.02],fontSize:.35,color:"#3a3a3a",anchorX:"center",anchorY:"middle",children:"ON"}),e.jsx(P,{size:[2.2,1.6,.25],pos:[-5.6,2.6,$+.12],children:e.jsx(ie,{lit:r("switch")})}),e.jsx(P,{size:[1.6,1.2,1.1],pos:[-5.6,2.6,$+.8],children:e.jsx(ie,{lit:r("switch")})}),e.jsx("mesh",{geometry:jr,children:e.jsx(N,{lit:r("switch"),color:"#2a2b2e",metal:0,rough:.7})})]}),e.jsxs("group",{userData:{part:"clutch"},position:[M.w/2+.01,13,0],rotation:[0,Math.PI/2,0],children:[e.jsxs("mesh",{position:[0,0,.02],children:[e.jsx("circleGeometry",{args:[3.3,48]}),e.jsx(N,{lit:r("clutch"),color:"#f6f5f0",metal:0,rough:.6})]}),e.jsxs("mesh",{position:[0,0,.03],children:[e.jsx("ringGeometry",{args:[2.85,3.05,64]}),e.jsx(N,{lit:r("clutch"),color:"#d0202a",metal:0,rough:.5})]}),e.jsx(K,{font:le,position:[0,2.25,.05],fontSize:.36,color:"#c81e28",anchorX:"center",anchorY:"middle",children:"NEUTRALISING CLUTCH"}),e.jsx(K,{font:le,position:[-1.7,-2.1,.05],fontSize:.36,color:"#c81e28",anchorX:"center",anchorY:"middle",children:"ENG"}),e.jsx(K,{font:le,position:[1.6,-2.1,.05],fontSize:.36,color:"#c81e28",anchorX:"center",anchorY:"middle",children:"DIS ENG"}),e.jsx(L,{r:.55,h:.5,pos:[0,0,.25],rot:[Math.PI/2,0,0],children:e.jsx(C,{lit:r("clutch")})}),e.jsxs("group",{ref:R,position:[0,0,.55],children:[e.jsx(L,{r:.28,h:2.4,pos:[0,1.2,.2],children:e.jsx(C,{lit:r("clutch")})}),e.jsx(L,{r:.33,h:1.2,pos:[0,2.5,.75],rot:[Math.PI/2,0,0],children:e.jsx(C,{lit:r("clutch")})})]})]}),e.jsxs("group",{userData:{part:"contact"},position:[kt[0]*8.5,Q,kt[1]*8.5],rotation:[0,_e,0],children:[e.jsxs("mesh",{position:[0,1.1,0],children:[e.jsx("boxGeometry",{args:[5,2.2,2.4]}),e.jsx("meshPhysicalMaterial",{color:r("contact")?ke:"#e8f3f6",transparent:!0,opacity:.45,roughness:.08,clearcoat:1,depthWrite:!1})]}),[-1,1].map(u=>e.jsxs("group",{position:[u*1.4,2.2,0],children:[e.jsx(ze,{r:.5,h:1.1,pos:[0,.55,0],lit:r("contact"),color:u<0?"#c0161c":"#1d1f22"}),e.jsx(L,{r:.18,h:.5,pos:[0,1.3,0],children:e.jsx(Re,{lit:r("contact")})})]},u)),e.jsx(P,{size:[.08,1,3.8],pos:[0,1.6,-3.1],children:e.jsx(Re,{lit:r("contact")})}),e.jsxs("mesh",{position:[0,1.6,-5],children:[e.jsx("sphereGeometry",{args:[.16,10,8]}),e.jsx("meshStandardMaterial",{ref:ft,color:"#fde68a",emissive:"#fff3b0",emissiveIntensity:0})]})]}),e.jsx("group",{userData:{part:"spindle"},children:e.jsx(L,{r:2.6,h:.35,pos:[0,Q+.17,0],seg:40,children:e.jsx(C,{lit:r("spindle")})})}),e.jsxs("group",{ref:U,children:[e.jsxs("group",{userData:{part:"spindle"},children:[e.jsx(L,{r:1.5,r2:1.3,h:1.2,pos:[0,Q+.9,0],seg:32,children:e.jsx(C,{lit:r("spindle")})}),e.jsx(L,{r:.75,h:Te-Q,pos:[0,(Te+Q)/2,0],seg:24,children:e.jsx(C,{lit:r("spindle")})})]}),e.jsxs("group",{userData:{part:"contact"},rotation:[0,Pt,0],children:[e.jsx(L,{r:1.2,h:1,pos:[0,Q+2,0],children:e.jsx(ie,{lit:r("contact")})}),e.jsx(P,{size:[.6,.5,3.2],pos:[0,Q+2.1,2.1],children:e.jsx(ie,{lit:r("contact")})}),e.jsxs("mesh",{position:[0,Q+2.1,3.9],rotation:[Math.PI/2,0,0],children:[e.jsx("coneGeometry",{args:[.32,.9,12]}),e.jsx(ie,{lit:r("contact")})]}),e.jsx(L,{r:.25,h:.7,pos:[.85,Q+2,0],rot:[0,0,Math.PI/2],children:e.jsx(C,{lit:r("contact")})})]}),e.jsxs("group",{userData:{part:"lift"},children:[e.jsx(L,{r:1,h:1.2,pos:[0,Te-.2,0],children:e.jsx(C,{lit:r("lift")})}),e.jsx(ze,{r:.85,h:1.8,pos:[0,Te+1.3,0],lit:r("lift")}),e.jsx(L,{r:.5,h:.5,pos:[0,Te+2.45,0],children:e.jsx(C,{lit:r("lift")})})]}),e.jsxs("group",{ref:E,position:[0,lt+l.lift,0],children:[e.jsxs("group",{userData:{part:"drum"},children:[e.jsxs("mesh",{position:[0,ee/2,0],children:[e.jsx("cylinderGeometry",{args:[Ee,Ee,ee,96,1,!0]}),e.jsx("meshStandardMaterial",{color:r("drum")?ke:"#16171a",metalness:.3,roughness:.6,side:Rt})]}),[.15,ee-.4].map(u=>e.jsxs("group",{position:[0,u,0],children:[e.jsx(P,{size:[Ee*2-.2,.5,.9],pos:[0,0,0],children:e.jsx(ie,{lit:r("drum")})}),e.jsx(P,{size:[.9,.5,Ee*2-.2],pos:[0,0,0],children:e.jsx(ie,{lit:r("drum")})}),e.jsx(L,{r:1.6,h:1,pos:[0,0,0],children:e.jsx(ie,{lit:r("drum")})})]},u)),e.jsx(L,{r:1.25,h:2,pos:[0,ee+.9,0],children:e.jsx(C,{lit:r("drum")})}),e.jsx(L,{r:.22,h:.8,pos:[0,ee+1.1,1.55],rot:[Math.PI/2,0,0],children:e.jsx(C,{lit:r("drum")})}),e.jsx(ze,{r:.5,h:.6,pos:[0,ee+1.1,2.2],rot:[Math.PI/2,0,0],lit:r("drum"),color:"#1d1f22"})]}),e.jsxs("mesh",{position:[0,ee/2,0],userData:{part:"paper"},children:[e.jsx("cylinderGeometry",{args:[ht,ht,ee,128,1,!0]}),e.jsx("meshStandardMaterial",{map:x,color:r("paper")?"#9ec5ff":"#ffffff",roughness:.85,metalness:0})]})]})]}),e.jsxs("group",{userData:{part:"stand"},children:[e.jsx(gr,{pos:[A.x+1.5,0,A.z-1],lit:r("stand")}),e.jsx(L,{r:.55,h:44,pos:[A.x,22.6,A.z],seg:20,children:e.jsx(C,{lit:r("stand")})}),e.jsx(P,{size:[2,2,2],pos:[A.x,nt,A.z],children:e.jsx(Oe,{lit:r("stand")})}),e.jsx(ze,{r:.5,h:1,pos:[A.x,nt,A.z+1.4],rot:[Math.PI/2,0,0],lit:r("stand"),color:"#1d1f22"}),e.jsx(L,{r:.4,h:A.x-F.x-.5,pos:[(A.x+F.x+.5)/2,nt,A.z],rot:[0,0,Math.PI/2],children:e.jsx(C,{lit:r("stand")})}),e.jsx(P,{size:[2,2,2],pos:[A.x,Pe,A.z],children:e.jsx(Oe,{lit:r("stand")})}),e.jsx(ze,{r:.5,h:1,pos:[A.x,Pe,A.z+1.4],rot:[Math.PI/2,0,0],lit:r("stand"),color:"#1d1f22"}),e.jsx(L,{r:.35,h:A.x-be-.8,pos:[(A.x+be+.8)/2,Pe,A.z],rot:[0,0,Math.PI/2],children:e.jsx(C,{lit:r("stand")})}),e.jsx(P,{size:[1.6,1.2,1.8],pos:[be,Pe,A.z],children:e.jsx(Oe,{lit:r("stand")})}),e.jsx(L,{r:.15,h:.8,pos:[be,Pe,A.z+1.25],rot:[Math.PI/2,0,0],children:e.jsx(C,{lit:r("stand")})}),e.jsx(ze,{r:.4,h:.5,pos:[be,Pe,A.z+1.8],rot:[Math.PI/2,0,0],lit:r("stand"),color:"#1d1f22"})]}),e.jsxs("group",{ref:z,position:[F.x,F.y,F.z],children:[e.jsxs("group",{userData:{part:"lever"},children:[e.jsx(P,{size:[1.1,1.9,.22],pos:[0,.25,-.75],children:e.jsx(Re,{lit:r("lever")})}),e.jsx(P,{size:[1.1,1.9,.22],pos:[0,.25,.75],children:e.jsx(Re,{lit:r("lever")})}),e.jsx(P,{size:[1.1,.5,1.72],pos:[0,nt-F.y,0],children:e.jsx(Re,{lit:r("lever")})}),e.jsx(L,{r:.1,h:1.9,pos:[0,0,0],rot:[Math.PI/2,0,0],children:e.jsx(C,{lit:r("lever")})}),[-1,1].map(u=>e.jsx(L,{r:.2,h:.12,pos:[0,0,u*.92],rot:[Math.PI/2,0,0],seg:6,children:e.jsx(C,{lit:r("lever")})},u))]}),e.jsxs("group",{ref:f,children:[e.jsxs("group",{userData:{part:"lever"},children:[e.jsx(P,{size:[Ge-.3,.5,.08],pos:[-(Ge-.3)/2,0,0],children:e.jsx(Oe,{lit:r("lever")})}),e.jsx(P,{size:[He+.6,.6,.12],pos:[(He+.6)/2-.2,0,0],children:e.jsx(Oe,{lit:r("lever")})}),e.jsxs("mesh",{position:[He,-.3,0],rotation:[Math.PI/2,0,0],children:[e.jsx("torusGeometry",{args:[.22,.05,8,16]}),e.jsx(C,{lit:r("lever")})]})]}),e.jsxs("group",{userData:{part:"stylus"},position:[-Ge,0,0],children:[e.jsx(P,{size:[.9,.35,.04],pos:[.3,0,0],children:e.jsx(N,{lit:r("stylus"),color:"#e8dfc8",metal:0,rough:.6})}),e.jsx(P,{size:[.06,.12,.34],pos:[0,0,-.16],rot:[0,.35,0],children:e.jsx(N,{lit:r("stylus"),color:"#e8dfc8",metal:0,rough:.6})})]})]})]}),e.jsxs("mesh",{ref:q,position:[be,Et+2,F.z],userData:{part:"muscle"},children:[e.jsx("cylinderGeometry",{args:[.03,.03,1,6]}),e.jsx("meshStandardMaterial",{color:"#f5f0e1",roughness:.9})]}),e.jsxs("group",{userData:{part:"muscle"},position:[be,Ht,F.z],children:[e.jsx(L,{r:.2,h:Ps+.8,pos:[0,-3.4000000000000004/2,0],seg:12,children:e.jsx(N,{lit:r("muscle"),color:"#efe7d6",metal:0,rough:.6})}),e.jsxs("mesh",{position:[0,-.05,0],scale:[1.25,.8,1],children:[e.jsx("sphereGeometry",{args:[.34,16,12]}),e.jsx(N,{lit:r("muscle"),color:"#efe7d6",metal:0,rough:.6})]}),e.jsxs("group",{ref:W,children:[e.jsx("mesh",{geometry:mr,children:e.jsx(N,{lit:r("muscle"),color:"#b4485a",metal:0,rough:.55})}),e.jsx(L,{r:.06,r2:.1,h:ct-3.4,pos:[0,(ct+3.4)/2,0],seg:8,children:e.jsx(N,{lit:r("muscle"),color:"#efe9df",metal:0,rough:.4})})]})]})]})},ct=4.5,Ht=F.y-13,Et=Ht+ct,be=F.x+He,Ps=2.6,Pe=Ht-Ps,nt=F.y+1.35,A={x:26,z:F.z},mr=new Ot([[0,0],[.4,.04],[.82,.5],[.95,1.2],[.85,2],[.55,2.8],[.2,3.35],[.08,3.5]].map(([o,s])=>new Le(o,s)),28),jr=new Gt(new Tt([[-5.6,2.6,$+1.3],[-5.6,2.4,$+2.4],[-5.8,1.1,$+3.3],[-6.4,.3,$+4.6],[-9,.3,$+6.4],[-14,.3,$+7.2],[-20,.3,$+7.6]].map(([o,s,i])=>new I(o,s,i))),80,.28,10,!1),gr=({pos:o,lit:s})=>{const i=p.useMemo(()=>{const t=new bs,r=7;[Math.PI/2,Math.PI/2+2*Math.PI/3,Math.PI/2+4*Math.PI/3].forEach((n,a)=>{const h=Math.cos(n)*r,c=Math.sin(n)*r;a===0?t.moveTo(h,c):t.lineTo(h,c)}),t.closePath();const l=new gs(t,{depth:1.3,bevelEnabled:!0,bevelSize:.5,bevelThickness:.3,bevelSegments:3});return l.rotateX(-Math.PI/2),l},[]);return e.jsx("group",{position:o,rotation:[0,.3,0],children:e.jsx("mesh",{geometry:i,position:[0,.3,0],children:e.jsx(N,{lit:s,color:"#1f2a3a",metal:.4,rough:.5})})})},br=o=>{const s=lr/o;return s<60?`${s.toFixed(s<10?2:1)} s`:s<3600?`${Math.round(s/60)} min`:`${(s/3600).toFixed(1)} h`},yr=({kymo:o})=>{const{state:s,set:i,stimulate:t,newPaper:r}=o,l=a=>`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${a?"bg-amber-500/20 border-amber-400 text-amber-100":"bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"}`,n=zs(s)?`one turn: ${br(dt[s.speed])}`:s.on?"drum not driven":"motor off";return e.jsxs("section",{className:"space-y-4",children:[e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{onClick:()=>i({on:!s.on}),className:`flex-1 ${l(s.on)}`,children:s.on?"Motor ON":"Motor OFF"}),e.jsx("button",{onClick:()=>i({clutch:!s.clutch}),className:`flex-1 ${l(s.clutch)}`,children:s.clutch?"Clutch engaged":"Clutch disengaged"})]}),e.jsxs("div",{children:[e.jsxs("div",{className:"flex justify-between text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-2",children:[e.jsx("span",{children:"Speed lever (mm/s)"}),e.jsx("span",{className:"normal-case tracking-normal text-slate-400 font-semibold",children:n})]}),e.jsx("div",{className:"grid grid-cols-3 gap-1.5",children:[...dt.map(String),"N"].map((a,h)=>e.jsx("button",{onClick:()=>i({speed:h}),className:l(s.speed===h),children:a==="N"?"N (neutral)":a},a))})]}),e.jsxs("label",{className:"block",children:[e.jsxs("span",{className:"flex justify-between text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-1",children:[e.jsx("span",{children:"Drum height (screw lift)"}),e.jsxs("span",{className:"normal-case tracking-normal text-slate-400 font-semibold",children:[s.lift.toFixed(1)," cm"]})]}),e.jsx("input",{type:"range",min:0,max:ws,step:.1,value:s.lift,onChange:a=>i({lift:+a.target.value}),className:"w-full accent-amber-400","aria-label":"Drum height"})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{onClick:t,className:"flex-1 px-3 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-bold",children:"Stimulate"}),e.jsx("button",{onClick:()=>i({contactStim:!s.contactStim}),className:`flex-1 ${l(s.contactStim)}`,children:s.contactStim?"Contact stimulates every turn":"Stimulate from contact"})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{onClick:()=>i({leverOn:!s.leverOn}),className:`flex-1 ${l(s.leverOn)}`,children:s.leverOn?"Lever on drum":"Lever off drum"}),e.jsx("button",{onClick:r,className:"flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 text-xs font-semibold",children:"Fresh smoked paper"})]})]})},O="#3b82f6",je=o=>o?{emissive:O,emissiveIntensity:.55}:{},m=({lit:o})=>e.jsx("meshStandardMaterial",{color:o?O:"#c9ced3",metalness:.9,roughness:.28,...je(o)}),Z=({lit:o})=>e.jsx("meshStandardMaterial",{color:o?O:"#b8923a",metalness:.85,roughness:.35,...je(o)}),Y=({lit:o,color:s="#f4f5f6"})=>e.jsx("meshStandardMaterial",{color:o?O:s,roughness:.55,...je(o)}),X=({lit:o})=>e.jsx("meshStandardMaterial",{color:o?O:"#a8405f",roughness:.8,...je(o)}),he=({lit:o})=>e.jsx("meshStandardMaterial",{color:o?O:"#1c1d20",roughness:.6,...je(o)}),_=({lit:o,opacity:s=.3})=>e.jsx("meshPhysicalMaterial",{color:o?O:"#eef6fa",transparent:!0,opacity:o?.6:s,roughness:.05,clearcoat:1,envMapIntensity:1.5,depthWrite:!1,side:Rt,...je(o)}),y=({a:o,b:s,r:i,children:t,seg:r=14})=>{const{pos:l,quat:n,len:a}=p.useMemo(()=>{const h=new I(...o),c=new I(...s),d=c.clone().sub(h);return{pos:h.clone().add(c).multiplyScalar(.5),quat:new ks().setFromUnitVectors(new I(0,1,0),d.clone().normalize()),len:d.length()}},[o,s]);return e.jsxs("mesh",{position:l,quaternion:n,children:[e.jsx("cylinderGeometry",{args:[i,i,a,r,1]}),t]})},D=({pts:o,r:s,children:i,seg:t=48})=>{const r=p.useMemo(()=>new Gt(new Tt(o.map(l=>new I(...l)),!1,"catmullrom",.5),t,s,10,!1),[o,s,t]);return e.jsx("mesh",{geometry:r,children:i})},j=({at:o,size:s,children:i,rot:t})=>e.jsxs("mesh",{position:o,rotation:t,children:[e.jsx("boxGeometry",{args:s}),i]}),J=({at:o,size:s,children:i,color:t="#111827",bold:r,rot:l})=>e.jsx(K,{font:r?le:Nt,position:o,rotation:l,fontSize:s,color:t,anchorX:"center",anchorY:"middle",children:i}),vr=o=>{for(let s=o;s;s=s.parent)if(s.userData.part)return s.userData;return null},cs=o=>{var i;const s=o.intersections.map(t=>vr(t.object)).filter(t=>!!t);return((i=s.find(t=>!t.glass)??s[0])==null?void 0:i.part)??null},g={x:11,z:9,y0:38,y1:60},Mr=11,T=-4,pe=1.8,xe=5,fe=1,b=[-1,23.5,7],w=7,ot=-5.6,Be=25.8,ds=[b[0]+.45,16.9,w],Sr=(()=>{let o=null;return()=>o??(o=new Ot([[0,0],[4.8,0],[5,.4],[5,10.5],[4.4,12.2],[2.2,14.2],[1.8,14.8],[1.8,16.6],[2.3,17],[2.3,17.4],[1.7,17.4]].map(([s,i])=>new Le(s,i)),40))})(),wr=(()=>{const o=[];for(let s=0;s<=140;s++){const i=s/140,t=i*Math.PI*2*7;o.push([-2.6+i*5.2,45.5+Math.sin(t)*1.8,-4+Math.cos(t)*1.8])}return o})(),zr=({active:o,onHover:s,onSelect:i})=>{const t=n=>o===n,r=p.useMemo(Sr,[]),l=[-1,1];return e.jsxs("group",{onPointerMove:n=>{n.stopPropagation(),s(cs(n))},onPointerOut:()=>s(null),onClick:n=>{n.stopPropagation();const a=cs(n);a&&i(a)},children:[e.jsxs("group",{userData:{part:"stand"},children:[e.jsx(j,{at:[0,-1,2],size:[46,2,32],children:e.jsx(Y,{lit:t("stand")})}),l.map(n=>e.jsxs(se.Fragment,{children:[e.jsx(y,{a:[n*17,0,T],b:[n*17,112,T],r:.6,children:e.jsx(m,{lit:t("stand")})}),e.jsxs("mesh",{position:[n*17,2.2,T],children:[e.jsx("cylinderGeometry",{args:[1.1,1.8,4.4,20]}),e.jsx(Y,{lit:t("stand")})]}),e.jsx(y,{a:[n*17,0,6],b:[n*17,n<0?35:30,6],r:.55,children:e.jsx(m,{lit:t("stand")})}),e.jsxs("mesh",{position:[n*17,2.2,6],children:[e.jsx("cylinderGeometry",{args:[1.1,1.8,4.4,20]}),e.jsx(Y,{lit:t("stand")})]})]},n)),l.map(n=>l.map(a=>e.jsxs(se.Fragment,{children:[e.jsx(y,{a:[n*g.x,0,a*g.z],b:[n*g.x,27,a*g.z],r:.7,children:e.jsx(m,{lit:t("stand")})}),e.jsx(j,{at:[n*(g.x+.6),44.5,a*(g.z+.6)],size:[2,35,2],children:e.jsx(Y,{lit:t("stand")})})]},`${n}${a}`))),l.map(n=>e.jsxs(se.Fragment,{children:[e.jsx(j,{at:[0,37.3,n*(g.z+.6)],size:[2*g.x+1.2,1.4,2],children:e.jsx(Y,{lit:t("stand")})}),e.jsx(j,{at:[n*(g.x+.6),37.3,0],size:[2,1.4,2*g.z+1.2],children:e.jsx(Y,{lit:t("stand")})}),e.jsx(j,{at:[0,61,n*(g.z+.9)],size:[2*g.x+3.4,2,.9],children:e.jsx(m,{lit:t("stand")})}),e.jsx(j,{at:[n*(g.x+1.25),61,0],size:[.9,2,2*g.z+1.8],children:e.jsx(m,{lit:t("stand")})})]},n)),e.jsx(j,{at:[0,61,g.z+1.4],size:[13,1.5,.08],children:e.jsx("meshBasicMaterial",{color:"#ffffff"})}),e.jsx(J,{at:[0,61,g.z+1.46],size:.82,bold:!0,children:"LANGENDORFF APPARATUS"}),e.jsx(y,{a:[-18.5,23.4,6],b:[18.5,23.4,6],r:.45,children:e.jsx(m,{lit:t("stand")})}),e.jsx(y,{a:[-23,13,6],b:[ot+1,13,6],r:.45,children:e.jsx(m,{lit:t("stand")})}),e.jsx(y,{a:[6.5,13,6],b:[Be+.9,13,6],r:.45,children:e.jsx(m,{lit:t("stand")})}),[[-17,23.4],[17,23.4],[-17,13],[17,13]].map(([n,a])=>e.jsx(j,{at:[n,a,6],size:[1.9,1.9,1.9],children:e.jsx(m,{lit:t("stand")})},`${n}${a}`))]}),e.jsx("group",{userData:{part:"reservoirs"},children:l.map(n=>e.jsxs("group",{position:[n*Mr,102,T],children:[e.jsxs("group",{userData:{part:"reservoirs",glass:!0},children:[e.jsx("mesh",{geometry:r,children:e.jsx(_,{lit:t("reservoirs"),opacity:.28})}),e.jsx(y,{a:[-n*4.8,1.7,0],b:[-n*6.6,1.7,0],r:1.05,children:e.jsx(_,{lit:t("reservoirs")})})]}),e.jsxs("mesh",{position:[-n*6.9,1.7,0],rotation:[0,0,Math.PI/2],children:[e.jsx("cylinderGeometry",{args:[.95,.75,1.5,18]}),e.jsx("meshStandardMaterial",{color:t("reservoirs")?O:"#c0392b",roughness:.7})]}),e.jsxs("mesh",{position:[0,-.3,0],children:[e.jsx("cylinderGeometry",{args:[5.7,5.7,.4,36]}),e.jsx(Y,{lit:t("reservoirs")})]}),e.jsx(j,{at:[n*5.6,-.3,0],size:[2.4,1.4,2.2],children:e.jsx(Y,{lit:t("reservoirs")})}),[0,1,2].map(a=>{const h=a===0?Math.PI/2:a===1?-Math.PI/2:n>0?0:Math.PI;return e.jsx(j,{at:[Math.cos(h)*5.25,6,Math.sin(h)*5.25],size:[.25,12.5,1.6],rot:[0,-h,0],children:e.jsx(Y,{lit:t("reservoirs")})},a)})]},n))}),e.jsx("group",{userData:{part:"head-tubes"},children:l.map(n=>e.jsxs(se.Fragment,{children:[e.jsxs("group",{userData:{part:"head-tubes",glass:!0},children:[e.jsxs("mesh",{position:[n*pe,102,T],children:[e.jsx("cylinderGeometry",{args:[.9,.9,22,20,1,!0]}),e.jsx(_,{lit:t("head-tubes")})]}),e.jsxs("mesh",{position:[n*pe,90.2,T],children:[e.jsx("cylinderGeometry",{args:[.9,.35,1.6,20,1,!0]}),e.jsx(_,{lit:t("head-tubes")})]}),e.jsx(y,{a:[n*pe,86.5,T],b:[n*pe,89.4,T],r:.35,children:e.jsx(_,{lit:t("head-tubes")})}),e.jsx(y,{a:[n*(pe+.8),103.7,T],b:[n*4.4,103.7,T],r:.3,children:e.jsx(_,{lit:t("head-tubes")})}),e.jsx(y,{a:[n*pe,97,T],b:[-n*1.6,121-(n>0?2:0),T+n*.6],r:.22,children:e.jsx(_,{lit:t("head-tubes"),opacity:.45})})]}),e.jsx(y,{a:[n*6.5,93,T],b:[n*6.5,101.5,T],r:.35,children:e.jsx(m,{lit:t("head-tubes")})}),e.jsx(y,{a:[n*7.6,95.5,T],b:[n*3.6,95.5,T],r:.3,children:e.jsx(m,{lit:t("head-tubes")})}),e.jsx(j,{at:[n*2.3,95.5,T],size:[2.6,1.3,.25],children:e.jsx(m,{lit:t("head-tubes")})}),e.jsx(j,{at:[n*6.5,95.5,T],size:[.9,.9,.9],children:e.jsx(Z,{lit:t("head-tubes")})})]},n))}),e.jsxs("group",{userData:{part:"y-piece"},children:[e.jsxs("group",{userData:{part:"y-piece",glass:!0},children:[e.jsx(y,{a:[1.5,73.5,-1],b:[1.5,77,-1],r:.38,children:e.jsx(_,{lit:t("y-piece"),opacity:.4})}),e.jsx(y,{a:[1.5,77,-1],b:[.1,81,-1.4],r:.36,children:e.jsx(_,{lit:t("y-piece"),opacity:.4})}),e.jsx(y,{a:[1.5,77,-1],b:[2.9,81,-1.4],r:.36,children:e.jsx(_,{lit:t("y-piece"),opacity:.4})})]}),e.jsx(D,{pts:[[-pe,87.2,T],[-1.9,84.5,-3],[.1,80.4,-1.4]],r:.5,children:e.jsx(X,{lit:t("y-piece")})}),e.jsx(D,{pts:[[pe,87.2,T],[2.6,84.5,-3],[2.9,80.4,-1.4]],r:.5,children:e.jsx(X,{lit:t("y-piece")})}),e.jsx(D,{pts:[[1.5,74.2,-1],[2.2,69,-.6],[4.6,62,1.2],[5.7,56,1.5],[5.6,46,1.4]],r:.5,children:e.jsx(X,{lit:t("y-piece")})})]}),e.jsxs("group",{userData:{part:"bath",glass:!0},children:[l.map(n=>e.jsxs(se.Fragment,{children:[e.jsxs(j,{at:[0,(g.y0+g.y1)/2,n*g.z],size:[2*g.x,g.y1-g.y0,.4],children:[e.jsx(_,{lit:t("bath"),opacity:.14}),e.jsx(Lt,{color:t("bath")?O:"#9fb0c2"})]}),e.jsxs(j,{at:[n*g.x,(g.y0+g.y1)/2,0],size:[.4,g.y1-g.y0,2*g.z],children:[e.jsx(_,{lit:t("bath"),opacity:.14}),e.jsx(Lt,{color:t("bath")?O:"#9fb0c2"})]})]},n)),e.jsx(j,{at:[0,g.y0+.2,0],size:[2*g.x,.4,2*g.z],children:e.jsx(_,{lit:t("bath"),opacity:.22})})]}),e.jsxs("group",{userData:{part:"inner-tubes"},children:[l.map(n=>e.jsxs(se.Fragment,{children:[e.jsxs("group",{userData:{part:"inner-tubes",glass:!0},children:[e.jsxs("mesh",{position:[n*xe,48.5,fe],children:[e.jsx("cylinderGeometry",{args:[1.7,1.7,13,22,1,!0]}),e.jsx(_,{lit:t("inner-tubes"),opacity:.35})]}),e.jsxs("mesh",{position:[n*xe,41.3,fe],children:[e.jsx("cylinderGeometry",{args:[1.7,.45,1.4,22,1,!0]}),e.jsx(_,{lit:t("inner-tubes"),opacity:.35})]}),e.jsx(y,{a:[n*xe,39.4,fe],b:[n*xe,40.7,fe],r:.45,children:e.jsx(_,{lit:t("inner-tubes")})}),e.jsx(D,{pts:[[n*10.5,66.5,.4],[n*6,66.5,.4],[n*4.5,65.6,.5],[n*4.3,62,.6],[n*4.3,44,.6]],r:.33,children:e.jsx(_,{lit:t("inner-tubes"),opacity:.45})})]}),e.jsxs("mesh",{position:[n*xe,39,fe],children:[e.jsx("cylinderGeometry",{args:[.9,1.15,1.2,18]}),e.jsx(X,{lit:t("inner-tubes")})]}),e.jsx(j,{at:[n*(g.x+1.25),62.6,.4],size:[1.4,1.2,1.4],children:e.jsx(m,{lit:t("inner-tubes")})}),e.jsx(y,{a:[n*(g.x+1.25),63,.4],b:[n*(g.x+1.25),69,.4],r:.45,children:e.jsx(m,{lit:t("inner-tubes")})}),e.jsx(j,{at:[n*10.4,66.5,.4],size:[2.6,1.1,.3],children:e.jsx(m,{lit:t("inner-tubes")})})]},n)),e.jsx(D,{pts:[[-xe,38.4,fe],[-3,37,-1],[6.5,36.6,-2.6],[8.2,30,-3.6],[8.6,10,-4.4],[10,1.6,-6],[14.5,.55,-7.5]],r:.48,seg:80,children:e.jsx(X,{lit:t("inner-tubes")})}),e.jsx(D,{pts:[[xe,38.4,fe],[7.5,36.8,-1.2],[9.6,30,-2.8],[10.2,10,-3.6],[11.8,1.6,-4.8],[16.5,.55,-5.4]],r:.48,seg:80,children:e.jsx(X,{lit:t("inner-tubes")})}),[[14.5,-7.5],[16.5,-5.4]].map(([n,a])=>e.jsx(D,{pts:[[n,.6,a],[n+.9,.9,a],[n+1.5,.6,a+.25],[n+1.1,.35,a+.5],[n+.4,.6,a+.35],[n+1.8,.6,a-.1]],r:.06,seg:30,children:e.jsx(m,{lit:t("inner-tubes")})},n))]}),e.jsxs("group",{userData:{part:"coil"},children:[e.jsx("group",{userData:{part:"coil",glass:!0},children:e.jsx(D,{pts:wr,r:.33,seg:420,children:e.jsx(_,{lit:t("coil"),opacity:.5})})}),e.jsx(D,{pts:[[xe-.7,40.3,fe-.4],[4.2,40.6,-1.5],[3.3,43,-3.2],[2.6,45.5,-2.2]],r:.42,children:e.jsx(X,{lit:t("coil")})}),e.jsx(D,{pts:[[-2.6,45.5,-2.2],[-3,42,-2.4],[-1.6,39.8,.6],[0,38.6,3]],r:.42,children:e.jsx(X,{lit:t("coil")})}),e.jsxs("mesh",{position:[0,38.3,3],children:[e.jsx("cylinderGeometry",{args:[.85,1,1,18]}),e.jsx(X,{lit:t("coil")})]})]}),e.jsxs("group",{userData:{part:"heater"},children:[e.jsx(D,{pts:[[2.2,43.2,9.4],[2.2,43.2,2.2],[2.5,43.2,1.2],[3.3,43.2,.8],[4.1,43.2,1.2],[4.4,43.2,2.2],[4.4,43.2,9.4]],r:.42,children:e.jsx(m,{lit:t("heater")})}),e.jsxs("mesh",{position:[3.3,43.2,11.2],rotation:[Math.PI/2,0,0],children:[e.jsx("cylinderGeometry",{args:[2,2.1,3.6,24]}),e.jsx(he,{lit:t("heater")})]}),e.jsx(D,{pts:[[3.3,43.2,13],[4,41.5,14.5],[6.5,37.5,14.2],[8,36.2,13]],r:.3,children:e.jsx(he,{lit:t("heater")})})]}),e.jsxs("group",{userData:{part:"stirrer"},children:[e.jsx(j,{at:[-9,49,-2.5],size:[2.8,4.2,3.4],children:e.jsx(he,{lit:t("stirrer")})}),e.jsx(y,{a:[-7.6,47.6,-2.5],b:[-6.2,47.6,-2.5],r:.45,children:e.jsx(he,{lit:t("stirrer")})}),e.jsx(D,{pts:[[-9,51,-2.5],[-10.4,58,-3],[-12.2,62.6,-1],[-13.2,58,4],[-13,44,8.5],[-9,34,9.2],[-5,31.5,10]],r:.28,children:e.jsx(he,{lit:t("stirrer")})})]}),e.jsxs("group",{userData:{part:"probe"},children:[e.jsx(y,{a:[-9.6,43.5,4],b:[-9.6,62.5,4],r:.28,children:e.jsx(m,{lit:t("probe")})}),e.jsx(j,{at:[-9.6,50.5,4],size:[2.6,.5,1.4],children:e.jsx("meshStandardMaterial",{color:t("probe")?O:"#d9dde2",transparent:!0,opacity:.7})}),e.jsx(D,{pts:[[-9.6,62.5,4],[-11.6,63.4,5],[-13.4,56,7],[-12.6,42,9.4],[-8,32,9.6],[-5,29.5,10]],r:.24,children:e.jsx("meshStandardMaterial",{color:t("probe")?O:"#6b7280",roughness:.7})})]}),e.jsxs("group",{userData:{part:"control"},position:[3,31,12],children:[e.jsx(j,{at:[0,0,0],size:[16,10.5,8],children:e.jsx(Y,{lit:t("control")})}),e.jsx(j,{at:[0,0,4.03],size:[15.4,9.9,.06],children:e.jsx("meshStandardMaterial",{color:t("control")?O:"#a9aeb4",roughness:.5,metalness:.3})}),[-5.2,5.2].map(n=>e.jsxs(se.Fragment,{children:[e.jsxs("mesh",{position:[n*.75,3.6,4.3],children:[e.jsx("sphereGeometry",{args:[.62,18,12]}),e.jsx("meshStandardMaterial",{color:"#d92626",emissive:"#7a0c0c",emissiveIntensity:.6,roughness:.3})]}),e.jsx(j,{at:[n,-.4,4.25],size:[2.6,4.6,.4],children:e.jsx(Y,{lit:!1,color:"#fafafa"})}),e.jsx(j,{at:[n,-.4,4.5],size:[1.5,2.8,.25],rot:[.12,0,0],children:e.jsx(Y,{lit:!1,color:"#ffffff"})}),e.jsx(J,{at:[n,-3.5,4.1],size:.5,color:"#9b1c1c",bold:!0,children:"ON"})]},n)),e.jsx(J,{at:[-5.2,2.5,4.1],size:.5,color:"#9b1c1c",bold:!0,children:"MAIN"}),e.jsx(J,{at:[5.2,2.8,4.1],size:.46,color:"#9b1c1c",bold:!0,children:`HEATER
STIRRER`}),e.jsx(J,{at:[0,3.1,4.1],size:.62,color:"#9b1c1c",bold:!0,children:"TWO UNIT BATH"}),e.jsx(J,{at:[0,-3.9,4.1],size:.5,color:"#9b1c1c",bold:!0,children:"DIGITAL PID CONTROL"}),e.jsx(j,{at:[0,-.4,4.3],size:[5.2,5.2,.6],children:e.jsx(he,{lit:!1})}),e.jsx(J,{at:[.3,.9,4.62],size:1.05,color:"#ff3b30",bold:!0,children:"37.0"}),e.jsx(J,{at:[.3,-.5,4.62],size:.85,color:"#35d07f",bold:!0,children:"37.0"}),e.jsx(J,{at:[-2,.9,4.62],size:.34,color:"#d1d5db",children:"PV"}),e.jsx(J,{at:[-2,-.5,4.62],size:.34,color:"#d1d5db",children:"SV"}),e.jsx(j,{at:[0,-2.1,4.62],size:[4.4,.9,.05],children:e.jsx("meshStandardMaterial",{color:"#cfd3d8"})})]}),e.jsxs("group",{userData:{part:"cannula"},children:[e.jsx(D,{pts:[[0,37.8,3],[0,33,3.6],[-.7,29,6.2],[b[0],27,b[2]]],r:.45,children:e.jsx(X,{lit:t("cannula")})}),e.jsxs("group",{userData:{part:"cannula",glass:!0},children:[e.jsx(y,{a:[b[0],24.4,b[2]],b:[b[0],27.6,b[2]],r:.36,children:e.jsx(_,{lit:t("cannula"),opacity:.45})}),e.jsxs("mesh",{position:b,scale:[1,1.15,1],children:[e.jsx("sphereGeometry",{args:[1.35,24,18]}),e.jsx(_,{lit:t("cannula"),opacity:.4})]}),e.jsxs("mesh",{position:[b[0],21.2,b[2]],children:[e.jsx("cylinderGeometry",{args:[.5,.16,2.2,16,1,!0]}),e.jsx(_,{lit:t("cannula"),opacity:.5})]}),e.jsx(y,{a:[b[0]-.2,26,b[2]],b:[b[0]-2.2,27.2,b[2]],r:.3,children:e.jsx(_,{lit:t("cannula"),opacity:.45})}),e.jsx(y,{a:[b[0]+.9,23.4,b[2]],b:[b[0]+3.6,22.7,b[2]],r:.62,children:e.jsx(_,{lit:t("cannula"),opacity:.4})})]}),e.jsx(j,{at:[b[0]+1.1,23.6,b[2]-.6],size:[1.3,1.9,1.1],children:e.jsx(m,{lit:t("cannula")})}),e.jsxs("mesh",{position:[b[0]+1.1,24.9,b[2]-.4],children:[e.jsx("cylinderGeometry",{args:[.55,.55,.5,14]}),e.jsx(m,{lit:t("cannula")})]})]}),e.jsxs("group",{userData:{part:"thermometer"},children:[e.jsxs("mesh",{position:[b[0]+3.8,22.65,b[2]],rotation:[0,0,Math.PI/2-.25],children:[e.jsx("cylinderGeometry",{args:[.7,.55,1.1,16]}),e.jsx(X,{lit:t("thermometer")})]}),e.jsx(y,{a:[b[0]+1.6,23.2,b[2]],b:[b[0]+13,20.3,b[2]],r:.2,children:e.jsx("meshStandardMaterial",{color:t("thermometer")?O:"#f2d43d",roughness:.25,...je(t("thermometer"))})})]}),e.jsxs("group",{userData:{part:"manometer"},children:[e.jsx(j,{at:[-21.2,23,6.6],size:[7,21,.3],children:e.jsx(m,{lit:t("manometer")})}),l.map(n=>e.jsx(j,{at:[-21.2+n*3.5,23,7.1],size:[.3,21,1.3],children:e.jsx(m,{lit:t("manometer")})},n)),e.jsx(j,{at:[-21.2,22.5,6.85],size:[2.5,11.5,.2],children:e.jsx("meshStandardMaterial",{color:"#ffffff",roughness:.4})}),[0,2,4,6,8,10,12,14,16].map(n=>e.jsxs(se.Fragment,{children:[e.jsx(j,{at:[-21.9,17.6+n*.62,6.97],size:[.9,.05,.02],children:e.jsx("meshBasicMaterial",{color:"#111827"})}),e.jsx(J,{at:[-20.7,17.6+n*.62,6.98],size:.48,children:String(n)})]},n)),e.jsxs("group",{userData:{part:"manometer",glass:!0},children:[e.jsx(D,{pts:[[-23,32.5,7.4],[-23,15.5,7.4],[-22.6,14.4,7.4],[-21.2,14,7.4],[-19.8,14.4,7.4],[-19.4,15.5,7.4],[-19.4,30.6,7.4],[-19,31.6,7.4],[-17.6,31.8,7.4]],r:.34,seg:90,children:e.jsx(_,{lit:t("manometer"),opacity:.4})}),e.jsx(y,{a:[-19.4,28,7.4],b:[-17.6,28,7.4],r:.3,children:e.jsx(_,{lit:t("manometer"),opacity:.4})})]}),e.jsx(D,{pts:[[-23,18,7.4],[-23,15.5,7.4],[-22.6,14.4,7.4],[-21.2,14,7.4],[-19.8,14.4,7.4],[-19.4,15.5,7.4],[-19.4,18,7.4]],r:.2,seg:50,children:e.jsx("meshStandardMaterial",{color:"#9aa1a8",metalness:1,roughness:.15})}),e.jsx(j,{at:[-17.6,27,6.4],size:[1.9,1.9,1.5],children:e.jsx(m,{lit:t("manometer")})}),e.jsx(D,{pts:[[-17.9,31.8,7.4],[-13,32.4,8],[-7,29.6,8],[b[0]-2,27.1,b[2]]],r:.45,children:e.jsx(X,{lit:t("manometer")})}),e.jsx(D,{pts:[[-17.9,28,7.4],[-13.5,27.6,9],[-10,18,12],[-8,5,14.5],[-5,.6,16.4],[2,.5,17]],r:.45,children:e.jsx(X,{lit:t("manometer")})})]}),e.jsxs("group",{userData:{part:"clip"},children:[e.jsx(D,{pts:[[b[0],20.2,w],[b[0]+.25,19.9,w],[b[0],19.6,w],[b[0]-.2,19.3,w],[b[0],19,w],[b[0]+.2,19.2,w]],r:.045,seg:30,children:e.jsx(m,{lit:t("clip")})}),e.jsxs("group",{position:[b[0]+.05,19.05,w],rotation:[0,0,.32],children:[e.jsx(y,{a:[-.18,0,0],b:[-.18,-1.75,0],r:.05,seg:6,children:e.jsx(m,{lit:t("clip")})}),e.jsx(y,{a:[.2,-.15,0],b:[.2,-1.75,0],r:.05,seg:6,children:e.jsx(m,{lit:t("clip")})}),e.jsx(j,{at:[.01,-.1,0],size:[.55,.3,.14],children:e.jsx(m,{lit:t("clip")})}),e.jsxs("mesh",{position:[.01,-1.95,0],children:[e.jsx("torusGeometry",{args:[.24,.05,6,16]}),e.jsx(m,{lit:t("clip")})]})]})]}),e.jsxs("group",{userData:{part:"pulleys"},children:[[ot,Be].map(n=>e.jsxs(se.Fragment,{children:[e.jsxs("mesh",{position:[n,13.9,6],children:[e.jsx("cylinderGeometry",{args:[.42,.42,.75,16]}),e.jsx(he,{lit:t("pulleys")})]}),e.jsxs("mesh",{position:[n,13.6,6],children:[e.jsx("cylinderGeometry",{args:[.1,.1,.5,8]}),e.jsx(m,{lit:t("pulleys")})]}),e.jsxs("mesh",{position:[n,12.1,6.25],rotation:[0,Math.PI/4,0],children:[e.jsx("cylinderGeometry",{args:[.62,.38,2.6,4]}),e.jsx("meshStandardMaterial",{color:t("pulleys")?O:"#c49a3a",metalness:.85,roughness:.3,...je(t("pulleys"))})]}),e.jsxs("mesh",{position:[n,10.4,w],rotation:[Math.PI/2,0,0],children:[e.jsx("cylinderGeometry",{args:[1,1,.22,32]}),e.jsx("meshPhysicalMaterial",{color:t("pulleys")?O:"#eef3f7",transparent:!0,opacity:.6,roughness:.1,clearcoat:1})]}),e.jsxs("mesh",{position:[n,10.4,w],rotation:[Math.PI/2,0,0],children:[e.jsx("cylinderGeometry",{args:[.16,.16,.5,10]}),e.jsx(m,{lit:t("pulleys")})]}),e.jsx(y,{a:[n,10.6,6.3],b:[n,10.4,w],r:.12,seg:8,children:e.jsx(m,{lit:t("pulleys")})})]},n)),[[ds,[Be-.6,9.45,w]],[[Be+1,10.4,w],[Be+1,20.6,w]],[ds,[ot+.6,9.45,w]],[[ot-1,10.4,w],[-22.6,12.5,6.2]]].map(([n,a],h)=>e.jsx(y,{a:n,b:a,r:.035,seg:5,children:e.jsx("meshBasicMaterial",{color:t("pulleys")?O:"#f8fafc"})},h)),[0,1,2].map(n=>e.jsxs("mesh",{position:[-22.4+n*.18,13,6],rotation:[0,0,Math.PI/2],children:[e.jsx("torusGeometry",{args:[.47,.03,4,16]}),e.jsx("meshBasicMaterial",{color:t("pulleys")?O:"#f8fafc"})]},n))]}),e.jsxs("group",{userData:{part:"lever"},children:[e.jsx(y,{a:[20,13,6],b:[20,28.5,6],r:.4,children:e.jsx(m,{lit:t("lever")})}),e.jsxs("mesh",{position:[20,13.3,6],children:[e.jsx("sphereGeometry",{args:[.6,12,8]}),e.jsx(m,{lit:t("lever")})]}),e.jsx(j,{at:[20.6,21,w],size:[4.6,.9,.9],children:e.jsx(Z,{lit:t("lever")})}),e.jsxs("mesh",{position:[18,21,w],rotation:[0,0,Math.PI/2],children:[e.jsx("cylinderGeometry",{args:[.45,.45,.9,12]}),e.jsx(Z,{lit:t("lever")})]}),e.jsx(j,{at:[25.6,20.95,w],size:[5.6,.75,.16],children:e.jsx(Z,{lit:t("lever")})}),[0,1,2,3,4,5,6].map(n=>e.jsx(j,{at:[23.3+n*.7,21.4,w],size:[.35,.25,.16],children:e.jsx(Z,{lit:t("lever")})},n)),e.jsxs("mesh",{position:[28.7,20.98,w],rotation:[0,0,Math.PI/2],children:[e.jsx("cylinderGeometry",{args:[.32,.32,.8,12]}),e.jsx(he,{lit:t("lever")})]}),e.jsx(y,{a:[29,21,w],b:[38,21.6,w],r:.06,seg:6,children:e.jsx(m,{lit:t("lever")})}),e.jsx(j,{at:[38.4,21.65,w],size:[1.3,.7,.03],rot:[0,0,.3],children:e.jsx("meshStandardMaterial",{color:t("lever")?O:"#f1f5f9",transparent:!0,opacity:.85})}),e.jsx(y,{a:[21,21.4,w],b:[21,25.4,w],r:.22,children:e.jsx(Z,{lit:t("lever")})}),e.jsx(y,{a:[19.6,24.4,w],b:[24.2,24.4,w],r:.22,children:e.jsx(Z,{lit:t("lever")})}),e.jsxs("mesh",{position:[19.4,24.4,w],rotation:[0,0,Math.PI/2],children:[e.jsx("cylinderGeometry",{args:[.42,.42,.8,12]}),e.jsx(Z,{lit:t("lever")})]}),e.jsx(D,{pts:Array.from({length:41},(n,a)=>[24.2+Math.sin(a*1.6)*.3,24.2-a*.07,w+Math.cos(a*1.6)*.3]),r:.035,seg:120,children:e.jsx(m,{lit:t("lever")})})]}),e.jsx("group",{userData:{part:"holders"},children:l.map(n=>e.jsxs(se.Fragment,{children:[e.jsx(j,{at:[n*(g.x+1.25),62.6,-4],size:[1.4,1.2,1.4],children:e.jsx(m,{lit:t("holders")})}),e.jsx(y,{a:[n*(g.x+1.25),63,-4],b:[n*(g.x+1.25),71,-4],r:.45,children:e.jsx(m,{lit:t("holders")})}),e.jsx(j,{at:[n*(g.x+1.25),69,-4],size:[1.5,1.5,1.5],children:e.jsx(Z,{lit:t("holders")})}),e.jsx(y,{a:[n*16.5,69,-4],b:[n*7,69,-4],r:.34,children:e.jsx(Z,{lit:t("holders")})}),e.jsx(j,{at:[n*6.8,69.2,-4],size:[1.3,1.1,1.1],children:e.jsx(Z,{lit:t("holders")})}),e.jsxs("mesh",{position:[n*(g.x+1.25),69,-2.9],rotation:[Math.PI/2,0,0],children:[e.jsx("cylinderGeometry",{args:[.45,.45,.6,12]}),e.jsx(he,{lit:t("holders")})]}),e.jsx(D,{pts:[[n*6.8,69.6,-4],[n*6.2,77.5,-4],[n*5.6,78,-4],[n*5,77.5,-4],[n*4.4,71.5,-4],[n*3.8,71.3,-4]],r:.07,seg:40,children:e.jsx(m,{lit:t("holders")})}),e.jsx(y,{a:[n*6.2,77.6,-4],b:[n*7.4,48,-3.4],r:.07,seg:6,children:e.jsx(m,{lit:t("holders")})})]},n))})]})},Pr=({id:o,kymo:s,...i})=>{switch(o){case"rbc-pipette":return e.jsx(rs,{kind:"rbc",...i});case"wbc-pipette":return e.jsx(rs,{kind:"wbc",...i});case"neubauer-chamber":return e.jsx(ir,{...i});case"kymograph":return e.jsx(fr,{kymo:s,...i});case"langendorff":return e.jsx(zr,{...i})}},hs={"rbc-pipette":{all:{center:[.25,-1,0],halfW:5.9,halfH:1.6,from:[.2,.3,1]}},"wbc-pipette":{all:{center:[.25,-1,0],halfW:5.7,halfH:1.6,from:[.2,.3,1]}},"neubauer-chamber":{all:{center:[0,-1,0],halfW:44,halfH:21,from:[.15,1.3,.9]},closeUp:{grid:{center:[0,-.1,7.6],halfW:1.7,halfH:1.7,from:[0,1,.3]}}},kymograph:{all:{center:[7,25,3],halfW:21,halfH:26,from:[.4,.3,1]},closeUp:{paper:{center:[0,34.5,7.5],halfW:9,halfH:8,from:[.15,.1,1]},stylus:{center:[1,34.5,7.5],halfW:4,halfH:3.5,from:[.5,.25,1]},speed:{center:[0,14,9.5],halfW:4,halfH:5.6,from:[.05,.08,1]},clutch:{center:[9.5,13,0],halfW:4,halfH:4,from:[1,.12,.1]},contact:{center:[-5.2,22.6,-5.2],halfW:6,halfH:4.5,from:[-.75,.45,-.75]}}},langendorff:{all:{center:[2,59,0],halfW:34,halfH:64,from:[.35,.12,1]},closeUp:{reservoirs:{center:[0,108,-4],halfW:19,halfH:13,from:[.1,.1,1]},"head-tubes":{center:[0,103,-4],halfW:10,halfH:19,from:[.15,.05,1]},"y-piece":{center:[2,76,-1],halfW:9,halfH:14,from:[.2,.1,1]},bath:{center:[0,50,0],halfW:17,halfH:15,from:[.4,.35,1]},"inner-tubes":{center:[0,52,1],halfW:15,halfH:17,from:[.2,.5,1]},coil:{center:[0,44,-3],halfW:8,halfH:7,from:[.3,.8,1]},heater:{center:[3,43,6],halfW:9,halfH:7,from:[.5,.7,1]},stirrer:{center:[-8,50,-2],halfW:8,halfH:8,from:[-.5,.4,1]},probe:{center:[-9.6,53,4],halfW:7,halfH:12,from:[-.5,.3,1]},control:{center:[3,31,16],halfW:10,halfH:7,from:[.05,.05,1]},cannula:{center:[1,22,7],halfW:8,halfH:7,from:[.25,-.3,1]},thermometer:{center:[5,22,7],halfW:9,halfH:5,from:[.1,.1,1]},manometer:{center:[-20,23,7],halfW:7,halfH:12,from:[-.1,.05,1]},clip:{center:[-.6,18.6,7],halfW:3,halfH:3,from:[.1,.05,1]},pulleys:{center:[10,14,7],halfW:19,halfH:8,from:[.1,.1,1]},lever:{center:[28,21,7],halfW:12,halfH:6,from:[.1,.1,1]},holders:{center:[0,70,-4],halfW:18,halfH:10,from:[.1,.25,1]}}}},Er=({id:o,part:s})=>{var c;const i=at(d=>d.camera),t=at(d=>d.size.width/d.size.height),r=at(d=>d.controls),l=p.useRef(null),n=p.useRef(!1),h=(s&&((c=hs[o].closeUp)==null?void 0:c[s])||null)??hs[o].all;return p.useEffect(()=>{const d=Math.tan(xs.degToRad(i.fov/2)),x=1.15*Math.max(h.halfH/d,h.halfW/(d*t)),v=new I(...h.center),U=v.clone().add(new I(...h.from).normalize().multiplyScalar(x));n.current?l.current={pos:U,target:v}:(i.position.copy(U),i.lookAt(v),r&&(r.target.copy(v),r.update(),n.current=!0))},[h,t,i,r]),js(()=>{const d=l.current;!d||!r||(i.position.lerp(d.pos,.12),r.target.lerp(d.target,.12),r.update(),i.position.distanceTo(d.pos)<d.pos.distanceTo(d.target)*.002&&(l.current=null))}),null},it="#CBD5E1",_r="#2F3E46",Cr=({id:o,onBack:s,onOpen:i})=>{const t=qt(o),[r,l]=p.useState(null),[n,a]=p.useState(null),[h,c]=p.useState(it),d=r??n,x=t.parts.find(E=>E.id===d),v=t.compareWith&&qt(t.compareWith),U=hr();return e.jsxs("div",{className:"w-full h-[100dvh] bg-slate-950 flex flex-col overflow-hidden text-slate-200 font-sans",children:[e.jsxs("header",{className:"z-30 flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 gap-4 flex-none shadow-lg",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("button",{onClick:s,className:"p-2 bg-slate-800 rounded-full shadow-md hover:bg-slate-700 transition-colors border border-slate-700",children:e.jsx(Ws,{className:"w-5 h-5 sm:w-6 sm:h-6"})}),e.jsxs("div",{children:[e.jsx("h1",{className:"text-base sm:text-xl font-bold tracking-tight leading-tight",children:t.name}),e.jsx("p",{className:"text-xs text-slate-400",children:t.alsoCalled})]})]}),e.jsx("button",{onClick:()=>c(E=>E===it?_r:it),className:"p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 border border-slate-700 transition-colors",title:"Toggle Canvas Background",children:h===it?e.jsx(Fs,{className:"w-5 h-5"}):e.jsx($s,{className:"w-5 h-5"})})]}),e.jsxs("main",{className:"flex-1 min-h-0 flex flex-col md:flex-row",children:[e.jsxs("div",{className:"relative h-[42%] md:h-auto md:flex-1 flex-none",children:[e.jsxs(Vs,{camera:{position:[3,4,14],fov:35},style:{background:h},onPointerMissed:()=>a(null),children:[e.jsx("color",{attach:"background",args:[h]},h),e.jsx(Xs,{variant:"studio"}),e.jsx("ambientLight",{intensity:.6}),e.jsx("directionalLight",{position:[5,8,6],intensity:1}),e.jsx(Pr,{id:o,active:d,onHover:l,onSelect:a,kymo:U}),e.jsx(Ys,{makeDefault:!0,enablePan:!0,screenSpacePanning:!0,zoomToCursor:!0}),e.jsx(Er,{id:o,part:n})]}),x?e.jsx("div",{className:"absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 bg-slate-900/90 backdrop-blur-md border border-blue-500/30 rounded-full shadow-lg whitespace-nowrap pointer-events-none",children:e.jsx("div",{className:"text-blue-300 font-bold text-[11px] uppercase tracking-wider",children:x.name})}):e.jsx("div",{className:"absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 bg-slate-900/70 rounded-full text-[11px] text-slate-300 whitespace-nowrap pointer-events-none",children:"Drag to turn · two fingers to pan · tap a part"})]}),e.jsxs("aside",{className:"flex-1 md:flex-none md:w-96 min-h-0 overflow-y-auto bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 p-5 space-y-6 text-sm",children:[e.jsx("p",{className:"text-slate-300",children:t.summary}),o==="kymograph"&&e.jsx(yr,{kymo:U}),e.jsxs("section",{children:[e.jsx("h2",{className:"text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-2",children:"Parts"}),e.jsx("div",{className:"grid grid-cols-2 gap-2",children:t.parts.map(E=>e.jsx("button",{onClick:()=>a(f=>f===E.id?null:E.id),onMouseEnter:()=>l(E.id),onMouseLeave:()=>l(null),className:`text-left px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${d===E.id?"bg-blue-600/20 border-blue-500 text-blue-100":"bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"}`,children:E.name},E.id))})]}),e.jsxs("div",{className:"flex flex-col gap-2",children:[v&&e.jsxs("button",{onClick:()=>i(`instrument-${v.id}`),className:"w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-xl border border-slate-700 transition-colors",children:["Compare with the ",v.name]}),t.experiment&&e.jsxs("button",{onClick:()=>i(t.experiment.view),className:"w-full bg-slate-800 hover:bg-slate-700 text-indigo-200 font-bold py-3 rounded-xl border border-indigo-500/40 transition-colors",children:["Open the ",t.experiment.label," experiment"]})]})]})]})]})};export{Cr as InstrumentViewer};

import{au as cs,av as Ds,aw as $t,ax as Et,ay as Ie,az as As,aA as Dt,aB as ds,V as I,aC as Cs,aD as Vt,aE as Xt,t as Le,aF as Ts,aG as De,aH as Rs,aI as Os,f as hs,r as p,G as ot,a as Ns,aJ as Pt,aK as Gs,m as At,D as Ct,j as e,v as Tt,H as Rt,i as us,aL as ps,u as fs,x as xs,w as ms,R as se,y as Us,aM as Yt,A as Bs,M as Hs,b as ks,d as Ws,L as Fs,O as $s}from"./index-ZYUc1hq9.js";import{T as q,a as le,L as Ot}from"./labelFonts-DiBrbmG7.js";const js=cs>=125?"uv1":"uv2",Kt=new Dt,$e=new I;class Nt extends Ds{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry";const s=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],i=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],t=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(t),this.setAttribute("position",new $t(s,3)),this.setAttribute("uv",new $t(i,2))}applyMatrix4(s){const i=this.attributes.instanceStart,t=this.attributes.instanceEnd;return i!==void 0&&(i.applyMatrix4(s),t.applyMatrix4(s),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(s){let i;s instanceof Float32Array?i=s:Array.isArray(s)&&(i=new Float32Array(s));const t=new Et(i,6,1);return this.setAttribute("instanceStart",new Ie(t,3,0)),this.setAttribute("instanceEnd",new Ie(t,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(s,i=3){let t;s instanceof Float32Array?t=s:Array.isArray(s)&&(t=new Float32Array(s));const r=new Et(t,i*2,1);return this.setAttribute("instanceColorStart",new Ie(r,i,0)),this.setAttribute("instanceColorEnd",new Ie(r,i,i)),this}fromWireframeGeometry(s){return this.setPositions(s.attributes.position.array),this}fromEdgesGeometry(s){return this.setPositions(s.attributes.position.array),this}fromMesh(s){return this.fromWireframeGeometry(new As(s.geometry)),this}fromLineSegments(s){const i=s.geometry;return this.setPositions(i.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Dt);const s=this.attributes.instanceStart,i=this.attributes.instanceEnd;s!==void 0&&i!==void 0&&(this.boundingBox.setFromBufferAttribute(s),Kt.setFromBufferAttribute(i),this.boundingBox.union(Kt))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new ds),this.boundingBox===null&&this.computeBoundingBox();const s=this.attributes.instanceStart,i=this.attributes.instanceEnd;if(s!==void 0&&i!==void 0){const t=this.boundingSphere.center;this.boundingBox.getCenter(t);let r=0;for(let a=0,o=s.count;a<o;a++)$e.fromBufferAttribute(s,a),r=Math.max(r,t.distanceToSquared($e)),$e.fromBufferAttribute(i,a),r=Math.max(r,t.distanceToSquared($e));this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(s){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(s)}}class gs extends Nt{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(s){const i=s.length-3,t=new Float32Array(2*i);for(let r=0;r<i;r+=3)t[2*r]=s[r],t[2*r+1]=s[r+1],t[2*r+2]=s[r+2],t[2*r+3]=s[r+3],t[2*r+4]=s[r+4],t[2*r+5]=s[r+5];return super.setPositions(t),this}setColors(s,i=3){const t=s.length-i,r=new Float32Array(2*t);if(i===3)for(let a=0;a<t;a+=i)r[2*a]=s[a],r[2*a+1]=s[a+1],r[2*a+2]=s[a+2],r[2*a+3]=s[a+3],r[2*a+4]=s[a+4],r[2*a+5]=s[a+5];else for(let a=0;a<t;a+=i)r[2*a]=s[a],r[2*a+1]=s[a+1],r[2*a+2]=s[a+2],r[2*a+3]=s[a+3],r[2*a+4]=s[a+4],r[2*a+5]=s[a+5],r[2*a+6]=s[a+6],r[2*a+7]=s[a+7];return super.setColors(r,i),this}fromLine(s){const i=s.geometry;return this.setPositions(i.attributes.position.array),this}}class Gt extends Cs{constructor(s){super({type:"LineMaterial",uniforms:Vt.clone(Vt.merge([Xt.common,Xt.fog,{worldUnits:{value:1},linewidth:{value:1},resolution:{value:new Le(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}}])),vertexShader:`
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
					#include <${cs>=154?"colorspace_fragment":"encodings_fragment"}>
					#include <fog_fragment>
					#include <premultiplied_alpha_fragment>

				}
			`,clipping:!0}),this.isLineMaterial=!0,this.onBeforeCompile=function(){this.transparent?this.defines.USE_LINE_COLOR_ALPHA="1":delete this.defines.USE_LINE_COLOR_ALPHA},Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(i){this.uniforms.diffuse.value=i}},worldUnits:{enumerable:!0,get:function(){return"WORLD_UNITS"in this.defines},set:function(i){i===!0?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(i){this.uniforms.linewidth.value=i}},dashed:{enumerable:!0,get:function(){return"USE_DASH"in this.defines},set(i){!!i!="USE_DASH"in this.defines&&(this.needsUpdate=!0),i===!0?this.defines.USE_DASH="":delete this.defines.USE_DASH}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(i){this.uniforms.dashScale.value=i}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(i){this.uniforms.dashSize.value=i}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(i){this.uniforms.dashOffset.value=i}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(i){this.uniforms.gapSize.value=i}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(i){this.uniforms.opacity.value=i}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(i){this.uniforms.resolution.value.copy(i)}},alphaToCoverage:{enumerable:!0,get:function(){return"USE_ALPHA_TO_COVERAGE"in this.defines},set:function(i){!!i!="USE_ALPHA_TO_COVERAGE"in this.defines&&(this.needsUpdate=!0),i===!0?(this.defines.USE_ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.USE_ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(s)}}const jt=new De,qt=new I,Zt=new I,B=new De,H=new De,re=new De,gt=new I,bt=new Os,k=new Rs,Jt=new I,Ve=new Dt,Xe=new ds,ne=new De;let de,ye;function Qt(n,s,i){return ne.set(0,0,-s,1).applyMatrix4(n.projectionMatrix),ne.multiplyScalar(1/ne.w),ne.x=ye/i.width,ne.y=ye/i.height,ne.applyMatrix4(n.projectionMatrixInverse),ne.multiplyScalar(1/ne.w),Math.abs(Math.max(ne.x,ne.y))}function Vs(n,s){const i=n.matrixWorld,t=n.geometry,r=t.attributes.instanceStart,a=t.attributes.instanceEnd,o=Math.min(t.instanceCount,r.count);for(let l=0,h=o;l<h;l++){k.start.fromBufferAttribute(r,l),k.end.fromBufferAttribute(a,l),k.applyMatrix4(i);const c=new I,d=new I;de.distanceSqToSegment(k.start,k.end,d,c),d.distanceTo(c)<ye*.5&&s.push({point:d,pointOnLine:c,distance:de.origin.distanceTo(d),object:n,face:null,faceIndex:l,uv:null,[js]:null})}}function Xs(n,s,i){const t=s.projectionMatrix,a=n.material.resolution,o=n.matrixWorld,l=n.geometry,h=l.attributes.instanceStart,c=l.attributes.instanceEnd,d=Math.min(l.instanceCount,h.count),f=-s.near;de.at(1,re),re.w=1,re.applyMatrix4(s.matrixWorldInverse),re.applyMatrix4(t),re.multiplyScalar(1/re.w),re.x*=a.x/2,re.y*=a.y/2,re.z=0,gt.copy(re),bt.multiplyMatrices(s.matrixWorldInverse,o);for(let b=0,U=d;b<U;b++){if(B.fromBufferAttribute(h,b),H.fromBufferAttribute(c,b),B.w=1,H.w=1,B.applyMatrix4(bt),H.applyMatrix4(bt),B.z>f&&H.z>f)continue;if(B.z>f){const S=B.z-H.z,N=(B.z-f)/S;B.lerp(H,N)}else if(H.z>f){const S=H.z-B.z,N=(H.z-f)/S;H.lerp(B,N)}B.applyMatrix4(t),H.applyMatrix4(t),B.multiplyScalar(1/B.w),H.multiplyScalar(1/H.w),B.x*=a.x/2,B.y*=a.y/2,H.x*=a.x/2,H.y*=a.y/2,k.start.copy(B),k.start.z=0,k.end.copy(H),k.end.z=0;const x=k.closestPointToPointParameter(gt,!0);k.at(x,Jt);const w=hs.lerp(B.z,H.z,x),W=w>=-1&&w<=1,Z=gt.distanceTo(Jt)<ye*.5;if(W&&Z){k.start.fromBufferAttribute(h,b),k.end.fromBufferAttribute(c,b),k.start.applyMatrix4(o),k.end.applyMatrix4(o);const S=new I,N=new I;de.distanceSqToSegment(k.start,k.end,N,S),i.push({point:N,pointOnLine:S,distance:de.origin.distanceTo(N),object:n,face:null,faceIndex:b,uv:null,[js]:null})}}}class bs extends Ts{constructor(s=new Nt,i=new Gt({color:Math.random()*16777215})){super(s,i),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){const s=this.geometry,i=s.attributes.instanceStart,t=s.attributes.instanceEnd,r=new Float32Array(2*i.count);for(let o=0,l=0,h=i.count;o<h;o++,l+=2)qt.fromBufferAttribute(i,o),Zt.fromBufferAttribute(t,o),r[l]=l===0?0:r[l-1],r[l+1]=r[l]+qt.distanceTo(Zt);const a=new Et(r,2,1);return s.setAttribute("instanceDistanceStart",new Ie(a,1,0)),s.setAttribute("instanceDistanceEnd",new Ie(a,1,1)),this}raycast(s,i){const t=this.material.worldUnits,r=s.camera;r===null&&!t&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');const a=s.params.Line2!==void 0&&s.params.Line2.threshold||0;de=s.ray;const o=this.matrixWorld,l=this.geometry,h=this.material;ye=h.linewidth+a,l.boundingSphere===null&&l.computeBoundingSphere(),Xe.copy(l.boundingSphere).applyMatrix4(o);let c;if(t)c=ye*.5;else{const f=Math.max(r.near,Xe.distanceToPoint(de.origin));c=Qt(r,f,h.resolution)}if(Xe.radius+=c,de.intersectsSphere(Xe)===!1)return;l.boundingBox===null&&l.computeBoundingBox(),Ve.copy(l.boundingBox).applyMatrix4(o);let d;if(t)d=ye*.5;else{const f=Math.max(r.near,Ve.distanceToPoint(de.origin));d=Qt(r,f,h.resolution)}Ve.expandByScalar(d),de.intersectsBox(Ve)!==!1&&(t?Vs(this,i):Xs(this,r,i))}onBeforeRender(s){const i=this.material.uniforms;i&&i.resolution&&(s.getViewport(jt),this.material.uniforms.resolution.value.set(jt.z,jt.w))}}class Ys extends bs{constructor(s=new gs,i=new Gt({color:Math.random()*16777215})){super(s,i),this.isLine2=!0,this.type="Line2"}}const Ks=p.forwardRef(function({points:s,color:i=16777215,vertexColors:t,linewidth:r,lineWidth:a,segments:o,dashed:l,...h},c){var d,f;const b=ot(W=>W.size),U=p.useMemo(()=>o?new bs:new Ys,[o]),[E]=p.useState(()=>new Gt),x=(t==null||(d=t[0])==null?void 0:d.length)===4?4:3,w=p.useMemo(()=>{const W=o?new Nt:new gs,Z=s.map(S=>{const N=Array.isArray(S);return S instanceof I||S instanceof De?[S.x,S.y,S.z]:S instanceof Le?[S.x,S.y,0]:N&&S.length===3?[S[0],S[1],S[2]]:N&&S.length===2?[S[0],S[1],0]:S});if(W.setPositions(Z.flat()),t){i=16777215;const S=t.map(N=>N instanceof Ns?N.toArray():N);W.setColors(S.flat(),x)}return W},[s,o,t,x]);return p.useLayoutEffect(()=>{U.computeLineDistances()},[s,U]),p.useLayoutEffect(()=>{l?E.defines.USE_DASH="":delete E.defines.USE_DASH,E.needsUpdate=!0},[l,E]),p.useEffect(()=>()=>{w.dispose(),E.dispose()},[w]),p.createElement("primitive",Pt({object:U,ref:c},h),p.createElement("primitive",{object:w,attach:"geometry"}),p.createElement("primitive",Pt({object:E,attach:"material",color:i,vertexColors:!!t,resolution:[b.width,b.height],linewidth:(f=r??a)!==null&&f!==void 0?f:1,dashed:l,transparent:x===4},h)))}),_t=p.forwardRef(({threshold:n=15,geometry:s,...i},t)=>{const r=p.useRef(null);p.useImperativeHandle(t,()=>r.current,[]);const a=p.useMemo(()=>[0,0,0,1,0,0],[]),o=p.useRef(),l=p.useRef();return p.useLayoutEffect(()=>{const h=r.current.parent,c=s??(h==null?void 0:h.geometry);if(!c||o.current===c&&l.current===n)return;o.current=c,l.current=n;const f=new Gs(c,n).attributes.position.array;r.current.geometry.setPositions(f),r.current.geometry.attributes.instanceStart.needsUpdate=!0,r.current.geometry.attributes.instanceEnd.needsUpdate=!0,r.current.computeLineDistances()}),p.createElement(Ks,Pt({segments:!0,points:a,ref:r,raycast:()=>null},i))}),qs={rbc:{bulbLen:2.2,bulbR:.4,bore:.03,bead:[.2,.1],beadColor:"#8b1a1a",topMark:"101",mouth:"#e11d27"},wbc:{bulbLen:1.8,bulbR:.33,bore:.06,bead:[.15,.095],beadColor:"#f8fafc",topMark:"11",mouth:"#f4f4f5"}},ae=.2,Ye=.5,oe=6,Zs=1.7,yt=.7,he=.25,It="#1e3a8a",ce="#3b82f6",Ae=({points:n,x0:s,children:i,userData:t})=>{const r=p.useMemo(()=>new Tt(n.map(([a,o])=>new Le(a,o)),48),[n]);return e.jsx("mesh",{geometry:r,position:[s,0,0],rotation:[0,0,-Math.PI/2],userData:t,children:i})},Js=n=>{for(let s=n;s;s=s.parent)if(s.userData.part)return s.userData;return null},es=n=>{var i;const s=n.intersections.map(t=>Js(t.object)).filter(t=>!!t);return((i=s.find(t=>!t.glass)??s[0])==null?void 0:i.part)??null},Ke=({lit:n})=>e.jsx("meshPhysicalMaterial",{color:n?ce:"#ffffff",transparent:!0,opacity:n?.6:.22,roughness:.03,metalness:0,clearcoat:1,envMapIntensity:1.6,side:Rt,depthWrite:!1,emissive:n?ce:"#000000",emissiveIntensity:n?.7:0}),vt=({at:n,children:s,lit:i})=>e.jsx(q,{font:le,position:[n,0,ae+.012],rotation:[0,0,-Math.PI/2],fontSize:.22,color:i?ce:It,anchorX:"center",anchorY:"middle",children:s}),ts=({kind:n,active:s,onHover:i,onSelect:t})=>{const r=qs[n],a=oe+r.bulbLen,o=a+.3,l=a+Zs,h=-l/2-.6,c=x=>h+x,d=x=>s===x,f=p.useMemo(()=>{const x=[];for(let w=0;w<=40;w++){const W=w/40;x.push([ae+(r.bulbR-ae)*Math.pow(Math.sin(Math.PI*W),1.6),oe+r.bulbLen*W])}return{tip:[[.05,0],[.12,Ye*.6],[ae,Ye]],stem:[[ae,Ye],[ae,oe]],bulb:x,neck:[[ae,a],[ae,l]],sleeve:[[he+.03,l-yt],[he,l-yt+.12],[he,l+.05]]}},[r.bulbLen,r.bulbR,a,l]),b=p.useMemo(()=>{const x=c(l),w=new At([new I(x,0,0),new I(x+.9,0,-.05),new I(x+1.7,-.5,-.1),new I(x+1.75,-1.5,0),new I(x+.8,-2.1,.15),new I(x-1.6,-2.25,.15),new I(x-4.2,-2.05,0)]),W=w.getPoint(1),Z=w.getTangent(1);return{geometry:new Ct(w,120,he*.76,16,!1),end:W,angle:Math.atan2(Z.y,Z.x)}},[l,h]),U=Array.from({length:10},(x,w)=>(w+1)*(oe/10)),E=(x,w)=>e.jsxs("mesh",{position:[c((x+w)/2),0,-.07],children:[e.jsx("boxGeometry",{args:[w-x,.3,.05]}),e.jsx("meshStandardMaterial",{color:"#ffffff",roughness:.55})]});return e.jsxs("group",{onPointerMove:x=>{x.stopPropagation(),i(es(x))},onPointerOut:()=>i(null),onClick:x=>{x.stopPropagation();const w=es(x);w&&t(w)},children:[e.jsx(Ae,{points:f.tip,x0:h,userData:{part:"tip",glass:!0},children:e.jsx(Ke,{lit:d("tip")})}),e.jsx(Ae,{points:f.stem,x0:h,userData:{part:"stem",glass:!0},children:e.jsx(Ke,{lit:d("stem")})}),e.jsx(Ae,{points:f.bulb,x0:h,userData:{part:"bulb",glass:!0},children:e.jsx(Ke,{lit:d("bulb")})}),e.jsx(Ae,{points:f.neck,x0:h,userData:{part:"top-mark",glass:!0},children:e.jsx(Ke,{lit:d("top-mark")})}),E(Ye*.8,oe),E(a,l-yt),e.jsxs("mesh",{position:[c(oe/2+.1),0,0],rotation:[0,0,Math.PI/2],userData:{part:"stem"},children:[e.jsx("cylinderGeometry",{args:[r.bore,r.bore,oe-.2,12]}),e.jsx("meshStandardMaterial",{color:d("stem")?ce:"#9aa9b8"})]}),e.jsxs("group",{userData:{part:"marks"},children:[U.map(x=>e.jsx("group",{position:[c(x),0,0],rotation:[0,Math.PI/2,0],children:e.jsxs("mesh",{rotation:[0,0,Math.PI/2],children:[e.jsx("torusGeometry",{args:[ae+.004,.009,4,24,Math.PI]}),e.jsx("meshBasicMaterial",{color:d("marks")?ce:It})]})},x)),e.jsx(vt,{at:c(oe/2-.22),lit:d("marks"),children:"0.5"}),e.jsx(vt,{at:c(oe-.2),lit:d("marks"),children:"1"})]}),e.jsxs("group",{userData:{part:"top-mark"},children:[e.jsx("group",{position:[c(o),0,0],rotation:[0,Math.PI/2,0],children:e.jsxs("mesh",{rotation:[0,0,Math.PI/2],children:[e.jsx("torusGeometry",{args:[ae+.004,.009,4,24,Math.PI]}),e.jsx("meshBasicMaterial",{color:d("top-mark")?ce:It})]})}),e.jsx(vt,{at:c(o+.26),lit:d("top-mark"),children:r.topMark})]}),e.jsxs("mesh",{position:[c(oe+r.bulbLen*.5),-(r.bulbR-r.bead[1]-.06),0],scale:[r.bead[0],r.bead[1],r.bead[1]],userData:{part:"bead"},children:[e.jsx("sphereGeometry",{args:[1,32,24]}),e.jsx("meshStandardMaterial",{color:r.beadColor,roughness:.3,emissive:d("bead")?ce:"#000000",emissiveIntensity:d("bead")?.6:0})]}),e.jsxs("group",{userData:{part:"tube"},children:[e.jsx(Ae,{points:f.sleeve,x0:h,children:e.jsx(ss,{lit:d("tube")})}),e.jsx("mesh",{geometry:b.geometry,children:e.jsx(ss,{lit:d("tube")})})]}),e.jsxs("group",{position:[b.end.x,b.end.y,b.end.z],rotation:[0,0,b.angle-Math.PI/2],userData:{part:"mouthpiece"},children:[e.jsxs("mesh",{position:[0,.08,0],children:[e.jsx("cylinderGeometry",{args:[he*1.15,he*1.15,.16,24]}),e.jsx("meshStandardMaterial",{color:d("mouthpiece")?ce:r.mouth,roughness:.35})]}),e.jsxs("mesh",{position:[0,.42,0],children:[e.jsx("cylinderGeometry",{args:[he*.95,he*.8,.55,24]}),e.jsx("meshStandardMaterial",{color:d("mouthpiece")?ce:r.mouth,roughness:.35})]})]})]})},ss=({lit:n})=>e.jsx("meshPhysicalMaterial",{color:n?ce:"#e3d6b4",roughness:.4,transparent:!0,opacity:.82,clearcoat:.4}),qe=75,rs=33,Ce=6,Mt=3,Ze=1,Qs=7.6,er="#2f3f9e",Je=.02,Qe=n=>({polygonOffset:!0,polygonOffsetFactor:-n,polygonOffsetUnits:-4*n}),fe="#3b82f6",tr=(()=>{let n=null;return()=>{if(n)return n;const s=2048,i=s/3,t=document.createElement("canvas");t.width=t.height=s;const r=t.getContext("2d");r.strokeStyle="rgba(15, 23, 42, 0.85)";const a=(l,h,c,d,f)=>{r.lineWidth=f,r.beginPath(),r.moveTo(l*i,h*i),r.lineTo(c*i,d*i),r.stroke()},o=(l,h,c,d)=>{for(const f of[-.0125,0,.0125])h?a(l+f,c,l+f,d,3):a(c,l+f,d,l+f,3)};for(let l=0;l<=3;l++)o(l,!0,0,3),o(l,!1,0,3);for(const[l,h]of[[0,0],[2,0],[0,2],[2,2]])for(let c=1;c<4;c++)a(l+c/4,h,l+c/4,h+1,2.5),a(l,h+c/4,l+1,h+c/4,2.5);for(let l=1;l<5;l++)o(1+l/5,!0,0,3),o(1+l/5,!1,0,3);for(let l=1;l<20;l++)l%4!==0&&(a(1+l/20,1,1+l/20,2,1.5),a(1,1+l/20,2,1+l/20,1.5));for(let l=1;l<4;l++)a(1,l/4,2,l/4,2.5),a(1,2+l/4,2,2+l/4,2.5),a(l/4,1,l/4,2,2.5),a(2+l/4,1,2+l/4,2,2.5);return n=new us(t),n.anisotropy=8,n.colorSpace=ps,n}})(),sr=n=>{for(let s=n;s;s=s.parent)if(s.userData.part)return s.userData;return null},ns=n=>{var i;const s=n.intersections.map(t=>sr(t.object)).filter(t=>!!t);return((i=s.find(t=>!t.glass)??s[0])==null?void 0:i.part)??null},et=({lit:n,opacity:s=.38})=>e.jsx("meshPhysicalMaterial",{color:n?fe:"#fbf1f7",transparent:!0,opacity:n?.6:s,roughness:.06,metalness:0,clearcoat:1,envMapIntensity:1.4,depthWrite:!1,emissive:n?fe:"#000000",emissiveIntensity:n?.6:0}),tt=({x:n,y:s,z:i,children:t,part:r})=>e.jsxs("mesh",{position:[(n[0]+n[1])/2,(s[0]+s[1])/2,(i[0]+i[1])/2],userData:r,children:[e.jsx("boxGeometry",{args:[n[1]-n[0],s[1]-s[0],i[1]-i[0]]}),t]}),St=({x:n,z:s,size:i,lit:t,children:r})=>e.jsx(q,{font:Ot,position:[n,.05,s],rotation:[-Math.PI/2,0,0],fontSize:i,color:t?fe:er,anchorX:"center",anchorY:"middle",textAlign:"center",lineHeight:1.15,children:r}),rr=({active:n,onHover:s,onSelect:i})=>{const t=c=>n===c,r=p.useMemo(tr,[]),a=Ce+Mt,o=rs/2,l=-.1,h=-1;return e.jsxs("group",{onPointerMove:c=>{c.stopPropagation(),s(ns(c))},onPointerOut:()=>s(null),onClick:c=>{c.stopPropagation();const d=ns(c);d&&i(d)},children:[e.jsx(tt,{x:[-qe/2,qe/2],y:[-4,h],z:[-o,o],part:{part:"slide",glass:!0},children:e.jsx(et,{lit:t("slide")})}),[-1,1].map(c=>e.jsx(tt,{x:c<0?[-qe/2,-a]:[a,qe/2],y:[h,0],z:[-o,o],part:{part:"platforms",glass:!0},children:e.jsx(et,{lit:t("platforms")})},c)),[-1,1].map(c=>e.jsx(tt,{x:[-Ce,Ce],y:[h,l],z:c<0?[-o,-Ze]:[Ze,o],part:{part:"central",glass:!0},children:e.jsx(et,{lit:t("central")})},c)),[-1,1].map(c=>e.jsxs("mesh",{position:[0,l+Je,c*(Ze+6.5)],rotation:[-Math.PI/2,0,0],userData:{part:"central"},children:[e.jsx("planeGeometry",{args:[7,12.6]}),e.jsx("meshStandardMaterial",{color:t("central")?fe:"#a7afb4",metalness:.85,roughness:.28,...Qe(1)})]},c)),[-1,1].map(c=>e.jsxs("mesh",{position:[0,l+2*Je,c*Qs],rotation:[-Math.PI/2,0,0],userData:{part:"grid"},children:[e.jsx("planeGeometry",{args:[3,3]}),e.jsx("meshBasicMaterial",{map:r,transparent:!0,color:t("grid")?fe:"#ffffff",...Qe(2)})]},c)),e.jsxs("group",{userData:{part:"moats"},children:[[-1,1].map(c=>e.jsxs("mesh",{position:[c*(Ce+Mt/2),h+Je,0],rotation:[-Math.PI/2,0,0],children:[e.jsx("planeGeometry",{args:[Mt,rs]}),e.jsx("meshStandardMaterial",{color:t("moats")?fe:"#ece6ea",roughness:.95,transparent:!0,opacity:.65,...Qe(1)})]},c)),e.jsxs("mesh",{position:[0,h+Je,0],rotation:[-Math.PI/2,0,0],children:[e.jsx("planeGeometry",{args:[Ce*2,Ze*2]}),e.jsx("meshStandardMaterial",{color:t("moats")?fe:"#ece6ea",roughness:.95,transparent:!0,opacity:.65,...Qe(1)})]})]}),e.jsxs("group",{userData:{part:"print"},children:[e.jsx(St,{x:-23,z:-6,size:2.4,lit:t("print"),children:`Tiefe
Depth
Profondeur
0.100mm`}),e.jsx(St,{x:-23,z:11,size:2.4,lit:t("print"),children:"0.0025mm²"}),e.jsx(St,{x:23,z:-7,size:2.2,lit:t("print"),children:`NEUBAUER
IMPROVED
BRIGHT-LINE`})]}),e.jsxs(tt,{x:[-11,11],y:[0,.4],z:[-11,11],part:{part:"coverslip",glass:!0},children:[e.jsx(et,{lit:t("coverslip"),opacity:.18}),e.jsx(_t,{color:t("coverslip")?fe:"#8fa0b4",lineWidth:t("coverslip")?2.5:1.5})]})]})},lt=[.12,.25,1.25,2.5,12.5,25,320,640],nr=8,Pe=7.5,ee=15,ct=7.56,or=2*Math.PI*Pe*10,v={w:19,h:19,d:19,y0:1.2},ys=v.y0+v.h,Q=ys+.6,$=v.d/2,it=Q+3,vs=9,Te=it+vs+ee+2.5,F=new I(21,34.5,ct+.32),Re=F.x,Be=2.2,Lt=3,He="#3b82f6",_e=-2.35,wt=.6+_e,ve=1536,dt=ve/(2*Math.PI*ct),be=Math.round(ee*dt),os=Math.round(1.2*dt),ir=n=>{n.globalCompositeOperation="source-over",n.fillStyle="#17150f",n.fillRect(0,0,ve,be);for(let s=0;s<260;s++){const i=Math.random()*ve,t=Math.random()*be,r=8+Math.random()*60,a=n.createRadialGradient(i,t,0,i,t,r),o=Math.random()<.5?"40,36,28":"6,6,5";a.addColorStop(0,`rgba(${o},${.08+Math.random()*.1})`),a.addColorStop(1,`rgba(${o},0)`),n.fillStyle=a,n.fillRect(i-r,t-r,2*r,2*r)}for(let s=0;s<9e3;s++)n.fillStyle=Math.random()<.5?"rgba(60,55,45,0.25)":"rgba(0,0,0,0.3)",n.fillRect(Math.random()*ve,Math.random()*be,1.2,1.2);n.fillStyle="rgba(0,0,0,0.35)",n.fillRect(0,0,os,be),n.fillStyle="rgba(120,112,95,0.55)",n.fillRect(os-2,0,2,be)},ar=n=>{const s=n-.01;return s<=0||s>=.09?0:s<.04?Lt*Math.sin(Math.PI/2*(s/.04))**2:Lt*Math.cos(Math.PI/2*((s-.04)/.05))**2},lr=()=>{const[n,s]=p.useState({on:!1,speed:6,clutch:!0,lift:3.5,leverOn:!0,contactStim:!1}),i=p.useRef([]),t=p.useRef(0),[r,a]=p.useState(0),o=p.useCallback(h=>s(c=>({...c,...h})),[]),l=p.useCallback(()=>{i.current.push(t.current)},[]);return{state:n,set:o,stimulate:l,stimuli:i,clock:t,paperKey:r,newPaper:()=>a(h=>h+1)}},Ms=n=>n.on&&n.clutch&&n.speed!==nr,cr=n=>{for(let s=n;s;s=s.parent)if(s.userData.part)return s.userData.part;return null},is=n=>{for(const s of n.intersections){const i=cr(s.object);if(i)return i}return null},G=({lit:n,color:s,metal:i=.3,rough:t=.55})=>e.jsx("meshStandardMaterial",{color:n?He:s,metalness:n?.1:i,roughness:t,emissive:n?He:"#000000",emissiveIntensity:n?.35:0}),A=({lit:n})=>e.jsx(G,{lit:n,color:"#dfe3e7",metal:1,rough:.15}),Oe=({lit:n})=>e.jsx(G,{lit:n,color:"#c9cdd1",metal:.85,rough:.35}),Ne=({lit:n})=>e.jsx(G,{lit:n,color:"#c9a24a",metal:.9,rough:.3}),ie=({lit:n})=>e.jsx(G,{lit:n,color:"#1d1f22",metal:.2,rough:.45}),st=({lit:n})=>e.jsx(G,{lit:n,color:"#ecebe5",metal:.05,rough:.45}),L=({r:n,h:s,pos:i,rot:t,seg:r=32,r2:a,children:o})=>e.jsxs("mesh",{position:i,rotation:t,children:[e.jsx("cylinderGeometry",{args:[a??n,n,s,r]}),o]}),z=({size:n,pos:s,rot:i,children:t})=>e.jsxs("mesh",{position:s,rotation:i,children:[e.jsx("boxGeometry",{args:n}),t]}),ze=({r:n,h:s,pos:i,rot:t,lit:r,color:a="#dfe3e7"})=>{const o=p.useMemo(()=>{const l=[];for(let d=0;d<=80;d++){const f=d/80*Math.PI*2,b=d%2?n:n*.92;l.push(new Le(Math.cos(f)*b,Math.sin(f)*b))}const c=new xs(new ms(l),{depth:s,bevelEnabled:!0,bevelSize:n*.04,bevelThickness:n*.04,bevelSegments:1});return c.translate(0,0,-s/2),c.rotateX(Math.PI/2),c},[n,s]);return e.jsx("mesh",{geometry:o,position:i,rotation:t,children:e.jsx(G,{lit:r,color:a,metal:.9,rough:.3})})},Ge=({w:n,h:s,lit:i})=>e.jsx(e.Fragment,{children:[[-1,-1],[1,-1],[-1,1],[1,1]].map(([t,r],a)=>e.jsxs("mesh",{position:[t*(n/2-.9),r*(s/2-.9),.02],scale:[1,1,.45],children:[e.jsx("sphereGeometry",{args:[.32,14,8,0,Math.PI*2,0,Math.PI/2]}),e.jsx(G,{lit:i,color:"#9aa0a6",metal:.9,rough:.3})]},a))}),dr=16.9,hr=.72,Ue=n=>dr-n*hr,ur=({active:n,onHover:s,onSelect:i,kymo:t})=>{const r=u=>n===u,{state:a,stimuli:o,clock:l,paperKey:h}=t,c=p.useRef(a);c.current=a;const d=p.useMemo(()=>{const u=document.createElement("canvas");return u.width=ve,u.height=be,u},[]),f=p.useMemo(()=>{const u=new us(d);return u.colorSpace=ps,u.anisotropy=8,u},[d]),b=p.useRef(null);p.useMemo(()=>{ir(d.getContext("2d")),f.needsUpdate=!0,b.current=null},[h,d,f]);const U=p.useRef(null),E=p.useRef(null),x=p.useRef(null),w=p.useRef(null),W=p.useRef(null),Z=p.useRef(null),S=p.useRef(null),N=p.useRef(null),ht=p.useRef(null),ut=p.useRef(null),pt=p.useRef(null),ws=p.useRef({phi:0,rate:0,lift:a.lift,swing:0,slot:Ue(a.speed),clutch:1,t:performance.now()/1e3,flash:0,dirty:0});fs(()=>{const u=ws.current,R=c.current,te=d.getContext("2d"),Ht=performance.now()/1e3,Se=Math.min(.1,Ht-u.t);u.t=Ht;const ft=l.current+Se,zs=Ms(R)?lt[R.speed]/10/Pe:0,ke=V=>Math.min(1,Se*V);u.lift+=(R.lift-u.lift)*ke(6),u.swing+=((R.leverOn?0:1)-u.swing)*ke(5),u.slot+=(Ue(R.speed)-u.slot)*ke(12),u.clutch+=((R.clutch?1:0)-u.clutch)*ke(10),te.strokeStyle="rgba(236,230,214,0.92)",te.lineWidth=2.2,te.lineCap="round",te.lineJoin="round",te.beginPath();let xt=!1;const kt=Math.max(1,Math.ceil(Se/.002)),mt=Se/kt;let We=0;for(let V=1;V<=kt;V++){const Ft=ft-Se+V*mt;u.rate+=(zs-u.rate)*Math.min(1,mt*8),u.rate<1e-5&&(u.rate=0);const Ps=u.phi;if(u.phi-=u.rate*mt,u.rate>0&&Math.floor((-Ps-wt+_e)/(2*Math.PI))!==Math.floor((-u.phi-wt+_e)/(2*Math.PI))&&(u.flash=1,R.contactStim&&o.current.push(Ft)),We=Math.min(o.current.reduce((Is,Ls)=>Is+ar(Ft-Ls),0),Lt*1.6),u.swing>.04){b.current=null;continue}const _s=F.y+We,we=(it+u.lift+ee-_s)*dt,Fe=(-u.phi%(2*Math.PI)+2*Math.PI)%(2*Math.PI)/(2*Math.PI)*ve;if(we<2||we>be-2){b.current=null;continue}const xe=b.current;xe&&Math.abs(Fe-xe.u)<ve/2&&Math.abs(we-xe.v)<1.5*dt&&(Math.abs(Fe-xe.u)>.05||Math.abs(we-xe.v)>.05)&&(te.moveTo(xe.u,xe.v),te.lineTo(Fe,we),xt=!0),b.current={u:Fe,v:we}}xt&&(te.stroke(),u.dirty++),u.dirty&&(u.dirty>1||!xt)&&(f.needsUpdate=!0,u.dirty=0),o.current=o.current.filter(V=>ft-V<.2),l.current=ft,U.current&&(U.current.rotation.y=u.phi),E.current&&(E.current.position.y=it+u.lift),w.current&&(w.current.rotation.y=u.swing*.07),x.current&&(x.current.rotation.z=-Math.asin(We/Re)),S.current&&(S.current.position.y=u.slot),N.current&&(N.current.rotation.z=.7-1.4*(1-u.clutch)),ht.current&&(ht.current.rotation.x=R.on?-.22:.22);const Wt=We*Be/Re,Es=F.y-.3-Wt;if(Z.current){const V=Es-zt;Z.current.scale.y=V,Z.current.position.y=zt+V/2}if(W.current){const V=Wt/at;W.current.scale.set(1+V*2.5,1-V,1+V*2.5)}ut.current&&(ut.current.emissiveIntensity=R.on?1.6:0),u.flash=Math.max(0,u.flash-Se*8),pt.current&&(pt.current.emissiveIntensity=u.flash*3)});const Bt=[Math.sin(_e),Math.cos(_e)];return e.jsxs("group",{onPointerMove:u=>{u.stopPropagation(),s(is(u))},onPointerOut:()=>s(null),onClick:u=>{u.stopPropagation();const R=is(u);R&&i(R)},children:[e.jsxs("mesh",{position:[7,-.5,2],children:[e.jsx("boxGeometry",{args:[60,1,38]}),e.jsx("meshStandardMaterial",{color:"#8a6a4a",roughness:.8})]}),e.jsxs("group",{userData:{part:"base"},children:[e.jsx(z,{size:[v.w,v.h,v.d],pos:[0,v.y0+v.h/2,0],children:e.jsx(st,{lit:r("base")})}),e.jsx(z,{size:[v.w+.6,.6,v.d+.6],pos:[0,ys+.3,0],children:e.jsx(st,{lit:r("base")})}),e.jsx(z,{size:[v.w+.3,.5,v.d+.3],pos:[0,v.y0+.25,0],children:e.jsx(st,{lit:r("base")})}),[[-1,-1],[1,-1],[-1,1],[1,1]].map(([u,R],te)=>e.jsx(L,{r:1.1,r2:1.2,h:1.2,pos:[u*(v.w/2-1.8),.6,R*(v.d/2-1.8)],children:e.jsx(ie,{lit:r("base")})},te)),e.jsx("group",{position:[0,v.y0+v.h/2,$+.01],children:e.jsx(Ge,{w:v.w,h:v.h,lit:r("base")})}),e.jsx("group",{position:[v.w/2+.01,v.y0+v.h/2,0],rotation:[0,Math.PI/2,0],children:e.jsx(Ge,{w:v.d,h:v.h,lit:r("base")})}),e.jsx("group",{position:[-19/2-.01,v.y0+v.h/2,0],rotation:[0,-Math.PI/2,0],children:e.jsx(Ge,{w:v.d,h:v.h,lit:r("base")})}),e.jsx("group",{position:[0,Q+.01,0],rotation:[-Math.PI/2,0,0],children:e.jsx(Ge,{w:v.w+.6,h:v.d+.6,lit:r("base")})}),[-1,1].map(u=>[0,1,2,3,4,5].map(R=>e.jsx(z,{size:[.35,.45,4.2],pos:[-19/2-.12,v.y0+5+R*1.3,u*3.2],rot:[0,0,.5],children:e.jsx(st,{lit:r("base")})},`${u}${R}`)))]}),e.jsxs("group",{userData:{part:"speed"},children:[e.jsxs("group",{position:[0,14,$+.06],children:[e.jsx(z,{size:[5.8,10.4,.12],pos:[0,0,0],children:e.jsx(G,{lit:r("speed"),color:"#141517",metal:.3,rough:.5})}),e.jsx(Ge,{w:5.8,h:10.4,lit:r("speed")}),e.jsx(q,{font:le,position:[0,4.5,.08],fontSize:.36,color:"#f2d84b",anchorX:"center",anchorY:"middle",children:"SPEED MM PER SEC."}),e.jsx(q,{font:le,position:[0,3.95,.08],fontSize:.3,color:"#f2d84b",anchorX:"center",anchorY:"middle",children:'WITH 6" DIA CYLINDER'}),e.jsx(q,{font:le,position:[0,-4.25,.08],fontSize:.32,color:"#f2d84b",anchorX:"center",anchorY:"middle",children:"E-8 RECORDING DRUM"}),e.jsx(q,{font:Ot,position:[0,-4.75,.08],fontSize:.28,color:"#f2d84b",anchorX:"center",anchorY:"middle",children:"220 V AC"}),e.jsx(z,{size:[.75,7.3,.05],pos:[-1,Ue(4)-14,.07],children:e.jsx("meshStandardMaterial",{color:"#000000"})}),[...lt.map(String),"N"].map((u,R)=>e.jsxs("group",{position:[0,Ue(R)-14,.08],children:[e.jsx(z,{size:[.5,.12,.02],pos:[-.38,0,0],children:e.jsx("meshStandardMaterial",{color:"#000000"})}),e.jsx(q,{font:le,position:[1.3,0,0],fontSize:.4,color:"#f2d84b",anchorX:"center",anchorY:"middle",children:u.replace(/^0\./,".")})]},u))]}),e.jsxs("group",{ref:S,position:[0,Ue(a.speed),$+.15],children:[e.jsx(z,{size:[1.3,.45,.9],pos:[-1,0,.45],children:e.jsx(A,{lit:r("speed")})}),e.jsx(z,{size:[1.3,.25,.4],pos:[-1,.3,.75],children:e.jsx(A,{lit:r("speed")})})]})]}),e.jsxs("group",{userData:{part:"switch"},children:[e.jsx(z,{size:[1.7,2.5,.25],pos:[-5.6,5.6,$+.12],children:e.jsx(ie,{lit:r("switch")})}),e.jsx("group",{ref:ht,position:[-5.6,5.6,$+.3],children:e.jsxs("mesh",{children:[e.jsx("boxGeometry",{args:[1.2,1.95,.35]}),e.jsx("meshStandardMaterial",{ref:ut,color:r("switch")?He:"#c4161c",emissive:"#ff2a1f",emissiveIntensity:0,roughness:.25})]})}),e.jsx(q,{font:le,position:[-5.6,3.95,$+.02],fontSize:.35,color:"#3a3a3a",anchorX:"center",anchorY:"middle",children:"ON"}),e.jsx(z,{size:[2.2,1.6,.25],pos:[-5.6,2.6,$+.12],children:e.jsx(ie,{lit:r("switch")})}),e.jsx(z,{size:[1.6,1.2,1.1],pos:[-5.6,2.6,$+.8],children:e.jsx(ie,{lit:r("switch")})}),e.jsx("mesh",{geometry:fr,children:e.jsx(G,{lit:r("switch"),color:"#2a2b2e",metal:0,rough:.7})})]}),e.jsxs("group",{userData:{part:"clutch"},position:[v.w/2+.01,13,0],rotation:[0,Math.PI/2,0],children:[e.jsxs("mesh",{position:[0,0,.02],children:[e.jsx("circleGeometry",{args:[3.3,48]}),e.jsx(G,{lit:r("clutch"),color:"#f6f5f0",metal:0,rough:.6})]}),e.jsxs("mesh",{position:[0,0,.03],children:[e.jsx("ringGeometry",{args:[2.85,3.05,64]}),e.jsx(G,{lit:r("clutch"),color:"#d0202a",metal:0,rough:.5})]}),e.jsx(q,{font:le,position:[0,2.25,.05],fontSize:.36,color:"#c81e28",anchorX:"center",anchorY:"middle",children:"NEUTRALISING CLUTCH"}),e.jsx(q,{font:le,position:[-1.7,-2.1,.05],fontSize:.36,color:"#c81e28",anchorX:"center",anchorY:"middle",children:"ENG"}),e.jsx(q,{font:le,position:[1.6,-2.1,.05],fontSize:.36,color:"#c81e28",anchorX:"center",anchorY:"middle",children:"DIS ENG"}),e.jsx(L,{r:.55,h:.5,pos:[0,0,.25],rot:[Math.PI/2,0,0],children:e.jsx(A,{lit:r("clutch")})}),e.jsxs("group",{ref:N,position:[0,0,.55],children:[e.jsx(L,{r:.28,h:2.4,pos:[0,1.2,.2],children:e.jsx(A,{lit:r("clutch")})}),e.jsx(L,{r:.33,h:1.2,pos:[0,2.5,.75],rot:[Math.PI/2,0,0],children:e.jsx(A,{lit:r("clutch")})})]})]}),e.jsxs("group",{userData:{part:"contact"},position:[Bt[0]*8.5,Q,Bt[1]*8.5],rotation:[0,_e,0],children:[e.jsxs("mesh",{position:[0,1.1,0],children:[e.jsx("boxGeometry",{args:[5,2.2,2.4]}),e.jsx("meshPhysicalMaterial",{color:r("contact")?He:"#e8f3f6",transparent:!0,opacity:.45,roughness:.08,clearcoat:1,depthWrite:!1})]}),[-1,1].map(u=>e.jsxs("group",{position:[u*1.4,2.2,0],children:[e.jsx(ze,{r:.5,h:1.1,pos:[0,.55,0],lit:r("contact"),color:u<0?"#c0161c":"#1d1f22"}),e.jsx(L,{r:.18,h:.5,pos:[0,1.3,0],children:e.jsx(Ne,{lit:r("contact")})})]},u)),e.jsx(z,{size:[.08,1,3.8],pos:[0,1.6,-3.1],children:e.jsx(Ne,{lit:r("contact")})}),e.jsxs("mesh",{position:[0,1.6,-5],children:[e.jsx("sphereGeometry",{args:[.16,10,8]}),e.jsx("meshStandardMaterial",{ref:pt,color:"#fde68a",emissive:"#fff3b0",emissiveIntensity:0})]})]}),e.jsx("group",{userData:{part:"spindle"},children:e.jsx(L,{r:2.6,h:.35,pos:[0,Q+.17,0],seg:40,children:e.jsx(A,{lit:r("spindle")})})}),e.jsxs("group",{ref:U,children:[e.jsxs("group",{userData:{part:"spindle"},children:[e.jsx(L,{r:1.5,r2:1.3,h:1.2,pos:[0,Q+.9,0],seg:32,children:e.jsx(A,{lit:r("spindle")})}),e.jsx(L,{r:.75,h:Te-Q,pos:[0,(Te+Q)/2,0],seg:24,children:e.jsx(A,{lit:r("spindle")})})]}),e.jsxs("group",{userData:{part:"contact"},rotation:[0,wt,0],children:[e.jsx(L,{r:1.2,h:1,pos:[0,Q+2,0],children:e.jsx(ie,{lit:r("contact")})}),e.jsx(z,{size:[.6,.5,3.2],pos:[0,Q+2.1,2.1],children:e.jsx(ie,{lit:r("contact")})}),e.jsxs("mesh",{position:[0,Q+2.1,3.9],rotation:[Math.PI/2,0,0],children:[e.jsx("coneGeometry",{args:[.32,.9,12]}),e.jsx(ie,{lit:r("contact")})]}),e.jsx(L,{r:.25,h:.7,pos:[.85,Q+2,0],rot:[0,0,Math.PI/2],children:e.jsx(A,{lit:r("contact")})})]}),e.jsxs("group",{userData:{part:"lift"},children:[e.jsx(L,{r:1,h:1.2,pos:[0,Te-.2,0],children:e.jsx(A,{lit:r("lift")})}),e.jsx(ze,{r:.85,h:1.8,pos:[0,Te+1.3,0],lit:r("lift")}),e.jsx(L,{r:.5,h:.5,pos:[0,Te+2.45,0],children:e.jsx(A,{lit:r("lift")})})]}),e.jsxs("group",{ref:E,position:[0,it+a.lift,0],children:[e.jsxs("group",{userData:{part:"drum"},children:[e.jsxs("mesh",{position:[0,ee/2,0],children:[e.jsx("cylinderGeometry",{args:[Pe,Pe,ee,96,1,!0]}),e.jsx("meshStandardMaterial",{color:r("drum")?He:"#16171a",metalness:.3,roughness:.6,side:Rt})]}),[.15,ee-.4].map(u=>e.jsxs("group",{position:[0,u,0],children:[e.jsx(z,{size:[Pe*2-.2,.5,.9],pos:[0,0,0],children:e.jsx(ie,{lit:r("drum")})}),e.jsx(z,{size:[.9,.5,Pe*2-.2],pos:[0,0,0],children:e.jsx(ie,{lit:r("drum")})}),e.jsx(L,{r:1.6,h:1,pos:[0,0,0],children:e.jsx(ie,{lit:r("drum")})})]},u)),e.jsx(L,{r:1.25,h:2,pos:[0,ee+.9,0],children:e.jsx(A,{lit:r("drum")})}),e.jsx(L,{r:.22,h:.8,pos:[0,ee+1.1,1.55],rot:[Math.PI/2,0,0],children:e.jsx(A,{lit:r("drum")})}),e.jsx(ze,{r:.5,h:.6,pos:[0,ee+1.1,2.2],rot:[Math.PI/2,0,0],lit:r("drum"),color:"#1d1f22"})]}),e.jsxs("mesh",{position:[0,ee/2,0],userData:{part:"paper"},children:[e.jsx("cylinderGeometry",{args:[ct,ct,ee,128,1,!0]}),e.jsx("meshStandardMaterial",{map:f,color:r("paper")?"#9ec5ff":"#ffffff",roughness:.85,metalness:0})]})]})]}),e.jsxs("group",{userData:{part:"stand"},children:[e.jsx(xr,{pos:[D.x+1.5,0,D.z-1],lit:r("stand")}),e.jsx(L,{r:.55,h:44,pos:[D.x,22.6,D.z],seg:20,children:e.jsx(A,{lit:r("stand")})}),e.jsx(z,{size:[2,2,2],pos:[D.x,rt,D.z],children:e.jsx(Oe,{lit:r("stand")})}),e.jsx(ze,{r:.5,h:1,pos:[D.x,rt,D.z+1.4],rot:[Math.PI/2,0,0],lit:r("stand"),color:"#1d1f22"}),e.jsx(L,{r:.4,h:D.x-F.x-.5,pos:[(D.x+F.x+.5)/2,rt,D.z],rot:[0,0,Math.PI/2],children:e.jsx(A,{lit:r("stand")})}),e.jsx(z,{size:[2,2,2],pos:[D.x,Ee,D.z],children:e.jsx(Oe,{lit:r("stand")})}),e.jsx(ze,{r:.5,h:1,pos:[D.x,Ee,D.z+1.4],rot:[Math.PI/2,0,0],lit:r("stand"),color:"#1d1f22"}),e.jsx(L,{r:.35,h:D.x-me-.8,pos:[(D.x+me+.8)/2,Ee,D.z],rot:[0,0,Math.PI/2],children:e.jsx(A,{lit:r("stand")})}),e.jsx(z,{size:[1.6,1.2,1.8],pos:[me,Ee,D.z],children:e.jsx(Oe,{lit:r("stand")})}),e.jsx(L,{r:.15,h:.8,pos:[me,Ee,D.z+1.25],rot:[Math.PI/2,0,0],children:e.jsx(A,{lit:r("stand")})}),e.jsx(ze,{r:.4,h:.5,pos:[me,Ee,D.z+1.8],rot:[Math.PI/2,0,0],lit:r("stand"),color:"#1d1f22"})]}),e.jsxs("group",{ref:w,position:[F.x,F.y,F.z],children:[e.jsxs("group",{userData:{part:"lever"},children:[e.jsx(z,{size:[1.1,1.9,.22],pos:[0,.25,-.75],children:e.jsx(Ne,{lit:r("lever")})}),e.jsx(z,{size:[1.1,1.9,.22],pos:[0,.25,.75],children:e.jsx(Ne,{lit:r("lever")})}),e.jsx(z,{size:[1.1,.5,1.72],pos:[0,rt-F.y,0],children:e.jsx(Ne,{lit:r("lever")})}),e.jsx(L,{r:.1,h:1.9,pos:[0,0,0],rot:[Math.PI/2,0,0],children:e.jsx(A,{lit:r("lever")})}),[-1,1].map(u=>e.jsx(L,{r:.2,h:.12,pos:[0,0,u*.92],rot:[Math.PI/2,0,0],seg:6,children:e.jsx(A,{lit:r("lever")})},u))]}),e.jsxs("group",{ref:x,children:[e.jsxs("group",{userData:{part:"lever"},children:[e.jsx(z,{size:[Re-.3,.5,.08],pos:[-(Re-.3)/2,0,0],children:e.jsx(Oe,{lit:r("lever")})}),e.jsx(z,{size:[Be+.6,.6,.12],pos:[(Be+.6)/2-.2,0,0],children:e.jsx(Oe,{lit:r("lever")})}),e.jsxs("mesh",{position:[Be,-.3,0],rotation:[Math.PI/2,0,0],children:[e.jsx("torusGeometry",{args:[.22,.05,8,16]}),e.jsx(A,{lit:r("lever")})]})]}),e.jsxs("group",{userData:{part:"stylus"},position:[-Re,0,0],children:[e.jsx(z,{size:[.9,.35,.04],pos:[.3,0,0],children:e.jsx(G,{lit:r("stylus"),color:"#e8dfc8",metal:0,rough:.6})}),e.jsx(z,{size:[.06,.12,.34],pos:[0,0,-.16],rot:[0,.35,0],children:e.jsx(G,{lit:r("stylus"),color:"#e8dfc8",metal:0,rough:.6})})]})]})]}),e.jsxs("mesh",{ref:Z,position:[me,zt+2,F.z],userData:{part:"muscle"},children:[e.jsx("cylinderGeometry",{args:[.03,.03,1,6]}),e.jsx("meshStandardMaterial",{color:"#f5f0e1",roughness:.9})]}),e.jsxs("group",{userData:{part:"muscle"},position:[me,Ut,F.z],children:[e.jsx(L,{r:.2,h:Ss+.8,pos:[0,-3.4000000000000004/2,0],seg:12,children:e.jsx(G,{lit:r("muscle"),color:"#efe7d6",metal:0,rough:.6})}),e.jsxs("mesh",{position:[0,-.05,0],scale:[1.25,.8,1],children:[e.jsx("sphereGeometry",{args:[.34,16,12]}),e.jsx(G,{lit:r("muscle"),color:"#efe7d6",metal:0,rough:.6})]}),e.jsxs("group",{ref:W,children:[e.jsx("mesh",{geometry:pr,children:e.jsx(G,{lit:r("muscle"),color:"#b4485a",metal:0,rough:.55})}),e.jsx(L,{r:.06,r2:.1,h:at-3.4,pos:[0,(at+3.4)/2,0],seg:8,children:e.jsx(G,{lit:r("muscle"),color:"#efe9df",metal:0,rough:.4})})]})]})]})},at=4.5,Ut=F.y-13,zt=Ut+at,me=F.x+Be,Ss=2.6,Ee=Ut-Ss,rt=F.y+1.35,D={x:26,z:F.z},pr=new Tt([[0,0],[.4,.04],[.82,.5],[.95,1.2],[.85,2],[.55,2.8],[.2,3.35],[.08,3.5]].map(([n,s])=>new Le(n,s)),28),fr=new Ct(new At([[-5.6,2.6,$+1.3],[-5.6,2.4,$+2.4],[-5.8,1.1,$+3.3],[-6.4,.3,$+4.6],[-9,.3,$+6.4],[-14,.3,$+7.2],[-20,.3,$+7.6]].map(([n,s,i])=>new I(n,s,i))),80,.28,10,!1),xr=({pos:n,lit:s})=>{const i=p.useMemo(()=>{const t=new ms,r=7;[Math.PI/2,Math.PI/2+2*Math.PI/3,Math.PI/2+4*Math.PI/3].forEach((o,l)=>{const h=Math.cos(o)*r,c=Math.sin(o)*r;l===0?t.moveTo(h,c):t.lineTo(h,c)}),t.closePath();const a=new xs(t,{depth:1.3,bevelEnabled:!0,bevelSize:.5,bevelThickness:.3,bevelSegments:3});return a.rotateX(-Math.PI/2),a},[]);return e.jsx("group",{position:n,rotation:[0,.3,0],children:e.jsx("mesh",{geometry:i,position:[0,.3,0],children:e.jsx(G,{lit:s,color:"#1f2a3a",metal:.4,rough:.5})})})},mr=n=>{const s=or/n;return s<60?`${s.toFixed(s<10?2:1)} s`:s<3600?`${Math.round(s/60)} min`:`${(s/3600).toFixed(1)} h`},jr=({kymo:n})=>{const{state:s,set:i,stimulate:t,newPaper:r}=n,a=l=>`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${l?"bg-amber-500/20 border-amber-400 text-amber-100":"bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"}`,o=Ms(s)?`one turn: ${mr(lt[s.speed])}`:s.on?"drum not driven":"motor off";return e.jsxs("section",{className:"space-y-4",children:[e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{onClick:()=>i({on:!s.on}),className:`flex-1 ${a(s.on)}`,children:s.on?"Motor ON":"Motor OFF"}),e.jsx("button",{onClick:()=>i({clutch:!s.clutch}),className:`flex-1 ${a(s.clutch)}`,children:s.clutch?"Clutch engaged":"Clutch disengaged"})]}),e.jsxs("div",{children:[e.jsxs("div",{className:"flex justify-between text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-2",children:[e.jsx("span",{children:"Speed lever (mm/s)"}),e.jsx("span",{className:"normal-case tracking-normal text-slate-400 font-semibold",children:o})]}),e.jsx("div",{className:"grid grid-cols-3 gap-1.5",children:[...lt.map(String),"N"].map((l,h)=>e.jsx("button",{onClick:()=>i({speed:h}),className:a(s.speed===h),children:l==="N"?"N (neutral)":l},l))})]}),e.jsxs("label",{className:"block",children:[e.jsxs("span",{className:"flex justify-between text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-1",children:[e.jsx("span",{children:"Drum height (screw lift)"}),e.jsxs("span",{className:"normal-case tracking-normal text-slate-400 font-semibold",children:[s.lift.toFixed(1)," cm"]})]}),e.jsx("input",{type:"range",min:0,max:vs,step:.1,value:s.lift,onChange:l=>i({lift:+l.target.value}),className:"w-full accent-amber-400","aria-label":"Drum height"})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{onClick:t,className:"flex-1 px-3 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-bold",children:"Stimulate"}),e.jsx("button",{onClick:()=>i({contactStim:!s.contactStim}),className:`flex-1 ${a(s.contactStim)}`,children:s.contactStim?"Contact stimulates every turn":"Stimulate from contact"})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{onClick:()=>i({leverOn:!s.leverOn}),className:`flex-1 ${a(s.leverOn)}`,children:s.leverOn?"Lever on drum":"Lever off drum"}),e.jsx("button",{onClick:r,className:"flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 text-xs font-semibold",children:"Fresh smoked paper"})]})]})},O="#3b82f6",Me=n=>n?{emissive:O,emissiveIntensity:.55}:{},M=({lit:n})=>e.jsx("meshStandardMaterial",{color:n?O:"#c9ced3",metalness:.9,roughness:.28,...Me(n)}),X=({lit:n})=>e.jsx("meshStandardMaterial",{color:n?O:"#b8923a",metalness:.85,roughness:.35,...Me(n)}),Y=({lit:n,color:s="#f4f5f6"})=>e.jsx("meshStandardMaterial",{color:n?O:s,roughness:.55,...Me(n)}),K=({lit:n})=>e.jsx("meshStandardMaterial",{color:n?O:"#a8405f",roughness:.8,...Me(n)}),ue=({lit:n})=>e.jsx("meshStandardMaterial",{color:n?O:"#1c1d20",roughness:.6,...Me(n)}),P=({lit:n,opacity:s=.3})=>e.jsx("meshPhysicalMaterial",{color:n?O:"#eef6fa",transparent:!0,opacity:n?.6:s,roughness:.05,clearcoat:1,envMapIntensity:1.5,depthWrite:!1,side:Rt,...Me(n)}),y=({a:n,b:s,r:i,children:t,seg:r=14})=>{const{pos:a,quat:o,len:l}=p.useMemo(()=>{const h=new I(...n),c=new I(...s),d=c.clone().sub(h);return{pos:h.clone().add(c).multiplyScalar(.5),quat:new Us().setFromUnitVectors(new I(0,1,0),d.clone().normalize()),len:d.length()}},[n,s]);return e.jsxs("mesh",{position:a,quaternion:o,children:[e.jsx("cylinderGeometry",{args:[i,i,l,r,1]}),t]})},C=({pts:n,r:s,children:i,seg:t=48})=>{const r=p.useMemo(()=>new Ct(new At(n.map(a=>new I(...a)),!1,"catmullrom",.5),t,s,10,!1),[n,s,t]);return e.jsx("mesh",{geometry:r,children:i})},m=({at:n,size:s,children:i,rot:t})=>e.jsxs("mesh",{position:n,rotation:t,children:[e.jsx("boxGeometry",{args:s}),i]}),J=({at:n,size:s,children:i,color:t="#111827",bold:r,rot:a})=>e.jsx(q,{font:r?le:Ot,position:n,rotation:a,fontSize:s,color:t,anchorX:"center",anchorY:"middle",children:i}),gr=n=>{for(let s=n;s;s=s.parent)if(s.userData.part)return s.userData;return null},as=n=>{var i;const s=n.intersections.map(t=>gr(t.object)).filter(t=>!!t);return((i=s.find(t=>!t.glass)??s[0])==null?void 0:i.part)??null},j={x:11,z:9,y0:38,y1:60},br=11,T=-4,pe=1.8,je=5,ge=1,g=[-1,23.5,7],_=7,yr=(()=>{let n=null;return()=>n??(n=new Tt([[0,0],[4.8,0],[5,.4],[5,10.5],[4.4,12.2],[2.2,14.2],[1.8,14.8],[1.8,16.6],[2.3,17],[2.3,17.4],[1.7,17.4]].map(([s,i])=>new Le(s,i)),40))})(),vr=(()=>{const n=[];for(let s=0;s<=140;s++){const i=s/140,t=i*Math.PI*2*7;n.push([-2.6+i*5.2,45.5+Math.sin(t)*1.8,-4+Math.cos(t)*1.8])}return n})(),Mr=({active:n,onHover:s,onSelect:i})=>{const t=o=>n===o,r=p.useMemo(yr,[]),a=[-1,1];return e.jsxs("group",{onPointerMove:o=>{o.stopPropagation(),s(as(o))},onPointerOut:()=>s(null),onClick:o=>{o.stopPropagation();const l=as(o);l&&i(l)},children:[e.jsxs("group",{userData:{part:"stand"},children:[e.jsx(m,{at:[0,-1,2],size:[46,2,32],children:e.jsx(Y,{lit:t("stand")})}),a.map(o=>e.jsxs(se.Fragment,{children:[e.jsx(y,{a:[o*17,0,T],b:[o*17,112,T],r:.6,children:e.jsx(M,{lit:t("stand")})}),e.jsxs("mesh",{position:[o*17,2.2,T],children:[e.jsx("cylinderGeometry",{args:[1.1,1.8,4.4,20]}),e.jsx(Y,{lit:t("stand")})]}),e.jsx(y,{a:[o*17,0,6],b:[o*17,o<0?35:30,6],r:.55,children:e.jsx(M,{lit:t("stand")})}),e.jsxs("mesh",{position:[o*17,2.2,6],children:[e.jsx("cylinderGeometry",{args:[1.1,1.8,4.4,20]}),e.jsx(Y,{lit:t("stand")})]})]},o)),a.map(o=>a.map(l=>e.jsxs(se.Fragment,{children:[e.jsx(y,{a:[o*j.x,0,l*j.z],b:[o*j.x,27,l*j.z],r:.7,children:e.jsx(M,{lit:t("stand")})}),e.jsx(m,{at:[o*(j.x+.6),44.5,l*(j.z+.6)],size:[2,35,2],children:e.jsx(Y,{lit:t("stand")})})]},`${o}${l}`))),a.map(o=>e.jsxs(se.Fragment,{children:[e.jsx(m,{at:[0,37.3,o*(j.z+.6)],size:[2*j.x+1.2,1.4,2],children:e.jsx(Y,{lit:t("stand")})}),e.jsx(m,{at:[o*(j.x+.6),37.3,0],size:[2,1.4,2*j.z+1.2],children:e.jsx(Y,{lit:t("stand")})}),e.jsx(m,{at:[0,61,o*(j.z+.9)],size:[2*j.x+3.4,2,.9],children:e.jsx(M,{lit:t("stand")})}),e.jsx(m,{at:[o*(j.x+1.25),61,0],size:[.9,2,2*j.z+1.8],children:e.jsx(M,{lit:t("stand")})})]},o)),e.jsx(m,{at:[0,61,j.z+1.4],size:[13,1.5,.08],children:e.jsx("meshBasicMaterial",{color:"#ffffff"})}),e.jsx(J,{at:[0,61,j.z+1.46],size:.82,bold:!0,children:"LANGENDORFF APPARATUS"}),e.jsx(y,{a:[-18.5,23.4,6],b:[18.5,23.4,6],r:.45,children:e.jsx(M,{lit:t("stand")})}),e.jsx(y,{a:[-23,13,6],b:[-2.5,13,6],r:.45,children:e.jsx(M,{lit:t("stand")})}),e.jsx(y,{a:[4,13,6],b:[25,13,6],r:.45,children:e.jsx(M,{lit:t("stand")})}),[[-17,23.4],[17,23.4],[-17,13],[17,13]].map(([o,l])=>e.jsx(m,{at:[o,l,6],size:[1.9,1.9,1.9],children:e.jsx(M,{lit:t("stand")})},`${o}${l}`))]}),e.jsx("group",{userData:{part:"reservoirs"},children:a.map(o=>e.jsxs("group",{position:[o*br,102,T],children:[e.jsxs("group",{userData:{part:"reservoirs",glass:!0},children:[e.jsx("mesh",{geometry:r,children:e.jsx(P,{lit:t("reservoirs"),opacity:.28})}),e.jsx(y,{a:[-o*4.8,1.7,0],b:[-o*6.6,1.7,0],r:1.05,children:e.jsx(P,{lit:t("reservoirs")})})]}),e.jsxs("mesh",{position:[-o*6.9,1.7,0],rotation:[0,0,Math.PI/2],children:[e.jsx("cylinderGeometry",{args:[.95,.75,1.5,18]}),e.jsx("meshStandardMaterial",{color:t("reservoirs")?O:"#c0392b",roughness:.7})]}),e.jsxs("mesh",{position:[0,-.3,0],children:[e.jsx("cylinderGeometry",{args:[5.7,5.7,.4,36]}),e.jsx(Y,{lit:t("reservoirs")})]}),e.jsx(m,{at:[o*5.6,-.3,0],size:[2.4,1.4,2.2],children:e.jsx(Y,{lit:t("reservoirs")})}),[0,1,2].map(l=>{const h=l===0?Math.PI/2:l===1?-Math.PI/2:o>0?0:Math.PI;return e.jsx(m,{at:[Math.cos(h)*5.25,6,Math.sin(h)*5.25],size:[.25,12.5,1.6],rot:[0,-h,0],children:e.jsx(Y,{lit:t("reservoirs")})},l)})]},o))}),e.jsx("group",{userData:{part:"head-tubes"},children:a.map(o=>e.jsxs(se.Fragment,{children:[e.jsxs("group",{userData:{part:"head-tubes",glass:!0},children:[e.jsxs("mesh",{position:[o*pe,102,T],children:[e.jsx("cylinderGeometry",{args:[.9,.9,22,20,1,!0]}),e.jsx(P,{lit:t("head-tubes")})]}),e.jsxs("mesh",{position:[o*pe,90.2,T],children:[e.jsx("cylinderGeometry",{args:[.9,.35,1.6,20,1,!0]}),e.jsx(P,{lit:t("head-tubes")})]}),e.jsx(y,{a:[o*pe,86.5,T],b:[o*pe,89.4,T],r:.35,children:e.jsx(P,{lit:t("head-tubes")})}),e.jsx(y,{a:[o*(pe+.8),103.7,T],b:[o*4.4,103.7,T],r:.3,children:e.jsx(P,{lit:t("head-tubes")})}),e.jsx(y,{a:[o*pe,97,T],b:[-o*1.6,121-(o>0?2:0),T+o*.6],r:.22,children:e.jsx(P,{lit:t("head-tubes"),opacity:.45})})]}),e.jsx(y,{a:[o*6.5,93,T],b:[o*6.5,101.5,T],r:.35,children:e.jsx(M,{lit:t("head-tubes")})}),e.jsx(y,{a:[o*7.6,95.5,T],b:[o*3.6,95.5,T],r:.3,children:e.jsx(M,{lit:t("head-tubes")})}),e.jsx(m,{at:[o*2.3,95.5,T],size:[2.6,1.3,.25],children:e.jsx(M,{lit:t("head-tubes")})}),e.jsx(m,{at:[o*6.5,95.5,T],size:[.9,.9,.9],children:e.jsx(X,{lit:t("head-tubes")})})]},o))}),e.jsxs("group",{userData:{part:"y-piece"},children:[e.jsxs("group",{userData:{part:"y-piece",glass:!0},children:[e.jsx(y,{a:[1.5,73.5,-1],b:[1.5,77,-1],r:.38,children:e.jsx(P,{lit:t("y-piece"),opacity:.4})}),e.jsx(y,{a:[1.5,77,-1],b:[.1,81,-1.4],r:.36,children:e.jsx(P,{lit:t("y-piece"),opacity:.4})}),e.jsx(y,{a:[1.5,77,-1],b:[2.9,81,-1.4],r:.36,children:e.jsx(P,{lit:t("y-piece"),opacity:.4})})]}),e.jsx(C,{pts:[[-pe,87.2,T],[-1.9,84.5,-3],[.1,80.4,-1.4]],r:.5,children:e.jsx(K,{lit:t("y-piece")})}),e.jsx(C,{pts:[[pe,87.2,T],[2.6,84.5,-3],[2.9,80.4,-1.4]],r:.5,children:e.jsx(K,{lit:t("y-piece")})}),e.jsx(C,{pts:[[1.5,74.2,-1],[2.2,69,-.6],[4.6,62,1.2],[5.7,56,1.5],[5.6,46,1.4]],r:.5,children:e.jsx(K,{lit:t("y-piece")})})]}),e.jsxs("group",{userData:{part:"bath",glass:!0},children:[a.map(o=>e.jsxs(se.Fragment,{children:[e.jsxs(m,{at:[0,(j.y0+j.y1)/2,o*j.z],size:[2*j.x,j.y1-j.y0,.4],children:[e.jsx(P,{lit:t("bath"),opacity:.14}),e.jsx(_t,{color:t("bath")?O:"#9fb0c2"})]}),e.jsxs(m,{at:[o*j.x,(j.y0+j.y1)/2,0],size:[.4,j.y1-j.y0,2*j.z],children:[e.jsx(P,{lit:t("bath"),opacity:.14}),e.jsx(_t,{color:t("bath")?O:"#9fb0c2"})]})]},o)),e.jsx(m,{at:[0,j.y0+.2,0],size:[2*j.x,.4,2*j.z],children:e.jsx(P,{lit:t("bath"),opacity:.22})})]}),e.jsxs("group",{userData:{part:"inner-tubes"},children:[a.map(o=>e.jsxs(se.Fragment,{children:[e.jsxs("group",{userData:{part:"inner-tubes",glass:!0},children:[e.jsxs("mesh",{position:[o*je,48.5,ge],children:[e.jsx("cylinderGeometry",{args:[1.7,1.7,13,22,1,!0]}),e.jsx(P,{lit:t("inner-tubes"),opacity:.35})]}),e.jsxs("mesh",{position:[o*je,41.3,ge],children:[e.jsx("cylinderGeometry",{args:[1.7,.45,1.4,22,1,!0]}),e.jsx(P,{lit:t("inner-tubes"),opacity:.35})]}),e.jsx(y,{a:[o*je,39.4,ge],b:[o*je,40.7,ge],r:.45,children:e.jsx(P,{lit:t("inner-tubes")})}),e.jsx(C,{pts:[[o*10.5,66.5,.4],[o*6,66.5,.4],[o*4.5,65.6,.5],[o*4.3,62,.6],[o*4.3,44,.6]],r:.33,children:e.jsx(P,{lit:t("inner-tubes"),opacity:.45})})]}),e.jsxs("mesh",{position:[o*je,39,ge],children:[e.jsx("cylinderGeometry",{args:[.9,1.15,1.2,18]}),e.jsx(K,{lit:t("inner-tubes")})]}),e.jsx(m,{at:[o*(j.x+1.25),62.6,.4],size:[1.4,1.2,1.4],children:e.jsx(M,{lit:t("inner-tubes")})}),e.jsx(y,{a:[o*(j.x+1.25),63,.4],b:[o*(j.x+1.25),69,.4],r:.45,children:e.jsx(M,{lit:t("inner-tubes")})}),e.jsx(m,{at:[o*10.4,66.5,.4],size:[2.6,1.1,.3],children:e.jsx(M,{lit:t("inner-tubes")})})]},o)),e.jsx(C,{pts:[[-je,38.4,ge],[-5.4,30,.4],[-6,16,-1],[-5,7,-2.5]],r:.45,children:e.jsx(K,{lit:t("inner-tubes")})}),e.jsx(m,{at:[-5.3,9,-2.2],size:[1.6,.5,.7],children:e.jsx(M,{lit:t("inner-tubes")})})]}),e.jsxs("group",{userData:{part:"coil"},children:[e.jsx("group",{userData:{part:"coil",glass:!0},children:e.jsx(C,{pts:vr,r:.33,seg:420,children:e.jsx(P,{lit:t("coil"),opacity:.5})})}),e.jsx(C,{pts:[[je-.7,40.3,ge-.4],[4.2,40.6,-1.5],[3.3,43,-3.2],[2.6,45.5,-2.2]],r:.42,children:e.jsx(K,{lit:t("coil")})}),e.jsx(C,{pts:[[-2.6,45.5,-2.2],[-3,42,-2.4],[-1.6,39.8,.6],[0,38.6,3]],r:.42,children:e.jsx(K,{lit:t("coil")})}),e.jsxs("mesh",{position:[0,38.3,3],children:[e.jsx("cylinderGeometry",{args:[.85,1,1,18]}),e.jsx(K,{lit:t("coil")})]})]}),e.jsxs("group",{userData:{part:"heater"},children:[e.jsx(C,{pts:[[2.2,43.2,9.4],[2.2,43.2,2.2],[2.5,43.2,1.2],[3.3,43.2,.8],[4.1,43.2,1.2],[4.4,43.2,2.2],[4.4,43.2,9.4]],r:.42,children:e.jsx(M,{lit:t("heater")})}),e.jsxs("mesh",{position:[3.3,43.2,11.2],rotation:[Math.PI/2,0,0],children:[e.jsx("cylinderGeometry",{args:[2,2.1,3.6,24]}),e.jsx(ue,{lit:t("heater")})]}),e.jsx(C,{pts:[[3.3,43.2,13],[4,41.5,14.5],[6.5,37.5,14.2],[8,36.2,13]],r:.3,children:e.jsx(ue,{lit:t("heater")})})]}),e.jsxs("group",{userData:{part:"stirrer"},children:[e.jsx(m,{at:[-9,49,-2.5],size:[2.8,4.2,3.4],children:e.jsx(ue,{lit:t("stirrer")})}),e.jsx(y,{a:[-7.6,47.6,-2.5],b:[-6.2,47.6,-2.5],r:.45,children:e.jsx(ue,{lit:t("stirrer")})}),e.jsx(C,{pts:[[-9,51,-2.5],[-10.4,58,-3],[-12.2,62.6,-1],[-13.2,58,4],[-13,44,8.5],[-9,34,9.2],[-5,31.5,10]],r:.28,children:e.jsx(ue,{lit:t("stirrer")})})]}),e.jsxs("group",{userData:{part:"probe"},children:[e.jsx(y,{a:[-9.6,43.5,4],b:[-9.6,62.5,4],r:.28,children:e.jsx(M,{lit:t("probe")})}),e.jsx(m,{at:[-9.6,50.5,4],size:[2.6,.5,1.4],children:e.jsx("meshStandardMaterial",{color:t("probe")?O:"#d9dde2",transparent:!0,opacity:.7})}),e.jsx(C,{pts:[[-9.6,62.5,4],[-11.6,63.4,5],[-13.4,56,7],[-12.6,42,9.4],[-8,32,9.6],[-5,29.5,10]],r:.24,children:e.jsx("meshStandardMaterial",{color:t("probe")?O:"#6b7280",roughness:.7})})]}),e.jsxs("group",{userData:{part:"control"},position:[3,31,12],children:[e.jsx(m,{at:[0,0,0],size:[16,10.5,8],children:e.jsx(Y,{lit:t("control")})}),e.jsx(m,{at:[0,0,4.03],size:[15.4,9.9,.06],children:e.jsx("meshStandardMaterial",{color:t("control")?O:"#a9aeb4",roughness:.5,metalness:.3})}),[-5.2,5.2].map(o=>e.jsxs(se.Fragment,{children:[e.jsxs("mesh",{position:[o*.75,3.6,4.3],children:[e.jsx("sphereGeometry",{args:[.62,18,12]}),e.jsx("meshStandardMaterial",{color:"#d92626",emissive:"#7a0c0c",emissiveIntensity:.6,roughness:.3})]}),e.jsx(m,{at:[o,-.4,4.25],size:[2.6,4.6,.4],children:e.jsx(Y,{lit:!1,color:"#fafafa"})}),e.jsx(m,{at:[o,-.4,4.5],size:[1.5,2.8,.25],rot:[.12,0,0],children:e.jsx(Y,{lit:!1,color:"#ffffff"})}),e.jsx(J,{at:[o,-3.5,4.1],size:.5,color:"#9b1c1c",bold:!0,children:"ON"})]},o)),e.jsx(J,{at:[-5.2,2.5,4.1],size:.5,color:"#9b1c1c",bold:!0,children:"MAIN"}),e.jsx(J,{at:[5.2,2.8,4.1],size:.46,color:"#9b1c1c",bold:!0,children:`HEATER
STIRRER`}),e.jsx(J,{at:[0,3.1,4.1],size:.62,color:"#9b1c1c",bold:!0,children:"TWO UNIT BATH"}),e.jsx(J,{at:[0,-3.9,4.1],size:.5,color:"#9b1c1c",bold:!0,children:"DIGITAL PID CONTROL"}),e.jsx(m,{at:[0,-.4,4.3],size:[5.2,5.2,.6],children:e.jsx(ue,{lit:!1})}),e.jsx(J,{at:[.3,.9,4.62],size:1.05,color:"#ff3b30",bold:!0,children:"37.0"}),e.jsx(J,{at:[.3,-.5,4.62],size:.85,color:"#35d07f",bold:!0,children:"37.0"}),e.jsx(J,{at:[-2,.9,4.62],size:.34,color:"#d1d5db",children:"PV"}),e.jsx(J,{at:[-2,-.5,4.62],size:.34,color:"#d1d5db",children:"SV"}),e.jsx(m,{at:[0,-2.1,4.62],size:[4.4,.9,.05],children:e.jsx("meshStandardMaterial",{color:"#cfd3d8"})})]}),e.jsxs("group",{userData:{part:"cannula"},children:[e.jsx(C,{pts:[[0,37.8,3],[0,33,3.6],[-.7,29,6.2],[g[0],27,g[2]]],r:.45,children:e.jsx(K,{lit:t("cannula")})}),e.jsxs("group",{userData:{part:"cannula",glass:!0},children:[e.jsx(y,{a:[g[0],24.4,g[2]],b:[g[0],27.6,g[2]],r:.36,children:e.jsx(P,{lit:t("cannula"),opacity:.45})}),e.jsxs("mesh",{position:g,scale:[1,1.15,1],children:[e.jsx("sphereGeometry",{args:[1.35,24,18]}),e.jsx(P,{lit:t("cannula"),opacity:.4})]}),e.jsxs("mesh",{position:[g[0],21.2,g[2]],children:[e.jsx("cylinderGeometry",{args:[.5,.16,2.2,16,1,!0]}),e.jsx(P,{lit:t("cannula"),opacity:.5})]}),e.jsx(y,{a:[g[0]-.2,26,g[2]],b:[g[0]-2.2,27.2,g[2]],r:.3,children:e.jsx(P,{lit:t("cannula"),opacity:.45})}),e.jsx(y,{a:[g[0]+.9,23.4,g[2]],b:[g[0]+3.6,22.7,g[2]],r:.62,children:e.jsx(P,{lit:t("cannula"),opacity:.4})})]}),e.jsx(m,{at:[g[0]+1.1,23.6,g[2]-.6],size:[1.3,1.9,1.1],children:e.jsx(M,{lit:t("cannula")})}),e.jsxs("mesh",{position:[g[0]+1.1,24.9,g[2]-.4],children:[e.jsx("cylinderGeometry",{args:[.55,.55,.5,14]}),e.jsx(M,{lit:t("cannula")})]}),e.jsx(C,{pts:[[g[0],18.6,_],[g[0]+.25,18.1,_],[g[0],17.6,_],[g[0]-.25,18.1,_],[g[0],18.5,_]],r:.06,seg:24,children:e.jsx(M,{lit:t("cannula")})})]}),e.jsxs("group",{userData:{part:"thermometer"},children:[e.jsxs("mesh",{position:[g[0]+3.8,22.65,g[2]],rotation:[0,0,Math.PI/2-.25],children:[e.jsx("cylinderGeometry",{args:[.7,.55,1.1,16]}),e.jsx(K,{lit:t("thermometer")})]}),e.jsx(y,{a:[g[0]+1.6,23.2,g[2]],b:[g[0]+13,20.3,g[2]],r:.2,children:e.jsx("meshStandardMaterial",{color:t("thermometer")?O:"#f2d43d",roughness:.25,...Me(t("thermometer"))})})]}),e.jsxs("group",{userData:{part:"manometer"},children:[e.jsx(m,{at:[-21.2,23,6.6],size:[7,21,.3],children:e.jsx(M,{lit:t("manometer")})}),a.map(o=>e.jsx(m,{at:[-21.2+o*3.5,23,7.1],size:[.3,21,1.3],children:e.jsx(M,{lit:t("manometer")})},o)),e.jsx(m,{at:[-21.2,22.5,6.85],size:[2.5,11.5,.2],children:e.jsx("meshStandardMaterial",{color:"#ffffff",roughness:.4})}),[0,2,4,6,8,10,12,14,16].map(o=>e.jsxs(se.Fragment,{children:[e.jsx(m,{at:[-21.9,17.6+o*.62,6.97],size:[.9,.05,.02],children:e.jsx("meshBasicMaterial",{color:"#111827"})}),e.jsx(J,{at:[-20.7,17.6+o*.62,6.98],size:.48,children:String(o)})]},o)),e.jsxs("group",{userData:{part:"manometer",glass:!0},children:[e.jsx(C,{pts:[[-23,32.5,7.4],[-23,15.5,7.4],[-22.6,14.4,7.4],[-21.2,14,7.4],[-19.8,14.4,7.4],[-19.4,15.5,7.4],[-19.4,30.6,7.4],[-19,31.6,7.4],[-17.6,31.8,7.4]],r:.34,seg:90,children:e.jsx(P,{lit:t("manometer"),opacity:.4})}),e.jsx(y,{a:[-19.4,28,7.4],b:[-17.6,28,7.4],r:.3,children:e.jsx(P,{lit:t("manometer"),opacity:.4})})]}),e.jsx(C,{pts:[[-23,18,7.4],[-23,15.5,7.4],[-22.6,14.4,7.4],[-21.2,14,7.4],[-19.8,14.4,7.4],[-19.4,15.5,7.4],[-19.4,18,7.4]],r:.2,seg:50,children:e.jsx("meshStandardMaterial",{color:"#9aa1a8",metalness:1,roughness:.15})}),e.jsx(m,{at:[-17.6,27,6.4],size:[1.9,1.9,1.5],children:e.jsx(M,{lit:t("manometer")})}),e.jsx(C,{pts:[[-17.9,31.8,7.4],[-13,32.4,8],[-7,29.6,8],[g[0]-2,27.1,g[2]]],r:.45,children:e.jsx(K,{lit:t("manometer")})}),e.jsx(C,{pts:[[-17.9,28,7.4],[-13.5,27.6,9],[-10,18,12],[-8,5,14.5],[-5,.6,16.4],[2,.5,17]],r:.45,children:e.jsx(K,{lit:t("manometer")})})]}),e.jsxs("group",{userData:{part:"pulleys"},children:[[g[0]+1.1,23.6].map(o=>e.jsxs(se.Fragment,{children:[e.jsx(m,{at:[o,11.6,6.3],size:[.9,3,.9],children:e.jsx(X,{lit:t("pulleys")})}),e.jsxs("mesh",{position:[o,13.6,6.3],children:[e.jsx("cylinderGeometry",{args:[.5,.5,.9,14]}),e.jsx(ue,{lit:t("pulleys")})]}),e.jsxs("mesh",{position:[o,10.4,_],rotation:[Math.PI/2,0,0],children:[e.jsx("cylinderGeometry",{args:[1.1,1.1,.25,28]}),e.jsx("meshStandardMaterial",{color:t("pulleys")?O:"#e8edf2",transparent:!0,opacity:.75,roughness:.2})]})]},o)),e.jsx(y,{a:[g[0],17.6,_],b:[g[0],10.4,_],r:.05,seg:6,children:e.jsx("meshBasicMaterial",{color:t("pulleys")?O:"#f8fafc"})}),e.jsx(y,{a:[g[0]+1.1,9.3,_],b:[23.6,9.3,_],r:.05,seg:6,children:e.jsx("meshBasicMaterial",{color:t("pulleys")?O:"#f8fafc"})}),e.jsx(y,{a:[24.7,10.4,_],b:[24.7,20.6,_],r:.05,seg:6,children:e.jsx("meshBasicMaterial",{color:t("pulleys")?O:"#f8fafc"})})]}),e.jsxs("group",{userData:{part:"lever"},children:[e.jsx(y,{a:[20,13,6],b:[20,27,6],r:.4,children:e.jsx(M,{lit:t("lever")})}),e.jsx(m,{at:[20.6,21,_],size:[4.6,.9,.9],children:e.jsx(X,{lit:t("lever")})}),e.jsxs("mesh",{position:[18,21,_],rotation:[0,0,Math.PI/2],children:[e.jsx("cylinderGeometry",{args:[.45,.45,.9,12]}),e.jsx(X,{lit:t("lever")})]}),e.jsx(m,{at:[25.6,20.95,_],size:[5.6,.75,.16],children:e.jsx(X,{lit:t("lever")})}),[0,1,2,3,4,5,6].map(o=>e.jsx(m,{at:[23.3+o*.7,21.4,_],size:[.35,.25,.16],children:e.jsx(X,{lit:t("lever")})},o)),e.jsx(y,{a:[28.4,20.95,_],b:[38,21.6,_],r:.08,seg:6,children:e.jsx(M,{lit:t("lever")})}),e.jsx(m,{at:[38.4,21.65,_],size:[1.3,.7,.03],rot:[0,0,.3],children:e.jsx("meshStandardMaterial",{color:t("lever")?O:"#f1f5f9",transparent:!0,opacity:.85})}),e.jsx(y,{a:[21,21.4,_],b:[21,25.4,_],r:.22,children:e.jsx(X,{lit:t("lever")})}),e.jsx(y,{a:[19.6,24.4,_],b:[24.2,24.4,_],r:.22,children:e.jsx(X,{lit:t("lever")})}),e.jsxs("mesh",{position:[19.4,24.4,_],rotation:[0,0,Math.PI/2],children:[e.jsx("cylinderGeometry",{args:[.42,.42,.8,12]}),e.jsx(X,{lit:t("lever")})]}),e.jsx(C,{pts:Array.from({length:41},(o,l)=>[24.2+Math.sin(l*1.6)*.3,24.2-l*.07,_+Math.cos(l*1.6)*.3]),r:.035,seg:120,children:e.jsx(M,{lit:t("lever")})})]}),e.jsx("group",{userData:{part:"holders"},children:a.map(o=>e.jsxs(se.Fragment,{children:[e.jsx(m,{at:[o*(j.x+1.25),62.6,-4],size:[1.4,1.2,1.4],children:e.jsx(M,{lit:t("holders")})}),e.jsx(y,{a:[o*(j.x+1.25),63,-4],b:[o*(j.x+1.25),71,-4],r:.45,children:e.jsx(M,{lit:t("holders")})}),e.jsx(m,{at:[o*(j.x+1.25),69,-4],size:[1.5,1.5,1.5],children:e.jsx(X,{lit:t("holders")})}),e.jsx(y,{a:[o*16.5,69,-4],b:[o*7,69,-4],r:.34,children:e.jsx(X,{lit:t("holders")})}),e.jsx(m,{at:[o*6.8,69.2,-4],size:[1.3,1.1,1.1],children:e.jsx(X,{lit:t("holders")})}),e.jsxs("mesh",{position:[o*(j.x+1.25),69,-2.9],rotation:[Math.PI/2,0,0],children:[e.jsx("cylinderGeometry",{args:[.45,.45,.6,12]}),e.jsx(ue,{lit:t("holders")})]}),e.jsx(C,{pts:[[o*6.8,69.6,-4],[o*6.2,77.5,-4],[o*5.6,78,-4],[o*5,77.5,-4],[o*4.4,71.5,-4],[o*3.8,71.3,-4]],r:.07,seg:40,children:e.jsx(M,{lit:t("holders")})}),e.jsx(y,{a:[o*6.2,77.6,-4],b:[o*7.4,48,-3.4],r:.07,seg:6,children:e.jsx(M,{lit:t("holders")})})]},o))})]})},Sr=({id:n,kymo:s,...i})=>{switch(n){case"rbc-pipette":return e.jsx(ts,{kind:"rbc",...i});case"wbc-pipette":return e.jsx(ts,{kind:"wbc",...i});case"neubauer-chamber":return e.jsx(rr,{...i});case"kymograph":return e.jsx(ur,{kymo:s,...i});case"langendorff":return e.jsx(Mr,{...i})}},ls={"rbc-pipette":{all:{center:[.25,-1,0],halfW:5.9,halfH:1.6,from:[.2,.3,1]}},"wbc-pipette":{all:{center:[.25,-1,0],halfW:5.7,halfH:1.6,from:[.2,.3,1]}},"neubauer-chamber":{all:{center:[0,-1,0],halfW:44,halfH:21,from:[.15,1.3,.9]},closeUp:{grid:{center:[0,-.1,7.6],halfW:1.7,halfH:1.7,from:[0,1,.3]}}},kymograph:{all:{center:[7,25,3],halfW:21,halfH:26,from:[.4,.3,1]},closeUp:{paper:{center:[0,34.5,7.5],halfW:9,halfH:8,from:[.15,.1,1]},stylus:{center:[1,34.5,7.5],halfW:4,halfH:3.5,from:[.5,.25,1]},speed:{center:[0,14,9.5],halfW:4,halfH:5.6,from:[.05,.08,1]},clutch:{center:[9.5,13,0],halfW:4,halfH:4,from:[1,.12,.1]},contact:{center:[-5.2,22.6,-5.2],halfW:6,halfH:4.5,from:[-.75,.45,-.75]}}},langendorff:{all:{center:[2,59,0],halfW:34,halfH:64,from:[.35,.12,1]},closeUp:{reservoirs:{center:[0,108,-4],halfW:19,halfH:13,from:[.1,.1,1]},"head-tubes":{center:[0,103,-4],halfW:10,halfH:19,from:[.15,.05,1]},"y-piece":{center:[2,76,-1],halfW:9,halfH:14,from:[.2,.1,1]},bath:{center:[0,50,0],halfW:17,halfH:15,from:[.4,.35,1]},"inner-tubes":{center:[0,52,1],halfW:15,halfH:17,from:[.2,.5,1]},coil:{center:[0,44,-3],halfW:8,halfH:7,from:[.3,.8,1]},heater:{center:[3,43,6],halfW:9,halfH:7,from:[.5,.7,1]},stirrer:{center:[-8,50,-2],halfW:8,halfH:8,from:[-.5,.4,1]},probe:{center:[-9.6,53,4],halfW:7,halfH:12,from:[-.5,.3,1]},control:{center:[3,31,16],halfW:10,halfH:7,from:[.05,.05,1]},cannula:{center:[1,22,7],halfW:8,halfH:7,from:[.25,-.3,1]},thermometer:{center:[5,22,7],halfW:9,halfH:5,from:[.1,.1,1]},manometer:{center:[-20,23,7],halfW:7,halfH:12,from:[-.1,.05,1]},pulleys:{center:[11,14,7],halfW:16,halfH:8,from:[.1,.1,1]},lever:{center:[28,21,7],halfW:12,halfH:6,from:[.1,.1,1]},holders:{center:[0,70,-4],halfW:18,halfH:10,from:[.1,.25,1]}}}},wr=({id:n,part:s})=>{var c;const i=ot(d=>d.camera),t=ot(d=>d.size.width/d.size.height),r=ot(d=>d.controls),a=p.useRef(null),o=p.useRef(!1),h=(s&&((c=ls[n].closeUp)==null?void 0:c[s])||null)??ls[n].all;return p.useEffect(()=>{const d=Math.tan(hs.degToRad(i.fov/2)),f=1.15*Math.max(h.halfH/d,h.halfW/(d*t)),b=new I(...h.center),U=b.clone().add(new I(...h.from).normalize().multiplyScalar(f));o.current?a.current={pos:U,target:b}:(i.position.copy(U),i.lookAt(b),r&&(r.target.copy(b),r.update(),o.current=!0))},[h,t,i,r]),fs(()=>{const d=a.current;!d||!r||(i.position.lerp(d.pos,.12),r.target.lerp(d.target,.12),r.update(),i.position.distanceTo(d.pos)<d.pos.distanceTo(d.target)*.002&&(a.current=null))}),null},nt="#CBD5E1",zr="#2F3E46",Lr=({id:n,onBack:s,onOpen:i})=>{const t=Yt(n),[r,a]=p.useState(null),[o,l]=p.useState(null),[h,c]=p.useState(nt),d=r??o,f=t.parts.find(E=>E.id===d),b=t.compareWith&&Yt(t.compareWith),U=lr();return e.jsxs("div",{className:"w-full h-[100dvh] bg-slate-950 flex flex-col overflow-hidden text-slate-200 font-sans",children:[e.jsxs("header",{className:"z-30 flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 gap-4 flex-none shadow-lg",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("button",{onClick:s,className:"p-2 bg-slate-800 rounded-full shadow-md hover:bg-slate-700 transition-colors border border-slate-700",children:e.jsx(Bs,{className:"w-5 h-5 sm:w-6 sm:h-6"})}),e.jsxs("div",{children:[e.jsx("h1",{className:"text-base sm:text-xl font-bold tracking-tight leading-tight",children:t.name}),e.jsx("p",{className:"text-xs text-slate-400",children:t.alsoCalled})]})]}),e.jsx("button",{onClick:()=>c(E=>E===nt?zr:nt),className:"p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 border border-slate-700 transition-colors",title:"Toggle Canvas Background",children:h===nt?e.jsx(Hs,{className:"w-5 h-5"}):e.jsx(ks,{className:"w-5 h-5"})})]}),e.jsxs("main",{className:"flex-1 min-h-0 flex flex-col md:flex-row",children:[e.jsxs("div",{className:"relative h-[42%] md:h-auto md:flex-1 flex-none",children:[e.jsxs(Ws,{camera:{position:[3,4,14],fov:35},style:{background:h},onPointerMissed:()=>l(null),children:[e.jsx("color",{attach:"background",args:[h]},h),e.jsx(Fs,{variant:"studio"}),e.jsx("ambientLight",{intensity:.6}),e.jsx("directionalLight",{position:[5,8,6],intensity:1}),e.jsx(Sr,{id:n,active:d,onHover:a,onSelect:l,kymo:U}),e.jsx($s,{makeDefault:!0,enablePan:!0,screenSpacePanning:!0,zoomToCursor:!0}),e.jsx(wr,{id:n,part:o})]}),f?e.jsx("div",{className:"absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 bg-slate-900/90 backdrop-blur-md border border-blue-500/30 rounded-full shadow-lg whitespace-nowrap pointer-events-none",children:e.jsx("div",{className:"text-blue-300 font-bold text-[11px] uppercase tracking-wider",children:f.name})}):e.jsx("div",{className:"absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 bg-slate-900/70 rounded-full text-[11px] text-slate-300 whitespace-nowrap pointer-events-none",children:"Drag to turn · two fingers to pan · tap a part"})]}),e.jsxs("aside",{className:"flex-1 md:flex-none md:w-96 min-h-0 overflow-y-auto bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 p-5 space-y-6 text-sm",children:[e.jsx("p",{className:"text-slate-300",children:t.summary}),n==="kymograph"&&e.jsx(jr,{kymo:U}),e.jsxs("section",{children:[e.jsx("h2",{className:"text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-2",children:"Parts"}),e.jsx("div",{className:"grid grid-cols-2 gap-2",children:t.parts.map(E=>e.jsx("button",{onClick:()=>l(x=>x===E.id?null:E.id),onMouseEnter:()=>a(E.id),onMouseLeave:()=>a(null),className:`text-left px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${d===E.id?"bg-blue-600/20 border-blue-500 text-blue-100":"bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"}`,children:E.name},E.id))})]}),e.jsxs("div",{className:"flex flex-col gap-2",children:[b&&e.jsxs("button",{onClick:()=>i(`instrument-${b.id}`),className:"w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-xl border border-slate-700 transition-colors",children:["Compare with the ",b.name]}),t.experiment&&e.jsxs("button",{onClick:()=>i(t.experiment.view),className:"w-full bg-slate-800 hover:bg-slate-700 text-indigo-200 font-bold py-3 rounded-xl border border-indigo-500/40 transition-colors",children:["Open the ",t.experiment.label," experiment"]})]})]})]})]})};export{Lr as InstrumentViewer};

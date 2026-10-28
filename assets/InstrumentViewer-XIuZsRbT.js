import{$ as Ae,a0 as Te,a1 as pe,a2 as re,a3 as I,a4 as Ie,a5 as ce,a6 as Ue,V as v,a7 as Oe,a8 as he,a9 as me,v as de,aa as Ne,ab as O,ac as Re,ad as ke,g as Pe,r as h,G as Z,a as Ge,ae,af as He,n as We,F as Fe,j as n,w as Ve,ag as $e,k as qe,ah as Ke,ai as xe,A as Xe,M as Ye,b as Je,d as Ze,L as Qe,O as et,u as tt}from"./index-Ble4qYCw.js";import{T as De,a as nt,L as st}from"./labelFonts-BIFg1yzZ.js";const Ce=Ae>=125?"uv1":"uv2",ge=new ce,k=new v;class ue extends Te{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry";const e=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],t=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],o=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(o),this.setAttribute("position",new pe(e,3)),this.setAttribute("uv",new pe(t,2))}applyMatrix4(e){const t=this.attributes.instanceStart,o=this.attributes.instanceEnd;return t!==void 0&&(t.applyMatrix4(e),o.applyMatrix4(e),t.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));const o=new re(t,6,1);return this.setAttribute("instanceStart",new I(o,3,0)),this.setAttribute("instanceEnd",new I(o,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e,t=3){let o;e instanceof Float32Array?o=e:Array.isArray(e)&&(o=new Float32Array(e));const s=new re(o,t*2,1);return this.setAttribute("instanceColorStart",new I(s,t,0)),this.setAttribute("instanceColorEnd",new I(s,t,t)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new Ie(e.geometry)),this}fromLineSegments(e){const t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new ce);const e=this.attributes.instanceStart,t=this.attributes.instanceEnd;e!==void 0&&t!==void 0&&(this.boundingBox.setFromBufferAttribute(e),ge.setFromBufferAttribute(t),this.boundingBox.union(ge))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Ue),this.boundingBox===null&&this.computeBoundingBox();const e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(e!==void 0&&t!==void 0){const o=this.boundingSphere.center;this.boundingBox.getCenter(o);let s=0;for(let r=0,u=e.count;r<u;r++)k.fromBufferAttribute(e,r),s=Math.max(s,o.distanceToSquared(k)),k.fromBufferAttribute(t,r),s=Math.max(s,o.distanceToSquared(k));this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(e){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(e)}}class ze extends ue{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(e){const t=e.length-3,o=new Float32Array(2*t);for(let s=0;s<t;s+=3)o[2*s]=e[s],o[2*s+1]=e[s+1],o[2*s+2]=e[s+2],o[2*s+3]=e[s+3],o[2*s+4]=e[s+4],o[2*s+5]=e[s+5];return super.setPositions(o),this}setColors(e,t=3){const o=e.length-t,s=new Float32Array(2*o);if(t===3)for(let r=0;r<o;r+=t)s[2*r]=e[r],s[2*r+1]=e[r+1],s[2*r+2]=e[r+2],s[2*r+3]=e[r+3],s[2*r+4]=e[r+4],s[2*r+5]=e[r+5];else for(let r=0;r<o;r+=t)s[2*r]=e[r],s[2*r+1]=e[r+1],s[2*r+2]=e[r+2],s[2*r+3]=e[r+3],s[2*r+4]=e[r+4],s[2*r+5]=e[r+5],s[2*r+6]=e[r+6],s[2*r+7]=e[r+7];return super.setColors(s,t),this}fromLine(e){const t=e.geometry;return this.setPositions(t.attributes.position.array),this}}class fe extends Oe{constructor(e){super({type:"LineMaterial",uniforms:he.clone(he.merge([me.common,me.fog,{worldUnits:{value:1},linewidth:{value:1},resolution:{value:new de(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}}])),vertexShader:`
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
					#include <${Ae>=154?"colorspace_fragment":"encodings_fragment"}>
					#include <fog_fragment>
					#include <premultiplied_alpha_fragment>

				}
			`,clipping:!0}),this.isLineMaterial=!0,this.onBeforeCompile=function(){this.transparent?this.defines.USE_LINE_COLOR_ALPHA="1":delete this.defines.USE_LINE_COLOR_ALPHA},Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(t){this.uniforms.diffuse.value=t}},worldUnits:{enumerable:!0,get:function(){return"WORLD_UNITS"in this.defines},set:function(t){t===!0?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(t){this.uniforms.linewidth.value=t}},dashed:{enumerable:!0,get:function(){return"USE_DASH"in this.defines},set(t){!!t!="USE_DASH"in this.defines&&(this.needsUpdate=!0),t===!0?this.defines.USE_DASH="":delete this.defines.USE_DASH}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(t){this.uniforms.dashScale.value=t}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(t){this.uniforms.dashSize.value=t}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(t){this.uniforms.dashOffset.value=t}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(t){this.uniforms.gapSize.value=t}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(t){this.uniforms.opacity.value=t}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(t){this.uniforms.resolution.value.copy(t)}},alphaToCoverage:{enumerable:!0,get:function(){return"USE_ALPHA_TO_COVERAGE"in this.defines},set:function(t){!!t!="USE_ALPHA_TO_COVERAGE"in this.defines&&(this.needsUpdate=!0),t===!0?(this.defines.USE_ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.USE_ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(e)}}const Q=new O,be=new v,ve=new v,y=new O,w=new O,M=new O,ee=new v,te=new ke,S=new Re,ye=new v,G=new ce,H=new Ue,L=new O;let D,B;function we(a,e,t){return L.set(0,0,-e,1).applyMatrix4(a.projectionMatrix),L.multiplyScalar(1/L.w),L.x=B/t.width,L.y=B/t.height,L.applyMatrix4(a.projectionMatrixInverse),L.multiplyScalar(1/L.w),Math.abs(Math.max(L.x,L.y))}function ot(a,e){const t=a.matrixWorld,o=a.geometry,s=o.attributes.instanceStart,r=o.attributes.instanceEnd,u=Math.min(o.instanceCount,s.count);for(let i=0,d=u;i<d;i++){S.start.fromBufferAttribute(s,i),S.end.fromBufferAttribute(r,i),S.applyMatrix4(t);const l=new v,c=new v;D.distanceSqToSegment(S.start,S.end,c,l),c.distanceTo(l)<B*.5&&e.push({point:c,pointOnLine:l,distance:D.origin.distanceTo(c),object:a,face:null,faceIndex:i,uv:null,[Ce]:null})}}function it(a,e,t){const o=e.projectionMatrix,r=a.material.resolution,u=a.matrixWorld,i=a.geometry,d=i.attributes.instanceStart,l=i.attributes.instanceEnd,c=Math.min(i.instanceCount,d.count),f=-e.near;D.at(1,M),M.w=1,M.applyMatrix4(e.matrixWorldInverse),M.applyMatrix4(o),M.multiplyScalar(1/M.w),M.x*=r.x/2,M.y*=r.y/2,M.z=0,ee.copy(M),te.multiplyMatrices(e.matrixWorldInverse,u);for(let x=0,b=c;x<b;x++){if(y.fromBufferAttribute(d,x),w.fromBufferAttribute(l,x),y.w=1,w.w=1,y.applyMatrix4(te),w.applyMatrix4(te),y.z>f&&w.z>f)continue;if(y.z>f){const m=y.z-w.z,j=(y.z-f)/m;y.lerp(w,j)}else if(w.z>f){const m=w.z-y.z,j=(w.z-f)/m;w.lerp(y,j)}y.applyMatrix4(o),w.applyMatrix4(o),y.multiplyScalar(1/y.w),w.multiplyScalar(1/w.w),y.x*=r.x/2,y.y*=r.y/2,w.x*=r.x/2,w.y*=r.y/2,S.start.copy(y),S.start.z=0,S.end.copy(w),S.end.z=0;const p=S.closestPointToPointParameter(ee,!0);S.at(p,ye);const g=Pe.lerp(y.z,w.z,p),_=g>=-1&&g<=1,T=ee.distanceTo(ye)<B*.5;if(_&&T){S.start.fromBufferAttribute(d,x),S.end.fromBufferAttribute(l,x),S.start.applyMatrix4(u),S.end.applyMatrix4(u);const m=new v,j=new v;D.distanceSqToSegment(S.start,S.end,j,m),t.push({point:j,pointOnLine:m,distance:D.origin.distanceTo(j),object:a,face:null,faceIndex:x,uv:null,[Ce]:null})}}}class Be extends Ne{constructor(e=new ue,t=new fe({color:Math.random()*16777215})){super(e,t),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){const e=this.geometry,t=e.attributes.instanceStart,o=e.attributes.instanceEnd,s=new Float32Array(2*t.count);for(let u=0,i=0,d=t.count;u<d;u++,i+=2)be.fromBufferAttribute(t,u),ve.fromBufferAttribute(o,u),s[i]=i===0?0:s[i-1],s[i+1]=s[i]+be.distanceTo(ve);const r=new re(s,2,1);return e.setAttribute("instanceDistanceStart",new I(r,1,0)),e.setAttribute("instanceDistanceEnd",new I(r,1,1)),this}raycast(e,t){const o=this.material.worldUnits,s=e.camera;s===null&&!o&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');const r=e.params.Line2!==void 0&&e.params.Line2.threshold||0;D=e.ray;const u=this.matrixWorld,i=this.geometry,d=this.material;B=d.linewidth+r,i.boundingSphere===null&&i.computeBoundingSphere(),H.copy(i.boundingSphere).applyMatrix4(u);let l;if(o)l=B*.5;else{const f=Math.max(s.near,H.distanceToPoint(D.origin));l=we(s,f,d.resolution)}if(H.radius+=l,D.intersectsSphere(H)===!1)return;i.boundingBox===null&&i.computeBoundingBox(),G.copy(i.boundingBox).applyMatrix4(u);let c;if(o)c=B*.5;else{const f=Math.max(s.near,G.distanceToPoint(D.origin));c=we(s,f,d.resolution)}G.expandByScalar(c),D.intersectsBox(G)!==!1&&(o?ot(this,t):it(this,s,t))}onBeforeRender(e){const t=this.material.uniforms;t&&t.resolution&&(e.getViewport(Q),this.material.uniforms.resolution.value.set(Q.z,Q.w))}}class rt extends Be{constructor(e=new ze,t=new fe({color:Math.random()*16777215})){super(e,t),this.isLine2=!0,this.type="Line2"}}const at=h.forwardRef(function({points:e,color:t=16777215,vertexColors:o,linewidth:s,lineWidth:r,segments:u,dashed:i,...d},l){var c,f;const x=Z(_=>_.size),b=h.useMemo(()=>u?new Be:new rt,[u]),[E]=h.useState(()=>new fe),p=(o==null||(c=o[0])==null?void 0:c.length)===4?4:3,g=h.useMemo(()=>{const _=u?new ue:new ze,T=e.map(m=>{const j=Array.isArray(m);return m instanceof v||m instanceof O?[m.x,m.y,m.z]:m instanceof de?[m.x,m.y,0]:j&&m.length===3?[m[0],m[1],m[2]]:j&&m.length===2?[m[0],m[1],0]:m});if(_.setPositions(T.flat()),o){t=16777215;const m=o.map(j=>j instanceof Ge?j.toArray():j);_.setColors(m.flat(),p)}return _},[e,u,o,p]);return h.useLayoutEffect(()=>{b.computeLineDistances()},[e,b]),h.useLayoutEffect(()=>{i?E.defines.USE_DASH="":delete E.defines.USE_DASH,E.needsUpdate=!0},[i,E]),h.useEffect(()=>()=>{g.dispose(),E.dispose()},[g]),h.createElement("primitive",ae({object:b,ref:l},d),h.createElement("primitive",{object:g,attach:"geometry"}),h.createElement("primitive",ae({object:E,attach:"material",color:t,vertexColors:!!o,resolution:[x.width,x.height],linewidth:(f=s??r)!==null&&f!==void 0?f:1,dashed:i,transparent:p===4},d)))}),lt=h.forwardRef(({threshold:a=15,geometry:e,...t},o)=>{const s=h.useRef(null);h.useImperativeHandle(o,()=>s.current,[]);const r=h.useMemo(()=>[0,0,0,1,0,0],[]),u=h.useRef(),i=h.useRef();return h.useLayoutEffect(()=>{const d=s.current.parent,l=e??(d==null?void 0:d.geometry);if(!l||u.current===l&&i.current===a)return;u.current=l,i.current=a;const f=new He(l,a).attributes.position.array;s.current.geometry.setPositions(f),s.current.geometry.attributes.instanceStart.needsUpdate=!0,s.current.geometry.attributes.instanceEnd.needsUpdate=!0,s.current.computeLineDistances()}),h.createElement(at,ae({segments:!0,points:r,ref:s,raycast:()=>null},t))}),ct={rbc:{bulbLen:2.2,bulbR:.4,bore:.03,bead:[.2,.1],beadColor:"#8b1a1a",topMark:"101",mouth:"#e11d27"},wbc:{bulbLen:1.8,bulbR:.33,bore:.06,bead:[.15,.095],beadColor:"#f8fafc",topMark:"11",mouth:"#f4f4f5"}},U=.2,W=.5,A=6,dt=1.7,ne=.7,C=.25,le="#1e3a8a",P="#3b82f6",N=({points:a,x0:e,children:t,userData:o})=>{const s=h.useMemo(()=>new Ve(a.map(([r,u])=>new de(r,u)),48),[a]);return n.jsx("mesh",{geometry:s,position:[e,0,0],rotation:[0,0,-Math.PI/2],userData:o,children:t})},ut=a=>{for(let e=a;e;e=e.parent)if(e.userData.part)return e.userData;return null},Se=a=>{var t;const e=a.intersections.map(o=>ut(o.object)).filter(o=>!!o);return((t=e.find(o=>!o.glass)??e[0])==null?void 0:t.part)??null},F=({lit:a})=>n.jsx("meshPhysicalMaterial",{color:a?P:"#ffffff",transparent:!0,opacity:a?.6:.22,roughness:.03,metalness:0,clearcoat:1,envMapIntensity:1.6,side:$e,depthWrite:!1,emissive:a?P:"#000000",emissiveIntensity:a?.7:0}),se=({at:a,children:e,lit:t})=>n.jsx(De,{font:nt,position:[a,0,U+.012],rotation:[0,0,-Math.PI/2],fontSize:.22,color:t?P:le,anchorX:"center",anchorY:"middle",children:e}),je=({kind:a,active:e,onHover:t,onSelect:o})=>{const s=ct[a],r=A+s.bulbLen,u=r+.3,i=r+dt,d=-i/2-.6,l=p=>d+p,c=p=>e===p,f=h.useMemo(()=>{const p=[];for(let g=0;g<=40;g++){const _=g/40;p.push([U+(s.bulbR-U)*Math.pow(Math.sin(Math.PI*_),1.6),A+s.bulbLen*_])}return{tip:[[.05,0],[.12,W*.6],[U,W]],stem:[[U,W],[U,A]],bulb:p,neck:[[U,r],[U,i]],sleeve:[[C+.03,i-ne],[C,i-ne+.12],[C,i+.05]]}},[s.bulbLen,s.bulbR,r,i]),x=h.useMemo(()=>{const p=l(i),g=new We([new v(p,0,0),new v(p+.9,0,-.05),new v(p+1.7,-.5,-.1),new v(p+1.75,-1.5,0),new v(p+.8,-2.1,.15),new v(p-1.6,-2.25,.15),new v(p-4.2,-2.05,0)]),_=g.getPoint(1),T=g.getTangent(1);return{geometry:new Fe(g,120,C*.76,16,!1),end:_,angle:Math.atan2(T.y,T.x)}},[i,d]),b=Array.from({length:10},(p,g)=>(g+1)*(A/10)),E=(p,g)=>n.jsxs("mesh",{position:[l((p+g)/2),0,-.07],children:[n.jsx("boxGeometry",{args:[g-p,.3,.05]}),n.jsx("meshStandardMaterial",{color:"#ffffff",roughness:.55})]});return n.jsxs("group",{onPointerMove:p=>{p.stopPropagation(),t(Se(p))},onPointerOut:()=>t(null),onClick:p=>{p.stopPropagation();const g=Se(p);g&&o(g)},children:[n.jsx(N,{points:f.tip,x0:d,userData:{part:"tip",glass:!0},children:n.jsx(F,{lit:c("tip")})}),n.jsx(N,{points:f.stem,x0:d,userData:{part:"stem",glass:!0},children:n.jsx(F,{lit:c("stem")})}),n.jsx(N,{points:f.bulb,x0:d,userData:{part:"bulb",glass:!0},children:n.jsx(F,{lit:c("bulb")})}),n.jsx(N,{points:f.neck,x0:d,userData:{part:"top-mark",glass:!0},children:n.jsx(F,{lit:c("top-mark")})}),E(W*.8,A),E(r,i-ne),n.jsxs("mesh",{position:[l(A/2+.1),0,0],rotation:[0,0,Math.PI/2],userData:{part:"stem"},children:[n.jsx("cylinderGeometry",{args:[s.bore,s.bore,A-.2,12]}),n.jsx("meshStandardMaterial",{color:c("stem")?P:"#9aa9b8"})]}),n.jsxs("group",{userData:{part:"marks"},children:[b.map(p=>n.jsx("group",{position:[l(p),0,0],rotation:[0,Math.PI/2,0],children:n.jsxs("mesh",{rotation:[0,0,Math.PI/2],children:[n.jsx("torusGeometry",{args:[U+.004,.009,4,24,Math.PI]}),n.jsx("meshBasicMaterial",{color:c("marks")?P:le})]})},p)),n.jsx(se,{at:l(A/2-.22),lit:c("marks"),children:"0.5"}),n.jsx(se,{at:l(A-.2),lit:c("marks"),children:"1"})]}),n.jsxs("group",{userData:{part:"top-mark"},children:[n.jsx("group",{position:[l(u),0,0],rotation:[0,Math.PI/2,0],children:n.jsxs("mesh",{rotation:[0,0,Math.PI/2],children:[n.jsx("torusGeometry",{args:[U+.004,.009,4,24,Math.PI]}),n.jsx("meshBasicMaterial",{color:c("top-mark")?P:le})]})}),n.jsx(se,{at:l(u+.26),lit:c("top-mark"),children:s.topMark})]}),n.jsxs("mesh",{position:[l(A+s.bulbLen*.5),-(s.bulbR-s.bead[1]-.06),0],scale:[s.bead[0],s.bead[1],s.bead[1]],userData:{part:"bead"},children:[n.jsx("sphereGeometry",{args:[1,32,24]}),n.jsx("meshStandardMaterial",{color:s.beadColor,roughness:.3,emissive:c("bead")?P:"#000000",emissiveIntensity:c("bead")?.6:0})]}),n.jsxs("group",{userData:{part:"tube"},children:[n.jsx(N,{points:f.sleeve,x0:d,children:n.jsx(Ee,{lit:c("tube")})}),n.jsx("mesh",{geometry:x.geometry,children:n.jsx(Ee,{lit:c("tube")})})]}),n.jsxs("group",{position:[x.end.x,x.end.y,x.end.z],rotation:[0,0,x.angle-Math.PI/2],userData:{part:"mouthpiece"},children:[n.jsxs("mesh",{position:[0,.08,0],children:[n.jsx("cylinderGeometry",{args:[C*1.15,C*1.15,.16,24]}),n.jsx("meshStandardMaterial",{color:c("mouthpiece")?P:s.mouth,roughness:.35})]}),n.jsxs("mesh",{position:[0,.42,0],children:[n.jsx("cylinderGeometry",{args:[C*.95,C*.8,.55,24]}),n.jsx("meshStandardMaterial",{color:c("mouthpiece")?P:s.mouth,roughness:.35})]})]})]})},Ee=({lit:a})=>n.jsx("meshPhysicalMaterial",{color:a?P:"#e3d6b4",roughness:.4,transparent:!0,opacity:.82,clearcoat:.4}),V=75,_e=33,R=6,oe=3,$=1,ft=7.6,pt="#2f3f9e",q=.02,K=a=>({polygonOffset:!0,polygonOffsetFactor:-a,polygonOffsetUnits:-4*a}),z="#3b82f6",ht=(()=>{let a=null;return()=>{if(a)return a;const e=2048,t=e/3,o=document.createElement("canvas");o.width=o.height=e;const s=o.getContext("2d");s.strokeStyle="rgba(15, 23, 42, 0.85)";const r=(i,d,l,c,f)=>{s.lineWidth=f,s.beginPath(),s.moveTo(i*t,d*t),s.lineTo(l*t,c*t),s.stroke()},u=(i,d,l,c)=>{for(const f of[-.0125,0,.0125])d?r(i+f,l,i+f,c,3):r(l,i+f,c,i+f,3)};for(let i=0;i<=3;i++)u(i,!0,0,3),u(i,!1,0,3);for(const[i,d]of[[0,0],[2,0],[0,2],[2,2]])for(let l=1;l<4;l++)r(i+l/4,d,i+l/4,d+1,2.5),r(i,d+l/4,i+1,d+l/4,2.5);for(let i=1;i<5;i++)u(1+i/5,!0,0,3),u(1+i/5,!1,0,3);for(let i=1;i<20;i++)i%4!==0&&(r(1+i/20,1,1+i/20,2,1.5),r(1,1+i/20,2,1+i/20,1.5));for(let i=1;i<4;i++)r(1,i/4,2,i/4,2.5),r(1,2+i/4,2,2+i/4,2.5),r(i/4,1,i/4,2,2.5),r(2+i/4,1,2+i/4,2,2.5);return a=new qe(o),a.anisotropy=8,a.colorSpace=Ke,a}})(),mt=a=>{for(let e=a;e;e=e.parent)if(e.userData.part)return e.userData;return null},Me=a=>{var t;const e=a.intersections.map(o=>mt(o.object)).filter(o=>!!o);return((t=e.find(o=>!o.glass)??e[0])==null?void 0:t.part)??null},X=({lit:a,opacity:e=.38})=>n.jsx("meshPhysicalMaterial",{color:a?z:"#fbf1f7",transparent:!0,opacity:a?.6:e,roughness:.06,metalness:0,clearcoat:1,envMapIntensity:1.4,depthWrite:!1,emissive:a?z:"#000000",emissiveIntensity:a?.6:0}),Y=({x:a,y:e,z:t,children:o,part:s})=>n.jsxs("mesh",{position:[(a[0]+a[1])/2,(e[0]+e[1])/2,(t[0]+t[1])/2],userData:s,children:[n.jsx("boxGeometry",{args:[a[1]-a[0],e[1]-e[0],t[1]-t[0]]}),o]}),ie=({x:a,z:e,size:t,lit:o,children:s})=>n.jsx(De,{font:st,position:[a,.05,e],rotation:[-Math.PI/2,0,0],fontSize:t,color:o?z:pt,anchorX:"center",anchorY:"middle",textAlign:"center",lineHeight:1.15,children:s}),xt=({active:a,onHover:e,onSelect:t})=>{const o=l=>a===l,s=h.useMemo(ht,[]),r=R+oe,u=_e/2,i=-.1,d=-1;return n.jsxs("group",{onPointerMove:l=>{l.stopPropagation(),e(Me(l))},onPointerOut:()=>e(null),onClick:l=>{l.stopPropagation();const c=Me(l);c&&t(c)},children:[n.jsx(Y,{x:[-V/2,V/2],y:[-4,d],z:[-u,u],part:{part:"slide",glass:!0},children:n.jsx(X,{lit:o("slide")})}),[-1,1].map(l=>n.jsx(Y,{x:l<0?[-V/2,-r]:[r,V/2],y:[d,0],z:[-u,u],part:{part:"platforms",glass:!0},children:n.jsx(X,{lit:o("platforms")})},l)),[-1,1].map(l=>n.jsx(Y,{x:[-R,R],y:[d,i],z:l<0?[-u,-$]:[$,u],part:{part:"central",glass:!0},children:n.jsx(X,{lit:o("central")})},l)),[-1,1].map(l=>n.jsxs("mesh",{position:[0,i+q,l*($+6.5)],rotation:[-Math.PI/2,0,0],userData:{part:"central"},children:[n.jsx("planeGeometry",{args:[7,12.6]}),n.jsx("meshStandardMaterial",{color:o("central")?z:"#a7afb4",metalness:.85,roughness:.28,...K(1)})]},l)),[-1,1].map(l=>n.jsxs("mesh",{position:[0,i+2*q,l*ft],rotation:[-Math.PI/2,0,0],userData:{part:"grid"},children:[n.jsx("planeGeometry",{args:[3,3]}),n.jsx("meshBasicMaterial",{map:s,transparent:!0,color:o("grid")?z:"#ffffff",...K(2)})]},l)),n.jsxs("group",{userData:{part:"moats"},children:[[-1,1].map(l=>n.jsxs("mesh",{position:[l*(R+oe/2),d+q,0],rotation:[-Math.PI/2,0,0],children:[n.jsx("planeGeometry",{args:[oe,_e]}),n.jsx("meshStandardMaterial",{color:o("moats")?z:"#ece6ea",roughness:.95,transparent:!0,opacity:.65,...K(1)})]},l)),n.jsxs("mesh",{position:[0,d+q,0],rotation:[-Math.PI/2,0,0],children:[n.jsx("planeGeometry",{args:[R*2,$*2]}),n.jsx("meshStandardMaterial",{color:o("moats")?z:"#ece6ea",roughness:.95,transparent:!0,opacity:.65,...K(1)})]})]}),n.jsxs("group",{userData:{part:"print"},children:[n.jsx(ie,{x:-23,z:-6,size:2.4,lit:o("print"),children:`Tiefe
Depth
Profondeur
0.100mm`}),n.jsx(ie,{x:-23,z:11,size:2.4,lit:o("print"),children:"0.0025mm²"}),n.jsx(ie,{x:23,z:-7,size:2.2,lit:o("print"),children:`NEUBAUER
IMPROVED
BRIGHT-LINE`})]}),n.jsxs(Y,{x:[-11,11],y:[0,.4],z:[-11,11],part:{part:"coverslip",glass:!0},children:[n.jsx(X,{lit:o("coverslip"),opacity:.18}),n.jsx(lt,{color:o("coverslip")?z:"#8fa0b4",lineWidth:o("coverslip")?2.5:1.5})]})]})},gt=({id:a,...e})=>{switch(a){case"rbc-pipette":return n.jsx(je,{kind:"rbc",...e});case"wbc-pipette":return n.jsx(je,{kind:"wbc",...e});case"neubauer-chamber":return n.jsx(xt,{...e})}},Le={"rbc-pipette":{all:{center:[.25,-1,0],halfW:5.9,halfH:1.6,from:[.2,.3,1]}},"wbc-pipette":{all:{center:[.25,-1,0],halfW:5.7,halfH:1.6,from:[.2,.3,1]}},"neubauer-chamber":{all:{center:[0,-1,0],halfW:44,halfH:21,from:[.15,1.3,.9]},closeUp:{grid:{center:[0,-.1,7.6],halfW:1.7,halfH:1.7,from:[0,1,.3]}}}},bt=({id:a,part:e})=>{var l;const t=Z(c=>c.camera),o=Z(c=>c.size.width/c.size.height),s=Z(c=>c.controls),r=h.useRef(null),u=h.useRef(!1),d=(e&&((l=Le[a].closeUp)==null?void 0:l[e])||null)??Le[a].all;return h.useEffect(()=>{const c=Math.tan(Pe.degToRad(t.fov/2)),f=1.15*Math.max(d.halfH/c,d.halfW/(c*o)),x=new v(...d.center),b=x.clone().add(new v(...d.from).normalize().multiplyScalar(f));u.current?r.current={pos:b,target:x}:(t.position.copy(b),t.lookAt(x),s&&(s.target.copy(x),s.update(),u.current=!0))},[d,o,t,s]),tt(()=>{const c=r.current;!c||!s||(t.position.lerp(c.pos,.12),s.target.lerp(c.target,.12),s.update(),t.position.distanceTo(c.pos)<c.pos.distanceTo(c.target)*.002&&(r.current=null))}),null},J="#CBD5E1",vt="#2F3E46",St=({id:a,onBack:e,onOpen:t})=>{const o=xe(a),[s,r]=h.useState(null),[u,i]=h.useState(null),[d,l]=h.useState(J),c=s??u,f=o.parts.find(b=>b.id===c),x=o.compareWith&&xe(o.compareWith);return n.jsxs("div",{className:"w-full h-[100dvh] bg-slate-950 flex flex-col overflow-hidden text-slate-200 font-sans",children:[n.jsxs("header",{className:"z-30 flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 gap-4 flex-none shadow-lg",children:[n.jsxs("div",{className:"flex items-center gap-3",children:[n.jsx("button",{onClick:e,className:"p-2 bg-slate-800 rounded-full shadow-md hover:bg-slate-700 transition-colors border border-slate-700",children:n.jsx(Xe,{className:"w-5 h-5 sm:w-6 sm:h-6"})}),n.jsxs("div",{children:[n.jsx("h1",{className:"text-base sm:text-xl font-bold tracking-tight leading-tight",children:o.name}),n.jsx("p",{className:"text-xs text-slate-400",children:o.alsoCalled})]})]}),n.jsx("button",{onClick:()=>l(b=>b===J?vt:J),className:"p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 border border-slate-700 transition-colors",title:"Toggle Canvas Background",children:d===J?n.jsx(Ye,{className:"w-5 h-5"}):n.jsx(Je,{className:"w-5 h-5"})})]}),n.jsxs("main",{className:"flex-1 min-h-0 flex flex-col md:flex-row",children:[n.jsxs("div",{className:"relative h-[42%] md:h-auto md:flex-1 flex-none",children:[n.jsxs(Ze,{camera:{position:[3,4,14],fov:35},style:{background:d},onPointerMissed:()=>i(null),children:[n.jsx("color",{attach:"background",args:[d]},d),n.jsx(Qe,{variant:"studio"}),n.jsx("ambientLight",{intensity:.6}),n.jsx("directionalLight",{position:[5,8,6],intensity:1}),n.jsx(gt,{id:a,active:c,onHover:r,onSelect:i}),n.jsx(et,{makeDefault:!0,enablePan:!1,zoomToCursor:!0}),n.jsx(bt,{id:a,part:u})]}),f?n.jsxs("div",{className:"absolute bottom-3 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-10 px-4 py-2.5 bg-slate-900/90 backdrop-blur-md border border-blue-500/30 rounded-2xl shadow-lg",children:[n.jsx("div",{className:"text-blue-300 font-bold text-[11px] uppercase tracking-wider",children:f.name}),n.jsx("div",{className:"text-slate-200 text-xs leading-snug mt-0.5",children:f.note})]}):n.jsx("div",{className:"absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 bg-slate-900/70 rounded-full text-[11px] text-slate-300 whitespace-nowrap pointer-events-none",children:"Drag to turn · tap a part to name it"})]}),n.jsxs("aside",{className:"flex-1 md:flex-none md:w-96 min-h-0 overflow-y-auto bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 p-5 space-y-6 text-sm",children:[n.jsx("p",{className:"text-slate-300",children:o.summary}),n.jsxs("section",{children:[n.jsx("h2",{className:"text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-2",children:"Parts"}),n.jsx("div",{className:"grid grid-cols-2 gap-2",children:o.parts.map(b=>n.jsx("button",{onClick:()=>i(E=>E===b.id?null:b.id),onMouseEnter:()=>r(b.id),onMouseLeave:()=>r(null),className:`text-left px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${c===b.id?"bg-blue-600/20 border-blue-500 text-blue-100":"bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"}`,children:b.name},b.id))})]}),n.jsxs("div",{className:"flex flex-col gap-2",children:[x&&n.jsxs("button",{onClick:()=>t(`instrument-${x.id}`),className:"w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-xl border border-slate-700 transition-colors",children:["Compare with the ",x.name]}),n.jsxs("button",{onClick:()=>t(o.experiment.view),className:"w-full bg-slate-800 hover:bg-slate-700 text-indigo-200 font-bold py-3 rounded-xl border border-indigo-500/40 transition-colors",children:["Open the ",o.experiment.label," experiment"]})]})]})]})]})};export{St as InstrumentViewer};

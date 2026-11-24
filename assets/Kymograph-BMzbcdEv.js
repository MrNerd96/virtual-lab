import{ay as lt,az as Lt,aA as Ze,aB as He,aC as ie,aD as zt,aE as Fe,aF as dt,V as O,aG as Pt,aH as et,aI as tt,t as Le,aJ as At,aK as oe,aL as Ct,aM as Ot,f as Dt,r as d,G as It,a as Ut,aN as ke,aO as Tt,i as Rt,aw as Bt,u as Nt,j as e,D as Gt,H as Ht,v as kt,m as Wt,x as ut,w as ht}from"./index-Fn162vjr.js";import{T as F,a as V,L as Ft}from"./labelFonts-DnZxoI7N.js";const ft=lt>=125?"uv1":"uv2",st=new Fe,ge=new O;class Ve extends Lt{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry";const t=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],s=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],a=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(a),this.setAttribute("position",new Ze(t,3)),this.setAttribute("uv",new Ze(s,2))}applyMatrix4(t){const s=this.attributes.instanceStart,a=this.attributes.instanceEnd;return s!==void 0&&(s.applyMatrix4(t),a.applyMatrix4(t),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(t){let s;t instanceof Float32Array?s=t:Array.isArray(t)&&(s=new Float32Array(t));const a=new He(s,6,1);return this.setAttribute("instanceStart",new ie(a,3,0)),this.setAttribute("instanceEnd",new ie(a,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(t,s=3){let a;t instanceof Float32Array?a=t:Array.isArray(t)&&(a=new Float32Array(t));const i=new He(a,s*2,1);return this.setAttribute("instanceColorStart",new ie(i,s,0)),this.setAttribute("instanceColorEnd",new ie(i,s,s)),this}fromWireframeGeometry(t){return this.setPositions(t.attributes.position.array),this}fromEdgesGeometry(t){return this.setPositions(t.attributes.position.array),this}fromMesh(t){return this.fromWireframeGeometry(new zt(t.geometry)),this}fromLineSegments(t){const s=t.geometry;return this.setPositions(s.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Fe);const t=this.attributes.instanceStart,s=this.attributes.instanceEnd;t!==void 0&&s!==void 0&&(this.boundingBox.setFromBufferAttribute(t),st.setFromBufferAttribute(s),this.boundingBox.union(st))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new dt),this.boundingBox===null&&this.computeBoundingBox();const t=this.attributes.instanceStart,s=this.attributes.instanceEnd;if(t!==void 0&&s!==void 0){const a=this.boundingSphere.center;this.boundingBox.getCenter(a);let i=0;for(let r=0,n=t.count;r<n;r++)ge.fromBufferAttribute(t,r),i=Math.max(i,a.distanceToSquared(ge)),ge.fromBufferAttribute(s,r),i=Math.max(i,a.distanceToSquared(ge));this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(t){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(t)}}class pt extends Ve{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(t){const s=t.length-3,a=new Float32Array(2*s);for(let i=0;i<s;i+=3)a[2*i]=t[i],a[2*i+1]=t[i+1],a[2*i+2]=t[i+2],a[2*i+3]=t[i+3],a[2*i+4]=t[i+4],a[2*i+5]=t[i+5];return super.setPositions(a),this}setColors(t,s=3){const a=t.length-s,i=new Float32Array(2*a);if(s===3)for(let r=0;r<a;r+=s)i[2*r]=t[r],i[2*r+1]=t[r+1],i[2*r+2]=t[r+2],i[2*r+3]=t[r+3],i[2*r+4]=t[r+4],i[2*r+5]=t[r+5];else for(let r=0;r<a;r+=s)i[2*r]=t[r],i[2*r+1]=t[r+1],i[2*r+2]=t[r+2],i[2*r+3]=t[r+3],i[2*r+4]=t[r+4],i[2*r+5]=t[r+5],i[2*r+6]=t[r+6],i[2*r+7]=t[r+7];return super.setColors(i,s),this}fromLine(t){const s=t.geometry;return this.setPositions(s.attributes.position.array),this}}class Xe extends Pt{constructor(t){super({type:"LineMaterial",uniforms:et.clone(et.merge([tt.common,tt.fog,{worldUnits:{value:1},linewidth:{value:1},resolution:{value:new Le(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}}])),vertexShader:`
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
					#include <${lt>=154?"colorspace_fragment":"encodings_fragment"}>
					#include <fog_fragment>
					#include <premultiplied_alpha_fragment>

				}
			`,clipping:!0}),this.isLineMaterial=!0,this.onBeforeCompile=function(){this.transparent?this.defines.USE_LINE_COLOR_ALPHA="1":delete this.defines.USE_LINE_COLOR_ALPHA},Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(s){this.uniforms.diffuse.value=s}},worldUnits:{enumerable:!0,get:function(){return"WORLD_UNITS"in this.defines},set:function(s){s===!0?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(s){this.uniforms.linewidth.value=s}},dashed:{enumerable:!0,get:function(){return"USE_DASH"in this.defines},set(s){!!s!="USE_DASH"in this.defines&&(this.needsUpdate=!0),s===!0?this.defines.USE_DASH="":delete this.defines.USE_DASH}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(s){this.uniforms.dashScale.value=s}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(s){this.uniforms.dashSize.value=s}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(s){this.uniforms.dashOffset.value=s}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(s){this.uniforms.gapSize.value=s}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(s){this.uniforms.opacity.value=s}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(s){this.uniforms.resolution.value.copy(s)}},alphaToCoverage:{enumerable:!0,get:function(){return"USE_ALPHA_TO_COVERAGE"in this.defines},set:function(s){!!s!="USE_ALPHA_TO_COVERAGE"in this.defines&&(this.needsUpdate=!0),s===!0?(this.defines.USE_ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.USE_ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(t)}}const Te=new oe,nt=new O,it=new O,_=new oe,E=new oe,G=new oe,Re=new O,Be=new Ot,L=new Ct,ot=new O,ve=new Fe,je=new dt,H=new oe;let W,q;function rt(o,t,s){return H.set(0,0,-t,1).applyMatrix4(o.projectionMatrix),H.multiplyScalar(1/H.w),H.x=q/s.width,H.y=q/s.height,H.applyMatrix4(o.projectionMatrixInverse),H.multiplyScalar(1/H.w),Math.abs(Math.max(H.x,H.y))}function Vt(o,t){const s=o.matrixWorld,a=o.geometry,i=a.attributes.instanceStart,r=a.attributes.instanceEnd,n=Math.min(a.instanceCount,i.count);for(let l=0,u=n;l<u;l++){L.start.fromBufferAttribute(i,l),L.end.fromBufferAttribute(r,l),L.applyMatrix4(s);const p=new O,v=new O;W.distanceSqToSegment(L.start,L.end,v,p),v.distanceTo(p)<q*.5&&t.push({point:v,pointOnLine:p,distance:W.origin.distanceTo(v),object:o,face:null,faceIndex:l,uv:null,[ft]:null})}}function Xt(o,t,s){const a=t.projectionMatrix,r=o.material.resolution,n=o.matrixWorld,l=o.geometry,u=l.attributes.instanceStart,p=l.attributes.instanceEnd,v=Math.min(l.instanceCount,u.count),x=-t.near;W.at(1,G),G.w=1,G.applyMatrix4(t.matrixWorldInverse),G.applyMatrix4(a),G.multiplyScalar(1/G.w),G.x*=r.x/2,G.y*=r.y/2,G.z=0,Re.copy(G),Be.multiplyMatrices(t.matrixWorldInverse,n);for(let S=0,T=v;S<T;S++){if(_.fromBufferAttribute(u,S),E.fromBufferAttribute(p,S),_.w=1,E.w=1,_.applyMatrix4(Be),E.applyMatrix4(Be),_.z>x&&E.z>x)continue;if(_.z>x){const f=_.z-E.z,b=(_.z-x)/f;_.lerp(E,b)}else if(E.z>x){const f=E.z-_.z,b=(E.z-x)/f;E.lerp(_,b)}_.applyMatrix4(a),E.applyMatrix4(a),_.multiplyScalar(1/_.w),E.multiplyScalar(1/E.w),_.x*=r.x/2,_.y*=r.y/2,E.x*=r.x/2,E.y*=r.y/2,L.start.copy(_),L.start.z=0,L.end.copy(E),L.end.z=0;const R=L.closestPointToPointParameter(Re,!0);L.at(R,ot);const B=Dt.lerp(_.z,E.z,R),D=B>=-1&&B<=1,X=Re.distanceTo(ot)<q*.5;if(D&&X){L.start.fromBufferAttribute(u,S),L.end.fromBufferAttribute(p,S),L.start.applyMatrix4(n),L.end.applyMatrix4(n);const f=new O,b=new O;W.distanceSqToSegment(L.start,L.end,b,f),s.push({point:b,pointOnLine:f,distance:W.origin.distanceTo(b),object:o,face:null,faceIndex:S,uv:null,[ft]:null})}}}class mt extends At{constructor(t=new Ve,s=new Xe({color:Math.random()*16777215})){super(t,s),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){const t=this.geometry,s=t.attributes.instanceStart,a=t.attributes.instanceEnd,i=new Float32Array(2*s.count);for(let n=0,l=0,u=s.count;n<u;n++,l+=2)nt.fromBufferAttribute(s,n),it.fromBufferAttribute(a,n),i[l]=l===0?0:i[l-1],i[l+1]=i[l]+nt.distanceTo(it);const r=new He(i,2,1);return t.setAttribute("instanceDistanceStart",new ie(r,1,0)),t.setAttribute("instanceDistanceEnd",new ie(r,1,1)),this}raycast(t,s){const a=this.material.worldUnits,i=t.camera;i===null&&!a&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');const r=t.params.Line2!==void 0&&t.params.Line2.threshold||0;W=t.ray;const n=this.matrixWorld,l=this.geometry,u=this.material;q=u.linewidth+r,l.boundingSphere===null&&l.computeBoundingSphere(),je.copy(l.boundingSphere).applyMatrix4(n);let p;if(a)p=q*.5;else{const x=Math.max(i.near,je.distanceToPoint(W.origin));p=rt(i,x,u.resolution)}if(je.radius+=p,W.intersectsSphere(je)===!1)return;l.boundingBox===null&&l.computeBoundingBox(),ve.copy(l.boundingBox).applyMatrix4(n);let v;if(a)v=q*.5;else{const x=Math.max(i.near,ve.distanceToPoint(W.origin));v=rt(i,x,u.resolution)}ve.expandByScalar(v),W.intersectsBox(ve)!==!1&&(a?Vt(this,s):Xt(this,i,s))}onBeforeRender(t){const s=this.material.uniforms;s&&s.resolution&&(t.getViewport(Te),this.material.uniforms.resolution.value.set(Te.z,Te.w))}}class $t extends mt{constructor(t=new pt,s=new Xe({color:Math.random()*16777215})){super(t,s),this.isLine2=!0,this.type="Line2"}}const Yt=d.forwardRef(function({points:t,color:s=16777215,vertexColors:a,linewidth:i,lineWidth:r,segments:n,dashed:l,...u},p){var v,x;const S=It(D=>D.size),T=d.useMemo(()=>n?new mt:new $t,[n]),[C]=d.useState(()=>new Xe),R=(a==null||(v=a[0])==null?void 0:v.length)===4?4:3,B=d.useMemo(()=>{const D=n?new Ve:new pt,X=t.map(f=>{const b=Array.isArray(f);return f instanceof O||f instanceof oe?[f.x,f.y,f.z]:f instanceof Le?[f.x,f.y,0]:b&&f.length===3?[f[0],f[1],f[2]]:b&&f.length===2?[f[0],f[1],0]:f});if(D.setPositions(X.flat()),a){s=16777215;const f=a.map(b=>b instanceof Ut?b.toArray():b);D.setColors(f.flat(),R)}return D},[t,n,a,R]);return d.useLayoutEffect(()=>{T.computeLineDistances()},[t,T]),d.useLayoutEffect(()=>{l?C.defines.USE_DASH="":delete C.defines.USE_DASH,C.needsUpdate=!0},[l,C]),d.useEffect(()=>()=>{B.dispose(),C.dispose()},[B]),d.createElement("primitive",ke({object:T,ref:p},u),d.createElement("primitive",{object:B,attach:"geometry"}),d.createElement("primitive",ke({object:C,attach:"material",color:s,vertexColors:!!a,resolution:[S.width,S.height],linewidth:(x=i??r)!==null&&x!==void 0?x:1,dashed:l,transparent:R===4},u)))}),ds=d.forwardRef(({threshold:o=15,geometry:t,...s},a)=>{const i=d.useRef(null);d.useImperativeHandle(a,()=>i.current,[]);const r=d.useMemo(()=>[0,0,0,1,0,0],[]),n=d.useRef(),l=d.useRef();return d.useLayoutEffect(()=>{const u=i.current.parent,p=t??(u==null?void 0:u.geometry);if(!p||n.current===p&&l.current===o)return;n.current=p,l.current=o;const x=new Tt(p,o).attributes.position.array;i.current.geometry.setPositions(x),i.current.geometry.attributes.instanceStart.needsUpdate=!0,i.current.geometry.attributes.instanceEnd.needsUpdate=!0,i.current.computeLineDistances()}),d.createElement(Yt,ke({segments:!0,points:r,ref:i,raycast:()=>null},s))}),Me=[.12,.25,1.25,2.5,12.5,25,320,640],Kt=8,se=7.5,U=15,_e=7.56,qt=2*Math.PI*se*10,h={w:19,h:19,d:19,y0:1.2},xt=h.y0+h.h,I=xt+.6,P=h.d/2,be=I+3,gt=9,re=be+gt+U+2.5,z=new O(21,34.5,_e+.32),ae=z.x,he=2.2,We=3,fe="#3b82f6",ne=-2.35,Ne=.6+ne,J=1536,Ee=J/(2*Math.PI*_e),K=Math.round(U*Ee),at=Math.round(1.2*Ee),Jt=o=>{o.globalCompositeOperation="source-over",o.fillStyle="#17150f",o.fillRect(0,0,J,K);for(let t=0;t<260;t++){const s=Math.random()*J,a=Math.random()*K,i=8+Math.random()*60,r=o.createRadialGradient(s,a,0,s,a,i),n=Math.random()<.5?"40,36,28":"6,6,5";r.addColorStop(0,`rgba(${n},${.08+Math.random()*.1})`),r.addColorStop(1,`rgba(${n},0)`),o.fillStyle=r,o.fillRect(s-i,a-i,2*i,2*i)}for(let t=0;t<9e3;t++)o.fillStyle=Math.random()<.5?"rgba(60,55,45,0.25)":"rgba(0,0,0,0.3)",o.fillRect(Math.random()*J,Math.random()*K,1.2,1.2);o.fillStyle="rgba(0,0,0,0.35)",o.fillRect(0,0,at,K),o.fillStyle="rgba(120,112,95,0.55)",o.fillRect(at-2,0,2,K)},Qt=o=>{const t=o-.01;return t<=0||t>=.09?0:t<.04?We*Math.sin(Math.PI/2*(t/.04))**2:We*Math.cos(Math.PI/2*((t-.04)/.05))**2},us=()=>{const[o,t]=d.useState({on:!1,speed:6,clutch:!0,lift:3.5,leverOn:!0,contactStim:!1}),s=d.useRef([]),a=d.useRef(0),[i,r]=d.useState(0),n=d.useCallback(u=>t(p=>({...p,...u})),[]),l=d.useCallback(()=>{s.current.push(a.current)},[]);return{state:o,set:n,stimulate:l,stimuli:s,clock:a,paperKey:i,newPaper:()=>r(u=>u+1)}},vt=o=>o.on&&o.clutch&&o.speed!==Kt,Zt=o=>{for(let t=o;t;t=t.parent)if(t.userData.part)return t.userData.part;return null},ct=o=>{for(const t of o.intersections){const s=Zt(t.object);if(s)return s}return null},M=({lit:o,color:t,metal:s=.3,rough:a=.55})=>e.jsx("meshStandardMaterial",{color:o?fe:t,metalness:o?.1:s,roughness:a,emissive:o?fe:"#000000",emissiveIntensity:o?.35:0}),y=({lit:o})=>e.jsx(M,{lit:o,color:"#dfe3e7",metal:1,rough:.15}),ce=({lit:o})=>e.jsx(M,{lit:o,color:"#c9cdd1",metal:.85,rough:.35}),le=({lit:o})=>e.jsx(M,{lit:o,color:"#c9a24a",metal:.9,rough:.3}),k=({lit:o})=>e.jsx(M,{lit:o,color:"#1d1f22",metal:.2,rough:.45}),ye=({lit:o})=>e.jsx(M,{lit:o,color:"#ecebe5",metal:.05,rough:.45}),g=({r:o,h:t,pos:s,rot:a,seg:i=32,r2:r,children:n})=>e.jsxs("mesh",{position:s,rotation:a,children:[e.jsx("cylinderGeometry",{args:[r??o,o,t,i]}),n]}),m=({size:o,pos:t,rot:s,children:a})=>e.jsxs("mesh",{position:t,rotation:s,children:[e.jsx("boxGeometry",{args:o}),a]}),ee=({r:o,h:t,pos:s,rot:a,lit:i,color:r="#dfe3e7"})=>{const n=d.useMemo(()=>{const l=[];for(let v=0;v<=80;v++){const x=v/80*Math.PI*2,S=v%2?o:o*.92;l.push(new Le(Math.cos(x)*S,Math.sin(x)*S))}const p=new ut(new ht(l),{depth:t,bevelEnabled:!0,bevelSize:o*.04,bevelThickness:o*.04,bevelSegments:1});return p.translate(0,0,-t/2),p.rotateX(Math.PI/2),p},[o,t]);return e.jsx("mesh",{geometry:n,position:s,rotation:a,children:e.jsx(M,{lit:i,color:r,metal:.9,rough:.3})})},de=({w:o,h:t,lit:s})=>e.jsx(e.Fragment,{children:[[-1,-1],[1,-1],[-1,1],[1,1]].map(([a,i],r)=>e.jsxs("mesh",{position:[a*(o/2-.9),i*(t/2-.9),.02],scale:[1,1,.45],children:[e.jsx("sphereGeometry",{args:[.32,14,8,0,Math.PI*2,0,Math.PI/2]}),e.jsx(M,{lit:s,color:"#9aa0a6",metal:.9,rough:.3})]},r))}),es=16.9,ts=.72,ue=o=>es-o*ts,hs=({active:o,onHover:t,onSelect:s,kymo:a,bare:i,pen:r})=>{const n=c=>o===c,{state:l,stimuli:u,clock:p,paperKey:v}=a,x=d.useRef(l);x.current=l;const S=d.useMemo(()=>{const c=document.createElement("canvas");return c.width=J,c.height=K,c},[]),T=d.useMemo(()=>{const c=new Rt(S);return c.colorSpace=Bt,c.anisotropy=8,c},[S]),C=d.useRef(null);d.useMemo(()=>{Jt(S.getContext("2d")),T.needsUpdate=!0,C.current=null},[v,S,T]);const R=d.useRef(null),B=d.useRef(null),D=d.useRef(null),X=d.useRef(null),f=d.useRef(null),b=d.useRef(null),ze=d.useRef(null),Pe=d.useRef(null),Ae=d.useRef(null),Ce=d.useRef(null),Oe=d.useRef(null),yt=d.useRef({phi:0,rate:0,lift:l.lift,swing:0,slot:ue(l.speed),clutch:1,t:performance.now()/1e3,flash:0,dirty:0});Nt(()=>{const c=yt.current,w=x.current,N=S.getContext("2d"),Ke=performance.now()/1e3,Q=Math.min(.1,Ke-c.t);c.t=Ke;const De=p.current+Q,St=vt(w)?Me[w.speed]/10/se:0,pe=A=>Math.min(1,Q*A);c.lift+=(w.lift-c.lift)*pe(6),c.swing+=((w.leverOn?0:1)-c.swing)*pe(5),c.slot+=(ue(w.speed)-c.slot)*pe(12),c.clutch+=((w.clutch?1:0)-c.clutch)*pe(10),N.strokeStyle="rgba(236,230,214,0.92)",N.lineWidth=2.2,N.lineCap="round",N.lineJoin="round",N.beginPath();let Ie=!1;const qe=Math.max(1,Math.ceil(Q/.002)),Ue=Q/qe;let me=0;for(let A=1;A<=qe;A++){const Qe=De-Q+A*Ue;c.rate+=(St-c.rate)*Math.min(1,Ue*8),c.rate<1e-5&&(c.rate=0);const wt=c.phi;if(c.phi-=c.rate*Ue,c.rate>0&&Math.floor((-wt-Ne+ne)/(2*Math.PI))!==Math.floor((-c.phi-Ne+ne)/(2*Math.PI))&&(c.flash=1,w.contactStim&&u.current.push(Qe)),me=r?0:Math.min(u.current.reduce((_t,Et)=>_t+Qt(Qe-Et),0),We*1.6),r?!r.current.on:c.swing>.04){C.current=null;continue}const Mt=r?r.current.y:z.y+me,Z=(be+c.lift+U-Mt)*Ee,xe=(-c.phi%(2*Math.PI)+2*Math.PI)%(2*Math.PI)/(2*Math.PI)*J;if(Z<2||Z>K-2){C.current=null;continue}const $=C.current;$&&Math.abs(xe-$.u)<J/2&&Math.abs(Z-$.v)<1.5*Ee&&(Math.abs(xe-$.u)>.05||Math.abs(Z-$.v)>.05)&&(N.moveTo($.u,$.v),N.lineTo(xe,Z),Ie=!0),C.current={u:xe,v:Z}}Ie&&(N.stroke(),c.dirty++),c.dirty&&(c.dirty>1||!Ie)&&(T.needsUpdate=!0,c.dirty=0),u.current=u.current.filter(A=>De-A<.2),p.current=De,R.current&&(R.current.rotation.y=c.phi),B.current&&(B.current.position.y=be+c.lift),X.current&&(X.current.rotation.y=c.swing*.07),D.current&&(D.current.rotation.z=-Math.asin(me/ae)),ze.current&&(ze.current.position.y=c.slot),Pe.current&&(Pe.current.rotation.z=.7-1.4*(1-c.clutch)),Ae.current&&(Ae.current.rotation.x=w.on?-.22:.22);const Je=me*he/ae,bt=z.y-.3-Je;if(b.current){const A=bt-Ge;b.current.scale.y=A,b.current.position.y=Ge+A/2}if(f.current){const A=Je/we;f.current.scale.set(1+A*2.5,1-A,1+A*2.5)}Ce.current&&(Ce.current.emissiveIntensity=w.on?1.6:0),c.flash=Math.max(0,c.flash-Q*8),Oe.current&&(Oe.current.emissiveIntensity=c.flash*3)});const Ye=[Math.sin(ne),Math.cos(ne)];return e.jsxs("group",{onPointerMove:c=>{c.stopPropagation(),t(ct(c))},onPointerOut:()=>t(null),onClick:c=>{c.stopPropagation();const w=ct(c);w&&s(w)},children:[!i&&e.jsxs("mesh",{position:[7,-.5,2],children:[e.jsx("boxGeometry",{args:[60,1,38]}),e.jsx("meshStandardMaterial",{color:"#8a6a4a",roughness:.8})]}),e.jsxs("group",{userData:{part:"base"},children:[e.jsx(m,{size:[h.w,h.h,h.d],pos:[0,h.y0+h.h/2,0],children:e.jsx(ye,{lit:n("base")})}),e.jsx(m,{size:[h.w+.6,.6,h.d+.6],pos:[0,xt+.3,0],children:e.jsx(ye,{lit:n("base")})}),e.jsx(m,{size:[h.w+.3,.5,h.d+.3],pos:[0,h.y0+.25,0],children:e.jsx(ye,{lit:n("base")})}),[[-1,-1],[1,-1],[-1,1],[1,1]].map(([c,w],N)=>e.jsx(g,{r:1.1,r2:1.2,h:1.2,pos:[c*(h.w/2-1.8),.6,w*(h.d/2-1.8)],children:e.jsx(k,{lit:n("base")})},N)),e.jsx("group",{position:[0,h.y0+h.h/2,P+.01],children:e.jsx(de,{w:h.w,h:h.h,lit:n("base")})}),e.jsx("group",{position:[h.w/2+.01,h.y0+h.h/2,0],rotation:[0,Math.PI/2,0],children:e.jsx(de,{w:h.d,h:h.h,lit:n("base")})}),e.jsx("group",{position:[-19/2-.01,h.y0+h.h/2,0],rotation:[0,-Math.PI/2,0],children:e.jsx(de,{w:h.d,h:h.h,lit:n("base")})}),e.jsx("group",{position:[0,I+.01,0],rotation:[-Math.PI/2,0,0],children:e.jsx(de,{w:h.w+.6,h:h.d+.6,lit:n("base")})}),[-1,1].map(c=>[0,1,2,3,4,5].map(w=>e.jsx(m,{size:[.35,.45,4.2],pos:[-19/2-.12,h.y0+5+w*1.3,c*3.2],rot:[0,0,.5],children:e.jsx(ye,{lit:n("base")})},`${c}${w}`)))]}),e.jsxs("group",{userData:{part:"speed"},children:[e.jsxs("group",{position:[0,14,P+.06],children:[e.jsx(m,{size:[5.8,10.4,.12],pos:[0,0,0],children:e.jsx(M,{lit:n("speed"),color:"#141517",metal:.3,rough:.5})}),e.jsx(de,{w:5.8,h:10.4,lit:n("speed")}),e.jsx(F,{font:V,position:[0,4.5,.08],fontSize:.36,color:"#f2d84b",anchorX:"center",anchorY:"middle",children:"SPEED MM PER SEC."}),e.jsx(F,{font:V,position:[0,3.95,.08],fontSize:.3,color:"#f2d84b",anchorX:"center",anchorY:"middle",children:'WITH 6" DIA CYLINDER'}),e.jsx(F,{font:V,position:[0,-4.25,.08],fontSize:.32,color:"#f2d84b",anchorX:"center",anchorY:"middle",children:"E-8 RECORDING DRUM"}),e.jsx(F,{font:Ft,position:[0,-4.75,.08],fontSize:.28,color:"#f2d84b",anchorX:"center",anchorY:"middle",children:"220 V AC"}),e.jsx(m,{size:[.75,7.3,.05],pos:[-1,ue(4)-14,.07],children:e.jsx("meshStandardMaterial",{color:"#000000"})}),[...Me.map(String),"N"].map((c,w)=>e.jsxs("group",{position:[0,ue(w)-14,.08],children:[e.jsx(m,{size:[.5,.12,.02],pos:[-.38,0,0],children:e.jsx("meshStandardMaterial",{color:"#000000"})}),e.jsx(F,{font:V,position:[1.3,0,0],fontSize:.4,color:"#f2d84b",anchorX:"center",anchorY:"middle",children:c.replace(/^0\./,".")})]},c))]}),e.jsxs("group",{ref:ze,position:[0,ue(l.speed),P+.15],children:[e.jsx(m,{size:[1.3,.45,.9],pos:[-1,0,.45],children:e.jsx(y,{lit:n("speed")})}),e.jsx(m,{size:[1.3,.25,.4],pos:[-1,.3,.75],children:e.jsx(y,{lit:n("speed")})})]})]}),e.jsxs("group",{userData:{part:"switch"},children:[e.jsx(m,{size:[1.7,2.5,.25],pos:[-5.6,5.6,P+.12],children:e.jsx(k,{lit:n("switch")})}),e.jsx("group",{ref:Ae,position:[-5.6,5.6,P+.3],children:e.jsxs("mesh",{children:[e.jsx("boxGeometry",{args:[1.2,1.95,.35]}),e.jsx("meshStandardMaterial",{ref:Ce,color:n("switch")?fe:"#c4161c",emissive:"#ff2a1f",emissiveIntensity:0,roughness:.25})]})}),e.jsx(F,{font:V,position:[-5.6,3.95,P+.02],fontSize:.35,color:"#3a3a3a",anchorX:"center",anchorY:"middle",children:"ON"}),e.jsx(m,{size:[2.2,1.6,.25],pos:[-5.6,2.6,P+.12],children:e.jsx(k,{lit:n("switch")})}),e.jsx(m,{size:[1.6,1.2,1.1],pos:[-5.6,2.6,P+.8],children:e.jsx(k,{lit:n("switch")})}),e.jsx("mesh",{geometry:ns,children:e.jsx(M,{lit:n("switch"),color:"#2a2b2e",metal:0,rough:.7})})]}),e.jsxs("group",{userData:{part:"clutch"},position:[h.w/2+.01,13,0],rotation:[0,Math.PI/2,0],children:[e.jsxs("mesh",{position:[0,0,.02],children:[e.jsx("circleGeometry",{args:[3.3,48]}),e.jsx(M,{lit:n("clutch"),color:"#f6f5f0",metal:0,rough:.6})]}),e.jsxs("mesh",{position:[0,0,.03],children:[e.jsx("ringGeometry",{args:[2.85,3.05,64]}),e.jsx(M,{lit:n("clutch"),color:"#d0202a",metal:0,rough:.5})]}),e.jsx(F,{font:V,position:[0,2.25,.05],fontSize:.36,color:"#c81e28",anchorX:"center",anchorY:"middle",children:"NEUTRALISING CLUTCH"}),e.jsx(F,{font:V,position:[-1.7,-2.1,.05],fontSize:.36,color:"#c81e28",anchorX:"center",anchorY:"middle",children:"ENG"}),e.jsx(F,{font:V,position:[1.6,-2.1,.05],fontSize:.36,color:"#c81e28",anchorX:"center",anchorY:"middle",children:"DIS ENG"}),e.jsx(g,{r:.55,h:.5,pos:[0,0,.25],rot:[Math.PI/2,0,0],children:e.jsx(y,{lit:n("clutch")})}),e.jsxs("group",{ref:Pe,position:[0,0,.55],children:[e.jsx(g,{r:.28,h:2.4,pos:[0,1.2,.2],children:e.jsx(y,{lit:n("clutch")})}),e.jsx(g,{r:.33,h:1.2,pos:[0,2.5,.75],rot:[Math.PI/2,0,0],children:e.jsx(y,{lit:n("clutch")})})]})]}),e.jsxs("group",{userData:{part:"contact"},position:[Ye[0]*8.5,I,Ye[1]*8.5],rotation:[0,ne,0],children:[e.jsxs("mesh",{position:[0,1.1,0],children:[e.jsx("boxGeometry",{args:[5,2.2,2.4]}),e.jsx("meshPhysicalMaterial",{color:n("contact")?fe:"#e8f3f6",transparent:!0,opacity:.45,roughness:.08,clearcoat:1,depthWrite:!1})]}),[-1,1].map(c=>e.jsxs("group",{position:[c*1.4,2.2,0],children:[e.jsx(ee,{r:.5,h:1.1,pos:[0,.55,0],lit:n("contact"),color:c<0?"#c0161c":"#1d1f22"}),e.jsx(g,{r:.18,h:.5,pos:[0,1.3,0],children:e.jsx(le,{lit:n("contact")})})]},c)),e.jsx(m,{size:[.08,1,3.8],pos:[0,1.6,-3.1],children:e.jsx(le,{lit:n("contact")})}),e.jsxs("mesh",{position:[0,1.6,-5],children:[e.jsx("sphereGeometry",{args:[.16,10,8]}),e.jsx("meshStandardMaterial",{ref:Oe,color:"#fde68a",emissive:"#fff3b0",emissiveIntensity:0})]})]}),e.jsx("group",{userData:{part:"spindle"},children:e.jsx(g,{r:2.6,h:.35,pos:[0,I+.17,0],seg:40,children:e.jsx(y,{lit:n("spindle")})})}),e.jsxs("group",{ref:R,children:[e.jsxs("group",{userData:{part:"spindle"},children:[e.jsx(g,{r:1.5,r2:1.3,h:1.2,pos:[0,I+.9,0],seg:32,children:e.jsx(y,{lit:n("spindle")})}),e.jsx(g,{r:.75,h:re-I,pos:[0,(re+I)/2,0],seg:24,children:e.jsx(y,{lit:n("spindle")})})]}),e.jsxs("group",{userData:{part:"contact"},rotation:[0,Ne,0],children:[e.jsx(g,{r:1.2,h:1,pos:[0,I+2,0],children:e.jsx(k,{lit:n("contact")})}),e.jsx(m,{size:[.6,.5,3.2],pos:[0,I+2.1,2.1],children:e.jsx(k,{lit:n("contact")})}),e.jsxs("mesh",{position:[0,I+2.1,3.9],rotation:[Math.PI/2,0,0],children:[e.jsx("coneGeometry",{args:[.32,.9,12]}),e.jsx(k,{lit:n("contact")})]}),e.jsx(g,{r:.25,h:.7,pos:[.85,I+2,0],rot:[0,0,Math.PI/2],children:e.jsx(y,{lit:n("contact")})})]}),e.jsxs("group",{userData:{part:"lift"},children:[e.jsx(g,{r:1,h:1.2,pos:[0,re-.2,0],children:e.jsx(y,{lit:n("lift")})}),e.jsx(ee,{r:.85,h:1.8,pos:[0,re+1.3,0],lit:n("lift")}),e.jsx(g,{r:.5,h:.5,pos:[0,re+2.45,0],children:e.jsx(y,{lit:n("lift")})})]}),e.jsxs("group",{ref:B,position:[0,be+l.lift,0],children:[e.jsxs("group",{userData:{part:"drum"},children:[e.jsxs("mesh",{position:[0,U/2,0],children:[e.jsx("cylinderGeometry",{args:[se,se,U,96,1,!0]}),e.jsx("meshStandardMaterial",{color:n("drum")?fe:"#16171a",metalness:.3,roughness:.6,side:Ht})]}),[.15,U-.4].map(c=>e.jsxs("group",{position:[0,c,0],children:[e.jsx(m,{size:[se*2-.2,.5,.9],pos:[0,0,0],children:e.jsx(k,{lit:n("drum")})}),e.jsx(m,{size:[.9,.5,se*2-.2],pos:[0,0,0],children:e.jsx(k,{lit:n("drum")})}),e.jsx(g,{r:1.6,h:1,pos:[0,0,0],children:e.jsx(k,{lit:n("drum")})})]},c)),e.jsx(g,{r:1.25,h:2,pos:[0,U+.9,0],children:e.jsx(y,{lit:n("drum")})}),e.jsx(g,{r:.22,h:.8,pos:[0,U+1.1,1.55],rot:[Math.PI/2,0,0],children:e.jsx(y,{lit:n("drum")})}),e.jsx(ee,{r:.5,h:.6,pos:[0,U+1.1,2.2],rot:[Math.PI/2,0,0],lit:n("drum"),color:"#1d1f22"})]}),e.jsxs("mesh",{position:[0,U/2,0],userData:{part:"paper"},children:[e.jsx("cylinderGeometry",{args:[_e,_e,U,128,1,!0]}),e.jsx("meshStandardMaterial",{map:T,color:n("paper")?"#9ec5ff":"#ffffff",roughness:.85,metalness:0})]})]})]}),!i&&e.jsxs(e.Fragment,{children:[e.jsxs("group",{userData:{part:"stand"},children:[e.jsx(is,{pos:[j.x+1.5,0,j.z-1],lit:n("stand")}),e.jsx(g,{r:.55,h:44,pos:[j.x,22.6,j.z],seg:20,children:e.jsx(y,{lit:n("stand")})}),e.jsx(m,{size:[2,2,2],pos:[j.x,Se,j.z],children:e.jsx(ce,{lit:n("stand")})}),e.jsx(ee,{r:.5,h:1,pos:[j.x,Se,j.z+1.4],rot:[Math.PI/2,0,0],lit:n("stand"),color:"#1d1f22"}),e.jsx(g,{r:.4,h:j.x-z.x-.5,pos:[(j.x+z.x+.5)/2,Se,j.z],rot:[0,0,Math.PI/2],children:e.jsx(y,{lit:n("stand")})}),e.jsx(m,{size:[2,2,2],pos:[j.x,te,j.z],children:e.jsx(ce,{lit:n("stand")})}),e.jsx(ee,{r:.5,h:1,pos:[j.x,te,j.z+1.4],rot:[Math.PI/2,0,0],lit:n("stand"),color:"#1d1f22"}),e.jsx(g,{r:.35,h:j.x-Y-.8,pos:[(j.x+Y+.8)/2,te,j.z],rot:[0,0,Math.PI/2],children:e.jsx(y,{lit:n("stand")})}),e.jsx(m,{size:[1.6,1.2,1.8],pos:[Y,te,j.z],children:e.jsx(ce,{lit:n("stand")})}),e.jsx(g,{r:.15,h:.8,pos:[Y,te,j.z+1.25],rot:[Math.PI/2,0,0],children:e.jsx(y,{lit:n("stand")})}),e.jsx(ee,{r:.4,h:.5,pos:[Y,te,j.z+1.8],rot:[Math.PI/2,0,0],lit:n("stand"),color:"#1d1f22"})]}),e.jsxs("group",{ref:X,position:[z.x,z.y,z.z],children:[e.jsxs("group",{userData:{part:"lever"},children:[e.jsx(m,{size:[1.1,1.9,.22],pos:[0,.25,-.75],children:e.jsx(le,{lit:n("lever")})}),e.jsx(m,{size:[1.1,1.9,.22],pos:[0,.25,.75],children:e.jsx(le,{lit:n("lever")})}),e.jsx(m,{size:[1.1,.5,1.72],pos:[0,Se-z.y,0],children:e.jsx(le,{lit:n("lever")})}),e.jsx(g,{r:.1,h:1.9,pos:[0,0,0],rot:[Math.PI/2,0,0],children:e.jsx(y,{lit:n("lever")})}),[-1,1].map(c=>e.jsx(g,{r:.2,h:.12,pos:[0,0,c*.92],rot:[Math.PI/2,0,0],seg:6,children:e.jsx(y,{lit:n("lever")})},c))]}),e.jsxs("group",{ref:D,children:[e.jsxs("group",{userData:{part:"lever"},children:[e.jsx(m,{size:[ae-.3,.5,.08],pos:[-(ae-.3)/2,0,0],children:e.jsx(ce,{lit:n("lever")})}),e.jsx(m,{size:[he+.6,.6,.12],pos:[(he+.6)/2-.2,0,0],children:e.jsx(ce,{lit:n("lever")})}),e.jsxs("mesh",{position:[he,-.3,0],rotation:[Math.PI/2,0,0],children:[e.jsx("torusGeometry",{args:[.22,.05,8,16]}),e.jsx(y,{lit:n("lever")})]})]}),e.jsxs("group",{userData:{part:"stylus"},position:[-ae,0,0],children:[e.jsx(m,{size:[.9,.35,.04],pos:[.3,0,0],children:e.jsx(M,{lit:n("stylus"),color:"#e8dfc8",metal:0,rough:.6})}),e.jsx(m,{size:[.06,.12,.34],pos:[0,0,-.16],rot:[0,.35,0],children:e.jsx(M,{lit:n("stylus"),color:"#e8dfc8",metal:0,rough:.6})})]})]})]}),e.jsxs("mesh",{ref:b,position:[Y,Ge+2,z.z],userData:{part:"muscle"},children:[e.jsx("cylinderGeometry",{args:[.03,.03,1,6]}),e.jsx("meshStandardMaterial",{color:"#f5f0e1",roughness:.9})]}),e.jsxs("group",{userData:{part:"muscle"},position:[Y,$e,z.z],children:[e.jsx(g,{r:.2,h:jt+.8,pos:[0,-3.4000000000000004/2,0],seg:12,children:e.jsx(M,{lit:n("muscle"),color:"#efe7d6",metal:0,rough:.6})}),e.jsxs("mesh",{position:[0,-.05,0],scale:[1.25,.8,1],children:[e.jsx("sphereGeometry",{args:[.34,16,12]}),e.jsx(M,{lit:n("muscle"),color:"#efe7d6",metal:0,rough:.6})]}),e.jsxs("group",{ref:f,children:[e.jsx("mesh",{geometry:ss,children:e.jsx(M,{lit:n("muscle"),color:"#b4485a",metal:0,rough:.55})}),e.jsx(g,{r:.06,r2:.1,h:we-3.4,pos:[0,(we+3.4)/2,0],seg:8,children:e.jsx(M,{lit:n("muscle"),color:"#efe9df",metal:0,rough:.4})})]})]})]})]})},we=4.5,$e=z.y-13,Ge=$e+we,Y=z.x+he,jt=2.6,te=$e-jt,Se=z.y+1.35,j={x:26,z:z.z},ss=new kt([[0,0],[.4,.04],[.82,.5],[.95,1.2],[.85,2],[.55,2.8],[.2,3.35],[.08,3.5]].map(([o,t])=>new Le(o,t)),28),ns=new Gt(new Wt([[-5.6,2.6,P+1.3],[-5.6,2.4,P+2.4],[-5.8,1.1,P+3.3],[-6.4,.3,P+4.6],[-9,.3,P+6.4],[-14,.3,P+7.2],[-20,.3,P+7.6]].map(([o,t,s])=>new O(o,t,s))),80,.28,10,!1),is=({pos:o,lit:t})=>{const s=d.useMemo(()=>{const a=new ht,i=7;[Math.PI/2,Math.PI/2+2*Math.PI/3,Math.PI/2+4*Math.PI/3].forEach((n,l)=>{const u=Math.cos(n)*i,p=Math.sin(n)*i;l===0?a.moveTo(u,p):a.lineTo(u,p)}),a.closePath();const r=new ut(a,{depth:1.3,bevelEnabled:!0,bevelSize:.5,bevelThickness:.3,bevelSegments:3});return r.rotateX(-Math.PI/2),r},[]);return e.jsx("group",{position:o,rotation:[0,.3,0],children:e.jsx("mesh",{geometry:s,position:[0,.3,0],children:e.jsx(M,{lit:t,color:"#1f2a3a",metal:.4,rough:.5})})})},os=o=>{const t=qt/o;return t<60?`${t.toFixed(t<10?2:1)} s`:t<3600?`${Math.round(t/60)} min`:`${(t/3600).toFixed(1)} h`},fs=({kymo:o})=>{const{state:t,set:s,stimulate:a,newPaper:i}=o,r=l=>`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${l?"bg-amber-500/20 border-amber-400 text-amber-100":"bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"}`,n=vt(t)?`one turn: ${os(Me[t.speed])}`:t.on?"drum not driven":"motor off";return e.jsxs("section",{className:"space-y-4",children:[e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{onClick:()=>s({on:!t.on}),className:`flex-1 ${r(t.on)}`,children:t.on?"Motor ON":"Motor OFF"}),e.jsx("button",{onClick:()=>s({clutch:!t.clutch}),className:`flex-1 ${r(t.clutch)}`,children:t.clutch?"Clutch engaged":"Clutch disengaged"})]}),e.jsxs("div",{children:[e.jsxs("div",{className:"flex justify-between text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-2",children:[e.jsx("span",{children:"Speed lever (mm/s)"}),e.jsx("span",{className:"normal-case tracking-normal text-slate-400 font-semibold",children:n})]}),e.jsx("div",{className:"grid grid-cols-3 gap-1.5",children:[...Me.map(String),"N"].map((l,u)=>e.jsx("button",{onClick:()=>s({speed:u}),className:r(t.speed===u),children:l==="N"?"N (neutral)":l},l))})]}),e.jsxs("label",{className:"block",children:[e.jsxs("span",{className:"flex justify-between text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-1",children:[e.jsx("span",{children:"Drum height (screw lift)"}),e.jsxs("span",{className:"normal-case tracking-normal text-slate-400 font-semibold",children:[t.lift.toFixed(1)," cm"]})]}),e.jsx("input",{type:"range",min:0,max:gt,step:.1,value:t.lift,onChange:l=>s({lift:+l.target.value}),className:"w-full accent-amber-400","aria-label":"Drum height"})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{onClick:a,className:"flex-1 px-3 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-bold",children:"Stimulate"}),e.jsx("button",{onClick:()=>s({contactStim:!t.contactStim}),className:`flex-1 ${r(t.contactStim)}`,children:t.contactStim?"Contact stimulates every turn":"Stimulate from contact"})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{onClick:()=>s({leverOn:!t.leverOn}),className:`flex-1 ${r(t.leverOn)}`,children:t.leverOn?"Lever on drum":"Lever off drum"}),e.jsx("button",{onClick:i,className:"flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 text-xs font-semibold",children:"Fresh smoked paper"})]})]})};export{ds as E,hs as K,fs as a,us as u};
